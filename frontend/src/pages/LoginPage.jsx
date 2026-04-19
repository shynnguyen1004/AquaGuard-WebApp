import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { normalizePhone, isValidVNPhone } from "../utils/phone";

export default function LoginPage() {
  const { loginWithGoogle, loginWithPhonePassword, registerWithPhone, error, clearError, loading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);

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
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const normalizedPhone = normalizePhone(phoneNumber);
  const hasPhoneValue = phoneNumber.trim().length > 0;
  const isPhoneValid = isValidVNPhone(normalizedPhone);
  const isLoginDisabled = isSigningIn || loading || !isPhoneValid || password.length < 1;
  const isRegisterDisabled = isSigningIn || loading || !isPhoneValid || password.length < 6;

  const validatePhoneNumber = (value) => {
    if (!value.trim()) return t("loginPage.phoneRequired");
    if (!isValidVNPhone(value)) return t("loginPage.phoneInvalid");
    return "";
  };

  const handlePhoneNumberChange = (e) => {
    const rawValue = e.target.value;
    const sanitizedValue = rawValue.replace(/[^\d+\s\-().]/g, "");

    setPhoneNumber(sanitizedValue);
    setRequestError("");
    clearError();

    if (rawValue !== sanitizedValue) {
      setPhoneError(t("loginPage.phoneInvalidChars"));
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

    setPhoneError(t("loginPage.phoneInvalid"));
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
      setPasswordError(t("loginPage.passwordTooShort"));
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
    const nextPasswordError = password ? "" : t("loginPage.passwordRequired");

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
      ? t("loginPage.passwordRequired")
      : password.length < 6
        ? t("loginPage.passwordTooShort")
        : "";

    setPhoneError(nextPhoneError);
    setPasswordError(nextPasswordError);
    setRequestError("");
    clearError();

    if (nextPhoneError || nextPasswordError) return;

    // Validate gender and date of birth
    if (!gender) {
      setRequestError(t("loginPage.genderRequired"));
      return;
    }
    if (!dateOfBirth) {
      setRequestError(t("loginPage.dobRequired"));
      return;
    }

    // Role password will be validated by the backend
    setRolePasswordError("");

    setIsSigningIn(true);
    try {
      await registerWithPhone(normalizedPhone, password, displayName, selectedRole, rolePassword, gender, dateOfBirth);
      navigate("/", { replace: true });
    } catch (err) {
      // Show role password error from backend in the right field
      if (err.message?.toLowerCase().includes("role password")) {
        setRolePasswordError(err.message);
      } else {
        setRequestError(err.message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };



  const switchPhoneMode = (mode) => {
    setPhoneMode(mode);
    setRegisterStep(1);
    clearError();
    setRequestError("");
    setPhoneError("");
    setPasswordError("");
    setPassword("");
    setDisplayName("");
    setRolePassword("");
    setRolePasswordError("");
    setSelectedRole("citizen");
    setGender("");
    setDateOfBirth("");
  };

  // Step validation for multi-step register
  const canProceedStep1 = isPhoneValid && password.length >= 6 && !phoneError && !passwordError;
  const canProceedStep2 = gender !== "" && dateOfBirth !== "";

  const handleNextStep = () => {
    if (registerStep === 1) {
      // Validate step 1 fields
      const nextPhoneError = validatePhoneNumber(phoneNumber);
      const nextPasswordError = !password
        ? t("loginPage.passwordRequired")
        : password.length < 6
          ? t("loginPage.passwordTooShort")
          : "";
      setPhoneError(nextPhoneError);
      setPasswordError(nextPasswordError);
      if (nextPhoneError || nextPasswordError) return;
      setRegisterStep(2);
    } else if (registerStep === 2) {
      // Validate step 2 fields
      if (!gender) {
        setRequestError(t("loginPage.genderRequired"));
        return;
      }
      if (!dateOfBirth) {
        setRequestError(t("loginPage.dobRequired"));
        return;
      }
      setRequestError("");
      setRegisterStep(3);
    }
  };

  const handlePrevStep = () => {
    setRequestError("");
    clearError();
    setRegisterStep((s) => Math.max(1, s - 1));
  };

  const roles = [
    { key: "citizen", label: t("loginPage.citizen"), icon: "person" },
    { key: "rescuer", label: t("loginPage.rescuer"), icon: "local_fire_department", requiresPassword: true },
  ];

  const toggleLanguage = () => {
    setLanguage(language === "vi" ? "en" : "vi");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-dark relative">
      {/* Language Toggle Button — top right */}
      <button
        onClick={toggleLanguage}
        className="absolute top-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.07] backdrop-blur-xl border border-white/10 hover:bg-white/[0.12] hover:border-white/20 transition-all group"
        title={language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
      >
        <span className="material-symbols-outlined text-lg text-slate-300 group-hover:text-white transition-colors">
          translate
        </span>
        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-wider">
          {language === "vi" ? "EN" : "VI"}
        </span>
      </button>

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
      <div className="hidden lg:flex flex-1 items-start justify-end relative z-10 pr-16 xl:pr-24 pt-[12vh]">
        <div className="max-w-lg px-12">
          <div className="p-6">
            <img alt="AquaGuard" src="/images/dark_mode_logo.png" />
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            {t("loginPage.brandingTitle")}
            <br />
            <span className="text-primary">{t("loginPage.brandingHighlight")}</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            {t("loginPage.brandingDesc")}
          </p>
          <div className="space-y-4">
            {[
              { icon: "map", text: t("loginPage.featureMap") },
              { icon: "emergency", text: t("loginPage.featureRescue") },
              { icon: "notifications_active", text: t("loginPage.featureWarnings") },
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
      <div className="flex-1 flex items-center justify-center relative z-10 px-4 sm:px-6 overflow-y-auto">
        <div className="w-full max-w-md py-6 sm:py-10 my-auto">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <img src="/images/dark_mode_logo.png" alt="AquaGuard" className="h-30 w-auto" />
            </div>

            <div className="text-center mb-5 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                {phoneMode === "register" ? t("loginPage.createAccount") : t("loginPage.welcomeBack")}
              </h3>
              <p className="text-slate-400 text-sm">
                {phoneMode === "register"
                  ? t("loginPage.registerSubtitle")
                  : t("loginPage.signInSubtitle")}
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
                    {t("loginPage.close")}
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
                  {t("loginPage.loginTab")}
                </button>
                <button
                  onClick={() => switchPhoneMode("register")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${phoneMode === "register"
                    ? "text-primary border-b-2 border-primary"
                    : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {t("loginPage.registerTab")}
                </button>
              </div>

              {/* ── Step Indicator (register only) ── */}
              {phoneMode === "register" && (
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex-1 flex items-center gap-2">
                      <div
                        className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          registerStep === step
                            ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                            : registerStep > step
                              ? "bg-primary/20 text-primary"
                              : "bg-white/5 text-slate-500 border border-white/10"
                        }`}
                      >
                        {registerStep > step ? (
                          <span className="material-symbols-outlined text-sm">check</span>
                        ) : (
                          step
                        )}
                      </div>
                      {step < 3 && (
                        <div className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${
                          registerStep > step ? "bg-primary/40" : "bg-white/10"
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── LOGIN FORM ── */}
              {phoneMode === "login" && (
                <form onSubmit={handlePhoneLogin} className="space-y-4">
                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t("loginPage.phoneNumber")}
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
                        placeholder="+84 901 234 567"
                        inputMode="tel"
                        autoComplete="tel"
                        aria-invalid={Boolean(phoneError)}
                        className={`w-full bg-white/5 border rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-sm ${
                          phoneError
                            ? "border-danger/60 focus:border-danger/60 focus:ring-danger/30"
                            : "border-white/10 focus:border-primary/50 focus:ring-primary/30"
                        }`}
                      />
                    </div>
                    {phoneError ? (
                      <p className="mt-2 text-xs text-danger font-medium">{phoneError}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-500">
                        {t("loginPage.phoneHint")}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t("loginPage.password")}
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
                            setPasswordError(t("loginPage.passwordRequired"));
                            return;
                          }
                          setPasswordError("");
                        }}
                        placeholder={t("loginPage.passwordPlaceholder")}
                        aria-invalid={Boolean(passwordError)}
                        className={`w-full bg-white/5 border rounded-xl pl-11 pr-11 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-sm ${
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

                  {/* Forgot Password link */}
                  <div className="flex justify-end -mt-1">
                    <a
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {t("loginPage.forgotPassword")}
                    </a>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoginDisabled}
                    className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSigningIn ? (
                      <>
                        <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>{t("loginPage.signingIn")}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">login</span>
                        <span>{t("loginPage.signIn")}</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ── REGISTER FORM (multi-step) ── */}
              {phoneMode === "register" && (
                <form onSubmit={handlePhoneRegister} className="space-y-4">

                  {/* ── Step 1: Credentials ── */}
                  {registerStep === 1 && (
                    <>
                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {t("loginPage.displayName")}
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                            badge
                          </span>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={t("loginPage.displayNamePlaceholder")}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                          />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {t("loginPage.phoneNumber")}
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
                            placeholder="+84 901 234 567"
                            inputMode="tel"
                            autoComplete="tel"
                            aria-invalid={Boolean(phoneError)}
                            className={`w-full bg-white/5 border rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-sm ${
                              phoneError
                                ? "border-danger/60 focus:border-danger/60 focus:ring-danger/30"
                                : "border-white/10 focus:border-primary/50 focus:ring-primary/30"
                            }`}
                          />
                        </div>
                        {phoneError ? (
                          <p className="mt-2 text-xs text-danger font-medium">{phoneError}</p>
                        ) : (
                          <p className="mt-1.5 text-xs text-slate-500">
                            {t("loginPage.phoneHint")}
                          </p>
                        )}
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {t("loginPage.password")}
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
                                setPasswordError(t("loginPage.passwordRequired"));
                                return;
                              }
                              if (password.length < 6) {
                                setPasswordError(t("loginPage.passwordTooShort"));
                                return;
                              }
                              setPasswordError("");
                            }}
                            placeholder={t("loginPage.passwordMinChars")}
                            aria-invalid={Boolean(passwordError)}
                            className={`w-full bg-white/5 border rounded-xl pl-11 pr-11 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all text-sm ${
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

                      {/* Next button */}
                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={!canProceedStep1}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{t("loginPage.next")}</span>
                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                      </button>
                    </>
                  )}

                  {/* ── Step 2: Personal Info ── */}
                  {registerStep === 2 && (
                    <>
                      {/* Gender Selection */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {t("loginPage.gender")}
                        </label>
                        <div className="flex gap-2">
                          {[
                            { key: "male", label: t("loginPage.male"), icon: "male" },
                            { key: "female", label: t("loginPage.female"), icon: "female" },
                            { key: "other", label: t("loginPage.other"), icon: "transgender" },
                          ].map((g) => (
                            <button
                              key={g.key}
                              type="button"
                              onClick={() => setGender(g.key)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${gender === g.key
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-300 hover:border-white/20"
                                }`}
                            >
                              <span className="material-symbols-outlined text-base">{g.icon}</span>
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {t("loginPage.dateOfBirth")}
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                            calendar_month
                          </span>
                          <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* Back / Next buttons */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold py-3.5 px-4 rounded-2xl transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">arrow_back</span>
                          <span>{t("loginPage.back")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          disabled={!canProceedStep2}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{t("loginPage.next")}</span>
                          <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── Step 3: Role & Submit ── */}
                  {registerStep === 3 && (
                    <>
                      {/* Role Selection */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {t("loginPage.role")}
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
                              {t("loginPage.rolePasswordRequired")}
                            </label>
                            <input
                              type="password"
                              value={rolePassword}
                              onChange={(e) => { setRolePassword(e.target.value); setRolePasswordError(""); }}
                              placeholder={t("loginPage.rolePasswordPlaceholder")}
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

                      {/* Summary of previous steps */}
                      <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/5">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">{t("loginPage.summary")}</p>
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2.5 text-sm">
                            <span className="material-symbols-outlined text-primary text-base">phone</span>
                            <span className="text-slate-500 min-w-[70px]">{t("loginPage.phoneNumber")}</span>
                            <span className="text-slate-300 font-medium">{phoneNumber}</span>
                          </div>
                          {displayName && (
                            <div className="flex items-center gap-2.5 text-sm">
                              <span className="material-symbols-outlined text-primary text-base">badge</span>
                              <span className="text-slate-500 min-w-[70px]">{t("loginPage.displayName")}</span>
                              <span className="text-slate-300 font-medium">{displayName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2.5 text-sm">
                            <span className="material-symbols-outlined text-primary text-base">{gender === "male" ? "male" : gender === "female" ? "female" : "transgender"}</span>
                            <span className="text-slate-500 min-w-[70px]">{t("loginPage.gender")}</span>
                            <span className="text-slate-300 font-medium">
                              {gender === "male" ? t("loginPage.male") : gender === "female" ? t("loginPage.female") : t("loginPage.other")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm">
                            <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
                            <span className="text-slate-500 min-w-[70px]">{t("loginPage.dateOfBirth")}</span>
                            <span className="text-slate-300 font-medium">{dateOfBirth}</span>
                          </div>
                        </div>
                      </div>

                      {/* Back / Submit buttons */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold py-3.5 px-4 rounded-2xl transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">arrow_back</span>
                          <span>{t("loginPage.back")}</span>
                        </button>
                        <button
                          type="submit"
                          disabled={isRegisterDisabled}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSigningIn ? (
                            <>
                              <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              <span>{t("loginPage.creatingAccount")}</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-xl">person_add</span>
                              <span>{t("loginPage.createAccount")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {/* Switch login/register */}
              <p className="text-center text-sm text-slate-500 mt-4">
                {phoneMode === "login" ? (
                  <>
                    {t("loginPage.noAccount")}{" "}
                    <button
                      onClick={() => switchPhoneMode("register")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("loginPage.register")}
                    </button>
                  </>
                ) : (
                  <>
                    {t("loginPage.haveAccount")}{" "}
                    <button
                      onClick={() => switchPhoneMode("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("loginPage.login")}
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Google Login hidden — uncomment to re-enable */}

          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-6">
            {t("loginPage.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
