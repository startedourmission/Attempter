import Parser from 'rss-parser';
import { Article } from '@/types';

const parser = new Parser();

export interface RSSParseResult {
  success: boolean;
  articles: Partial<Article>[];
  error?: string;
}

export async function parseRSSFeed(
  rssUrl: string, 
  sourceId: string
): Promise<RSSParseResult> {
  try {
    const feed = await parser.parseURL(rssUrl);
    
    const articles: Partial<Article>[] = feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      description: item.contentSnippet || item.content,
      published_at: item.pubDate || new Date().toISOString(),
      source_id: sourceId,
      category: categorizeArticle(item.title || ''),
      tags: extractTags(item.title || '', item.contentSnippet || ''),
    }));

    return {
      success: true,
      articles,
    };
  } catch (error) {
    console.error('RSS parsing error:', error);
    return {
      success: false,
      articles: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

function categorizeArticle(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('ai') || titleLower.includes('machine learning') || titleLower.includes('인공지능')) {
    return 'ai';
  }
  if (titleLower.includes('backend') || titleLower.includes('server') || titleLower.includes('백엔드')) {
    return 'backend';
  }
  if (titleLower.includes('frontend') || titleLower.includes('react') || titleLower.includes('프론트엔드')) {
    return 'frontend';
  }
  if (titleLower.includes('mobile') || titleLower.includes('ios') || titleLower.includes('android') || titleLower.includes('모바일')) {
    return 'mobile';
  }
  if (titleLower.includes('devops') || titleLower.includes('infrastructure') || titleLower.includes('docker') || titleLower.includes('인프라')) {
    return 'infra';
  }
  
  return 'general';
}

function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const tags: string[] = [];
  
  const techKeywords = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js',
    'python', 'java', 'go', 'rust', 'docker', 'kubernetes', 'aws',
    'azure', 'gcp', 'github', 'git', 'api', 'database', 'mongodb',
    'postgresql', 'mysql', 'redis', 'graphql', 'rest'
  ];
  
  techKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return [...new Set(tags)]; // 중복 제거
}