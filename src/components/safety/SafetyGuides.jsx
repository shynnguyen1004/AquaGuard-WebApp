import { useState } from "react";

const guides = [
  {
    id: "before",
    title: "Before a Flood",
    urgency: "Info",
    urgencyBg: "bg-primary/15",
    urgencyText: "text-primary",
    icon: "inventory_2",
    iconBg: "bg-primary",
    points: [
      "Prepare an emergency kit (water, food, flashlight, first-aid, batteries).",
      "Identify the safest evacuation routes to higher ground.",
      "Keep important documents in a waterproof container.",
      "Move essential items, electronics, and valuables to upper floors.",
    ],
  },
  {
    id: "during",
    title: "During a Flood",
    urgency: "Critical",
    urgencyBg: "bg-danger/15",
    urgencyText: "text-danger",
    icon: "home",
    iconBg: "bg-danger",
    points: [
      "Move to higher ground immediately.",
      "Avoid walking or driving through flood waters (15cm of moving water can knock you down).",
      "Stay away from downed power lines and electrical wires.",
      "Turn off utilities at the main switches if instructed to do so.",
      "Listen to emergency broadcasts for latest updates.",
    ],
  },
  {
    id: "after",
    title: "After a Flood",
    urgency: "Medium",
    urgencyBg: "bg-warning/15",
    urgencyText: "text-warning",
    icon: "description",
    iconBg: "bg-safe",
    points: [
      "Return home only when authorities say it's safe.",
      "Wear protective clothing, including rubber boots and gloves.",
      "Document property damage with photos for insurance claims.",
      "Watch for structural damage, mold, and displaced wildlife.",
      "Do not consume tap water until it has been declared safe.",
    ],
  },
  {
    id: "evacuation",
    title: "Evacuation Guide",
    urgency: "High",
    urgencyBg: "bg-danger/15",
    urgencyText: "text-danger",
    icon: "directions_run",
    iconBg: "bg-warning",
    points: [
      "Leave immediately when advised to evacuate by local authorities.",
      "Take your emergency supply kit and essential medications.",
      "Lock your home before leaving.",
      "Follow designated evacuation routes; do not take shortcuts.",
      "If stranded, do not try to swim to safety. Wait for rescue teams.",
    ],
  },
  {
    id: "medical",
    title: "Medical Emergencies",
    urgency: "Medium",
    urgencyBg: "bg-warning/15",
    urgencyText: "text-warning",
    icon: "medical_services",
    iconBg: "bg-danger",
    points: [
      "Clean and bandage all open wounds immediately to prevent infection.",
      "Seek emergency medical attention if you suspect waterborne illness.",
      "Prevent hypothermia by removing wet clothing and staying warm.",
      "Keep a basic first-aid kit accessible at all times.",
    ],
  },
];

export default function SafetyGuides() {
  const [expandedId, setExpandedId] = useState("during"); // Default open

  const toggleGuide = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <h2 className="text-xl font-black mb-4 tracking-tight">Safety Guides</h2>
      <div className="space-y-4">
        {guides.map((guide) => (
          <div
            key={guide.id}
            className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/50 overflow-hidden transition-all duration-300"
          >
            {/* Guide Header */}
            <button
              onClick={() => toggleGuide(guide.id)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md ${guide.iconBg}`}
                >
                  <span className="material-symbols-outlined filled-icon text-2xl">
                    {guide.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                    {guide.title}
                  </h3>
                  <span
                    className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${guide.urgencyBg} ${guide.urgencyText}`}
                  >
                    {guide.urgency}
                  </span>
                </div>
              </div>
              <div
                className={`size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 transition-transform duration-300 ${
                  expandedId === guide.id ? "rotate-180" : ""
                }`}
              >
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </button>

            {/* Expandable Content */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                expandedId === guide.id
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="p-6 pt-0 ml-16">
                  <div className="h-px w-full bg-slate-100 dark:bg-slate-700/50 mb-6" />
                  <ul className="space-y-3">
                    {guide.points.map((point, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                      >
                        <span className="size-2 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
