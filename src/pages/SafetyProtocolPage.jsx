import EmergencyContacts from "../components/safety/EmergencyContacts";
import SafetyGuides from "../components/safety/SafetyGuides";

export default function SafetyProtocolPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
            Safety Protocols
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Emergency contact information and safety guide for flood disasters.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10">
          <EmergencyContacts />
          <SafetyGuides />
        </div>
      </div>
    </div>
  );
}
