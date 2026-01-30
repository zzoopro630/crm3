import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RotateCcw, Trash2 } from 'lucide-react'
import type { Contact } from '@/types/contact'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  onRestore: (id: string) => void
  onPermanentDelete: (id: string) => void
  onEmptyTrash: () => void
  isLoading?: boolean
}

export function ContactTrashModal({
  open,
  onOpenChange,
  contacts,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  isLoading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>휴지통 ({contacts.length})</span>
            {contacts.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onEmptyTrash}
                disabled={isLoading}
              >
                전체 삭제
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {contacts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            휴지통이 비어있습니다
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.title && `${c.title} · `}{c.phone}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRestore(c.id)}
                    disabled={isLoading}
                    title="복원"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPermanentDelete(c.id)}
                    disabled={isLoading}
                    title="완전 삭제"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
