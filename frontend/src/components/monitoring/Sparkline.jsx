import { useMemo } from "react";

/**
 * Đường biểu diễn gọn của chuỗi số đo gần đây (SVG nội tuyến, không thư viện).
 *
 * Dùng chung cho cả thiết bị mô phỏng (SensorPanel) lẫn cảm biến mực nước thật
 * (WaterSensorCard) để hai loại thẻ trông cùng một ngôn ngữ hình ảnh.
 *
 * `domain` = [min, max] cố định — cảm biến thật luôn là thang 0-100% nên vẽ
 * theo thang tuyệt đối mới so sánh được giữa các thiết bị; bỏ trống thì tự co
 * giãn theo dữ liệu (hợp với thiết bị mô phỏng, mỗi loại một đơn vị).
 */
export default function Sparkline({ values, color, domain }) {
  const { path, area } = useMemo(() => {
    const w = 100;
    const h = 28;
    if (!values || values.length < 2) return { path: "", area: "" };

    const min = domain ? domain[0] : Math.min(...values);
    const max = domain ? domain[1] : Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return [x, y];
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    return { path: line, area: `${line} L${w},${h} L0,${h} Z` };
  }, [values, domain]);

  if (!path) return <div className="h-8" />;

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-8">
      <path d={area} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
