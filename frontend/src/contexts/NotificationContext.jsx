import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "../components/common/Toast";
import { useLanguage } from "./LanguageContext";
import { notificationService } from "../services/notifications";

const NotificationContext = createContext(null);

const POLL_INTERVAL = 25000; // 25s — khớp với phong cách polling sẵn có

export function NotificationProvider({ children }) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef(0);
  const initializedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notificationService.list();
      if (res.success) {
        setNotifications(res.data || []);
        const count = res.unreadCount || 0;
        // Bắn toast khi có noti mới (bỏ qua lần load đầu tiên)
        if (initializedRef.current && count > prevUnreadRef.current) {
          const latest = (res.data || []).find((n) => !n.is_read);
          if (latest) showToast(latest.title, "info");
        }
        prevUnreadRef.current = count;
        initializedRef.current = true;
        setUnreadCount(count);
      }
    } catch {
      // Im lặng — polling sẽ thử lại
    }
  }, [token, showToast]);

  // Poll khi đã đăng nhập; reset khi logout
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadRef.current = 0;
      initializedRef.current = false;
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [token, refresh]);

  const markRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.is_read ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationService.markRead(id);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    prevUnreadRef.current = 0;
    try {
      await notificationService.markAllRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  const remove = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationService.remove(id);
      refresh();
    } catch {
      refresh();
    }
  }, [refresh]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markRead, markAllRead, remove }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
