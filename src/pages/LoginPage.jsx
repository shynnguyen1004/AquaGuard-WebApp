import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { loginWithGoogle, error, clearError, loading } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    clearError();
    try {
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-dark relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />

        {/* Grid pattern */}
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
            <img
              alt="AquaGuard"
              src="/images/dark_mode_logo.png"
            />
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Hệ thống quản lý
            <br />
            <span className="text-primary">thiên tai lũ lụt</span>
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Giám sát mực nước, cảnh báo sớm, điều phối cứu hộ và bảo vệ cộng
            đồng trong thời gian thực.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: "map", text: "Bản đồ lũ lụt thời gian thực" },
              { icon: "emergency", text: "Điều phối cứu hộ nhanh chóng" },
              { icon: "notifications_active", text: "Cảnh báo sớm 24/7" },
            ].map((feature) => (
              <div
                key={feature.icon}
                className="flex items-center gap-3 text-slate-300"
              >
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
          {/* Card */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined filled-icon text-2xl">
                  water_drop
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                AquaGuard
              </h1>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                Chào mừng trở lại
              </h3>
              <p className="text-slate-400 text-sm">
                Đăng nhập để truy cập hệ thống quản lý
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-danger text-xl mt-0.5">
                  error
                </span>
                <div>
                  <p className="text-sm text-danger font-medium">{error}</p>
                  <button
                    onClick={clearError}
                    className="text-xs text-danger/70 hover:text-danger mt-1 underline"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isSigningIn ? (
                <>
                  <div className="size-5 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  {/* Google Icon SVG */}
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Đăng nhập bằng Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-transparent text-slate-500 font-medium">
                  Được bảo vệ bởi Firebase Authentication
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="text-center">
              <p className="text-xs text-slate-500 leading-relaxed">
                Bằng việc đăng nhập, bạn đồng ý với{" "}
                <a href="#" className="text-primary hover:underline">
                  Điều khoản dịch vụ
                </a>{" "}
                và{" "}
                <a href="#" className="text-primary hover:underline">
                  Chính sách bảo mật
                </a>{" "}
                của AquaGuard.
              </p>
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
