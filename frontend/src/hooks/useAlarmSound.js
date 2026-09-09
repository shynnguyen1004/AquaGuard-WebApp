import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Còi hú cho màn trực — hú LIÊN TỤC suốt thời gian còn nguy hiểm.
 *
 * Trước đây còi kêu theo SỰ KIỆN: mực nước vượt mốc thì rú 6 giây rồi thôi.
 * Nghe xong mà bỏ đi pha ly cà phê là không còn gì nhắc nữa, dù nước vẫn đang
 * dâng. Giờ nó chạy theo TRẠNG THÁI: `alarming` còn đúng thì còi còn kêu, tới
 * khi mọi cảm biến rút về mức an toàn mới im.
 *
 * Hai cách tắt, khác nhau rõ ràng:
 *   • "Tắt tiếng lần này" (acknowledge) — im cho tới hết đợt ngập này. Nước rút
 *     về an toàn thì tự lên đạn lại, đợt sau vẫn hú. Đây là nút người trực bấm
 *     khi đã nghe thấy và đang xử lý.
 *   • "Tắt tiếng hẳn" (mute) — nhớ trong localStorage, im cho tới khi bật lại
 *     bằng tay. Dùng khi đang họp, đang demo, hoặc chỉ muốn xem số liệu.
 *
 * Trình duyệt CHẶN phát tiếng cho tới khi người dùng có tương tác với trang;
 * `blocked` để giao diện mời họ bấm một cái cho mở khoá.
 */

const ALARM_URL = "/sounds/aquaguard_sos.mp3";
const STORAGE_KEY = "aquaguard_alarm_muted";

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} alarming Có cảm biến nào đang ở mức đáng báo động không.
 */
export default function useAlarmSound(alarming) {
  const [muted, setMuted] = useState(readMuted);
  const [acknowledged, setAcknowledged] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(ALARM_URL);
    audio.preload = "auto";
    audio.loop = true; // file chỉ dài ~23 giây, đợt ngập thì dài hơn nhiều
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const ringing = alarming && !muted && !acknowledged;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (ringing) {
      audio.play().then(
        () => setBlocked(false),
        () => setBlocked(true) // chưa có tương tác → trình duyệt từ chối
      );
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [ringing]);

  // Trình duyệt chặn phát tiếng khi trang chưa được người dùng chạm vào lần nào
  // (mở tab nền, khôi phục phiên, iOS đặc biệt chặt). Thay vì bắt họ hiểu điều
  // đó, bắt lấy cử chỉ ĐẦU TIÊN bất kỳ rồi thử phát lại — bấm vào đâu cũng được.
  useEffect(() => {
    if (!blocked || !ringing) return;

    const retry = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.play().then(
        () => setBlocked(false),
        () => {} // vẫn chặn thì thôi, nút loa vẫn còn đó để bấm thẳng
      );
    };

    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [blocked, ringing]);

  // Hết nguy hiểm thì lên đạn lại: đợt ngập sau vẫn hú dù lần này đã bấm tắt.
  useEffect(() => {
    if (!alarming && acknowledged) setAcknowledged(false);
  }, [alarming, acknowledged]);

  /**
   * Một nút, hai nghĩa — theo đúng thứ người trực đang cần lúc đó:
   *   đang hú  → im đợt này (vẫn tự bật lại cho đợt sau)
   *   đang im  → bật/tắt hẳn
   */
  const onToggle = useCallback(() => {
    if (ringing) {
      setAcknowledged(true);
      return;
    }
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Chế độ riêng tư chặn localStorage — vẫn chạy, chỉ là không nhớ.
      }
      if (!next) setBlocked(false);
      return next;
    });
  }, [ringing]);

  return { ringing, muted, acknowledged, blocked, alarming, onToggle };
}
