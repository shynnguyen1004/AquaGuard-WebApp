import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { normalizePhone, isValidVNPhone } from "../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Steps: 1 = enter phone, 2 = enter OTP, 3 = new password
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("+84");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Countdown timer for OTP
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // OTP input refs
  const otpRefs = useRef([]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Step 1: Request OTP ──
  const handleRequestOTP = async (e) => {
    e?.preventDefault();
    const normalized = normalizePhone(phoneNumber);
    if (!isValidVNPhone(normalized)) {
      setError("Số điện thoại không hợp lệ (VD: +84901234567)");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: normalized }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Lỗi gửi OTP");
      }

      setPhoneNumber(normalized);
      setStep(2);
      setCountdown(300); // 5 minutes
      setCanResend(false);
      setSuccess("Mã OTP đã được gửi!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số OTP");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, otp: otpString }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "OTP không hợp lệ");
      }

      setSessionToken(data.data.sessionToken);
      setStep(3);
      setSuccess("Xác thực thành công!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ──
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneNumber,
          sessionToken,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Đổi mật khẩu thất bại");
      }

      setSuccess("Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Input Handlers ──
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Step indicator ──
  const steps = [
    { num: 1, label: "Nhập SĐT", icon: "phone" },
    { num: 2, label: "Xác thực OTP", icon: "pin" },
    { num: 3, label: "Mật khẩu mới", icon: "lock_reset" },
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
            Khôi phục
            <br />
            <span className="text-primary">Mật khẩu của bạn</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Nhập số điện thoại đã đăng ký để nhận mã OTP và đặt lại mật khẩu mới cho tài khoản AquaGuard.
          </p>

          {/* Step Progress */}
          <div className="space-y-3">
            {steps.map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  step === s.num
                    ? "text-white"
                    : step > s.num
                    ? "text-primary/60"
                    : "text-slate-600"
                }`}
              >
                <div
                  className={`size-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    step === s.num
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : step > s.num
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  {step > s.num ? (
                    <span className="material-symbols-outlined text-xl">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl">{s.icon}</span>
                  )}
                </div>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side — Form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined filled-icon text-2xl">water_drop</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AquaGuard</h1>
            </div>

            {/* Mobile step indicator */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              {steps.map((s) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div
                    className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s.num
                        ? "bg-primary text-white"
                        : step > s.num
                        ? "bg-primary/20 text-primary"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {step > s.num ? "✓" : s.num}
                  </div>
                  {s.num < 3 && (
                    <div
                      className={`w-8 h-0.5 rounded ${
                        step > s.num ? "bg-primary/40" : "bg-white/10"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                {step === 1 && "Quên mật khẩu?"}
                {step === 2 && "Nhập mã OTP"}
                {step === 3 && "Đặt mật khẩu mới"}
              </h3>
              <p className="text-slate-400 text-sm">
                {step === 1 && "Nhập số điện thoại đã đăng ký để nhận mã OTP"}
                {step === 2 && `Mã OTP đã gửi đến ${phoneNumber}`}
                {step === 3 && "Tạo mật khẩu mới cho tài khoản của bạn"}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-danger text-lg mt-0.5">error</span>
                <div>
                  <p className="text-sm text-danger font-medium">{error}</p>
                  <button onClick={() => setError(null)} className="text-xs text-danger/70 hover:text-danger mt-1 underline">
                    Đóng
                  </button>
                </div>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-success text-lg">check_circle</span>
                <p className="text-sm text-success font-medium">{success}</p>
              </div>
            )}

            {/* ── Step 1: Enter Phone ── */}
            {step === 1 && (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      phone
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+84 xxx xxx xxx"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneNumber.length < 10}
                  className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">send</span>
                      <span>Gửi mã OTP</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── Step 2: Enter OTP ── */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {/* OTP Input Boxes */}
                <div className="flex justify-center gap-2.5">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Countdown */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-slate-400">
                      Mã hết hạn sau{" "}
                      <span className="text-primary font-semibold">{formatTime(countdown)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-danger font-medium">Mã OTP đã hết hạn</p>
                  )}
                </div>

                {/* Resend OTP */}
                {canResend && (
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={loading}
                    className="w-full text-sm text-primary hover:text-primary/80 font-medium py-2 transition-colors"
                  >
                    Gửi lại mã OTP
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.join("").length !== 6}
                  className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">verified</span>
                      <span>Xác thực OTP</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(["", "", "", "", "", ""]); setError(null); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 py-2 transition-colors"
                >
                  ← Quay lại nhập SĐT
                </button>
              </form>
            )}

            {/* ── Step 3: New Password ── */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      lock
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                      autoFocus
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                      lock_reset
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      Mật khẩu không khớp
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Đang đổi mật khẩu...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">lock_reset</span>
                      <span>Đổi mật khẩu</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
            </div>

            {/* Back to login */}
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Quay lại trang đăng nhập
              </Link>
            </div>
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
