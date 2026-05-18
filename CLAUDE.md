# CLAUDE.md

File này dành cho Claude (và bất kỳ AI agent nào khác) khi làm việc trong repo này. Mục tiêu là cung cấp ngữ cảnh dự án, quy ước code, và các "bẫy" đã biết để không phải đọc lại toàn bộ codebase mỗi lần.

---

## 1. Tổng quan dự án

**AquaGuard** là web app cảnh báo & cứu hộ lũ lụt cho người dân Việt Nam. Hệ thống gồm 3 nhóm người dùng (RBAC):

- **citizen** — người dân, gửi yêu cầu SOS, xem bản đồ lũ, gia đình an toàn.
- **rescuer** — đội cứu hộ, nhận và xử lý SOS, có nhóm (rescue group) với leader/co_leader/member.
- **admin** — quản trị viên hệ thống, quản lý user/team/sensor/analytics.

Repo gồm 2 phần:
- `backend/` — Node.js + Express + Postgres + WebSocket (Twilio + Cloudinary cho OTP và ảnh).
- `frontend/` — React 19 + Vite 6 + TailwindCSS v4 + React Router v7 + Leaflet.

---

## 2. Tech stack & lệnh chạy

### Backend (`backend/`)
- Node ≥ 18 khuyến nghị, dùng `node --watch` (script `dev`).
- Postgres (pool ở `db.js`, kết nối qua env `DATABASE_URL`).
- Auth: JWT (jsonwebtoken) + bcrypt.
- File upload: multer → Cloudinary.
- OTP: Twilio Verify.
- Realtime tracking: `ws` (WebSocketServer gắn chung HTTP server).

```bash
cd backend
npm install
npm run dev        # node --watch index.js
npm start          # production
```

Cần file `.env` (xem `.env.example`). Bắt buộc: `DATABASE_URL`, `JWT_SECRET`, `ROLE_PASSWORD`, `TWILIO_*`, `CLOUDINARY_*`.

### Frontend (`frontend/`)
- Node ≥ 20 (xem `engines` trong `package.json`).
- Vite 6, Tailwind v4 (qua `@tailwindcss/vite`).

```bash
cd frontend
npm install
npm run dev        # vite (cổng 5173)
npm run build
npm run preview
```

Env: `VITE_API_BASE_URL` (mặc định `http://localhost:5001/api`), `VITE_GROQ_API_KEY` (chatbot — **không nên expose, xem mục Bẫy đã biết**), `VITE_FIREBASE_*` (nếu dùng).

---

## 3. Cấu trúc thư mục

```
AquaGuard-WebApp/
├── backend/
│   ├── index.js                # Entry: Express + WS + CORS + rate limit
│   ├── db.js                   # pg Pool
│   ├── middleware/
│   │   ├── auth.js             # verifyToken, requireRoles
│   │   └── rateLimit.js        # in-memory rate limit theo IP
│   ├── routes/
│   │   ├── auth.js             # login/register/OTP/profile/rescue_groups
│   │   ├── sos.js              # SOS CRUD, assign, accept, complete
│   │   ├── family.js           # Family connection + safety status
│   │   └── analytics.js        # System analytics cho admin
│   └── utils/upload.js         # multer + Cloudinary
└── frontend/
    └── src/
        ├── App.jsx             # Router root
        ├── main.jsx            # Entry
        ├── config/
        │   ├── rbac.js         # ROLES, getNavItemsForRole, canAccessPage
        │   └── firebase.js
        ├── contexts/
        │   ├── AuthContext.jsx # user + token state
        │   └── LanguageContext.jsx
        ├── services/api.js     # axios-like wrapper (đã có get/post/put/del)
        ├── utils/
        │   ├── authStorage.js  # localStorage helpers cho token
        │   ├── phone.js        # chuẩn hoá SĐT Việt Nam
        │   └── locationSync.js
        ├── hooks/useRescueTracking.js  # WS + geolocation
        ├── components/         # auth, dashboard, map, rescue, safety, alerts, ...
        ├── pages/              # 1 trang = 1 file, phân chia theo role
        └── translations/       # en.js, vi.js
```

---

## 4. Quy ước & convention

### Phân quyền (RBAC)
- Roles được khai báo ở `frontend/src/config/rbac.js` (`ROLES.CITIZEN | ROLES.RESCUER | ROLES.ADMIN`).
- Backend kiểm role qua middleware `requireRoles([...])` trong `backend/middleware/auth.js`.
- Bên trong rescue group còn có sub-role: `leader`, `co_leader`, `member`. Khi đụng tới group permission, dùng cùng pattern query: `SELECT member_role FROM rescue_group_members WHERE group_id=$1 AND user_id=$2`.

### API response
Mọi route trả format:
```js
{ success: true, data: {...} }
{ success: false, message: "..." }
```
Status code: 200 OK, 201 Created, 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 server.

### Phone number
- Chuẩn lưu DB: `+84` + 9 chữ số (`^\+84\d{9}$`).
- ⚠️ Hiện tại backend chấp nhận `^\+84\d{9,10}$` (sai), frontend dùng `^\+84\d{9}$`. **Khi sửa, phải đồng nhất `^\+84\d{9}$`** (xem L1 trong "Bẫy đã biết").

### Thời gian
- Lưu UTC trong DB, format ISO khi trả về JSON, format hiển thị ở client.

### Frontend
- Đường gọi API: **luôn dùng `services/api.js`**, không tự `fetch` + tự gắn Bearer. Hiện còn ~13 chỗ chưa tuân thủ (xem D2/D6 trong "Bẫy đã biết").
- State auth: `AuthContext` (`useAuth()` cung cấp `user`, `token`, `login`, `logout`).
- Style: TailwindCSS v4, chủ đạo token color: `primary`, `secondary`, `danger`, `warning`, `success` + opacity (vd `bg-danger/10 text-danger border-danger/20`).
- i18n: `useLanguage()` + key trong `translations/en.js` & `vi.js`. Không hardcode chuỗi user-facing.

### Backend
- Mọi route async nên wrap try/catch + `console.error("...", err); res.status(500).json(...)`. (Đã có ~25 chỗ lặp pattern này — TODO: gom thành `asyncHandler`.)
- Validate `id` từ params: `const n = Number(req.params.id); if (!Number.isInteger(n) || n <= 0) return res.status(400)...`. **Không dùng `parseInt` thiếu radix.**
- Validate tọa độ: ép `Number()` + check khoảng `[-90,90]` / `[-180,180]`.

---

## 5. WebSocket protocol

Endpoint: `ws(s)://<host>/?token=<JWT>&requestId=<id>` (⚠️ token trong query — TODO: chuyển sang `Sec-WebSocket-Protocol`).

Message từ client:
```json
{ "type": "location", "latitude": 21.0, "longitude": 105.8 }
```

Server broadcast tới mọi client trong cùng `requestId` (room):
```json
{ "type": "location", "userId": 1, "role": "rescuer", "latitude": 21.0, "longitude": 105.8, "timestamp": "..." }
```

Vị trí được persist qua `persistTrackingLocation(...)` ở `backend/index.js`.

---

## 6. Bẫy đã biết (Known issues / Gotchas)

Đã review ngày 2026-05-14. Khi sửa code mới, ưu tiên **không tạo thêm các vấn đề sau**, và nếu chạm tới vùng đó nên fix luôn.

### Bảo mật (cao)
1. **`JWT_SECRET` hard-coded fallback `"aquaguard_jwt_secret_2026"`** ở `index.js:17`, `middleware/auth.js:3`, `routes/auth.js:17`. Phải throw khi thiếu env, không fallback.
2. **`ROLE_PASSWORD` mặc định `"123456"`** ở `routes/auth.js:19` — cho phép ai cũng tự register admin. So sánh dùng `!==`, cần `crypto.timingSafeEqual` hoặc bỏ self-register admin.
3. **IDOR `PUT /api/sos/:id/complete`** (`routes/sos.js:492-515`) — chỉ check `role==='rescuer'`, không kiểm cùng group `assigned_group_id`.
4. **`GET /api/sos/all` lộ PII** — citizen đọc được SĐT/địa chỉ/GPS của mọi nạn nhân khác.
5. **CORS** cho phép `!origin` đi kèm `credentials: true` + whitelist LAN regex trong code (`index.js:36-45`).
6. **JWT lưu localStorage** — bất kỳ XSS nào đánh cắp được.
7. **`GROQ_API_KEY` lộ trong bundle frontend** (`ChatBot.jsx`) — phải proxy qua backend.
8. **Multer fileFilter quá lỏng** (`utils/upload.js:11-17`) — chỉ check `mimetype.startsWith("image/")`, không magic-bytes.

### Logic
9. Regex phone backend ≠ frontend (L1 ở trên).
10. `parseInt(id)` không radix, không validate (rải rác trong `sos.js`, `family.js`).
11. SOS create không validate `latitude/longitude` (`sos.js:42-76`).
12. Race condition khi 2 rescuer cùng accept 1 SOS (`sos.js:385-408`) — thiếu `SELECT ... FOR UPDATE`.
13. Stats SOS thiếu status `"assigned"` trong map ở `sos.js:248`.
14. `useRescueTracking.js` vừa `watchPosition` vừa `setInterval(getCurrentPosition, 2000)` → ngốn pin.
15. WS reconnect không backoff/limit (`useRescueTracking.js:121-128`).
16. `null.trim()` crash 500 ở `auth.js:1428` khi `displayName` null.

### Code lặp lại cần refactor
17. `JWT_SECRET` định nghĩa 3 lần → gom `backend/config/env.js`.
18. `API_BASE` lặp ~13 file frontend → dùng `services/api.js` thống nhất.
19. Phone regex lặp 3 lần trong `auth.js` → `utils/validators.js`.
20. Permission leader/co_leader query lặp 7+ lần → helper `getCallerGroupRole(groupId, userId)`.
21. SOS SELECT JOIN ~30 dòng lặp ở 3 endpoint (`/my`, `/all`, `/team`) → DB view hoặc constant fragment.
22. `urgencyColors`/`statusColors` Tailwind map rải khắp page → `utils/statusStyles.js`.
23. Spinner JSX copy ở mọi page → component `<Spinner />`.
24. `console.error + 500` lặp ~25 lần → middleware `asyncHandler`.

---

## 7. Khi thêm tính năng mới — checklist

- [ ] API mới: dùng `requireRoles([...])` và `verifyToken`.
- [ ] Validate input: id phải `Number.isInteger(n) && n > 0`; lat/lng phải trong khoảng cho phép; string phải `.trim()` an toàn null.
- [ ] DB transaction nếu có nhiều write phụ thuộc nhau, và `FOR UPDATE` khi race-prone.
- [ ] Frontend: gọi qua `services/api.js`, không tự fetch.
- [ ] String hiển thị cho user: phải có key trong cả `translations/en.js` và `vi.js`.
- [ ] Page mới: đăng ký trong `config/rbac.js` (`ALL_NAV_ITEMS`) với `roles` chính xác.
- [ ] Component có side-effect (timer, WS, geolocation): cleanup trong `useEffect` return.
- [ ] Không log password / token / OTP ra console.
- [ ] Không thêm secret/API key vào `frontend/` env (`VITE_*` đều bị inline vào bundle public).

---

## 8. Liên hệ & chú thích

- Repo private, không có CI public.
- Khi review/sửa code, luôn ưu tiên fix các mục ở "Bẫy đã biết" trước nếu file đó nằm trong scope của task.
- Khi không chắc về quy ước, hỏi user (Kevin) trước khi sửa kiến trúc lớn.
