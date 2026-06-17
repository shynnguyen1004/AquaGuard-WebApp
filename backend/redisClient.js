const Redis = require("ioredis");
require("dotenv").config();

/**
 * Shared Redis client — the HOT store for continuous live GPS tracking.
 *
 * Import this everywhere; never create a second client (mirrors db.js).
 * Live positions live here (TTL-based presence); PostgreSQL user_locations
 * only keeps the first/last position of a tracking session.
 *
 * Degrades gracefully: if REDIS_URL is unset or the connection fails,
 * `isRedisReady()` returns false and callers fall back to Postgres.
 */

const REDIS_URL = process.env.REDIS_URL;
const LIVE_TTL_SECONDS = 60; // a key present == user "online & fresh"

let client = null;
let ready = false;

if (REDIS_URL) {
  client = new Redis(REDIS_URL, {
    // Upstash and other cloud providers use rediss:// (TLS) — ioredis handles
    // that from the scheme. Keep retries bounded so a dead Redis never blocks.
    maxRetriesPerRequest: 2,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });

  client.on("ready", () => {
    ready = true;
    console.log("✅ Redis connected — live location store");
  });
  client.on("error", (err) => {
    ready = false;
    console.warn("⚠️  Redis error:", err.message);
  });
  client.on("end", () => {
    ready = false;
  });
} else {
  console.warn(
    "⚠️  REDIS_URL not set — live tracking falls back to PostgreSQL user_locations"
  );
}

function isRedisReady() {
  return ready && client !== null;
}

const locKey = (userId) => `live:loc:${userId}`;
const geoKey = (role) => `live:geo:${role}`;

/**
 * Write a user's live position to Redis (hot store).
 * Sets a hash + TTL (presence) and adds to a per-role GEO set for nearest queries.
 */
async function setLiveLocation(userId, role, latitude, longitude) {
  if (!isRedisReady()) return false;
  try {
    const ts = Date.now();
    const pipeline = client.multi();
    pipeline.hset(locKey(userId), {
      lat: latitude,
      lng: longitude,
      role: role || "",
      ts,
    });
    pipeline.expire(locKey(userId), LIVE_TTL_SECONDS);
    if (role) {
      // GEOADD key longitude latitude member
      pipeline.geoadd(geoKey(role), longitude, latitude, String(userId));
    }
    await pipeline.exec();
    return true;
  } catch (err) {
    console.warn("[Redis] setLiveLocation failed:", err.message);
    return false;
  }
}

/** Read one user's live position, or null if absent/expired. */
async function getLiveLocation(userId) {
  if (!isRedisReady()) return null;
  try {
    const data = await client.hgetall(locKey(userId));
    if (!data || !data.lat || !data.lng) return null;
    return {
      userId: Number(userId),
      role: data.role || null,
      lat: Number(data.lat),
      lng: Number(data.lng),
      ts: Number(data.ts) || null,
      online: true,
    };
  } catch (err) {
    console.warn("[Redis] getLiveLocation failed:", err.message);
    return null;
  }
}

/** Read many users' live positions at once. Returns a Map<userId, location>. */
async function getLiveLocations(userIds = []) {
  const result = new Map();
  if (!isRedisReady() || userIds.length === 0) return result;
  try {
    const pipeline = client.multi();
    userIds.forEach((id) => pipeline.hgetall(locKey(id)));
    const rows = await pipeline.exec();
    rows.forEach(([err, data], i) => {
      if (err || !data || !data.lat || !data.lng) return;
      const userId = Number(userIds[i]);
      result.set(userId, {
        userId,
        role: data.role || null,
        lat: Number(data.lat),
        lng: Number(data.lng),
        ts: Number(data.ts) || null,
        online: true,
      });
    });
    return result;
  } catch (err) {
    console.warn("[Redis] getLiveLocations failed:", err.message);
    return result;
  }
}

/** All currently-online users of a role (members whose hash hasn't expired). */
async function getOnlineLocations(role) {
  if (!isRedisReady()) return [];
  try {
    const members = await client.zrange(geoKey(role), 0, -1);
    if (!members.length) return [];
    const map = await getLiveLocations(members);
    return Array.from(map.values());
  } catch (err) {
    console.warn("[Redis] getOnlineLocations failed:", err.message);
    return [];
  }
}

/** Remove a user's presence (on disconnect). */
async function removeLivePresence(userId, role) {
  if (!isRedisReady()) return;
  try {
    const pipeline = client.multi();
    pipeline.del(locKey(userId));
    if (role) pipeline.zrem(geoKey(role), String(userId));
    await pipeline.exec();
  } catch (err) {
    console.warn("[Redis] removeLivePresence failed:", err.message);
  }
}

/**
 * Find online users of a role within `radiusKm` of a point, nearest first.
 * Returns [{ userId, lat, lng, distanceKm }].
 */
async function nearbyUsers(role, latitude, longitude, radiusKm = 10) {
  if (!isRedisReady()) return [];
  try {
    // GEOSEARCH gives ordered members + distance. The GEO-decoded coords are
    // lossy (~0.6m geohash error), so we take the EXACT lat/lng from each
    // user's hash instead. This also filters out stale members whose presence
    // hash has expired (offline), keeping results consistent with /live.
    const rows = await client.geosearch(
      geoKey(role),
      "FROMLONLAT",
      longitude,
      latitude,
      "BYRADIUS",
      radiusKm,
      "km",
      "ASC",
      "WITHDIST"
    );
    if (!rows.length) return [];

    const ids = rows.map((row) => row[0]);
    const live = await getLiveLocations(ids);

    return rows
      .map((row) => {
        const [member, distance] = row;
        const loc = live.get(Number(member));
        if (!loc) return null; // stale geo member, hash expired → skip
        return {
          userId: Number(member),
          distanceKm: Number(distance),
          lat: loc.lat,
          lng: loc.lng,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn("[Redis] nearbyUsers failed:", err.message);
    return [];
  }
}

module.exports = {
  client,
  isRedisReady,
  setLiveLocation,
  getLiveLocation,
  getLiveLocations,
  getOnlineLocations,
  removeLivePresence,
  nearbyUsers,
  LIVE_TTL_SECONDS,
};
