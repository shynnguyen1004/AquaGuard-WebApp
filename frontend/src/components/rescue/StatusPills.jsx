import { useLanguage } from "../../contexts/LanguageContext";

const STATUS_PILL = {
  pending:     { labelKey: "sosPage.pending",    cls: "bg-warning/10 text-warning border-warning/20" },
  assigned:    { labelKey: "sosPage.assigned",   cls: "bg-primary/10 text-primary border-primary/20" },
  in_progress: { labelKey: "sosPage.inProgress", cls: "bg-primary/10 text-primary border-primary/20" },
  resolved:    { labelKey: "sosPage.resolved",   cls: "bg-safe/10 text-safe border-safe/20" },
};

const PILL_BASE = "text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap";

// Admin-assigned rows live in DB as status='assigned' but UX-wise the rescue
// hasn't started yet, so render BOTH a "Pending" pill and an "Assigned" pill.
// Every other status renders one pill.
export default function StatusPills({ status }) {
  const { t } = useLanguage();
  const keys = status === "assigned" ? ["pending", "assigned"] : [status];

  return (
    <>
      {keys.map((key) => {
        const cfg = STATUS_PILL[key] || STATUS_PILL.pending;
        return (
          <span key={key} className={`${PILL_BASE} ${cfg.cls}`}>
            {t(cfg.labelKey)}
          </span>
        );
      })}
    </>
  );
}
