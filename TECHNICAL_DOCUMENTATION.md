# CRM v3 프로젝트 기술 문서

> **목적**: 이 문서는 다른 AI 에이전트(Claude, Gemini, GPT 등)가 프로젝트를 빠르게 이해하고 작업을 이어갈 수 있도록 작성되었습니다.
> 
> **마지막 업데이트**: 2025-12-24

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정보
- **프로젝트 이름**: CRM v3 (Financial Consultant CRM)
- **프로젝트 경로**: `/Users/nakjoo/Project/crm3`
- **목적**: 금융회사를 위한 고객 관리 시스템
- **개발 상태**: Phase 1~2 완료, Phase 3 예정

### 1.2 기술 스택

| 카테고리 | 기술 | 버전/상세 |
|----------|------|-----------|
| **Frontend** | React | 19.x |
| **Build Tool** | Vite | 7.x |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | v4 (oklch 색상 시스템) |
| **UI Components** | Shadcn UI | 커스텀 설치 |
| **State Management** | Zustand | 5.x |
| **Data Fetching** | TanStack Query | 5.x |
| **Routing** | React Router | 7.x |
| **Backend/DB** | Supabase | PostgreSQL + Auth |
| **ORM** | Drizzle ORM | 스키마 정의용 |

---

## 2. 프로젝트 구조

```
crm3/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx    # 인증 라우트 가드
│   │   ├── customers/
│   │   │   ├── AddressSearch.tsx     # Daum 주소 검색 컴포넌트
│   │   │   ├── BirthdateSelector.tsx # 생년월일 드롭다운
│   │   │   └── ExcelUpload.tsx       # Excel 대량 업로드
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx   # 메인 레이아웃
│   │   │   └── Sidebar.tsx           # 사이드바 네비게이션
│   │   └── ui/                       # Shadcn UI 컴포넌트들
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── sheet.tsx
│   ├── db/
│   │   ├── schema.ts                 # Drizzle ORM 스키마 정의
│   │   ├── seed.ts                   # 초기 F1 관리자 생성
│   │   ├── seed-customers.ts         # 샘플 고객 30명 생성
│   │   ├── disable-rls.ts            # RLS 비활성화 스크립트
│   │   └── add-foreign-keys.ts       # 외래키 추가 스크립트
│   ├── hooks/
│   │   ├── useCustomers.ts           # 고객 TanStack Query 훅
│   │   └── useEmployees.ts           # 사원 TanStack Query 훅
│   ├── lib/
│   │   └── utils.ts                  # cn() 유틸리티 (clsx + tailwind-merge)
│   ├── pages/
│   │   ├── LoginPage.tsx             # Google OAuth 로그인
│   │   ├── DashboardPage.tsx         # 메인 대시보드
│   │   ├── CustomersPage.tsx         # 고객 목록/등록
│   │   ├── CustomerDetailPage.tsx    # 고객 상세/수정
│   │   ├── EmployeesPage.tsx         # 사원 관리 (F1 전용)
│   │   ├── PendingApprovalsPage.tsx  # 승인 대기 관리 (F1 전용)
│   │   └── AccessDeniedPage.tsx      # 미승인 사용자 안내
│   ├── services/
│   │   ├── customers.ts              # 고객 CRUD API
│   │   └── employees.ts              # 사원 CRUD API
│   ├── stores/
│   │   ├── authStore.ts              # Zustand 인증 상태
│   │   └── themeStore.ts             # Zustand 테마 상태
│   ├── types/
│   │   ├── customer.ts               # 고객 타입 정의
│   │   └── employee.ts               # 사원 타입 정의
│   ├── utils/
│   │   └── supabase.ts               # Supabase 클라이언트
│   ├── App.tsx                       # 라우팅 설정
│   ├── App.css
│   ├── index.css                     # Tailwind CSS 변수 (다크모드 테마)
│   └── main.tsx                      # 앱 엔트리포인트
├── .env.local                        # 환경변수 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── todo.md                           # 프로젝트 요구사항/작업계획
```

---

## 3. 데이터베이스 스키마

### 3.1 Supabase 테이블 구조

#### `employees` 테이블
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR NOT NULL,
  security_level VARCHAR NOT NULL DEFAULT 'F6',  -- F1(최고), F2~F6
  position_name VARCHAR,
  parent_id UUID REFERENCES employees(id),       -- 상위 관리자
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**security_level 설명:**
- `F1`: 최고 관리자 (사원 관리, 승인 처리 권한)
- `F2~F5`: 중간 관리자
- `F6`: 일반 FC (Financial Consultant)

#### `customers` 테이블
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  phone VARCHAR,
  email VARCHAR,
  address VARCHAR,
  gender VARCHAR,            -- 'male', 'female', 'corporate'
  birthdate DATE,
  company VARCHAR,
  job_title VARCHAR,
  source VARCHAR,            -- 유입경로
  status VARCHAR DEFAULT 'new',  -- 'new', 'contacted', 'consulting', 'closed'
  manager_id UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `pending_approvals` 테이블
```sql
CREATE TABLE pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  status VARCHAR DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  processed_by UUID REFERENCES employees(id),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `sources` 테이블
```sql
CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

### 3.2 camelCase/snake_case 변환

프론트엔드는 **camelCase**, 데이터베이스는 **snake_case**를 사용합니다.
`services/` 파일들에 `toCamelCase()`, `toSnakeCase()` 헬퍼 함수가 구현되어 있습니다.

```typescript
// 예시: services/customers.ts
function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = obj[key]
  }
  return result as T
}
```

---

## 4. 인증 시스템

### 4.1 로그인 플로우

```
1. 사용자가 Google OAuth로 로그인
   ↓
2. authStore.initialize() 실행
   ↓
3. Supabase 세션 확인
   ↓
4. checkEmployeeStatus(email) 호출
   ↓
5. employees 테이블에서 이메일 매칭
   ├── 매칭됨 → isApproved: true, employee 정보 저장
   └── 매칭 안됨 → pending_approvals에 추가, isApproved: false
   ↓
6. ProtectedRoute에서 분기
   ├── isApproved: true → 대시보드 접근 허용
   └── isApproved: false → /access-denied 리다이렉트
```

### 4.2 주요 파일
- `stores/authStore.ts`: 인증 상태 관리 (Zustand)
- `components/auth/ProtectedRoute.tsx`: 라우트 가드
- `services/employees.ts`: `getEmployeeByEmail()`, `createPendingApproval()`

---

## 5. 고객 관리 기능 (Phase 2)

### 5.1 고객 목록 (CustomersPage.tsx)

**기능:**
- 페이지네이션 (서버 사이드, 20건/페이지)
- 검색 (이름, 전화번호)
- 상태 필터 (new, contacted, consulting, closed)
- 고객명 클릭 시 상세 페이지 이동

**상태 배지 색상 (그린 계열):**
```typescript
const colors: Record<string, string> = {
  new: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  contacted: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  consulting: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  closed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}
```

### 5.2 고객 등록 (Sheet 모달)

**입력 필드 검증:**

| 필드 | 검증 규칙 | 구현 방식 |
|------|-----------|-----------|
| 이름 * | 2-30자 (한글/영문/숫자) | `isValidName()` |
| 전화번호 * | 010-XXXX-XXXX | `formatPhoneNumber()` |
| 이메일 | 이메일 형식 | `isValidEmail()` |
| 생년월일 | 연/월/일 드롭다운 | `BirthdateSelector` 컴포넌트 |
| 주소 | Daum Postcode API | `AddressSearch` 컴포넌트 |

**특이사항:**
- 전화번호는 `010-`이 사전 입력됨
- ESC 키와 외부 클릭으로 모달이 닫히지 않음 (실수 방지)
- `onBlur` 이벤트로 즉시 검증 피드백

### 5.3 Excel 대량 업로드 (ExcelUpload.tsx)

**플로우:**
1. 템플릿 다운로드 (ExcelJS)
2. 파일 업로드 (.xlsx, .xls)
3. 미리보기 (최대 10건)
4. 유효/오류 건수 표시
5. `bulkCreateCustomers()` 호출

### 5.4 고객 상세/수정 (CustomerDetailPage.tsx)

**기능:**
- 상세 정보 조회 (employees JOIN으로 담당자명 포함)
- 인라인 수정 모드
- 삭제 (확인 후)

---

## 6. 스타일링 (Tailwind CSS v4)

### 6.1 다크모드 테마 (Supabase 그린 스타일)

`src/index.css`에서 CSS 변수로 테마 정의:

```css
.dark {
  --background: oklch(0.14 0.01 160);     /* 진한 다크 그린 */
  --foreground: oklch(0.95 0 0);
  --card: oklch(0.17 0.015 160);          /* 카드 배경 */
  --primary: oklch(0.7 0.18 160);         /* Supabase 그린 메인 */
  --accent: oklch(0.6 0.15 150);          /* 밝은 민트 그린 */
  --border: oklch(0.25 0.015 160);
  --ring: oklch(0.7 0.18 160);            /* 포커스 링 */
  /* ... */
}
```

### 6.2 컴포넌트 스타일 패턴

```tsx
// CSS 변수 사용 (다크모드 자동 대응)
<Card className="border-border bg-card rounded-xl shadow-lg">
  <CardHeader className="border-b border-border">
    <CardTitle className="text-foreground">제목</CardTitle>
  </CardHeader>
</Card>

// 테이블 행
<tr className="border-b border-border hover:bg-secondary/20 transition-colors">
  <td className="py-4 px-4 text-sm text-muted-foreground">...</td>
</tr>

// 링크
<Link className="text-primary hover:underline font-medium">링크</Link>
```

---

## 7. 실행 스크립트

### 7.1 개발 서버
```bash
npm run dev
# http://localhost:5173
```

### 7.2 빌드
```bash
npm run build
```

### 7.3 DB 스크립트

```bash
# F1 관리자 추가
npm run db:seed -- your-email@gmail.com "이름"

# 또는 직접 실행
npx tsx src/db/seed.ts your-email@gmail.com "이름"

# 샘플 고객 30명 생성
npx tsx src/db/seed-customers.ts

# RLS 비활성화 (개발용)
npx tsx src/db/disable-rls.ts

# 외래키 추가
npx tsx src/db/add-foreign-keys.ts
```

---

## 8. 환경 변수

`.env.local` 파일:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 9. 알려진 이슈 및 해결 방법

### 9.1 Supabase 외래키 조인 오류

**문제**: `employees!manager_id` 조인 쿼리 실패
**해결**: 
1. `npx tsx src/db/add-foreign-keys.ts` 실행
2. Supabase Dashboard에서 외래키가 제대로 설정되었는지 확인

### 9.2 RLS (Row Level Security) 오류

**문제**: `400 Bad Request` 또는 데이터 접근 불가
**해결**: 
1. `npx tsx src/db/disable-rls.ts` 실행 (개발 환경)
2. 프로덕션에서는 적절한 RLS 정책 설정 필요

### 9.3 무한 로딩 상태

**문제**: 페이지가 로딩 상태에서 멈춤
**원인**: `authStore.initialize()` 또는 `getEmployeeByEmail()` 실패
**해결**: 
- 브라우저 콘솔에서 에러 확인
- `services/employees.ts`의 에러 로깅 확인
- Supabase 연결 상태 확인

### 9.4 slick-address-kr 호환성

**문제**: Vite ESM 빌드와 호환 안됨
**해결**: Daum Postcode API 사용 (`AddressSearch.tsx`)

---

## 10. 다음 단계 (Phase 3: 팀 관리)

### 예정 기능
- [ ] 팀원 목록 (Manager가 자신의 팀원 조회)
- [ ] 팀원별 고객 수 통계
- [ ] 고객 이관 (담당자 변경)
- [ ] 대량 이관 (여러 고객 일괄 이관)

### 관련 파일 예상
- `src/pages/TeamPage.tsx`
- `src/services/team.ts`
- `src/hooks/useTeam.ts`

---

## 11. 코드 컨벤션

### 11.1 파일 명명
- 컴포넌트: PascalCase (`CustomersPage.tsx`)
- 훅: camelCase with `use` prefix (`useCustomers.ts`)
- 서비스: camelCase (`customers.ts`)
- 타입: camelCase (`customer.ts`)

### 11.2 컴포넌트 구조
```tsx
// 1. imports
import { useState } from 'react'
import { useXXX } from '@/hooks/useXXX'

// 2. 유틸리티 함수 (컴포넌트 외부)
function helperFunction() { ... }

// 3. 컴포넌트
export function ComponentName() {
  // state
  const [state, setState] = useState()
  
  // hooks
  const { data } = useXXX()
  
  // handlers
  const handleXXX = () => { ... }
  
  // render
  return (...)
}
```

### 11.3 경로 별칭
`@/` → `src/` (tsconfig.json, vite.config.ts에 설정됨)

```typescript
import { Button } from '@/components/ui/button'
import { useCustomers } from '@/hooks/useCustomers'
```

---

## 12. 트러블슈팅 체크리스트

1. **빌드 실패 시**
   - `npm run build` 에러 메시지 확인
   - TypeScript 타입 에러 확인
   - 린트 경고는 Tailwind CSS v4 문법으로 무시 가능

2. **페이지 로딩 안 될 때**
   - 브라우저 콘솔 확인
   - Network 탭에서 API 호출 상태 확인
   - Supabase Dashboard에서 로그 확인

3. **데이터 저장 안 될 때**
   - RLS 정책 확인
   - 외래키 제약 조건 확인
   - manager_id가 유효한 employees.id인지 확인

4. **스타일 적용 안 될 때**
   - 다크모드 클래스 확인 (`class="dark"` on html/body)
   - CSS 변수가 정의되어 있는지 확인
   - Tailwind 빌드 확인

---

> 이 문서는 프로젝트의 현재 상태를 반영합니다. 코드 변경 시 문서도 함께 업데이트해 주세요.
