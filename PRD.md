# IT 뉴스 수집기 (IT News Aggregator) PRD

## 📋 프로젝트 개요

### 목적

다양한 IT 뉴스 소스를 자동으로 수집하여 하나의 플랫폼에서 최신 기술 트렌드와 뉴스를 편리하게 볼 수 있는 웹 서비스 개발

### 타겟 사용자

- 개발자, 기술 종사자
- IT 업계 관계자
- 기술 트렌드에 관심있는 일반인

## 🛠 기술 스택

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 🎯 핵심 기능

### 1. 뉴스 수집 시스템

- **자동 RSS/API 크롤링**
    
    - 30개 이상의 IT 뉴스 소스 지원
    - Vercel Cron Jobs를 통한 정기적 수집 (1시간마다)
    - 중복 뉴스 자동 필터링
- **지원 소스**
    
    - 국내: 긱뉴스, 아이뉴스24, NAVER D2, 우아한형제들 등
    - 해외: Hacker News, TechCrunch, GitHub Blog 등
    - 기업 블로그: LINE, 쿠팡, 당근마켓, Meta 등

### 2. 뉴스 표시 및 분류

- **메인 피드**
    
    - 시간순 최신 뉴스 나열
    - 무한 스크롤 구현
    - 소스별 필터링
- **카테고리 자동 분류**
    
    - AI/ML, 백엔드, 프론트엔드, 모바일, 인프라 등
    - 키워드 기반 자동 태깅

### 3. 사용자 기능

- **북마크 시스템**
    
    - 관심 뉴스 저장
    - 개인 북마크 페이지
- **검색 기능**
    
    - 제목, 내용 기반 전문 검색
    - 날짜별, 소스별 필터

## 📱 페이지 구조

### 1. 홈페이지 (`/`)

- 최신 뉴스 피드
- 트렌딩 키워드
- 소스별 필터 사이드바

### 2. 카테고리 페이지 (`/category/[slug]`)

- AI/ML (`/category/ai`)
- Backend (`/category/backend`)
- Frontend (`/category/frontend`)
- Mobile (`/category/mobile`)
- Infrastructure (`/category/infra`)

### 3. 북마크 페이지 (`/bookmarks`)

- 사용자가 저장한 뉴스 목록
- 로그인 필요

### 4. 검색 페이지 (`/search`)

- 검색 결과 페이지
- 고급 검색 옵션

### 5. 소스 페이지 (`/sources`)

- 모든 뉴스 소스 목록
- 소스별 상태 확인

## 🗄 데이터베이스 스키마

### Articles 테이블

```sql
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
```

### Sources 테이블

```sql
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
```

### Bookmarks 테이블

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  article_id UUID REFERENCES articles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);
```

## 🔄 시스템 플로우

### 뉴스 수집 플로우

1. Vercel Cron Job 실행 (매 시간)
2. `/api/cron/fetch-news` 엔드포인트 호출
3. RSS/API 파싱 및 데이터 추출
4. 중복 체크 후 Supabase에 저장
5. 카테고리 자동 분류

### 사용자 플로우

1. 홈페이지 접속
2. 최신 뉴스 피드 확인
3. 관심 뉴스 클릭하여 원문 이동
4. 북마크 저장 (로그인 시)

## 🚀 MVP 기능 우선순위

### Phase 1 (2주)

- [ ] Next.js 프로젝트 초기 설정
- [ ] Supabase 데이터베이스 구축
- [ ] 기본 RSS 파싱 로직 구현
- [ ] 메인 뉴스 피드 페이지

### Phase 2 (1주)

- [ ] Vercel Cron Jobs 설정
- [ ] 카테고리 분류 시스템
- [ ] 반응형 UI 구현

### Phase 3 (1주)

- [ ] 사용자 인증 (Supabase Auth)
- [ ] 북마크 기능
- [ ] 검색 기능

## 🎨 UI/UX 요구사항

### 디자인 컨셉

- **미니멀하고 깔끔한 디자인**
- **다크모드 지원**
- **모바일 우선 반응형**

### 컴포넌트 구조

- Header (로고, 검색바, 다크모드 토글)
- Sidebar (카테고리 필터)
- NewsCard (뉴스 아이템)
- Footer (소스 정보, 링크)

## 📊 성능 요구사항

- **페이지 로딩 속도**: 3초 이내
- **SEO 최적화**: Next.js SSG/SSR 활용
- **무한 스크롤**: 부드러운 UX 제공
- **이미지 최적화**: Next.js Image 컴포넌트 사용

## 🔐 보안 요구사항

- **Rate Limiting**: API 남용 방지
- **CORS 설정**: 적절한 출처 제한
- **입력 검증**: XSS 공격 방지
- **환경변수**: 민감 정보 보호

## 📈 향후 확장 계획

### Phase 4 (추후)

- [ ] 뉴스 요약 AI 기능
- [ ] 개인화 추천 시스템
- [ ] 모바일 앱 (React Native)
- [ ] 뉴스레터 구독 기능
- [ ] 소셜 로그인 확장
- [ ] 트렌딩 키워드 대시보드

## 🚦 성공 지표

- **일 활성 사용자**: 100명 (1개월 내)
- **수집 뉴스 수**: 일 평균 500건
- **사용자 체류 시간**: 평균 5분 이상
- **북마크 사용률**: 가입 사용자의 30% 이상

## 📝 개발 일정

|주차|목표|상세 작업|
|---|---|---|
|1주차|프로젝트 초기 설정|Next.js 설정, Supabase 연동, 기본 UI|
|2주차|핵심 기능 구현|RSS 파싱, 데이터 저장, 뉴스 표시|
|3주차|자동화 및 분류|Cron Jobs, 카테고리 분류, 검색|
|4주차|사용자 기능|인증, 북마크, 최종 테스트|

## 🎯 배포 및 운영

- **도메인**: `itnews-aggregator.vercel.app`
- **모니터링**: Vercel Analytics
- **에러 트래킹**: Sentry (선택사항)
- **백업**: Supabase 자동 백업

---

_이 PRD는 개발 과정에서 지속적으로 업데이트됩니다._