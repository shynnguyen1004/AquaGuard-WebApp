import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getGoogleProvider, getFirebaseDb } from "../config/firebase";
import { normalizePhone } from "../utils/phone";
import { ROLES } from "../config/rbac";
import {
  clearAuthStorage,
  getStoredToken,
  loadRoleFromStorage,
  loadUserFromStorage,
  migrateLegacyPhoneSessionToTab,
  saveRoleToStorage,
  saveTokenToStorage,
  saveUserToStorage,
} from "../utils/authStorage";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

async function fetchUserRole(uid) {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const rawRole = snap.data().role;
      const trimmed = rawRole ? rawRole.trim().toLowerCase() : "";
      if (!trimmed) return { role: null, isNew: true };
      return { role: trimmed, isNew: false };
    }
    return { role: null, isNew: true };
  } catch (err) {
    console.warn("Could not fetch user role from Firestore:", err.message);
    return { role: null, isNew: false };
  }
}

async function createUserDoc(uid, email, displayName, role) {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      email: email || "",
      displayName: displayName || "User",
      role: role,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("Could not create user doc:", err.message);
    return false;
  }
}

async function parseJsonResponse(res) {
  const raw = await res.text();

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("The server returned an invalid response. Please try again.");
  }
}

function mapAuthRequestError(err) {
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return "The sign-in request timed out. Please try again.";
    }

    if (err.message === "Failed to fetch") {
      return "Unable to connect to the server. Please check the backend or API configuration.";
    }

    return err.message;
  }

  return "Unable to sign in right now. Please try again.";
}

/* ── provider ───────────────────────────────────────────────── */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => loadRoleFromStorage());
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState(null);

  const updateRole = (newRole) => {
    const resolved = newRole || ROLES.CITIZEN;
    setRole(resolved);
    saveRoleToStorage(resolved, "session");
  };

  // ── Restore session on mount ──
  useEffect(() => {
    migrateLegacyPhoneSessionToTab();

    // Check stored phone-auth session first
    const storedUser = loadUserFromStorage();
    const storedToken = getStoredToken();
    const storedRole = loadRoleFromStorage();

    if (storedUser && storedToken && storedUser.uid?.startsWith("phone_")) {
      // Phone-auth user — restore from localStorage
      setUser({ ...storedUser, role: storedRole });
      setToken(storedToken);
      setRole(storedRole);
      setLoading(false);
      return;
    }

    // Firebase auth session
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        const restoredUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          avatarUrl: firebaseUser.photoURL || "",
        };

        const { role: fsRole } = await fetchUserRole(firebaseUser.uid);
        const resolvedRole = fsRole || loadRoleFromStorage() || ROLES.CITIZEN;

        saveTokenToStorage(idToken, "local");
        setToken(idToken);
        restoredUser.role = resolvedRole;
        setUser(restoredUser);
        setRole(resolvedRole);
        saveRoleToStorage(resolvedRole, "local");
        saveUserToStorage(restoredUser, "local");
      } else {
        // No session at all — but don't clear phone-auth session
        const phoneUser = loadUserFromStorage();
        if (!phoneUser || !phoneUser.uid?.startsWith("phone_")) {
          clearAuthStorage();
          setToken(null);
          setUser(null);
          setRole(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Google Login ──
  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    sessionStorage.removeItem("aquaguard_role");
    localStorage.removeItem("aquaguard_role");
    setRole(null);

    try {
      const firebaseAuth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      const firebaseUser = result.user;

      const { role: firestoreRole, isNew } = await fetchUserRole(firebaseUser.uid);

      if (isNew) {
        const tempUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          avatarUrl: firebaseUser.photoURL || "",
        };
        saveTokenToStorage(idToken, "local");
        setToken(idToken);
        setUser(tempUser);
        setPendingFirebaseUser(firebaseUser);
        setNeedsRoleSelection(true);
        setLoading(false);
        return tempUser;
      }

      const resolvedRole = firestoreRole || ROLES.CITIZEN;
      const userData = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || "User",
        email: firebaseUser.email || "",
        avatarUrl: firebaseUser.photoURL || "",
        role: resolvedRole,
      };
      saveTokenToStorage(idToken, "local");
      setToken(idToken);
      setUser(userData);
      setRole(resolvedRole);
      saveRoleToStorage(resolvedRole, "local");
      saveUserToStorage(userData, "local");
      return userData;
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message);
      }
      throw err;
    } finally {
      if (!needsRoleSelection) setLoading(false);
    }
  };

  // ── Select role (from RoleSelectionModal) ──
  const selectRole = async (chosenRole) => {
    if (!user?.uid) return;
    await createUserDoc(user.uid, user.email, user.displayName, chosenRole);
    setRole(chosenRole);
    saveRoleToStorage(chosenRole, "local");
    setUser((prev) => ({ ...prev, role: chosenRole }));
    setNeedsRoleSelection(false);
    setPendingFirebaseUser(null);
  };

  // ── Phone + Password: Register ──
  const registerWithPhone = async (phone_number, password, display_name, selectedRole, role_password, gender, date_of_birth) => {
    setError(null);
    setLoading(true);
    try {
      const normalized = normalizePhone(phone_number);
      const body = { phone_number: normalized, password, display_name, role: selectedRole || "citizen", role_password };
      if (gender) body.gender = gender;
      if (date_of_birth) body.date_of_birth = date_of_birth;
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      const userData = {
        uid: data.data.user.uid,
        displayName: data.data.user.displayName,
        phoneNumber: data.data.user.phoneNumber,
        avatarUrl: data.data.user.avatarUrl || "",
        role: data.data.user.role,
      };

      saveTokenToStorage(data.data.accessToken, "session");
      setToken(data.data.accessToken);
      setUser(userData);
      updateRole(userData.role);
      saveUserToStorage(userData, "session");
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Phone + Password: Login ──
  const loginWithPhonePassword = async (phone_number, password) => {
    setError(null);
    setLoading(true);
    let timeoutId;
    try {
      const normalized = normalizePhone(phone_number);
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ phone_number: normalized, password }),
      });
      clearTimeout(timeoutId);

      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "Sign in failed");
      }

      if (!data?.data?.user || !data?.data?.accessToken) {
        throw new Error("The sign-in response was incomplete. Please try again.");
      }

      const userData = {
        uid: data.data.user.uid,
        displayName: data.data.user.displayName,
        phoneNumber: data.data.user.phoneNumber,
        avatarUrl: data.data.user.avatarUrl || "",
        role: data.data.user.role,
      };

      saveTokenToStorage(data.data.accessToken, "session");
      setToken(data.data.accessToken);
      setUser(userData);
      updateRole(userData.role);
      saveUserToStorage(userData, "session");
      return userData;
    } catch (err) {
      const message = mapAuthRequestError(err);
      setError(message);
      throw new Error(message);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // ── Logout ──
  const logout = async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // ignore
    }
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setRole(null);
    setNeedsRoleSelection(false);
    setPendingFirebaseUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user, role, token, loading, error, needsRoleSelection,
        loginWithGoogle, loginWithPhonePassword, registerWithPhone,
        selectRole, logout, clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
