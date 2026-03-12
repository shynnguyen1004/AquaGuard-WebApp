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
import ChatBot from "../components/chat/ChatBot";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <DashboardHome />
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
      case "reports":
        return (
          <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <ReportsPage />
          </main>
        );
      default:
        return (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative min-h-[50vh] lg:min-h-0">
              <Header />
              <FloodMap />
            </main>
            <RightPanel />
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
          onNavigate={setActivePage}
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
      <MobileBottomNav activePage={activePage} onNavigate={setActivePage} />

      {/* Chatbot */}
      <ChatBot />
    </div>
  );
}
