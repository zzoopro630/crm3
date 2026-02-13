import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
    getTeamMembers,
    getTeamStats,
    transferCustomer,
    bulkTransferCustomers,
    type TeamMember,
    type TeamStats,
} from '@/services/team'

// ============ Query Hooks ============

export function useTeamMembers() {
    const { employee } = useAuthStore()

    return useQuery<TeamMember[]>({
        queryKey: ['team-members', employee?.id],
        queryFn: () => getTeamMembers(),
        enabled: !!employee,
    })
}

export function useTeamStats(memberIds: string[]) {
    return useQuery<TeamStats>({
        queryKey: ['team-stats', memberIds],
        queryFn: () => getTeamStats(memberIds),
        enabled: memberIds.length > 0,
    })
}

// ============ Mutation Hooks ============

export function useTransferCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ customerId, newManagerId }: { customerId: number; newManagerId: string }) =>
            transferCustomer(customerId, newManagerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] })
            queryClient.invalidateQueries({ queryKey: ['team-stats'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}

export function useBulkTransferCustomers() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ customerIds, newManagerId }: { customerIds: number[]; newManagerId: string }) =>
            bulkTransferCustomers(customerIds, newManagerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] })
            queryClient.invalidateQueries({ queryKey: ['team-stats'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}
