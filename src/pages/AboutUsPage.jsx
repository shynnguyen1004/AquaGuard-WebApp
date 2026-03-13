// If no local image, we can use an unspalsh layout or standard icons.
import { useAuth } from "../contexts/AuthContext";

export default function AboutUsPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">

      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* Vision & Mission */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            Vision & Mission
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">visibility</span>
                Vision (Long-term Vision)
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                To build a resilient and accessible digital platform that improves disaster preparedness and emergency response, helping communities in flood-prone regions stay safer and better connected during natural disasters.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">flag</span>
                Mission (Product Mission)
              </h3>
              <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 leading-relaxed space-y-3 text-[1.05rem]">
                <li>Provide residents with reliable flood alerts and safety information during emergencies.</li>
                <li>Enable fast and simple communication between citizens and rescue teams through SOS reporting and location sharing.</li>
                <li>Support authorities and responders with real-time situational data to improve rescue coordination and decision-making.</li>
                <li className="italic text-primary/80 list-none -ml-5 pt-2">*Future: Deploy a drone system that connects with the AquaGuard app to connect to victims in every region, despite connectivity loss.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Academic Supervisors Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            Academic Supervisors
          </h2>

          <div className="space-y-16">

            {/* Supervisor 1 */}
            <div className="flex flex-col md:flex-row gap-10 items-start">
              {/* Headshot placeholder */}
              <div className="w-56 h-72 bg-slate-200 dark:bg-slate-800 rounded-3xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner border border-slate-300/50 dark:border-slate-700/50 relative group">
                {/* To add an image, replace the span below with an img tag like: 
                       <img src="/images/your_image.jpg" alt="Võ Thanh Hằng" className="w-full h-full object-cover" /> 
                   */}
                <span className="material-symbols-outlined text-7xl text-slate-400">person</span>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Võ Thanh Hằng</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-4 mt-6">
                  Dr. Võ Thanh Hằng is a faculty member in the Faculty of Environment and Natural Resources Engineering at Ho Chi Minh City University of Technology (HCMUT).
                </p>
              </div>
            </div>

            {/* Supervisor 2 */}
            <div className="flex flex-col md:flex-row gap-10 items-start">
              {/* Headshot placeholder */}
              <div className="w-56 h-72 bg-slate-200 dark:bg-slate-800 rounded-3xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner border border-slate-300/50 dark:border-slate-700/50 relative group">
                {/* To add an image, replace the span below with an img tag like: 
                       <img src="/images/your_image.jpg" alt="Bùi Xuân Giang" className="w-full h-full object-cover" /> 
                   */}
                <span className="material-symbols-outlined text-7xl text-slate-400">person</span>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Bùi Xuân Giang</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-4 mt-6">
                  Mr. Bùi Xuân Giang is a faculty member in the Faculty of Computer Science and Engineering at Ho Chi Minh City University of Technology (HCMUT).
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Advisors Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            Advisor
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {[
              { id: 1, name: "Lê Phúc Khang", role: "Advisor" },
              { id: 2, name: "Phan Hoàng Kiên", role: "Advisor" },
              { id: 3, name: "Trần Gia Kiệt", role: "Advisor" },
              { id: 4, name: "Lê Quốc Huy", role: "Advisor" },
            ].map(advisor => (
              <div key={advisor.id} className="flex flex-col group cursor-default">
                {/* Large Square Image Container */}
                <div className="w-full aspect-square bg-[#e2e8f0] dark:bg-slate-800 mb-5 overflow-hidden relative flex items-center justify-center">
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 opacity-60 dark:opacity-20 pointer-events-none"
                    style={{ backgroundImage: 'repeating-radial-gradient(circle at center, transparent 0, transparent 40px, rgba(255,255,255,0.7) 40px, rgba(255,255,255,0.7) 41px)' }}>
                  </div>
                  <span className="material-symbols-outlined text-7xl text-slate-400 dark:text-slate-600 z-10 group-hover:scale-110 transition-transform duration-500">person</span>
                  <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none" />
                </div>
                {/* Left-Aligned Name Container */}
                <div className="text-left">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base md:text-lg leading-tight">{advisor.name}</h4>
                  <p className="text-slate-500 dark:text-slate-400 italic text-xs mt-1">{advisor.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Team Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            Core Team
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">

            {[
              { id: 1, name: "Nguyễn Trường Sơn", avatar: "" },
              { id: 2, name: "Nguyễn Minh Quân", avatar: "" },
              { id: 3, name: "Nguyễn Minh Quân", avatar: "" },
              { id: 4, name: "Trần Tuấn Nghĩa", avatar: "" },
              { id: 5, name: "Trương Nguyễn Bảo Khang", avatar: "../dist/images/khang.png" },
              { id: 6, name: "Aleksander Binkowski", avatar: "" },
              { id: 7, name: "Lê Hoàng Thịnh", avatar: "" },
            ].map(contributor => (
              <div key={contributor.id} className="flex flex-col group cursor-default">
                {/* Large Square Image Container */}
                <div className="w-full aspect-square bg-[#e2e8f0] dark:bg-slate-800 mb-5 overflow-hidden relative flex items-center justify-center">

                  {/* Subtle Background Pattern (Concentric Circles imitating the screenshot) */}
                  <div className="absolute inset-0 opacity-60 dark:opacity-20 pointer-events-none"
                    style={{ backgroundImage: 'repeating-radial-gradient(circle at center, transparent 0, transparent 40px, rgba(255,255,255,0.7) 40px, rgba(255,255,255,0.7) 41px)' }}>
                  </div>

                  {contributor.avatar ? (
                    <img src={contributor.avatar} alt={contributor.name} className="w-full h-full object-cover z-10 group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="material-symbols-outlined text-7xl text-slate-400 dark:text-slate-600 z-10 group-hover:scale-110 transition-transform duration-500">person</span>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none" />
                </div>

                {/* Left-Aligned Name Container */}
                <div className="text-left">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base md:text-lg leading-tight">{contributor.name}</h4>
                  <p className="text-slate-500 dark:text-slate-400 italic text-xs mt-1">Core Team Member</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
