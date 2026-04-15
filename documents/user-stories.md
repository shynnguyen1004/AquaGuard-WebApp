# 📋 AquaGuard — User Stories

> **Project:** AquaGuard — Flood Alert & Rescue Web Platform  
> **Version:** 1.0.0  
> **Date:** 2026-04-15  
> **Estimation:** Fibonacci (1, 2, 3, 5, 8, 13)  
> **Importance:** High (H) · Medium (M) · Low (L)

---

## 👥 Roles Involved

| # | Role | Description |
|---|------|-------------|
| 1 | **Citizen** | Resident affected by flooding who needs rescue, safety info, and family tracking |
| 2 | **Rescuer** | Rescue team member who responds to SOS requests and manages team operations |
| 3 | **Team Leader** | Rescuer who creates and manages a rescue group (sub-role of Rescuer) |
| 4 | **Admin** | System administrator who oversees users, flood zones, missions, and analytics |

---

## 🔐 EPIC 1: Authentication & Account Management

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-01                                           │
│ As a new user                                               │
│ I want to register an account using my phone number         │
│ So that I can access the AquaGuard platform                 │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-02                                           │
│ As a registered user                                        │
│ I want to log in with my phone number and password          │
│ So that I can securely access my dashboard                  │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-03                                           │
│ As a user                                                   │
│ I want to sign in using my Google account                   │
│ So that I can access the platform quickly                   │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-04                                           │
│ As a first-time Google user                                 │
│ I want to select my role during onboarding                  │
│ So that the system displays the correct dashboard for me    │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-05                                           │
│ As a registered user                                        │
│ I want to update my profile information                     │
│ So that my personal data stays current                      │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-06                                           │
│ As a registered user                                        │
│ I want to change my password                                │
│ So that I can maintain account security                     │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-07                                           │
│ As a user who forgot my password                            │
│ I want to reset it via OTP verification                     │
│ So that I can regain access to my account                   │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-08                                           │
│ As a registered user                                        │
│ I want to upload a profile avatar                           │
│ So that other users can recognise me visually               │
│                                                             │
│ Est: 2                                          Imp: L      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-09                                           │
│ As a registered user                                        │
│ I want to log out of my session                             │
│ So that my account remains secure on shared devices         │
│                                                             │
│ Est: 1                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆘 EPIC 2: SOS & Rescue Requests (Citizen)

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-10                                           │
│ As a citizen in danger                                      │
│ I want to submit an SOS rescue request with my location     │
│ So that rescue teams can locate me immediately              │
│                                                             │
│ Est: 8                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-11                                           │
│ As a citizen                                                │
│ I want to attach photos to my SOS request                   │
│ So that rescuers can assess the situation visually          │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-12                                           │
│ As a citizen                                                │
│ I want to set the urgency level on my SOS request           │
│ So that critical cases receive priority attention           │
│                                                             │
│ Est: 2                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-13                                           │
│ As a citizen                                                │
│ I want to track the real-time status of my SOS request      │
│ So that I know when help is on the way                      │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-14                                           │
│ As a citizen                                                │
│ I want to view the rescuer's live location on the map       │
│ So that I can estimate their arrival time                   │
│                                                             │
│ Est: 8                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-15                                           │
│ As a citizen                                                │
│ I want to view my past SOS requests                         │
│ So that I can review my rescue history                      │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚑 EPIC 3: Rescue Operations (Rescuer)

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-16                                           │
│ As a rescuer                                                │
│ I want to view all pending rescue requests                  │
│ So that I can identify citizens who need help               │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-17                                           │
│ As a rescuer                                                │
│ I want to accept a rescue mission individually              │
│ So that I can begin navigating to the citizen               │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-18                                           │
│ As a rescuer                                                │
│ I want to accept a rescue mission as a team                 │
│ So that my group is assigned to the operation collectively  │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-19                                           │
│ As a rescuer                                                │
│ I want to broadcast my live location during a mission       │
│ So that the citizen can track my approach on the map        │
│                                                             │
│ Est: 8                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-20                                           │
│ As a rescuer                                                │
│ I want to mark a rescue mission as completed                │
│ So that the request is resolved in the system               │
│                                                             │
│ Est: 2                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-21                                           │
│ As a rescuer                                                │
│ I want to cancel an accepted mission                        │
│ So that it returns to the queue for another rescuer         │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 EPIC 4: Rescue Team Management

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-22                                           │
│ As a rescuer                                                │
│ I want to create a rescue group with a name                 │
│ So that I can coordinate missions with my team              │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-23                                           │
│ As a team leader                                            │
│ I want to invite a rescuer by phone number                  │
│ So that they can join my rescue group                       │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-24                                           │
│ As an invited rescuer                                       │
│ I want to accept a group invitation                         │
│ So that I become a member of the rescue team                │
│                                                             │
│ Est: 2                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-25                                           │
│ As an invited rescuer                                       │
│ I want to decline a group invitation                        │
│ So that I remain unaffiliated with that team                │
│                                                             │
│ Est: 1                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-26                                           │
│ As a team leader                                            │
│ I want to remove a member from my group                     │
│ So that the team roster stays accurate                      │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-27                                           │
│ As a team leader                                            │
│ I want to promote a member to a higher role                 │
│ So that they gain additional team responsibilities          │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-28                                           │
│ As a rescuer                                                │
│ I want to leave my current rescue group                     │
│ So that I can operate independently                         │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-29                                           │
│ As a team leader                                            │
│ I want to edit my group's name and description              │
│ So that the team profile reflects its current purpose       │
│                                                             │
│ Est: 2                                          Imp: L      │
└─────────────────────────────────────────────────────────────┘
```

---

## 👨‍👩‍👧‍👦 EPIC 5: Family Safety Tracking

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-30                                           │
│ As a citizen                                                │
│ I want to send a family connection request                  │
│ So that I can track family members during a flood           │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-31                                           │
│ As a citizen                                                │
│ I want to accept a family connection request                │
│ So that we can see each other's safety status               │
│                                                             │
│ Est: 2                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-32                                           │
│ As a citizen                                                │
│ I want to reject a family connection request                │
│ So that I control who can view my location                  │
│                                                             │
│ Est: 1                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-33                                           │
│ As a citizen                                                │
│ I want to view my family members' locations on the map      │
│ So that I can verify their safety during a flood            │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-34                                           │
│ As a citizen                                                │
│ I want to update my own safety status                       │
│ So that my family knows I am safe                           │
│                                                             │
│ Est: 2                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-35                                           │
│ As a citizen                                                │
│ I want to remove a family connection                        │
│ So that the person can no longer see my location            │
│                                                             │
│ Est: 1                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-36                                           │
│ As a citizen                                                │
│ I want to view driving directions to a family member        │
│ So that I can reach them during an emergency                │
│                                                             │
│ Est: 5                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗺️ EPIC 6: Live Flood Map

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-37                                           │
│ As a citizen                                                │
│ I want to view the live flood map with zone markers         │
│ So that I can identify dangerous areas near me              │
│                                                             │
│ Est: 8                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-38                                           │
│ As a user                                                   │
│ I want to toggle weather overlay on the map                 │
│ So that I can see current weather conditions                │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-39                                           │
│ As a user                                                   │
│ I want to switch between map tile layers                    │
│ So that I can choose the best visual representation         │
│                                                             │
│ Est: 2                                          Imp: L      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-40                                           │
│ As a user                                                   │
│ I want to click on a flood zone marker for details          │
│ So that I can learn the severity and water level            │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ EPIC 7: Admin — User & System Management

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-41                                           │
│ As an admin                                                 │
│ I want to view all registered users in a list               │
│ So that I can monitor the platform's user base              │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-42                                           │
│ As an admin                                                 │
│ I want to change a user's role                              │
│ So that I can promote citizens to rescuers                  │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-43                                           │
│ As an admin                                                 │
│ I want to view system analytics on a dashboard              │
│ So that I can make informed operational decisions            │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-44                                           │
│ As an admin                                                 │
│ I want to view the audit log of system actions              │
│ So that I can trace changes for accountability              │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌊 EPIC 8: Admin — Flood Zone Management

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-45                                           │
│ As an admin                                                 │
│ I want to create a new flood zone on the map editor         │
│ So that citizens are warned about newly flooded areas       │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-46                                           │
│ As an admin                                                 │
│ I want to edit an existing flood zone's severity            │
│ So that the map reflects current flood conditions           │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-47                                           │
│ As an admin                                                 │
│ I want to delete a resolved flood zone                      │
│ So that the map only shows active hazard areas              │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-48                                           │
│ As an admin                                                 │
│ I want flood zone changes to sync in real-time              │
│ So that all users see the latest map data instantly         │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 EPIC 9: Admin — Rescue Mission Oversight

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-49                                           │
│ As an admin                                                 │
│ I want to assign a rescuer to a pending SOS request         │
│ So that urgent cases are handled promptly                   │
│                                                             │
│ Est: 3                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-50                                           │
│ As an admin                                                 │
│ I want to force-complete a stuck rescue request             │
│ So that the system accurately reflects resolved cases       │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📰 EPIC 10: Admin — News & Announcements

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-51                                           │
│ As an admin                                                 │
│ I want to publish a news article with a cover image         │
│ So that users receive important flood-related updates       │
│                                                             │
│ Est: 5                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔔 EPIC 11: Notifications

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-52                                           │
│ As a user                                                   │
│ I want to receive notifications for important events        │
│ So that I stay informed about rescue updates                │
│                                                             │
│ Est: 5                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-53                                           │
│ As a user                                                   │
│ I want to mark a notification as read                       │
│ So that I can distinguish new alerts from old ones          │
│                                                             │
│ Est: 1                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 💬 EPIC 12: Chatbot & Safety

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-54                                           │
│ As a citizen                                                │
│ I want to ask the chatbot a flood-safety question           │
│ So that I receive immediate guidance during an emergency    │
│                                                             │
│ Est: 8                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-55                                           │
│ As a user                                                   │
│ I want to browse safety protocol guides                     │
│ So that I know how to protect myself during a flood         │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-56                                           │
│ As a user                                                   │
│ I want to view emergency contact numbers                    │
│ So that I can call for help outside the app                 │
│                                                             │
│ Est: 1                                          Imp: H      │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ EPIC 13: Settings & Preferences

```
┌─────────────────────────────────────────────────────────────┐
│ User Story #US-57                                           │
│ As a user                                                   │
│ I want to switch between dark and light theme               │
│ So that I can customise the interface to my preference      │
│                                                             │
│ Est: 2                                          Imp: L      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-58                                           │
│ As a user                                                   │
│ I want to switch the application language                   │
│ So that I can use the platform in my preferred language     │
│                                                             │
│ Est: 3                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Story #US-59                                           │
│ As a user                                                   │
│ I want to update my GPS location manually                   │
│ So that the system knows my current position                │
│                                                             │
│ Est: 2                                          Imp: M      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Summary

| Epic | Stories | H | M | L | Total Est. |
|------|:-------:|:-:|:-:|:-:|:----------:|
| 1 — Authentication & Account | 9 | 5 | 3 | 1 | 29 |
| 2 — SOS & Rescue (Citizen) | 6 | 5 | 1 | 0 | 29 |
| 3 — Rescue Operations (Rescuer) | 6 | 5 | 1 | 0 | 26 |
| 4 — Team Management | 8 | 3 | 4 | 1 | 17 |
| 5 — Family Safety | 7 | 4 | 3 | 0 | 19 |
| 6 — Live Flood Map | 4 | 1 | 2 | 1 | 15 |
| 7 — Admin User & System | 4 | 3 | 1 | 0 | 14 |
| 8 — Admin Flood Zones | 4 | 3 | 1 | 0 | 15 |
| 9 — Admin Rescue Oversight | 2 | 1 | 1 | 0 | 5 |
| 10 — Admin News | 1 | 0 | 1 | 0 | 5 |
| 11 — Notifications | 2 | 1 | 1 | 0 | 6 |
| 12 — Chatbot & Safety | 3 | 1 | 2 | 0 | 12 |
| 13 — Settings & Preferences | 3 | 0 | 2 | 1 | 7 |
| **TOTAL** | **59** | **32** | **23** | **4** | **199** |
