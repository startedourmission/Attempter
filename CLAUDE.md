# IT 뉴스 수집기 (IT News Aggregator) - Gemini Agent Context

이 문서는 에이전트가 'IT 뉴스 수집기' 프로젝트를 이해하고 효율적으로 작업하기 위한 핵심 컨텍스트를 제공합니다. 상세한 기능 요구사항은 `PRD.md` 파일을 참조하십시오.

## 1. 프로젝트 개요 및 목적

*   **목적**: 다양한 IT 뉴스 소스(RSS/API)를 수집하여 하나의 플랫폼에서 최신 기술 트렌드와 뉴스를 제공하는 웹 서비스.
*   **주요 사용자**: 개발자, 기술 종사자, IT 업계 관계자.

## 2. 핵심 기술 스택

*   **프론트엔드**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
*   **백엔드**: Next.js API Routes
*   **데이터베이스**: Supabase (PostgreSQL)
*   **배포**: Vercel
*   **주요 라이브러리**: `@supabase/supabase-js`, `rss-parser`

## 3. 주요 코드베이스 영역 및 역할

*   **`src/app/page.tsx`**: 메인 뉴스 피드 페이지 (사용자에게 보여지는 뉴스 목록).
*   **`src/app/admin/page.tsx`**: 관리자 페이지 (소스 관리, 뉴스 수집 수동 실행 등).
    *   로그인 기능 포함 (비밀번호 기반).
*   **`src/app/api/`**: 백엔드 API 라우트.
    *   `src/app/api/news/`: 뉴스 데이터 조회, 수집, 삭제 관련 API.
    *   `src/app/api/sources/`: 뉴스 소스(RSS 피드) 관리 API (추가, 조회, 수정, 삭제).
    *   `src/app/api/admin/auth/`: 관리자 페이지 인증 API.
    *   `src/app/api/bookmarks/`: 사용자 북마크 관련 API.
*   **`src/lib/supabase.ts`**: Supabase 클라이언트 초기화 및 설정. 환경 변수 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`) 사용.
*   **`src/lib/rss-parser.ts`**: RSS 피드 파싱 로직, 기사 카테고리 분류 (`categorizeArticle`), 태그 추출 (`extractTags`) 로직 포함.
*   **`src/types/index.ts`**: 프로젝트 전반에 사용되는 TypeScript 타입 정의 (Article, Source 등).

## 4. 프로젝트 상호작용 (AI 에이전트 관점)

*   **의존성 설치**: `npm install` (프로젝트 루트에서 실행).
*   **개발 서버 실행**: `npm run dev` (사용자가 직접 실행하며, 에이전트는 실행하지 않음).
*   **빌드**: `npm run build`.
*   **린트**: `npm run lint`.
*   **데이터베이스**: Supabase를 통해 PostgreSQL과 연동. `src/lib/supabase.ts` 참조.
*   **API 엔드포인트**: Next.js API Routes를 통해 구현. `src/app/api` 디렉토리 구조를 따름.

## 5. 중요 참고사항

*   **환경 변수**: Supabase 관련 환경 변수 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)는 `.env.local` 파일에 설정되어야 합니다.
*   **데이터 모델**: `articles`, `sources`, `bookmarks` 테이블 스키마는 `PRD.md`에 상세히 정의되어 있습니다.
*   **뉴스 수집 로직**: Vercel Cron Jobs를 통해 `/api/cron/fetch-news` 엔드포인트가 주기적으로 호출되어 뉴스를 수집합니다.
