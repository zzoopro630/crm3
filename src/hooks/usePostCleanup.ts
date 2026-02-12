import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiRequest } from '@/lib/apiClient'

const STORAGE_KEY = 'crm-last-cleanup'
const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24시간

export function usePostCleanup() {
  const employee = useAuthStore((s) => s.employee)

  useEffect(() => {
    if (employee?.securityLevel !== 'F1') return

    const last = Number(localStorage.getItem(STORAGE_KEY)) || 0
    if (Date.now() - last < INTERVAL_MS) return

    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    apiRequest('/api/posts/cleanup', { method: 'POST' }).catch(() => {})
  }, [employee?.securityLevel])
}
