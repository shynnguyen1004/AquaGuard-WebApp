import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import RightPanel from "../components/layout/RightPanel";
import FloodMap from "../components/map/FloodMap";
import DashboardHome from "./DashboardHome";
import RescueRequestPage from "./RescueRequestPage";
import SafetyProtocolPage from "./SafetyProtocolPage";
import ReportsPage from "./ReportsPage";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          <>
            <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
              <Header />
              <FloodMap />
            </main>
            <RightPanel />
          </>
        );
    }
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />
      {renderContent()}
    </div>
  );
}
