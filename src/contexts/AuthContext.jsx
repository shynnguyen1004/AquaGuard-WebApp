import { createContext, useContext, useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getGoogleProvider, getFirebaseDb, sendPhoneOTP } from "../config/firebase";
import { ROLES } from "../config/rbac";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

/* ── helpers ────────────────────────────────────────────────── */

/** Persist role to localStorage so it survives page reloads. */
function saveRoleToStorage(r) {
  if (r) localStorage.setItem("aquaguard_role", r);
}

/** Read persisted role. */
function loadRoleFromStorage() {
  return localStorage.getItem("aquaguard_role") || null;
}

/** Persist user profile to localStorage so it survives page reloads. */
function saveUserToStorage(u) {
  if (u) {
    localStorage.setItem("aquaguard_user", JSON.stringify({
      uid: u.uid || "",
      displayName: u.displayName || "",
      email: u.email || "",
      avatarUrl: u.avatarUrl || u.photoURL || "",
    }));
  }
}

/** Read persisted user profile. */
function loadUserFromStorage() {
  try {
    const raw = localStorage.getItem("aquaguard_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the user's role from Firestore users/{uid}.
 * Returns { role, isNew } — isNew=true means no doc existed.
 */
async function fetchUserRole(uid) {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const rawRole = snap.data().role;
      const trimmed = rawRole ? rawRole.trim().toLowerCase() : "";
      // If role field is empty or missing, treat as new user needing selection
      if (!trimmed) return { role: null, isNew: true };
      return { role: trimmed, isNew: false };
    }

    return { role: null, isNew: true };
  } catch (err) {
    console.warn("Could not fetch user role from Firestore:", err.message);
    return { role: null, isNew: false };
  }
}

/**
 * Create a user doc in Firestore with selected role.
 */
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
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneAuthStep, setPhoneAuthStep] = useState(null); // null | 'otp_sent'
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState(null);

  /** Wrapper: always persist role changes. */
  const updateRole = (newRole) => {
    const resolved = newRole || ROLES.CITIZEN;
    setRole(resolved);
    saveRoleToStorage(resolved);
  };

  // ── Restore session on mount via Firebase onAuthStateChanged ──
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase still has a valid auth session
        const idToken = await firebaseUser.getIdToken();
        const restoredUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          avatarUrl: firebaseUser.photoURL || "",
        };

        // Try to get role from Firestore
        const { role: fsRole } = await fetchUserRole(firebaseUser.uid);
        const resolvedRole = fsRole || loadRoleFromStorage() || ROLES.CITIZEN;

        // Try backend to get/refresh token
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("aquaguard_token", data.data.accessToken);
            setToken(data.data.accessToken);
            const userData = {
              ...data.data.user,
              avatarUrl: data.data.user.avatarUrl || firebaseUser.photoURL || "",
              displayName: data.data.user.displayName || firebaseUser.displayName || "User",
              role: data.data.user.role || resolvedRole,
            };
            setUser(userData);
            updateRole(userData.role);
            saveUserToStorage(userData);
          } else {
            // Backend failed, use Firebase user directly
            localStorage.setItem("aquaguard_token", idToken);
            setToken(idToken);
            restoredUser.role = resolvedRole;
            setUser(restoredUser);
            updateRole(resolvedRole);
            saveUserToStorage(restoredUser);
          }
        } catch {
          // Backend unreachable, use Firebase user directly
          console.warn("Backend not reachable, using Firebase user info");
          localStorage.setItem("aquaguard_token", idToken);
          setToken(idToken);
          restoredUser.role = resolvedRole;
          setUser(restoredUser);
          updateRole(resolvedRole);
          saveUserToStorage(restoredUser);
        }
      } else {
        // No Firebase session — clear everything
        localStorage.removeItem("aquaguard_token");
        localStorage.removeItem("aquaguard_role");
        localStorage.removeItem("aquaguard_user");
        setToken(null);
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Login ──
  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);

    // Clear cached role so stale values don't skip the selection modal
    localStorage.removeItem("aquaguard_role");
    setRole(null);

    try {
      // Step 1: Firebase Google sign-in
      const firebaseAuth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      const firebaseUser = result.user;

      // Step 2: Check if user exists in Firestore
      const { role: firestoreRole, isNew } = await fetchUserRole(firebaseUser.uid);

      if (isNew) {
        // New user → pause login, show role selection modal
        const tempUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          avatarUrl: firebaseUser.photoURL || "",
        };
        const tempToken = idToken;
        localStorage.setItem("aquaguard_token", tempToken);
        setToken(tempToken);
        setUser(tempUser);
        setPendingFirebaseUser(firebaseUser);
        setNeedsRoleSelection(true);
        setLoading(false);
        return tempUser;
      }

      // Existing user → complete login with their role
      const resolvedRole = firestoreRole || ROLES.CITIZEN;
      return await completeLogin(firebaseUser, idToken, resolvedRole);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError(null);
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      if (!needsRoleSelection) setLoading(false);
    }
  };

  // ── Complete login after role is known ──
  const completeLogin = async (firebaseUser, idToken, resolvedRole) => {
    // Try backend API
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("aquaguard_token", data.data.accessToken);
        setToken(data.data.accessToken);
        const userData = { ...data.data.user, role: data.data.user.role || resolvedRole };
        setUser(userData);
        updateRole(userData.role);
        return userData;
      }

      if (res.status === 404) {
        const regRes = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            role: resolvedRole,
            displayName: firebaseUser.displayName,
          }),
        });

        if (regRes.ok) {
          const regData = await regRes.json();
          localStorage.setItem("aquaguard_token", regData.data.accessToken);
          setToken(regData.data.accessToken);
          const userData = { ...regData.data.user, role: regData.data.user.role || resolvedRole };
          setUser(userData);
          updateRole(userData.role);
          return userData;
        }
      }

      console.warn("Backend auth failed, using Firebase user info directly");
    } catch (fetchErr) {
      console.warn("Backend not reachable:", fetchErr.message);
    }

    // Fallback: Firebase user info only
    const fallbackUser = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || "User",
      email: firebaseUser.email || "",
      avatarUrl: firebaseUser.photoURL || "",
      role: resolvedRole,
    };
    const fallbackToken = idToken;
    localStorage.setItem("aquaguard_token", fallbackToken);
    setToken(fallbackToken);
    setUser(fallbackUser);
    updateRole(resolvedRole);
    saveUserToStorage(fallbackUser);
    return fallbackUser;
  };

  // ── Select role (called from RoleSelectionModal) ──
  const selectRole = async (chosenRole) => {
    if (!user?.uid) return;

    await createUserDoc(user.uid, user.email, user.displayName, chosenRole);
    updateRole(chosenRole);
    setUser((prev) => ({ ...prev, role: chosenRole }));
    setNeedsRoleSelection(false);
    setPendingFirebaseUser(null);
  };

  // ── Phone Login: Step 1 — Send OTP ──
  const loginWithPhone = async (phoneNumber) => {
    setError(null);
    setLoading(true);
    try {
      const result = await sendPhoneOTP(phoneNumber);
      setConfirmationResult(result);
      setPhoneAuthStep("otp_sent");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Phone Login: Step 2 — Verify OTP ──
  const verifyOTP = async (code) => {
    if (!confirmationResult) {
      setError("No OTP request found. Please request a new code.");
      throw new Error("No confirmation result");
    }

    setError(null);
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(code);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      // Same flow as Google login: check Firestore for role
      const { role: firestoreRole, isNew } = await fetchUserRole(firebaseUser.uid);

      if (isNew) {
        const tempUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.phoneNumber || "User",
          email: firebaseUser.email || "",
          phoneNumber: firebaseUser.phoneNumber || "",
          avatarUrl: firebaseUser.photoURL || "",
        };
        localStorage.setItem("aquaguard_token", idToken);
        setToken(idToken);
        setUser(tempUser);
        setPendingFirebaseUser(firebaseUser);
        setNeedsRoleSelection(true);
        setPhoneAuthStep(null);
        setConfirmationResult(null);
        setLoading(false);
        return tempUser;
      }

      const resolvedRole = firestoreRole || ROLES.CITIZEN;
      setPhoneAuthStep(null);
      setConfirmationResult(null);
      return await completeLogin(firebaseUser, idToken, resolvedRole);
    } catch (err) {
      if (err.code === "auth/invalid-verification-code") {
        setError("Invalid OTP code. Please try again.");
      } else if (err.code === "auth/code-expired") {
        setError("OTP expired. Please request a new code.");
        setPhoneAuthStep(null);
        setConfirmationResult(null);
      } else {
        setError(err.message || "OTP verification failed");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Reset phone auth state ──
  const resetPhoneAuth = () => {
    setPhoneAuthStep(null);
    setConfirmationResult(null);
    setError(null);
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
    setPhoneAuthStep(null);
    setConfirmationResult(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ user, role, token, loading, error, needsRoleSelection, phoneAuthStep, loginWithGoogle, loginWithPhone, verifyOTP, resetPhoneAuth, selectRole, logout, clearError }}
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
