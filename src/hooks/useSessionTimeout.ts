import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

const TIMEOUT_MS = 60 * 60 * 1000; // 1시간
const WARNING_MS = 5 * 60 * 1000; // 만료 5분 전 경고
const CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 체크
const THROTTLE_MS = 30 * 1000; // 이벤트 갱신 30초 throttle
const STORAGE_KEY = 'crm3_last_activity';

export function useSessionTimeout() {
  const signOut = useAuthStore((s) => s.signOut);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastThrottleRef = useRef(0);
  const warningShownRef = useRef(false);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current < THROTTLE_MS) return;
    lastThrottleRef.current = now;
    localStorage.setItem(STORAGE_KEY, String(now));
    warningShownRef.current = false;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // 초기 활동 시간 기록
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    const timer = setInterval(() => {
      const last = Number(localStorage.getItem(STORAGE_KEY) || Date.now());
      const elapsed = Date.now() - last;

      if (elapsed >= TIMEOUT_MS) {
        clearInterval(timer);
        events.forEach((e) => window.removeEventListener(e, updateActivity));
        localStorage.removeItem(STORAGE_KEY);
        toast.info('1시간 동안 활동이 없어 자동 로그아웃되었습니다.');
        signOut();
        return;
      }

      if (elapsed >= TIMEOUT_MS - WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning('5분 후 자동 로그아웃됩니다. 활동을 계속하면 유지됩니다.', {
          duration: 10000,
        });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, updateActivity));
    };
  }, [isAuthenticated, signOut, updateActivity]);
}
