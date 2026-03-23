import { createContext, useContext, useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getGoogleProvider, getFirebaseDb } from "../config/firebase";
import { ROLES } from "../config/rbac";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

/* ── helpers ────────────────────────────────────────────────── */

function saveRoleToStorage(r) {
  if (r) localStorage.setItem("aquaguard_role", r);
}

function loadRoleFromStorage() {
  return localStorage.getItem("aquaguard_role") || null;
}

function saveUserToStorage(u) {
  if (u) {
    localStorage.setItem("aquaguard_user", JSON.stringify({
      uid: u.uid || "",
      displayName: u.displayName || "",
      email: u.email || "",
      phoneNumber: u.phoneNumber || "",
      avatarUrl: u.avatarUrl || u.photoURL || "",
    }));
  }
}

function loadUserFromStorage() {
  try {
    const raw = localStorage.getItem("aquaguard_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

/* ── provider ───────────────────────────────────────────────── */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => loadRoleFromStorage());
  const [token, setToken] = useState(() => localStorage.getItem("aquaguard_token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState(null);

  const updateRole = (newRole) => {
    const resolved = newRole || ROLES.CITIZEN;
    setRole(resolved);
    saveRoleToStorage(resolved);
  };

  // ── Restore session on mount ──
  useEffect(() => {
    // Check localStorage for phone-auth session first
    const storedUser = loadUserFromStorage();
    const storedToken = localStorage.getItem("aquaguard_token");
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

        localStorage.setItem("aquaguard_token", idToken);
        setToken(idToken);
        restoredUser.role = resolvedRole;
        setUser(restoredUser);
        updateRole(resolvedRole);
        saveUserToStorage(restoredUser);
      } else {
        // No session at all — but don't clear phone-auth session
        const phoneUser = loadUserFromStorage();
        if (!phoneUser || !phoneUser.uid?.startsWith("phone_")) {
          localStorage.removeItem("aquaguard_token");
          localStorage.removeItem("aquaguard_role");
          localStorage.removeItem("aquaguard_user");
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
        localStorage.setItem("aquaguard_token", idToken);
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
      localStorage.setItem("aquaguard_token", idToken);
      setToken(idToken);
      setUser(userData);
      updateRole(resolvedRole);
      saveUserToStorage(userData);
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
    updateRole(chosenRole);
    setUser((prev) => ({ ...prev, role: chosenRole }));
    setNeedsRoleSelection(false);
    setPendingFirebaseUser(null);
  };

  // ── Phone + Password: Register ──
  const registerWithPhone = async (phone_number, password, display_name, selectedRole) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number, password, display_name, role: selectedRole || "citizen" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Đăng ký thất bại");
      }

      const userData = {
        uid: data.data.user.uid,
        displayName: data.data.user.displayName,
        phoneNumber: data.data.user.phoneNumber,
        avatarUrl: data.data.user.avatarUrl || "",
        role: data.data.user.role,
      };

      localStorage.setItem("aquaguard_token", data.data.accessToken);
      setToken(data.data.accessToken);
      setUser(userData);
      updateRole(userData.role);
      saveUserToStorage(userData);
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
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Đăng nhập thất bại");
      }

      const userData = {
        uid: data.data.user.uid,
        displayName: data.data.user.displayName,
        phoneNumber: data.data.user.phoneNumber,
        avatarUrl: data.data.user.avatarUrl || "",
        role: data.data.user.role,
      };

      localStorage.setItem("aquaguard_token", data.data.accessToken);
      setToken(data.data.accessToken);
      setUser(userData);
      updateRole(userData.role);
      saveUserToStorage(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
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
    localStorage.removeItem("aquaguard_token");
    localStorage.removeItem("aquaguard_role");
    localStorage.removeItem("aquaguard_user");
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
