import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    restoreEmployee,
    bulkCreateEmployees,
    getPendingApprovals,
    approveUser,
    rejectUser,
} from '@/services/employees'
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/types/employee'

// ============ Employee Hooks ============

export function useEmployees() {
    return useQuery({
        queryKey: ['employees'],
        queryFn: getEmployees,
    })
}

export function useCreateEmployee() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
    })
}

export function useBulkCreateEmployees() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (employees: CreateEmployeeInput[]) => bulkCreateEmployees(employees),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
    })
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
            updateEmployee(id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
    })
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteEmployee(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
    })
}

export function useRestoreEmployee() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => restoreEmployee(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
    })
}

// ============ Pending Approval Hooks ============

export function usePendingApprovals() {
    return useQuery({
        queryKey: ['pending-approvals'],
        queryFn: getPendingApprovals,
    })
}

export function useApproveUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            approvalId,
            employeeData,
            approvedBy
        }: {
            approvalId: string
            employeeData: CreateEmployeeInput
            approvedBy: string
        }) => approveUser(approvalId, employeeData, approvedBy),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
    })
}

export function useRejectUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ approvalId, rejectedBy }: { approvalId: string; rejectedBy: string }) =>
            rejectUser(approvalId, rejectedBy),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
        },
    })
}
