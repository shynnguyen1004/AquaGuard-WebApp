const en = {
  // ── Settings Page ──
  settings: {
    title: "Settings",
    subtitle: "Manage your profile, family, and preferences",
    tabs: {
      profile: "Profile",
      family: "Family",
      appearance: "Appearance",
      language: "Language",
    },
    profile: {
      personalInfo: "Personal Information",
      fullName: "Full Name",
      email: "Email",
      phone: "Phone Number",
      emergencyContact: "Emergency Contact",
      address: "Address",
      saveChanges: "Save Changes",
      profileUpdated: "Profile updated successfully!",
      citizen: "Citizen",
    },
    family: {
      title: "Family Members",
      subtitle: "Track the safety status of your family during emergencies",
      addMember: "Add Member",
      addNewMember: "Add New Family Member",
      fullName: "Full Name",
      relation: "Relation (e.g. Sister)",
      phone: "Phone Number",
      add: "Add",
      cancel: "Cancel",
      noMembers: "No family members added yet",
      safe: "safe",
      danger: "danger",
      unknown: "unknown",
    },
    appearance: {
      theme: "Theme",
      light: "Light",
      lightDesc: "Bright and clean",
      dark: "Dark",
      darkDesc: "Easy on the eyes",
      system: "System",
      systemDesc: "Match device setting",
    },
    language: {
      title: "Language",
      subtitle: "Choose your preferred display language",
      english: "English",
      englishNative: "English",
      englishDesc: "Display in English",
      vietnamese: "Tiếng Việt",
      vietnameseNative: "Tiếng Việt",
      vietnameseDesc: "Hiển thị bằng Tiếng Việt",
    },
  },

  // ── Navigation ──
  nav: {
    dashboard: "Dashboard",
    map: "Live Flood Map",
    sos: "SOS Request",
    rescue: "Rescue Requests",
    "rescuer-missions": "My Missions",
    "rescuer-team": "Rescuer Team",
    news: "News & Alerts",
    safety: "Safety Protocols",
    about: "About Us",
    admin: "Admin Dashboard",
    "admin-requests": "SOS Requests",
    "admin-users": "User Management",
    "admin-teams": "Rescue Teams",
    "admin-sensors": "Flood Sensors",
    "admin-analytics": "System Analytics",
    settings: "Settings",
    logout: "Logout",
  },

  // ── Header ──
  header: {
    welcomeBack: "Welcome back,",
    location: "Da Nang City, Vietnam",
    riskLabel: "Current Risk Level",
    riskValue: "DANGER",
    searchPlaceholder: "Search zone or rescue point...",
  },

  // ── Dashboard Home ──
  dashboard: {
    welcomeBack: "Welcome back,",
    lastUpdated: "Last updated: just now",
  },

  // ── Status Card ──
  statusCard: {
    currentStatus: "Current Status",
    danger: "Danger",
    warning: "Warning",
    safe: "Safe",
    dangerAction: "Take action immediately",
    warningAction: "Stay alert and monitor updates",
    safeAction: "No immediate threats detected",
    location: "Ho Chi Minh city University of Technology, Dien Hong Ward",
  },

  // ── Stats Overview ──
  stats: {
    overview: "Overview",
    waterLevel: "Water Level",
    rescueTeams: "Rescue Teams",
    sheltersOpen: "Shelters Open",
    evacuated: "Evacuated",
    deployed: "deployed",
    capacity: "capacity",
    today: "today",
  },

  // ── Quick Actions (Dashboard) ──
  quickActions: {
    title: "Quick Actions",
    shelter: "Shelter",
    shelterDesc: "Find nearest shelter",
    sos: "SOS",
    sosDesc: "Emergency contact",
    family: "Family",
    familyDesc: "Check on family",
  },

  // ── Dashboard Alerts ──
  dashboardAlerts: {
    title: "Active Alerts",
    active: "Active",
    heavyRainfall: "Heavy Rainfall Expected",
    riverRising: "River Water Level Rising",
    stormWarning: "Storm Warning Issued",
    minAgo: "min ago",
    hourAgo: "hour ago",
    hoursAgo: "hours ago",
  },

  // ── Right Panel Quick Actions ──
  rightPanel: {
    quickActions: "Quick Actions",
    sos: "SOS",
    sosSubtitle: "Direct Emergency Contact",
    findShelter: "Find Shelter",
    findShelterSubtitle: "Navigate to Nearest Safety",
    familyCheck: "Family Check",
    familyCheckSubtitle: "Contact Registered Members",
  },

  // ── Active Alerts (Right Panel) ──
  activeAlerts: {
    title: "Active Alerts",
    live: "LIVE",
    heavyRainfall: "Heavy Rainfall Expected",
    heavyRainfallDesc: "Level 3 alert in Da Nang. Expected in next 2 hours.",
    riverRising: "River Water Level Rising",
    riverRisingDesc: "Han River levels rising at 15cm/hour.",
    powerOutage: "Power Outage Risk",
    powerOutageDesc: "Central district grid may be suspended for safety.",
    urgent: "Urgent",
    monitoring: "Monitoring",
    advisory: "Advisory",
  },

  // ── Emergency Support ──
  emergency: {
    title: "Emergency Support",
    description: "AquaGuard AI is monitoring all incoming signals 24/7.",
    requestBtn: "Request Reinforcements",
  },

  // ── SOS Page ──
  sosPage: {
    title: "SOS Request",
    subtitle: "Send a rescue request and track its status in real time",
    sendSOS: "Send SOS",
    myRequests: "My Requests",
    loading: "Loading your requests...",
    noRequests: "No requests yet",
    noRequestsHint: "Click \"Send SOS\" to submit your first rescue request",
    justNow: "Just now",
    minAgo: "min ago",
    hAgo: "h ago",
    unknownLocation: "Unknown location",
    urgency: "urgency",
    assignedTo: "Assigned to:",
    groupAssigned: "Group:",
    releasedBy: "This case was returned by:",
    pending: "Pending",
    assigned: "Assigned",
    inProgress: "In Progress",
    resolved: "Resolved",
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  },

  // ── Rescue Request Form ──
  rescueForm: {
    title: "New Rescue Request",
    subtitle: "Provide detailed information so the rescue team can assist as quickly as possible.",
    location: "Current Location",
    locationPlaceholder: "e.g.: 268 Ly Thuong Kiet, District 10, HCMC",
    locationError: "Please enter a location",
    description: "Situation Description",
    descriptionPlaceholder: "Describe the current situation: water level, number of people needing rescue, health conditions...",
    descriptionError: "Please enter a description",
    urgencyLevel: "Urgency Level",
    sceneImages: "Scene Images",
    maxImages: "(max 5 images)",
    dragDrop: "Drag and drop images here or",
    chooseFiles: "choose files",
    fileTypes: "PNG, JPG, WEBP — max 10MB/image",
    cancel: "Cancel",
    submit: "Submit Rescue Request",
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  },

  // ── Roles ──
  roles: {
    admin: "System Administrator",
    rescuer: "Rescue Team",
    citizen: "Citizen",
    user: "User",
  },

  // ── Safety Protocols Page ──
  safetyPage: {
    title: "Safety Protocols",
    subtitle: "Emergency contact information and safety guide for flood disasters.",
    emergencyAssistance: "Emergency Assistance",
    safetyGuides: "Safety Guides",
    police: "Police",
    fireBrigade: "Fire Brigade",
    ambulance: "Ambulance",
    urgencyInfo: "Info",
    urgencyCritical: "Critical",
    urgencyMedium: "Medium",
    urgencyHigh: "High",
    beforeFlood: "Before a Flood",
    beforePoints: [
      "Prepare an emergency kit (water, food, flashlight, first-aid, batteries).",
      "Identify the safest evacuation routes to higher ground.",
      "Keep important documents in a waterproof container.",
      "Move essential items, electronics, and valuables to upper floors.",
    ],
    duringFlood: "During a Flood",
    duringPoints: [
      "Move to higher ground immediately.",
      "Avoid walking or driving through flood waters (15cm of moving water can knock you down).",
      "Stay away from downed power lines and electrical wires.",
      "Turn off utilities at the main switches if instructed to do so.",
      "Listen to emergency broadcasts for latest updates.",
    ],
    afterFlood: "After a Flood",
    afterPoints: [
      "Return home only when authorities say it's safe.",
      "Wear protective clothing, including rubber boots and gloves.",
      "Document property damage with photos for insurance claims.",
      "Watch for structural damage, mold, and displaced wildlife.",
      "Do not consume tap water until it has been declared safe.",
    ],
    evacuationGuide: "Evacuation Guide",
    evacuationPoints: [
      "Leave immediately when advised to evacuate by local authorities.",
      "Take your emergency supply kit and essential medications.",
      "Lock your home before leaving.",
      "Follow designated evacuation routes; do not take shortcuts.",
      "If stranded, do not try to swim to safety. Wait for rescue teams.",
    ],
    medicalEmergencies: "Medical Emergencies",
    medicalPoints: [
      "Clean and bandage all open wounds immediately to prevent infection.",
      "Seek emergency medical attention if you suspect waterborne illness.",
      "Prevent hypothermia by removing wet clothing and staying warm.",
      "Keep a basic first-aid kit accessible at all times.",
    ],
  },
};

export default en;
