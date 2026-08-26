#!/usr/bin/env node
/**
 * Dựng sân khấu để test điều phối cứu hộ tự động — không cần 5 điện thoại thật.
 *
 * Tạo một đội cứu hộ và N rescuer giả ở các khoảng cách định trước quanh một
 * toạ độ tâm, bật ca trực cho họ, rồi LIÊN TỤC bơm vị trí vào Redis để họ luôn
 * "online" (presence hash TTL 60s) — đúng như khi họ mở app thật.
 *
 *   node scripts/seed-dispatch-test.js seed      # tạo + giữ online (Ctrl+C để dừng)
 *   node scripts/seed-dispatch-test.js status    # xem điều phối đang diễn ra
 *   node scripts/seed-dispatch-test.js cleanup   # xoá sạch dữ liệu test
 *
 * Biến môi trường:
 *   SEED_LAT, SEED_LNG   toạ độ tâm (mặc định: Hải Châu, Đà Nẵng)
 *   SEED_COUNT           số rescuer (mặc định 4)
 *
 * Tất cả tài khoản tạo ra dùng mật khẩu: dispatch123
 * Số điện thoại: +84900000001, +84900000002, ...
 */

const bcrypt = require("bcrypt");
const pool = require("../db");
const { setLiveLocation, isRedisReady } = require("../redisClient");

const CENTER_LAT = Number(process.env.SEED_LAT) || 16.0678;
const CENTER_LNG = Number(process.env.SEED_LNG) || 108.2208;
const COUNT = Number(process.env.SEED_COUNT) || 4;
const PASSWORD = "dispatch123";
const PHONE_PREFIX = "+8490000000";
const TEAM_NAME = "[TEST] Đội điều phối";

// Rescuer thứ i đặt cách tâm bao nhiêu km — cố tình rải để thấy rõ thứ tự mời.
const DISTANCES_KM = [0.8, 2.5, 6.0, 12.0, 18.0, 25.0];

/** Dịch một toạ độ về phía bắc `km` kilômét (đủ chính xác cho mục đích test). */
function offsetNorth(lat, lng, km) {
  return { lat: lat + km / 111.32, lng };
}

async function seed() {
  console.log(`\n📍 Tâm: ${CENTER_LAT}, ${CENTER_LNG} — tạo ${COUNT} rescuer\n`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const rescuers = [];

  // 1. Tạo (hoặc lấy lại) từng rescuer, bật sẵn ca trực.
  for (let i = 0; i < COUNT; i++) {
    const phone = `${PHONE_PREFIX}${i + 1}`;
    const distanceKm = DISTANCES_KM[i] ?? 30 + i;
    const { rows } = await pool.query(
      `INSERT INTO users (phone_number, password_hash, display_name, role, duty_status, is_active)
       VALUES ($1, $2, $3, 'rescuer', 'on', TRUE)
       ON CONFLICT (phone_number) DO UPDATE
         SET duty_status = 'on', is_active = TRUE, role = 'rescuer'
       RETURNING id, display_name`,
      [phone, passwordHash, `[TEST] Cứu hộ ${i + 1} (${distanceKm}km)`]
    );
    const pos = offsetNorth(CENTER_LAT, CENTER_LNG, distanceKm);
    rescuers.push({ ...rows[0], phone, distanceKm, ...pos });
    console.log(`  ✓ ${rows[0].display_name}  id=${rows[0].id}  ${phone}`);
  }

  // 2. Một đội chung — ràng buộc NO_TEAM vẫn được giữ nên ai cũng phải có đội.
  // rescue_groups.name không unique → phải tự kiểm tra, nếu không mỗi lần
  // chạy lại script sẽ đẻ thêm một đội trùng tên.
  const leader = rescuers[0];
  const existing = await pool.query(
    `SELECT id FROM rescue_groups WHERE name = $1 LIMIT 1`,
    [TEAM_NAME]
  );
  let teamId = existing.rows[0]?.id;
  if (!teamId) {
    const { rows } = await pool.query(
      `INSERT INTO rescue_groups (name, description, created_by, leader_id, status)
       VALUES ($1, 'Dữ liệu test auto-dispatch', $2, $2, 'active')
       RETURNING id`,
      [TEAM_NAME, leader.id]
    );
    teamId = rows[0].id;
  }

  for (const [i, r] of rescuers.entries()) {
    await pool.query(
      `INSERT INTO rescue_group_members (group_id, user_id, member_role, join_status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (group_id, user_id) DO UPDATE SET join_status = 'active'`,
      [teamId, r.id, i === 0 ? "leader" : "member"]
    );
  }
  console.log(`\n  ✓ Đội "${TEAM_NAME}" (id=${teamId}) — ${rescuers.length} thành viên\n`);

  // 3. Vị trí. Redis là đường chính (thuật toán chỉ thấy người ONLINE ở đây);
  //    user_locations là bản dự phòng cho trường hợp chạy không có Redis.
  for (const r of rescuers) {
    await pool.query(
      `INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, updated_at = NOW()`,
      [r.id, r.lat, r.lng]
    );
  }

  if (!isRedisReady()) {
    console.log("⚠️  Redis chưa sẵn sàng — thuật toán sẽ chạy đường fallback");
    console.log("    (đọc user_locations). Vẫn test được, chỉ khác nguồn dữ liệu.\n");
    console.log(`🔑 Đăng nhập: ${PHONE_PREFIX}1 … / mật khẩu: ${PASSWORD}\n`);
    return;
  }

  // Presence hash chỉ sống 60s → phải bơm lại đều, y như app thật đang mở.
  console.log("🔄 Đang giữ các rescuer ONLINE (làm mới mỗi 20s). Ctrl+C để dừng.\n");
  console.log(`🔑 Đăng nhập: ${PHONE_PREFIX}1 … / mật khẩu: ${PASSWORD}`);
  console.log("   Giờ hãy gửi một SOS từ tài khoản citizen gần toạ độ tâm.\n");

  const pump = async () => {
    for (const r of rescuers) {
      await setLiveLocation(r.id, "rescuer", r.lat, r.lng);
    }
    process.stdout.write(`\r   ♥ presence refreshed @ ${new Date().toLocaleTimeString()}   `);
  };

  await pump();
  setInterval(pump, 20_000);
}

async function status() {
  const { rows: requests } = await pool.query(
    `SELECT id, status, dispatch_status, dispatch_attempts, dispatch_radius_km,
            urgency, location, assigned_to, created_at
     FROM rescue_requests
     WHERE created_at > NOW() - INTERVAL '2 hours'
     ORDER BY created_at DESC
     LIMIT 10`
  );

  if (requests.length === 0) {
    console.log("\nKhông có yêu cầu nào trong 2 giờ qua.\n");
    return;
  }

  for (const r of requests) {
    console.log(
      `\n📋 SOS #${r.id} · ${r.urgency} · ${r.location}` +
        `\n   status=${r.status}  dispatch=${r.dispatch_status}` +
        `  lượt=${r.dispatch_attempts}  bán kính=${r.dispatch_radius_km || "—"}km` +
        `  assigned_to=${r.assigned_to || "—"}`
    );

    const { rows: offers } = await pool.query(
      `SELECT o.attempt, o.status, o.distance_km, o.score, o.created_at, o.responded_at,
              u.display_name
       FROM rescue_dispatch_offers o
       LEFT JOIN users u ON u.id = o.rescuer_id
       WHERE o.request_id = $1
       ORDER BY o.attempt ASC`,
      [r.id]
    );

    const LABELS = {
      auto_assigned: "ĐANG GIAO",
      released: "bỏ ca",
      reassigned: "watchdog thu hồi",
      superseded: "bị đè",
      completed: "hoàn tất",
    };
    for (const o of offers) {
      const age = Math.round((Date.now() - new Date(o.created_at)) / 1000);
      console.log(
        `     lượt ${o.attempt}: ${o.display_name} · ${Number(o.distance_km).toFixed(2)}km · ` +
          `điểm ${o.score} → ${LABELS[o.status] || o.status} (${age}s trước)`
      );
    }
    if (offers.length === 0) console.log("     (chưa giao cho ai)");
  }
  console.log();
}

async function cleanup() {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE phone_number LIKE $1`,
    [`${PHONE_PREFIX}%`]
  );
  const ids = rows.map((r) => r.id);

  if (ids.length === 0) {
    console.log("\nKhông có dữ liệu test để xoá.\n");
    return;
  }

  // Gỡ khỏi các request trước, vì assigned_to là ON DELETE SET NULL nhưng ta
  // muốn chúng quay lại pending chứ không mắc kẹt ở in_progress không người.
  await pool.query(
    `UPDATE rescue_requests
     SET status = 'pending', assigned_to = NULL, assigned_group_id = NULL,
         dispatch_status = 'none', dispatch_attempts = 0
     WHERE assigned_to = ANY($1::int[])`,
    [ids]
  );
  await pool.query(`DELETE FROM rescue_groups WHERE name = $1`, [TEAM_NAME]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);

  console.log(`\n🧹 Đã xoá ${ids.length} tài khoản test và đội "${TEAM_NAME}".\n`);
}

const COMMANDS = { seed, status, cleanup };

(async () => {
  const cmd = process.argv[2] || "seed";
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error(`Lệnh không hợp lệ: ${cmd}. Dùng: ${Object.keys(COMMANDS).join(" | ")}`);
    process.exit(1);
  }
  try {
    await fn();
    // `seed` chạy mãi (setInterval giữ presence); hai lệnh kia thì thoát luôn.
    if (cmd !== "seed") process.exit(0);
  } catch (err) {
    console.error("Lỗi:", err.message);
    process.exit(1);
  }
})();
