import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getOrganizations,
    getOrganizationById,
    createOrganization,
    updateOrganization,
    deleteOrganization,
} from '@/services/organizations'
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@/services/organizations'

// ============ Query Hooks ============

export function useOrganizations() {
    return useQuery({
        queryKey: ['organizations'],
        queryFn: getOrganizations,
    })
}

export function useOrganization(id: number | null) {
    return useQuery({
        queryKey: ['organization', id],
        queryFn: () => getOrganizationById(id!),
        enabled: id !== null,
    })
}

// ============ Mutation Hooks ============

export function useCreateOrganization() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: CreateOrganizationInput) => createOrganization(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] })
        },
    })
}

export function useUpdateOrganization() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: UpdateOrganizationInput }) =>
            updateOrganization(id, input),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] })
            queryClient.invalidateQueries({ queryKey: ['organization', variables.id] })
        },
    })
}

export function useDeleteOrganization() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => deleteOrganization(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] })
        },
    })
}
