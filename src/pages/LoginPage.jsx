import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { normalizePhone, isValidVNPhone } from "../utils/phone";

export default function LoginPage() {
  const { loginWithGoogle, loginWithPhonePassword, registerWithPhone, error, clearError, loading } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Phone sub-mode: "login" | "register"
  // Phone sub-mode: "login" | "register"
  const [phoneMode, setPhoneMode] = useState("login");

  // Phone auth fields
  const [phoneNumber, setPhoneNumber] = useState("+84");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState("citizen");
  const [showPassword, setShowPassword] = useState(false);
  const [rolePassword, setRolePassword] = useState("");
  const [rolePasswordError, setRolePasswordError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [requestError, setRequestError] = useState("");

  const normalizedPhone = normalizePhone(phoneNumber);
  const hasPhoneValue = phoneNumber.trim().length > 0;
  const isPhoneValid = isValidVNPhone(normalizedPhone);
  const isLoginDisabled = isSigningIn || loading || !isPhoneValid || password.length < 1;
  const isRegisterDisabled = isSigningIn || loading || !isPhoneValid || password.length < 6;

  const validatePhoneNumber = (value) => {
    if (!value.trim()) return "Please enter your phone number.";
    if (!isValidVNPhone(value)) return "Please enter a valid Vietnamese phone number.";
    return "";
  };

  const handlePhoneNumberChange = (e) => {
    const rawValue = e.target.value;
    const sanitizedValue = rawValue.replace(/[^\d+\s\-().]/g, "");

    setPhoneNumber(sanitizedValue);
    setRequestError("");
    clearError();

    if (rawValue !== sanitizedValue) {
      setPhoneError("Phone numbers can only contain digits and valid formatting characters.");
      return;
    }

    if (!sanitizedValue.trim()) {
      setPhoneError("");
      return;
    }

    if (isValidVNPhone(sanitizedValue)) {
      setPhoneError("");
      return;
    }

    setPhoneError("Please enter a valid Vietnamese phone number.");
  };

  const handlePasswordChange = (e) => {
    const nextPassword = e.target.value;
    setPassword(nextPassword);
    setRequestError("");
    clearError();

    if (!nextPassword) {
      setPasswordError("");
      return;
    }

    if (phoneMode === "register" && nextPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordError("");
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setRequestError("");
    clearError();
    try {
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    const nextPhoneError = validatePhoneNumber(phoneNumber);
    const nextPasswordError = password ? "" : "Please enter your password.";

    setPhoneError(nextPhoneError);
    setPasswordError(nextPasswordError);
    setRequestError("");
    clearError();

    if (nextPhoneError || nextPasswordError) return;

    setIsSigningIn(true);
    try {
      await loginWithPhonePassword(normalizedPhone, password);
      navigate("/", { replace: true });
    } catch (err) {
      setRequestError(err.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePhoneRegister = async (e) => {
    e.preventDefault();
    const nextPhoneError = validatePhoneNumber(phoneNumber);
    const nextPasswordError = !password
      ? "Please enter your password."
      : password.length < 6
        ? "Password must be at least 6 characters."
        : "";

    setPhoneError(nextPhoneError);
    setPasswordError(nextPasswordError);
    setRequestError("");
    clearError();

    if (nextPhoneError || nextPasswordError) return;

    // Validate role password for admin and rescuer
    if ((selectedRole === "admin" || selectedRole === "rescuer") && rolePassword !== "123456") {
      setRolePasswordError("Incorrect role password");
      return;
    }
    setRolePasswordError("");

    setIsSigningIn(true);
    try {
      await registerWithPhone(normalizedPhone, password, displayName, selectedRole);
      navigate("/", { replace: true });
    } catch (err) {
      setRequestError(err.message);
    } finally {
      setIsSigningIn(false);
    }
  };



  const switchPhoneMode = (mode) => {
    setPhoneMode(mode);
    clearError();
    setRequestError("");
    setPhoneError("");
    setPasswordError("");
    setPassword("");
    setDisplayName("");
    setRolePassword("");
    setRolePasswordError("");
    setSelectedRole("citizen");
  };

  const roles = [
    { key: "citizen", label: "Citizen", icon: "person" },
    { key: "rescuer", label: "Rescuer", icon: "local_fire_department", requiresPassword: true },
    { key: "admin", label: "Admin", icon: "admin_panel_settings", requiresPassword: true },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-dark relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Left Side — Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="max-w-lg px-12">
          <div className="p-6">
            <img alt="AquaGuard" src="/images/dark_mode_logo.png" />
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Management System
            <br />
            <span className="text-primary">for Flood Disasters</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Monitor water levels, receive early warnings, coordinate rescue
            efforts, and protect communities in real-time.
          </p>
          <div className="space-y-4">
            {[
              { icon: "map", text: "Real-time Flood Map" },
              { icon: "emergency", text: "Rapid Rescue Coordination" },
              { icon: "notifications_active", text: "24/7 Early Warnings" },
            ].map((feature) => (
              <div key={feature.icon} className="flex items-center gap-3 text-slate-300">
                <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">
                    {feature.icon}
                  </span>
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <img src="/images/dark_mode_logo.png" alt="AquaGuard" className="h-30 w-auto" />
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {phoneMode === "register" ? "Create Account" : "Welcome Back"}
              </h3>
              <p className="text-slate-400 text-sm">
                {phoneMode === "register"
                  ? "Register with your phone number"
                  : "Sign in to access the management system"}
              </p>
            </div>

            {/* Error Message */}
            {(requestError || error) && (
              <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-danger text-xl mt-0.5">error</span>
                <div>
                  <p className="text-sm text-danger font-medium">{requestError || error}</p>
                  <button
                    onClick={() => {
                      setRequestError("");
                      clearError();
                    }}
                    className="text-xs text-danger/70 hover:text-danger mt-1 underline"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* ── Phone Login / Register (Primary) ── */}
            <div>
              {/* Phone sub-mode tabs */}
              <div className="flex gap-1 mb-5">
                <button
                  onClick={() => switchPhoneMode("login")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${phoneMode === "login"
                    ? "text-primary border-b-2 border-primary"
                    : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  Login
                </button>
                <button
                  onClick={() => switchPhoneMode("register")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${phoneMode === "register"
                    ? "text-primary border-b-2 border-primary"
                    : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  Register
                </button>
              </div>

              <form
                onSubmit={phoneMode === "login" ? handlePhoneLogin : handlePhoneRegister}
                className="space-y-4"
              >
                {/* Display Name (register only) */}
                {phoneMode === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Display Name
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                        badge
                      </span>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      phone
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      onBlur={() => setPhoneError(hasPhoneValue ? validatePhoneNumber(phoneNumber) : "")}
                      placeholder="+84 xxx xxx xxx"
                      inputMode="tel"
                      autoComplete="tel"
                      aria-invalid={Boolean(phoneError)}
                      className={`w-full bg-white/5 border rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-sm ${
                        phoneError
                          ? "border-danger/60 focus:border-danger/60 focus:ring-danger/30"
                          : "border-white/10 focus:border-primary/50 focus:ring-primary/30"
                      }`}
                    />
                  </div>
                  {phoneError && (
                    <p className="mt-2 text-xs text-danger font-medium">{phoneError}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      lock
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={() => {
                        if (!password) {
                          setPasswordError(phoneMode === "login"
                            ? "Please enter your password."
                            : "Please enter your password.");
                          return;
                        }

                        if (phoneMode === "register" && password.length < 6) {
                          setPasswordError("Password must be at least 6 characters.");
                          return;
                        }

                        setPasswordError("");
                      }}
                      placeholder={phoneMode === "register" ? "Min 6 characters" : "Enter your password"}
                      aria-invalid={Boolean(passwordError)}
                      className={`w-full bg-white/5 border rounded-xl pl-11 pr-11 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-sm ${
                        passwordError
                          ? "border-danger/60 focus:border-danger/60 focus:ring-danger/30"
                          : "border-white/10 focus:border-primary/50 focus:ring-primary/30"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-2 text-xs text-danger font-medium">{passwordError}</p>
                  )}
                </div>

                {/* Forgot Password link (login only) */}
                {phoneMode === "login" && (
                  <div className="flex justify-end -mt-1">
                    <a
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </a>
                  </div>
                )}

                {/* Role Selection (register only) */}
                {phoneMode === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Role
                    </label>
                    <div className="flex gap-2">
                      {roles.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => { setSelectedRole(r.key); setRolePassword(""); setRolePasswordError(""); }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${selectedRole === r.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-300 hover:border-white/20"
                            }`}
                        >
                          <span className="material-symbols-outlined text-base">{r.icon}</span>
                          {r.label}
                        </button>
                      ))}
                    </div>

                    {/* Role Password (for admin & rescuer) */}
                    {roles.find((r) => r.key === selectedRole)?.requiresPassword && (
                      <div className="mt-3 p-3 bg-warning/5 rounded-xl border border-warning/20">
                        <label className="block text-xs font-bold text-warning mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">lock</span>
                          Role Password Required
                        </label>
                        <input
                          type="password"
                          value={rolePassword}
                          onChange={(e) => { setRolePassword(e.target.value); setRolePasswordError(""); }}
                          placeholder="Enter role password"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-warning/50 focus:ring-1 focus:ring-warning/30 transition-all"
                        />
                        {rolePasswordError && (
                          <p className="text-xs text-danger font-medium mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">error</span>
                            {rolePasswordError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={phoneMode === "login" ? isLoginDisabled : isRegisterDisabled}
                  className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningIn ? (
                    <>
                      <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>{phoneMode === "register" ? "Creating account..." : "Signing in..."}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">
                        {phoneMode === "register" ? "person_add" : "login"}
                      </span>
                      <span>{phoneMode === "register" ? "Create Account" : "Sign In"}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Switch login/register */}
              <p className="text-center text-sm text-slate-500 mt-4">
                {phoneMode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => switchPhoneMode("register")}
                      className="text-primary hover:underline font-medium"
                    >
                      Register
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => switchPhoneMode("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      Login
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* ── Google Login (Secondary) ── */}
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn || loading}
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium py-3 px-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="size-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Sign in with Google</span>
            </button>

          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-6">
            © 2026 AquaGuard Emergency System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
