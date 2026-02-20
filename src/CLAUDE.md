# Frontend (React + Tailwind + Shadcn UI)

## Module Context

React 19 SPA. Vite 7 빌드, Tailwind CSS v4 (oklch 색상), Shadcn UI 컴포넌트.
Zustand로 클라이언트 상태, TanStack Query로 서버 상태를 분리 관리한다.

디렉토리 역할:
- `pages/` -- 라우트별 페이지 컴포넌트. `*Page.tsx` PascalCase.
- `components/` -- 재사용 UI. 도메인별 하위 폴더 (`customers/`, `layout/`, `orders/` 등).
- `components/ui/` -- Shadcn UI 프리미티브. kebab-case (`dropdown-menu.tsx`).
- `hooks/` -- TanStack Query 훅 + 커스텀 훅. `use*.ts`.
- `services/` -- API 호출 함수. `apiRequest()` 래퍼 사용.
- `stores/` -- Zustand 스토어 (`authStore`, `themeStore`).
- `types/` -- TypeScript 타입 정의.
- `lib/` -- 유틸리티 (`apiClient.ts`, `utils.ts`).

## Tech Stack & Constraints

- **React 19** + **TypeScript** (strict mode).
- **Tailwind CSS v4** -- oklch 색상 시스템. `@import 'tailwindcss'` 방식.
- **Shadcn UI** -- Radix UI 기반. 커스텀 수정 시 원본 덮어쓰기 주의.
- **TanStack Query v5** -- 서버 상태 캐싱. `staleTime` 기본 5분.
- **Zustand** -- 인증, 테마 등 클라이언트 전역 상태.
- **React Router v6** -- SPA 라우팅. `BrowserRouter`.
- **경로 별칭:** `@/` = `src/` (Vite alias).

## Implementation Patterns

### 페이지 컴포넌트

```
pages/CustomersPage.tsx    -- 상태, 핸들러, 레이아웃 조합
components/customers/      -- 서브 컴포넌트 (테이블, 모달, 셀렉터)
hooks/useCustomers.ts      -- TanStack Query 훅
services/customers.ts      -- API 호출 함수
types/customer.ts          -- 타입 정의
```

- 페이지 컴포넌트: 상태/핸들러는 부모에 유지, UI는 서브컴포넌트로 분리.
- Dialog/Modal은 자체 상태를 가진 독립 컴포넌트로 분리 우선.

### API 호출 패턴

```typescript
// services/example.ts
import { apiRequest } from '@/lib/apiClient'

export async function getItems(): Promise<Item[]> {
  return apiRequest<Item[]>('/api/items')
}
```

- `apiRequest`는 store에서 access_token을 읽어 Authorization 헤더 자동 첨부.
- 401 응답 시 `refreshSession()` 후 1회 자동 재시도.

### TanStack Query 훅 패턴

```typescript
// hooks/useItems.ts
export function useItems(params: Params) {
  return useQuery({
    queryKey: ['items', params],
    queryFn: () => getItems(params),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
}
```

### Zustand 스토어 패턴

- `authStore`: 세션, 사용자, 사원 정보, 인증 상태.
- `themeStore`: 다크/라이트 모드, 텍스트 크기.
- 스토어 외부 접근: `useAuthStore.getState()`.

### 반응형 레이아웃

- 모바일 (<768px): 카드 뷰, 사이드바 오버레이.
- 태블릿 (768~1024px): 축소 사이드바, 테이블 뷰.
- 데스크톱 (>=1024px): 전체 사이드바, 테이블 뷰.
- `hover: hover` 미디어쿼리로 마우스 환경 감지.
- 헤더 브레드크럼: `lg:block` (1024px 기준).

### 권한 제어 (프론트엔드)

- `useMenuRoles()` -- 메뉴별 역할 (editor/viewer/hidden/none).
- `useIsEditor(path)` -- 해당 메뉴 편집 권한 여부.
- F1은 모든 메뉴 접근 가능. F5는 자신의 데이터만 조회.
- UI 숨김은 보안이 아님 -- 백엔드에서 반드시 재검증.

### 게시판 시스템

- `board_categories` 테이블로 동적 관리. `/board/:slug` 라우트.
- `display_type`: `table`(기본) / `gallery`(카드뉴스).
- 리치 텍스트: TipTap 에디터. 이미지는 Supabase Storage `post-images` 버킷.
- 카드뉴스: `posts.content`에 `{"images":[...]}` JSON 저장.
- 하위 호환: HTML/평문 자동 판별 (`<p>`, `<h2>` 태그 패턴).

## Testing Strategy

- 프론트엔드 전용 테스트 러너 미설정. `npm run lint` + 수동 UI 확인.
- 테스트 추가 시 `*.test.tsx` 네이밍, Vitest + React Testing Library 권장.
- 컴포넌트 변경 후 모바일/태블릿/데스크톱 3가지 뷰포트에서 수동 확인.

## Local Golden Rules

### Do's

- Radix UI DropdownMenuItem은 `onSelect`가 primary 이벤트 (`onClick` 대신).
- TipTap `useEditor`의 `content` prop은 초기화 시에만 사용. 변경 시 `key={content}` 리마운트.
- 모바일: `visibilitychange` 이벤트 리스너 추가 (백그라운드 setInterval 중단 대응).
- `npx shadcn@latest add` 후 `package.json`/`package-lock.json` 커밋 필수.
- 여러 비동기 쿼리에 의존하는 UI는 모든 쿼리의 `isLoading` 확인.

### Don'ts

- TipTap `editor.setOptions()`를 렌더 중 호출 금지 (에디터 상태 교란 + extension 중복).
- StarterKit에 Link 포함 가능 -- `StarterKit.configure({ link: false })` + 별도 Link.configure().
- `{ ...prev }` 패턴으로 변경 없는 state 업데이트 금지 (무한 리렌더 원인).
- 500줄 초과 페이지 컴포넌트 방치 금지. 서브컴포넌트로 분할.
