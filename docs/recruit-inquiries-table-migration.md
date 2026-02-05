# 입사문의 별도 테이블 분리 작업

> Issue: `marketing.inquiries`에서 필터링하던 입사문의를 `marketing.recruit_inquiries` 별도 테이블로 분리

## 배경

- 현재: `marketing.inquiries` 테이블에서 `utm_campaign LIKE '%recruit%'` 또는 `source_url LIKE '%contact-forms/456%'`로 필터링
- 문제: 상담문의와 입사문의는 필드 구조가 다름 (입사문의에는 지역, 경력여부, 문의내용 등 추가 필드 필요)
- 참고: `marketing.consultant_inquiries`는 별도 워드프레스 사이트용 테이블 (별개)

## CF7 Form 456 필드 매핑

| CF7 필드명 | DB 컬럼명 | 타입 | 설명 |
|-----------|-----------|------|------|
| `your-name` | `customer_name` | text | 이름 |
| `your-phone` | `phone` | text | 연락처 |
| `your-age` | `age` | text | 나이 |
| `your-area` | `area` | text | 지역 |
| `your-career` | `career` | text | 경력여부 (신입/경력) |
| `your-request` | `request` | text | 문의내용 |
| `referer-page` | `referer_page` | text | 유입 페이지 |
| `utm_campaign` | `utm_campaign` | text | 캠페인 |

## 1단계: Supabase 테이블 생성 (SQL)

```sql
CREATE TABLE marketing.recruit_inquiries (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT,
  phone TEXT,
  age TEXT,
  area TEXT,
  career TEXT,
  request TEXT,
  referer_page TEXT,
  utm_campaign TEXT,
  source_url TEXT,
  inquiry_date TIMESTAMPTZ,
  manager_id UUID,
  status TEXT DEFAULT 'new',
  memo TEXT,
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화 (서비스 키 사용)
ALTER TABLE marketing.recruit_inquiries DISABLE ROW LEVEL SECURITY;
```

## 2단계: 기존 데이터 마이그레이션 (SQL)

```sql
-- marketing.inquiries에서 입사문의 데이터를 새 테이블로 복사
INSERT INTO marketing.recruit_inquiries (
  customer_name, phone, utm_campaign, source_url,
  inquiry_date, manager_id, status, memo, admin_comment,
  created_at, updated_at
)
SELECT
  customer_name, phone, utm_campaign, source_url,
  inquiry_date, manager_id, status, memo, admin_comment,
  created_at, updated_at
FROM marketing.inquiries
WHERE utm_campaign ILIKE '%recruit%'
   OR source_url ILIKE '%contact-forms/456%';

-- 확인 후 원본 테이블에서 삭제
-- DELETE FROM marketing.inquiries
-- WHERE utm_campaign ILIKE '%recruit%'
--    OR source_url ILIKE '%contact-forms/456%';
```

> 주의: DELETE는 마이그레이션 확인 후 주석 해제하여 실행. 기존 데이터에는 age, area, career, request 값이 없음 (NULL).

## 3단계: API 수정

**파일**: `functions/api/[[route]].ts`

### GET `/api/recruit-inquiries` (라인 1645~1726)

```diff
  let query = (supabase as any)
    .schema("marketing")
-   .from("inquiries")
+   .from("recruit_inquiries")
    .select("*", { count: "exact" })
-   .or("utm_campaign.ilike.%recruit%,source_url.ilike.%contact-forms/456%");
```

매핑에 새 필드 추가:

```diff
  const inquiries = (data || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
-   productName: row.product_name,
+   age: row.age,
+   area: row.area,
+   career: row.career,
+   request: row.request,
    utmCampaign: row.utm_campaign,
    sourceUrl: row.source_url,
+   refererPage: row.referer_page,
    ...
  }));
```

### PUT `/api/recruit-inquiries/:id` (라인 1728~)

```diff
  const { data, error } = await (supabase as any)
    .schema("marketing")
-   .from("inquiries")
+   .from("recruit_inquiries")
```

### GET `/api/inquiries` (라인 1342~)

입사문의 제외 필터 제거 가능 (데이터가 새 테이블로 이동하므로):

```diff
  let query = (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .select("*", { count: "exact" })
-   .not("source_url", "ilike", "%contact-forms/456%")
-   .not("utm_campaign", "ilike", "%recruit%");
```

> 단, DELETE 완료 후에 제거할 것. 안전하게 당분간 유지해도 무방.

## 4단계: 프론트엔드 수정

### 타입 추가 (`src/types/inquiry.ts`)

```typescript
export interface RecruitInquiry {
  id: number;
  customerName: string;
  phone: string | null;
  age: string | null;
  area: string | null;
  career: string | null;
  request: string | null;
  utmCampaign: string | null;
  sourceUrl: string | null;
  refererPage: string | null;
  inquiryDate: string | null;
  managerId: string | null;
  managerName: string | null;
  status: string;
  memo: string | null;
  adminComment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
```

### 테이블 UI 수정 (`src/pages/RecruitInquiriesPage.tsx`)

테이블 헤더에 컬럼 추가:

| 기존 | 변경 후 |
|------|--------|
| 고객명, 연락처, 캠페인, 문의일, 상태, 메모 | 고객명, 연락처, 나이, 지역, 경력, 문의내용, 문의일, 상태, 메모 |

- `캠페인` 열 제거 (입사문의 전용 테이블이므로 불필요)
- `나이`, `지역`, `경력`, `문의내용` 열 추가

## 5단계: CF7 → Supabase 연동

워드프레스 CF7 form 456에서 데이터를 `marketing.recruit_inquiries` 테이블로 보내도록 연동 설정 변경 필요. (워드프레스 플러그인/웹훅 설정에 따라 다름)

## 작업 순서 체크리스트

- [ ] Supabase에서 `marketing.recruit_inquiries` 테이블 생성
- [ ] 기존 데이터 마이그레이션 (INSERT)
- [ ] API 수정 (GET, PUT 엔드포인트)
- [ ] 프론트 타입 추가 (`RecruitInquiry`)
- [ ] 서비스/훅 수정 (필요 시)
- [ ] 페이지 UI 수정 (컬럼 추가)
- [ ] CF7 연동 설정 변경 (새 테이블로)
- [ ] 확인 후 기존 테이블에서 입사문의 데이터 삭제
- [ ] `/api/inquiries`에서 입사문의 제외 필터 제거
- [ ] 빌드 확인 + 배포
