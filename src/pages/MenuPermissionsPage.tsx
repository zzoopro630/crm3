import { useState, useEffect, useRef } from 'react';
import { useAppSettings, useUpdateSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Trash2,
  UsersRound,
  BookUser,
  MessageSquare,
  UserPlus,
  BarChart3,
  Settings,
  Headphones,
} from 'lucide-react';
import { SECURITY_LEVELS } from '@/types/employee';

interface MenuEntry {
  href: string;
  defaultTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  isParent?: boolean;
}

const menuEntries: MenuEntry[] = [
  { href: '/', defaultTitle: '대시보드', icon: LayoutDashboard },
  { href: '/customers', defaultTitle: '고객리스트', icon: Users },
  { href: '/customers/trash', defaultTitle: '휴지통', icon: Trash2 },
  { href: '/inquiries', defaultTitle: '보험문의', icon: Headphones },
  { href: '/consultant-inquiries', defaultTitle: '더플문의', icon: MessageSquare },
  { href: '/recruit-inquiries', defaultTitle: '입사문의', icon: UserPlus },
  { href: '/team', defaultTitle: '팀 관리', icon: UsersRound },
  { href: '/contacts-direct', defaultTitle: '연락처', icon: BookUser },
  { href: '/ads', defaultTitle: '광고 분석', icon: BarChart3, isParent: true },
  { href: '/settings', defaultTitle: '설정', icon: Settings, isParent: true },
];

const securityLevelValues = SECURITY_LEVELS.map((l) => l.value);

export default function MenuPermissionsPage() {
  const { data: settings = [], isLoading } = useAppSettings();
  const updateSettings = useUpdateSettings();
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || settings.length === 0) return;
    initialized.current = true;
    const map: Record<string, string[]> = {};
    for (const s of settings) {
      if (s.key.startsWith('menu_permission:') && s.value) {
        const href = s.key.replace('menu_permission:', '');
        try {
          map[href] = JSON.parse(s.value);
        } catch {
          map[href] = [];
        }
      }
    }
    setPermissions(map);
  }, [settings]);

  const togglePermission = (href: string, level: string) => {
    setPermissions((prev) => {
      const current = prev[href] || securityLevelValues;
      if (current.includes(level)) {
        return { ...prev, [href]: current.filter((l) => l !== level) };
      } else {
        return { ...prev, [href]: [...current, level] };
      }
    });
  };

  const handleSave = () => {
    const items = menuEntries.map((entry) => ({
      key: `menu_permission:${entry.href}`,
      value: permissions[entry.href] ? JSON.stringify(permissions[entry.href]) : null,
    }));
    updateSettings.mutate(items);
  };

  if (isLoading) return <div className="p-4">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">메뉴 권한 관리</h2>
        <p className="text-sm text-muted-foreground">
          보안등급별 메뉴 접근 권한을 설정합니다. 체크된 등급만 해당 메뉴에 접근할 수 있습니다.
        </p>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium min-w-[160px]">메뉴</th>
              {securityLevelValues.map((level) => (
                <th key={level} className="text-center px-3 py-3 font-medium w-16">
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menuEntries.map((entry) => {
              const currentPermissions = permissions[entry.href] || securityLevelValues;
              return (
                <tr key={entry.href} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <entry.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{entry.defaultTitle}</span>
                    </div>
                  </td>
                  {securityLevelValues.map((level) => (
                    <td key={level} className="text-center px-3 py-3">
                      <input
                        type="checkbox"
                        checked={currentPermissions.includes(level)}
                        onChange={() => togglePermission(entry.href, level)}
                        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} disabled={updateSettings.isPending}>
        {updateSettings.isPending ? '저장 중...' : '저장'}
      </Button>

      {updateSettings.isSuccess && (
        <p className="text-sm text-green-600">저장되었습니다.</p>
      )}
    </div>
  );
}
