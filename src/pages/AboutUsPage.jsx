import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import ImageCarousel from "../components/common/ImageCarousel";

export default function AboutUsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">

      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* Vision & Mission */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            {t("aboutPage.visionMission")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Vision */}
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">visibility</span>
                {t("aboutPage.vision")}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[1.05rem]">
                {t("aboutPage.visionText")}
              </p>
            </div>

            {/* Mission */}
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">flag</span>
                {t("aboutPage.mission")}
              </h3>
              <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 leading-relaxed space-y-3 text-[1.05rem]">
                {t("aboutPage.missionPoints").map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            {/* Future */}
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">rocket_launch</span>
                {t("aboutPage.future")}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[1.05rem]">
                {t("aboutPage.futureText")}
              </p>
            </div>

          </div>
        </div>

        {/* Gallery Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            {t("aboutPage.gallery")}
          </h2>
          <ImageCarousel
            images={[
              { url: 'https://scontent.fsgn2-4.fna.fbcdn.net/v/t39.30808-6/628259397_122114044779169933_5458293276885252524_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=101&ccb=1-7&_nc_sid=13d280&_nc_ohc=ve0wEakybbQQ7kNvwEKBoC5&_nc_oc=AdmOj9UHHuXriXukYTitBU6WnO2o3DbgCSqpY08F24QNzX2OpMh7TAXHeuuVbk0CO3I-LvUCr97M5FSR1TGgTKDL&_nc_zt=23&_nc_ht=scontent.fsgn2-4.fna&_nc_gid=LsZDPWxN2cr3UlqygwNPfA&_nc_ss=8&oh=00_AfwNwVjQ4nUNvU-ixCQ1OXPQDOQOXJ3erHsp0HxqO5BhBw&oe=69B9CEA9' },
              { url: 'https://scontent.fsgn2-6.fna.fbcdn.net/v/t39.30808-6/628255462_122114039691169933_8695820490978034300_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=13d280&_nc_ohc=nDfAUJjpEXIQ7kNvwF3aZzk&_nc_oc=Adl1uvcsID9pB25gEi6plp56EF2-fRDU6UKK2nh0MTVD_KX260KjGcRPvQKDn0M4m0h3Y3MH26Py6mz17-_rvdX9&_nc_zt=23&_nc_ht=scontent.fsgn2-6.fna&_nc_gid=xFz73T-hh2t5IcsYj2SjIg&_nc_ss=8&oh=00_Afz_3nenlNzgdUTbHmhbz_zwqEMBnBSgIgS1vPvnUcoqiA&oe=69B9CACF' },
              { url: 'https://scontent.fsgn2-5.fna.fbcdn.net/v/t39.30808-6/626497518_1472419668219087_1113749333387464840_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=7b2446&_nc_ohc=3H0QElcPgx8Q7kNvwFjlXJd&_nc_oc=AdlJAk0NylO5ZIvkSo6zvnOHvbpiBLru87yt2JWhX0yQYAB4FixXFXnRe7Z-yVKfk-0j-jJev15cqtRpDSIA-n8N&_nc_zt=23&_nc_ht=scontent.fsgn2-5.fna&_nc_gid=ibP4esnxCm6zUcbyw3Ft-Q&_nc_ss=8&oh=00_AfykvpNionMNOnqR4FlbHqG1krbeXZ1vERbx4l5ZLKbISg&oe=69B9A13D' }
            ]}
          />
        </div>

        {/* Academic Supervisors Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            {t("aboutPage.academicSupervisors")}
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
                  {t("aboutPage.supervisorHangBio")}
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
                  {t("aboutPage.supervisorGiangBio")}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Advisors Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 border-b-2 border-slate-900/10 dark:border-white/10 pb-4">
            {t("aboutPage.advisor")}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {[
              { id: 1, name: "Lê Phúc Khang", role: t("aboutPage.advisor") },
              { id: 2, name: "Phan Hoàng Kiên", role: t("aboutPage.advisor") },
              { id: 3, name: "Trần Gia Kiệt", role: t("aboutPage.advisor") },
              { id: 4, name: "Lê Quốc Huy", role: t("aboutPage.advisor") },
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
            {t("aboutPage.coreTeam")}
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
                  <p className="text-slate-500 dark:text-slate-400 italic text-xs mt-1">{t("aboutPage.coreTeamMember")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
