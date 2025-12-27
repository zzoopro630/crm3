import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCustomerNotes,
    createCustomerNote,
    updateCustomerNote,
    deleteCustomerNote,
    type CustomerNoteWithAuthor,
} from '@/services/notes'

export function useCustomerNotes(customerId: number | null) {
    return useQuery<CustomerNoteWithAuthor[]>({
        queryKey: ['customerNotes', customerId],
        queryFn: () => getCustomerNotes(customerId!),
        enabled: !!customerId,
    })
}

export function useCreateNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createCustomerNote,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['customerNotes', variables.customerId],
            })
        },
    })
}

export function useUpdateNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, content }: { id: number; content: string }) =>
            updateCustomerNote(id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customerNotes'] })
        },
    })
}

export function useDeleteNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteCustomerNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customerNotes'] })
        },
    })
}
