# Backend API (Hono on Cloudflare Pages Functions)

## Module Context

Cloudflare Pages Functions 위에서 동작하는 Hono REST API.
진입점 `[[route]].ts`에서 미들웨어(CORS, Supabase 클라이언트, 인증)를 설정하고, `routes/` 하위 파일에 도메인별 라우트를 위임한다.

의존성 관계:
- `[[route]].ts` -- 앱 생성, 미들웨어 체인, 라우트 마운트
- `routes/*.ts` -- 도메인별 API 엔드포인트
- `middleware/auth.ts` -- Env 타입 정의, 보안 헬퍼
- `database.types.ts` -- Supabase 자동생성 타입

## Tech Stack & Constraints

- **Runtime:** Cloudflare Workers (V8 isolate). Node.js API 사용 불가.
- **Framework:** Hono v4.
- **DB Client:** Supabase JS (`createClient` with SERVICE_ROLE_KEY).
- **서브리퀘스트 제한:** 요청당 최대 50개. 루프 내 개별 Supabase 호출 대신 batch/upsert 사용.
- **환경변수:** `c.env.SUPABASE_URL`, `c.env.SUPABASE_SERVICE_ROLE_KEY` 등 (Bindings 타입).

## Implementation Patterns

### 라우트 파일 구조

```typescript
// routes/example.ts
import { Hono } from 'hono'
import type { Env } from '../middleware/auth'

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => {
  const supabase = c.get('supabase' as never) as any
  const userEmail = c.get('userEmail' as never) as string
  // ...
})

export default app
```

### 인증 미들웨어

- `[[route]].ts`에서 글로벌 미들웨어로 적용.
- `Authorization: Bearer <token>` 헤더에서 토큰 추출.
- `supabase.auth.getUser(token)`으로 검증.
- PUBLIC_ROUTES: `/api/health`, `/api/pending-approvals`(POST), `/api/employees/email/*`(GET).

### 권한 검증 헬퍼

- `requireSecurityLevel(["F1", "F2"])` -- 보안 등급 기반 접근 제어.
- `requireBoardEditor()` -- 게시판 메뉴 권한 기반 편집 권한 검증.
- F1은 모든 권한 통과. 나머지는 `app_settings` + `employee_menu_overrides` 조회.

### camelCase/snake_case 변환

- 프론트엔드 요청: camelCase (`jobTitle`, `managerId`)
- DB 컬럼: snake_case (`job_title`, `manager_id`)
- API 레이어에서 양방향 변환 처리.

### 에러 응답

```typescript
import { safeError } from '../middleware/auth'
// ...
return safeError(c, error, '작업 실패')
```

- `safeError`: 프로덕션에서 내부 에러 숨김, 개발에서 상세 메시지 노출.

### 페이지네이션

```typescript
const { page, limit } = parsePagination(c)
const offset = (page - 1) * limit
// .range(offset, offset + limit - 1) 사용
```

## Testing Strategy

- 테스트 파일: `__tests__/*.test.ts` (같은 디렉토리 내).
- `npm run test` (Vitest).
- `createTestApp()` 헬퍼로 Hono 앱 + 모킹 환경 구성.
- Supabase 모킹: thenable 패턴 필수 (`then()` 메서드로 `await query` 지원).
- `c.env` 미설정 시 `safeError` 등에서 undefined 에러 -- `createTestApp()`에서 env 주입 필수.

## Local Golden Rules

### Do's

- 새 라우트 추가 시 `[[route]].ts`에 `app.route()` 등록 필수.
- 새 API가 로그인 플로우에서 호출되면 PUBLIC_ROUTES에 명시적 등록.
- sortBy 파라미터는 허용 컬럼 화이트리스트로 검증.
- 설정 저장: `upsert` with `onConflict: "key"` (개별 UPDATE 대신).
- 삭제: soft delete (`deleted_at` 설정) 우선. 영구 삭제는 F1/F2만.

### Don'ts

- `requireSecurityLevel` 없이 민감한 엔드포인트 노출 금지.
- 필터 값을 그대로 쿼리에 주입 금지 (sanitizeSearch 사용).
- `supabase.auth.getUser()` 결과를 신뢰하여 작성자 ID 검증 없이 수정 허용 금지.
- 단일 요청에서 50개 초과 Supabase 호출 금지.
