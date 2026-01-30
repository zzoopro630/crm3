import type { Contact, ContactTreeNode, JobTitle } from '@/types/contact'
import { JOB_TITLES } from '@/types/contact'

const TITLE_PRIORITY: Record<string, number> = Object.fromEntries(
  JOB_TITLES.map((t, i) => [t, i])
)

const TEAM_ORDER = [
  '채널대표', '총무팀', '지원팀', '직할1', '직할3', 'Zenith',
] as const

export function getTitlePriority(title: JobTitle | null): number {
  if (!title) return JOB_TITLES.length
  return TITLE_PRIORITY[title] ?? JOB_TITLES.length
}

export function getTeamPriority(team: string): number {
  const idx = TEAM_ORDER.indexOf(team as (typeof TEAM_ORDER)[number])
  return idx >= 0 ? idx : TEAM_ORDER.length
}

export function sortByTitlePriority<T extends { title: JobTitle | null; name: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const diff = getTitlePriority(a.title) - getTitlePriority(b.title)
    return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko')
  })
}

export function buildOrgTree(contacts: Contact[]): ContactTreeNode[] {
  const map = new Map<string, ContactTreeNode>()
  const roots: ContactTreeNode[] = []

  for (const c of contacts) {
    map.set(c.id, { ...c, children: [] })
  }

  for (const node of map.values()) {
    if (node.managerId && map.has(node.managerId)) {
      map.get(node.managerId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort children recursively
  function sortChildren(nodes: ContactTreeNode[]): ContactTreeNode[] {
    const sorted = sortByTitlePriority(nodes)
    for (const n of sorted) {
      n.children = sortChildren(n.children)
    }
    return sorted
  }

  return sortChildren(roots)
}
