import type { Contact, ContactInput, UpdateContactInput } from '@/types/contact'

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function getContacts(): Promise<Contact[]> {
  return apiRequest<Contact[]>('/api/contacts')
}

export async function createContact(input: ContactInput): Promise<Contact> {
  return apiRequest<Contact>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<Contact> {
  return apiRequest<Contact>(`/api/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteContact(id: string): Promise<void> {
  await apiRequest(`/api/contacts/${id}`, { method: 'DELETE' })
}

export async function getTrashContacts(): Promise<Contact[]> {
  return apiRequest<Contact[]>('/api/contacts/trash')
}

export async function restoreContact(id: string): Promise<void> {
  await apiRequest(`/api/contacts/${id}/restore`, { method: 'POST' })
}

export async function permanentDeleteContact(id: string): Promise<void> {
  await apiRequest(`/api/contacts/${id}/permanent`, { method: 'DELETE' })
}

export async function emptyContactTrash(): Promise<void> {
  await apiRequest('/api/contacts/trash/empty', { method: 'DELETE' })
}

export async function bulkCreateContacts(
  contacts: ContactInput[],
  managerNames: Record<string, string>
): Promise<{ success: number; managersLinked: number }> {
  return apiRequest('/api/contacts/bulk', {
    method: 'POST',
    body: JSON.stringify({ contacts, managerNames }),
  })
}
