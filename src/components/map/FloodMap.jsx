import MapPin from "./MapPin";
import MapControls from "./MapControls";
import MapLegend from "./MapLegend";

const pins = [
  {
    top: "40%",
    left: "45%",
    color: "danger",
    severity: "Severe Flooding",
    waterLevel: "+2.5m",
    rescueCount: 14,
  },
  { top: "60%", left: "55%", color: "critical" },
  { top: "30%", left: "52%", color: "warning" },
  { bottom: "20%", left: "48%", color: "safe" },
];

export default function FloodMap() {
  return (
    <div className="flex-1 relative">
      {/* Map Background */}
      <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <img
          alt="Satellite map of Vietnam coastal region"
          className="w-full h-full object-cover opacity-60 dark:opacity-40 grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuByqbaHKVUXyPrSXGLK9lWYJDPu-lwEniwjGuIAQkOlfMmybxP8ViTg5rb8nPmbDCkVoA0Fw1rm65R7j7alKa0XNgi8pWakblWxBF-HF9cLD0wirFMdY8w7DywBicyIsL1jnCsy-lM2e6lrMMg0L1ZzGDD-dmbsdSy0Jqcmzn5sXUWEuPjMcbvt5mb1n8n8QE3NO1zsSsnqCGkASqYBUhUNl0M0O3RociqgmmC9iPcf3oVNVRb4HZ3jOZKScqx_AEzebAvpGOAQnsA"
        />

        {/* Flood Zone Overlays */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-danger/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-warning/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-critical/20 rounded-full blur-3xl" />

        {/* Map Pins */}
        {pins.map((pin, index) => (
          <MapPin key={index} {...pin} />
        ))}
      </div>

      {/* Overlays */}
      <MapControls />
      <MapLegend />
    </div>
  );
}
