# AquaGuard — System Architecture

> **Version:** 2.0 | **Last updated:** 2026-04-15  
> This document describes the High-Level Architecture of the AquaGuard system — a web application for flood disaster management, rescue operations, and family tracking.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Layered Architecture](#3-layered-architecture)
4. [Deployment Architecture](#4-deployment-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Architecture](#7-database-architecture)
8. [Communication Protocols](#8-communication-protocols)
9. [External Services Integration](#9-external-services-integration)
10. [Security Architecture](#10-security-architecture)
11. [Tech Stack Summary](#11-tech-stack-summary)

---

## 1. System Overview

### 1.1 Description

**AquaGuard** is a comprehensive web application for flood disaster management, built on a **3-Tier Client-Server Architecture**:

- **Presentation Tier** — Frontend SPA (React 19 + Vite 6)
- **Application Tier** — Backend REST API + WebSocket (Express.js + Node.js)
- **Data Tier** — PostgreSQL (primary data) + Firebase Firestore (real-time map data)

### 1.2 Core Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | 🗺️ Live Flood Map | Display flood zones, weather, and wind forecast in real-time |
| 2 | 🆘 SOS Rescue System | Send/receive emergency rescue requests with GPS tracking |
| 3 | 👨‍👩‍👧‍👦 Family Connection | Track location and safety status of family members |
| 4 | 🚑 Rescue Team Management | Rescue groups, leader/member role assignment |
| 5 | 📊 Analytics & Dashboard | KPI statistics, rescue trends for Admin |
| 6 | 🤖 AI Advisory Chatbot | Flood prevention Q&A (Groq LLM) |
| 7 | 🔐 RBAC Authorization | 3 roles: Citizen, Rescuer, Admin |

### 1.3 System Actors

```mermaid
flowchart LR
    subgraph ACTORS["👥 Actors"]
        direction TB
        CITIZEN["👤 Citizen\n(Resident)"]
        RESCUER["🚑 Rescuer\n(Rescue Team)"]
        ADMIN["🛡️ Admin\n(System Administrator)"]
    end

    subgraph SYSTEM["⚙️ AquaGuard"]
        MAP["🗺️ Flood\nMap"]
        SOS["🆘 SOS\nRescue"]
        FAMILY["👨‍👩‍👧 Family"]
        GROUP["🚑 Rescue\nGroups"]
        ANALYTICS["📊 Analytics"]
        CHATBOT["🤖 Chatbot"]
    end

    CITIZEN --> MAP
    CITIZEN --> SOS
    CITIZEN --> FAMILY
    CITIZEN --> CHATBOT
    RESCUER --> MAP
    RESCUER --> SOS
    RESCUER --> GROUP
    ADMIN --> MAP
    ADMIN --> SOS
    ADMIN --> ANALYTICS

    style ACTORS fill:#f0f9ff,stroke:#3b82f6,stroke-width:2px
    style SYSTEM fill:#ecfdf5,stroke:#10b981,stroke-width:2px
```

---

## 2. High-Level Architecture Diagram

### 2.1 High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ CLIENT TIER"]
        direction TB
        BROWSER["🌐 Web Browser\n(Chrome, Firefox, Safari)"]
        subgraph SPA["📱 Single Page Application\n(Vite Build → Static dist/)"]
            REACT["⚛️ React 19 + Vite 6\nJWT stored in localStorage"]
            LEAFLET["🗺️ React Leaflet\n(Interactive Map)"]
            FIREBASE_SDK["🔥 Firebase SDK\n(Firestore client)"]
        end
    end

    subgraph INFRA["🏗️ INFRASTRUCTURE TIER\n(Docker Compose)"]
        direction TB
        subgraph NGINX_LAYER["🔀 Nginx Reverse Proxy\n:80 / :443 — SSL Termination"]
            NGINX["Nginx Alpine\n• /* → Static files (dist/)\n• /api/* → Backend :5001\n• /ws → Backend :5001\n  (Upgrade: websocket)"]
        end
    end

    subgraph SERVER["⚙️ APPLICATION TIER\n(Node.js Container)"]
        direction TB
        subgraph REQUEST_PIPELINE["📡 Request Pipeline"]
            direction LR
            CORS_MW["🌐 CORS"] --> RATE_LIMIT["⏱️ Rate\nLimiter"] --> AUTH_MW["🔑 JWT\nVerify"] --> MULTER["📎 Multer\n(Upload)"]
        end
        subgraph API_LAYER["🚀 Express.js REST API :5001"]
            AUTH_ROUTE["🔐 /api/auth\nLogin → Issue JWT (7d)\nRegister → OTP → JWT\nProfile, RBAC"]
            SOS_ROUTE["🆘 /api/sos\nCreate, Assign\nAccept, Complete"]
            FAMILY_ROUTE["👨‍👩‍👧 /api/family\nConnect, Track\nLocation, Status"]
            ANALYTICS_ROUTE["📊 /api/analytics\nKPI, Trends"]
            GROQ_PROXY["🤖 /api/chat\n(Groq Proxy)\nAPI key on server"]
        end
        subgraph WS_LAYER["🔌 WebSocket Server (ws library)"]
            WS_SERVER["GPS Tracking\n• join_tracking\n• location_update\n• heartbeat (30s)"]
        end
    end

    subgraph DATA["💾 DATA TIER"]
        direction TB
        POSTGRES[("🐘 PostgreSQL 16\n(Docker — Internal Network)\n━━━━━━━━━━━\n📌 Primary relational data\n• Users, Auth, RBAC\n• SOS requests & logs\n• Family connections\n• Rescue groups\n• Notifications\n• Audit logs\n━━━━━━━━━━━\nACID · SQL JOINs · Aggregates")]
        FIRESTORE[("🔥 Firebase Firestore\n(Google Cloud — Managed)\n━━━━━━━━━━━\n📌 Real-time geo data\n• flood_zones collection\n• Polygon coordinates\n• Severity & color\n━━━━━━━━━━━\nonSnapshot() · NoSQL\nEventual consistency")]
    end

    subgraph EXTERNAL["☁️ EXTERNAL SERVICES"]
        direction TB
        subgraph EXT_SERVER["🔒 Server-Side\n(API keys secured on backend)"]
            TWILIO["📱 Twilio Verify\n(SMS OTP)"]
            CLOUDINARY["☁️ Cloudinary\n(Image CDN)"]
            GROQ_API["🤖 Groq AI\n(LLM API)"]
        end
        subgraph EXT_CLIENT["🌐 Client-Side\n(Public API keys in VITE env)"]
            OWM["🌤️ OpenWeatherMap\n(Weather Tiles)"]
            GOOGLE_MAPS["📍 Google Maps\n(Geocoding)"]
            WINDY["💨 Windy\n(Wind Forecast)"]
        end
    end

    %% Client → Infrastructure
    BROWSER --> SPA
    SPA -->|"HTTPS\nREST API"| NGINX
    SPA -->|"WSS\n(Upgrade: websocket)"| NGINX

    %% Nginx routing
    NGINX -->|"/api/* → Proxy"| CORS_MW
    NGINX -->|"/ws → Proxy\n(Connection: Upgrade)"| WS_SERVER

    %% Middleware pipeline → Routes
    MULTER --> API_LAYER

    %% Routes → Data
    API_LAYER -->|"SQL Queries\n(pg connection pool)"| POSTGRES
    WS_SERVER -->|"UPDATE location\n(throttled: 5s)"| POSTGRES

    %% Client → External (direct — public keys only)
    FIREBASE_SDK <-->|"onSnapshot()\nReal-time subscribe"| FIRESTORE
    LEAFLET -->|"Tile URL\n(public key)"| OWM
    LEAFLET -->|"Geocoding API\n(public key)"| GOOGLE_MAPS
    LEAFLET -->|"Forecast API\n(public key)"| WINDY

    %% Server → External (secret keys secured)
    API_LAYER -->|"Send/Verify\nOTP SMS"| TWILIO
    API_LAYER -->|"Image Upload\n(multer → stream)"| CLOUDINARY
    GROQ_PROXY -->|"LLM Chat\n(API key server-side)"| GROQ_API

    %% Styles
    style CLIENT fill:#dbeafe,stroke:#2563eb,stroke-width:3px
    style INFRA fill:#fefce8,stroke:#ca8a04,stroke-width:3px
    style SERVER fill:#fef3c7,stroke:#d97706,stroke-width:3px
    style DATA fill:#d1fae5,stroke:#059669,stroke-width:3px
    style EXTERNAL fill:#f3e8ff,stroke:#9333ea,stroke-width:3px
    style NGINX fill:#fbbf24,color:#000,stroke:#d97706,stroke-width:2px
    style REQUEST_PIPELINE fill:#fff7ed,stroke:#f97316,stroke-width:1px
    style API_LAYER fill:#f0fdf4,stroke:#22c55e,stroke-width:2px
    style WS_LAYER fill:#fff1f2,stroke:#f43f5e,stroke-width:2px
    style POSTGRES fill:#3b82f6,color:#fff,stroke:#1d4ed8,stroke-width:2px
    style FIRESTORE fill:#ef4444,color:#fff,stroke:#b91c1c,stroke-width:2px
    style EXT_SERVER fill:#fef3c7,stroke:#d97706,stroke-width:1px
    style EXT_CLIENT fill:#ecfdf5,stroke:#10b981,stroke-width:1px
    style GROQ_PROXY fill:#a78bfa,color:#fff,stroke:#7c3aed,stroke-width:2px
```

### 2.2 Authentication Flow

```mermaid
flowchart LR
    subgraph CLIENT_AUTH["🖥️ Client"]
        LOGIN_FORM["📱 Login Form\n(Phone + Password)"]
        REG_FORM["📝 Register Form\n(Phone + Password + OTP)"]
        LS["💾 localStorage\n• aquaguard_token (JWT)\n• aquaguard_role\n• aquaguard_user"]
    end

    subgraph SERVER_AUTH["⚙️ Backend"]
        AUTH_EP["🔐 /api/auth/login\n/api/auth/register"]
        VERIFY["🔑 bcrypt.compare()\nPassword verification"]
        JWT_SIGN["📜 jwt.sign()\nPayload: {id, role}\nExpiry: 7 days"]
        OTP_FLOW["📱 Twilio OTP\n(Register only)"]
    end

    subgraph DB_AUTH["💾 PostgreSQL"]
        USERS_TBL[("users\npassword_hash\nrole, is_active")]
    end

    LOGIN_FORM -->|"POST {phone, password}"| AUTH_EP
    REG_FORM -->|"POST {phone, password, name}\n+ OTP verify"| AUTH_EP
    AUTH_EP --> VERIFY
    AUTH_EP --> OTP_FLOW
    VERIFY <-->|"SELECT password_hash\nWHERE phone = ?"| USERS_TBL
    OTP_FLOW -->|"Twilio SMS"| REG_FORM
    VERIFY --> JWT_SIGN
    JWT_SIGN -->|"Response:\n{token, user, role}"| LS
    LS -->|"All subsequent requests:\nAuthorization: Bearer <token>"| AUTH_EP

    style CLIENT_AUTH fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style SERVER_AUTH fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style DB_AUTH fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style JWT_SIGN fill:#22c55e,color:#fff,stroke:#15803d,stroke-width:2px
```

### 2.3 Deployment & Infrastructure

```mermaid
flowchart TB
    subgraph PROD["🚀 Production Deployment (VPS / Cloud)"]
        subgraph DOCKER_PROD["🐳 Docker Compose"]
            NGX_P["🔀 Nginx Alpine\n:80 / :443\n• SSL termination\n• Serve static dist/\n• Proxy /api & /ws"]
            FE_P["📱 Frontend Container\nNginx serving\nVite build output (dist/)\n— No CDN, local static"]
            BE_P["⚙️ Backend Container\nNode.js (production)\nExpress + WebSocket"]
            PG_P[("🐘 PostgreSQL 16\nInternal network only\nPort NOT exposed\nPersistent volume")]
        end
    end

    subgraph DEV["💻 Development Environment"]
        subgraph DOCKER_DEV["🐳 Docker Compose"]
            FE_D["📱 Vite Dev Server\n:5173 (Hot Reload)"]
            BE_D["⚙️ Node --watch\n:5001 (Hot Reload)"]
            PG_D[("🐘 PostgreSQL\n:5433 → :5432\nExposed for debugging")]
        end
    end

    subgraph CLOUD["☁️ Managed Cloud Services"]
        GCP["🔥 Google Cloud\nFirebase Firestore"]
        TWL["📱 Twilio\nSMS Gateway"]
        CLD["☁️ Cloudinary\nImage CDN"]
    end

    NGX_P --> FE_P
    NGX_P --> BE_P
    BE_P --> PG_P
    BE_P --> TWL
    BE_P --> CLD
    FE_P -.->|"Client SDK"| GCP

    style PROD fill:#d1fae5,stroke:#059669,stroke-width:3px
    style DEV fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style CLOUD fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    style PG_P fill:#3b82f6,color:#fff,stroke:#1d4ed8,stroke-width:2px
```

### 2.4 Error Handling & Fallback Strategy

| External Service | Failure Scenario | Fallback Strategy | User Impact |
|-----------------|------------------|-------------------|-------------|
| **Twilio** (SMS OTP) | Service down / rate limited | Return HTTP 503 with retry message; user retries after cooldown | Registration/password reset temporarily blocked |
| **Cloudinary** (Image CDN) | Upload failure / timeout | Return HTTP 500; allow form submission without image; log error for admin | SOS/profile submission proceeds without photo |
| **Groq AI** (LLM Chatbot) | API key invalid / service down | Backend proxy returns fallback message: "Service temporarily unavailable" | Chatbot shows error state; core features unaffected |
| **Firebase Firestore** (Flood Map) | Connection lost / quota exceeded | Leaflet map displays base tiles without flood overlay; cached last-known data | Map remains functional, flood zones temporarily hidden |
| **OpenWeatherMap** (Weather) | Tile server timeout | Weather layer fails silently; map shows without overlay | No weather layer; map still usable |
| **Google Maps** (Geocoding) | API quota exhausted | Display raw GPS coordinates instead of text address | Coordinates shown instead of readable address |
| **Windy** (Wind Forecast) | API/embed failure | Wind layer hidden; no forecast panel | Wind forecast unavailable; other layers unaffected |
| **PostgreSQL** (Primary DB) | Connection pool exhausted | Express returns HTTP 503; healthcheck triggers container restart | All API requests fail; system recovers on restart |
| **WebSocket** (GPS Tracking) | Connection dropped | Client auto-reconnects with exponential backoff (ws heartbeat 30s) | Brief tracking gap; resumes automatically |

### 2.5 Main Data Flow Summary

| # | Flow | Description | Protocol |
|---|------|-------------|----------|
| 1 | Client → Nginx → Middleware → Express | REST API calls (CRUD, auth, SOS, family, analytics) | HTTPS |
| 2 | Client ↔ Nginx ↔ WebSocket Server | Real-time GPS tracking between citizen & rescuer | WSS (Upgrade header) |
| 3 | Client ↔ Firebase Firestore | Read/write real-time flood zone polygons | Firestore SDK (client) |
| 4 | Client → Backend → Groq AI | AI chatbot Q&A (proxied — API key secured on server) | HTTPS (server proxy) |
| 5 | Client → OWM / Google / Windy | Weather tiles, geocoding, wind forecast (public keys) | HTTPS (client-direct) |
| 6 | Backend → Twilio | Send/verify OTP via SMS (secret key on server) | HTTPS (server-side) |
| 7 | Backend → Cloudinary | Upload/manage images via multer stream (secret key) | HTTPS (server-side) |
| 8 | Backend → PostgreSQL | Primary data CRUD via connection pool (internal network) | TCP (pg protocol) |

---

## 3. Layered Architecture

### 3.1 Layered Architecture Diagram

```mermaid
block-beta
    columns 1

    block:PRESENTATION["🖥️ PRESENTATION LAYER"]:1
        columns 4
        A["React 19\nComponents"] B["React Router\nNavigation"] C["React Leaflet\nMap"] D["Recharts\nCharts"]
    end

    block:STATE["🔄 STATE MANAGEMENT LAYER"]:1
        columns 3
        E["AuthContext\n(User State)"] F["React Hooks\n(useState, useEffect)"] G["Firebase SDK\n(Real-time State)"]
    end

    block:SERVICE["📡 SERVICE / API LAYER"]:1
        columns 3
        H["api.js\n(HTTP Client)"] I["WebSocket\n(Tracking)"] J["Firebase\n(Firestore)"]
    end

    block:APPLICATION["⚙️ APPLICATION / BUSINESS LOGIC LAYER"]:1
        columns 4
        K["Auth\nRoutes"] L["SOS\nRoutes"] M["Family\nRoutes"] N["Analytics\nRoutes"]
    end

    block:MIDDLEWARE_LAYER["🛡️ MIDDLEWARE LAYER"]:1
        columns 4
        O["JWT\nVerify"] P["Rate\nLimiter"] Q["CORS"] R["Multer\n(Upload)"]
    end

    block:DATA_ACCESS["💾 DATA ACCESS LAYER"]:1
        columns 3
        S["pg Pool\n(PostgreSQL)"] T["Cloudinary\nSDK"] U["Twilio\nSDK"]
    end

    block:DATABASE_LAYER["🗄️ DATABASE LAYER"]:1
        columns 2
        V["PostgreSQL 16\n(10 tables)"] W["Firebase\nFirestore"]
    end

    PRESENTATION --> STATE
    STATE --> SERVICE
    SERVICE --> APPLICATION
    APPLICATION --> MIDDLEWARE_LAYER
    MIDDLEWARE_LAYER --> DATA_ACCESS
    DATA_ACCESS --> DATABASE_LAYER

    style PRESENTATION fill:#dbeafe,stroke:#2563eb
    style STATE fill:#e0e7ff,stroke:#6366f1
    style SERVICE fill:#fce7f3,stroke:#ec4899
    style APPLICATION fill:#fef3c7,stroke:#f59e0b
    style MIDDLEWARE_LAYER fill:#fee2e2,stroke:#ef4444
    style DATA_ACCESS fill:#d1fae5,stroke:#10b981
    style DATABASE_LAYER fill:#f0fdf4,stroke:#22c55e
```

### 3.2 Layer Details

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Presentation** | React 19, TailwindCSS 4, React Leaflet, Recharts | User interface, rendering components, interaction |
| **State Management** | AuthContext, React Hooks, Firebase SDK | Application state management (auth, data, real-time) |
| **Service / API** | Fetch API (api.js), WebSocket, Firebase SDK | Communication with backend and external services |
| **Application Logic** | Express.js Routes (auth, sos, family, analytics) | Business logic processing, validation, orchestration |
| **Middleware** | JWT, Rate Limiter, CORS, Multer | Authentication, authorization, security, file upload |
| **Data Access** | pg Pool, Cloudinary SDK, Twilio SDK | Database access, image service, SMS |
| **Database** | PostgreSQL 16, Firebase Firestore | Persistent and real-time data storage |

---

## 4. Deployment Architecture

### 4.1 Development Environment

```mermaid
flowchart TB
    subgraph DEV_MACHINE["💻 Developer Machine"]
        subgraph DOCKER["🐳 Docker Compose"]
            FE_DEV["📱 Frontend Container\n(Vite Dev Server)\n:5173\nHot Reload"]
            BE_DEV["⚙️ Backend Container\n(Node --watch)\n:5001\nHot Reload"]
            PG_DEV[("🐘 PostgreSQL Container\n:5433 → :5432\ninit_db.sql")]
        end
        BROWSER_DEV["🌐 Browser\nlocalhost:5173"]
    end

    BROWSER_DEV --> FE_DEV
    FE_DEV -->|"REST API\nhttp://localhost:5001"| BE_DEV
    FE_DEV -->|"WebSocket\nws://localhost:5001"| BE_DEV
    BE_DEV --> PG_DEV

    style DOCKER fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style DEV_MACHINE fill:#f0f9ff,stroke:#93c5fd
```

### 4.2 Production Environment

```mermaid
flowchart TB
    subgraph INTERNET["🌐 Internet"]
        USER["👤 User\n(Web Browser)"]
    end

    subgraph VPS["🖥️ VPS / Cloud Server"]
        subgraph DOCKER_PROD["🐳 Docker Compose (Production)"]
            NGINX_PROD["🔀 Nginx\nReverse Proxy\n:80 / :443"]

            subgraph APP["Application"]
                FE_PROD["📱 Frontend\n(Nginx Static)\nVite Build → dist/"]
                BE_PROD["⚙️ Backend\n(Node.js)\nExpress + WS"]
            end

            PG_PROD[("🐘 PostgreSQL 16\n(Internal Network)\nPort not exposed")]
        end
    end

    subgraph CLOUD_SERVICES["☁️ Cloud Services"]
        FB["🔥 Firebase\nFirestore"]
        CDN["☁️ Cloudinary\nImage CDN"]
        TWILIO_SVC["📱 Twilio\nSMS OTP"]
    end

    USER -->|"HTTP :80"| NGINX_PROD
    NGINX_PROD -->|"/* (Static)"| FE_PROD
    NGINX_PROD -->|"/api/* (REST)"| BE_PROD
    NGINX_PROD -->|"/ws (WebSocket)"| BE_PROD
    BE_PROD --> PG_PROD
    BE_PROD --> CDN
    BE_PROD --> TWILIO_SVC
    FE_PROD -.->|"Client-side SDK"| FB

    style VPS fill:#fef3c7,stroke:#d97706,stroke-width:3px
    style DOCKER_PROD fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style CLOUD_SERVICES fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    style NGINX_PROD fill:#fbbf24,color:#000,stroke:#d97706,stroke-width:2px
```

### 4.3 Dev vs Production Comparison

| Component | Development | Production |
|-----------|-------------|------------|
| **Frontend** | Vite Dev Server (:5173), Hot Reload | Vite Build → Static files, served by Nginx |
| **Backend** | `node --watch` (:5001), bind mount source | `node index.js`, fixed build |
| **PostgreSQL** | Expose :5433 to host | Internal network, port not exposed |
| **Nginx** | Not used | Reverse proxy :80/:443, SSL termination |
| **File Upload** | Bind mount volumes | Copied into container |
| **Environment** | `.env` files, hot reload | ENV vars, `NODE_ENV=production` |

---

## 5. Frontend Architecture

### 5.1 Component Architecture Diagram

```mermaid
flowchart TB
    subgraph APP_SHELL["🏗️ Application Shell"]
        MAIN["main.jsx\n(Entry Point)"]
        APP["App.jsx\n(BrowserRouter)"]
        AUTH_CTX["AuthContext\n(Global State)"]
    end

    subgraph ROUTING["🧭 Routing Layer"]
        LOGIN_PAGE["LoginPage\n(Public)"]
        DASHBOARD["Dashboard\n(Protected)"]
        UNAUTH["UnauthorizedPage"]
    end

    subgraph LAYOUT["📐 Layout Components"]
        direction TB
        SIDEBAR["Sidebar\n(Desktop Nav)"]
        MOBILE_HEADER["MobileHeader"]
        MOBILE_NAV["MobileBottomNav"]
        RIGHT_PANEL["RightPanel\n(SOS, Alerts)"]
    end

    subgraph PAGES_CITIZEN["🟢 Citizen Pages"]
        DASH_HOME["DashboardHome"]
        CITIZEN_SOS["CitizenSOSPage"]
        SAFETY["SafetyProtocolPage"]
        SETTINGS["SettingsPage"]
    end

    subgraph PAGES_RESCUER["🟡 Rescuer Pages"]
        RESCUER_DASH["RescuerDashboard"]
        RESCUE_REQ["RescueRequestPage"]
    end

    subgraph PAGES_ADMIN["🔴 Admin Pages"]
        ADMIN_DASH["AdminDashboard\n(Multi-tab)"]
    end

    subgraph SHARED_COMPONENTS["🔧 Shared Components"]
        FLOOD_MAP["FloodMap\n(React Leaflet)"]
        CHATBOT["ChatBot\n(Groq AI)"]
        PROTECTED_ROUTE["ProtectedRoute\n(Auth Guard)"]
    end

    MAIN --> APP
    APP --> AUTH_CTX
    APP --> ROUTING
    ROUTING --> DASHBOARD
    DASHBOARD --> LAYOUT
    DASHBOARD --> PAGES_CITIZEN
    DASHBOARD --> PAGES_RESCUER
    DASHBOARD --> PAGES_ADMIN
    DASHBOARD --> SHARED_COMPONENTS

    style APP_SHELL fill:#f0f9ff,stroke:#3b82f6,stroke-width:2px
    style PAGES_CITIZEN fill:#d1fae5,stroke:#10b981
    style PAGES_RESCUER fill:#fef3c7,stroke:#f59e0b
    style PAGES_ADMIN fill:#fee2e2,stroke:#ef4444
    style SHARED_COMPONENTS fill:#e0e7ff,stroke:#6366f1
```

### 5.2 Frontend Directory Structure

```
frontend/src/
├── main.jsx                    # Entry point
├── App.jsx                     # Root + BrowserRouter
├── index.css                   # Global CSS (TailwindCSS 4)
├── config/
│   ├── firebase.js             # Firebase lazy initialization
│   └── rbac.js                 # RBAC roles & permissions
├── contexts/
│   └── AuthContext.jsx         # Authentication state (JWT, role, user)
├── hooks/                      # Custom React hooks
├── services/
│   └── api.js                  # HTTP client (Fetch wrapper)
├── translations/               # i18n (Vietnamese/English)
├── utils/                      # Utility functions
├── pages/
│   ├── LoginPage.jsx           # Phone + Password authentication
│   ├── Dashboard.jsx           # Main layout shell
│   ├── DashboardHome.jsx       # Home dashboard
│   ├── SettingsPage.jsx        # Profile, Family, Theme
│   ├── citizen/
│   │   └── CitizenSOSPage.jsx
│   ├── rescuer/
│   │   └── RescuerDashboard.jsx
│   └── admin/
│       └── AdminDashboard.jsx  # Multi-tab admin panel
└── components/
    ├── auth/                   # ProtectedRoute, RoleSelectionModal
    ├── layout/                 # Sidebar, Header, MobileNav
    ├── map/                    # FloodMap, AdminFloodMapEditor
    ├── chat/                   # ChatBot (Groq AI)
    ├── dashboard/              # Widgets, charts
    ├── rescue/                 # Rescue cards & forms
    └── common/                 # Reusable UI components
```

---

## 6. Backend Architecture

### 6.1 Backend Architecture Diagram

```mermaid
flowchart TB
    subgraph ENTRY["🚀 Entry Point"]
        INDEX["index.js\n(Express + HTTP + WS)"]
    end

    subgraph MIDDLEWARE["🛡️ Middleware Layer"]
        direction LR
        CORS_M["CORS\n(Allowed Origins)"]
        JSON_M["express.json()\n(Body Parser)"]
        AUTH_M["auth.js\n(JWT Verify)"]
        RL_M["rateLimit.js\n(Brute-force Protection)"]
    end

    subgraph ROUTES["📡 Route Layer"]
        direction TB
        AUTH_R["routes/auth.js\n(/api/auth/*)\n• Register / Login\n• Profile / Password\n• User Management\n• Rescue Groups"]
        SOS_R["routes/sos.js\n(/api/sos/*)\n• Create / List SOS\n• Assign / Accept\n• Cancel / Complete"]
        FAMILY_R["routes/family.js\n(/api/family/*)\n• Search / Request\n• Accept / Reject\n• Location / Status"]
        ANALYTICS_R["routes/analytics.js\n(/api/analytics/*)\n• Overview KPI\n• User Growth\n• Rescue Trends"]
    end

    subgraph WS_LAYER["🔌 WebSocket Layer"]
        WS_SRV["WebSocket Server\n(ws library)"]
        TRACKING["GPS Tracking\n• join_tracking\n• location_update\n• heartbeat"]
    end

    subgraph DATA_LAYER["💾 Data Access"]
        DB_POOL["db.js\n(pg Pool)"]
        CLOUD_SDK["Cloudinary\nSDK"]
        TWILIO_SDK["Twilio\nVerify SDK"]
    end

    subgraph STORAGE["🗄️ Storage"]
        PG[("PostgreSQL 16")]
    end

    INDEX --> MIDDLEWARE
    MIDDLEWARE --> ROUTES
    INDEX --> WS_LAYER
    ROUTES --> DATA_LAYER
    WS_LAYER --> DATA_LAYER
    DATA_LAYER --> STORAGE
    DATA_LAYER --> CLOUD_SDK
    DATA_LAYER --> TWILIO_SDK

    style ENTRY fill:#22c55e,color:#fff,stroke:#15803d,stroke-width:2px
    style MIDDLEWARE fill:#fef3c7,stroke:#f59e0b
    style ROUTES fill:#dbeafe,stroke:#3b82f6
    style WS_LAYER fill:#fce7f3,stroke:#ec4899
    style DATA_LAYER fill:#d1fae5,stroke:#10b981
    style STORAGE fill:#e0e7ff,stroke:#6366f1
```

### 6.2 Backend Directory Structure

```
backend/
├── index.js                  # Express app + HTTP server + WebSocket server
├── db.js                     # PostgreSQL connection pool (pg)
├── package.json              # Dependencies
├── Dockerfile                # Docker build
├── .env                      # Environment variables
├── middleware/
│   ├── auth.js               # JWT verification middleware
│   └── rateLimit.js          # Rate limiting (sliding window)
├── routes/
│   ├── auth.js               # Authentication & User management (~46KB)
│   ├── sos.js                # SOS/Rescue request management
│   ├── family.js             # Family connection & tracking
│   └── analytics.js          # Analytics & reporting
├── utils/                    # Utility functions
└── migrations/               # Database migration scripts
```

### 6.3 API Endpoint Map

```mermaid
mindmap
  root["🚀 AquaGuard API\n/api"]
    auth["/auth"]
      auth_register["POST /register"]
      auth_login["POST /login"]
      auth_forgot["POST /forgot-password"]
      auth_otp["POST /verify-otp"]
      auth_reset["POST /reset-password"]
      auth_profile["GET|PUT /profile"]
      auth_password["PUT /change-password"]
      auth_users["GET /users (admin)"]
      auth_role["PUT /users/:id/role"]
      auth_rescuers["GET /rescuers"]
      auth_groups["rescue-groups/*"]
    sos["/sos"]
      sos_create["POST / (create)"]
      sos_my["GET /my"]
      sos_all["GET /all"]
      sos_stats["GET /stats"]
      sos_assign["PUT /:id/assign"]
      sos_accept["PUT /:id/accept"]
      sos_cancel["PUT /:id/cancel"]
      sos_complete["PUT /:id/complete"]
    family["/family"]
      family_search["GET /search"]
      family_request["POST /request"]
      family_requests["GET /requests"]
      family_accept["PUT /requests/:id/accept"]
      family_reject["PUT /requests/:id/reject"]
      family_members["GET /members"]
      family_status["PUT /status"]
      family_location["PUT /location"]
    analytics["/analytics"]
      analytics_overview["GET /overview"]
      analytics_users["GET /users"]
      analytics_rescue["GET /rescue"]
```

---

## 7. Database Architecture

### 7.1 Data Stores Overview Diagram

```mermaid
flowchart LR
    subgraph PRIMARY["🐘 PostgreSQL 16\n(Primary Data — ACID compliant)"]
        direction TB
        USERS[("users\n• id, phone, password_hash\n• role, full_name\n• latitude, longitude\n• safety_status")]
        RESCUE[("rescue_requests\n• id, user_id, assigned_to\n• status, urgency\n• latitude, longitude")]
        LOGS[("rescue_request_logs\n• request_id, old/new_status\n• changed_by\n• append-only")]
        GROUPS[("rescue_groups\n• id, name, leader_id\n• description")]
        MEMBERS[("rescue_group_members\n• group_id, user_id\n• role (leader/co_leader/member)")]
        INVITES[("rescue_group_invites\n• group_id, inviter/invitee\n• status")]
        FAMILY[("family_connections\n• requester/receiver_id\n• relation, status")]
        NOTIF[("notifications\n• user_id, type\n• metadata JSONB")]
        NEWS[("news_articles\n• title, content\n• cover_image, author_id")]
        AUDIT[("audit_logs\n• action, entity_type\n• performed_by\n• append-only")]
    end

    subgraph REALTIME["🔥 Firebase Firestore\n(Real-time Data)"]
        FLOOD[("flood_zones\n• name, severity\n• coordinates (polygon)\n• color, opacity")]
    end

    style PRIMARY fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
    style REALTIME fill:#fee2e2,stroke:#ef4444,stroke-width:2px
```

### 7.2 Rationale for Dual-Database

| Criterion | PostgreSQL | Firebase Firestore |
|-----------|------------|-------------------|
| **Purpose** | Primary data (users, SOS, family, ...) | Real-time map data (flood zones) |
| **Consistency** | ACID, strong consistency | Eventual consistency |
| **Real-time** | Requires polling or WebSocket | Native `onSnapshot()` real-time listener |
| **Querying** | Complex SQL (JOIN, aggregate) | NoSQL, document-based |
| **Deployment** | Self-hosted (Docker) | Managed cloud service (Google) |
| **Use case** | CRUD, authentication, analytics | Map overlay, geo-polygon rendering |

---

## 8. Communication Protocols

### 8.1 Communication Protocol Diagram

```mermaid
sequenceDiagram
    box rgb(219, 234, 254) Client (Browser)
        participant FE as Frontend<br/>(React SPA)
    end

    box rgb(254, 243, 199) Server
        participant NGINX as Nginx<br/>Reverse Proxy
        participant API as Express.js<br/>REST API
        participant WS as WebSocket<br/>Server
    end

    box rgb(209, 250, 229) Database
        participant PG as PostgreSQL
        participant FS as Firestore
    end

    box rgb(243, 232, 255) External
        participant TW as Twilio
        participant CL as Cloudinary
    end

    Note over FE,FS: ═══ HTTP REST API Flow ═══
    FE->>NGINX: GET /api/sos/all (JWT in header)
    NGINX->>API: Proxy → backend:5001
    API->>API: JWT verify middleware
    API->>PG: SELECT * FROM rescue_requests
    PG-->>API: Result rows
    API-->>NGINX: JSON Response
    NGINX-->>FE: 200 OK + data

    Note over FE,FS: ═══ WebSocket GPS Tracking ═══
    FE->>NGINX: Upgrade: websocket (/ws?token=xxx)
    NGINX->>WS: WebSocket connection
    WS->>WS: JWT verify from query param
    FE->>WS: {"type": "join_tracking", "requestId": 42}
    loop Every 3-5 seconds
        FE->>WS: {"type": "location_update", lat, lng}
        WS->>PG: UPDATE users SET latitude, longitude
        WS-->>FE: Broadcast to tracking room
    end

    Note over FE,FS: ═══ Firebase Real-time ═══
    FE->>FS: onSnapshot("flood_zones")
    FS-->>FE: Real-time polygon updates

    Note over API,CL: ═══ Server-side External ═══
    API->>TW: POST /Verifications (send OTP)
    TW-->>API: SID + status
    API->>CL: upload(image, {folder: "aquaguard"})
    CL-->>API: {secure_url, public_id}
```

### 8.2 Protocol Summary

| Communication | Protocol | Direction | Purpose |
|---------------|----------|-----------|---------|
| Frontend → Backend | HTTP/HTTPS (REST) | Request-Response | CRUD operations, authentication |
| Frontend ↔ Backend | WebSocket (ws://) | Bidirectional | GPS tracking real-time |
| Frontend ↔ Firestore | Firestore SDK | Real-time listener | Flood zone polygon data |
| Frontend → Groq AI | HTTPS (REST) | Request-Response | AI chatbot (client-direct) |
| Frontend → OWM/Windy | HTTPS (Tile/API) | Request-Response | Weather tiles, wind forecast |
| Backend → PostgreSQL | TCP (pg protocol) | Connection pool | SQL queries |
| Backend → Twilio | HTTPS (REST) | Request-Response | SMS OTP |
| Backend → Cloudinary | HTTPS (SDK) | Request-Response | Image upload/management |

---

## 9. External Services Integration

### 9.1 Integration Diagram

```mermaid
flowchart TB
    subgraph SYSTEM["⚙️ AquaGuard System"]
        direction TB
        FE["📱 Frontend"]
        BE["⚙️ Backend"]
    end

    subgraph SERVER_SIDE["🔒 Server-Side Integration\n(API keys secured on server)"]
        direction TB
        TWILIO["📱 Twilio Verify\n━━━━━━━━━━━\n• Send OTP SMS\n• Verify OTP\n• Rate: 5 req/15min"]
        CLOUDINARY["☁️ Cloudinary\n━━━━━━━━━━━\n• Upload images (multer)\n• Format: webp auto\n• Folder: aquaguard/\n• Max: 5MB"]
    end

    subgraph CLIENT_SIDE["🌐 Client-Side Integration\n(API keys in VITE env)"]
        direction TB
        FIREBASE["🔥 Firebase\n━━━━━━━━━━━\n• Firestore onSnapshot()\n• flood_zones collection\n• Real-time polygon sync"]
        OWM_SVC["🌤️ OpenWeatherMap\n━━━━━━━━━━━\n• Weather tile layers\n• Rain, clouds, temp\n• Tile URL pattern"]
        GOOGLE_SVC["📍 Google Maps\n━━━━━━━━━━━\n• Reverse geocoding\n• GPS → Address\n• Address → GPS"]
        GROQ_SVC["🤖 Groq AI\n━━━━━━━━━━━\n• LLM: llama/mixtral\n• Flood safety Q&A\n• Client-direct call"]
        WINDY_SVC["💨 Windy\n━━━━━━━━━━━\n• Wind forecast\n• Wave data\n• Embed/API"]
    end

    BE -->|"REST API"| TWILIO
    BE -->|"SDK Upload"| CLOUDINARY
    FE -->|"Firestore SDK"| FIREBASE
    FE -->|"Tile URL"| OWM_SVC
    FE -->|"REST API"| GOOGLE_SVC
    FE -->|"REST API"| GROQ_SVC
    FE -->|"API / Embed"| WINDY_SVC

    style SYSTEM fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style SERVER_SIDE fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style CLIENT_SIDE fill:#d1fae5,stroke:#10b981,stroke-width:2px
```

### 9.2 Integration Details

| Service | Type | Side | Purpose | Authentication |
|---------|------|------|---------|----------------|
| **Twilio Verify** | SMS Gateway | Server | Send & verify OTP via SMS | Account SID + Auth Token |
| **Cloudinary** | Image CDN | Server | Upload, store, optimize images (avatar, SOS, articles) | Cloud Name + API Key + Secret |
| **Firebase Firestore** | NoSQL DB | Client | Real-time subscribe to flood zones (polygon data) | Firebase Config (API Key + Project ID) |
| **OpenWeatherMap** | Weather API | Client | Map tile layers (rain, clouds, temperature) | API Key (URL param) |
| **Google Maps** | Geocoding API | Client | GPS ↔ text address conversion | API Key (URL param) |
| **Groq AI** | LLM API | Client | Flood prevention advisory chatbot | API Key (Header) |
| **Windy** | Forecast API | Client | Wind, pressure, and wave forecast | API Key |

---

## 10. Security Architecture

### 10.1 Security Diagram

```mermaid
flowchart TB
    subgraph AUTH_FLOW["🔐 Authentication"]
        direction LR
        PHONE["📱 Phone\n+ Password"]
        REGISTER["Register"]
        LOGIN["Login"]
        OTP["OTP Verify\n(Twilio SMS)"]
        JWT_TOKEN["JWT Token\n(7 days)"]

        PHONE --> REGISTER
        PHONE --> LOGIN
        REGISTER --> OTP
        OTP --> JWT_TOKEN
        LOGIN --> JWT_TOKEN
    end

    subgraph AUTHZ_FLOW["🛡️ Authorization (RBAC)"]
        direction TB
        REQ["HTTP Request\n+ Authorization: Bearer xxx"]
        MW["Middleware\nJWT Verify"]
        ROLE_CHECK{{"Role Check\ncitizen | rescuer | admin"}}
        ALLOW["✅ Allowed"]
        DENY["❌ 403 Forbidden"]

        REQ --> MW
        MW --> ROLE_CHECK
        ROLE_CHECK -->|"Authorized"| ALLOW
        ROLE_CHECK -->|"Unauthorized"| DENY
    end

    subgraph SECURITY_MEASURES["🔒 Security Layers"]
        direction TB
        BCRYPT["🔑 bcrypt\nPassword Hashing\n(salt rounds: 10)"]
        RATE_LIMIT_S["⏱️ Rate Limiting\n• Login: 10/15min\n• Register: 5/15min\n• OTP: 5/15min"]
        CORS_S["🌐 CORS\nAllowed Origins Only"]
        WS_AUTH["🔌 WebSocket\nJWT in query param"]
        ENV_S["🔐 Environment Variables\n.env (not committed)"]
    end

    style AUTH_FLOW fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style AUTHZ_FLOW fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style SECURITY_MEASURES fill:#d1fae5,stroke:#10b981,stroke-width:2px
```

### 10.2 Security Measures Summary

| Security Layer | Measure | Details |
|----------------|---------|---------|
| **Authentication** | Phone + Password + OTP | Registration requires SMS OTP verification; login via phone number + password |
| **Password Storage** | bcrypt hashing | Salt rounds = 10, no plain text storage |
| **Session** | JWT (7 days) | Token stored in `localStorage`, sent via `Authorization: Bearer` header |
| **Authorization** | RBAC 3-role | `citizen`, `rescuer`, `admin` — enforced on both frontend and backend |
| **Rate Limiting** | Sliding window | Login: 10 req/15min, Register: 5 req/15min, OTP: 5 req/15min |
| **CORS** | Whitelist origins | Only allows `localhost:5173`, `localhost:5174`, and FRONTEND_URL |
| **WebSocket Auth** | JWT in query param | Token passed via `ws://host?token=xxx`, verified before accepting |
| **File Upload** | Multer + Cloudinary | Size limited, images only, uploaded through server |
| **Environment** | `.env` files | API keys, secrets not committed to Git (`.gitignore`) |
| **Database** | Internal network | PostgreSQL port not exposed in production |

---

## 11. Tech Stack Summary

### 11.1 Tech Stack Diagram

```mermaid
flowchart TB
    subgraph FRONTEND_STACK["📱 Frontend Stack"]
        direction TB
        R19["⚛️ React 19.0.0\n(UI Framework)"]
        VITE6["⚡ Vite 6.0.0\n(Build Tool)"]
        TW4["🎨 TailwindCSS 4.0.0\n(Styling)"]
        RR7["🧭 React Router DOM 7.13\n(Routing)"]
        RL5["🗺️ React Leaflet 5.0.0\n(Map)"]
        L19["📍 Leaflet 1.9.4\n(Map Engine)"]
        RC3["📊 Recharts 3.8.1\n(Charts)"]
        FB12["🔥 Firebase 12.10.0\n(Firestore)"]
    end

    subgraph BACKEND_STACK["⚙️ Backend Stack"]
        direction TB
        NODE["🟢 Node.js\n(Runtime)"]
        EXP4["📡 Express 4.21.2\n(Web Framework)"]
        WS8["🔌 ws 8.20.0\n(WebSocket)"]
        PG8["🐘 pg 8.13.1\n(PostgreSQL Client)"]
        JWT9["🔑 jsonwebtoken 9.0.2\n(JWT)"]
        BC5["🔒 bcrypt 5.1.1\n(Password Hash)"]
        ML2["📎 multer 2.1.1\n(File Upload)"]
        CL2["☁️ cloudinary 2.9.0\n(Image CDN)"]
        TW5["📱 twilio 5.13.1\n(SMS OTP)"]
    end

    subgraph INFRA_STACK["🏗️ Infrastructure Stack"]
        direction TB
        DOCKER["🐳 Docker\n(Containerization)"]
        DC["🐳 Docker Compose\n(Orchestration)"]
        NGX["🔀 Nginx Alpine\n(Reverse Proxy)"]
        PGDB["🐘 PostgreSQL 16 Alpine\n(Database)"]
        MAKE["📝 Makefile\n(Task Runner)"]
    end

    subgraph EXTERNAL_STACK["☁️ External Services"]
        direction TB
        FIREBASE_SVC["🔥 Firebase Firestore"]
        TWILIO_SVC2["📱 Twilio Verify"]
        CLOUD_SVC["☁️ Cloudinary"]
        OWM_SVC2["🌤️ OpenWeatherMap"]
        GMAPS["📍 Google Maps"]
        GROQ["🤖 Groq AI"]
        WINDY2["💨 Windy"]
    end

    style FRONTEND_STACK fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style BACKEND_STACK fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style INFRA_STACK fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style EXTERNAL_STACK fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
```

### 11.2 Tech Stack Summary Tables

#### Frontend

| Technology | Version | Role |
|------------|---------|------|
| React | 19.0.0 | UI component framework |
| Vite | 6.0.0 | Build tool & dev server (HMR) |
| TailwindCSS | 4.0.0 | Utility-first CSS framework |
| React Router DOM | 7.13.1 | Client-side routing (SPA) |
| React Leaflet | 5.0.0 | React wrapper for Leaflet map |
| Leaflet | 1.9.4 | Interactive map (OpenStreetMap) |
| Recharts | 3.8.1 | Chart & data visualization |
| Firebase SDK | 12.10.0 | Firestore real-time database |

#### Backend

| Technology | Version | Role |
|------------|---------|------|
| Node.js | — | JavaScript runtime |
| Express.js | 4.21.2 | Web framework (REST API) |
| ws | 8.20.0 | WebSocket server (GPS tracking) |
| pg | 8.13.1 | PostgreSQL client (connection pool) |
| jsonwebtoken | 9.0.2 | JWT token generation & verification |
| bcrypt | 5.1.1 | Password hashing (10 salt rounds) |
| multer | 2.1.1 | Multipart file upload middleware |
| cloudinary | 2.9.0 | Image upload & CDN management |
| twilio | 5.13.1 | SMS OTP (Verify API) |
| dotenv | 16.6.1 | Environment variable management |
| cors | 2.8.5 | Cross-Origin Resource Sharing |

#### Infrastructure

| Technology | Version | Role |
|------------|---------|------|
| Docker | — | Containerization |
| Docker Compose | — | Multi-container orchestration |
| Nginx | Alpine | Reverse proxy, static serving, SSL termination |
| PostgreSQL | 16 Alpine | Relational database (ACID) |
| Makefile | — | Task automation (build, deploy, logs) |

#### External Services

| Service | Role | Protocol |
|---------|------|----------|
| Firebase Firestore | Real-time polygon data (flood zones) | Firestore SDK (client) |
| Twilio Verify | SMS OTP authentication | REST API (server) |
| Cloudinary | Image CDN & management | SDK (server) |
| OpenWeatherMap | Weather tile layers | Tile URL (client) |
| Google Maps | Geocoding (GPS ↔ Address) | REST API (client) |
| Groq AI | LLM chatbot (flood safety Q&A) | REST API (client) |
| Windy | Wind & wave forecast | API/Embed (client) |

---

> *System Architecture document for AquaGuard v2.0. Any architectural changes should be reflected in this document accordingly.*
