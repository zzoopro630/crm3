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
  Database,
  ChevronDown,
  ChevronRight,
  Trash2,
  BarChart3,
  BookUser,
} from "lucide-react";
import type { SecurityLevel } from "@/types/employee";
import { useOrganizations } from "@/hooks/useOrganizations";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedLevels?: SecurityLevel[];
  allowedOrgs?: string[];
  isSubmenu?: boolean;
  submenuItems?: NavItem[];
}

const navItems: NavItem[] = [
  { title: "대시보드", href: "/", icon: LayoutDashboard },
  { title: "고객 관리", href: "/customers", icon: Users },
  {
    title: "상담관리",
    href: "/db-management",
    icon: Database,
    allowedLevels: ["F1", "F2", "F3", "F4", "F5"],
  },
  {
    title: "휴지통",
    href: "/trash",
    icon: Trash2,
    allowedLevels: ["F1", "F2"],
  },
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
        title: "보고서",
        href: "/ads/report",
        icon: BarChart3,
        allowedLevels: ["F1"],
      },
      {
        title: "주간데이터",
        href: "/ads/weekly",
        icon: BarChart3,
        allowedLevels: ["F1"],
      },
    ],
  },
  {
    title: "설정",
    href: "/settings",
    icon: Settings,
    isSubmenu: true,
    submenuItems: [
      {
        title: "조직 관리",
        href: "/settings/organizations",
        icon: Settings,
        allowedLevels: ["F1", "F2", "F3", "F4", "F5"],
      },
      {
        title: "라벨 관리",
        href: "/settings/labels",
        icon: Settings,
        allowedLevels: ["F1"],
      },
      {
        title: "사원 관리",
        href: "/settings/employees",
        icon: Settings,
        allowedLevels: ["F1"],
      },
      {
        title: "승인 대기",
        href: "/settings/approvals",
        icon: Settings,
        allowedLevels: ["F1"],
      },
      { title: "시스템 설정", href: "/settings/system", icon: Settings },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  isCollapsed = false,
  onCollapseToggle,
}: SidebarProps) {
  const location = useLocation();
  const { employee } = useAuthStore();
  const { data: organizations = [] } = useOrganizations();

  // 모바일에서는 축소 상태를 무시하고 항상 풀 메뉴 표시
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const effectiveCollapsed = isDesktop && isCollapsed;

  // 현재 경로가 하위 메뉴에 속하는지 확인
  const isInSubmenu = (item: NavItem): boolean => {
    if (!item.submenuItems) return false;
    return item.submenuItems.some(
      (subItem) =>
        location.pathname === subItem.href ||
        location.pathname.startsWith(subItem.href + "/")
    );
  };

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

  const visibleNavItems = navItems
    .filter((item) => {
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
    })
    .map((item) => {
      // Create a copy of the item and its submenuItems to avoid mutating the global navItems
      if (item.submenuItems) {
        return {
          ...item,
          submenuItems: item.submenuItems.filter((subItem) => {
            if (!employee) return false;
            if (
              subItem.allowedLevels &&
              !subItem.allowedLevels.includes(employee.securityLevel)
            )
              return false;
            return true;
          }),
        };
      }
      return item;
    });

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
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-card border-r border-border transition-all duration-300 ease-in-out lg:translate-x-0",
          // 모바일: 항상 w-64 (풀 드로어), 데스크탑: 축소 상태에 따라
          "w-64",
          isCollapsed && "lg:w-16",
          isOpen ? "translate-x-0" : "-translate-x-full"
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
          <nav className="flex-1 p-4 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.submenuItems && isInSubmenu(item));
              const hasSubmenu =
                item.submenuItems && item.submenuItems.length > 0;
              const isSubmenuOpen = openSubmenus.has(item.href);

              return (
                <div key={item.href}>
                  {/* 메인 메뉴 아이템 */}
                  <Link
                    to={hasSubmenu ? item.submenuItems![0].href : item.href}
                    onClick={(e) => {
                      if (window.innerWidth < 1024) onToggle();
                      // 데스크탑: 하위 메뉴가 있으면 네비게이션 대신 토글
                      if (hasSubmenu && window.innerWidth >= 1024 && !effectiveCollapsed) {
                        e.preventDefault();
                        toggleSubmenu(item.href);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
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
                        <span className="truncate">{item.title}</span>
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

                  {/* 하위 메뉴 (축소되지 않았을 때만 표시) */}
                  {hasSubmenu && !effectiveCollapsed && (
                    <div
                      className={cn(
                        "ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200",
                        isSubmenuOpen ? "max-h-96" : "max-h-0"
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
                              isSubActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                          >
                            <subItem.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{subItem.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
