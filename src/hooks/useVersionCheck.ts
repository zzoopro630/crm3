import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

declare const __BUILD_TIME__: string

const LOCAL_BUILD_TIME = __BUILD_TIME__

export function useVersionCheck() {
  const location = useLocation()
  const navCountRef = useRef(0)

  useEffect(() => {
    // 첫 로드는 건너뛰고, 3번째 내비게이션부터 체크 (너무 빈번한 요청 방지)
    navCountRef.current++
    if (navCountRef.current < 3) return

    // 5번마다 한 번씩만 체크
    if (navCountRef.current % 5 !== 0) return

    fetch('/version.json?t=' + Date.now())
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.buildTime && data.buildTime !== LOCAL_BUILD_TIME) {
          // 새 버전 감지 → 페이지 리로드
          window.location.reload()
        }
      })
      .catch(() => {
        // 네트워크 에러 무시
      })
  }, [location.pathname])
}
