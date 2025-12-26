import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    bulkCreateCustomers,
} from '@/services/customers'
import type { CustomerListParams, CreateCustomerInput, UpdateCustomerInput } from '@/types/customer'

// ============ Customer List Hook ============

export function useCustomers(params: CustomerListParams = {}) {
    return useQuery({
        queryKey: ['customers', params],
        queryFn: () => getCustomers(params),
    })
}

// ============ Single Customer Hook ============

export function useCustomer(id: number | null) {
    return useQuery({
        queryKey: ['customer', id],
        queryFn: () => getCustomerById(id!),
        enabled: id !== null,
    })
}

// ============ Mutation Hooks ============

export function useCreateCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ input, managerId }: { input: CreateCustomerInput; managerId: string }) =>
            createCustomer(input, managerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: UpdateCustomerInput }) =>
            updateCustomer(id, input),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
        },
    })
}

export function useDeleteCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => deleteCustomer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}

export function useBulkCreateCustomers() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ customers, managerId }: { customers: CreateCustomerInput[]; managerId: string }) =>
            bulkCreateCustomers(customers, managerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}
