-- 뉴스 소스 테이블
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  rss_url TEXT,
  api_url TEXT,
  type TEXT CHECK (type IN ('rss', 'api')),
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 뉴스 기사 테이블  
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  link TEXT UNIQUE NOT NULL,
  description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  source_id UUID REFERENCES sources(id),
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 북마크 테이블
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  article_id UUID REFERENCES articles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- 인덱스 생성
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_source_id ON articles(source_id);
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);

-- 전체 뉴스 소스 데이터 삽입
INSERT INTO sources (name, url, rss_url, type) VALUES
-- 국내 뉴스 큐레이션 & 커뮤니티
('긱뉴스', 'https://news.hada.io', 'https://news.hada.io/rss/news', 'rss'),
('아이뉴스24 IT', 'https://www.inews24.com', 'https://www.inews24.com/rss/news_it.xml', 'rss'),

-- 해외 커뮤니티 & 뉴스
('Hacker News', 'https://news.ycombinator.com', 'https://news.ycombinator.com/rss', 'rss'),
('TechCrunch', 'https://techcrunch.com', 'https://techcrunch.com/feed/', 'rss'),

-- 국내 기업 기술 블로그
('NAVER D2', 'https://d2.naver.com', 'https://d2.naver.com/d2.atom', 'rss'),
('LINE Tech Blog', 'https://techblog.lycorp.co.jp/ko', 'https://techblog.lycorp.co.jp/ko/feed/index.xml', 'rss'),
('우아한형제들 기술블로그', 'https://techblog.woowahan.com', 'https://techblog.woowahan.com/feed/', 'rss'),
('쿠팡 Engineering', 'https://medium.com/coupang-engineering', 'https://medium.com/feed/coupang-engineering', 'rss'),
('당근마켓 Tech Blog', 'https://medium.com/daangn', 'https://medium.com/feed/daangn', 'rss'),
('뱅크샐러드 Tech Blog', 'https://blog.banksalad.com', 'https://blog.banksalad.com/rss.xml', 'rss'),

-- 해외 기업 기술 블로그
('Dropbox Tech Blog', 'https://dropbox.tech', 'https://dropbox.tech/feed', 'rss'),
('Microsoft Tech Community', 'https://techcommunity.microsoft.com', 'https://techcommunity.microsoft.com/plugins/custom/microsoft/o365/custom-blog-rss?tid=-1713578616692170207&size=25', 'rss'),
('Meta Engineering', 'https://engineering.fb.com', 'https://engineering.fb.com/feed/', 'rss'),
('Spotify Engineering', 'https://engineering.atspotify.com', 'https://engineering.atspotify.com/feed/', 'rss'),
('Slack Engineering', 'https://slack.engineering', 'https://slack.engineering/feed/', 'rss'),
('GitHub Blog', 'https://github.blog', 'https://github.blog/feed/', 'rss'),

-- 학술 논문 (arXiv)
('arXiv AI (Artificial Intelligence)', 'https://arxiv.org/list/cs.AI/recent', 'http://rss.arxiv.org/rss/cs.AI', 'rss'),
('arXiv ML (Machine Learning)', 'https://arxiv.org/list/cs.LG/recent', 'http://rss.arxiv.org/rss/cs.LG', 'rss'),
('arXiv SE (Software Engineering)', 'https://arxiv.org/list/cs.SE/recent', 'http://rss.arxiv.org/rss/cs.SE', 'rss'),
('arXiv PL (Programming Languages)', 'https://arxiv.org/list/cs.PL/recent', 'http://rss.arxiv.org/rss/cs.PL', 'rss'),
('arXiv CV (Computer Vision)', 'https://arxiv.org/list/cs.CV/recent', 'http://rss.arxiv.org/rss/cs.CV', 'rss');

-- 헤드라인 뉴스 기능을 위한 컬럼 추가
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_headline BOOLEAN DEFAULT false;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_articles_is_headline ON articles(is_headline);

-- arXiv RSS URL 수정 (https -> http)
UPDATE sources SET rss_url = 'http://rss.arxiv.org/rss/cs.AI' WHERE name = 'arXiv AI (Artificial Intelligence)';
UPDATE sources SET rss_url = 'http://rss.arxiv.org/rss/cs.LG' WHERE name = 'arXiv ML (Machine Learning)';
UPDATE sources SET rss_url = 'http://rss.arxiv.org/rss/cs.SE' WHERE name = 'arXiv SE (Software Engineering)';
UPDATE sources SET rss_url = 'http://rss.arxiv.org/rss/cs.PL' WHERE name = 'arXiv PL (Programming Languages)';
UPDATE sources SET rss_url = 'http://rss.arxiv.org/rss/cs.CV' WHERE name = 'arXiv CV (Computer Vision)';

-- 기존 기사들의 카테고리 업데이트
UPDATE articles SET category = 'ai' 
WHERE source_id IN (
  SELECT id FROM sources WHERE name IN ('arXiv AI (Artificial Intelligence)', 'arXiv ML (Machine Learning)')
);

UPDATE articles SET category = 'computer-vision' 
WHERE source_id IN (
  SELECT id FROM sources WHERE name = 'arXiv CV (Computer Vision)'
);

UPDATE articles SET category = 'software-engineering' 
WHERE source_id IN (
  SELECT id FROM sources WHERE name = 'arXiv SE (Software Engineering)'
);

UPDATE articles SET category = 'programming' 
WHERE source_id IN (
  SELECT id FROM sources WHERE name = 'arXiv PL (Programming Languages)'
);

-- 일반 뉴스의 AI 카테고리를 새로운 slug로 변경 (arXiv 제외)
UPDATE articles SET category = 'artificial-intelligence' 
WHERE category = 'ai' 
AND source_id NOT IN (
  SELECT id FROM sources WHERE name LIKE 'arXiv%'
);

-- 이미지 URL 필드 추가
ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 뉴스 수집 로그 테이블
CREATE TABLE IF NOT EXISTS collection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id),
  source_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  new_articles_count INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time INTEGER, -- milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_collection_logs_created_at ON collection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_logs_source_id ON collection_logs(source_id);

-- 추가로 일반 뉴스 소스들 중 AI 관련 기사들을 artificial-intelligence 카테고리로 분류
UPDATE articles SET category = 'artificial-intelligence' 
WHERE (
  LOWER(title) LIKE '%ai%' OR 
  LOWER(title) LIKE '%artificial intelligence%' OR 
  LOWER(title) LIKE '%machine learning%' OR 
  LOWER(title) LIKE '%머신러닝%' OR 
  LOWER(title) LIKE '%인공지능%' OR
  LOWER(description) LIKE '%ai%' OR 
  LOWER(description) LIKE '%artificial intelligence%' OR 
  LOWER(description) LIKE '%machine learning%' OR 
  LOWER(description) LIKE '%머신러닝%' OR 
  LOWER(description) LIKE '%인공지능%'
) 
AND source_id NOT IN (
  SELECT id FROM sources WHERE name LIKE 'arXiv%'
)
AND (category IS NULL OR category = 'general');