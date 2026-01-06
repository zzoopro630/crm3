// Re-export from Drizzle schema
export type { Customer, NewCustomer, CustomerStatus, Gender, CustomerType } from '@/db/schema'

export interface CustomerFilters {
    search?: string
    status?: string
    managerId?: string
    type?: string
}

export interface CustomerListParams {
    page?: number
    limit?: number
    filters?: CustomerFilters
    sortBy?: 'createdAt' | 'updatedAt' | 'name'
    sortOrder?: 'asc' | 'desc'
}

export interface CustomerListResponse {
    data: CustomerWithManager[]
    total: number
    page: number
    limit: number
    totalPages: number
}

export interface CustomerWithManager {
    id: number
    managerId: string
    managerName: string | null
    name: string
    phone: string | null
    email: string | null
    address: string | null
    addressDetail: string | null
    gender: string | null
    birthdate: string | null
    company: string | null
    jobTitle: string | null
    source: string | null
    status: string
    type: string
    interestProduct: string | null
    memo: string | null
    adminComment: string | null
    // 추가 정보
    nationality: string | null
    existingInsurance: string | null
    insuranceType: string | null
    annualIncome: string | null
    maritalStatus: string | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
}

// ENUM value types
export const CUSTOMER_STATUSES = [
    { value: 'new', label: '신규' },
    { value: 'contacted', label: '연락완료' },
    { value: 'consulting', label: '상담중' },
    { value: 'closed', label: '계약완료' },
    { value: 'called', label: '통화완료' },
    { value: 'texted', label: '문자남김' },
    { value: 'no_answer', label: '부재' },
    { value: 'rejected', label: '거절' },
    { value: 'wrong_number', label: '결번' },
    { value: 'ineligible', label: '가입불가' },
    { value: 'upsell', label: '추가제안' },
] as const

export const GENDER_OPTIONS = [
    { value: '남성', label: '남성' },
    { value: '여성', label: '여성' },
    { value: '법인', label: '법인' },
] as const

export const CUSTOMER_TYPES = [
    { value: 'personal', label: '고객 관리 (Personal)' },
    { value: 'db', label: 'DB 관리 (Assigned)' },
] as const

export type CustomerStatusValue = typeof CUSTOMER_STATUSES[number]['value']
export type GenderValue = typeof GENDER_OPTIONS[number]['value']

// Form input types - 선택 필드는 빈 문자열 허용
export interface CreateCustomerInput {
    name: string
    phone?: string
    email?: string
    address?: string
    gender?: string  // 폼에서는 빈 문자열 허용
    birthdate?: string
    company?: string
    jobTitle?: string
    source?: string
    status?: string  // 폼에서는 string 허용
    type?: string
    interestProduct?: string
    memo?: string
    adminComment?: string
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
    managerId?: string
}
