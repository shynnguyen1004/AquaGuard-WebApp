import { useAuth } from "../../contexts/AuthContext";

const statusConfig = {
  danger: {
    label: "Danger",
    gradient: "from-red-500 to-red-600",
    bgAccent: "bg-red-400/30",
    weatherIcon: "thunderstorm",
    actionText: "Take action immediately",
    iconPulse: true,
  },
  warning: {
    label: "Warning",
    gradient: "from-amber-500 to-orange-500",
    bgAccent: "bg-amber-400/30",
    weatherIcon: "rainy",
    actionText: "Stay alert and monitor updates",
    iconPulse: false,
  },
  safe: {
    label: "Safe",
    gradient: "from-emerald-500 to-teal-500",
    bgAccent: "bg-emerald-400/30",
    weatherIcon: "partly_cloudy_day",
    actionText: "No immediate threats detected",
    iconPulse: false,
  },
};

export default function StatusCard({ status = "danger" }) {
  const { user } = useAuth();
  const config = statusConfig[status] || statusConfig.danger;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-6 lg:p-8 text-white shadow-xl`}
    >
      {/* Background decorative elements */}
      <div
        className={`absolute -top-10 -right-10 size-40 ${config.bgAccent} rounded-full blur-2xl`}
      />
      <div
        className={`absolute -bottom-8 -left-8 size-32 ${config.bgAccent} rounded-full blur-2xl`}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          {/* Status label */}
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined filled-icon text-base">
              warning
            </span>
            <span className="text-xs font-bold uppercase tracking-widest opacity-90">
              Current Status
            </span>
          </div>

          {/* Status name */}
          <h2 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight">
            {config.label}
          </h2>

          {/* Location */}
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>
            <span className="text-sm font-medium">
              Ho Chi Minh city University of Technology, Dien Hong Ward
            </span>
          </div>

          {/* Action text */}
          <p className="text-sm font-semibold opacity-80 mt-3 flex items-center gap-2">
            <span
              className={`size-2 rounded-full bg-white ${config.iconPulse ? "animate-pulse" : ""}`}
            />
            {config.actionText}
          </p>
        </div>

        {/* Weather Icon */}
        <div className="flex-shrink-0 ml-4">
          <div
            className={`size-20 lg:size-24 rounded-2xl ${config.bgAccent} backdrop-blur-sm flex items-center justify-center`}
          >
            <span className="material-symbols-outlined filled-icon text-5xl lg:text-6xl opacity-80">
              {config.weatherIcon}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
