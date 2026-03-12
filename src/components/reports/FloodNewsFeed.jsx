const newsItems = [
  {
    id: 1,
    source: "National Meteorologic Center",
    time: "2 hours ago",
    title: "URGENT WARNING: Flash floods, landslides in Central region",
    summary:
      "Level 2 natural disaster risk in Thua Thien Hue, Quang Nam, Quang Ngai due to continuous heavy rain for the past 48 hours.",
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=500&h=300&fit=crop",
    type: "danger",
    typeLabel: "Red Alert",
  },
  {
    id: 2,
    source: "Central Province Committee",
    time: "5 hours ago",
    title: "Urgent directive to evacuate 2,000 households in low-lying areas",
    summary:
      "Authorities requested to urgently relocate all residents in 3 deeply flooded riverside communes before 6:00 PM tonight.",
    image: "https://avaco.com.vn/data/News/ngoi-nha-cua-nhung-nguoi-di-cu-cong-ty-thiet-ke-nha-dep-ava.jpg",
    type: "warning",
    typeLabel: "Urgent Directive",
  },
  {
    id: 3,
    source: "VNExpress News",
    time: "12 hours ago",
    title: "North-South traffic cut off due to mountain landslide",
    summary:
      "Severe landslide at Hai Van pass and Highway 1A causes traffic paralysis. Rescue forces are striving to clean up.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfX6ZtBMuAEMqDV6Qj124u3ogH2-J14L6W_g&s",
    type: "info",
    typeLabel: "News",
  },
  {
    id: 4,
    source: "Health Organization (WHO VN)",
    time: "1 day ago",
    title: "Recommendations for disease prevention after floods",
    summary:
      "Guiding people to treat drinking water sources to ensure hygiene, preventing waterborne infectious diseases.",
    image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=500&h=300&fit=crop",
    type: "primary",
    typeLabel: "Health Guide",
  },
  {
    id: 5,
    source: "Tuoi Tre Newspaper",
    time: "2 days ago",
    title: "Update on hydroelectric reservoir discharge",
    summary:
      "The Central Steering Committee for Disaster Prevention issues notice on regulating flood discharge of 4 major reservoirs to ensure dam safety.",
    image: "https://baokhanhhoa.vn/file/e7837c02857c8ca30185a8c39b582c03/dataimages/201611/original/images1182686_2.jpg",
    type: "info",
    typeLabel: "News",
  },
];

const typeStyles = {
  danger: "bg-danger text-white",
  warning: "bg-warning text-white",
  info: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
  primary: "bg-primary text-white",
};

export default function FloodNewsFeed() {
  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-6 lg:p-8 shadow-sm h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">newspaper</span>
            News & Alerts
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update the latest flood information from authorities
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {newsItems.map((news) => (
          <a
            key={news.id}
            href="#"
            className="block group bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all hover:shadow-md overflow-hidden"
          >
            {news.image && (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">public</span>
                  {news.source}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${typeStyles[news.type]}`}>
                    {news.typeLabel}
                  </span>
                  <span className="text-xs text-slate-400">{news.time}</span>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                {news.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                {news.summary}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
