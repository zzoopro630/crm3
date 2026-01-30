export const JOB_TITLES = [
  '대표', '총괄이사', '사업단장', '지점장', '팀장', '실장', '과장', '대리',
] as const

export type JobTitle = (typeof JOB_TITLES)[number]

export interface Contact {
  id: string
  name: string
  title: JobTitle | null
  team: string
  phone: string
  managerId: string | null
  employeeId: string | null
  createdAt: string
  deletedAt: string | null
}

export interface ContactInput {
  name: string
  title?: JobTitle | null
  team?: string
  phone: string
  managerId?: string | null
  employeeId?: string | null
}

export interface UpdateContactInput {
  name?: string
  title?: JobTitle | null
  team?: string
  phone?: string
  managerId?: string | null
  employeeId?: string | null
}

export interface ContactTreeNode extends Contact {
  children: ContactTreeNode[]
}
