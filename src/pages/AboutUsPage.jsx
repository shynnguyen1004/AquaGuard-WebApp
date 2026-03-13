// If no local image, we can use an unspalsh layout or standard icons.
import { useAuth } from "../contexts/AuthContext";

export default function AboutUsPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 dark:bg-slate-900/50">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          About AquaGuard
        </h1>
        <p className="text-slate-500 max-w-2xl">
          Empowering communities with real-time flood intelligence, rapid emergency response coordination, and critical safety resources when it matters most.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Our Mission */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">flag</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Vision and Mission</h2>
            </div>
            
            <h3 className="text-md font-bold text-slate-900 dark:text-white mt-6 mb-2">Vision (Long-term Vision)</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              To build a resilient and accessible digital platform that improves disaster preparedness and emergency response, helping communities in flood-prone regions stay safer and better connected during natural disasters.
            </p>

            <h3 className="text-md font-bold text-slate-900 dark:text-white mb-2">Mission (Product Mission)</h3>
            <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
              <li>Provide residents with reliable flood alerts and safety information during emergencies.</li>
              <li>Enable fast and simple communication between citizens and rescue teams through SOS reporting and location sharing.</li>
              <li>Support authorities and responders with real-time situational data to improve rescue coordination and decision-making.</li>
              <li className="italic">*Future: Deploy a drone system that connects with the AquaGuard app to connect to victims in every region, despite connectivity loss.</li>
            </ul>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex items-start gap-4">
              <div className="size-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">map</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Live Tracking</h3>
                <p className="text-sm text-slate-500">Interactive maps with real-time data on water levels and safe zones.</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex items-start gap-4">
              <div className="size-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">emergency</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Rapid Rescue</h3>
                <p className="text-sm text-slate-500">Instant SOS requests routed directly to nearby rescue teams.</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex items-start gap-4">
              <div className="size-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Community Alerts</h3>
                <p className="text-sm text-slate-500">Crowdsourced incident reports to keep neighborhoods informed.</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex items-start gap-4">
              <div className="size-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">health_and_safety</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Safety First</h3>
                <p className="text-sm text-slate-500">Comprehensive guides and protocols for flood preparation.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Team / Extra Info */}
        <div className="space-y-6">
          <div className="bg-primary text-white rounded-2xl p-8 relative overflow-hidden shadow-lg shadow-primary/20">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-4">Join the Cause</h2>
              <p className="text-primary-50 text-sm leading-relaxed mb-6">
                AquaGuard is open to volunteers, rescue professionals, and developers looking to make a difference. 
              </p>
              <button className="bg-white text-primary font-bold px-6 py-2.5 rounded-xl hover:bg-slate-50 transition drop-shadow-sm w-full">
                Get Involved
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-white/10 rotate-12 pointer-events-none">
              water_drop
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-center">Academic Supervisors</h3>
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Dr. Võ Thanh Hằng</p>
                <p className="text-xs text-slate-500 mt-1">Faculty of Environment and Natural Resources Engineering</p>
                <p className="text-xs text-slate-400">Ho Chi Minh City University of Technology (HCMUT)</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                 <p className="font-semibold text-slate-900 dark:text-white text-sm">MSc. Bùi Xuân Giang</p>
                 <p className="text-xs text-slate-500 mt-1">Faculty of Computer Science and Engineering</p>
                 <p className="text-xs text-slate-400">Ho Chi Minh City University of Technology (HCMUT)</p>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-center">Contributors</h3>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {['Nguyen Truong Son', 'Nguyen Minh Quan', 'Nguyen Minh Quan', 'Tran Tuan Nghia', 'Truong Nguyen Bao Khang'].map((name, i) => (
                <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                  {name}
                </span>
              ))}
            </div>
            
            <div className="flex justify-center gap-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <a href="#" className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-primary transition">
                <i className="fab fa-github"></i>
              </a>
              <a href="mailto:contact@aquaguard.app" className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-primary transition">
                <span className="material-symbols-outlined text-[1rem]">mail</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center pb-8">
         <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} AquaGuard. All rights reserved.</p>
         <p className="text-[10px] text-slate-400 mt-1">Version 1.0.0 (Beta)</p>
      </div>

    </div>
  );
}
