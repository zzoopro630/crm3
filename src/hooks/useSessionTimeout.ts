import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

const CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 체크
const THROTTLE_MS = 30 * 1000; // 이벤트 갱신 30초 throttle
const STORAGE_KEY = 'crm3_last_activity';

export function useSessionTimeout(timeoutMinutes = 60) {
  const signOut = useAuthStore((s) => s.signOut);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastThrottleRef = useRef(0);
  const warningShownRef = useRef(false);
  const timeoutMsRef = useRef(timeoutMinutes * 60 * 1000);

  // 런타임 변경 반영
  useEffect(() => {
    timeoutMsRef.current = timeoutMinutes * 60 * 1000;
  }, [timeoutMinutes]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current < THROTTLE_MS) return;
    lastThrottleRef.current = now;
    localStorage.setItem(STORAGE_KEY, String(now));
    warningShownRef.current = false;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timeoutMs = timeoutMsRef.current;

    // 초기 활동 시간 기록
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    // 앱 시작 시 즉시 타임아웃 체크 (이벤트 리스너 등록 전)
    const lastStored = Number(localStorage.getItem(STORAGE_KEY) || Date.now());
    if (Date.now() - lastStored >= timeoutMs) {
      localStorage.removeItem(STORAGE_KEY);
      toast.info(`${timeoutMinutes}분 동안 활동이 없어 자동 로그아웃되었습니다.`);
      signOut();
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    const checkTimeout = () => {
      const currentTimeoutMs = timeoutMsRef.current;
      const currentWarningMs = Math.min(5 * 60 * 1000, currentTimeoutMs * 0.1);
      const last = Number(localStorage.getItem(STORAGE_KEY) || Date.now());
      const elapsed = Date.now() - last;

      if (elapsed >= currentTimeoutMs) {
        clearInterval(timer);
        events.forEach((e) => window.removeEventListener(e, updateActivity));
        localStorage.removeItem(STORAGE_KEY);
        const mins = Math.round(currentTimeoutMs / 60000);
        toast.info(`${mins}분 동안 활동이 없어 자동 로그아웃되었습니다.`);
        signOut();
        return;
      }

      if (elapsed >= currentTimeoutMs - currentWarningMs && !warningShownRef.current) {
        warningShownRef.current = true;
        const warnMins = Math.round(currentWarningMs / 60000);
        toast.warning(`${warnMins}분 후 자동 로그아웃됩니다. 활동을 계속하면 유지됩니다.`, {
          duration: 10000,
        });
      }
    };

    const timer = setInterval(checkTimeout, CHECK_INTERVAL_MS);

    // 모바일: 백그라운드→포그라운드 복귀 시 즉시 타임아웃 체크
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, signOut, updateActivity, timeoutMinutes]);
}
