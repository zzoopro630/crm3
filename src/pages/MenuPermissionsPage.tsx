import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSettings, useUpdateSettings } from '@/hooks/useAppSettings';
import { useBoardCategories } from '@/hooks/useBoardCategories';
import { usePages } from '@/hooks/usePages';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Cog,
  UserCog,
  Clock,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';
import type { MenuRole, LevelRoleMap } from '@/types/menuRole';
import { ALL_SECURITY_LEVELS } from '@/types/menuRole';
import type { BoardCategory } from '@/types/boardCategory';
import type { Page } from '@/types/page';

interface MenuEntry {
  href: string;
  defaultTitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuSection {
  title: string;
  entries: MenuEntry[];
}

// 정적 메뉴 섹션 (사이드바 그룹과 동일)
const staticMenuSections: MenuSection[] = [
  {
    title: '대시보드',
    entries: [
      { href: '/', defaultTitle: '대시보드', icon: LayoutDashboard },
    ],
  },
  // 게시판 섹션은 동적으로 삽입 (index 1)
  {
    title: '고객관리',
    entries: [
      { href: '/customers', defaultTitle: '고객리스트', icon: Users },
      { href: '/customers/trash', defaultTitle: '휴지통', icon: Trash2 },
    ],
  },
  {
    title: '상담관리',
    entries: [
      { href: '/inquiries', defaultTitle: '보험문의', icon: Headphones },
      { href: '/consultant-inquiries', defaultTitle: '더플문의', icon: MessageSquare },
      { href: '/recruit-inquiries', defaultTitle: '입사문의', icon: UserPlus },
    ],
  },
  {
    title: '업무',
    entries: [
      { href: '/team', defaultTitle: '팀 관리', icon: UsersRound },
      { href: '/contacts-direct', defaultTitle: '연락처', icon: BookUser },
    ],
  },
  {
    title: '신청/주문',
    entries: [
      { href: '/orders/lead', defaultTitle: '보험 리드', icon: FileText },
      { href: '/orders/card', defaultTitle: '명함 신청', icon: FileText },
      { href: '/orders/lead/admin', defaultTitle: '주문 관리', icon: ClipboardList },
      { href: '/orders/card/admin', defaultTitle: '명함 관리', icon: ClipboardList },
    ],
  },
  {
    title: '광고 분석',
    entries: [
      { href: '/ads/ndata', defaultTitle: 'N-DATA', icon: BarChart3 },
      { href: '/ads/powerlink', defaultTitle: '파워링크', icon: Zap },
      { href: '/ads/report', defaultTitle: '보고서', icon: FileText },
      { href: '/ads/weekly', defaultTitle: '주간데이터', icon: TrendingUp },
      { href: '/ads/rank-dashboard', defaultTitle: '순위 대시보드', icon: LayoutDashboard },
      { href: '/ads/rank-keywords', defaultTitle: '사이트/키워드', icon: Search },
      { href: '/ads/rank-urls', defaultTitle: 'URL 추적', icon: Link2 },
      { href: '/ads/rank-history', defaultTitle: '순위 기록', icon: History },
    ],
  },
  {
    title: '설정',
    entries: [
      { href: '/settings/organizations', defaultTitle: '조직 관리', icon: Building2 },
      { href: '/settings/labels', defaultTitle: '라벨 관리', icon: Tag },
      { href: '/settings/app-settings', defaultTitle: '앱 설정', icon: Cog },
      { href: '/settings/menu-permissions', defaultTitle: '메뉴 권한', icon: ShieldCheck },
      { href: '/settings/board-categories', defaultTitle: '게시판 관리', icon: ClipboardList },
      { href: '/settings/pages', defaultTitle: '페이지 관리', icon: FileText },
      { href: '/settings/employees', defaultTitle: '사원 관리', icon: UserCog },
      { href: '/settings/approvals', defaultTitle: '승인 대기', icon: Clock },
    ],
  },
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
  "/settings/app-settings":     { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/menu-permissions": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/board-categories": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/pages":            { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/orders/lead":               { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"editor",M2:"editor",M3:"editor" },
  "/orders/card":               { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"editor",M2:"editor",M3:"editor" },
  "/orders/lead/admin":         { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/orders/card/admin":         { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/employees":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/approvals":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
};

const BOARD_DEFAULT_ROLE: LevelRoleMap = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };
const PAGE_DEFAULT_ROLE: LevelRoleMap = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };

const ROLE_OPTIONS: { value: MenuRole; label: string }[] = [
  { value: 'none', label: '비활성' },
  { value: 'viewer', label: '뷰어' },
  { value: 'editor', label: '편집자' },
];

const EMPTY_BOARD_CATEGORIES: BoardCategory[] = [];
const EMPTY_PAGES: Page[] = [];

const ROLE_COLORS: Record<MenuRole, string> = {
  none: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
  viewer: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  editor: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
};

// Select 트리거 테두리 색상
const ROLE_BORDER_COLORS: Record<MenuRole, string> = {
  none: 'border-zinc-300 dark:border-zinc-600',
  viewer: 'border-blue-300 dark:border-blue-700',
  editor: 'border-green-300 dark:border-green-700',
};

export default function MenuPermissionsPage() {
  const { data: settings = [], isLoading: settingsLoading } = useAppSettings();
  const { data: boardCategories = EMPTY_BOARD_CATEGORIES, isLoading: boardLoading } = useBoardCategories(false);
  const { data: allPages = EMPTY_PAGES, isLoading: pagesLoading } = usePages(true);
  const updateSettings = useUpdateSettings();
  const [roles, setRoles] = useState<Record<string, LevelRoleMap>>({});
  const [selectedLevel, setSelectedLevel] = useState<string>('F1');
  const initialized = useRef(false);

  // 동적 메뉴 섹션 생성 (게시판 + 페이지 포함)
  const menuSections = useMemo<MenuSection[]>(() => {
    const boardEntries: MenuEntry[] = boardCategories.map((cat) => ({
      href: `/board/${cat.slug}`,
      defaultTitle: cat.name,
      icon: FileText,
    }));

    const pageEntries: MenuEntry[] = allPages.map((p) => ({
      href: `/page/${p.slug}`,
      defaultTitle: p.title,
      icon: FileText,
    }));

    const result = [...staticMenuSections];
    let insertIdx = 1;
    if (boardEntries.length > 0) {
      result.splice(insertIdx, 0, { title: '게시판', entries: boardEntries });
      insertIdx++;
    }
    if (pageEntries.length > 0) {
      result.splice(insertIdx, 0, { title: '페이지', entries: pageEntries });
    }
    return result;
  }, [boardCategories, allPages]);

  // 전체 메뉴 엔트리 (저장용 flat 리스트)
  const allEntries = useMemo(
    () => menuSections.flatMap((s) => s.entries),
    [menuSections],
  );

  // 기본 권한 맵 (동적 게시판 + 페이지 포함)
  const DEFAULT_ROLES = useMemo<Record<string, LevelRoleMap>>(() => {
    const map = { ...STATIC_DEFAULT_ROLES };
    for (const cat of boardCategories) {
      map[`/board/${cat.slug}`] = { ...BOARD_DEFAULT_ROLE };
    }
    for (const p of allPages) {
      map[`/page/${p.slug}`] = { ...PAGE_DEFAULT_ROLE };
    }
    return map;
  }, [boardCategories, allPages]);

  useEffect(() => {
    if (initialized.current || settingsLoading || boardLoading || pagesLoading) return;
    if (settings.length === 0) return;
    initialized.current = true;

    const map: Record<string, LevelRoleMap> = {};
    for (const entry of allEntries) {
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
  }, [settings, allEntries, DEFAULT_ROLES, settingsLoading, boardLoading, pagesLoading]);

  // 게시판 카테고리 변경 시 새 항목 추가
  useEffect(() => {
    if (!initialized.current) return;
    setRoles((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const cat of boardCategories) {
        const path = `/board/${cat.slug}`;
        if (!next[path]) {
          next[path] = { ...BOARD_DEFAULT_ROLE };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [boardCategories]);

  const setRole = (href: string, level: string, role: MenuRole) => {
    if (level === 'F1') return;
    setRoles((prev) => ({
      ...prev,
      [href]: { ...prev[href], [level]: role },
    }));
  };

  const handleSave = () => {
    const items = allEntries
      .filter((entry) => roles[entry.href])
      .map((entry) => ({
        key: `menu_role:${entry.href}`,
        value: JSON.stringify(roles[entry.href]),
      }));
    updateSettings.mutate(items);
  };

  // 선택 등급의 권한 요약 (좌측 카드용)
  const summary = useMemo(() => {
    const groups: Record<MenuRole, { section: string; title: string }[]> = {
      editor: [], viewer: [], none: [],
    };
    for (const section of menuSections) {
      for (const entry of section.entries) {
        const menuRoles = roles[entry.href] || DEFAULT_ROLES[entry.href] || {};
        const role = (menuRoles[selectedLevel] || 'none') as MenuRole;
        groups[role].push({ section: section.title, title: entry.defaultTitle });
      }
    }
    return groups;
  }, [menuSections, roles, selectedLevel, DEFAULT_ROLES]);

  if (settingsLoading || boardLoading) return <div className="p-4">로딩 중...</div>;

  const summaryGroups: { key: MenuRole; label: string; color: string; badge: string }[] = [
    { key: 'editor', label: '편집자', color: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
    { key: 'viewer', label: '뷰어', color: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    { key: 'none', label: '비활성', color: 'text-zinc-400 dark:text-zinc-500', badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">메뉴 권한 관리</h2>
        <p className="text-sm text-muted-foreground">
          보안등급별 메뉴 접근 권한을 설정합니다. 등급 탭을 선택한 후 각 메뉴의 권한을 변경하세요.
        </p>
      </div>

      <Tabs value={selectedLevel} onValueChange={setSelectedLevel}>
        <TabsList className="w-full flex-wrap">
          {ALL_SECURITY_LEVELS.map((level) => (
            <TabsTrigger key={level} value={level} className="flex-1 min-w-[3rem]">
              {level}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_SECURITY_LEVELS.map((level) => {
          const isF1 = level === 'F1';
          return (
            <TabsContent key={level} value={level}>
              {isF1 && (
                <p className="text-xs text-muted-foreground mb-3">
                  F1(최고 관리자)은 모든 메뉴에 편집자 권한이 부여되며 변경할 수 없습니다.
                </p>
              )}

              <div className="flex gap-6">
                {/* 좌측 요약 카드 */}
                <div className="hidden lg:block w-[280px] shrink-0 sticky top-4 self-start">
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="text-center">
                      <span className="text-3xl font-bold">{selectedLevel}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedLevel.startsWith('F') ? '영업등급' : '마케팅등급'}
                      </p>
                    </div>

                    <div className="border-t pt-3 space-y-3">
                      {summaryGroups.map(({ key, label, color, badge }) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-semibold ${color}`}>{label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge}`}>
                              {summary[key].length}
                            </span>
                          </div>
                          {summary[key].length > 0 ? (
                            <div className="space-y-0.5">
                              {summary[key].map((item) => (
                                <p key={`${item.section}-${item.title}`} className="text-xs text-muted-foreground truncate">
                                  {item.section} &gt; {item.title}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 italic">없음</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 우측 메뉴 설정 */}
                <div className="flex-1 space-y-4">
                  {menuSections.map((section) => (
                    <div key={section.title} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 text-sm font-semibold text-foreground">
                        {section.title}
                      </div>
                      <div className="divide-y">
                        {section.entries.map((entry, idx) => {
                          const menuRoles = roles[entry.href] || DEFAULT_ROLES[entry.href] || {};
                          const role = (menuRoles[level] || 'none') as MenuRole;
                          return (
                            <div
                              key={entry.href}
                              className={`flex items-center justify-between px-3 py-2 gap-3 ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <entry.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm truncate">{entry.defaultTitle}</span>
                              </div>
                              <Select
                                value={role}
                                onValueChange={(v) => setRole(entry.href, level, v as MenuRole)}
                                disabled={isF1}
                              >
                                <SelectTrigger
                                  size="sm"
                                  className={`w-[110px] text-xs font-medium ${ROLE_COLORS[role]} ${ROLE_BORDER_COLORS[role]} ${isF1 ? 'opacity-60' : ''}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* 저장 버튼 + 범례 */}
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
                        비활성
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
