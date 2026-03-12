import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import RightPanel from "../components/layout/RightPanel";
import FloodMap from "../components/map/FloodMap";
import DashboardHome from "./DashboardHome";
import RescueRequestPage from "./RescueRequestPage";
import SafetyProtocolPage from "./SafetyProtocolPage";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");

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
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      {renderContent()}
    </div>
  );
}
