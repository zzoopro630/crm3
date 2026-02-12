-- 사이트 테이블
CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 키워드 테이블
CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    site_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- 랭킹 기록 테이블
CREATE TABLE IF NOT EXISTS rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword_id INTEGER NOT NULL,
    rank_position INTEGER,
    search_type TEXT DEFAULT 'view',
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    result_url TEXT,
    result_title TEXT,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- URL 추적 테이블
CREATE TABLE IF NOT EXISTS tracked_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    target_url TEXT NOT NULL,
    section TEXT,
    memo TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- URL 순위 기록 테이블
CREATE TABLE IF NOT EXISTS url_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracked_url_id INTEGER NOT NULL,
    rank_position INTEGER,
    section_name TEXT,
    section_rank INTEGER,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tracked_url_id) REFERENCES tracked_urls(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_keywords_site_id ON keywords(site_id);
CREATE INDEX IF NOT EXISTS idx_rankings_keyword_id ON rankings(keyword_id);
CREATE INDEX IF NOT EXISTS idx_rankings_checked_at ON rankings(checked_at);
CREATE INDEX IF NOT EXISTS idx_tracked_urls_active ON tracked_urls(is_active);
CREATE INDEX IF NOT EXISTS idx_url_rankings_tracked_url_id ON url_rankings(tracked_url_id);
CREATE INDEX IF NOT EXISTS idx_url_rankings_checked_at ON url_rankings(checked_at);
