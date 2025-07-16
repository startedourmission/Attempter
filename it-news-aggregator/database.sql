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

-- 기본 뉴스 소스 데이터 삽입
INSERT INTO sources (name, url, rss_url, type) VALUES
('Hacker News', 'https://news.ycombinator.com', 'https://news.ycombinator.com/rss', 'rss'),
('TechCrunch', 'https://techcrunch.com', 'https://techcrunch.com/feed/', 'rss'),
('개발자스럽다', 'https://blog.gaerae.com', 'https://blog.gaerae.com/feed.xml', 'rss'),
('우아한형제들 기술블로그', 'https://techblog.woowahan.com', 'https://techblog.woowahan.com/feed/', 'rss');