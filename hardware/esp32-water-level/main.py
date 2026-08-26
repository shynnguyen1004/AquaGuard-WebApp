"""
Cảm biến mực nước (kiểu lược) trên ESP32 → AquaGuard — MicroPython

Nối dây:
    Sensor  -  (GND)    ->  GND
    Sensor  +  (nguồn)  ->  D25  (GPIO25)
    Sensor  S  (signal) ->  D34  (GPIO34, ADC1_CH6)

Cấp nguồn qua GPIO25 thay vì 3V3: để cảm biến cắm điện liên tục trong nước sẽ
bị điện phân, hai hàng điện cực ăn mòn rất nhanh. Code chỉ bật nguồn ~60ms mỗi
lần đọc rồi tắt ngay.

Độ chính xác:
    Cảm biến này KHÔNG tuyến tính — điện áp ra không tỉ lệ thẳng với độ sâu, và
    còn phụ thuộc độ dẫn điện của nước. Nên thay vì quy đổi bằng 2 điểm
    (khô/đầy), code đọc bảng hiệu chuẩn nhiều điểm trong calib.json rồi nội suy
    tuyến tính từng đoạn. Chạy calibrate.py để tạo file này.

Gửi lên AquaGuard:
    Mỗi POST_PERIOD giây, board POST số đo lên /api/sensors/ingest kèm header
    X-Device-Key. Mất WiFi/mất mạng KHÔNG làm dừng vòng đo — vẫn đọc và in ra
    serial như bình thường, tự thử kết nối lại ở chu kỳ sau. Cấu hình nằm trong
    config.py (copy từ config.example.py).
"""

from machine import Pin, ADC
import time
import json
import gc
import network

# urequests KHÔNG có sẵn trong firmware ESP32 chuẩn — phải cài riêng:
#   mpremote connect <port> mip install urequests
# Chế độ "serial" không đụng tới nó, nên thiếu cũng không sao: chỉ báo lỗi khi
# thật sự cần gửi qua WiFi.
try:
    import urequests as requests
except ImportError:
    try:
        import requests
    except ImportError:
        requests = None

import config

# "wifi"   — board tự vào WiFi và POST thẳng lên AquaGuard.
# "serial" — board chỉ in số đo ra cổng USB; laptop chạy serial_bridge.py gửi hộ.
UPLOAD_MODE = getattr(config, "UPLOAD_MODE", "wifi")

POWER_PIN = 25
SENSOR_PIN = 34
CALIB_FILE = "calib.json"

SETTLE_MS = 60      # chờ điện áp ổn định sau khi bật nguồn
SAMPLES = 31        # số mẫu mỗi lần đọc (nhiều hơn = bớt nhiễu, tốn thêm ~20ms)
TRIM = 8            # bỏ 8 mẫu thấp nhất + 8 cao nhất rồi mới lấy trung bình
PERIOD_MS = 500     # chu kỳ đọc

# Làm mượt theo cấp số nhân (EMA) trên giá trị RAW, không phải trên phần trăm:
# server quy đổi lại từ raw nên làm mượt ở đây thì cả web lẫn serial đều ổn định.
# 0.35 ≈ hằng số thời gian ~1.5 giây ở nhịp đọc 500ms — đủ chết nhiễu ADC mà
# vẫn bắt kịp nước dâng. Đặt 1.0 nếu muốn tắt hẳn làm mượt.
SMOOTH_ALPHA = 0.35

# Bảng dự phòng khi chưa hiệu chuẩn: [phần trăm, giá trị raw].
# Số lấy từ đo thực tế trên board này: khô = 0, ngâm nước = ~39000.
DEFAULT_CALIB = [[0, 0], [100, 39000]]

# Khoảng raw tối thiểu để bảng hiệu chuẩn được coi là dùng được. Hiệu chuẩn
# hỏng (chạy khi chưa nối dây → mọi điểm raw = 0) cho bảng phẳng lì, nội suy
# trên đó trả về 100% cho mọi giá trị khác 0 — vừa chạm nước đã báo "đầy".
MIN_CALIB_SPAN = 1000

# 1 trạng thái khô + 9 mức ngập nước.
# Mỗi dòng: (ngưỡng phần trăm để vào mức này, tên hiển thị)
# GIỮ ĐỒNG BỘ với backend/config/waterLevels.js — lệch thì web và board
# hiện hai trạng thái khác nhau cho cùng một số đo.
LEVELS = (
    (0,   "KHÔ"),
    (2,   "VỪA CHẠM NƯỚC"),
    (10,  "NGẬP RẤT THẤP"),
    (20,  "NGẬP THẤP"),
    (32,  "NGẬP THẤP–VỪA"),
    (44,  "NGẬP VỪA"),
    (56,  "NGẬP VỪA–CAO"),
    (68,  "NGẬP CAO"),
    (80,  "NGẬP RẤT CAO"),
    (90,  "ĐẦY — CẢNH BÁO"),
)

# Độ trễ chuyển mức (%). Phải tụt sâu hơn ngưỡng chừng này mới cho xuống mức
# thấp hơn, tránh nhấp nháy qua lại khi giá trị dao động quanh ranh giới.
HYSTERESIS = 3

pwr = Pin(POWER_PIN, Pin.OUT, value=0)
adc = ADC(Pin(SENSOR_PIN), atten=ADC.ATTN_11DB)   # tầm đo ~0 - 3.1V


def read_raw():
    """Bật nguồn, lấy SAMPLES mẫu, cắt bớt hai đầu rồi trung bình. Trả về 0-65535.

    Cắt hai đầu (trimmed mean) lọc được các xung nhiễu đơn lẻ mà trung bình
    thường không loại được.
    """
    pwr.value(1)
    time.sleep_ms(SETTLE_MS)
    vals = []
    for _ in range(SAMPLES):
        vals.append(adc.read_u16())
        time.sleep_ms(2)
    pwr.value(0)

    vals.sort()
    core = vals[TRIM:len(vals) - TRIM]
    return sum(core) // len(core)


_smoothed = None


def smooth(raw):
    """EMA: giá trị mới = a*đo được + (1-a)*giá trị cũ.

    Cảm biến lược đo độ dẫn điện nên số đọc rung liên tục vài trăm đơn vị dù
    mực nước đứng yên; không làm mượt thì phần trăm nhảy ±2-3% và mức hiển thị
    cứ nhấp nháy qua lại.
    """
    global _smoothed
    if _smoothed is None or SMOOTH_ALPHA >= 1:
        _smoothed = raw
    else:
        _smoothed = int(SMOOTH_ALPHA * raw + (1 - SMOOTH_ALPHA) * _smoothed)
    return _smoothed


def load_calib():
    """Đọc calib.json. Trả về (bảng, đã_hiệu_chuẩn)."""
    try:
        with open(CALIB_FILE) as f:
            data = json.load(f)
        table = [[int(p), int(r)] for p, r in data]
        table.sort(key=lambda point: point[1])
        if len(table) >= 2 and table[-1][1] - table[0][1] >= MIN_CALIB_SPAN:
            return table, True
        print("⚠ calib.json không dùng được (các điểm gần như bằng nhau).")
        print("  Chạy lại calibrate.py, kiểm tra dây S→GPIO34 và +→GPIO25.")
    except Exception:
        pass
    return DEFAULT_CALIB, False


def to_percent(raw, table):
    """Nội suy tuyến tính từng đoạn giữa các điểm hiệu chuẩn."""
    if raw <= table[0][1]:
        return table[0][0]
    if raw >= table[-1][1]:
        return table[-1][0]

    for i in range(1, len(table)):
        p0, r0 = table[i - 1]
        p1, r1 = table[i]
        if raw <= r1:
            if r1 == r0:
                return p1
            return p0 + (raw - r0) * (p1 - p0) // (r1 - r0)
    return table[-1][0]


def level_index(pct, current):
    """Chọn mức theo phần trăm, có độ trễ khi đi xuống."""
    idx = 0
    for i in range(len(LEVELS)):
        if pct >= LEVELS[i][0]:
            idx = i

    if idx < current and pct > LEVELS[current][0] - HYSTERESIS:
        return current
    return idx


def bar(pct, width=20):
    filled = pct * width // 100
    return "█" * filled + "·" * (width - filled)


# ══════════════════════════════════════════════════════════════
# MẠNG — WiFi + đẩy số đo lên AquaGuard
# ══════════════════════════════════════════════════════════════

def wifi_connect(timeout_s=20):
    """Kết nối WiFi. Trả về True/False, KHÔNG raise — mất mạng thì board vẫn đo."""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        return True

    print("WiFi: đang kết nối tới {}...".format(config.WIFI_SSID))
    wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)

    deadline = time.time() + timeout_s
    while not wlan.isconnected() and time.time() < deadline:
        time.sleep_ms(300)

    if wlan.isconnected():
        print("WiFi: OK — IP {}".format(wlan.ifconfig()[0]))
        return True
    print("WiFi: KHÔNG kết nối được (sẽ thử lại)")
    return False


def post_reading(raw, pct, calib=None):
    """Gửi một số đo lên server. Trả về dict phản hồi, hoặc None nếu lỗi.

    Mọi lỗi mạng đều bị nuốt: một lần gửi hụt không được phép làm chết vòng đo
    — cảm biến ngập lụt mà treo vì rớt WiFi thì vô dụng.
    """
    if requests is None:
        print("  ! thiếu urequests — chạy: mpremote connect <port> mip install urequests")
        return None

    payload = {
        "raw": raw,
        "percent": pct,
        "voltage_mv": raw * 3100 // 65535,
    }
    if calib:
        payload["calibration"] = calib

    # Bắt tay TLS ngốn vài chục KB heap. ESP32 chạy lâu bị phân mảnh bộ nhớ,
    # không dọn trước thì POST qua HTTPS hay chết giữa chừng với MemoryError.
    gc.collect()

    resp = None
    try:
        resp = requests.post(
            config.API_URL,
            json=payload,
            headers={"X-Device-Key": config.DEVICE_KEY},
        )
        if resp.status_code == 200:
            return resp.json()
        print("  ! server trả {} — {}".format(resp.status_code, resp.text[:80]))
    except Exception as e:
        print("  ! gửi hụt: {}".format(e))
    finally:
        if resp:
            try:
                resp.close()      # không đóng là rò socket, vài chục lần là hết RAM
            except Exception:
                pass
    return None


def main():
    table, calibrated = load_calib()

    print("Đọc cảm biến mực nước — GPIO25 cấp nguồn, GPIO34 đọc ADC")
    if calibrated:
        print("Bảng hiệu chuẩn ({} điểm): {}".format(
            len(table), ", ".join("{}%={}".format(p, r) for p, r in table)))
    else:
        print("CHƯA HIỆU CHUẨN — đang dùng bảng mặc định, phần trăm chỉ là ước lượng.")
        print("Chạy: mpremote connect <port> run calibrate.py")

    serial_mode = UPLOAD_MODE == "serial"
    online = False

    if serial_mode:
        # Laptop đọc những dòng có tiền tố #CALIB / #DATA; bảng bên dưới chỉ để
        # người xem. In bảng hiệu chuẩn trước để cầu nối gửi kèm lần POST đầu.
        print("CHẾ ĐỘ SERIAL — laptop (serial_bridge.py) sẽ gửi hộ lên AquaGuard.")
        if calibrated:
            print("#CALIB " + json.dumps(table))
    else:
        online = wifi_connect()
        print("Gửi về: {} (mỗi {}s)".format(config.API_URL, config.POST_PERIOD))

    print("Ctrl-C để dừng.\n")

    print("{:<8}{:<7}{:<7}{:<20}{}".format("raw", "mV", "mức%", "trạng thái", "thanh đo"))
    print("-" * 76)

    current = 0
    next_post = time.time()      # gửi ngay lần đọc đầu tiên
    calib_sent = False

    while True:
        raw = smooth(read_raw())
        pct = to_percent(raw, table)
        current = level_index(pct, current)

        print("{:<8}{:<7}{:<7}{:<20}{}".format(
            raw,
            raw * 3100 // 65535,
            pct,
            LEVELS[current][1],
            bar(pct),
        ))

        # ── Chế độ serial: chỉ in ra, việc gửi để laptop lo ──
        if serial_mode:
            print("#DATA " + json.dumps({
                "raw": raw,
                "percent": pct,
                "level": current,
            }))
            time.sleep_ms(PERIOD_MS)
            continue

        # ── Đẩy lên AquaGuard theo chu kỳ riêng (thưa hơn nhịp đọc) ──
        if time.time() >= next_post:
            if not online:
                online = wifi_connect(timeout_s=10)
            if online:
                # Gửi kèm bảng hiệu chuẩn ở lần đầu để server quy đổi giống board.
                result = post_reading(raw, pct, None if calib_sent else (table if calibrated else None))
                if result:
                    calib_sent = True
                    if result.get("data", {}).get("alert"):
                        print("  → ĐÃ GỬI CẢNH BÁO NGẬP tới AquaGuard")
                else:
                    online = False       # ép kết nối lại ở chu kỳ sau
            next_post = time.time() + config.POST_PERIOD

        time.sleep_ms(PERIOD_MS)


if __name__ == "__main__":
    main()
