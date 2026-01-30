import { useState } from 'react'
import { ChevronRight, ChevronDown, Phone, MessageSquare, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ContactTreeNode } from '@/types/contact'
import { formatPhone } from '@/utils/contacts/excel'

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

function TreeNode({ node, depth = 0 }: { node: ContactTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  const handleCall = () => {
    window.location.href = `tel:${node.phone.replace(/\D/g, '')}`
  }
  const handleSms = () => {
    window.location.href = `sms:${node.phone.replace(/\D/g, '')}`
  }
  const handleCopy = () => {
    navigator.clipboard.writeText(node.phone.replace(/\D/g, ''))
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-0.5 rounded hover:bg-muted"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium truncate">{node.name}</span>
          {node.title && (
            <Badge
              variant="secondary"
              className={`text-xs shrink-0 ${TITLE_COLORS[node.title] || ''}`}
            >
              {node.title}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground truncate">
            {formatPhone(node.phone)}
          </span>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCall} title="전화">
            <Phone className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSms} title="SMS">
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="복사">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded &&
        node.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  )
}

interface Props {
  tree: ContactTreeNode[]
}

export function OrgTree({ tree }: Props) {
  if (tree.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">연락처가 없습니다</p>
    )
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </div>
  )
}
