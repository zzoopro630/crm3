import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getTrashContacts,
  restoreContact,
  permanentDeleteContact,
  emptyContactTrash,
  bulkCreateContacts,
} from '@/services/contacts'
import type { ContactInput, UpdateContactInput } from '@/types/contact'

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: getContacts,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactInput) => createContact(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateContactInput }) =>
      updateContact(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useTrashContacts() {
  return useQuery({
    queryKey: ['contacts-trash'],
    queryFn: getTrashContacts,
  })
}

export function useRestoreContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-trash'] })
    },
  })
}

export function usePermanentDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => permanentDeleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts-trash'] })
    },
  })
}

export function useEmptyContactTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => emptyContactTrash(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts-trash'] })
    },
  })
}

export function useBulkCreateContacts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      contacts,
      managerNames,
    }: {
      contacts: ContactInput[]
      managerNames: Record<string, string>
    }) => bulkCreateContacts(contacts, managerNames),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
