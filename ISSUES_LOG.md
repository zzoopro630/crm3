# CRM v3 프로젝트 구현 이슈 로그

프로젝트 구현 과정에서 발생한 이슈와 해결 방법을 단계별로 기록합니다.

---

## Phase 1: 기본 인프라 구축

### 1.1 패키지 의존성 이슈

**문제**: `@radix-ui/react-popover` 패키지 미설치
- 담당자 선택 팝오버 구현 시 Radix Popover 컴포넌트 필요
- 패키지가 설치되지 않아 import 오류 발생

**해결**:
```bash
npm install @radix-ui/react-popover
```

**교훈**: 새로운 UI 컴포넌트 추가 시 해당 Radix 패키지 설치 여부 확인 필요

---

### 1.2 Git 저장소 미초기화

**문제**: 프로젝트 디렉토리에 Git이 초기화되지 않음
- `git status` 명령 실행 시 "fatal: not a git repository" 오류

**해결**:
```bash
git init
git remote add origin https://github.com/zzoopro630/crm3.git
```

**교훈**: 프로젝트 시작 시 Git 초기화 및 원격 저장소 연결 우선 진행

---

## Phase 2: 고객 관리 기능

### 2.1 walkthrough.md 파일 부재

**문제**: 작업 지시서 파일명 불일치
- `walkthrough.md` 파일이 존재하지 않음
- 실제 파일명은 `todo.md`

**해결**: `todo.md` 파일을 작업 지시서로 활용

**교훈**: 프로젝트 문서 파일명 표준화 필요

---

### 2.2 담당자 변경 UI 설계 결정

**문제**: 담당자 변경 UI 방식 선택 필요
- 옵션 1: 별도 "변경" 버튼 추가
- 옵션 2: 담당자 이름 클릭 시 드롭다운
- 옵션 3: 인라인 수정 모드

**결정**: 옵션 2 선택 (담당자 이름 클릭 → 팝오버 드롭다운)
- 이유: UX 친화적, 클릭 수 최소화, 직관적인 상호작용

**구현**:
- `src/components/ui/popover.tsx` - Radix Popover 래퍼
- `src/components/customers/ManagerSelector.tsx` - 담당자 선택 컴포넌트

---

### 2.3 권한 기반 접근 제어

**문제**: 담당자 이관 권한 체계 정의 필요
- 모든 사용자가 담당자를 변경할 수 있으면 안됨
- F6(FC)는 본인 고객만 관리, 이관 불가

**해결**:
```typescript
// 이관 가능한 보안등급 (F5 이상만 가능, F6은 불가)
const TRANSFERABLE_LEVELS = ['F1', 'F2', 'F3', 'F4', 'F5']

const canTransfer = employee && TRANSFERABLE_LEVELS.includes(employee.securityLevel)
```

**적용 위치**:
- `ManagerSelector.tsx`: 권한 없으면 텍스트만 표시
- `CustomersPage.tsx`: 체크박스 컬럼 조건부 렌더링

---

### 2.4 대량 이관 체크박스 기능

**문제**: 다수의 고객을 한 번에 이관하는 기능 필요
- 개별 클릭으로 많은 고객 이관 시 비효율적

**해결**:
1. 테이블에 체크박스 컬럼 추가
2. 선택 상태 관리 (`selectedIds` 상태)
3. 선택 액션 바 UI (선택 수 표시, 담당자 변경 버튼)
4. 대량 이관 모달 (`BulkTransferModal.tsx`)

**구현 파일**:
- `src/components/customers/BulkTransferModal.tsx`
- `src/pages/CustomersPage.tsx` (체크박스 로직 추가)

---

### 2.5 선택 행 시각적 구분

**문제**: 체크된 행과 체크되지 않은 행 구분이 어려움
- 체크박스만으로는 선택 상태 파악이 불명확

**해결**: 선택된 행에 배경색 적용
```typescript
className={cn(
    "border-b border-border transition-colors",
    isSelected
        ? "bg-primary/10 hover:bg-primary/15"  // 선택됨
        : "hover:bg-secondary/20"               // 미선택
)}
```

**결과**: 선택된 행이 primary 색상으로 하이라이트되어 시각적 구분 용이

---

### 2.6 Shift 클릭 범위 선택

**문제**: 연속된 여러 행 선택 시 일일이 클릭해야 함
- 20개 행 선택 시 20번 클릭 필요

**해결**: Shift 키 + 클릭으로 범위 선택 구현
```typescript
const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

const handleSelectOne = (id: number, checked: boolean, index: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastSelectedIndex !== null && response?.data) {
        const start = Math.min(lastSelectedIndex, index)
        const end = Math.max(lastSelectedIndex, index)
        const rangeIds = response.data.slice(start, end + 1).map(c => c.id)

        if (checked) {
            setSelectedIds(prev => [...new Set([...prev, ...rangeIds])])
        } else {
            setSelectedIds(prev => prev.filter(id => !rangeIds.includes(id)))
        }
    } else {
        // 일반 클릭 처리
    }
    setLastSelectedIndex(index)
}
```

**사용법**:
1. 첫 번째 행 체크
2. Shift 키 누른 상태로 마지막 행 체크
3. 사이의 모든 행이 자동 선택됨

---

### 2.7 cn 유틸리티 import 누락

**문제**: 조건부 클래스 적용을 위한 `cn` 함수 import 누락
- `className={cn(...)}` 사용 시 `cn is not defined` 오류

**해결**:
```typescript
import { cn } from '@/lib/utils'
```

**교훈**: 조건부 스타일링 시 `cn` 유틸리티 import 확인 필수

---

## Phase 5: 대시보드

### 5.1 대시보드 통계 데이터 연동

**문제**: 하드코딩된 더미 데이터 사용 중
- 실제 고객 수, 상태별 분포 등 실시간 데이터 필요

**해결**:
1. `src/services/dashboard.ts` - 통계 조회 서비스 생성
2. `src/hooks/useDashboard.ts` - TanStack Query 훅 생성
3. `DashboardPage.tsx` - 실시간 데이터 연동

**권한별 데이터 필터링**:
```typescript
const isAdmin = employee?.securityLevel === 'F1'
const managerId = isAdmin ? undefined : user?.id
// F1은 전체 데이터, 그 외는 본인 담당 데이터만
```

---

## 설정 및 구조 이슈

### 사이드바 메뉴 중복

**문제**: 관리자 메뉴가 개별 페이지로 분산되어 있음
- 조직 관리, 소스 관리, 사원 관리, 승인 대기가 각각 별도 메뉴

**해결**: 설정 페이지로 통합
- `SettingsPage.tsx` - 탭 형태의 통합 설정 페이지
- 사이드바에서 중복 메뉴 제거
- 기존 경로(`/organizations`, `/sources` 등)는 `/settings`로 리다이렉트

```typescript
// App.tsx
{ path: '/organizations', element: <Navigate to="/settings" replace /> },
{ path: '/sources', element: <Navigate to="/settings" replace /> },
{ path: '/employees', element: <Navigate to="/settings" replace /> },
{ path: '/approvals', element: <Navigate to="/settings" replace /> },
```

---

## 환경 설정 이슈

### .gitignore 업데이트

**문제**: 환경변수 파일과 테스트 캐시가 Git에 포함될 수 있음

**해결**: .gitignore에 추가
```gitignore
# Environment variables
.env
.env.local
.env.*.local
.dev.vars

# Playwright
.playwright-mcp
```

---

## 테스트 및 검증

### Playwright를 통한 기능 검증

**방법**: MCP Playwright 서버를 활용한 실시간 브라우저 테스트
1. `browser_navigate` - 페이지 이동
2. `browser_snapshot` - 페이지 상태 캡처
3. `browser_click` - 요소 클릭 (Shift 키 조합 포함)
4. `browser_take_screenshot` - 시각적 검증용 스크린샷

**검증 항목**:
- 체크박스 선택/해제
- 선택 행 배경색 하이라이트
- Shift+클릭 범위 선택
- 대량 이관 모달 동작

---

## 향후 개선 사항

### 미해결/추후 작업
1. **수정 이력 기능**: 고객 정보 변경 히스토리 추적
2. **기간별 추이 차트**: 대시보드에 시계열 데이터 시각화
3. **팀 성과 대시보드**: Manager용 팀원별 성과 지표

### 성능 최적화 고려사항
1. 대량 선택 시 렌더링 최적화 (가상화 검토)
2. 체크박스 상태 변경 시 불필요한 리렌더링 방지
3. 대용량 팀원 목록 검색 성능

---

## 참고 사항

### 기술 스택 버전
- React 19.x
- Vite 7.x
- TanStack Query 5.x
- Zustand 5.x
- Radix UI (Popover, Dialog 등)
- Tailwind CSS 4.x

### 테스트 환경
- 로컬 개발 서버: http://localhost:5173
- 브라우저: Chromium (Playwright)

---

*마지막 업데이트: 2025-12-26*
