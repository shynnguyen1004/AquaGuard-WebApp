/**
 * WebRTC helper endpoints.
 *
 * Hands the browser the ICE servers (STUN + TURN) it needs to establish a
 * peer-to-peer call. TURN credentials stay on the server (never hardcoded in
 * the frontend bundle) and are read from environment variables:
 *
 *   - Cloudflare TURN (short-lived creds minted on demand):
 *       CF_TURN_KEY_ID, CF_TURN_API_TOKEN
 *   - or a static TURN service (e.g. Metered):
 *       TURN_URLS (comma-separated), TURN_USERNAME, TURN_CREDENTIAL
 *
 * If no TURN is configured we still return a public STUN server — calls work on
 * most non-symmetric NATs, which is enough for local development.
 */
const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();

// Public STUN is free and covers the majority of home/office networks.
const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// Clients fetch this once per call; a light cap is plenty.
const iceLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: "Too many requests. Please slow down." });

// ──────────────────────────────────────────────
// GET /api/rtc/ice-servers → { success, iceServers: [...] }
// ──────────────────────────────────────────────
router.get("/ice-servers", iceLimiter, authMiddleware, async (req, res) => {
  const iceServers = [...STUN_SERVERS];

  try {
    if (process.env.CF_TURN_KEY_ID && process.env.CF_TURN_API_TOKEN) {
      // Cloudflare TURN — mint short-lived credentials for this session.
      const r = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CF_TURN_KEY_ID}/credentials/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CF_TURN_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: 86400 }), // 24h
        }
      );
      if (r.ok) {
        const data = await r.json();
        if (data.iceServers) iceServers.push(data.iceServers);
      } else {
        console.warn("[RTC] Cloudflare TURN mint failed:", r.status);
      }
    } else if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      // Static TURN service (e.g. Metered) — credentials straight from env.
      iceServers.push({
        urls: process.env.TURN_URLS.split(",").map((u) => u.trim()).filter(Boolean),
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      });
    }
  } catch (err) {
    console.warn("[RTC] Failed to build TURN credentials:", err.message);
  }

  return res.json({ success: true, iceServers });
});

module.exports = router;
