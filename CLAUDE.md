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

## Git Workflow

커밋 메시지: `<type>(<scope>): <설명>` (feat, fix, docs, refactor, chore)

브랜치: `feature/이슈번호-간단한설명` (예: `feature/15-user-dropdown`)

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
