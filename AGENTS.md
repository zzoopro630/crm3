# Repository Guidelines

## Project Structure & Module Organization
- `src/` 가 프론트엔드 핵심입니다. `components/`, `pages/`, `hooks/`, `services/`, `stores/`, `types/`, `utils/`, `db/`, `assets/` 하위로 역할을 분리합니다.
- `functions/` 는 Cloudflare Pages Functions API 코드가 위치합니다. 예: `functions/api/[[route]].ts`.
- `drizzle/` 는 마이그레이션 SQL, `drizzle.config.ts` 는 Drizzle 설정입니다. `supabase/` 는 DB 관련 SQL을 보관합니다.
- 정적 리소스는 `public/`, 문서성 자료는 `docs/` 와 루트의 `TECHNICAL_DOCUMENTATION.md` 를 참고합니다.

## Build, Test, and Development Commands
- `npm run dev`: Vite 개발 서버 실행.
- `npm run build`: TypeScript 빌드 후 Vite 프로덕션 빌드.
- `npm run preview`: 빌드 결과 로컬 프리뷰.
- `npm run lint`: ESLint 검사.
- `npm run dev:api`: Cloudflare Pages 로컬 API 실행(빌드 포함).
- `npm run db:generate` / `db:push` / `db:studio`: Drizzle 스키마 생성, 반영, 스튜디오 실행.
- `npm run db:seed`: 샘플 데이터 시드(`src/db/seed.ts`).

## Coding Style & Naming Conventions
- TypeScript + React 기반이며, 경로 별칭은 `@/` 를 사용합니다(예: `@/components/...`).
- 들여쓰기는 2칸, 문자열은 single quotes, 세미콜론은 사용하지 않는 기존 스타일을 유지합니다.
- 페이지 컴포넌트는 `src/pages/*Page.tsx` 형태(PascalCase), 일반 컴포넌트는 PascalCase, UI 프리미티브는 kebab-case 파일명을 사용합니다(예: `dropdown-menu.tsx`).
- 공통 규칙은 `eslint.config.js` 기준으로 맞춥니다.

## Testing Guidelines
- 현재 전용 테스트 러너가 설정되어 있지 않습니다. 변경 시 `npm run lint` 와 수동 UI 확인을 기본으로 합니다.
- 테스트를 추가할 경우 `src/` 하위에 명확한 네이밍(`*.test.tsx`)과 실행 방법을 함께 문서화해 주세요.

## Commit & Pull Request Guidelines
- 작업을 시작할 때 반드시 새로운 브랜치를 생성합니다. 브랜치는 `feature/<이슈번호>-설명` 형식을 권장합니다.
- 작업이 완료되면 변경 내용을 상세히 커밋하고, 푸시 후 PR을 생성합니다.
- Issue 생성 후 작업을 시작합니다.
- 커밋 메시지는 `type(scope): 설명` 형식이며, 본문에 변경 요약과 `Refs #이슈번호` 를 포함합니다. 예: `feat(contacts): 연락처 기능 추가`.
- PR 제목은 `[기능] ... (#이슈번호)` 형식, 본문에는 변경 요약과 스크린샷을 포함하고 `Closes #이슈번호` 를 추가합니다.
- 머지는 `Squash and merge` 를 권장합니다. 자세한 워크플로우는 `.agent/workflows/git-workflow.md` 를 참고합니다.

## Agent-Specific Instructions
- AI 보조 규칙은 `.agent/workflows/rules.md` 에 정리되어 있습니다. 자동화된 변경이나 문서 작성 시 해당 규칙을 함께 확인해 주세요.
