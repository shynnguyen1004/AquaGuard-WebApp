import { useLanguage } from "../../contexts/LanguageContext";
import AlertCard from "./AlertCard";

export default function ActiveAlerts() {
  const { t } = useLanguage();

  const alerts = [
    {
      icon: "tsunami",
      iconColor: "danger",
      title: t("activeAlerts.heavyRainfall"),
      description: t("activeAlerts.heavyRainfallDesc"),
      status: t("activeAlerts.urgent"),
      statusColor: "danger",
    },
    {
      icon: "waves",
      iconColor: "warning",
      title: t("activeAlerts.riverRising"),
      description: t("activeAlerts.riverRisingDesc"),
      status: t("activeAlerts.monitoring"),
      statusColor: "warning",
    },
    {
      icon: "thunderstorm",
      iconColor: "primary",
      title: t("activeAlerts.powerOutage"),
      description: t("activeAlerts.powerOutageDesc"),
      status: t("activeAlerts.advisory"),
      statusColor: "primary",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{t("activeAlerts.title")}</h2>
        <span className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold px-2 py-1 rounded">
          {t("activeAlerts.live")}
        </span>
      </div>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <AlertCard key={alert.icon} {...alert} />
        ))}
      </div>
    </div>
  );
}
