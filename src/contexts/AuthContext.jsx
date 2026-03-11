import { createContext, useContext, useState, useEffect } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "../config/firebase";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("aquaguard_token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem("aquaguard_token");
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.data.user);
          setToken(savedToken);
        } else {
          // Token expired or invalid
          localStorage.removeItem("aquaguard_token");
          setToken(null);
        }
      } catch {
        // Backend not reachable — keep token, try again later
        console.warn("Backend not reachable, keeping saved session");
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);

    try {
      // Step 1: Firebase Google sign-in popup
      const firebaseAuth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      const firebaseUser = result.user;

      // Step 2: Try sending idToken to backend
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
          setUser(data.data.user);
          return data.data.user;
        }

        // If user not found (404), try register
        if (res.status === 404) {
          const regRes = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken,
              role: "citizen",
              displayName: firebaseUser.displayName,
            }),
          });

          if (regRes.ok) {
            const regData = await regRes.json();
            localStorage.setItem("aquaguard_token", regData.data.accessToken);
            setToken(regData.data.accessToken);
            setUser(regData.data.user);
            return regData.data.user;
          }
        }

        // Backend returned an error — fall through to fallback
        console.warn("Backend auth failed, using Firebase user info directly");
      } catch (fetchErr) {
        // Network error (backend not running) — fall through to fallback
        console.warn("Backend not reachable:", fetchErr.message);
      }

      // Fallback: Use Firebase user info directly
      const fallbackUser = {
        displayName: firebaseUser.displayName || "User",
        email: firebaseUser.email || "",
        avatarUrl: firebaseUser.photoURL || "",
        role: "citizen",
      };
      const fallbackToken = idToken;
      localStorage.setItem("aquaguard_token", fallbackToken);
      setToken(fallbackToken);
      setUser(fallbackUser);
      return fallbackUser;
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError(null); // User cancelled, not an error
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // Firebase sign out may fail if not initialized — ignore
    }
    localStorage.removeItem("aquaguard_token");
    setToken(null);
    setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, error, loginWithGoogle, logout, clearError }}
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
