"""
Cấu hình thiết bị — COPY file này thành `config.py` rồi điền thông tin của bạn.

    cp config.example.py config.py

`config.py` chứa mật khẩu WiFi và device key nên KHÔNG commit lên git
(.gitignore của repo đã bỏ qua nó).
"""

# ── WiFi (chỉ dùng khi UPLOAD_MODE = "wifi"; chế độ serial bỏ qua) ──
# Lưu ý: ESP32 chỉ bắt được băng tần 2.4GHz, không thấy mạng 5GHz.
WIFI_SSID = "Ten_WiFi_Cua_Ban"
WIFI_PASSWORD = "mat_khau_wifi"

# ── Cách dữ liệu đi lên AquaGuard ──
# "serial" — board CHỈ in số đo ra cổng USB; laptop chạy serial_bridge.py gửi hộ.
#            Chọn cái này khi WiFi nơi demo phải đăng nhập qua trang web,
#            là WPA2-Enterprise (eduroam...), hoặc router chỉ phát 5GHz.
#            Board phải cắm cáp vào laptop suốt buổi.
# "wifi"   — board tự vào WiFi và tự POST. Cắm cục sạc là chạy, không cần laptop.
#            Cần cài thêm thư viện: mpremote connect <port> mip install urequests
UPLOAD_MODE = "serial"

# ── Máy chủ AquaGuard ──
# Production: https://aquaguard-api.onrender.com/api/sensors/ingest
# Chạy local: http://192.168.1.x:5001/api/sensors/ingest  (IP máy chạy backend,
#             KHÔNG dùng localhost — với board thì localhost là chính nó)
API_URL = "https://aquaguard-api.onrender.com/api/sensors/ingest"

# Device key lấy từ web (tài khoản cứu hộ/quản trị):
#   Trung tâm Giám sát → Cảm biến IoT → mục "Mực nước" → Thêm cảm biến.
# Key chỉ hiện đúng một lần; mất thì bấm "Cấp key mới" để xoay key khác.
DEVICE_KEY = "aqg_dan_key_vao_day"

# Chu kỳ gửi lên server (giây). Cả hai chế độ đều dùng (serial_bridge.py cũng
# đọc từ đây). Server coi thiết bị là OFFLINE nếu quá 45s không nghe thấy gì.
#
#   2   — nhịp demo: số trên web nhảy gần như tức thì.
#   15-30 — nhịp chạy dài ngày: nhẹ pin, nhẹ băng thông, và quan trọng hơn là
#           không giữ Neon/Render thức 24/7 (nhịp 2s thì database gần như không
#           bao giờ được ngủ, ăn hết quota compute của gói free).
POST_PERIOD = 2
