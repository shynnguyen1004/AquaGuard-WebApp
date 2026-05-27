import { useEffect, useMemo, useState } from "react";
import { Joyride, STATUS, ACTIONS } from "react-joyride";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { isTourCompleted, markTourCompleted } from "../../utils/tourStorage";
import { getStepsForRole } from "./tourSteps";
import TourTooltip from "./TourTooltip";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return isMobile;
}

export default function TourGuide() {
  const { user, role, isFirstLogin, clearFirstLogin } = useAuth();
  const { t } = useLanguage();
  const [run, setRun] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const isMobile = useIsMobile();

  const rawSteps = useMemo(() => getStepsForRole(role), [role]);

  const steps = useMemo(
    () =>
      rawSteps.map((s) => {
        const isCenter = s.kind === "welcome" || s.kind === "finish";
        let placement = s.placement;
        if (isMobile && !isCenter) {
          const target = typeof s.target === "string" ? s.target : "";
          // Mobile bottom nav lives at the bottom edge — flip tooltip above.
          if (target.startsWith('[data-tour="nav-')) {
            placement = "top";
          } else if (placement === "left" || placement === "right") {
            // Side placements overflow on narrow viewports — let joyride pick.
            placement = "auto";
          }
        }
        return {
          target: s.target,
          placement,
          disableBeacon: s.disableBeacon,
          title: t(s.titleKey),
          content: t(s.contentKey),
          data: {
            icon: s.icon,
            kind: s.kind,
            autoOpen: s.autoOpen,
            skipAutoClick: s.skipAutoClick,
            closeOnNext: s.closeOnNext,
          },
        };
      }),
    [rawSteps, t, isMobile],
  );

  // Auto-start once per user — show tour the first time they land on the
  // dashboard (after register OR first login). Mark "seen" immediately so a
  // mid-tour refresh doesn't re-trigger it.
  useEffect(() => {
    if (!user?.uid || steps.length === 0) return;
    if (run) return;
    if (isTourCompleted(user.uid)) return;
    const timer = setTimeout(() => {
      markTourCompleted(user.uid);
      clearFirstLogin?.();
      setTourKey((k) => k + 1);
      setRun(true);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, steps.length, run]);

  // Listen for replay event from Settings
  useEffect(() => {
    const handler = () => {
      if (steps.length === 0) return;
      setRun(false);
      setTimeout(() => {
        setTourKey((k) => k + 1);
        setRun(true);
      }, 50);
    };
    window.addEventListener("aquaguard:start-tour", handler);
    return () => window.removeEventListener("aquaguard:start-tour", handler);
  }, [steps.length]);

  if (steps.length === 0) return null;

  const handleCallback = (data) => {
    const { status, action } = data;
    const ended =
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status) ||
      action === ACTIONS.CLOSE;
    if (ended) {
      setRun(false);
      if (user?.uid) markTourCompleted(user.uid);
      clearFirstLogin?.();
    }
  };

  return (
    <Joyride
      key={tourKey}
      steps={steps}
      run={run}
      continuous
      showProgress={false}
      showSkipButton={false}
      disableOverlayClose
      disableScrolling={false}
      spotlightClicks={true}
      tooltipComponent={TourTooltip}
      callback={handleCallback}
      floaterProps={{
        styles: {
          floater: {
            // Prevent horizontal overflow on small viewports.
            maxWidth: "min(95vw, 440px)",
          },
        },
      }}
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: "rgba(15, 23, 42, 0.55)",
          arrowColor: "transparent",
        },
        spotlight: {
          borderRadius: 16,
        },
      }}
      locale={{
        back: t("tour.back"),
        close: t("tour.close"),
        last: t("tour.finish"),
        next: t("tour.next"),
        skip: t("tour.skip"),
      }}
    />
  );
}
