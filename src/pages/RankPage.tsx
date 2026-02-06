import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Globe, Search, Link2 } from "lucide-react";
import { NavLink, Outlet, Navigate } from "react-router-dom";

interface RankTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const rankTabs: RankTab[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "sites", label: "사이트", icon: Globe },
  { id: "keywords", label: "키워드", icon: Search },
  { id: "url-tracking", label: "URL 추적", icon: Link2 },
];

export function RankPage() {
  const { employee } = useAuthStore();

  if (employee?.securityLevel !== "F1") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      <div className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-6">
          <nav className="space-y-1">
            {rankTabs.map((tab) => {
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
                  {tab.label}
                </NavLink>
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
