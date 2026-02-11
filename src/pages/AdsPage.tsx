import { cn } from "@/lib/utils";
import { BarChart3, FileText, TrendingUp, Zap, LayoutDashboard, Search, Link2, History } from "lucide-react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useMenuRoles } from "@/hooks/useMenuRole";

interface AdsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  separator?: boolean;
}

const adsTabs: AdsTab[] = [
  { id: "ndata", label: "N-DATA", icon: BarChart3 },
  { id: "powerlink", label: "파워링크", icon: Zap },
  { id: "report", label: "보고서", icon: FileText },
  { id: "weekly", label: "주간데이터", icon: TrendingUp },
  { id: "rank-dashboard", label: "순위 대시보드", icon: LayoutDashboard, separator: true },
  { id: "rank-keywords", label: "사이트/키워드", icon: Search },
  { id: "rank-urls", label: "URL 추적", icon: Link2 },
  { id: "rank-history", label: "순위 기록", icon: History },
];

export function AdsPage() {
  const { data: menuRoles } = useMenuRoles();

  const visibleTabs = adsTabs.filter((tab) => {
    if (!menuRoles) return true; // 로딩 중에는 모두 표시
    const role = menuRoles[`/ads/${tab.id}`];
    return role && role !== "none";
  });

  if (menuRoles && visibleTabs.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      <div className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-6">
          <nav className="space-y-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <div key={tab.id}>
                  {tab.separator && (
                    <div className="border-t border-border my-2" />
                  )}
                  <NavLink
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
                    {tab.label}
                  </NavLink>
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
