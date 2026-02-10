import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Settings,
  ChevronLeft,
  Menu,
  ChevronDown,
  ChevronRight,
  Trash2,
  BarChart3,
  BookUser,
  MessageSquare,
  UserPlus,
  FileText,
  TrendingUp,
  Megaphone,
  Building2,
  Tag,
  LayoutList,
  UserCog,
  Clock,
  Zap,
  ShieldCheck,
  FolderOpen,
  Headphones,
  Search,
  Link2,
  History,
} from "lucide-react";
import type { SecurityLevel } from "@/types/employee";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useMenuLabels } from "@/hooks/useAppSettings";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedLevels?: SecurityLevel[];
  allowedOrgs?: string[];
  isSubmenu?: boolean;
  submenuItems?: NavItem[];
}

// 섹션 타입 정의
interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  // 대시보드 (섹션 제목 없음)
  {
    items: [
      { title: "대시보드", href: "/", icon: LayoutDashboard },
    ],
  },
  // 게시판
  {
    title: "게시판",
    items: [
      { title: "공지사항", href: "/notices", icon: Megaphone },
      { title: "자료실", href: "/resources", icon: FolderOpen },
    ],
  },
  // 고객관리 섹션
  {
    title: "고객관리",
    items: [
      { title: "고객리스트", href: "/customers", icon: Users },
      {
        title: "휴지통",
        href: "/customers/trash",
        icon: Trash2,
        allowedLevels: ["F1", "F2"],
      },
    ],
  },
  // 상담관리 섹션
  {
    title: "상담관리",
    items: [
      {
        title: "보험문의",
        href: "/inquiries",
        icon: Headphones,
        allowedLevels: ["F1", "F2", "F3", "F4", "F5"],
      },
      {
        title: "더플문의",
        href: "/consultant-inquiries",
        icon: MessageSquare,
        allowedLevels: ["F1", "F2", "F3", "F4", "F5"],
      },
      {
        title: "입사문의",
        href: "/recruit-inquiries",
        icon: UserPlus,
        allowedLevels: ["F1", "F2"],
      },
    ],
  },
  // 팀 관리
  {
    items: [
      {
        title: "팀 관리",
        href: "/team",
        icon: UsersRound,
        allowedLevels: ["F1", "F2", "F3", "F4", "F5"],
      },
      {
        title: "연락처",
        href: "/contacts-direct",
        icon: BookUser,
        allowedOrgs: ["직할"],
      },
    ],
  },
  // 광고 분석
  {
    items: [
      {
        title: "광고 분석",
        href: "/ads",
        icon: BarChart3,
        allowedLevels: ["F1"],
        isSubmenu: true,
        submenuItems: [
          {
            title: "N-DATA",
            href: "/ads/ndata",
            icon: BarChart3,
            allowedLevels: ["F1"],
          },
          {
            title: "파워링크",
            href: "/ads/powerlink",
            icon: Zap,
            allowedLevels: ["F1"],
          },
          {
            title: "보고서",
            href: "/ads/report",
            icon: FileText,
            allowedLevels: ["F1"],
          },
          {
            title: "주간데이터",
            href: "/ads/weekly",
            icon: TrendingUp,
            allowedLevels: ["F1"],
          },
          {
            title: "순위 대시보드",
            href: "/ads/rank-dashboard",
            icon: LayoutDashboard,
            allowedLevels: ["F1"],
          },
          {
            title: "사이트/키워드",
            href: "/ads/rank-keywords",
            icon: Search,
            allowedLevels: ["F1"],
          },
          {
            title: "URL 추적",
            href: "/ads/rank-urls",
            icon: Link2,
            allowedLevels: ["F1"],
          },
          {
            title: "순위 기록",
            href: "/ads/rank-history",
            icon: History,
            allowedLevels: ["F1"],
          },
        ],
      },
    ],
  },
  // 설정
  {
    items: [
      {
        title: "설정",
        href: "/settings",
        icon: Settings,
        isSubmenu: true,
        submenuItems: [
          {
            title: "조직 관리",
            href: "/settings/organizations",
            icon: Building2,
            allowedLevels: ["F1", "F2", "F3", "F4", "F5"],
          },
          {
            title: "라벨 관리",
            href: "/settings/labels",
            icon: Tag,
            allowedLevels: ["F1"],
          },
          {
            title: "메뉴 관리",
            href: "/settings/menus",
            icon: LayoutList,
            allowedLevels: ["F1"],
          },
          {
            title: "메뉴 권한",
            href: "/settings/menu-permissions",
            icon: ShieldCheck,
            allowedLevels: ["F1"],
          },
          {
            title: "사원 관리",
            href: "/settings/employees",
            icon: UserCog,
            allowedLevels: ["F1"],
          },
          {
            title: "승인 대기",
            href: "/settings/approvals",
            icon: Clock,
            allowedLevels: ["F1"],
          },
        ],
      },
    ],
  },
];

// 기존 navItems 형태로 변환 (호환성 유지)
const navItems: NavItem[] = navSections.flatMap((section) => section.items);

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
  onNavigateToMainMenu?: () => void;
  onMouseLeave?: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  isCollapsed = false,
  onCollapseToggle,
  onNavigateToMainMenu,
  onMouseLeave,
}: SidebarProps) {
  const location = useLocation();
  const { employee } = useAuthStore();
  const { data: organizations = [] } = useOrganizations();
  const menuLabels = useMenuLabels();

  // 모바일에서는 축소 상태를 무시하고 항상 풀 메뉴 표시
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 축소 사이드바 호버 시 펼침
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const effectiveCollapsed = isDesktop && isCollapsed && !hoverExpanded;

  // 현재 경로가 하위 메뉴에 속하는지 확인
  const isInSubmenu = (item: NavItem): boolean => {
    if (!item.submenuItems) return false;
    return item.submenuItems.some(
      (subItem) =>
        location.pathname === subItem.href ||
        location.pathname.startsWith(subItem.href + "/")
    );
  };

  // 현재 경로가 서브메뉴 영역인지 확인 (어떤 서브메뉴든)
  const isInAnySubmenu = navItems.some(
    (item) => item.submenuItems && isInSubmenu(item)
  );

  // 현재 활성화된 메뉴 아이템 찾기
  const getActiveItem = (): NavItem | null => {
    for (const item of navItems) {
      if (item.submenuItems) {
        const activeSubItem = item.submenuItems.find(
          (subItem) =>
            location.pathname === subItem.href ||
            location.pathname.startsWith(subItem.href + "/")
        );
        if (activeSubItem) return activeSubItem;
      } else if (
        location.pathname === item.href ||
        location.pathname.startsWith(item.href + "/")
      ) {
        return item;
      }
    }
    return null;
  };

  // 사원의 소속 조직명 조회
  const employeeOrgName = employee?.organizationId
    ? organizations.find((o) => o.id === employee.organizationId)?.name || ''
    : '';

  // 아이템 필터링 함수
  const filterItem = (item: NavItem): boolean => {
    if (!employee) return false;
    if (
      item.allowedLevels &&
      !item.allowedLevels.includes(employee.securityLevel)
    )
      return false;
    // allowedOrgs: F1은 무조건 통과, 그 외는 소속 조직명 매칭
    if (item.allowedOrgs) {
      if (employee.securityLevel === 'F1') return true;
      if (!item.allowedOrgs.some((org) => employeeOrgName.includes(org)))
        return false;
    }
    return true;
  };

  // 섹션별 필터링
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter(filterItem)
        .map((item) => {
          if (item.submenuItems) {
            return {
              ...item,
              submenuItems: item.submenuItems.filter(filterItem),
            };
          }
          return item;
        })
        .filter((item) => !item.submenuItems || item.submenuItems.length > 0),
    }))
    .filter((section) => section.items.length > 0);

  const activeItem = getActiveItem();

  // 서브메뉴 열림/닫힘 상태 관리 (데스크탑용)
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(() => {
    // 초기값: 현재 경로에 해당하는 서브메뉴는 열린 상태
    const initial = new Set<string>();
    for (const item of navItems) {
      if (item.submenuItems && isInSubmenu(item)) {
        initial.add(item.href);
      }
    }
    return initial;
  });

  // 경로 변경 시 해당 서브메뉴 자동 열기
  useEffect(() => {
    for (const item of navItems) {
      if (item.submenuItems && isInSubmenu(item)) {
        setOpenSubmenus((prev) => new Set(prev).add(item.href));
      }
    }
  }, [location.pathname]);

  const toggleSubmenu = (href: string) => {
    setOpenSubmenus((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  // 메뉴 아이템 렌더링 함수
  const renderNavItem = (item: NavItem) => {
    const isActive =
      location.pathname === item.href ||
      (item.href !== "/" && location.pathname.startsWith(item.href + "/")) ||
      (item.submenuItems && isInSubmenu(item));
    const hasSubmenu = item.submenuItems && item.submenuItems.length > 0;
    const isSubmenuOpen = openSubmenus.has(item.href);

    return (
      <div key={item.href}>
        {/* 메인 메뉴 아이템 */}
        <Link
          to={hasSubmenu ? item.submenuItems![0].href : item.href}
          onClick={(e) => {
            if (window.innerWidth < 1024) onToggle();
            // 일반 메뉴(서브메뉴가 없는) 클릭 시 수동 축소 설정 초기화
            if (!hasSubmenu && onNavigateToMainMenu) {
              onNavigateToMainMenu();
            }
            // 데스크탑: 하위 메뉴가 있으면 네비게이션 대신 토글
            if (hasSubmenu && window.innerWidth >= 1024 && !effectiveCollapsed) {
              e.preventDefault();
              toggleSubmenu(item.href);
            }
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
            effectiveCollapsed && "justify-center px-0",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            // 활성화된 메뉴가 아닌 다른 메뉴들은 어둡게 처리 (시인성 개선)
            activeItem &&
              !isActive &&
              activeItem.href !== item.href &&
              !item.submenuItems?.some(
                (sub) => sub.href === activeItem.href
              )
              ? "opacity-50"
              : ""
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {!effectiveCollapsed && (
            <>
              <span className="truncate">{menuLabels[item.href] || item.title}</span>
              {hasSubmenu && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 ml-auto transition-transform",
                    isSubmenuOpen && "rotate-180"
                  )}
                />
              )}
            </>
          )}
        </Link>

        {/* 하위 메뉴: 축소 상태에서는 활성화된 서브메뉴만 표시 */}
        {hasSubmenu && (!effectiveCollapsed || (effectiveCollapsed && isActive)) && (
          <div
            className={cn(
              "mt-1 space-y-1 overflow-hidden transition-all duration-200",
              effectiveCollapsed ? "ml-0" : "ml-6",
              isSubmenuOpen || (effectiveCollapsed && isActive) ? "max-h-96" : "max-h-0"
            )}
          >
            {item.submenuItems?.map((subItem) => {
              const isSubActive = location.pathname === subItem.href;
              return (
                <Link
                  key={subItem.href}
                  to={subItem.href}
                  onClick={() => {
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full",
                    effectiveCollapsed && "justify-center px-0",
                    isSubActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    // 축소 상태에서 서브메뉴 항목도 opacity 적용
                    effectiveCollapsed && isInAnySubmenu && !isSubActive
                      ? "opacity-50"
                      : ""
                  )}
                >
                  <subItem.icon className="h-4 w-4 shrink-0" />
                  {!effectiveCollapsed && (
                    <span className="truncate">{menuLabels[subItem.href] || subItem.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => {
          if (isCollapsed && isDesktop) setHoverExpanded(true);
        }}
        onMouseLeave={() => {
          if (isCollapsed && isDesktop) setHoverExpanded(false);
          if (onMouseLeave) onMouseLeave();
        }}
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-card border-r border-border transition-all duration-300 ease-in-out lg:translate-x-0",
          // 모바일: 항상 w-64 (풀 드로어), 데스크탑: 축소 상태에 따라
          "w-64",
          isCollapsed && !hoverExpanded && "lg:w-16",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // 호버 펼침 시 그림자 추가
          hoverExpanded && "shadow-xl"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
              {!effectiveCollapsed && (
                <span className="text-lg font-semibold text-foreground">
                  CRM
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* 데스크탑: 축소/확장 토글 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onCollapseToggle}
                className="hidden lg:flex text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </Button>
              {/* 모바일: 닫기 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="lg:hidden text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
            {visibleSections.map((section, idx) => (
              <div key={idx}>
                {/* 섹션 제목 */}
                {section.title && !effectiveCollapsed && (
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <FolderOpen className="h-3 w-3" />
                    {section.title}
                  </div>
                )}
                {section.title && effectiveCollapsed && (
                  <div className="border-t border-border my-2" />
                )}
                <div className="space-y-1">
                  {section.items.map(renderNavItem)}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}

// Mobile trigger button
export function SidebarTrigger({ onToggle }: { onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

// Desktop collapse trigger button
export function SidebarCollapseTrigger({
  isCollapsed,
  onToggle,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="hidden lg:flex text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      {isCollapsed ? (
        <ChevronRight className="h-5 w-5" />
      ) : (
        <ChevronLeft className="h-5 w-5" />
      )}
    </Button>
  );
}
