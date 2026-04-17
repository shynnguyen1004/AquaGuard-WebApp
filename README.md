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

[Live Demo](https://aqua-guard-web-app.vercel.app) · [iOS App](https://github.com/shynnguyen1004/AquaGuard-iOS) · [Report a Bug](https://github.com/shynnguyen1004/AquaGuard-WebApp/issues) · [Request a Feature](https://github.com/shynnguyen1004/AquaGuard-WebApp/issues)

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
- **Firebase Auth:** Google Sign-In and Phone OTP (with invisible reCAPTCHA) — no username/password required.
- **First-Login Role Selection:** New users choose their role (Citizen, Rescuer, or Admin) via a guided modal — persisted to Firestore.
- **Persistent Sessions:** Auth state restored on page reload via `onAuthStateChanged` + `localStorage` fallback.
- **Resilient Auth Chain:** If the backend API is unreachable, the app automatically falls back to Firebase user data — zero downtime for end users.

---

## 🛠 Tech Stack

### Frontend (`/client`)

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | Component-based UI framework |
| **Vite** | 6 | Build tool & dev server |
| **Tailwind CSS** | 4 | Utility-first CSS styling |
| **React Router DOM** | 7 | Client-side routing |
| **Firebase SDK** | 12 | Auth (Google/Phone OTP) + Firestore real-time DB |
| **Leaflet + React Leaflet** | 1.9 / 5.0 | Interactive map rendering |
| **React Router DOM** | 7 | SPA routing |

### Backend (`/server`)

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | JavaScript runtime |
| **Express.js** | 4 | REST API framework |
| **PostgreSQL / MySQL** | — | Primary relational database (via migrations) |
| **Firebase Admin SDK** | — | Server-side Firebase token verification |
| **Redis** | — | Caching, rate limiting, session management |
| **JWT** | — | Secure, role-encoded access tokens |
| **Multer + Cloudinary** | — | Image upload and CDN storage |

### Architecture

```
AquaGuard Web
├── frontend/           # React 19 + Vite SPA
│   └── src/
│       ├── config/         # Firebase init, RBAC config
│       ├── contexts/       # AuthContext, LanguageContext
│       ├── hooks/          # useRescueTracking (WebSocket)
│       ├── services/       # API service layer
│       ├── translations/   # i18n (vi.json, en.json)
│       ├── utils/          # Auth storage, phone utils
│       ├── pages/          # Page components by role
│       │   ├── admin/      # AdminDashboard, AdminSOSRequests
│       │   ├── rescuer/    # RescuerDashboard, RescuerTeamPage
│       │   └── citizen/    # CitizenSOSPage
│       └── components/     # Reusable UI components
│           ├── map/        # FloodMap, AdminFloodMapEditor, MapLegend
│           ├── layout/     # Sidebar, MobileNav, Header, RightPanel
│           ├── auth/       # ProtectedRoute, RoleSelectionModal, LocationGate
│           ├── chat/       # AI ChatBot (Groq/Llama)
│           ├── dashboard/  # ActiveSOSBanner, FamilySafetyBoard, QuickActions, SOSHistory
│           ├── rescue/     # RescueRequestForm, RescueRequestCard, RescueTrackingMap
│           ├── reports/    # FloodNewsFeed, ReportIssueForm
│           ├── safety/     # SafetyGuides, EmergencyContacts
│           ├── alerts/     # ActiveAlerts, AlertCard
│           └── actions/    # QuickActions, EmergencySupport
├── server/             # Node.js + Express REST API
│   └── src/
│       ├── config/         # DB, Redis, Firebase Admin
│       ├── models/         # Database models
│       ├── controllers/    # Route controllers
│       ├── routes/         # API route definitions
│       └── middlewares/    # Auth, Role, Upload, RateLimit
├── database/           # init_db.sql (schema + seed data)
└── infrastructure/     # Docker Compose, Makefile
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
cp .env.example .env
cp server/.env.example server/.env

# 3. Điền API keys vào .env và server/.env (nhờ team lead cấp)

# 4. Khởi chạy toàn bộ hệ thống
docker compose up --build
```

Sau khi chạy xong:
- 🌐 **Frontend:** http://localhost:5173
- 🔌 **Backend API:** http://localhost:5001/api/health
- 🐘 **PostgreSQL:** localhost:5433 (user: `aquaguard`, pass: `aquaguard_pass`, db: `aquaguard_db`)

> 📌 Database sẽ tự động được khởi tạo với schema và dữ liệu mẫu từ `database/init_db.sql`.

Các lệnh Docker hữu ích:
```bash
# Dừng toàn bộ services
docker compose down

# Xem logs
docker compose logs -f backend
docker compose logs -f frontend

# Reset database (xoá data cũ, chạy lại init)
docker compose down -v && docker compose up --build

# Chỉ chạy backend + database (không cần frontend container)
docker compose up postgres backend
```

---

### 🖥️ Manual Setup (Without Docker)

#### Prerequisites

Ensure the following are installed on your machine:

- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** or **MySQL** (running locally or via Docker)
- A **Firebase** project with Authentication (Google + Phone) and Firestore enabled
- *(Optional)* **Redis** for caching and rate limiting

---

### 1. Clone the Repository

```bash
git clone https://github.com/shynnguyen1004/AquaGuard-WebApp.git
cd AquaGuard-WebApp
```

---

### 2. Set Up the Backend (`/server`)

#### Install Dependencies

```bash
cd server
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `/server` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aquaguard_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> 📌 You can download your Firebase service account credentials from **Firebase Console → Project Settings → Service Accounts → Generate new private key**.

#### Run Database Migrations

```bash
npm run migrate
```

#### Start the Backend Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

---

### 3. Set Up the Frontend (`/client`)

#### Install Dependencies

```bash
cd ../client
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `/client` directory:

```env
# Backend API
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Firebase Client SDK
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: OpenWeatherMap weather overlays
VITE_OWM_API_KEY=your_owm_api_key
```

#### Start the Frontend Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### 4. Run Both Servers Concurrently (Optional)

From the project root, you can run both servers with a single command using `concurrently`:

```bash
# Install concurrently at root (one-time)
npm install -g concurrently

# Run both
concurrently "npm run dev --prefix server" "npm run dev --prefix client"
```

---

## 🔑 Environment Variables Summary

| Variable | Location | Required | Description |
|---|---|:---:|---|
| `PORT` | `/server/.env` | ✅ | Backend server port |
| `DB_HOST`, `DB_NAME`, etc. | `/server/.env` | ✅ | Database connection config |
| `FIREBASE_PROJECT_ID` | `/server/.env` | ✅ | Firebase Admin SDK credentials |
| `JWT_SECRET` | `/server/.env` | ✅ | JWT signing secret |
| `REDIS_HOST` | `/server/.env` | — | Redis connection (optional) |
| `CLOUDINARY_*` | `/server/.env` | — | Image upload credentials |
| `VITE_API_BASE_URL` | `/client/.env` | ✅ | Backend API base URL |
| `VITE_FIREBASE_*` | `/client/.env` | ✅ | Firebase client SDK config |
| `VITE_OWM_API_KEY` | `/client/.env` | — | OpenWeatherMap API key (optional) |

---

## 📡 API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Verify Firebase token, return custom JWT |
| `POST` | `/api/v1/auth/register` | — | Register new user with role |
| `GET` | `/api/v1/auth/me` | 🔒 JWT | Get current user profile |
| `GET` | `/api/v1/flood-zones` | — | Fetch all flood zones |
| `POST` | `/api/v1/flood-zones` | 🔒 Admin | Create new flood zone |
| `POST` | `/api/v1/reports` | 🔒 JWT | Submit a flood report with images |
| `GET` | `/api/v1/reports/nearby` | 🔒 JWT | Get reports within a radius |
| `POST` | `/api/v1/rescue-requests` | 🔒 Citizen | Create a rescue request |
| `PATCH` | `/api/v1/rescue-requests/:id/assign` | 🔒 Rescuer | Accept a rescue mission |
| `GET` | `/api/v1/resources/nearby` | 🔒 JWT | Find shelters and resources nearby |

---

## 🗺️ Deployment

The frontend is deployed on **Vercel** with automatic deployments from the `main` branch.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/shynnguyen1004/AquaGuard-WebApp)

For the backend, any Node.js-compatible platform works (Railway, Render, Fly.io, AWS EC2).

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
- [x] Firebase Auth (Google + Phone OTP)
- [x] First-login Role Selection Modal
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
- [x] Firebase Auth token verification middleware
- [x] JWT role-based authorization
- [x] FloodZone CRUD API
- [x] SOS CRUD API with image upload (Cloudinary)
- [x] Family connection API (search, request, accept, reject, status)
- [x] Profile API (CRUD with GPS coordinates)
- [x] Rescue Group API (create, join, manage)
- [x] Real-time rescue tracking via Firebase Realtime Database
- [ ] **Geospatial queries** (`$near`, `$geoWithin`) for nearby resources
- [ ] **Redis caching** for flood zone tiles
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

1. Truy cập [AquaGuard Web](https://aqua-guard-web-app.vercel.app).
2. Đăng nhập bằng **Google** hoặc **Số điện thoại** (OTP).
3. Lần đầu đăng nhập: chọn vai trò **Citizen** từ modal chọn vai trò.
4. Hệ thống sẽ lưu vai trò vào Firestore — không cần chọn lại.

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
