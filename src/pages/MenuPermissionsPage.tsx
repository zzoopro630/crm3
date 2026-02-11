import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSettings, useUpdateSettings } from '@/hooks/useAppSettings';
import { useBoardCategories } from '@/hooks/useBoardCategories';
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
  FileText,
  Zap,
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
  ClipboardList,
} from 'lucide-react';
import type { MenuRole, LevelRoleMap } from '@/types/menuRole';
import { ALL_SECURITY_LEVELS } from '@/types/menuRole';

interface MenuEntry {
  href: string;
  defaultTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  indent?: boolean;
}

// 정적 메뉴 (게시판 제외)
const staticMenuEntries: MenuEntry[] = [
  { href: '/', defaultTitle: '대시보드', icon: LayoutDashboard },
  // 게시판은 동적으로 삽입
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
  { href: '/settings/board-categories', defaultTitle: '게시판 관리', icon: ClipboardList, indent: true },
  { href: '/settings/employees', defaultTitle: '사원 관리', icon: UserCog, indent: true },
  { href: '/settings/approvals', defaultTitle: '승인 대기', icon: Clock, indent: true },
];

// 기본 권한 (API의 DEFAULT_MENU_ROLES와 동일)
const STATIC_DEFAULT_ROLES: Record<string, LevelRoleMap> = {
  "/":                          { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"editor",M2:"editor",M3:"editor" },
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
  "/settings/board-categories": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/employees":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/approvals":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
};

const BOARD_DEFAULT_ROLE: LevelRoleMap = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };

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
  const { data: boardCategories = [] } = useBoardCategories(false);
  const updateSettings = useUpdateSettings();
  const [roles, setRoles] = useState<Record<string, LevelRoleMap>>({});
  const initialized = useRef(false);

  // 동적 메뉴 엔트리 생성
  const menuEntries = useMemo<MenuEntry[]>(() => {
    const boardEntries: MenuEntry[] = boardCategories.map((cat) => ({
      href: `/board/${cat.slug}`,
      defaultTitle: cat.name,
      icon: FileText,
    }));

    // 대시보드 뒤에 게시판 삽입
    const result = [...staticMenuEntries];
    const dashIdx = result.findIndex((e) => e.href === '/');
    result.splice(dashIdx + 1, 0, ...boardEntries);
    return result;
  }, [boardCategories]);

  // 기본 권한 맵 (동적 게시판 포함)
  const DEFAULT_ROLES = useMemo<Record<string, LevelRoleMap>>(() => {
    const map = { ...STATIC_DEFAULT_ROLES };
    for (const cat of boardCategories) {
      map[`/board/${cat.slug}`] = { ...BOARD_DEFAULT_ROLE };
    }
    return map;
  }, [boardCategories]);

  useEffect(() => {
    if (initialized.current || settings.length === 0) return;
    initialized.current = true;

    const map: Record<string, LevelRoleMap> = {};
    for (const entry of menuEntries) {
      map[entry.href] = { ...(DEFAULT_ROLES[entry.href] || {}) };
    }

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
  }, [settings, menuEntries, DEFAULT_ROLES]);

  // 게시판 카테고리 변경 시 새 항목 추가
  useEffect(() => {
    if (!initialized.current) return;
    setRoles((prev) => {
      const next = { ...prev };
      for (const cat of boardCategories) {
        const path = `/board/${cat.slug}`;
        if (!next[path]) {
          next[path] = { ...BOARD_DEFAULT_ROLE };
        }
      }
      return next;
    });
  }, [boardCategories]);

  const setRole = (href: string, level: string, role: MenuRole) => {
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
        {updateSettings.isError && (
          <p className="text-sm text-red-600">저장 실패: {updateSettings.error?.message}</p>
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
