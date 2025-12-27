import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCustomerContracts,
    createContract,
    updateContract,
    deleteContract,
    type ContractWithAuthor,
} from '@/services/contracts'
import type { Contract } from '@/db/schema'

export function useCustomerContracts(customerId: number | null) {
    return useQuery<ContractWithAuthor[]>({
        queryKey: ['customerContracts', customerId],
        queryFn: () => getCustomerContracts(customerId!),
        enabled: !!customerId,
    })
}

export function useCreateContract() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createContract,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['customerContracts', variables.customerId],
            })
        },
    })
}

export function useUpdateContract() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            id,
            input,
        }: {
            id: number
            input: Partial<Pick<Contract, 'insuranceCompany' | 'productName' | 'premium' | 'paymentPeriod' | 'memo'>>
        }) => updateContract(id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customerContracts'] })
        },
    })
}

export function useDeleteContract() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteContract,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customerContracts'] })
        },
    })
}
