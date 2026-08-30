const TOKEN_KEY = "aquaguard_token";
const ROLE_KEY = "aquaguard_role";
const USER_KEY = "aquaguard_user";

function getStorage(type = "session") {
  return type === "local" ? localStorage : sessionStorage;
}

function clearKeyAcrossStorages(key) {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

export function saveRoleToStorage(role, type = "session") {
  if (!role) return;
  clearKeyAcrossStorages(ROLE_KEY);
  getStorage(type).setItem(ROLE_KEY, role);
}

export function loadRoleFromStorage() {
  return sessionStorage.getItem(ROLE_KEY) || localStorage.getItem(ROLE_KEY) || null;
}

export function saveUserToStorage(user, type = "session") {
  if (!user) return;
  clearKeyAcrossStorages(USER_KEY);
  getStorage(type).setItem(
    USER_KEY,
    JSON.stringify({
      uid: user.uid || "",
      displayName: user.displayName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      avatarUrl: user.avatarUrl || user.photoURL || "",
    })
  );
}

export function loadUserFromStorage() {
  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTokenToStorage(token, type = "session") {
  if (!token) return;
  clearKeyAcrossStorages(TOKEN_KEY);
  getStorage(type).setItem(TOKEN_KEY, token);
}

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
}

export function clearAuthStorage() {
  clearKeyAcrossStorages(TOKEN_KEY);
  clearKeyAcrossStorages(ROLE_KEY);
  clearKeyAcrossStorages(USER_KEY);
}

/** One-time migration: move phone-auth sessions from tab-scoped to persistent storage. */
export function migratePhoneSessionToPersistent() {
  const sessionUser = sessionStorage.getItem(USER_KEY);
  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  if (!sessionUser || !sessionToken) return;

  try {
    const parsedUser = JSON.parse(sessionUser);
    if (!parsedUser?.uid?.startsWith("phone_")) return;

    const sessionRole = sessionStorage.getItem(ROLE_KEY);
    localStorage.setItem(USER_KEY, sessionUser);
    localStorage.setItem(TOKEN_KEY, sessionToken);
    if (sessionRole) localStorage.setItem(ROLE_KEY, sessionRole);

    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  } catch {
    // ignore invalid legacy session data
  }
}
