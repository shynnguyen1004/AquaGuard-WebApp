/**
 * WebRTC helper API. Theo pattern services/api.js.
 */
import { api } from "./api";

const STUN_FALLBACK = [{ urls: "stun:stun.l.google.com:19302" }];

/**
 * Fetch ICE servers (STUN + TURN) from the backend for `new RTCPeerConnection`.
 * TURN credentials are minted/stored server-side. Falls back to public STUN so a
 * call can still connect on friendly networks even if the request fails.
 * @returns {Promise<RTCIceServer[]>}
 */
export async function getIceServers() {
  try {
    const res = await api.get("/rtc/ice-servers");
    if (Array.isArray(res?.iceServers) && res.iceServers.length) return res.iceServers;
  } catch (err) {
    console.warn("[RTC] getIceServers failed, using STUN fallback:", err.message);
  }
  return STUN_FALLBACK;
}
