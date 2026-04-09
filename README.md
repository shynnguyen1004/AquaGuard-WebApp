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
- **⛑️ Rescuer Dashboard:** Mission-focused interface with an active rescue requests feed, mission acceptance workflow (`Pending → Assigned → In Progress → Resolved`), and personal mission history. Real-time updates via Firestore `onSnapshot`.
- **🏘️ Citizen Dashboard:** Community-oriented interface with a personal SOS request tracker, community flood news feed, and quick access to safety resources.

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
- **One-Click SOS:** Citizens submit rescue requests with GPS location, description, and urgency level — tracked in real time.
- **Quick Emergency Contacts:** Direct-dial shortcuts for Police (113), Fire Station (114), and Ambulance (115).
- **Active Alerts Feed:** Real-time community alert stream with severity badges and location data.
- **4G SOS SMS:** One-tap registration for emergency data packages from Viettel, Vinaphone, and Mobifone — works without internet.

### 📰 Community & Support
- **Flood News Feed:** Aggregated flood news and active community reports for situational awareness.
- **Safety Protocol Guides:** Offline-accessible survival instructions for pre-, during-, and post-flood scenarios.
- **AI ChatBot:** Integrated conversational assistant for immediate guidance on flood safety and app usage.
- **Report Issue Form:** Citizens can submit field reports with photos and location data to the community map.

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
├── client/          # React 19 + Vite SPA
│   ├── src/
│   │   ├── config/      # Firebase init, RBAC config
│   │   ├── contexts/    # AuthContext (global auth state)
│   │   ├── pages/       # Page components by role
│   │   │   ├── admin/
│   │   │   ├── rescuer/
│   │   │   └── citizen/
│   │   └── components/  # Reusable UI components
│   │       ├── map/     # FloodMap, AdminFloodMapEditor
│   │       ├── layout/  # Sidebar, MobileNav, Header
│   │       ├── auth/    # ProtectedRoute, RoleSelectionModal
│   │       └── chat/    # AI ChatBot
└── server/          # Node.js + Express REST API
    └── src/
        ├── config/      # DB, Redis, Firebase Admin
        ├── models/      # Database models
        ├── controllers/ # Route controllers
        ├── routes/      # API route definitions
        └── middlewares/ # Auth, Role, Upload, RateLimit
```

---

## 🎭 Role-Based Access Control (RBAC)

| Page | Citizen | Rescuer | Admin |
|---|:---:|:---:|:---:|
| Main Dashboard | ✅ | ✅ | — |
| Live Flood Map | ✅ | ✅ | — |
| SOS Request | ✅ | — | — |
| Rescue Requests | — | ✅ | — |
| Rescuer Dashboard | — | ✅ | — |
| Safety Protocols | ✅ | ✅ | — |
| Admin Dashboard | — | — | ✅ |
| User Management | — | — | ✅ |
| Flood Map Editor | — | — | ✅ |
| Settings | ✅ | ✅ | ✅ |

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
- [x] Rescuer Mission Dashboard (real-time `onSnapshot`)
- [x] Citizen SOS Request with status tracking
- [x] Firebase Auth (Google + Phone OTP)
- [x] First-login Role Selection Modal
- [x] Mobile-responsive layout with Bottom Navigation
- [x] AI ChatBot integration
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
- [ ] **Full model suite** (User, Report, RescueRequest, Resource)
- [ ] **Geospatial queries** (`$near`, `$geoWithin`) for nearby resources
- [ ] **Cloudinary image pipeline** for flood reports
- [ ] **Redis caching** for flood zone tiles
- [ ] **WebSocket / Socket.io** for live rescuer location tracking
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
