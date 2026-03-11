import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import RightPanel from "../components/layout/RightPanel";
import FloodMap from "../components/map/FloodMap";

export default function Dashboard() {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />

      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
        <Header />
        <FloodMap />
      </main>

      <RightPanel />
    </div>
  );
}
