# AquaGuard — Mermaid BPMN Code

Copy từng block vào [mermaid.live](https://mermaid.live) để vẽ.

---

## 0. Level 1 — Business Process Overview

```mermaid
flowchart TB
    subgraph POOL["AQUAGUARD FLOOD RESCUE SYSTEM"]
        direction TB

        subgraph AUTH["ENTRY POINT"]
            direction LR
            S0((Start)) --> Login["1. Register / Login"]
            Login --> RC{"Role?"}
            RC -- Citizen --> C1["Citizen workflow"]
            RC -- Rescuer --> R1["Rescuer workflow"]
        end

        subgraph ADMIN_AUTH["ADMIN ENTRY"]
            direction LR
            SA((Start)) --> ALogin["1. Login as Admin"]
            ALogin --> A1["Admin workflow"]
        end

        subgraph CITIZEN_LANE["CITIZEN"]
            direction LR
            C1 --> P2["2. Submit SOS"]
            C1 --> P6["6. Family Safety"]
            P2 --> Wait{{"Waiting for rescue"}}
            Wait --> Rescued{{"Citizen rescued"}}
        end

        subgraph RESCUER_LANE["RESCUER"]
            direction LR
            R1 --> P5["5. Manage Team"]
            R1 --> P3["3. Handle Rescue"]
            P5 -. supports .-> P3
            P3 --> Done((End))
        end

        subgraph ADMIN_LANE["ADMINISTRATOR"]
            direction LR
            A1 --> P4["4. Manage Flood Zones"]
            A1 --> P3A["3. Oversee Missions"]
        end

        P2 -- "request queued" --> P3
        P4 -. "map data" .-> P6
        P4 -. "map data" .-> P3
        P3A -- "assign/complete" --> P3
    end
```

---

## 1. Registration & Login

```mermaid
flowchart TB
    subgraph POOL1["PROCESS 1: REGISTER AND LOGIN"]
        direction TB
        subgraph USER1["USER"]
            S1((Start)) --> Visit[Visit website]
            Visit --> Method{Auth method?}
            Method -- Phone --> Mode{Login or Register?}
            Mode -- Login --> InLogin[Enter phone + password]
            Mode -- Register --> InReg[Enter name, phone, password, gender, DOB]
            InReg --> Role{Select role}
            Role -- Citizen --> Submit[Submit registration]
            Role -- Rescuer --> OrgPwd[Enter org password]
            OrgPwd --> Submit
            Method -- Google --> GBtn[Click Google Sign-In]
            OK{{"Access Dashboard"}} --> E1((End))
        end
        subgraph SYS1["AQUAGUARD SYSTEM"]
            InLogin --> Verify[Verify credentials]
            Verify --> VR1{Valid?}
            VR1 -- No --> Err1[Show error]
            Err1 -.-> InLogin
            VR1 -- Yes --> Token[Create session]
            Submit --> Val[Validate and create account]
            Val --> VR2{Success?}
            VR2 -- Error --> Err2[Show error]
            Err2 -.-> InReg
            VR2 -- OK --> Token
            GBtn --> GAuth[Google auth]
            GAuth --> New{New user?}
            New -- Yes --> PickRole[Show role dialog]
            PickRole --> SaveR[Save role]
            SaveR --> Token
            New -- No --> LoadR[Load role]
            LoadR --> Token
            Token --> Redir[Redirect by role]
            Redir -- Citizen --> DC[Citizen Dashboard]
            Redir -- Rescuer --> DR[Rescue Missions]
            Redir -- Admin --> DA[Admin Dashboard]
            DC --> OK
            DR --> OK
            DA --> OK
        end
    end
```

---

## 2. Submitting an Emergency SOS Request

```mermaid
flowchart TB
    subgraph POOL2["PROCESS 2: SUBMIT SOS"]
        direction TB
        subgraph CITIZEN2["CITIZEN"]
            S2((Emergency)) --> Open[Open SOS page]
            Open --> Fill[Fill form: location, description, urgency, photos]
            Fill --> Send[Press Send SOS]
            Track{{"Track request status"}} --> CS{Status?}
            CS -- In Progress --> Map[View rescuer on live map]
            CS -- Resolved --> Safe{{"Rescued"}}
            Safe --> E2((End))
        end
        subgraph SYS2["AQUAGUARD SYSTEM"]
            Send --> GPS[Capture GPS from device]
            GPS --> Upload[Upload photos to cloud]
            Upload --> Save[Save request — Status: Pending]
            Save --> Queue[Show in Rescue Queue]
            Queue -.-> Track
            Accepted[Update: In Progress] -.-> CS
            Resolved[Update: Resolved] -.-> CS
        end
    end
```

---

## 3. Rescue Request Handling & Operations

```mermaid
flowchart TB
    subgraph POOL3["PROCESS 3: HANDLE RESCUE"]
        direction TB
        subgraph RESCUER3["RESCUER"]
            S3((Request)) --> View[View pending requests]
            View --> Filter[Filter by urgency, age, city]
            Filter --> Pick[Select a request]
            Pick --> AM{Accept as?}
            AM -- Individual --> Acc[Accept individually]
            AM -- Team --> AccG[Accept as team]
            Acc --> Go[Navigate to scene]
            AccG --> Go
            Go --> Rescue[Perform rescue]
            Rescue --> OC{Outcome?}
            OC -- Done --> Mark[Confirm completion]
            OC -- Cannot reach --> Release[Release back to queue]
        end
        subgraph SYS3["AQUAGUARD SYSTEM"]
            Acc --> SIP[Status: In Progress]
            AccG --> SIP
            SIP --> Track3[Start live tracking]
            Mark --> SC[Status: Resolved]
            SC --> E3((End))
            Release --> SR[Revert to Pending]
            SR -.-> View
            AdminAssigned[Status: Assigned] --> NeedAccept[Rescuer must accept to start]
            NeedAccept -.-> View
        end
        subgraph ADMIN3["ADMINISTRATOR"]
            AView[View all SOS] --> AA{Action?}
            AA -- Assign rescuer --> AAssign[Pick a rescuer from list]
            AAssign --> AdminAssigned
            AA -- Force complete --> AComp[Complete in-progress request]
            AComp --> SC
        end
    end
```
        end
    end
```

---

## 4. Flood Zone Management

```mermaid
flowchart TB
    subgraph POOL4["PROCESS 4: MANAGE FLOOD ZONES"]
        direction TB
        subgraph ADMIN4["ADMINISTRATOR"]
            S4((Update)) --> Editor[Open Map Editor]
            Editor --> Act{Action?}
            Act -- Add --> Click[Click location on map]
            Click --> Info[Enter name, severity, water level]
            Info --> SaveN[Save new zone]
            Act -- Edit --> ClickE[Click existing marker]
            ClickE --> Edit[Update details]
            Edit --> SaveE[Save changes]
            Act -- Delete --> ClickD[Click marker to delete]
            ClickD --> Conf{Confirm?}
            Conf -- Yes --> Del[Delete marker]
        end
        subgraph SYS4["AQUAGUARD SYSTEM"]
            SaveN --> DB4[Save to database]
            SaveE --> DB4
            Del --> DB4
            DB4 --> Sync[Real-time sync to all users]
        end
        subgraph USERS4["ALL USERS"]
            Sync --> Updated{{"Map updates instantly"}}
            Updated --> E4((Done))
        end
    end
```

---

## 5. Rescue Team Management

```mermaid
flowchart TB
    subgraph POOL5["PROCESS 5: MANAGE TEAM"]
        direction TB
        subgraph LEADER5["TEAM LEADER"]
            S5((Setup)) --> Create[Create team: name + description]
            Create --> Invite[Invite rescuer by phone]
        end
        subgraph SYS5["AQUAGUARD SYSTEM"]
            Create --> SysC[Save team, assign Leader role]
            Invite --> SysV[Validate phone, role, no existing team]
            SysV --> VOK{Valid?}
            VOK -- Error --> VErr[Show error]
            VOK -- OK --> SendInv[Send invitation]
            AccR --> SysJ[Add as Member, cancel other invites]
            DecR --> SysD[Mark as declined]
        end
        subgraph INVITEE5["INVITED RESCUER"]
            SendInv --> See[See invitation on Team page]
            See --> IC{Accept?}
            IC -- Yes --> AccR[Join the team]
            IC -- No --> DecR[Decline]
            SysJ --> Ready{{"Team member — can do group missions"}}
            Ready --> E5((End))
        end
    end
```

---

## 6. Family Safety Tracking

```mermaid
flowchart TB
    subgraph POOL6["PROCESS 6: FAMILY SAFETY"]
        direction TB
        subgraph USER6["USER"]
            S6((Start)) --> Settings[Open Settings — Family]
            Settings --> Add[Add member: phone + relationship]
            Add --> OpenMap[Open map, enable Family mode]
            OpenMap --> Pins{{"See family locations on map"}}
            Pins --> WR{Want directions?}
            WR -- Yes --> Tap[Tap on a member]
            Tap --> Route{{"View route, distance, ETA"}}
            WR -- No --> E6((End))
            Route --> E6
        end
        subgraph SYS6["AQUAGUARD SYSTEM"]
            Add --> SysSave[Save member info]
            OpenMap --> SysGPS[Get GPS, sync to server]
            SysGPS --> SysFetch[Fetch family locations]
            SysFetch --> SysShow[Show pins with safety colors]
            SysShow -.-> Pins
            Tap --> SysRoute[Calculate driving route]
            SysRoute -.-> Route
        end
    end
```
