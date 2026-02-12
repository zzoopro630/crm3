import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useMenuLabels } from "@/hooks/useAppSettings";
import { useBoardCategories } from "@/hooks/useBoardCategories";

// 경로 → 타이틀 매핑
const ROUTE_TITLES: Record<string, string> = {
  "/": "대시보드",
  "/customers": "고객 관리",
  "/db-management": "상담관리",
  "/team": "팀 관리",
  "/settings": "설정",
  "/settings/organizations": "조직 관리",
  "/settings/labels": "라벨 관리",
  "/settings/app-settings": "앱 설정",
  "/settings/employees": "사원 관리",
  "/settings/approvals": "승인 대기",
  "/settings/system": "시스템 설정",
  "/settings/board-categories": "게시판 관리",
  "/trash": "휴지통",
  "/contacts-direct": "연락처",
  "/consultant-inquiries": "the-fin 문의",
  "/recruit-inquiries": "입사문의",
  "/notices": "공지사항",
  "/resources": "자료실",
  "/board": "게시판",
  "/ads": "광고 분석",
  "/ads/ndata": "N-DATA",
  "/ads/report": "보고서",
  "/ads/weekly": "주간데이터",
};

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

export function useBreadcrumbs(): {
  title: string;
  breadcrumbs: BreadcrumbItem[];
} {
  const location = useLocation();
  const params = useParams();
  const menuLabels = useMenuLabels();
  const { data: boardCategories = [] } = useBoardCategories();
  const pathname = location.pathname;

  // 동적 게시판 카테고리 매핑 (slug → name)
  const boardTitles: Record<string, string> = {};
  for (const cat of boardCategories) {
    boardTitles[`/board/${cat.slug}`] = cat.name;
  }

  // 커스텀 이름 > 게시판 카테고리 > 기본 매핑
  const getTitle = (path: string) =>
    menuLabels[path] || boardTitles[path] || ROUTE_TITLES[path];

  // 최상위 경로의 타이틀 (예: /settings/labels → "설정")
  const topSegment = "/" + (pathname.split("/").filter(Boolean)[0] || "");
  let title = getTitle(topSegment) || getTitle(pathname) || "페이지";

  // 고객 상세 페이지 처리
  if (pathname.startsWith("/customers/") && params.id) {
    title = "고객 관리";
  }

  // Breadcrumb 생성
  const breadcrumbs: BreadcrumbItem[] = [];

  // 홈은 항상 첫 번째
  if (pathname !== "/") {
    breadcrumbs.push({ label: "홈", path: "/", isLast: false });
  }

  // 경로 세그먼트 파싱
  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // 숫자 ID는 "상세"로 표시
    if (/^\d+$/.test(segment)) {
      breadcrumbs.push({ label: "상세", path: currentPath, isLast });
    } else {
      const label = getTitle(currentPath) || segment;
      breadcrumbs.push({ label, path: currentPath, isLast });
    }
  });

  // 루트 페이지면 대시보드만
  if (pathname === "/") {
    breadcrumbs.push({ label: "대시보드", path: "/", isLast: true });
  }

  return { title, breadcrumbs };
}

export function Breadcrumb() {
  const { breadcrumbs } = useBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      {breadcrumbs.map((item, index) => (
        <div key={item.path} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
          {item.isLast ? (
            <span className="font-semibold text-foreground leading-none">
              {item.label}
            </span>
          ) : (
            <Link
              to={item.path}
              className="hover:text-foreground transition-colors flex items-center gap-1 leading-none self-center"
            >
              {index === 0 ? <Home className="h-4 w-4" /> : item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
