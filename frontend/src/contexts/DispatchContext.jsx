import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useLiveLocation } from "./LiveLocationContext";
import { api } from "../services/api";

/**
 * Auto-dispatch cho rescuer: nhận thông báo được giao ca, và bật/tắt ca trực.
 *
 * Chế độ GIAO THẲNG: hệ thống chọn và giao luôn, rescuer không nhận/từ chối.
 * Vì vậy ở đây không có `respond()` — chỉ có state "bạn vừa được giao ca này"
 * để hiện thông báo. Bắt đầu ca thì dùng luồng /sos/:id/accept sẵn có, bỏ ca
 * thì dùng /sos/:id/cancel.
 *
 * Không tự mở WebSocket riêng — bám vào socket always-on của
 * LiveLocationProvider qua `subscribe()`. Backend `sendToUser` đẩy tới mọi
 * socket của user nên một đường là đủ.
 */

const DispatchContext = createContext({
  assignment: null,
  dutyStatus: "off",
  dutyLoading: false,
  setDuty: async () => {},
  dismissAssignment: () => {},
});

export function DispatchProvider({ children }) {
  const { role, token } = useAuth();
  const { subscribe } = useLiveLocation();

  const [assignment, setAssignment] = useState(null);
  const [dutyStatus, setDutyStatus] = useState("off");
  const [dutyLoading, setDutyLoading] = useState(false);

  const isRescuer = role === "rescuer";

  // ── Đồng bộ trạng thái trực + ca đang được giao khi vào trang ──
  useEffect(() => {
    if (!isRescuer || !token) {
      setAssignment(null);
      setDutyStatus("off");
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const [duty, assignments] = await Promise.all([
          api.get("/dispatch/duty"),
          api.get("/dispatch/assignments/mine"),
        ]);
        if (cancelled) return;
        setDutyStatus(duty?.data?.dutyStatus || "off");
        // Chỉ nhắc lại ca mà rescuer CHƯA bấm bắt đầu — ca đang chạy rồi thì
        // đã nằm trên dashboard, không cần đập vào mặt họ lần nữa.
        const pending = assignments?.data?.find((a) => a.needsConfirm);
        if (pending) setAssignment(pending);
      } catch {
        // Im lặng: chỉ là khôi phục trạng thái, WebSocket vẫn là đường chính.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRescuer, token]);

  // ── Lắng nghe push từ server ──
  useEffect(() => {
    if (!isRescuer) return;

    return subscribe((msg) => {
      if (msg.type === "dispatch_assigned") {
        setAssignment(msg.assignment);
        // Ca mới xuất hiện trên dashboard → cho các trang đang mở tự nạp lại.
        window.dispatchEvent(new CustomEvent("dispatch_assigned"));
      } else if (msg.type === "dispatch_assignment_closed") {
        // Chỉ gỡ nếu đúng ca đang hiện — tránh message đến muộn xoá mất ca MỚI.
        setAssignment((prev) =>
          prev && prev.id === msg.assignmentId ? null : prev
        );
      }
    });
  }, [isRescuer, subscribe]);

  const setDuty = useCallback(async (nextStatus) => {
    setDutyLoading(true);
    try {
      const res = await api.put("/dispatch/duty", { status: nextStatus });
      setDutyStatus(res?.data?.dutyStatus || nextStatus);
      return { ok: true };
    } catch (err) {
      return { ok: false, code: err.data?.code, message: err.message };
    } finally {
      setDutyLoading(false);
    }
  }, []);

  // Đóng thông báo. KHÔNG phải từ chối — nhiệm vụ vẫn là của rescuer, chỉ là
  // họ đã đọc xong và muốn tắt lớp phủ đi.
  const dismissAssignment = useCallback(() => setAssignment(null), []);

  return (
    <DispatchContext.Provider
      value={{
        assignment,
        dutyStatus,
        dutyLoading,
        setDuty,
        dismissAssignment,
      }}
    >
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatch() {
  return useContext(DispatchContext);
}
