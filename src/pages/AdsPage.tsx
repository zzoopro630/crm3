import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { BarChart3, FileText, TrendingUp } from "lucide-react";
import { NavLink, Outlet, Navigate } from "react-router-dom";

interface AdsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adsTabs: AdsTab[] = [
  { id: "ndata", label: "N-DATA", icon: BarChart3 },
  { id: "report", label: "보고서", icon: FileText },
  { id: "weekly", label: "주간데이터", icon: TrendingUp },
];

export function AdsPage() {
  const { employee } = useAuthStore();

  if (employee?.securityLevel !== "F1") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      <div className="w-48 shrink-0">
        <div className="sticky top-6">
          <nav className="space-y-1">
            {adsTabs.map((tab) => {
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
