# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Process (Token Saving)

- **Diff 기반 수정**: 코드 전체를 다시 작성하지 말고, 변경이 필요한 부분만 제공
- **짧고 간결하게**: 설명은 항목별로 짧게, 불필요한 미사여구 생략
- **관련 파일만 참조**: 현재 작업과 직접 관련된 파일만 읽기
- **계획 먼저**: 대규모 수정 시 코드 작성 전 실행 계획(Plan)을 짧게 제안하고 승인 받기
- **한국어 존댓말**: 모든 답변은 한국어로, 건조하고 정확한 톤 유지

## Project Overview

Financial Consultant CRM (crm3) - 금융회사를 위한 고객 관리 시스템

## Development Commands

```bash
npm run dev          # Vite 개발 서버 (http://localhost:5173)
npm run dev:api      # Cloudflare Pages Functions 로컬 테스트
npm run build        # TypeScript 컴파일 + Vite 빌드
npm run lint         # ESLint 실행
```

### Database Commands (Drizzle ORM)

```bash
npm run db:generate  # 마이그레이션 파일 생성
npm run db:push      # 스키마를 DB에 푸시
npm run db:studio    # Drizzle Studio 실행
npm run db:seed -- email@example.com "이름"  # F1 관리자 추가
npx tsx src/db/seed-customers.ts             # 샘플 고객 데이터 생성
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + Vite 7 + TypeScript
- **Styling**: Tailwind CSS v4 (oklch 색상 시스템), Shadcn UI
- **State**: Zustand (인증/테마), TanStack Query (서버 상태)
- **Backend**: Hono (Cloudflare Pages Functions)
- **Database**: Supabase (PostgreSQL) + Drizzle ORM

### Project Structure

```
src/
├── components/     # UI 컴포넌트
│   ├── auth/       # ProtectedRoute
│   ├── customers/  # 고객 관련 (ExcelUpload, AddressSearch 등)
│   ├── layout/     # DashboardLayout, Sidebar, Header
│   └── ui/         # Shadcn UI 컴포넌트
├── pages/          # 페이지 컴포넌트
├── hooks/          # TanStack Query 훅 (useCustomers, useEmployees 등)
├── services/       # API 호출 함수
├── stores/         # Zustand 스토어 (authStore, themeStore)
├── db/             # Drizzle 스키마 및 시드 스크립트
└── types/          # TypeScript 타입 정의

functions/api/[[route]].ts  # Hono REST API (Cloudflare Pages)
```

### Data Flow

1. **인증**: Google OAuth (Supabase Auth) → `authStore.ts` → `ProtectedRoute.tsx`
2. **API 호출**: `services/*.ts` → Hono API (`functions/api/`) → Supabase
3. **상태 관리**: TanStack Query 훅 → React 컴포넌트

### Key Patterns

**camelCase/snake_case 변환**: 프론트엔드는 camelCase, DB는 snake_case. API 레이어에서 변환 처리.

**보안 등급 (Security Level)**:
- F1: 최고 관리자 (사원/승인 관리 권한)
- F2~F4: 중간 관리자
- F5: 일반 FC

**고객 상태 (Customer Status)**: new, contacted, consulting, closed, called, texted, no_answer, rejected, wrong_number, ineligible, upsell

### Database Schema (주요 테이블)

- `employees`: 사원 정보 (security_level로 권한 구분)
- `customers`: 고객 정보 (manager_id로 담당자 연결)
- `organizations`: 조직 계층 구조
- `contracts`: 고객별 계약 정보
- `customer_notes`: 고객 메모
- `pending_approvals`: 신규 사용자 승인 대기
- `contacts`: 조직 연락처 (직할 조직 + F1 전용)

## Git Workflow

커밋 메시지: `<type>(<scope>): <설명>` (feat, fix, docs, refactor, chore)

브랜치: `feature/이슈번호-간단한설명` (예: `feature/15-user-dropdown`)

### PR 생성 규칙 (필수)

**main에 직접 커밋 금지.** 항상 feature 브랜치에서 작업 후 PR 생성.

```bash
# 1. 최신 main에서 브랜치 생성
git checkout main && git pull
git checkout -b feature/xxx

# 2. 작업 후 커밋
git add ... && git commit -m "..."

# 3. PR 전에 main rebase (충돌 방지)
git fetch origin
git rebase origin/main

# 4. push + PR 생성
git push -u origin feature/xxx
gh pr create ...

# 5. 병합 후 로컬 정리
git checkout main && git pull
git branch -d feature/xxx
```

**충돌 해결 시 주의**: `git merge main` 대신 `git rebase origin/main` 사용. rebase 중 충돌 시 현재 작업 코드가 유지되므로 혼동 없음.

## Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Cloudflare Pages (wrangler.toml 또는 대시보드에서 설정)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JUSO_API_KEY=...  # 주소 검색 API
```

## Common Issues

- **RLS 오류**: `npx tsx src/db/disable-rls.ts` (개발용)
- **외래키 조인 실패**: `npx tsx src/db/add-foreign-keys.ts`
- **무한 로딩**: 브라우저 콘솔 확인, Supabase 연결 상태 점검

## DB 마이그레이션 규칙 (필수)

DB 스키마를 변경하는 모든 작업 후 반드시 마이그레이션 기록을 남긴다.

### Drizzle 추적 스키마 (public, seo)

테이블 추가/수정/삭제 시:
1. `src/db/schema.ts` 코드 수정
2. `npm run db:generate` → `drizzle/` 에 마이그레이션 SQL + 스냅샷 자동 생성
3. 생성된 마이그레이션 파일을 PR에 함께 커밋

```bash
# 예시: 컬럼 추가 후
npm run db:generate   # drizzle/ 에 migration.sql 생성
git add drizzle/ src/db/schema.ts
```

### Drizzle 미추적 스키마 (marketing 등)

`marketing.inquiries`, `marketing.recruit_inquiries` 등은 Drizzle `schemaFilter`에 미포함.
직접 SQL로 변경한 경우:
1. `drizzle/` 폴더에 수동 SQL 파일 생성 (형식: `NNNN_설명.sql`)
2. 실행한 SQL을 그대로 기록 (CREATE, ALTER, 트리거 등)
3. PR에 함께 커밋

```bash
# 예시: marketing 스키마 트리거 추가 후
# drizzle/0011_recruit_trigger.sql 에 SQL 기록
git add drizzle/0011_recruit_trigger.sql
```

### 주의사항
- `db:push`는 개발 중 빠른 적용용. 마이그레이션 기록은 `db:generate`로 생성
- 마이그레이션 파일 없이 DB만 변경하면 로컬/배포 환경 불일치 발생
- RLS 정책, 트리거, 함수 등 Drizzle이 추적하지 않는 변경도 수동 SQL로 기록

## 작업 규칙

- SQL Editor 명령이 필요한 경우 Drizzle ORM으로 처리
- Playwright MCP 사용 금지
- curl 명령 대신 psql 명령 사용
