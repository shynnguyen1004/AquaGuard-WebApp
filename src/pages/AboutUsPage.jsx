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
                  <p className="text-slate-500 italic mb-6 text-lg">(Võ Thanh Hằng)</p>
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-4">
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
                  <p className="text-slate-500 italic mb-6 text-lg">(Bùi Xuân Giang)</p>
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-4">
                     MSc. Bùi Xuân Giang is a faculty member in the Faculty of Computer Science and Engineering at Ho Chi Minh City University of Technology (HCMUT).
                  </p>
               </div>
            </div>

          </div>
        </div>

        {/* Contributors Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            Contributors
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-12 gap-x-6 justify-items-center">
            
            {[
               { id: 1, name: "Nguyen Truong Son", vnName: "Nguyễn Trường Sơn", avatar: "" },
               { id: 2, name: "Nguyen Minh Quan", vnName: "Nguyễn Minh Quân", avatar: "" },
               { id: 3, name: "Nguyen Minh Quan", vnName: "Nguyễn Minh Quân", avatar: "" },
               { id: 4, name: "Tran Tuan Nghia", vnName: "Trần Tuấn Nghĩa", avatar: "" },
               { id: 5, name: "Truong Nguyen Bao Khang", vnName: "Trương Nguyễn Bảo Khang", avatar: "" },
            ].map(contributor => (
               <div key={contributor.id} className="text-center group">
                 <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto flex items-center justify-center mb-5 overflow-hidden shadow-inner border-4 border-white dark:border-slate-900 group-hover:border-primary/50 transition-colors duration-300 ease-in-out cursor-pointer relative">
                    {/* If contributor has an avatar mapped above, show it, otherwise show placeholder icon */}
                    {contributor.avatar ? (
                       <img src={contributor.avatar} alt={contributor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                       <span className="material-symbols-outlined text-5xl text-slate-400 shadow-sm group-hover:scale-110 transition-transform duration-300">person</span>
                    )}
                    <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 <h4 className="font-bold text-slate-900 dark:text-white text-[1.05rem] max-w-[150px] mx-auto leading-tight">{contributor.name}</h4>
                 <p className="text-sm text-slate-500 italic mt-1.5">({contributor.vnName})</p>
               </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer Note */}
      <div className="text-center pb-12 pt-8 border-t border-slate-200 dark:border-slate-800/50">
         <div className="flex justify-center gap-6 mb-6">
              <a href="#" className="size-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm">
                <i className="fab fa-github text-xl"></i>
              </a>
              <a href="mailto:contact@aquaguard.app" className="size-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[1.4rem]">mail</span>
              </a>
         </div>
         <p className="text-sm text-slate-500 font-medium">© {new Date().getFullYear()} AquaGuard. All rights reserved.</p>
         <p className="text-xs text-slate-400 mt-2">Version 1.0.0 (Beta)</p>
      </div>

    </div>
  );
}
