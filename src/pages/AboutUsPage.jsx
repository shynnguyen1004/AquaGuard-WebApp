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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Mission</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Every year, floods displace thousands of families and cause unprecedented damage. AquaGuard was built on the core belief that access to timely information and quick communication saves lives. Our platform serves as a central hub connecting citizens, rescue teams, and local authorities to seamlessly manage crisis situations.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
              Whether you need to report rising water levels, request immediate rescue for a family member, or stay updated on active community safety protocols, AquaGuard aims to be your reliable partner during extreme weather events.
            </p>
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

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="size-16 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto flex items-center justify-center mb-4">
               <span className="material-symbols-outlined text-3xl text-slate-400">code</span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">The Development Team</h3>
            <p className="text-sm text-slate-500 mb-4">
              Built with purpose by a dedicated team of engineers focused on solving climate emergency challenges through modern technology.
            </p>
            <div className="flex justify-center gap-2">
              <a href="#" className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-primary transition">
                <i className="fab fa-github"></i>
              </a>
              <a href="#" className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-primary transition">
                <i className="fab fa-linkedin"></i>
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
