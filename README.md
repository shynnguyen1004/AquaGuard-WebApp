# 🌊 AquaGuard — Flood Alert & Rescue Web Platform

<div align="center">

![Platform](https://img.shields.io/badge/Platform-Web-0077B6.svg?style=for-the-badge&logo=googlechrome&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4-000000.svg?style=for-the-badge&logo=express&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28.svg?style=for-the-badge&logo=firebase&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-22C55E.svg?style=for-the-badge)

**AquaGuard Web** is a full-stack emergency flood management platform — the web companion to the [AquaGuard iOS App](https://github.com/shynnguyen1004/AquaGuard-iOS). It provides real-time flood mapping, community-driven rescue coordination, and AI-assisted emergency support across three dedicated role-based interfaces: Admin, Rescuer, and Citizen.

> **Status:** 🚀 Active Development — EPICS 8th Competition Build

[Live Demo](https://aquaguard.vn) · [iOS App](https://github.com/shynnguyen1004/AquaGuard-iOS) · [Report a Bug](https://github.com/shynnguyen1004/AquaGuard-WebApp/issues) · [Request a Feature](https://github.com/shynnguyen1004/AquaGuard-WebApp/issues)

</div>

---

## 📱 Screenshots

| Admin Dashboard | Live Flood Map | Rescue Operations | Citizen SOS | Safety Guides |
|:---:|:---:|:---:|:---:|:---:|
| ![Admin Dashboard](placeholder-admin-dashboard.png) | ![Live Map](placeholder-live-map.png) | ![Rescue Ops](placeholder-rescue-ops.png) | ![SOS Page](placeholder-sos-page.png) | ![Safety Guides](placeholder-safety-guides.png) |

---

## ✨ Key Features

### 🎭 Role-Based Dashboards (RBAC)
A full **Role-Based Access Control** system powers three distinct user experiences:

- **🛡️ Admin Dashboard:** Full-system overview with a live **Flood Map Editor**, user management panel, rescue team tracker, stats overview, and real-time SOS request monitoring. Admins can create, edit, and delete flood zones directly on the map.
- **⛑️ Rescuer Dashboard:** Mission-focused interface with an active rescue requests feed, mission acceptance workflow (`Pending → Assigned → In Progress → Resolved`), and personal mission history. Real-time updates via auto-refresh every 10 seconds.
- **🏘️ Citizen Dashboard:** Full-featured emergency management interface — detailed below in [Citizen Features](#-citizen-features--chi-tiết-tính-năng-citizen).

### 🏘️ Citizen Features — Chi tiết tính năng Citizen

#### 🏠 Dashboard Trang chủ
- **Cá nhân hóa:** Hiển thị tên người dùng, trạng thái an toàn cá nhân (An toàn / Nguy hiểm / Bị thương).
- **Active SOS Banner:** Banner nổi bật hiển thị yêu cầu SOS đang hoạt động (nếu có), với trạng thái real-time (Pending → Assigned → In Progress), tên nhân viên cứu hộ đã nhận, và thời gian gửi. Nhấn vào để chuyển ngay đến trang SOS.
- **Family Safety Board:** Bảng an toàn gia đình — hiển thị danh sách người thân đã kết nối, trạng thái an toàn (An toàn ✅ / Nguy hiểm 🔴 / Bị thương 🟠), ghi chú sức khỏe, thời gian cập nhật cuối. Tự động refresh mỗi 30 giây.
- **Pending Family Invites:** Thông báo lời mời kết nối gia đình — chấp nhận hoặc từ chối với 1 nút bấm.
- **Quick Actions:** 3 nút hành động nhanh — Gửi SOS, Kiểm tra gia đình, Xem bản đồ lũ.
- **SOS Request History:** Lịch sử 5 yêu cầu SOS gần nhất đã hoàn thành/hủy, với thông tin vị trí, mức độ khẩn cấp, và người cứu hộ.

#### 🆘 Trang SOS (Citizen SOS Page)
- **Gửi SOS mới:** Form đầy đủ với tự động bắt GPS, reverse geocoding (Google Maps + Nominatim fallback), mô tả tình huống, chọn mức độ khẩn cấp (Thấp / Trung bình / Cao / Nghiêm trọng), và tải ảnh hiện trường (tối đa 5 ảnh với drag-and-drop).
- **Danh sách yêu cầu của tôi:** Hiển thị tất cả yêu cầu SOS của bạn với trạng thái real-time, tự động refresh mỗi 10 giây.
- **Theo dõi trạng thái:** Mỗi yêu cầu hiển thị: trạng thái (Đang chờ → Đã phân công → Đang cứu hộ → Hoàn thành), tên nhân viên cứu hộ, tên đội cứu hộ (nếu nhận theo nhóm), hình ảnh đính kèm, và thông báo nếu đã bị rescuer trả lại.
- **🗺️ Rescue Tracking Map (Bản đồ theo dõi cứu hộ):** Khi yêu cầu đang được xử lý (`in_progress`), citizen có thể mở bản đồ toàn màn hình để:
  - Xem vị trí của mình (marker đỏ) và vị trí rescuer (marker xanh) trên bản đồ real-time.
  - Xem đường đi (route) từ rescuer đến citizen qua OSRM API.
  - Xem khoảng cách (km) và thời gian ước tính.
  - Kết nối WebSocket real-time (Firebase Realtime DB) — vị trí cập nhật liên tục.
  - Tự động thông báo khi nhiệm vụ hoàn thành hoặc bị hủy.

#### 🗺️ Live Flood Map (Bản đồ lũ trực tiếp)
- Xem tất cả vùng ngập lụt trên bản đồ với 4 mức độ màu sắc (Tím / Đỏ / Vàng / Xanh).
- **Precipitation Radar Overlay:** Radar mưa live từ RainViewer API, refresh mỗi 5 phút.
- **Weather Layers:** Lớp gió, nhiệt độ, mây, áp suất từ OpenWeatherMap.
- **VNDMS Tiles:** Bản đồ chính phủ Việt Nam — bao gồm Hoàng Sa và Trường Sa.
- **Family Map:** Xem vị trí người thân trên bản đồ (nếu đã kết nối gia đình).
- **Map Legend:** Chú giải nghiêm trọng và điều khiển bản đồ.
- **Quick Actions Panel:** SOS nhanh, Tìm nơi trú ẩn, Kiểm tra gia đình — ngay trên bản đồ.

#### 🛡️ Safety Protocols (Hướng dẫn an toàn)
- **Emergency Contacts:** Gọi trực tiếp Cảnh sát (113), Cứu hỏa (114), Cấp cứu (115) — 1 chạm.
- **Safety Guides:** 5 hướng dẫn chi tiết với nội dung mở rộng:
  - 📦 Trước khi lũ đến (Chuẩn bị)
  - 🏠 Trong khi lũ (Ứng phó khẩn cấp)
  - 📝 Sau cơn lũ (Khắc phục)
  - 🏃 Hướng dẫn sơ tán
  - 🏥 Xử lý y tế khẩn cấp
- **4G SOS SMS:** Đăng ký gói data khẩn cấp từ Viettel, Vinaphone, Mobifone — hoạt động khi không có internet.

#### 📰 News & Alerts (Tin tức & Cảnh báo)
- **Flood News Feed:** Tin tức lũ lụt tổng hợp với hình ảnh, nguồn tin, nhãn loại bài (Nguy hiểm / Cảnh báo / Thông tin), và tóm tắt nội dung.
- **Report Issue Form:** Form báo cáo vấn đề (Bug / Tính năng / Dữ liệu / Khác) với đính kèm file, drag-and-drop.

#### 👨‍👩‍👧‍👦 Family Safety (An toàn gia đình)
- **Tìm người thân:** Tìm kiếm bằng số điện thoại, gửi lời mời kết nối với quan hệ (Bố, Mẹ, ...).
- **Quản lý kết nối:** Chấp nhận/từ chối lời mời, xóa kết nối.
- **Trạng thái an toàn:** Cập nhật trạng thái cá nhân (An toàn / Nguy hiểm / Bị thương / Chưa rõ) + ghi chú sức khỏe.
- **Theo dõi gia đình:** Xem trạng thái an toàn, ghi chú sức khỏe, địa chỉ, thời gian cập nhật cuối của từng thành viên.

#### 🤖 AI ChatBot
- Trợ lý AI tích hợp sẵn (powered by Groq / Llama 3.3 70B) — hỗ trợ ngay lập tức về an toàn lũ lụt, hướng dẫn sử dụng app, và câu hỏi chung.
- Quick replies có sẵn ("AquaGuard là gì?", "Phải làm gì khi lũ?", "Cách báo khẩn cấp?", ...).
- Fallback thông minh khi mất kết nối API.
- Hỗ trợ song ngữ Việt–Anh.

#### ⚙️ Settings (Cài đặt)
- **Profile:** Cập nhật tên, email, liên hệ khẩn cấp, giới tính, ngày sinh (tự tính tuổi), địa chỉ (tự phát hiện GPS + reverse geocoding).
- **Family:** Quản lý người thân (xem ở trên).
- **Appearance:** Chọn giao diện Sáng / Tối / Theo hệ thống.
- **Language:** Chuyển đổi Tiếng Việt ↔ English.

### 🗺️ Interactive Live Flood Map
- **Real-time Flood Zones:** Flood severity visualized with 4 distinct color-coded map pins for immediate situational awareness:
    - 🟣 **Purple:** Critical (Emergency)
    - 🔴 **Red:** Severe (High Risk)
    - 🟡 **Amber:** Moderate (Caution)
    - 🟢 **Green:** Safe (Low Risk)
- **Precipitation Radar Overlay:** Live rain radar powered by the free **RainViewer API**, refreshing every 5 minutes.
- **Weather Layers:** Optional wind, temperature, cloud, and pressure overlays via OpenWeatherMap.
- **Sovereign Map Tiles:** Uses **VNDMS Vietnam government tiles** — officially includes Hoàng Sa and Trường Sa island coverage.
- **Admin Map Editor:** Admins can add, edit, and remove flood zone markers directly on the map in real time.
- **Map Legend:** Built-in severity legend and map controls for quick reference.

### 🆘 Emergency Action Center
- **One-Click SOS:** Citizens submit rescue requests with auto GPS capture, reverse geocoding, description, urgency level (4 tiers), and up to 5 scene photos — tracked in real time.
- **Rescue Tracking Map:** Full-screen real-time map showing citizen + rescuer positions, driving route via OSRM, distance/ETA, and WebSocket-powered live location updates.
- **Quick Emergency Contacts:** Direct-dial shortcuts for Police (113), Fire Station (114), and Ambulance (115).
- **Active Alerts Feed:** Real-time community alert stream with severity badges and location data.
- **4G SOS SMS:** One-tap registration for emergency data packages from Viettel, Vinaphone, and Mobifone — works without internet.

### 📰 Community & Support
- **Flood News Feed:** Aggregated flood news and active community reports for situational awareness.
- **Safety Protocol Guides:** Offline-accessible survival instructions for pre-, during-, and post-flood scenarios (5 guide categories).
- **AI ChatBot:** Integrated conversational assistant powered by Groq/Llama 3.3 70B for immediate guidance on flood safety and app usage. Supports bilingual (Vietnamese + English).
- **Report Issue Form:** Citizens can submit bug reports, feature requests, and data issues with file attachments.

### 🔐 Authentication & Sessions
- **Phone + Password Auth:** Primary login is Vietnamese phone number (`+84...`) + password, hashed with bcrypt and issued a role-encoded **JWT** (7-day expiry) by the backend.
- **Optional Google Sign-In:** Firebase Google sign-in is available as a secondary option.
- **Role at Registration:** Users pick their role (Citizen, Rescuer, or Admin) during sign-up; Admin/Rescuer roles require a shared role password.
- **OTP Password Reset:** "Forgot password" sends an SMS OTP via **Twilio Verify**, then issues a short-lived reset session.
- **Transactional Email:** Welcome email on registration and family-invite/accept notifications are sent via **Resend** (fire-and-forget, never blocks the request).
- **Persistent Sessions:** JWT + user are stored client-side and restored on reload; falls back to Firebase user data if the backend is unreachable.

---

## 🛠 Tech Stack

### Frontend (`/frontend`)

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | Component-based UI framework |
| **Vite** | 6 | Build tool & dev server |
| **Tailwind CSS** | 4 | Utility-first CSS styling (`@tailwindcss/vite`) |
| **React Router DOM** | 7 | Client-side routing |
| **Firebase SDK** | 12 | Optional Google sign-in |
| **Leaflet + React Leaflet** | 1.9 / 5.0 | Interactive map rendering |
| **Recharts** | 3 | Charts (analytics) |
| **react-joyride** | 3 | Guided onboarding tours |

### Backend (`/backend`)

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | JavaScript runtime (CommonJS) |
| **Express.js** | 4 | REST API framework |
| **PostgreSQL** (`pg`) | — | Primary relational database — raw SQL, no ORM |
| **ws** | 8 | Native WebSocket server for live rescue tracking |
| **JWT** + **bcrypt** | — | Role-encoded access tokens + password hashing |
| **Resend** | — | Transactional email |
| **Twilio Verify** | — | SMS OTP for password reset |
| **Multer + Cloudinary** | — | Image upload and CDN storage |

### Architecture

```
AquaGuard Web
├── frontend/               # React 19 + Vite SPA  (ESM)
│   └── src/
│       ├── config/             # Firebase init, RBAC config
│       ├── contexts/           # AuthContext, LanguageContext
│       ├── hooks/              # WebSocket rescue-tracking hook
│       ├── services/           # API service layer (VITE_API_BASE_URL)
│       ├── translations/       # i18n (vi.js, en.js)
│       ├── utils/              # Auth storage, phone utils
│       ├── pages/              # Page components by role (admin/ rescuer/ citizen/)
│       └── components/         # Reusable UI (map, layout, auth, chat, dashboard,
│                               #   rescue, reports, safety, alerts, onboarding, ...)
├── backend/                # Node.js + Express REST API + WebSocket  (CommonJS)
│   ├── index.js                # Entry point: Express, CORS, rate limits, WS server
│   ├── db.js                   # Shared pg Pool (auto-SSL for cloud DBs)
│   ├── routes/                 # auth.js, sos.js, family.js, analytics.js (logic inline)
│   ├── middleware/             # auth.js (JWT + role guards), rateLimit.js
│   ├── utils/                  # email.js (Resend), upload.js (Cloudinary)
│   └── migrations/             # Raw .sql migrations (applied manually)
└── infrastructure/         # docker-compose.yml, Makefile, database/init_db.sql
```

---

## 🎭 Role-Based Access Control (RBAC)

| Page | Citizen | Rescuer | Admin | Description |
|---|:---:|:---:|:---:|---|
| Main Dashboard | ✅ | — | — | Family Safety Board, Active SOS Banner, Quick Actions, SOS History |
| Live Flood Map | ✅ | ✅ | — | Interactive map with flood zones, radar, weather layers |
| SOS Request | ✅ | — | — | GPS-based SOS form + personal request tracker + tracking map |
| Rescue Queue | — | ✅ | — | All rescue requests with filter/sort, accept missions |
| Rescuer Missions | — | ✅ | — | Personal mission dashboard with tracking |
| Rescuer Team | — | ✅ | — | Create/join rescue groups |
| Safety Protocols | ✅ | — | — | Emergency contacts + 5 safety guides |
| News & Alerts | ✅\* | ✅\* | — | Flood news feed, report issue form |
| About Us | ✅\* | ✅\* | — | About the AquaGuard team |
| Admin Dashboard | — | — | ✅ | System overview, flood map editor, user management |
| Admin SOS Requests | — | — | ✅ | All SOS requests management |
| Admin Sensors | — | — | ✅ | Flood sensor monitoring |
| Admin Analytics | — | — | ✅ | System-wide analytics |
| Settings | ✅ | ✅ | ✅ | Profile, Family, Appearance, Language |
| AI ChatBot | ✅ | ✅ | ✅ | Global floating chatbot (all roles) |

> \* Pages marked with ✅\* are accessible but not shown in the primary sidebar navigation.

---

## 🚀 Getting Started

### 🐳 Quick Start with Docker (Recommended)

Cách nhanh nhất để chạy dự án — chỉ cần **Docker Desktop** được cài sẵn.

```bash
# 1. Clone repo
git clone https://github.com/shynnguyen1004/AquaGuard-WebApp.git
cd AquaGuard-WebApp

# 2. Copy env templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Điền API keys vào backend/.env và frontend/.env (nhờ team lead cấp)

# 4. Khởi chạy toàn bộ hệ thống (compose file nằm trong infrastructure/)
docker compose -f infrastructure/docker-compose.yml up --build
```

Sau khi chạy xong:
- 🌐 **Frontend:** http://localhost:5173
- 🔌 **Backend API:** http://localhost:5001/api/health
- 🐘 **PostgreSQL:** localhost:5433 (user: `aquaguard`, pass: `aquaguard_pass`, db: `aquaguard_db`)

> 📌 Database sẽ tự động được khởi tạo với schema và dữ liệu mẫu từ `infrastructure/database/init_db.sql`.

Các lệnh Docker hữu ích (hoặc dùng `make -f infrastructure/Makefile <target>`):
```bash
DC="docker compose -f infrastructure/docker-compose.yml"

$DC down                       # Dừng toàn bộ services (giữ data)
$DC logs -f backend            # Xem logs backend
$DC down -v && $DC up --build  # Reset database (xoá data, chạy lại init_db.sql)
$DC up postgres backend        # Chỉ chạy backend + database

# Thêm 1 package npm cho backend → phải build lại & làm mới anonymous node_modules volume:
$DC up -d --build --renew-anon-volumes backend
```

> ⚠️ Backend chạy `node --watch` nên sửa file `.js` tự reload. Nhưng đổi `backend/.env` thì phải `up -d` để recreate container (lệnh `restart` không nạp lại env).

---

### 🖥️ Manual Setup (Without Docker)

#### Prerequisites
- **Node.js** >= 20.x, **npm** >= 10.x
- A **PostgreSQL** instance (local, Docker, or a cloud provider like Neon)

#### 1. Backend (`/backend`)

```bash
cd backend
npm install
cp .env.example .env          # rồi điền giá trị thật
npm run dev                   # node --watch index.js → http://localhost:5001
```

Tạo schema bằng cách nạp `infrastructure/database/init_db.sql` vào database của bạn
(ví dụ: `psql "$DATABASE_URL" -f infrastructure/database/init_db.sql`).
Không có migration runner — các file trong `backend/migrations/` là SQL chạy thủ công.

#### 2. Frontend (`/frontend`)

```bash
cd frontend
npm install
cp .env.example .env          # rồi điền giá trị thật
npm run dev                   # vite → http://localhost:5173
npm run build                 # production build
```

---

## 🔑 Environment Variables Summary

Env files theo từng package (đều được git-ignore): `backend/.env` và `frontend/.env`.

| Variable | Location | Required | Description |
|---|---|:---:|---|
| `DATABASE_URL` | `backend/.env` | ✅ | PostgreSQL connection string (auto-SSL cho cloud DB) |
| `JWT_SECRET` | `backend/.env` | ✅ | JWT signing secret |
| `PORT` | `backend/.env` | — | Backend port (mặc định 5001) |
| `CLOUDINARY_URL` | `backend/.env` | — | Image upload (Cloudinary) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID` | `backend/.env` | — | SMS OTP (Twilio Verify) |
| `RESEND_API_KEY` / `EMAIL_FROM` | `backend/.env` | — | Transactional email (Resend) |
| `VITE_API_BASE_URL` / `VITE_WS_URL` | `frontend/.env` | ✅ | Backend REST + WebSocket URLs |
| `VITE_FIREBASE_*` | `frontend/.env` | ✅ | Firebase client SDK (Google sign-in) |
| `VITE_GROQ_API_KEY` | `frontend/.env` | — | AI ChatBot (Groq/Llama) |
| `VITE_OWM_API_KEY` / `VITE_WINDY_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY` | `frontend/.env` | — | Weather overlays, forecast, geocoding |

> ⚠️ Mọi biến `VITE_` được nhúng vào bundle và lộ ra trình duyệt — không đặt secret ở đó.

---

## 📡 API Overview

Base URL: `<backend>/api`. All protected routes use a `Bearer <JWT>` header. Representative endpoints (see `backend/routes/` for the full list):

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register with phone + password + role |
| `POST` | `/api/auth/login` | — | Login, returns JWT |
| `POST` | `/api/auth/forgot-password` · `/verify-otp` · `/reset-password` | — | SMS OTP password reset (Twilio) |
| `GET` · `PUT` | `/api/auth/profile` | 🔒 JWT | Get / update current user profile |
| `POST` | `/api/auth/rescue-groups` · `/:id/invite` | 🔒 Rescuer | Create rescue group / invite members |
| `POST` | `/api/sos` | 🔒 Citizen | Create an SOS request (with images) |
| `GET` | `/api/sos/my` · `/all` · `/team` | 🔒 JWT | List own / all / team SOS requests |
| `PUT` | `/api/sos/:id/assign` · `/accept` · `/complete` · `/cancel` | 🔒 Rescuer | Mission lifecycle transitions |
| `GET` | `/api/family/search` | 🔒 JWT | Find a user by phone number |
| `POST` · `PUT` | `/api/family/request` · `/requests/:id/accept` | 🔒 JWT | Send / accept family connection (triggers email) |
| `GET` | `/api/analytics/overview` · `/users` · `/rescue` | 🔒 Admin | System-wide analytics |
| `GET` | `/api/health` | — | Health check (used by uptime monitor) |

---

## 🗺️ Deployment

| Part | Hosted on | Notes |
|---|---|---|
| **Frontend** | **Vercel** — `aquaguard.vn` (+ `www`) and the `*.vercel.app` subdomain | Auto-deploys on push to `main`. |
| **Backend API + WebSocket** | **Render** (`aquaguard-api.onrender.com`) | Free tier sleeps after ~15 min idle; an UptimeRobot monitor pings `/api/health` to keep it warm. |
| **PostgreSQL** | **Neon** (serverless Postgres) | Connected via `DATABASE_URL`; SSL auto-enabled. |
| **Email** | **Resend** | Sends from the DNS-verified domain `aquaguard.vn`. |

Production secrets are configured as environment variables on each platform (Render / Vercel), not committed to the repo.

---

## 🔮 Roadmap

**Frontend**
- [x] Role-Based Access Control (Citizen / Rescuer / Admin)
- [x] Interactive Flood Map with Leaflet + VNDMS tiles
- [x] Live Rain Radar Overlay (RainViewer — free)
- [x] Admin Flood Map Editor
- [x] Rescuer Mission Dashboard with auto-refresh
- [x] Citizen SOS Request with GPS, images, and 4-tier urgency
- [x] Rescue Tracking Map (real-time citizen-rescuer positioning via WebSocket)
- [x] OSRM-powered driving route with distance/ETA display
- [x] Family Safety Board with real-time safety status tracking
- [x] Family connection system (search by phone, invite, accept/reject)
- [x] Active SOS Banner on Dashboard with push-to-SOS
- [x] SOS Request History widget
- [x] Phone + Password Auth (bcrypt + JWT) with optional Google sign-in
- [x] OTP password reset via Twilio Verify
- [x] Transactional email via Resend (welcome + family invite/accept notifications)
- [x] Role selection at registration
- [x] Mobile-responsive layout with Bottom Navigation
- [x] AI ChatBot integration (Groq / Llama 3.3 70B)
- [x] Bilingual support (Vietnamese + English)
- [x] Dark/Light/System theme
- [x] Profile management with GPS location detection
- [x] Rescuer Team/Group system (individual + group missions)
- [ ] **PWA + Service Worker** (offline capability)
- [ ] **IndexedDB offline queue** for SOS/reports without internet
- [ ] **Push Notifications** (FCM) when entering flood zones
- [ ] **Heatmap density layer** (leaflet.heat) for rescue request clusters
- [ ] **Commune-level (xã) boundaries** overlay for granular risk display
- [ ] **Forecast layer** integration (Google Flood Hub / GloFAS API)

**Backend**
- [x] JWT auth middleware with role-based guards (`requireAdmin`, `requireRoles`)
- [x] Phone + password auth with bcrypt; in-memory rate limiting on auth routes
- [x] SOS CRUD API with image upload (Cloudinary) + mission lifecycle
- [x] Family connection API (search, request, accept, reject, status) with email notifications
- [x] Profile API (CRUD with GPS coordinates)
- [x] Rescue Group API (create, join, manage)
- [x] Real-time rescue tracking via native WebSocket (`ws`) server
- [x] Admin analytics API
- [ ] **Geospatial queries** for nearby shelters/resources
- [ ] **Trust Score system** for community report verification

---

## 🤝 Contributing

Contributions are always welcome! Please follow these steps:

1. Fork the project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages.

---

## 🔗 Related Projects

| Project | Description | Link |
|---|---|---|
| **AquaGuard iOS** | Native SwiftUI companion app | [GitHub](https://github.com/shynnguyen1004/AquaGuard-iOS) |
| **AquaGuard Web** | This repository | — |

---

## 📖 Hướng dẫn sử dụng cho Citizen (User Guide)

> Phần này hướng dẫn chi tiết cách sử dụng AquaGuard Web cho người dùng với vai trò **Citizen** (Người dân).

### 1. Đăng nhập & Chọn vai trò

1. Truy cập [AquaGuard Web](https://aquaguard.vn).
2. **Đăng ký** bằng **số điện thoại + mật khẩu** (hoặc đăng nhập bằng **Google**). Khi đăng ký có thể nhập thêm email để nhận thông báo.
3. Khi đăng ký: chọn vai trò **Citizen** (vai trò Rescuer/Admin cần mật khẩu vai trò).
4. Vai trò được lưu cùng tài khoản — không cần chọn lại ở các lần đăng nhập sau.

### 2. Dashboard — Trang chủ

| Khu vực | Mô tả |
|---|---|
| **Header** | Hiển thị tên bạn + 3 nút trạng thái (An toàn / Nguy hiểm / Bị thương) — nhấn để cập nhật cho gia đình thấy |
| **Active SOS Banner** | Nếu bạn đang có yêu cầu SOS chưa xử lý xong, banner sẽ hiện ở đây — nhấn để xem chi tiết |
| **Family Safety Board** | Danh sách người thân và trạng thái an toàn — cập nhật tự động mỗi 30 giây |
| **Pending Invites** | Lời mời kết nối gia đình chưa xử lý — nhấn ✅ chấp nhận hoặc ✕ từ chối |
| **Quick Actions** | 3 nút: Gửi SOS (đỏ), Kiểm tra gia đình, Xem bản đồ lũ |
| **SOS History** | 5 yêu cầu SOS gần nhất đã hoàn thành/hủy |

### 3. Gửi yêu cầu SOS khẩn cấp

1. Vào trang **SOS** từ sidebar hoặc nhấn **Quick Action** ► Gửi SOS.
2. Nhấn nút **"Gửi SOS"** (đỏ) ở góc phải.
3. Điền form:
   - **Vị trí:** GPS tự động bắt + reverse geocode thành địa chỉ. Có thể chỉnh sửa.
   - **Mô tả:** Mô tả tình huống nguy hiểm.
   - **Mức độ khẩn cấp:** Thấp / Trung bình / Cao / Nghiêm trọng.
   - **Ảnh hiện trường:** Tối đa 5 ảnh, kéo thả hoặc chọn file.
4. Nhấn **"Gửi yêu cầu SOS"**.
5. Yêu cầu sẽ xuất hiện trong danh sách với trạng thái **"Đang chờ"**.

### 4. Theo dõi trạng thái SOS

Sau khi gửi SOS, theo dõi quy trình:

```
🟡 Đang chờ (Pending) → 🔵 Đã phân công (Assigned) → 🔵 Đang cứu hộ (In Progress) → 🟢 Hoàn thành (Resolved)
```

- Trạng thái **tự động cập nhật mỗi 10 giây** — không cần refresh.
- Khi trạng thái chuyển sang **"Đang cứu hộ"**, nút **"Xem bản đồ"** sẽ xuất hiện.
- Nhấn **"Xem bản đồ"** để mở **Rescue Tracking Map** — bản đồ toàn màn hình hiển thị:
  - 📍 **Marker đỏ:** Vị trí của bạn
  - 📍 **Marker xanh:** Vị trí nhân viên cứu hộ
  - 🛣️ **Đường đi:** Route từ rescuer đến bạn
  - 📏 **Khoảng cách + thời gian ước tính**
  - ⚡ **Cập nhật real-time** qua WebSocket

### 5. Xem bản đồ lũ

1. Vào trang **Live Flood Map** từ sidebar.
2. Xem các vùng ngập lụt với mã màu:
   - 🟣 Tím = Nghiêm trọng
   - 🔴 Đỏ = Nguy hiểm cao
   - 🟡 Vàng = Cảnh báo
   - 🟢 Xanh = An toàn
3. Bật/tắt các lớp:
   - **Radar mưa** (RainViewer)
   - **Lớp gió / nhiệt độ / mây**
4. Sử dụng **Quick Actions** ở bên phải:
   - **SOS:** Gửi yêu cầu khẩn cấp
   - **Find Shelter:** Tìm nơi trú ẩn gần nhất
   - **Family Check:** Kiểm tra gia đình

### 6. Kết nối gia đình

1. Vào **Settings** ► tab **Family** (hoặc nhấn Quick Action ► Kiểm tra gia đình).
2. Nhấn **"Thêm người thân"**.
3. Nhập số điện thoại → nhấn 🔍 để tìm kiếm.
4. Nếu tìm thấy: nhập quan hệ (Bố, Mẹ, ...) → nhấn **"Gửi lời mời"**.
5. Đối phương sẽ thấy lời mời trên Dashboard — chấp nhận để kết nối.
6. Sau khi kết nối: cập nhật trạng thái an toàn của bạn để gia đình theo dõi.

### 7. Hướng dẫn an toàn

1. Vào trang **Safety Protocols** từ sidebar.
2. Xem 3 số khẩn cấp — nhấn để gọi trực tiếp.
3. Đọc 5 hướng dẫn an toàn — nhấn để mở rộng nội dung chi tiết.
4. Cuộn xuống để xem hướng dẫn đăng ký **gói data SOS 4G** khi mất internet.

### 8. AI ChatBot

1. Nhấn nút 💬 ở góc phải dưới (desktop) hoặc từ Mobile Header.
2. Hỏi bất kỳ câu hỏi nào — chatbot hỗ trợ cả Tiếng Việt và English.
3. Quick replies có sẵn để hỏi nhanh.
4. Khi mất kết nối API → fallback tự động cung cấp thông tin khẩn cấp.

### 9. Cài đặt cá nhân

| Tab | Nội dung |
|---|---|
| **Profile** | Cập nhật tên, email, liên hệ khẩn cấp, giới tính, ngày sinh, địa chỉ (tự phát hiện GPS) |
| **Family** | Quản lý người thân, cập nhật trạng thái an toàn + ghi chú sức khỏe |
| **Appearance** | Giao diện: Sáng / Tối / Theo hệ thống |
| **Language** | Ngôn ngữ: Tiếng Việt / English |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🏆 Recognition

AquaGuard was awarded **1st Prize** at the OPC Competition and is currently being upgraded for the **EPICS 8th (Engineering Projects in Community Service)** international competition.

---

<div align="center">

**Built with ❤️ for a safer community.**

*Protecting lives during Vietnam's flood and typhoon season.*

</div>
