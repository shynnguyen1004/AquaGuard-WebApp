// If no local image, we can use an unspalsh layout or standard icons.
import { useAuth } from "../contexts/AuthContext";

export default function AboutUsPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">

      {/* Top Banner Area */}
      <div className="bg-[#f2f6fc] dark:bg-slate-800/50 py-16 flex flex-col items-center justify-center text-center border-b border-slate-200 dark:border-slate-700">
        <div className="inline-block px-8 py-3 bg-white border border-slate-300 shadow-sm rounded-sm mb-6">
          <h1 className="text-xl md:text-2xl font-bold tracking-widest text-[#0b2447]">AQUAGUARD TEAM</h1>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-[#0b2447]">Disaster Preparedness & Response</h2>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Intro Section - Keeping our vision and mission as requested previously */}
        <div className="mb-16">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Vision (Long-term Vision)</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            To build a resilient and accessible digital platform that improves disaster preparedness and emergency response, helping communities in flood-prone regions stay safer and better connected during natural disasters.
          </p>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Mission (Product Mission)</h3>
          <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
            <li>Provide residents with reliable flood alerts and safety information during emergencies.</li>
            <li>Enable fast and simple communication between citizens and rescue teams through SOS reporting and location sharing.</li>
            <li>Support authorities and responders with real-time situational data to improve rescue coordination and decision-making.</li>
            <li className="italic">*Future: Deploy a drone system that connects with the AquaGuard app to connect to victims in every region, despite connectivity loss.</li>
          </ul>
        </div>

        {/* Academic Supervisors Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 border-b-2 border-slate-900 dark:border-white pb-2 inline-block w-full">
            Academic Supervisors
          </h2>

          <div className="mt-8 space-y-12">

            {/* Supervisor 1 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Headshot placeholder */}
              <div className="w-48 h-64 bg-slate-300 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                <span className="material-symbols-outlined text-6xl text-slate-400">person</span>
              </div>
              <div>
                <h4 className="text-blue-600 font-bold mb-1">Dr.</h4>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Võ Thanh Hằng</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
                  Dr. Võ Thanh Hằng is a faculty member in the Faculty of Environment and Natural Resources Engineering at Ho Chi Minh City University of Technology (HCMUT).
                </p>
              </div>
            </div>

            {/* Supervisor 2 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Headshot placeholder */}
              <div className="w-48 h-64 bg-slate-300 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                <span className="material-symbols-outlined text-6xl text-slate-400">person</span>
              </div>
              <div>
                <h4 className="text-blue-600 font-bold mb-1">MSc.</h4>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Bùi Xuân Giang</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
                  MSc. Bùi Xuân Giang is a faculty member in the Faculty of Computer Science and Engineering at Ho Chi Minh City University of Technology (HCMUT).
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Contributors Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 border-b-2 border-slate-900 dark:border-white pb-2">
            Contributors
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mt-12 justify-items-center">

            {/* Contributor 1 */}
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-slate-300 mx-auto flex items-center justify-center mb-4 overflow-hidden border-2 border-transparent">
                <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">Nguyen Truong Son</p>
              <p className="text-xs text-slate-500 italic mt-1">(Nguyễn Trường Sơn)</p>
            </div>

            {/* Contributor 2 */}
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-slate-300 mx-auto flex items-center justify-center mb-4 overflow-hidden border-2 border-transparent">
                <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">Nguyen Minh Quan</p>
              <p className="text-xs text-slate-500 italic mt-1">(Nguyễn Minh Quân)</p>
            </div>

            {/* Contributor 3 */}
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-slate-300 mx-auto flex items-center justify-center mb-4 overflow-hidden border-2 border-transparent">
                <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">Nguyen Minh Quan</p>
              <p className="text-xs text-slate-500 italic mt-1">(Nguyễn Minh Quân)</p>
            </div>

            {/* Contributor 4 */}
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-slate-300 mx-auto flex items-center justify-center mb-4 overflow-hidden border-2 border-transparent">
                <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">Tran Tuan Nghia</p>
              <p className="text-xs text-slate-500 italic mt-1">(Trần Tuấn Nghĩa)</p>
            </div>

            {/* Contributor 5 */}
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-slate-300 mx-auto flex items-center justify-center mb-4 overflow-hidden border-2 border-transparent">
                <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">Truong Nguyen Bao Khang</p>
              <p className="text-xs text-slate-500 italic mt-1">(Trương Nguyễn Bảo Khang)</p>
            </div>


          </div>
        </div>

      </div>

      {/* Footer Note */}
      <div className="text-center pb-8">
        <div className="flex justify-center gap-4 mb-4">
          <a href="#" className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:text-primary transition">
            <i className="fab fa-github"></i>
          </a>
          <a href="mailto:contact@aquaguard.app" className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:text-primary transition">
            <span className="material-symbols-outlined text-[1.2rem]">mail</span>
          </a>
        </div>
        <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} AquaGuard. All rights reserved.</p>
        <p className="text-[10px] text-slate-400 mt-1">Version 1.0.0 (Beta)</p>
      </div>

    </div>
  );
}
