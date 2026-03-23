import { useLanguage } from "../../contexts/LanguageContext";

export default function EmergencyContacts() {
  const { t } = useLanguage();

  const contacts = [
    {
      title: t("safetyPage.police"),
      number: "113",
      icon: "local_police",
      bg: "bg-danger",
      hoverBg: "hover:bg-red-600",
    },
    {
      title: t("safetyPage.fireBrigade"),
      number: "114",
      icon: "fire_extinguisher",
      bg: "bg-danger",
      hoverBg: "hover:bg-red-600",
    },
    {
      title: t("safetyPage.ambulance"),
      number: "115",
      icon: "medical_services",
      bg: "bg-danger",
      hoverBg: "hover:bg-red-600",
    },
  ];

  return (
    <div className="mb-10">
      <h2 className="text-xl font-black mb-4 tracking-tight">
        {t("safetyPage.emergencyAssistance")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <a
            key={contact.number}
            href={`tel:${contact.number}`}
            className={`flex items-center gap-4 p-5 rounded-2xl text-white shadow-lg shadow-danger/20 transition-all hover:scale-[1.02] ${contact.bg} ${contact.hoverBg}`}
          >
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
              <span className="material-symbols-outlined filled-icon text-2xl">
                {contact.icon}
              </span>
            </div>
            <div>
              <p className="font-bold text-lg leading-none mb-1">
                {contact.title}
              </p>
              <p className="text-sm font-medium opacity-90">{contact.number}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
