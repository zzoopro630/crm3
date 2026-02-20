import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/utils/supabase'

export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().session?.access_token

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...options, headers })

  // 401 시 세션 갱신 후 1회 재시도
  if (response.status === 401 && token) {
    try {
      const { data } = await supabase.auth.refreshSession()
      if (data.session) {
        // 갱신된 세션을 store에 반영
        useAuthStore.setState({ session: data.session })
        headers['Authorization'] = `Bearer ${data.session.access_token}`
        const retryResponse = await fetch(url, { ...options, headers })
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(error.error || `HTTP ${retryResponse.status}`)
        }
        return retryResponse.json()
      }
    } catch {
      // refreshSession 실패 시 원래 401 에러로 진행
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}
