export interface Article {
  id: string;
  title: string;
  link: string;
  description?: string;
  published_at: string;
  source_id: string;
  category?: string;
  tags?: string[];
  is_headline?: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  rss_url?: string;
  api_url?: string;
  type: 'rss' | 'api';
  is_active: boolean;
  last_fetched_at?: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  article_id: string;
  created_at: string;
}

export interface Category {
  slug: string;
  name: string;
  description?: string;
}

export interface CollectionLog {
  id: string;
  source_id: string;
  source_name: string;
  success: boolean;
  new_articles_count: number;
  error_message?: string;
  execution_time?: number;
  created_at: string;
}

export const CATEGORIES: Category[] = [
  { slug: 'artificial-intelligence', name: '인공지능', description: '인공지능 및 머신러닝' },
  { slug: 'backend', name: 'Backend', description: '백엔드 개발' },
  { slug: 'frontend', name: 'Frontend', description: '프론트엔드 개발' },
  { slug: 'mobile', name: 'Mobile', description: '모바일 개발' },
  { slug: 'infra', name: 'Infrastructure', description: '인프라 및 데브옵스' },
];

export const RESEARCH_CATEGORIES: Category[] = [
  { slug: 'research-all', name: '전체', description: '모든 연구 논문' },
  { slug: 'ai', name: 'AI/ML', description: 'arXiv AI 및 머신러닝 논문' },
  { slug: 'software-engineering', name: 'Software Engineering', description: 'arXiv 소프트웨어 공학 논문' },
  { slug: 'programming', name: 'Programming Languages', description: 'arXiv 프로그래밍 언어 논문' },
  { slug: 'computer-vision', name: 'Computer Vision', description: 'arXiv 컴퓨터 비전 논문' },
];