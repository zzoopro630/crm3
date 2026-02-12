# CLAUDE.md - Rank Check 프로젝트

## 프로젝트 정보
- **저장소**: https://github.com/zzoopro630/ranktracker.git
- **배포**: Railway (ranktracker-production.up.railway.app)
- **포트**: 8080

## 기술 스택
- Frontend: React + Vite, shadcn/ui, TanStack Query
- Backend: Express 5, better-sqlite3, Puppeteer
- 배포: Railway

## Express 5 주의사항
- 와일드카드 라우트: `*` → `{*path}` 문법 사용

## 현재 상태 (2026-02-06)
- 기본 기능 구현 완료 (사이트/키워드 CRUD, 대시보드)
- Railway 배포 완료, 접속 가능
- **크롤러 순위 정확도 이슈 해결 중**

---

## 크롤러 순위 정확도 이슈 (해결 필요)

### 핵심 파일
`server/services/crawler.js`

### 목표
네이버 웹 검색(`where=web`)에서 실제 사용자에게 보이는 순서 그대로 순위 추출.

### 테스트 기준
- 키워드: `더금융서비스`
- 사이트: `thefirst.co.kr`
- **실제 브라우저 검색 결과 순위** (2026-02-06 기준):

| 순위 | 사이트 |
|------|--------|
| 1 | www.thefinancialservices.co.kr |
| 2 | thebestfs.co.kr/network |
| 3 | thebestfs.co.kr |
| 4 | www.incruit.com/company |
| 5 | thevc.kr/thebestfinanceservice |
| 6 | www.incruit.com/company |
| 7 | www.incruit.com/company |
| 8 | thebestfs.co.kr/board |
| 9 | www.thefinancialservices.co.kr/THE-FINANCE |
| 10 | **thefirst.co.kr** ← 목표 |

주의: 같은 도메인(incruit.com), 같은 URL 경로(incruit.com/company)가 여러 번 등장함.

### 시도한 접근법과 결과

#### 1. CSS 셀렉터 (실패)
- `.lst_total .bx`, `a.total_tit` 등 → 결과 0개
- 네이버가 난독화된 클래스명 사용 (`fender-ui_228e3bd1` 등)

#### 2. 도메인 기반 중복제거 (부정확)
- 같은 도메인의 여러 결과가 1개로 병합 → thefirst.co.kr 5위 (실제 10위)

#### 3. URL 경로 기반 중복제거 (부정확)
- 같은 URL 경로(`incruit.com/company`)의 다른 검색결과도 병합 → 약 8위

#### 4. Y좌표 기반 그룹핑 - 현재 코드 (부정확)
- `getBoundingClientRect().top` 기준 40px 간격 이내는 같은 블록으로 판정
- **결과**: 53개 추출, thefirst.co.kr **34위**로 나옴
- **문제점**:
  - `keep.naver.com`이 제외 목록에 없어서 4번 포함됨
  - Y좌표 40px 간격이 너무 작아서 같은 결과 블록 내 링크가 분리됨
  - 너무 많은 항목이 추출되면서 순위가 뒤로 밀림

### 최신 크롤러 로그 (배포 환경)
```
검색 결과 수: 53
순위 목록: 1. www.thefinancialservices.co.kr/ | 2. keep.naver.com/ | 3. www.thefinancialservices.co.kr/ | 4. www.thefinancialservices.co.kr/ | 5. thebestfs.co.kr/network/affiliates | 6. keep.naver.com/ | 7. thebestfs.co.kr/network/affiliates | 8. thebestfs.co.kr/ | 9. keep.naver.com/ | 10. thebestfs.co.kr/ | 11. thebestfs.co.kr/ | 12. www.incruit.com/company/1690669993 | 13. keep.naver.com/ | 14. www.incruit.com/company/1690669993 | 15. www.incruit.com/company/1690669993
매칭! 순위: 34
```

### 수정 방향
1. **`keep.naver.com`을 제외 목록에 추가**
2. **Y좌표 간격을 늘리거나 다른 그룹핑 전략 필요** (40px로는 같은 블록 내 링크 분리됨)
3. 또는 다른 접근: 각 결과 블록의 공통 부모 요소 탐색, 네이버 검색 API 등
