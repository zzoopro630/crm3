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
  Headphones,
  Megaphone,
  FolderOpen,
  Zap,
  FileText,
  TrendingUp,
  Search,
  Link2,
  History,
  Building2,
  Tag,
  LayoutList,
  UserCog,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { MenuRole, LevelRoleMap } from '@/types/menuRole';
import { ALL_SECURITY_LEVELS } from '@/types/menuRole';

interface MenuEntry {
  href: string;
  defaultTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  indent?: boolean; // 서브메뉴 들여쓰기
}

const menuEntries: MenuEntry[] = [
  { href: '/', defaultTitle: '대시보드', icon: LayoutDashboard },
  { href: '/notices', defaultTitle: '공지사항', icon: Megaphone },
  { href: '/resources', defaultTitle: '자료실', icon: FolderOpen },
  { href: '/customers', defaultTitle: '고객리스트', icon: Users },
  { href: '/customers/trash', defaultTitle: '휴지통', icon: Trash2, indent: true },
  { href: '/inquiries', defaultTitle: '보험문의', icon: Headphones },
  { href: '/consultant-inquiries', defaultTitle: '더플문의', icon: MessageSquare },
  { href: '/recruit-inquiries', defaultTitle: '입사문의', icon: UserPlus },
  { href: '/team', defaultTitle: '팀 관리', icon: UsersRound },
  { href: '/contacts-direct', defaultTitle: '연락처', icon: BookUser },
  { href: '/ads/ndata', defaultTitle: 'N-DATA', icon: BarChart3, indent: true },
  { href: '/ads/powerlink', defaultTitle: '파워링크', icon: Zap, indent: true },
  { href: '/ads/report', defaultTitle: '보고서', icon: FileText, indent: true },
  { href: '/ads/weekly', defaultTitle: '주간데이터', icon: TrendingUp, indent: true },
  { href: '/ads/rank-dashboard', defaultTitle: '순위 대시보드', icon: LayoutDashboard, indent: true },
  { href: '/ads/rank-keywords', defaultTitle: '사이트/키워드', icon: Search, indent: true },
  { href: '/ads/rank-urls', defaultTitle: 'URL 추적', icon: Link2, indent: true },
  { href: '/ads/rank-history', defaultTitle: '순위 기록', icon: History, indent: true },
  { href: '/settings/organizations', defaultTitle: '조직 관리', icon: Building2, indent: true },
  { href: '/settings/labels', defaultTitle: '라벨 관리', icon: Tag, indent: true },
  { href: '/settings/menus', defaultTitle: '메뉴 관리', icon: LayoutList, indent: true },
  { href: '/settings/menu-permissions', defaultTitle: '메뉴 권한', icon: ShieldCheck, indent: true },
  { href: '/settings/employees', defaultTitle: '사원 관리', icon: UserCog, indent: true },
  { href: '/settings/approvals', defaultTitle: '승인 대기', icon: Clock, indent: true },
];

// 기본 권한 (API의 DEFAULT_MENU_ROLES와 동일)
const DEFAULT_ROLES: Record<string, LevelRoleMap> = {
  "/":                          { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"editor",M2:"editor",M3:"editor" },
  "/notices":                   { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" },
  "/resources":                 { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" },
  "/customers":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"none",M2:"none",M3:"none" },
  "/customers/trash":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/inquiries":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
  "/consultant-inquiries":      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
  "/recruit-inquiries":         { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"none",M3:"none" },
  "/team":                      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"viewer",M3:"viewer" },
  "/contacts-direct":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/ads/ndata":                 { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/powerlink":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/report":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/weekly":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-dashboard":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-keywords":         { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-urls":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-history":          { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/settings/organizations":    { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"none",M2:"none",M3:"none" },
  "/settings/labels":           { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/menus":            { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/menu-permissions": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/employees":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/approvals":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
};

const ROLE_OPTIONS: { value: MenuRole; label: string; short: string }[] = [
  { value: 'none', label: '접근불가', short: 'N' },
  { value: 'viewer', label: '뷰어', short: 'V' },
  { value: 'editor', label: '편집자', short: 'E' },
];

const ROLE_COLORS: Record<MenuRole, string> = {
  none: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
  viewer: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  editor: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
};

export default function MenuPermissionsPage() {
  const { data: settings = [], isLoading } = useAppSettings();
  const updateSettings = useUpdateSettings();
  // roles: { [href]: { [level]: MenuRole } }
  const [roles, setRoles] = useState<Record<string, LevelRoleMap>>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || settings.length === 0) return;
    initialized.current = true;

    // 기본값으로 초기화
    const map: Record<string, LevelRoleMap> = {};
    for (const entry of menuEntries) {
      map[entry.href] = { ...(DEFAULT_ROLES[entry.href] || {}) };
    }

    // app_settings에서 menu_role: 키 로드
    for (const s of settings) {
      if (s.key.startsWith('menu_role:') && s.value) {
        const href = s.key.replace('menu_role:', '');
        try {
          const parsed = JSON.parse(s.value) as LevelRoleMap;
          if (map[href]) {
            map[href] = { ...map[href], ...parsed };
          }
        } catch { /* ignore */ }
      }
    }

    setRoles(map);
  }, [settings]);

  const setRole = (href: string, level: string, role: MenuRole) => {
    // F1은 항상 editor 강제
    if (level === 'F1') return;

    setRoles((prev) => ({
      ...prev,
      [href]: { ...prev[href], [level]: role },
    }));
  };

  const cycleRole = (href: string, level: string) => {
    if (level === 'F1') return;
    const current = roles[href]?.[level] || 'none';
    const idx = ROLE_OPTIONS.findIndex((o) => o.value === current);
    const next = ROLE_OPTIONS[(idx + 1) % ROLE_OPTIONS.length].value;
    setRole(href, level, next);
  };

  const handleSave = () => {
    const items = menuEntries.map((entry) => ({
      key: `menu_role:${entry.href}`,
      value: roles[entry.href] ? JSON.stringify(roles[entry.href]) : null,
    }));
    updateSettings.mutate(items);
  };

  if (isLoading) return <div className="p-4">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">메뉴 권한 관리</h2>
        <p className="text-sm text-muted-foreground">
          보안등급별 메뉴 접근 권한을 설정합니다. 셀을 클릭하면 N(접근불가) → V(뷰어) → E(편집자) 순으로 변경됩니다.
        </p>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium min-w-[180px] sticky left-0 bg-muted/50 z-10">메뉴</th>
              {ALL_SECURITY_LEVELS.map((level) => (
                <th key={level} className="text-center px-2 py-3 font-medium w-14">
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menuEntries.map((entry) => {
              const menuRoles = roles[entry.href] || DEFAULT_ROLES[entry.href] || {};
              return (
                <tr key={entry.href} className="border-t hover:bg-muted/20">
                  <td className={`px-4 py-2.5 sticky left-0 bg-card z-10 ${entry.indent ? 'pl-8' : ''}`}>
                    <div className="flex items-center gap-2">
                      <entry.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate text-sm">{entry.defaultTitle}</span>
                    </div>
                  </td>
                  {ALL_SECURITY_LEVELS.map((level) => {
                    const role = (menuRoles[level] || 'none') as MenuRole;
                    const isF1 = level === 'F1';
                    return (
                      <td key={level} className="text-center px-1 py-1.5">
                        <button
                          onClick={() => cycleRole(entry.href, level)}
                          disabled={isF1}
                          className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-semibold transition-colors ${ROLE_COLORS[role]} ${
                            isF1 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-primary/30'
                          }`}
                          title={`${entry.defaultTitle} - ${level}: ${ROLE_OPTIONS.find(o => o.value === role)?.label}`}
                        >
                          {ROLE_OPTIONS.find((o) => o.value === role)?.short}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? '저장 중...' : '저장'}
        </Button>
        {updateSettings.isSuccess && (
          <p className="text-sm text-green-600">저장되었습니다.</p>
        )}
        <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className={`inline-block w-6 h-5 rounded text-center leading-5 font-semibold ${ROLE_COLORS.editor}`}>E</span>
            편집자
          </span>
          <span className="flex items-center gap-1">
            <span className={`inline-block w-6 h-5 rounded text-center leading-5 font-semibold ${ROLE_COLORS.viewer}`}>V</span>
            뷰어
          </span>
          <span className="flex items-center gap-1">
            <span className={`inline-block w-6 h-5 rounded text-center leading-5 font-semibold ${ROLE_COLORS.none}`}>N</span>
            접근불가
          </span>
        </div>
      </div>
    </div>
  );
}
