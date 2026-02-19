import { cn } from "@/lib/utils";
import { BarChart3, FileText, TrendingUp, Zap, LayoutDashboard, Search, Link2, History } from "lucide-react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useMenuRoles } from "@/hooks/useMenuRole";
import { useMenuLabels } from "@/hooks/useAppSettings";

interface AdsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AdsTabSection {
  title?: string;      // 섹션 헤더 (없으면 단독 항목)
  items: AdsTab[];
}

const adsTabSections: AdsTabSection[] = [
  {
    title: "파워컨텐츠",
    items: [
      { id: "ndata", label: "N-DATA", icon: BarChart3 },
      { id: "report", label: "보고서", icon: FileText },
      { id: "weekly", label: "주간데이터", icon: TrendingUp },
    ],
  },
  {
    items: [
      { id: "powerlink", label: "파워링크", icon: Zap },
    ],
  },
  {
    title: "키워드 현황",
    items: [
      { id: "rank-dashboard", label: "순위 대시보드", icon: LayoutDashboard },
      { id: "rank-keywords", label: "사이트/키워드", icon: Search },
      { id: "rank-urls", label: "URL 추적", icon: Link2 },
      { id: "rank-history", label: "순위 기록", icon: History },
    ],
  },
];

// flat 탭 목록 (visibility 필터링용)
const allTabs: AdsTab[] = adsTabSections.flatMap((s) => s.items);

export function AdsPage() {
  const { data: menuRoles } = useMenuRoles();
  const menuLabels = useMenuLabels();

  const visibleTabIds = new Set(
    allTabs
      .filter((tab) => {
        if (!menuRoles) return true;
        const role = menuRoles[`/ads/${tab.id}`];
        return role && role !== "none";
      })
      .map((tab) => tab.id)
  );

  // 탭 라벨에 메뉴 라벨 오버라이드 적용
  const getLabel = (tab: AdsTab) =>
    menuLabels[`/ads/${tab.id}`] || tab.label;

  if (menuRoles && visibleTabIds.size === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      <div className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-6">
          <nav className="space-y-1">
            {adsTabSections.map((section, sIdx) => {
              const visibleItems = section.items.filter((t) => visibleTabIds.has(t.id));
              if (visibleItems.length === 0) return null;

              return (
                <div key={sIdx}>
                  {/* 섹션 구분 (첫 번째 이후) */}
                  {sIdx > 0 && (
                    <div className="border-t border-border my-2" />
                  )}
                  {/* 섹션 헤더 */}
                  {section.title && (
                    <div className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </div>
                  )}
                  {visibleItems.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <NavLink
                        key={tab.id}
                        to={tab.id}
                        className={({ isActive }) =>
                          cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          )
                        }
                      >
                        <Icon className="h-5 w-5" />
                        {getLabel(tab)}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
