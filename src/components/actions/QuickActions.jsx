const actions = [
  {
    icon: "sos",
    label: "SOS",
    subtitle: "Direct Emergency Contact",
    bg: "bg-danger",
    shadow: "shadow-danger/20",
  },
  {
    icon: "home_pin",
    label: "Find Shelter",
    subtitle: "Navigate to Nearest Safety",
    bg: "bg-primary",
    shadow: "shadow-primary/20",
  },
  {
    icon: "family_restroom",
    label: "Family Check",
    subtitle: "Contact Registered Members",
    bg: "bg-warning",
    shadow: "shadow-warning/20",
  },
];

export default function QuickActions({ hideTitle = false }) {
  return (
    <div className={hideTitle ? "px-6 pb-4" : "p-6"}>
      {!hideTitle && <h2 className="text-lg font-bold mb-4">Quick Actions</h2>}
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className={`flex items-center gap-3 w-full ${action.bg} text-white p-4 rounded-xl hover:opacity-90 transition-all shadow-lg ${action.shadow} group`}
          >
            <span className="material-symbols-outlined filled-icon p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
              {action.icon}
            </span>
            <div className="text-left">
              <p className="font-bold leading-none">{action.label}</p>
              <p className="text-[10px] opacity-80 mt-1">{action.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
