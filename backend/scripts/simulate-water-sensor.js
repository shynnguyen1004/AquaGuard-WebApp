#!/usr/bin/env node
/**
 * Giả lập một board ESP32 cảm biến mực nước — để test đường ống web mà không
 * cần cắm phần cứng.
 *
 *   node scripts/simulate-water-sensor.js <device_key> [kịch_bản]
 *
 * Kịch bản:
 *   flood   (mặc định)  nước dâng dần 0 → 95% rồi rút — chạm ngưỡng cảnh báo
 *   dry                 giữ mức khô, chỉ để xem thiết bị "online"
 *   random              dao động ngẫu nhiên quanh 40%
 *
 * Biến môi trường:
 *   API_URL      mặc định http://localhost:5001/api/sensors/ingest
 *   PERIOD_MS    nhịp gửi, mặc định 3000 (nhanh hơn board thật cho dễ xem)
 *
 * Device key lấy từ web: Dashboard → thẻ Cảm biến mực nước → Thêm cảm biến.
 */

const API_URL = process.env.API_URL || "http://localhost:5001/api/sensors/ingest";
const PERIOD_MS = Number(process.env.PERIOD_MS) || 3000;

const deviceKey = process.argv[2];
const scenario = process.argv[3] || "flood";

if (!deviceKey) {
  console.error("Thiếu device key.\n  node scripts/simulate-water-sensor.js <device_key> [flood|dry|random]");
  process.exit(1);
}

// Bảng hiệu chuẩn 5 điểm giống calibrate.py sinh ra trên board thật.
const CALIB = [[0, 0], [25, 9100], [50, 18400], [75, 27600], [100, 39000]];

/** Nghịch đảo của to_percent(): từ % mong muốn dựng ra giá trị raw hợp lý. */
function percentToRaw(pct) {
  const p = Math.max(0, Math.min(100, pct));
  for (let i = 1; i < CALIB.length; i += 1) {
    const [p0, r0] = CALIB[i - 1];
    const [p1, r1] = CALIB[i];
    if (p <= p1) {
      const raw = r0 + ((p - p0) * (r1 - r0)) / (p1 - p0);
      // Nhiễu ±80 cho giống ADC thật
      return Math.max(0, Math.round(raw + (Math.random() - 0.5) * 160));
    }
  }
  return CALIB[CALIB.length - 1][1];
}

let tick = 0;
function nextPercent() {
  switch (scenario) {
    case "dry":
      return Math.random() * 1.5;
    case "random":
      return 40 + Math.sin(tick / 3) * 12 + (Math.random() - 0.5) * 4;
    case "flood":
    default: {
      // Lên 0→95% trong 40 nhịp, giữ đỉnh 10 nhịp, rồi rút về 0 trong 30 nhịp.
      const t = tick % 80;
      if (t < 40) return (t / 40) * 95;
      if (t < 50) return 95;
      return Math.max(0, 95 - ((t - 50) / 30) * 95);
    }
  }
}

function bar(pct) {
  const filled = Math.round((pct * 24) / 100);
  return "█".repeat(filled) + "·".repeat(24 - filled);
}

async function send() {
  const pct = nextPercent();
  const raw = percentToRaw(pct);
  const body = {
    raw,
    percent: Math.round(pct),
    voltage_mv: Math.round((raw * 3100) / 65535),
    // Board thật chỉ gửi calibration ở lần đầu — làm y hệt.
    ...(tick === 0 ? { calibration: CALIB } : {}),
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Key": deviceKey },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(`✗ ${res.status} — ${json.message || "lỗi"}`);
      if (res.status === 401) process.exit(1);   // key sai thì thử lại vô ích
    } else {
      const d = json.data || {};
      console.log(
        `raw=${String(raw).padEnd(6)} ${String(d.percent).padStart(3)}%  ` +
        `mức ${d.level}  ${bar(d.percent)}` +
        `${d.stored ? "  [đã ghi]" : ""}${d.alert ? "  ⚠ CẢNH BÁO" : ""}`
      );
    }
  } catch (err) {
    console.error("✗ không gọi được API:", err.message);
  }
  tick += 1;
}

console.log(`Giả lập cảm biến → ${API_URL}`);
console.log(`Kịch bản: ${scenario}, nhịp ${PERIOD_MS}ms. Ctrl-C để dừng.\n`);
send();
setInterval(send, PERIOD_MS);
