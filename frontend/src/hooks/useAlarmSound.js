import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Còi hú cho màn trực.
 *
 * Người trực không dán mắt vào màn hình cả ca — khi mực nước chạm mức nguy
 * hiểm thì phải có tiếng gọi họ quay lại. Hook này lo phần phát tiếng; việc
 * quyết định KHI NÀO hú nằm ở nơi gọi.
 *
 * Ba điều đáng lưu ý:
 *   • File dài gần 23 giây, hú hết là tra tấn — cắt còn PLAY_MS.
 *   • Có sàn RETRIGGER_MS: hai cảm biến cùng vượt ngưỡng một lúc, hoặc số đo
 *     nhấp nháy quanh ranh giới, cũng chỉ hú một lần.
 *   • Trình duyệt CHẶN phát tiếng cho tới khi người dùng có tương tác với
 *     trang. `blocked` để giao diện mời họ bấm một cái cho mở khoá.
 */

const ALARM_URL = "/sounds/aquaguard_sos.mp3";
const PLAY_MS = 6000;
const RETRIGGER_MS = 10000;
const STORAGE_KEY = "aquaguard_alarm_muted";

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function useAlarmSound() {
  const [muted, setMuted] = useState(readMuted);
  const [blocked, setBlocked] = useState(false);

  const audioRef = useRef(null);
  const stopTimerRef = useRef(null);
  const lastPlayedRef = useRef(0);
  // Đọc trong callback ổn định nên dùng ref thay vì đưa vào deps.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const audio = new Audio(ALARM_URL);
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      clearTimeout(stopTimerRef.current);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    clearTimeout(stopTimerRef.current);
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const play = useCallback(() => {
    if (mutedRef.current) return;
    const now = Date.now();
    if (now - lastPlayedRef.current < RETRIGGER_MS) return;

    const audio = audioRef.current;
    if (!audio) return;

    lastPlayedRef.current = now;
    audio.currentTime = 0;
    audio.play().then(
      () => setBlocked(false),
      () => setBlocked(true) // chưa có tương tác → trình duyệt từ chối
    );

    clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => audio.pause(), PLAY_MS);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Chế độ riêng tư chặn localStorage — vẫn chạy, chỉ là không nhớ.
      }
      // Bấm tắt tiếng lúc đang hú = "tôi nghe rồi", im ngay.
      if (next) stop();
      else setBlocked(false);
      return next;
    });
  }, [stop]);

  return { muted, blocked, play, stop, toggleMute };
}
