import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Globe, Search, Link2 } from "lucide-react";

const navItems = [
  { to: "/", label: "대시보드", icon: LayoutDashboard },
  { to: "/sites", label: "사이트", icon: Globe },
  { to: "/keywords", label: "키워드", icon: Search },
  { to: "/url-tracking", label: "URL 추적", icon: Link2 },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside className="w-64 border-r bg-card">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold">Rank Check</h1>
            <p className="text-sm text-muted-foreground">키워드 랭킹 체커</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
