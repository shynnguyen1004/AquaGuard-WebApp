# AquaGuard iOS - Hướng dẫn xây dựng UI Rescuer & Admin (Swift/SwiftUI)

> File này mô tả chi tiết các màn hình cần xây dựng cho role **Rescuer** và **Admin** trong ứng dụng iOS AquaGuard, sử dụng **dummy data** (không kết nối API). Toàn bộ logic và layout được trích xuất từ WebApp React đã hoạt động.

---

## I. DESIGN SYSTEM

### Bảng màu (Dark Theme)
```
Background chính:    #0F172A
Surface/Card:        #1E293B
Surface Elevated:    #334155
Border:              #334155 (alpha 0.3)
Primary (teal):      #11A0B6
Danger (red):        #EF4444
Warning (amber):     #F59E0B
Success (green):     #10B981
Text Primary:        #F1F5F9
Text Secondary:      #94A3B8
Text Muted:          #64748B
```

### Patterns UI chung
- **Card**: nền `Surface`, bo góc 14pt, viền `Border`
- **Badge**: nền `color.opacity(0.1)`, viền `color.opacity(0.2)`, bo góc 6pt, font 10pt bold
- **Stats card**: nền `color.opacity(0.1)`, icon + số lớn + label nhỏ
- **Avatar**: CircleAvatar chữ cái đầu, nền màu role (rescuer=warning, admin=danger, citizen=primary)
- **Animation**: fadeIn + slideY nhẹ khi xuất hiện, stagger delay 80ms giữa các item

---

## II. RESCUER SCREENS

### Screen 1: Rescuer Dashboard (`RescuerDashboardView`)

**Bottom Tab**: "Nhiệm vụ" (icon: assignment)

**Layout từ trên xuống:**

#### 1. Header Row
- Trái: Icon 🚒 (local_fire_department, màu warning) + "Xin chào 🚒" / tên user
- Phải: Badge "CỨU HỘ" (nền warning/10, viền warning/20)

#### 2. Stats Row (3 cards ngang)
| Card | Icon | Màu | Value |
|------|------|------|-------|
| SOS đang chờ | emergency | danger | `pendingRequests.count` |
| Nhiệm vụ | assignment | primary | `myMissions.count` |
| Hoàn thành | check_circle | success | `completedRequests.count` |

#### 3. Tab Bar (SegmentedControl 3 tabs)
- Tab 0: "Đang chờ" + badge count
- Tab 1: "Đang làm" + badge count  
- Tab 2: "Hoàn thành" + badge count

#### 4. Request List (theo tab đang chọn)

Mỗi **RequestCard** hiển thị:
- **Row 1**: Tên user (bold) | Badge urgency | Badge status
- **Row 2**: Mô tả (tối đa 2 dòng, text secondary)
- **Row 3**: 📍 Icon location + địa chỉ (text muted)
- **Actions** (tuỳ tab):
  - Tab 0 (pending): Nút "Nhận nhiệm vụ" (primary, full width)
  - Tab 1 (active): Nút "Hoàn thành" (success) + Nút "Huỷ" (outlined)
  - Tab 2 (completed): Không có action

#### Dummy Data cho Dashboard:

```swift
struct SosRequest: Identifiable {
    let id: Int
    let userName: String
    let description: String?
    let location: String?
    let latitude: Double?
    let longitude: Double?
    let urgency: String   // "critical" | "high" | "medium" | "low"
    let status: String    // "pending" | "assigned" | "in_progress" | "resolved"
    let assignedName: String?
    let createdAt: String
}

// Dummy requests
static let dummyRequests: [SosRequest] = [
    SosRequest(id: 1, userName: "Nguyễn Văn Minh", description: "Nước dâng cao 1m, gia đình 4 người cần giải cứu khẩn cấp", location: "123 Nguyễn Huệ, Quận 1, TP.HCM", latitude: 10.7769, longitude: 106.7009, urgency: "critical", status: "pending", assignedName: nil, createdAt: "2025-05-03T08:30:00Z"),
    SosRequest(id: 2, userName: "Trần Thị Lan", description: "Bị kẹt trên tầng 2, cần ca nô cứu hộ", location: "45 Lê Lợi, Quận 5, TP.HCM", latitude: 10.7540, longitude: 106.6633, urgency: "high", status: "pending", assignedName: nil, createdAt: "2025-05-03T09:15:00Z"),
    SosRequest(id: 3, userName: "Phạm Văn Đức", description: "Người già cần di chuyển đến nơi an toàn", location: "78 Trần Hưng Đạo, Quận 10", latitude: 10.7628, longitude: 106.6714, urgency: "medium", status: "assigned", assignedName: "Đội Alpha", createdAt: "2025-05-03T07:00:00Z"),
    SosRequest(id: 4, userName: "Lê Thị Hồng", description: "Đã được cứu, đang ở điểm tập kết", location: "Trường THPT Nguyễn Du", latitude: 10.7865, longitude: 106.6950, urgency: "low", status: "resolved", assignedName: "Đội Alpha", createdAt: "2025-05-02T14:00:00Z"),
    SosRequest(id: 5, userName: "Hoàng Minh Tuấn", description: "Xe bị ngập, cần hỗ trợ kéo xe và di chuyển", location: "Đường Võ Văn Kiệt, Quận 6", latitude: 10.7481, longitude: 106.6350, urgency: "high", status: "in_progress", assignedName: "Tôi", createdAt: "2025-05-03T06:45:00Z"),
    SosRequest(id: 6, userName: "Võ Thị Mai", description: "Trẻ em 2 tuổi bị sốt cao, cần y tế khẩn", location: "Hẻm 220 Lý Thường Kiệt, Quận 11", latitude: 10.7700, longitude: 106.6500, urgency: "critical", status: "pending", assignedName: nil, createdAt: "2025-05-03T10:00:00Z"),
]

// Filter helpers:
// pendingRequests = requests.filter { $0.status == "pending" }
// myMissions = requests.filter { $0.status == "assigned" || $0.status == "in_progress" }
// completedRequests = requests.filter { $0.status == "resolved" }
```

**Urgency labels**: critical→"Nguy cấp", high→"Cao", medium→"Trung bình", low→"Thấp"
**Status labels**: pending→"Chờ xử lý", assigned→"Đã nhận", in_progress→"Đang cứu", resolved→"Hoàn thành"

---

### Screen 2: Rescuer Team (`RescuerTeamView`)

**Bottom Tab**: "Đội" (icon: groups)

Gồm **3 tabs nội bộ** (SegmentedControl):

#### Tab 0: "Đội của tôi"

**Nếu chưa có group** → hiện form tạo nhóm:
- TextField "Tên đội cứu hộ"
- TextField "Mô tả (tùy chọn)"
- Nút "Tạo đội" (primary, full width)

**Nếu đã có group** → hiện:

**A. Group Hero Card:**
- Tên đội (font lớn, bold)
- Mô tả (text secondary)
- Badge role: "Đội trưởng" (warning) / "Phó đội" (primary) / "Thành viên" (success)
- Menu (...): "Rời nhóm" / "Giải tán" (nếu leader)

**B. Stats Row (3 cards):**
| Nhiệm vụ đang làm | Đã hoàn thành | Thành viên |
|---|---|---|
| 2 | 15 | 3 |

**C. Invite by Phone (chỉ leader/co_leader):**
- TextField "+84..." + Nút "Mời"
- Dummy action: thêm vào pendingInvites + SnackBar "Đã gửi lời mời"

**D. Pending Outgoing Invites:**
- List: tên + SĐT + nút "Huỷ" (nhỏ, outlined)

**E. Member List:**
Mỗi MemberCard:
- Avatar (chữ cái đầu) + Tên + SĐT
- Badge role (leader/co_leader/member)
- Menu actions (chỉ leader thấy): Thăng cấp / Giáng cấp / Xóa khỏi nhóm

#### Tab 1: "Danh bạ"
- Grid/List tất cả rescuers trong hệ thống
- Mỗi card: Avatar + Tên + SĐT + trạng thái ("Đã có đội" hoặc "Chưa có đội")
- Nút "Mời" (chỉ hiện nếu chưa có đội và chưa được mời)
- Nếu đã mời: hiện label "Đã mời" (muted)

#### Tab 2: "Lời mời" + badge count
- List các lời mời đã nhận
- Mỗi card: Tên đội + Người mời + Thời gian
- 2 nút: "Chấp nhận" (success) + "Từ chối" (outlined danger)

#### Dummy Data cho Team:

```swift
struct TeamMember: Identifiable {
    let id: Int
    let displayName: String
    let phoneNumber: String
    let memberRole: String  // "leader" | "co_leader" | "member"
}

struct RescueGroup {
    let id: Int
    var name: String
    var description: String
    var myRole: String  // "leader" | "co_leader" | "member"
    var members: [TeamMember]
    var pendingInvites: [PendingInvite]
}

struct PendingInvite: Identifiable {
    let id: Int
    let displayName: String
    let phoneNumber: String
}

struct ReceivedInvite: Identifiable {
    let id: Int
    let groupName: String
    let inviterName: String
    let createdAt: String
}

struct DirectoryRescuer: Identifiable {
    let id: Int
    let displayName: String
    let phoneNumber: String
    let hasActiveGroup: Bool
    let hasPendingInviteFromMe: Bool
}

// Dummy instances
static let myGroup = RescueGroup(
    id: 1,
    name: "Đội Cứu Hộ Alpha",
    description: "Đội cứu hộ chính khu vực Quận 1 - Quận 3",
    myRole: "leader",
    members: [
        TeamMember(id: 1, displayName: "Nguyễn Văn A", phoneNumber: "+84901234567", memberRole: "leader"),
        TeamMember(id: 2, displayName: "Trần Thị B", phoneNumber: "+84901234568", memberRole: "co_leader"),
        TeamMember(id: 3, displayName: "Lê Văn C", phoneNumber: "+84901234569", memberRole: "member"),
    ],
    pendingInvites: [
        PendingInvite(id: 10, displayName: "Phạm Văn D", phoneNumber: "+84901234570"),
    ]
)

static let allRescuers: [DirectoryRescuer] = [
    DirectoryRescuer(id: 4, displayName: "Hoàng Văn E", phoneNumber: "+84901234571", hasActiveGroup: false, hasPendingInviteFromMe: false),
    DirectoryRescuer(id: 5, displayName: "Vũ Thị F", phoneNumber: "+84901234572", hasActiveGroup: false, hasPendingInviteFromMe: true),
    DirectoryRescuer(id: 6, displayName: "Đặng Minh G", phoneNumber: "+84901234573", hasActiveGroup: true, hasPendingInviteFromMe: false),
    DirectoryRescuer(id: 7, displayName: "Bùi Thanh H", phoneNumber: "+84901234574", hasActiveGroup: false, hasPendingInviteFromMe: false),
]

static let receivedInvites: [ReceivedInvite] = [
    ReceivedInvite(id: 100, groupName: "Đội Beta", inviterName: "Nguyễn Minh K", createdAt: "2025-05-03T06:00:00Z"),
]
```

**Member role labels**: leader→"Đội trưởng", co_leader→"Phó đội", member→"Thành viên"

---

### Screen 3: Rescuer - các tab khác

| Bottom Tab | Nội dung | Ghi chú |
|---|---|---|
| "Yêu cầu" (emergency) | Giống Dashboard nhưng chỉ show pending | Có thể dùng chung view |
| "Bản đồ" (map) | Bản đồ flood zones | Nếu đã có từ citizen thì dùng lại |
| "Cài đặt" (settings) | Profile + logout | Dùng chung với citizen |

---

## III. ADMIN SCREENS

### Screen 1: Admin Dashboard (`AdminDashboardView`)

**Bottom Tab**: "Quản trị" (icon: admin_panel_settings)

#### 1. Header
- Icon admin_panel_settings (màu danger) + "Quản trị viên ⚙️" / tên
- Badge "ADMIN" (danger)

#### 2. Stats Grid (2x2)
| Icon | Label | Value | Màu |
|------|-------|-------|------|
| group | Tổng người dùng | totalUsers | primary |
| person | Công dân | citizenCount | success |
| fire_department | Cứu hộ | rescuerCount | warning |
| emergency | SOS đang chờ | pendingCount | danger |

#### 3. System Status Card
List items: Rescuers tích cực / SOS đang xử lý / Đã giải quyết / System Admins
Mỗi item: Icon + Label + Value (phải)

#### 4. Rescuer Overview
- Title "Đội cứu hộ" + count
- List 5 rescuers đầu: Avatar + Tên + SĐT + role badge

#### Dummy Data:

```swift
struct AdminUser: Identifiable {
    let id: Int
    let displayName: String
    let phoneNumber: String
    let email: String?
    var role: String  // "citizen" | "rescuer" | "admin"
    let avatarUrl: String?
    let createdAt: String
}

static let dummyUsers: [AdminUser] = [
    AdminUser(id: 1, displayName: "Admin Chính", phoneNumber: "+84900000001", email: "admin@aquaguard.vn", role: "admin", avatarUrl: nil, createdAt: "2025-01-15T08:00:00Z"),
    AdminUser(id: 2, displayName: "Nguyễn Văn A", phoneNumber: "+84901234567", email: nil, role: "rescuer", avatarUrl: nil, createdAt: "2025-02-20T10:30:00Z"),
    AdminUser(id: 3, displayName: "Trần Thị B", phoneNumber: "+84901234568", email: nil, role: "rescuer", avatarUrl: nil, createdAt: "2025-03-10T14:00:00Z"),
    AdminUser(id: 4, displayName: "Lê Văn C", phoneNumber: "+84901234569", email: "levanc@gmail.com", role: "citizen", avatarUrl: nil, createdAt: "2025-03-15T09:00:00Z"),
    AdminUser(id: 5, displayName: "Phạm Thị D", phoneNumber: "+84901234570", email: nil, role: "citizen", avatarUrl: nil, createdAt: "2025-04-01T11:00:00Z"),
    AdminUser(id: 6, displayName: "Hoàng Văn E", phoneNumber: "+84901234571", email: nil, role: "citizen", avatarUrl: nil, createdAt: "2025-04-05T16:00:00Z"),
    AdminUser(id: 7, displayName: "Võ Thị F", phoneNumber: "+84901234572", email: "vothif@gmail.com", role: "rescuer", avatarUrl: nil, createdAt: "2025-04-10T08:30:00Z"),
    AdminUser(id: 8, displayName: "Đặng Minh G", phoneNumber: "+84901234573", email: nil, role: "citizen", avatarUrl: nil, createdAt: "2025-04-12T13:00:00Z"),
]

// Computed:
// totalUsers = dummyUsers.count
// citizenCount = dummyUsers.filter { $0.role == "citizen" }.count
// rescuerCount = dummyUsers.filter { $0.role == "rescuer" }.count
// adminCount = dummyUsers.filter { $0.role == "admin" }.count
```

---

### Screen 2: Admin SOS Management (`AdminSOSView`)

**Bottom Tab**: "SOS" (icon: emergency)

#### 1. Header
- Icon emergency (danger) + "Quản lý SOS"
- Subtitle: "Quản lý tất cả yêu cầu cứu hộ trong hệ thống"

#### 2. Stats Row (3 cards)
| Chờ xử lý (warning) | Đang xử lý (primary) | Hoàn thành (success) |

#### 3. Tab Filter (SegmentedControl 4 tabs)
- Tất cả (count) | Đang chờ (count) | Đang xử lý (count) | Hoàn thành (count)

#### 4. Request List
Mỗi card giống Rescuer Dashboard nhưng thêm:

**Nếu status == "pending":**
- Picker "Phân công cho đội..." (list rescue groups)
- Nút "Phân công" (primary) — disabled nếu chưa chọn group

**Nếu status == "in_progress":**
- Nút "Hoàn thành (Admin)" (success)

**Mỗi card hiện thêm:**
- "Phân công: {assignedName}" hoặc "Chưa phân công"
- Nếu có assignedGroupName: "Đội: {groupName}"

#### Dummy Data bổ sung:

```swift
struct AdminRescueGroup: Identifiable {
    let id: Int
    let name: String
    let memberCount: Int
    let leaderName: String
}

static let rescueGroups: [AdminRescueGroup] = [
    AdminRescueGroup(id: 1, name: "Đội Alpha", memberCount: 3, leaderName: "Nguyễn Văn A"),
    AdminRescueGroup(id: 2, name: "Đội Beta", memberCount: 5, leaderName: "Trần Văn X"),
    AdminRescueGroup(id: 3, name: "Đội Gamma", memberCount: 4, leaderName: "Lê Minh Y"),
]

// Dùng chung dummyRequests từ Rescuer, thêm vài request nữa cho đa dạng
```

---

### Screen 3: Admin Analytics (`AdminAnalyticsView`)

**Bottom Tab**: "Thống kê" (icon: analytics)

#### 1. Header
- Icon analytics (primary) + "Thống kê hệ thống"

#### 2. KPI Cards (2x2 grid)
| Icon | Label | Value | Subtitle |
|------|-------|-------|----------|
| group | Tổng người dùng | 156 | - |
| person_add | Mới (7 ngày) | 12 | "Last 7d" |
| emergency | Tổng SOS | 89 | - |
| speed | Thời gian phản hồi TB | 18 | "phút" |

#### 3. Phân bố người dùng
- Horizontal stacked bar (citizen/rescuer/admin theo %)
- Legend: 3 dòng (Công dân: count, Cứu hộ: count, Quản trị: count)

#### 4. Tổng quan SOS
- 3 progress bars: Đang chờ / Đang xử lý / Hoàn thành
- Mỗi bar: label + count + percentage + LinearProgressView

#### 5. Hiệu suất phản hồi
- 2 cards lớn: "Tỷ lệ giải quyết: 87%" (success) + "Phản hồi TB: 18 phút" (primary)
- List metrics:
  - Phản hồi nhanh nhất: 5 phút (success)
  - Phản hồi chậm nhất: 45 phút (danger)
  - Phản hồi trung bình: 18 phút (warning)
  - SOS đang chờ: 5 (warning)
  - Đang cứu hộ: 3 (primary)
  - Đã hoàn thành: 81 (success)

#### Dummy Data:

```swift
struct AnalyticsOverview {
    let totalUsers: Int
    let newUsers7d: Int
    let totalRequests: Int
    let avgResponseMinutes: Int
    let resolutionRate: Int
    let pendingRequests: Int
    let activeRequests: Int
    let resolvedRequests: Int
    let fastestResponseMin: Int
    let slowestResponseMin: Int
}

static let overview = AnalyticsOverview(
    totalUsers: 156,
    newUsers7d: 12,
    totalRequests: 89,
    avgResponseMinutes: 18,
    resolutionRate: 87,
    pendingRequests: 5,
    activeRequests: 3,
    resolvedRequests: 81,
    fastestResponseMin: 5,
    slowestResponseMin: 45
)

struct RoleDistribution {
    let role: String
    let count: Int
}

static let roleDistribution: [RoleDistribution] = [
    RoleDistribution(role: "citizen", count: 120),
    RoleDistribution(role: "rescuer", count: 28),
    RoleDistribution(role: "admin", count: 8),
]
```

---

### Screen 4: Admin Settings
- Dùng chung Settings view với citizen/rescuer
- Thêm section "Admin Tools" nếu cần

---

## IV. BOTTOM TAB BAR THEO ROLE

### Citizen (4 tabs):
| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| home | house | Trang chủ | CitizenDashboard |
| map | map | Bản đồ | MapView |
| sos | exclamationmark.triangle | Yêu cầu | SOSCreateView (special style) |
| shield | shield | An toàn | SafetyView |

### Rescuer (4 tabs):
| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| assignment | doc.text | Nhiệm vụ | RescuerDashboardView |
| emergency | light.beacon.max | Yêu cầu | RescuerRequestsView |
| groups | person.3 | Đội | RescuerTeamView |
| settings | gear | Cài đặt | SettingsView |

### Admin (4 tabs):
| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| admin | person.badge.shield.checkmark | Quản trị | AdminDashboardView |
| sos | light.beacon.max | SOS | AdminSOSView |
| analytics | chart.bar | Thống kê | AdminAnalyticsView |
| settings | gear | Cài đặt | SettingsView |

---

## V. DUMMY ACTIONS (tất cả chỉ setState + alert/toast)

| Action | Behavior |
|--------|----------|
| Nhận nhiệm vụ | Đổi request.status → "in_progress", toast "Đã nhận nhiệm vụ" |
| Hoàn thành | Đổi status → "resolved", toast "Hoàn thành" |
| Huỷ nhiệm vụ | Đổi status → "pending", toast "Đã huỷ" |
| Tạo đội | Set activeGroup = new group, toast "Đã tạo đội" |
| Mời thành viên | Thêm vào pendingInvites, toast "Đã gửi lời mời" |
| Chấp nhận lời mời | Xóa khỏi receivedInvites, toast "Đã chấp nhận" |
| Từ chối lời mời | Xóa khỏi receivedInvites, toast "Đã từ chối" |
| Thăng cấp | Đổi memberRole, toast "Đã thăng cấp" |
| Giáng cấp | Đổi memberRole, toast "Đã giáng cấp" |
| Xóa thành viên | Xóa khỏi members, toast "Đã xóa" |
| Rời nhóm | Set activeGroup = nil, toast "Đã rời nhóm" |
| Admin đổi role user | Đổi user.role, toast "Đã cập nhật role" |
| Admin phân công SOS | Đổi status→"assigned" + set assignedName, toast "Đã phân công" |
| Admin hoàn thành SOS | Đổi status→"resolved", toast "Đã hoàn thành" |

---

## VI. TÓM TẮT CÁC VIEW CẦN TẠO

| # | View | Mô tả |
|---|------|--------|
| 1 | `RescuerDashboardView` | Dashboard SOS 3 tabs + stats + actions |
| 2 | `RescuerTeamView` | Team management 3 tabs (đội/danh bạ/lời mời) |
| 3 | `AdminDashboardView` | Overview stats + system status + rescuer list |
| 4 | `AdminSOSView` | SOS management 4 tabs + assign + complete |
| 5 | `AdminAnalyticsView` | KPI cards + charts + metrics |
| 6 | Tab bar logic | Switch TabView dựa trên user.role |

> **Tổng cộng: 5 screens mới + 1 tab bar router update**
