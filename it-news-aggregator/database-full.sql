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
('GitHub Blog', 'https://github.blog', 'https://github.blog/feed/', 'rss');