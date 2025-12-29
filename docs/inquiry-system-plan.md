# 고객문의 관리 시스템 기획서

> **프로젝트 상태**: 기획 단계  
> **최종 목표**: CRM3 시스템과 통합

---

## 📌 개발 전략

### Phase A: 독립 시스템 (1차)
- 별도 프로젝트로 개발하여 빠르게 안정화
- 자체 인증/사용자 관리 시스템 사용
- 독립 데이터베이스 스키마

### Phase B: CRM3 통합 (2차)
- 고객 정보: CRM3의 `customers` 테이블 연동
- 담당자 정보: CRM3의 `employees` 테이블 연동
- 인증 시스템: CRM3 Supabase Auth 통합
- UI/UX: CRM3 디자인 시스템 적용

---

## 🛠 기술 스택 (초안)

| 영역 | Phase A (독립) | Phase B (통합 후) |
|------|---------------|------------------|
| **Frontend** | React + Vite | CRM3에 병합 |
| **Backend** | Hono (Cloudflare Pages) | CRM3 API 확장 |
| **Database** | Supabase (별도 프로젝트) | CRM3 Supabase (동일) |
| **인증** | 간단한 로그인 또는 Supabase Auth | CRM3 Auth 통합 |

---

## 📋 세부 조건 (사용자 입력)

> 아래에 추가 조건을 작성해주세요:

### 핵심 기능 요구사항
- [ ] (여기에 기능 조건 추가)

### 문의 유형/분류
- [ ] (문의 유형 정의)

### 처리 상태 정의
- [ ] (상태 워크플로우 정의)

### 담당자 배정 규칙
- [ ] (배정 로직)

### 알림/통보 조건
- [ ] (이메일, 푸시 등)

### UI/UX 요구사항
- [ ] (화면 구성, 디자인 참고)

### 기타
- [ ] (추가 조건)

---

## 🗂 데이터 모델 (초안)

### inquiries (문의)
```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 문의 정보
  title TEXT NOT NULL,           -- 문의 제목
  content TEXT NOT NULL,         -- 문의 내용
  category TEXT,                 -- 문의 유형
  priority TEXT DEFAULT 'normal', -- 우선순위 (low/normal/high/urgent)
  status TEXT DEFAULT 'open',    -- 상태 (open/in_progress/resolved/closed)
  
  -- 고객 정보 (Phase A: 직접 입력, Phase B: FK 연결)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_id INTEGER,           -- Phase B: CRM3 customers.id 연결
  
  -- 담당자 (Phase A: 자체 관리, Phase B: FK 연결)
  assignee_name TEXT,
  assignee_id UUID,              -- Phase B: CRM3 employees.id 연결
  
  -- 메타
  source TEXT,                   -- 유입 채널 (전화, 이메일, 웹폼 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

### inquiry_replies (답변/댓글)
```sql
CREATE TABLE inquiry_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id),
  content TEXT NOT NULL,
  author_name TEXT,
  author_id UUID,                -- Phase B: employees.id
  is_internal BOOLEAN DEFAULT FALSE, -- 내부 메모 여부
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### inquiry_attachments (첨부파일)
```sql
CREATE TABLE inquiry_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📐 화면 구성 (초안)

### 메인 화면
1. **문의 목록** - 필터링, 검색, 정렬
2. **문의 상세** - 상세 정보 + 답변 스레드
3. **대시보드** - 통계 (미처리 건수, 평균 처리 시간 등)

### 관리 화면
1. **카테고리 관리** - 문의 유형 편집
2. **담당자 관리** - (Phase A에서만, Phase B에서는 CRM3 연동)

---

## 🔄 CRM3 통합 전략

### 통합 시 변경 사항

| 항목 | 변경 내용 |
|------|----------|
| **고객 정보** | `customer_id` FK로 CRM3 `customers` 연결 |
| **담당자** | `assignee_id` FK로 CRM3 `employees` 연결 |
| **인증** | CRM3 Supabase Auth 공유 |
| **UI** | CRM3 사이드바에 "문의관리" 메뉴 추가 |
| **URL** | `/inquiries` 라우트 추가 |

### 마이그레이션 계획
1. Phase A 완료 후 데이터 백업
2. 테이블을 CRM3 Supabase로 이전
3. FK 관계 설정
4. 프론트엔드 코드 CRM3에 병합
5. 기존 독립 시스템 폐기

---

## 📝 작업 체크리스트

### Phase A: 독립 시스템
- [ ] 프로젝트 초기화 (Vite + React)
- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 구축
- [ ] 기본 CRUD API 구현
- [ ] 문의 목록/상세 화면
- [ ] 답변 기능
- [ ] 파일 첨부 기능
- [ ] 상태 관리 워크플로우
- [ ] 대시보드

### Phase B: CRM3 통합
- [ ] 동일 Supabase 프로젝트로 마이그레이션
- [ ] FK 관계 설정 및 데이터 이전
- [ ] CRM3 코드베이스에 병합
- [ ] 권한 체계 CRM3에 맞게 조정 (F1~F6)
- [ ] 테스트 및 안정화

---

## 💬 메모/논의 사항

> (추가 논의 내용을 여기에 기록)

