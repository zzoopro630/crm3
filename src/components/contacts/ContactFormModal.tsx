import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JOB_TITLES } from '@/types/contact'
import type { Contact, ContactInput } from '@/types/contact'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact | null
  contacts: Contact[]
  onSubmit: (data: ContactInput) => void
  isLoading?: boolean
}

export function ContactFormModal({
  open,
  onOpenChange,
  contact,
  contacts,
  onSubmit,
  isLoading,
}: Props) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<ContactInput>({
    defaultValues: {
      name: '',
      title: null,
      team: '미지정',
      phone: '',
      managerId: null,
      employeeId: null,
    },
  })

  const isEdit = !!contact

  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
        title: contact.title,
        team: contact.team,
        phone: contact.phone,
        managerId: contact.managerId,
        employeeId: contact.employeeId,
      })
    } else {
      reset({
        name: '',
        title: null,
        team: '미지정',
        phone: '',
        managerId: null,
        employeeId: null,
      })
    }
  }, [contact, reset])

  const handleFormSubmit = (data: ContactInput) => {
    onSubmit(data)
    onOpenChange(false)
  }

  const managerOptions = contacts.filter((c) => !contact || c.id !== contact.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '연락처 수정' : '연락처 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>직급</Label>
            <Select
              value={watch('title') || '__none__'}
              onValueChange={(v) => setValue('title', v === '__none__' ? null : (v as ContactInput['title']))}
            >
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">없음</SelectItem>
                {JOB_TITLES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">팀</Label>
            <Input id="team" {...register('team')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">전화번호 *</Label>
            <Input id="phone" {...register('phone', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>상위자</Label>
            <Select
              value={watch('managerId') || '__none__'}
              onValueChange={(v) => setValue('managerId', v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">없음</SelectItem>
                {managerOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.title ? `(${c.title})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isEdit ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
