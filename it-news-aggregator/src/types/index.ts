export interface Article {
  id: string;
  title: string;
  link: string;
  description?: string;
  published_at: string;
  source_id: string;
  category?: string;
  tags?: string[];
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

export const CATEGORIES: Category[] = [
  { slug: 'ai', name: 'AI/ML', description: '인공지능 및 머신러닝' },
  { slug: 'backend', name: 'Backend', description: '백엔드 개발' },
  { slug: 'frontend', name: 'Frontend', description: '프론트엔드 개발' },
  { slug: 'mobile', name: 'Mobile', description: '모바일 개발' },
  { slug: 'infra', name: 'Infrastructure', description: '인프라 및 데브옵스' },
];