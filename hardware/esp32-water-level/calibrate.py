"""
Hiệu chuẩn nhiều điểm cho cảm biến mực nước.

Cách dùng:
    python3 -m mpremote connect /dev/cu.usbserial-110 run calibrate.py

Script lần lượt yêu cầu bạn nhúng cảm biến tới 9 mức độ sâu. Mỗi mức có 12
giây để chỉnh, trong lúc đó giá trị raw hiện trực tiếp để bạn canh. Hết 12
giây script tự lấy mẫu rồi chuyển sang mức tiếp theo. Tổng cộng ~2 phút.

Kết quả lưu vào calib.json trên board; main.py đọc file này và gửi luôn lên
server ở lần POST đầu, nên web quy đổi giống hệt board.

VÌ SAO PHẢI NHIỀU ĐIỂM
    Cảm biến kiểu lược đo độ dẫn điện giữa hai hàng điện cực — quan hệ giữa
    độ sâu và điện áp KHÔNG tuyến tính, cong nhiều nhất ở đoạn đầu. Quy đổi
    bằng 2 điểm (khô/đầy) sai tới hàng chục phần trăm ở khoảng giữa. Càng
    nhiều điểm thì đường gấp khúc nội suy càng bám sát đường cong thật.

CHUẨN BỊ
    • Một cốc/ly cao hơn chiều dài vạch lược.
    • Lấy bút lông đánh dấu sẵn 8 vạch chia đều trên thân cảm biến (mỗi vạch
      = 1/8 chiều dài phần lược). Canh bằng mắt cũng được nhưng sai số lớn.
    • Dùng ĐÚNG loại nước sẽ đo thật. Nước máy, nước mưa, nước lũ có độ dẫn
      điện khác nhau — hiệu chuẩn bằng nước này rồi đo nước kia là lệch.
    • Giữa các bước KHÔNG cần lau, nhưng bước 0% thì phải lau thật khô.
"""

from machine import Pin, ADC
import time
import json

POWER_PIN = 25
SENSOR_PIN = 34
CALIB_FILE = "calib.json"

MIN_SPAN = 1000     # chênh lệch raw tối thiểu giữa khô và đầy để bảng có nghĩa
PREP_SECONDS = 12   # thời gian để bạn chỉnh độ sâu
SETTLE_MS = 60
SAMPLES = 31
TRIM = 8
FINAL_SAMPLES = 9   # số lần đọc lúc chốt, lấy trung vị

# (phần trăm, mô tả việc cần làm)
POINTS = (
    (0,   "Để cảm biến KHÔ HOÀN TOÀN, lau sạch bằng khăn giấy"),
    (12,  "Nhúng ngập 1/8 vạch lược (chỉ phần đầu dưới cùng)"),
    (25,  "Nhúng ngập 1/4 vạch lược"),
    (37,  "Nhúng ngập 3/8 vạch lược"),
    (50,  "Nhúng ngập 1/2 vạch lược"),
    (62,  "Nhúng ngập 5/8 vạch lược"),
    (75,  "Nhúng ngập 3/4 vạch lược"),
    (87,  "Nhúng ngập 7/8 vạch lược"),
    (100, "Nhúng ngập TOÀN BỘ vạch lược, sát mép trên (đừng để nước chạm 3 chân S/+/-)"),
)

pwr = Pin(POWER_PIN, Pin.OUT, value=0)
adc = ADC(Pin(SENSOR_PIN), atten=ADC.ATTN_11DB)


def read_raw():
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


def bar(raw, width=30):
    filled = min(width, raw * width // 20000)
    return "█" * filled + "·" * (width - filled)


def measure(pct, huong_dan):
    print("\n" + "=" * 70)
    print("MỨC {}%  —  {}".format(pct, huong_dan))
    print("=" * 70)

    for remaining in range(PREP_SECONDS, 0, -1):
        raw = read_raw()
        print("  còn {:>2}s   raw={:<7} {}".format(remaining, raw, bar(raw)))
        time.sleep_ms(700)

    print("  → đang lấy mẫu...")
    samples = []
    for _ in range(FINAL_SAMPLES):
        samples.append(read_raw())
        time.sleep_ms(150)
    samples.sort()
    ket_qua = samples[len(samples) // 2]      # lấy trung vị cho chắc
    print("  ✓ MỨC {}%  ->  raw = {}".format(pct, ket_qua))
    return ket_qua


def main():
    print("\nHIỆU CHUẨN CẢM BIẾN MỰC NƯỚC — {} điểm".format(len(POINTS)))
    print("Mỗi mức bạn có {} giây để chỉnh độ sâu.".format(PREP_SECONDS))

    table = []
    for pct, huong_dan in POINTS:
        table.append([pct, measure(pct, huong_dan)])

    print("\n" + "=" * 70)
    print("KẾT QUẢ")
    print("=" * 70)
    print("{:<10}{}".format("mức%", "raw"))
    for pct, raw in table:
        print("{:<10}{}".format(pct, raw))

    # Cảnh báo nếu giá trị không tăng dần — thường do nhúng sai thứ tự hoặc
    # cảm biến chưa lau khô giữa các bước.
    lech = [table[i][0] for i in range(1, len(table)) if table[i][1] <= table[i - 1][1]]
    if lech:
        print("\n⚠ Giá trị raw KHÔNG tăng dần ở các mức: {}".format(
            ", ".join("{}%".format(p) for p in lech)))
        print("  Nguyên nhân hay gặp: bước đó nhúng chưa đủ sâu, hoặc nhúng quá")
        print("  sâu ở bước trước. Nội suy vẫn chạy được nhưng đoạn đó sẽ sai —")
        print("  nên chạy lại calibrate.py cho chắc.")
    else:
        print("\n✓ Bảng tăng dần đều — hiệu chuẩn hợp lệ.")

    # KHÔNG lưu bảng vô nghĩa. Bảng phẳng (thường là toàn số 0 vì cảm biến
    # chưa nối dây) còn tệ hơn không hiệu chuẩn: nội suy trên nó trả về 100%
    # cho mọi giá trị khác 0, tức là báo động giả liên tục.
    span = max(r for _, r in table) - min(r for _, r in table)
    if span < MIN_SPAN:
        print("\n✗ KHÔNG LƯU — chênh lệch raw giữa khô và đầy chỉ có {}.".format(span))
        if max(r for _, r in table) == 0:
            print("  Mọi lần đọc đều bằng 0: cảm biến gần như chắc chắn CHƯA NỐI DÂY.")
        print("  Kiểm tra lại: S → D34 (GPIO34), + → D25 (GPIO25), - → GND.")
        print("  Rồi chạy lại calibrate.py.")
        return

    with open(CALIB_FILE, "w") as f:
        json.dump(table, f)
    print("\n✓ Đã lưu vào {} trên board.".format(CALIB_FILE))
    print("  Chạy lại main.py để dùng bảng hiệu chuẩn mới.")


if __name__ == "__main__":
    main()
