# 보험 보장분석 리포트 기능 (CRM 통합)

## 개요
CRM 시스템의 한 기능으로 고객 보험 보장분석 비교표를 생성하고 A4 PDF로 출력하는 모듈 개발

## 목표
- 리모델링 전/후 보장 비교표를 깔끔한 A4 PDF로 출력
- 세부조정 없이 바로 프린터 출력 가능한 레이아웃
- 팀 전체 공유 및 사용

## 참고 자료
- 레이아웃 참고: `sample.pdf`
- 회사명: THE금융서비스
- 담당자 정보 포함 필요

---

## 기술 스택

```
프레임워크:  Vite + React + TypeScript
PDF 생성:    @react-pdf/renderer
스타일링:    Tailwind CSS
라우팅:      React Router
데이터:      Supabase (PostgreSQL + Auth)
상태관리:    Zustand 또는 React Context
```

---

## 데이터 구조

### 보장 항목 카테고리 (14개)

| 카테고리 | 세부 항목 |
|----------|-----------|
| 사망 | 상해사망 |
| 후유장해 | 질병후유장해 3%이상, 상해후유장해 3%이상 |
| 암 | 일반암 진단비, 유사암 진단비 |
| 뇌 | 뇌혈관 진단비, 뇌졸중 진단비, 뇌출혈 진단비 |
| 심장 | 허혈성심장질환, 급성심근경색 |
| 수술비 | 상해수술비, 질병수술비, 상해종수술비(1~5종), 질병종수술비(1~5종) |
| 입원비 | 상해일당, 질병일당 |
| 치료비 | 고액항암치료비(표적), 중입자방사선치료비, 암주요치료비, 2대질환주요치료비 |
| 배상책임 | 일상생활배상책임 |
| 골절 | 골절진단비, 골절진단비(치아파절제외), 골절진단비(치아파절포함) |
| 화상 | 화상치료비(화상진단), 화상치료비(화상수술) |
| 운전자 | 교통사고처리지원금, 변호사선임비용, 벌금, 자동차사고부상치료비 |
| 간병인 | 상해간병인사용입원일당, 질병간병인사용입원일당 |
| 보험료 | 현재총보험료, 리모델링후보험료 |

### 입력 데이터 구조

```typescript
interface ReportData {
  // 기본 정보
  customerName: string;          // 고객명
  managerName: string;           // 담당자명
  managerTitle: string;          // 직책
  branchName: string;            // 지점명
  createdAt: Date;               // 생성일

  // 보장 항목 (리모델링 전/후)
  coverages: {
    categoryId: string;
    itemId: string;
    before: string;              // 리모델링 전 (예: "5천만 원", "없음")
    after: string;               // 리모델링 후
    isRenewal?: boolean;         // 갱신 여부
  }[];

  // 보험료
  premiumBefore: number;         // 현재 총 보험료
  premiumAfter: number;          // 리모델링 후 보험료
}
```

---

## 기능 요구사항

### 1. 리포트 작성 화면 (프론트엔드)
- [ ] 고객 기본정보 입력 (고객명, 담당자)
- [ ] 보장 항목별 리모델링 전/후 금액 입력
- [ ] 실시간 PDF 미리보기
- [ ] PDF 다운로드 버튼
- [ ] 입력 데이터 임시저장

### 2. PDF 출력
- [ ] A4 사이즈 정확한 레이아웃 (210mm x 297mm)
- [ ] sample.pdf와 동일한 2단 테이블 구조
- [ ] 회사 로고 및 브랜딩 적용
- [ ] 색상 강조 (파란색 헤더, 노란색 강조)
- [ ] 바로 인쇄 가능한 여백 설정

### 3. 관리자 기능 (백엔드)
- [ ] 보장 항목 카테고리 추가/수정/삭제
- [ ] 세부 항목 추가/수정/삭제/순서변경
- [ ] 담당자 정보 관리

### 4. 고객 데이터 관리 (선택)
- [ ] 고객별 리포트 저장
- [ ] 고객명으로 검색/불러오기
- [ ] 리포트 히스토리 조회

---

## 디렉토리 구조

```
src/
├── features/
│   └── insurance-report/           # 보험 보장분석 모듈
│       ├── components/
│       │   ├── ReportForm.tsx      # 입력 폼
│       │   ├── ReportPreview.tsx   # 미리보기
│       │   └── pdf/
│       │       ├── ReportDocument.tsx   # PDF 메인 컴포넌트
│       │       ├── ReportHeader.tsx     # PDF 헤더
│       │       ├── ReportTable.tsx      # PDF 테이블
│       │       └── ReportFooter.tsx     # PDF 푸터
│       ├── hooks/
│       │   └── useReportData.ts    # 데이터 관리 훅
│       ├── types/
│       │   └── index.ts            # 타입 정의
│       ├── constants/
│       │   └── coverageItems.ts    # 보장 항목 기본값
│       └── pages/
│           ├── ReportCreatePage.tsx    # 리포트 생성
│           └── ReportManagePage.tsx    # 항목 관리
├── lib/
│   └── supabase.ts                 # Supabase 클라이언트
└── ...
```

---

## 작업 순서

### Phase 1: 프로젝트 설정
1. Vite + React + TypeScript 프로젝트 생성
2. Tailwind CSS 설정
3. @react-pdf/renderer 설치
4. React Router 설정
5. 디렉토리 구조 생성

### Phase 2: PDF 템플릿 개발
1. sample.pdf 레이아웃 측정 및 분석
2. PDF 기본 스타일 설정 (폰트, 색상, 여백)
3. ReportHeader 컴포넌트 (회사명, 고객명)
4. ReportTable 컴포넌트 (2단 비교표)
5. ReportFooter 컴포넌트 (보험료, 담당자)
6. A4 레이아웃 정밀 조정

### Phase 3: 입력 폼 개발
1. 보장 항목 상수 데이터 정의
2. ReportForm 컴포넌트 (입력 UI)
3. 데이터 상태 관리
4. PDF 미리보기 연동
5. PDF 다운로드 기능

### Phase 4: 백엔드 연동
1. Supabase 프로젝트 설정
2. 테이블 스키마 설계 (customers, reports, coverage_items)
3. 데이터 저장/불러오기 API
4. 관리자 항목 관리 화면

### Phase 5: 마무리
1. 전체 테스트 및 인쇄 테스트
2. CRM 통합 준비 (라우트, 컴포넌트 export)
3. 배포

---

## Supabase 테이블 스키마

```sql
-- 보장 카테고리
CREATE TABLE coverage_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보장 세부항목
CREATE TABLE coverage_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES coverage_categories(id),
  name TEXT NOT NULL,
  sort_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 고객
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리포트
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  manager_name TEXT,
  manager_title TEXT,
  branch_name TEXT,
  premium_before INT,
  premium_after INT,
  coverages JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 참고사항
- PDF 한글 폰트: Noto Sans KR 사용
- 인쇄 여백: 상하좌우 10mm
- 테이블 폰트 크기: 9~10pt (가독성 확보)
