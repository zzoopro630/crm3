import { useState, useMemo } from 'react'
import { useMenuLabels } from '@/hooks/useAppSettings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Search,
  Trash2,
  Phone,
  MessageSquare,
  Copy,
  Pencil,
  Trash,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useTrashContacts,
  useRestoreContact,
  usePermanentDeleteContact,
  useEmptyContactTrash,
  useBulkCreateContacts,
} from '@/hooks/useContacts'
import { ContactFormModal } from '@/components/contacts/ContactFormModal'
import { ContactTrashModal } from '@/components/contacts/ContactTrashModal'
import { ExcelUpload } from '@/components/contacts/ExcelUpload'
import { OrgTree } from '@/components/contacts/OrgTree'
import { buildOrgTree, sortByTitlePriority, getTeamPriority } from '@/utils/contacts/tree'
import { formatPhone } from '@/utils/contacts/excel'
import type { Contact, ContactInput, UpdateContactInput } from '@/types/contact'

export default function ContactsDirectPage() {
  const employee = useAuthStore((s) => s.employee)
  const menuLabels = useMenuLabels()
  const isAdmin = employee?.securityLevel === 'F1'

  const { data: contacts = [], isLoading } = useContacts()
  const { data: trashContacts = [] } = useTrashContacts()
  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact()
  const deleteMutation = useDeleteContact()
  const restoreMutation = useRestoreContact()
  const permanentDeleteMutation = usePermanentDeleteContact()
  const emptyTrashMutation = useEmptyContactTrash()
  const bulkCreateMutation = useBulkCreateContacts()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  // Filter contacts by search
  const filtered = useMemo(() => {
    if (!search) return contacts
    const q = search.toLowerCase()
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        c.team.toLowerCase().includes(q)
    )
  }, [contacts, search])

  // Group by team
  const teamGroups = useMemo(() => {
    const groups = new Map<string, Contact[]>()
    for (const c of filtered) {
      const team = c.team || '미지정'
      if (!groups.has(team)) groups.set(team, [])
      groups.get(team)!.push(c)
    }
    // Sort teams
    const sorted = [...groups.entries()].sort(
      ([a], [b]) => getTeamPriority(a) - getTeamPriority(b)
    )
    // Sort contacts within each team
    return sorted.map(([team, members]) => ({
      team,
      members: sortByTitlePriority(members),
    }))
  }, [filtered])

  // Org tree
  const tree = useMemo(() => buildOrgTree(filtered), [filtered])

  const handleCreate = (data: ContactInput) => {
    createMutation.mutate(data)
  }

  const handleUpdate = (data: ContactInput) => {
    if (!editingContact) return
    updateMutation.mutate({ id: editingContact.id, input: data as UpdateContactInput })
    setEditingContact(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('이 연락처를 삭제하시겠습니까?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleBulkUpload = (contactInputs: ContactInput[], managerNames: Record<string, string>) => {
    bulkCreateMutation.mutate(
      { contacts: contactInputs, managerNames },
      {
        onSuccess: (result) => {
          alert(`${result.success}건 등록, ${result.managersLinked}건 상위자 연결`)
        },
      }
    )
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`
  }
  const handleSms = (phone: string) => {
    window.location.href = `sms:${phone.replace(/\D/g, '')}`
  }
  const handleCopy = (phone: string) => {
    navigator.clipboard.writeText(phone.replace(/\D/g, ''))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{menuLabels['/contacts-direct'] || '연락처'}</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <ExcelUpload onUpload={handleBulkUpload} isLoading={bulkCreateMutation.isPending} />
            <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              휴지통 ({trashContacts.length})
            </Button>
            <Button size="sm" onClick={() => { setEditingContact(null); setFormOpen(true) }}>
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름, 전화번호, 직급, 팀으로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">팀별 목록</TabsTrigger>
          <TabsTrigger value="tree">조직도</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-4">
          {teamGroups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">연락처가 없습니다</p>
          ) : (
            teamGroups.map(({ team, members }) => (
              <div key={team} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                  <h2 className="text-sm font-semibold">{team}</h2>
                  <Badge variant="secondary" className="text-xs">{members.length}</Badge>
                </div>
                <Table>
                  <TableBody>
                    {members.map((c) => (
                      <ContactRow
                        key={c.id}
                        contact={c}
                        isAdmin={isAdmin}
                        onCall={handleCall}
                        onSms={handleSms}
                        onCopy={handleCopy}
                        onEdit={(contact) => {
                          setEditingContact(contact)
                          setFormOpen(true)
                        }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <div className="border rounded-lg p-4">
            <OrgTree tree={tree} />
          </div>
        </TabsContent>
      </Tabs>

      <ContactFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        contacts={contacts}
        onSubmit={editingContact ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ContactTrashModal
        open={trashOpen}
        onOpenChange={setTrashOpen}
        contacts={trashContacts}
        onRestore={(id) => restoreMutation.mutate(id)}
        onPermanentDelete={(id) => {
          if (confirm('완전히 삭제하시겠습니까? 복구할 수 없습니다.')) {
            permanentDeleteMutation.mutate(id)
          }
        }}
        onEmptyTrash={() => {
          if (confirm('휴지통을 비우시겠습니까? 복구할 수 없습니다.')) {
            emptyTrashMutation.mutate()
          }
        }}
        isLoading={restoreMutation.isPending || permanentDeleteMutation.isPending || emptyTrashMutation.isPending}
      />
    </div>
  )
}

// --- Contact Row Sub-Component ---

const TITLE_COLORS: Record<string, string> = {
  대표: 'text-amber-600 dark:text-amber-400',
  총괄이사: 'text-purple-600 dark:text-purple-400',
  사업단장: 'text-blue-600 dark:text-blue-400',
  지점장: 'text-green-600 dark:text-green-400',
  팀장: 'text-teal-600 dark:text-teal-400',
  실장: 'text-sky-600 dark:text-sky-400',
  과장: 'text-indigo-500 dark:text-indigo-400',
  대리: 'text-slate-500 dark:text-slate-400',
}

function ContactRow({
  contact,
  isAdmin,
  onCall,
  onSms,
  onCopy,
  onEdit,
  onDelete,
}: {
  contact: Contact
  isAdmin: boolean
  onCall: (phone: string) => void
  onSms: (phone: string) => void
  onCopy: (phone: string) => void
  onEdit: (contact: Contact) => void
  onDelete: (id: string) => void
}) {
  return (
    <TableRow className="group">
      {/* 이름 + 모바일 직급 */}
      <TableCell className="py-2 px-4 font-medium">
        {contact.name}
        {contact.title && (
          <span className={`sm:hidden ml-1.5 text-xs font-medium ${TITLE_COLORS[contact.title] || 'text-muted-foreground'}`}>
            {contact.title}
          </span>
        )}
      </TableCell>

      {/* 직급 (데스크톱) */}
      <TableCell className="hidden sm:table-cell py-2 px-4">
        {contact.title && (
          <span className={`text-xs font-medium ${TITLE_COLORS[contact.title] || 'text-muted-foreground'}`}>
            {contact.title}
          </span>
        )}
      </TableCell>

      {/* 전화번호 */}
      <TableCell className="py-2 px-4 text-sm text-muted-foreground">
        {formatPhone(contact.phone)}
      </TableCell>

      {/* 전화/SMS/복사 버튼 */}
      <TableCell className="py-2 px-4">
        <div className="flex gap-0.5 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCall(contact.phone)}>
            <Phone className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSms(contact.phone)}>
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hidden sm:inline-flex" onClick={() => onCopy(contact.phone)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>

      {/* 수정/삭제 (F1 전용, hover 시 표시) */}
      {isAdmin && (
        <TableCell className="py-2 px-2 w-[72px]">
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(contact)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(contact.id)}>
              <Trash className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}
