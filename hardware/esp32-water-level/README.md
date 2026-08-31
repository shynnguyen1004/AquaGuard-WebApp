# Cảm biến mực nước ESP32 → AquaGuard

Firmware MicroPython cho cảm biến mực nước kiểu lược gắn trên ESP32. Board đo
mực nước, quy đổi ra phần trăm bằng bảng hiệu chuẩn nhiều điểm, rồi đẩy lên
AquaGuard; thẻ **Cảm biến mực nước** trên dashboard của người dân hiện số đo
theo thời gian thực và tự cảnh báo khi nước dâng quá ngưỡng.

## Hai cách đưa dữ liệu lên web

`UPLOAD_MODE` trong `config.py` quyết định:

| | `"serial"` | `"wifi"` |
| --- | --- | --- |
| Board in số đo ra USB, **laptop** chạy `serial_bridge.py` gửi hộ | ✅ | — |
| Board tự vào WiFi và tự POST | — | ✅ |
| Cần cắm cáp vào máy tính suốt buổi | có | không (cắm cục sạc là chạy) |
| Cần WiFi 2.4GHz vào được (không phải loại đăng nhập qua trang web) | không | có |
| Cần cài `urequests` lên board | không | có |

Chế độ `serial` là phương án chắc ăn khi demo ở nơi WiFi khó vào
(WPA2-Enterprise kiểu eduroam, mạng bắt đăng nhập, router 5GHz).
Dữ liệu lên tới server thì hai chế độ **giống hệt nhau** — web không phân biệt
được, vì cùng gọi một endpoint với cùng device key.

## Nối dây

| Cảm biến      | ESP32                        |
| ------------- | ---------------------------- |
| `-` (GND)     | GND                          |
| `+` (nguồn)   | D25 (GPIO25)                 |
| `S` (signal)  | D34 (GPIO34, ADC1_CH6)       |

Cấp nguồn qua GPIO25 chứ **không** cắm thẳng 3V3: ngâm điện liên tục trong nước
sẽ điện phân và ăn mòn hai hàng điện cực rất nhanh. Firmware chỉ bật nguồn ~60ms
mỗi lần đọc rồi tắt ngay.

## Cài đặt

1. **Ghép thiết bị trên web**: đăng nhập bằng tài khoản **cứu hộ hoặc quản trị**
   → *Trung tâm Giám sát* → tab *Cảm biến IoT* → mục **Mực nước** → **Thêm cảm
   biến**. Chép `deviceKey` hiện ra (chỉ hiện một lần).

   Tài khoản người dân không tạo được thiết bị: cảm biến là thiết bị do đội
   triển khai, và cảnh báo của nó gửi về đúng người đã lắp.

2. **Cấu hình board**:

   ```bash
   cp config.example.py config.py     # rồi điền WIFI_SSID / WIFI_PASSWORD / DEVICE_KEY
   ```

3. **Hiệu chuẩn** (nên làm trước, 9 điểm, mỗi điểm 12 giây — khoảng 2 phút):

   ```bash
   python3 -m mpremote connect /dev/cu.usbserial-310 run calibrate.py
   ```

   Kết quả lưu vào `calib.json` trên board. `main.py` tự đọc file này và cũng
   gửi bảng hiệu chuẩn lên server ở lần POST đầu tiên, để server quy đổi
   `raw → %` giống hệt board.

   **Đây là thứ quyết định độ chính xác.** Cảm biến lược không tuyến tính, nên
   càng nhiều điểm thì nội suy càng bám đường cong thật. Hiệu chuẩn bằng đúng
   loại nước sẽ đo (nước máy, nước mưa, nước lũ dẫn điện khác nhau), và đánh
   dấu sẵn 8 vạch chia đều trên thân cảm biến trước khi chạy.

4. **Nạp firmware và chạy**:

   ```bash
   python3 -m mpremote connect /dev/cu.usbserial-310 cp config.py :config.py
   python3 -m mpremote connect /dev/cu.usbserial-310 cp main.py   :main.py
   python3 -m mpremote connect /dev/cu.usbserial-310 run main.py    # xem log
   ```

   Chép vào board với tên `main.py` thì lần sau cắm điện là tự chạy.

5. **Chạy cầu nối** (chỉ với `UPLOAD_MODE = "serial"`) — trên laptop, ở thư mục này:

   ```bash
   python3 serial_bridge.py --port /dev/cu.usbserial-310
   ```

   Cầu nối tự đọc `DEVICE_KEY` / `API_URL` / `POST_PERIOD` từ `config.py`, khởi
   động lại board rồi bắt đầu gửi. Nó gửi tối thiểu mỗi `POST_PERIOD` giây,
   nhưng gửi **ngay** khi mực nước đổi ≥1% (không chờ hết chu kỳ mới báo lũ),
   và không bao giờ dày hơn 1 giây một lần. Rút nhầm cáp cũng không sao — cắm
   lại là nó tự kết nối tiếp.

   Cổng nào? `mpremote connect list`. Lưu ý **một cổng chỉ mở được bởi một
   chương trình**: đang chạy cầu nối thì không chạy `mpremote` song song được.

   ```
   ✓ đã mở /dev/cu.usbserial-310 @ 115200
   → nhận bảng hiệu chuẩn 5 điểm từ board
   15:38:15   34%  ████████················  mức 3  [đã ghi]
   15:38:18   68%  ███████████████·········  mức 4  [đã ghi]  ⚠ CẢNH BÁO
   ```

   Với `UPLOAD_MODE = "wifi"` thì bỏ qua bước này, chỉ cần cài thư viện HTTP
   cho board một lần: `mpremote connect <port> mip install urequests`.

## Cầu nối báo `CERTIFICATE_VERIFY_FAILED`

Python tải từ python.org trên macOS **không dùng kho chứng chỉ của hệ điều
hành** — nó trông chờ gói `certifi`, mà gói đó chỉ được cài khi bạn chạy
`Install Certificates.command` sau lúc cài Python. Bỏ qua bước đó thì mọi
request HTTPS đều hỏng, kể cả tới server hoàn toàn bình thường.

```bash
"/Applications/Python 3.10/Install Certificates.command"   # chạy một lần
```

Hoặc chạy cầu nối bằng Python khác đã có sẵn certifi (Anaconda, Homebrew).
`serial_bridge.py` tự dò `certifi` và in hướng dẫn này khi thiếu.

Lỗi này **chỉ xảy ra ở chế độ `serial`** — chế độ `wifi` do board tự bắt tay
TLS bằng mbedtls, không dính tới chứng chỉ của Python.

## Khi số đo không chuẩn

Gần như luôn là do hiệu chuẩn, theo thứ tự hay gặp:

1. **`calibrate.py` báo "KHÔNG LƯU — chênh lệch raw ... chỉ có 0"** → cảm biến
   chưa nối dây (hoặc sai chân). Kiểm tra S → D34, + → D25, - → GND rồi chạy lại.
   Bảng phẳng như vậy nếu lọt vào sẽ làm mọi số đo thành 100%, nên cả firmware
   lẫn server đều từ chối nó và quay về bảng mặc định — web hiện nhắc
   *"Chưa hiệu chuẩn"*.
2. **Chưa hiệu chuẩn bao giờ** → đang dùng bảng mặc định 2 điểm, sai nhiều nhất
   ở khoảng giữa vì cảm biến không tuyến tính.
3. **Hiệu chuẩn bằng loại nước khác** với nước đang đo → độ dẫn điện khác nhau.
4. **Số nhảy ±2-3% dù nước đứng yên** → nhiễu ADC. Firmware đã lọc sẵn (trung
   bình cắt hai đầu + làm mượt EMA); muốn mượt hơn nữa thì giảm `SMOOTH_ALPHA`
   trong `main.py` (0.2 mượt hơn nhưng chậm hơn khi nước dâng).

## Chạy thử không có board

Không cần phần cứng vẫn kiểm tra được đường ống web:

```bash
node backend/scripts/simulate-water-sensor.js aqg_device_key_cua_ban
```

Script mô phỏng một trận ngập lên rồi rút, gửi đúng payload như board thật.

## Giao thức

```
POST /api/sensors/ingest
X-Device-Key: aqg_...
Content-Type: application/json

{ "raw": 24310, "percent": 63, "voltage_mv": 1149,
  "calibration": [[0,0],[12,4200],[25,9100],[37,13500],[50,18400],
                  [62,22800],[75,27600],[87,33000],[100,39000]] }
```

- `raw` là nguồn sự thật — server quy đổi lại bằng bảng hiệu chuẩn đang lưu,
  nên hiệu chuẩn lại không cần nạp lại firmware.
- `calibration` chỉ gửi ở lần POST đầu sau khi khởi động.
- Trả về `{ success, data: { percent, level, stored, alert } }`.
