import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getCustomerNotes, 
    createCustomerNote, 
    updateCustomerNote, 
    deleteCustomerNote 
} from '@/services/customerNotes'
import type { CustomerNote, NewCustomerNote } from '@/db/schema'
import { useAuthStore } from '@/stores/authStore'

// 고객 메모 목록 조회
export function useCustomerNotes(customerId: number) {
    return useQuery({
        queryKey: ['customerNotes', customerId],
        queryFn: () => getCustomerNotes(customerId),
        enabled: !!customerId,
        staleTime: 2 * 60 * 1000, // 2분
    })
}

// 메모 생성
export function useCreateCustomerNote() {
    const queryClient = useQueryClient()
    const { employee } = useAuthStore()

    return useMutation({
        mutationFn: (note: Omit<NewCustomerNote, 'createdBy'>) => {
            if (!employee?.id) throw new Error('로그인이 필요합니다.')
            return createCustomerNote({ ...note, createdBy: employee.id })
        },
        onSuccess: (_, { customerId }) => {
            queryClient.invalidateQueries({ queryKey: ['customerNotes', customerId] })
        },
        onError: (error) => {
            console.error('메모 생성 실패:', error)
        },
    })
}

// 메모 수정
export function useUpdateCustomerNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, content }: { id: number; content: string }) =>
            updateCustomerNote(id, content),
        onSuccess: (_, { customerId }) => {
            queryClient.invalidateQueries({ queryKey: ['customerNotes', customerId] })
        },
        onError: (error) => {
            console.error('메모 수정 실패:', error)
        },
    })
}

// 메모 삭제
export function useDeleteCustomerNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, customerId }: { id: number; customerId: number }) =>
            deleteCustomerNote(id),
        onSuccess: (_, { customerId }) => {
            queryClient.invalidateQueries({ queryKey: ['customerNotes', customerId] })
        },
        onError: (error) => {
            console.error('메모 삭제 실패:', error)
        },
    })
}