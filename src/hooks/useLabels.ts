import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLabels, createLabel, updateLabel, deleteLabel } from '@/services/labels'
import type { Label, NewLabel } from '@/db/schema'
import { useAuthStore } from '@/stores/authStore'

// 라벨 목록 조회
export function useLabels() {
    return useQuery({
        queryKey: ['labels'],
        queryFn: getLabels,
        staleTime: 5 * 60 * 1000, // 5분
    })
}

// 라벨 생성
export function useCreateLabel() {
    const queryClient = useQueryClient()
    const { employee } = useAuthStore()

    return useMutation({
        mutationFn: (label: Omit<NewLabel, 'createdBy'>) => {
            if (!employee?.id) throw new Error('로그인이 필요합니다.')
            return createLabel({ ...label, createdBy: employee.id })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels'] })
        },
        onError: (error) => {
            console.error('라벨 생성 실패:', error)
        },
    })
}

// 라벨 수정
export function useUpdateLabel() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<NewLabel> }) =>
            updateLabel(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels'] })
        },
        onError: (error) => {
            console.error('라벨 수정 실패:', error)
        },
    })
}

// 라벨 삭제
export function useDeleteLabel() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteLabel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels'] })
        },
        onError: (error) => {
            console.error('라벨 삭제 실패:', error)
        },
    })
}