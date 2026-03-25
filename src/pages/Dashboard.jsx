import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import RightPanel from "../components/layout/RightPanel";
import FloodMap from "../components/map/FloodMap";
import MobileHeader from "../components/layout/MobileHeader";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import DashboardHome from "./DashboardHome";
import RescueRequestPage from "./RescueRequestPage";
import SafetyProtocolPage from "./SafetyProtocolPage";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";
import AboutUsPage from "./AboutUsPage";
import AdminDashboard from "./admin/AdminDashboard";
import RescuerDashboard from "./rescuer/RescuerDashboard";
import CitizenSOSPage from "./citizen/CitizenSOSPage";
import ChatBot from "../components/chat/ChatBot";
import RoleSelectionModal from "../components/auth/RoleSelectionModal";
import { useAuth } from "../contexts/AuthContext";
import { canAccessPage } from "../config/rbac";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const { user, role, needsRoleSelection, selectRole } = useAuth();

  // Guard navigation — redirect to dashboard if the user can't access the page
  // Supports "settings:family" format to open Settings with a specific tab
  const handleNavigate = (page) => {
    if (page.startsWith("settings:")) {
      const tab = page.split(":")[1];
      setSettingsTab(tab);
      if (canAccessPage(role, "settings")) {
        setActivePage("settings");
      } else {
        setActivePage("dashboard");
      }
      return;
    }
    if (page === "settings") {
      setSettingsTab("profile");
    }
    if (canAccessPage(role, page)) {
      setActivePage(page);
    } else {
      setActivePage("dashboard");
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <DashboardHome onNavigate={handleNavigate} />
          </main>
        );
      case "sos":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <CitizenSOSPage />
          </main>
        );
      case "rescue":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <RescueRequestPage />
          </main>
        );
      case "safety":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <SafetyProtocolPage />
          </main>
        );
      case "news":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <ReportsPage />
          </main>
        );
      case "settings":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <SettingsPage key={settingsTab} defaultTab={settingsTab} />
          </main>
        );
      case "about":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <AboutUsPage />
          </main>
        );

      // ── Admin pages ──
      case "admin":
      case "admin-users":
      case "admin-teams":
      case "admin-sensors":
      case "admin-analytics":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <AdminDashboard activePage={activePage} />
          </main>
        );

      // ── Rescuer pages ──
      case "rescuer-dashboard":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <RescuerDashboard />
          </main>
        );

      default:
        return (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative min-h-[50vh] lg:min-h-0">
              <Header />
              <FloodMap />
            </main>
            <RightPanel onNavigate={handleNavigate} />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full flex-col lg:flex-row">
      {/* Mobile Header */}
      <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop: static, mobile: overlay drawer) */}
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main content — add bottom padding on mobile for nav bar */}
        <div className="flex-1 flex overflow-hidden pb-16 lg:pb-0">
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activePage={activePage} onNavigate={handleNavigate} />

      {/* Chatbot */}
      <ChatBot />

      {/* Role Selection Modal for first-time users */}
      {needsRoleSelection && (
        <RoleSelectionModal
          userName={user?.displayName || "User"}
          onSelect={selectRole}
        />
      )}
    </div>
  );
}

