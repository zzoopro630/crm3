-- SEO 순위 추적 스키마 생성
CREATE SCHEMA IF NOT EXISTS seo;

-- 사이트 테이블
CREATE TABLE seo.sites (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 키워드 테이블
CREATE TABLE seo.keywords (
    id BIGSERIAL PRIMARY KEY,
    keyword TEXT NOT NULL,
    site_id BIGINT NOT NULL REFERENCES seo.sites(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 랭킹 기록 테이블
CREATE TABLE seo.rankings (
    id BIGSERIAL PRIMARY KEY,
    keyword_id BIGINT NOT NULL REFERENCES seo.keywords(id) ON DELETE CASCADE,
    rank_position INTEGER,
    search_type TEXT DEFAULT 'view',
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    result_url TEXT,
    result_title TEXT
);

-- URL 추적 테이블
CREATE TABLE seo.tracked_urls (
    id BIGSERIAL PRIMARY KEY,
    keyword TEXT NOT NULL,
    target_url TEXT NOT NULL,
    section TEXT,
    memo TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- URL 순위 기록 테이블
CREATE TABLE seo.url_rankings (
    id BIGSERIAL PRIMARY KEY,
    tracked_url_id BIGINT NOT NULL REFERENCES seo.tracked_urls(id) ON DELETE CASCADE,
    rank_position INTEGER,
    section_name TEXT,
    section_rank INTEGER,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_seo_keywords_site_id ON seo.keywords(site_id);
CREATE INDEX idx_seo_rankings_keyword_id ON seo.rankings(keyword_id);
CREATE INDEX idx_seo_rankings_checked_at ON seo.rankings(checked_at);
CREATE INDEX idx_seo_tracked_urls_active ON seo.tracked_urls(is_active);
CREATE INDEX idx_seo_url_rankings_tracked_url_id ON seo.url_rankings(tracked_url_id);
CREATE INDEX idx_seo_url_rankings_checked_at ON seo.url_rankings(checked_at);

-- RLS 비활성화 (service_role_key 사용하므로)
ALTER TABLE seo.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.tracked_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.url_rankings ENABLE ROW LEVEL SECURITY;

-- service_role은 RLS 우회하므로 별도 정책 불필요
