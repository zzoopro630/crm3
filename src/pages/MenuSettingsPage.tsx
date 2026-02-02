import { useState, useEffect } from 'react';
import { useAppSettings, useUpdateSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  Users,
  Database,
  Trash2,
  UsersRound,
  BookUser,
  MessageSquare,
  UserPlus,
  BarChart3,
  Settings,
} from 'lucide-react';

interface MenuEntry {
  href: string;
  defaultTitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuEntries: MenuEntry[] = [
  { href: '/', defaultTitle: '대시보드', icon: LayoutDashboard },
  { href: '/customers', defaultTitle: '고객 관리', icon: Users },
  { href: '/db-management', defaultTitle: '상담관리', icon: Database },
  { href: '/trash', defaultTitle: '휴지통', icon: Trash2 },
  { href: '/team', defaultTitle: '팀 관리', icon: UsersRound },
  { href: '/contacts-direct', defaultTitle: '연락처', icon: BookUser },
  { href: '/consultant-inquiries', defaultTitle: 'the-fin 문의', icon: MessageSquare },
  { href: '/recruit-inquiries', defaultTitle: '입사문의', icon: UserPlus },
  { href: '/ads', defaultTitle: '광고 분석', icon: BarChart3 },
  { href: '/settings', defaultTitle: '설정', icon: Settings },
];

export default function MenuSettingsPage() {
  const { data: settings = [], isLoading } = useAppSettings();
  const updateSettings = useUpdateSettings();
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const s of settings) {
      if (s.key.startsWith('menu_label:') && s.value) {
        const href = s.key.replace('menu_label:', '');
        map[href] = s.value;
      }
    }
    setLabels(map);
  }, [settings]);

  const handleSave = () => {
    const items = menuEntries.map((entry) => ({
      key: `menu_label:${entry.href}`,
      value: labels[entry.href]?.trim() || null,
    }));
    updateSettings.mutate(items);
  };

  if (isLoading) return <div className="p-4">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">메뉴 이름 관리</h2>
        <p className="text-sm text-muted-foreground">
          사이드바에 표시되는 메뉴 이름을 변경합니다. 비워두면 기본 이름이 사용됩니다.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">메뉴</th>
              <th className="text-left px-4 py-3 font-medium">기본 이름</th>
              <th className="text-left px-4 py-3 font-medium">커스텀 이름</th>
            </tr>
          </thead>
          <tbody>
            {menuEntries.map((entry) => (
              <tr key={entry.href} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <entry.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{entry.defaultTitle}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entry.defaultTitle}
                </td>
                <td className="px-4 py-3">
                  <Input
                    value={labels[entry.href] || ''}
                    onChange={(e) =>
                      setLabels((prev) => ({
                        ...prev,
                        [entry.href]: e.target.value,
                      }))
                    }
                    placeholder={entry.defaultTitle}
                    className="max-w-[200px]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateSettings.isPending}
      >
        {updateSettings.isPending ? '저장 중...' : '저장'}
      </Button>

      {updateSettings.isSuccess && (
        <p className="text-sm text-green-600">저장되었습니다.</p>
      )}
    </div>
  );
}
