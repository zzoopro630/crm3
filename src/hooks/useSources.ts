import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getSources,
    createSource,
    updateSource,
    deleteSource,
} from '@/services/sources'
import type { CreateSourceInput } from '@/services/sources'

// ============ Query Hooks ============

export function useSources() {
    return useQuery({
        queryKey: ['sources'],
        queryFn: getSources,
    })
}

// ============ Mutation Hooks ============

export function useCreateSource() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: CreateSourceInput) => createSource(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] })
        },
    })
}

export function useUpdateSource() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) =>
            updateSource(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] })
        },
    })
}

export function useDeleteSource() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => deleteSource(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] })
        },
    })
}
