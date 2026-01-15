import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getCustomerLabels, 
    addCustomerLabel, 
    removeCustomerLabel, 
    updateCustomerLabels 
} from '@/services/labels'
import { useAuthStore } from '@/stores/authStore'

// 고객 라벨 목록 조회
export function useCustomerLabels(customerId: number) {
    return useQuery({
        queryKey: ['customerLabels', customerId],
        queryFn: () => getCustomerLabels(customerId),
        enabled: !!customerId,
        staleTime: 5 * 60 * 1000, // 5분
    })
}

// 고객에 라벨 추가
export function useAddCustomerLabel() {
    const queryClient = useQueryClient()
    const { employee } = useAuthStore()

    return useMutation({
        mutationFn: ({ customerId, labelId }: { customerId: number; labelId: string }) => {
            if (!employee?.id) throw new Error('로그인이 필요합니다.')
            return addCustomerLabel(customerId, labelId, employee.id)
        },
        onSuccess: (_, { customerId }) => {
            queryClient.invalidateQueries({ queryKey: ['customerLabels', customerId] })
        },
        onError: (error) => {
            console.error('고객 라벨 추가 실패:', error)
        },
    })
}

// 고객에서 라벨 제거
export function useRemoveCustomerLabel() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ customerId, labelId }: { customerId: number; labelId: string }) =>
            removeCustomerLabel(customerId, labelId),
        onSuccess: (_, { customerId }) => {
            queryClient.invalidateQueries({ queryKey: ['customerLabels', customerId] })
        },
        onError: (error) => {
            console.error('고객 라벨 제거 실패:', error)
        },
    })
}

// 고객 라벨 일괄 업데이트
export function useUpdateCustomerLabels() {
    const queryClient = useQueryClient()
    const { employee } = useAuthStore()

    return useMutation({
        mutationFn: ({ customerId, labelIds }: { customerId: number; labelIds: string[] }) => {
            if (!employee?.id) throw new Error('로그인이 필요합니다.')
            return updateCustomerLabels(customerId, labelIds, employee.id)
        },
        onSuccess: (_, { customerId }) => {
            queryClient.invalidateQueries({ queryKey: ['customerLabels', customerId] })
        },
        onError: (error) => {
            console.error('고객 라벨 업데이트 실패:', error)
        },
    })
}