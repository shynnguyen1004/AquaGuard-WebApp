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
  // Thẻ audio đã được "mở khoá" bằng một cử chỉ của người dùng chưa.
  const primedRef = useRef(false);

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

  // `ringing` là Ý ĐỊNH: theo trạng thái nước và các nút tắt tiếng thì còi
  // ĐÁNG LẼ phải kêu. Nó KHÔNG có nghĩa là tai nghe được — trình duyệt vẫn có
  // quyền từ chối phát.
  const ringing = alarming && !muted && !acknowledged;

  // `audible` là THỰC TẾ. Giao diện phải bám vào cái này: bám vào `ringing` thì
  // người dùng thấy nút đỏ nhấp nháy trong khi loa im, mà không có gì giải thích.
  const audible = ringing && !blocked;

  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(
      () => setBlocked(false),
      () => setBlocked(true) // chưa có tương tác → trình duyệt từ chối
    );
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (ringing) {
      tryPlay();
    } else {
      audio.pause();
      audio.currentTime = 0;
      setBlocked(false); // hết đợt thì xoá cờ, đợt sau đánh giá lại từ đầu
    }
  }, [ringing, tryPlay]);

  // ── MỞ KHOÁ ÂM THANH ──
  //
  // Trình duyệt chỉ cho phát tiếng nếu trang đã từng được người dùng tương tác.
  // Trên localhost Chrome dễ dãi nên lúc phát triển không thấy gì; trên tên miền
  // thật thì chặn thẳng, và Safari còn chặt hơn. Đợi tới lúc nước dâng mới xin
  // phép là muộn — đúng khoảnh khắc đó người dùng đang NHÌN màn hình chứ không
  // bấm gì cả, nên tiếng sẽ không bao giờ ra.
  //
  // Vì vậy: chộp lấy cử chỉ ĐẦU TIÊN bất kỳ trong phiên (đăng nhập, tắt hướng
  // dẫn, cuộn trang...) rồi phát câm một nhịp ở âm lượng 0 để đánh dấu thẻ audio
  // là "đã được người dùng cho phép". Từ đó về sau còi tự kêu, không cần bấm gì.
  const ringingRef = useRef(ringing);
  ringingRef.current = ringing;

  useEffect(() => {
    const unlock = () => {
      const audio = audioRef.current;
      if (!audio || primedRef.current) return;

      // Đang cần kêu thì phát thẳng, đừng phát câm.
      if (ringingRef.current) {
        primedRef.current = true;
        tryPlay();
        return;
      }

      primedRef.current = true;
      const volume = audio.volume;
      audio.volume = 0;
      audio.play().then(
        () => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = volume;
          setBlocked(false);
        },
        () => {
          audio.volume = volume;
          primedRef.current = false; // chưa mở được thì để cử chỉ sau thử tiếp
        }
      );
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [tryPlay]);

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
    // Đang bị chặn: chính cú bấm này là cử chỉ mở khoá mà trình duyệt đòi.
    // Phải THỬ PHÁT, tuyệt đối không hiểu thành "người dùng muốn tắt tiếng" —
    // họ đang bấm vào dòng chữ mời bật tiếng.
    if (blocked && ringing) {
      tryPlay();
      return;
    }
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
  }, [blocked, ringing, tryPlay]);

  return { ringing, audible, muted, acknowledged, blocked, alarming, onToggle };
}
