import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LiveLocationProvider } from "./contexts/LiveLocationContext";
import { CallProvider } from "./contexts/CallContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./components/common/Toast";
import { NotificationProvider } from "./contexts/NotificationContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import Dashboard from "./pages/Dashboard";
import UnauthorizedPage from "./pages/UnauthorizedPage";

export default function App() {
  // Cây provider: thứ tự lồng nhau quan trọng — Auth phải bọc ngoài LiveLocation
  // (cần token) và NotificationProvider nằm trong cùng để dùng được Toast.
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <LiveLocationProvider>
              <ToastProvider>
                <CallProvider>
                <NotificationProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </NotificationProvider>
                </CallProvider>
              </ToastProvider>
            </LiveLocationProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

