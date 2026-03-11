export default function EmergencySupport() {
  return (
    <div className="mt-8 p-4 bg-primary/10 rounded-2xl border border-primary/20 relative overflow-hidden">
      <div className="relative z-10">
        <h4 className="text-sm font-bold text-primary">Emergency Support</h4>
        <p className="text-[11px] text-primary/80 mt-1 leading-relaxed">
          AquaGuard AI is monitoring all incoming signals 24/7.
        </p>
        <button className="mt-3 w-full bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Request Reinforcements
        </button>
      </div>
      <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-primary/5 filled-icon">
        support_agent
      </span>
    </div>
  );
}
