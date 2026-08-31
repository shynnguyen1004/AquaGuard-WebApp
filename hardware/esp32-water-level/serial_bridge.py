#!/usr/bin/env python3
"""
CẦU NỐI SERIAL — laptop đọc số đo từ board qua cổng USB rồi gửi lên AquaGuard.

Dùng khi board KHÔNG lên WiFi được (WiFi trường phải đăng nhập trang web,
WPA2-Enterprise, hoặc router chỉ phát 5GHz). Board chỉ việc in số đo ra cổng
USB; máy tính này lo phần mạng.

    # 1. Trên board: đặt UPLOAD_MODE = "serial" trong config.py rồi nạp lại
    # 2. Trên laptop:
    python3 serial_bridge.py --port /dev/cu.usbserial-310

Không cần cài gì thêm: pyserial đi kèm mpremote, phần còn lại là thư viện
chuẩn của Python.

Mặc định lấy DEVICE_KEY / API_URL / POST_PERIOD từ config.py cùng thư mục
(chính là file bạn đã điền để nạp cho board), có thể ghi đè bằng tham số dòng
lệnh. Ctrl-C để dừng.
"""

import argparse
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

try:
    import serial
except ImportError:
    sys.exit(
        "Thiếu pyserial. Cài bằng:  python3 -m pip install pyserial\n"
        "(hoặc cài mpremote — pyserial đi kèm sẵn)"
    )

HERE = os.path.dirname(os.path.abspath(__file__))


def make_ssl_context():
    """Bộ xác minh HTTPS.

    Python tải từ python.org trên macOS KHÔNG dùng kho chứng chỉ của hệ điều
    hành — nó trông chờ `certifi`, mà certifi lại chỉ được cài khi bạn chạy
    "Install Certificates.command" sau lúc cài Python. Bỏ qua bước đó thì mọi
    request HTTPS chết với CERTIFICATE_VERIFY_FAILED, kể cả tới server hoàn
    toàn bình thường.

    Nên ở đây tự trỏ vào certifi nếu có, thay vì phó mặc cho máy đã được cấu
    hình đúng hay chưa.
    """
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


SSL_CONTEXT = make_ssl_context()

SSL_HINT = """
  ✗ Không xác minh được chứng chỉ HTTPS. Python bạn đang chạy thiếu kho chứng chỉ gốc.
    Chọn MỘT trong hai cách:
      1) Chạy một lần:  "/Applications/Python 3.10/Install Certificates.command"
      2) Cài certifi:   {py} -m pip install certifi
    Hoặc chạy cầu nối bằng Python khác đã có sẵn certifi.
"""

# Gửi ít nhất mỗi POST_PERIOD giây, nhưng nước đổi nhanh thì gửi ngay —
# để cảnh báo không bị trễ cả nửa phút.
DELTA_PCT = 1
# ...tuy vậy không bao giờ gửi dày hơn mức này. Sàn cứng để một cảm biến hỏng
# (nhảy loạn xạ) không bắn hàng chục request mỗi giây lên API.
MIN_GAP_S = 1


def load_config():
    """Đọc config.py cạnh file này (nếu có). Thiếu file cũng không sao."""
    defaults = {"API_URL": "", "DEVICE_KEY": "", "POST_PERIOD": 30}
    path = os.path.join(HERE, "config.py")
    if not os.path.exists(path):
        return defaults
    scope = {}
    try:
        with open(path, encoding="utf-8") as f:
            exec(compile(f.read(), path, "exec"), scope)  # noqa: S102 — file của chính người dùng
    except Exception as err:
        print(f"! không đọc được config.py ({err}) — dùng tham số dòng lệnh")
        return defaults
    for key in defaults:
        if key in scope:
            defaults[key] = scope[key]
    return defaults


def bar(pct, width=24):
    filled = max(0, min(width, round(pct * width / 100)))
    return "█" * filled + "·" * (width - filled)


class Uploader:
    """Gửi số đo lên API, có tiết chế nhịp và tự bỏ qua lỗi mạng."""

    def __init__(self, api_url, device_key, period):
        self.api_url = api_url
        self.device_key = device_key
        self.period = period
        self.last_sent_at = 0.0
        self.last_pct = None
        self.calibration = None
        self.calib_sent = False
        self.sent = 0
        self.failed = 0
        self.ssl_hint_shown = False

    def should_send(self, pct):
        if self.last_pct is None:
            return True
        elapsed = time.time() - self.last_sent_at
        if elapsed < MIN_GAP_S:
            return False
        if abs(pct - self.last_pct) >= DELTA_PCT:
            return True
        return elapsed >= self.period

    def send(self, reading):
        payload = {
            "raw": reading.get("raw"),
            "percent": reading.get("percent"),
        }
        if reading.get("raw") is not None:
            payload["voltage_mv"] = reading["raw"] * 3100 // 65535
        if self.calibration and not self.calib_sent:
            payload["calibration"] = self.calibration

        req = urllib.request.Request(
            self.api_url,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "X-Device-Key": self.device_key,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=15, context=SSL_CONTEXT) as resp:
                body = json.loads(resp.read().decode())
        except urllib.error.HTTPError as err:
            detail = err.read().decode(errors="replace")[:120]
            self.failed += 1
            if err.code == 401:
                # Key sai thì thử lại vô ích — dừng hẳn để người dùng sửa.
                sys.exit(f"\n✗ Device key bị từ chối (401). Kiểm tra DEVICE_KEY.\n  {detail}")
            print(f"  ! server trả {err.code} — {detail}")
            return None
        except Exception as err:
            self.failed += 1
            print(f"  ! gửi hụt: {err}")
            # Lỗi chứng chỉ là lỗi CẤU HÌNH MÁY, không phải mạng chập chờn —
            # in hướng dẫn đúng một lần thay vì để người dùng nhìn cùng một
            # dòng khó hiểu lặp lại mỗi hai giây.
            if "CERTIFICATE_VERIFY_FAILED" in str(err) and not self.ssl_hint_shown:
                self.ssl_hint_shown = True
                print(SSL_HINT.format(py=sys.executable))
            return None

        self.sent += 1
        self.calib_sent = True
        self.last_sent_at = time.time()
        self.last_pct = reading.get("percent")
        return body.get("data", {})


def handle_line(line, uploader, verbose):
    """Xử lý một dòng đọc từ board."""
    if line.startswith("#CALIB "):
        try:
            uploader.calibration = json.loads(line[7:])
            print(f"→ nhận bảng hiệu chuẩn {len(uploader.calibration)} điểm từ board")
        except ValueError:
            pass
        return

    if not line.startswith("#DATA "):
        if verbose and line:
            print(f"  board| {line}")
        return

    try:
        reading = json.loads(line[6:])
    except ValueError:
        return

    pct = reading.get("percent")
    if pct is None:
        return

    if not uploader.should_send(pct):
        return

    result = uploader.send(reading)
    stamp = time.strftime("%H:%M:%S")
    if result is None:
        print(f"{stamp}  {pct:>3}%  {bar(pct)}  (chưa gửi được)")
    else:
        flags = ""
        if result.get("stored"):
            flags += "  [đã ghi]"
        if result.get("alert"):
            flags += "  ⚠ CẢNH BÁO"
        print(f"{stamp}  {result.get('percent', pct):>3}%  {bar(pct)}  mức {result.get('level')}{flags}")


def run(port, baud, uploader, verbose, reset):
    """Mở cổng serial và bơm dữ liệu cho tới khi bị Ctrl-C. Tự kết nối lại."""
    while True:
        try:
            with serial.Serial(port, baud, timeout=1) as ser:
                print(f"✓ đã mở {port} @ {baud}")
                if reset:
                    # Ctrl-C dừng chương trình đang chạy, Ctrl-D khởi động lại
                    # để main.py chạy từ đầu (và in lại dòng #CALIB).
                    ser.write(b"\x03")
                    time.sleep(0.2)
                    ser.write(b"\x04")
                    time.sleep(0.2)

                while True:
                    raw = ser.readline()
                    if not raw:
                        continue
                    handle_line(raw.decode("utf-8", errors="replace").strip(), uploader, verbose)

        except serial.SerialException as err:
            print(f"! mất cổng serial ({err}) — thử lại sau 3 giây")
            time.sleep(3)


def main():
    cfg = load_config()
    parser = argparse.ArgumentParser(description="Cầu nối serial ESP32 → AquaGuard")
    parser.add_argument("--port", required=not os.environ.get("SENSOR_PORT"),
                        default=os.environ.get("SENSOR_PORT"),
                        help="Cổng serial, vd /dev/cu.usbserial-310 (mpremote connect list để xem)")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--key", default=cfg["DEVICE_KEY"], help="Device key (mặc định lấy từ config.py)")
    parser.add_argument("--api", default=cfg["API_URL"], help="URL ingest (mặc định lấy từ config.py)")
    parser.add_argument("--period", type=int, default=int(cfg["POST_PERIOD"] or 30),
                        help="Số giây tối thiểu giữa hai lần gửi (mặc định 30)")
    parser.add_argument("--verbose", action="store_true", help="In cả những dòng board xuất ra")
    parser.add_argument("--no-reset", action="store_true", help="Đừng khởi động lại board khi mở cổng")
    args = parser.parse_args()

    if not args.key:
        sys.exit("Thiếu device key. Điền DEVICE_KEY vào config.py hoặc truyền --key.")
    if not args.api:
        sys.exit("Thiếu URL. Điền API_URL vào config.py hoặc truyền --api.")

    uploader = Uploader(args.api, args.key, args.period)

    if args.api.startswith("https://") and SSL_CONTEXT.cert_store_stats()["x509_ca"] == 0:
        print("⚠ Python này không có chứng chỉ gốc nào — request HTTPS sẽ hỏng.")
        print(SSL_HINT.format(py=sys.executable))

    print(f"Cầu nối serial → {args.api}")
    print(f"Cổng {args.port}, gửi tối thiểu mỗi {args.period}s (hoặc ngay khi mực nước đổi ≥{DELTA_PCT}%).")
    print("Ctrl-C để dừng.\n")

    try:
        run(args.port, args.baud, uploader, args.verbose, not args.no_reset)
    except KeyboardInterrupt:
        print(f"\nDừng. Đã gửi {uploader.sent} số đo, hụt {uploader.failed}.")


if __name__ == "__main__":
    main()
