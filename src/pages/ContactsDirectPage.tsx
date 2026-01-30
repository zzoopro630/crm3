import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
        <h1 className="text-2xl font-bold">연락처</h1>
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
              <div key={team}>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  {team}
                  <Badge variant="secondary">{members.length}</Badge>
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((c) => (
                    <ContactCard
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
                </div>
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

// --- Contact Card Sub-Component ---

const TITLE_COLORS: Record<string, string> = {
  대표: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white',
  총괄이사: 'bg-gradient-to-r from-purple-500 to-violet-400 text-white',
  사업단장: 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white',
  지점장: 'bg-gradient-to-r from-green-500 to-emerald-400 text-white',
  팀장: 'bg-gradient-to-r from-teal-500 to-green-400 text-white',
  실장: 'bg-gradient-to-r from-sky-500 to-blue-400 text-white',
  과장: 'bg-gradient-to-r from-indigo-400 to-blue-300 text-white',
  대리: 'bg-gradient-to-r from-slate-400 to-gray-300 text-white',
}

function ContactCard({
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
    <div className="border rounded-lg p-3 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{contact.name}</span>
            {contact.title && (
              <Badge
                variant="secondary"
                className={`text-xs shrink-0 ${TITLE_COLORS[contact.title] || ''}`}
              >
                {contact.title}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatPhone(contact.phone)}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(contact)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(contact.id)}
            >
              <Trash className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-1 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onCall(contact.phone)}
        >
          <Phone className="h-3 w-3 mr-1" />
          전화
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSms(contact.phone)}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          SMS
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onCopy(contact.phone)}
        >
          <Copy className="h-3 w-3 mr-1" />
          복사
        </Button>
      </div>
    </div>
  )
}
