const TOUR_KEY_PREFIX = "aquaguard_tour_completed_";

function keyFor(uid) {
  return `${TOUR_KEY_PREFIX}${uid || "anonymous"}`;
}

export function isTourCompleted(uid) {
  if (!uid) return false;
  return localStorage.getItem(keyFor(uid)) === "true";
}

export function markTourCompleted(uid) {
  if (!uid) return;
  localStorage.setItem(keyFor(uid), "true");
}

export function resetTour(uid) {
  if (!uid) return;
  localStorage.removeItem(keyFor(uid));
}
