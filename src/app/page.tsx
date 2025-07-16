'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Article, CATEGORIES, RESEARCH_CATEGORIES } from '../types';
import { Clock, ExternalLink, Tag, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  const htmlEntities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2019;': "'",
    '&#8217;': "'",
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(htmlEntities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  return decoded;
}

interface NewsWithSource extends Article {
  sources?: { name: string };
}

export default function HomePage() {
  const [articles, setArticles] = useState<NewsWithSource[]>([]);
  const [headlines, setHeadlines] = useState<NewsWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NewsWithSource[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchArticles(1, true);
    fetchHeadlines();
  }, [selectedCategory]);

  const fetchHeadlines = async () => {
    try {
      const response = await fetch('/api/headlines');
      const result = await response.json();
      
      if (result.success) {
        setHeadlines(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch headlines:', err);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=50`);
      const result = await response.json();
      
      if (result.success) {
        setSearchResults(result.data || []);
        setIsSearching(true);
      } else {
        setError(result.error || 'Search failed');
      }
    } catch (err) {
      setError('Search error occurred');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    // 디바운싱: 300ms 후에 검색 실행
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const handlePopularSearch = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
  };

  const isResearchCategory = (category: string) => {
    return category === 'research-all' || 
           ['ai', 'software-engineering', 'programming', 'computer-vision'].includes(category);
  };

  const isArxivSource = (sourceName: string) => {
    return sourceName && sourceName.toLowerCase().includes('arxiv');
  };

  const fetchArticles = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
      });

      // 카테고리별 필터링
      if (selectedCategory === 'all') {
        // 전체 카테고리: arXiv 논문 제외
        params.append('exclude_arxiv', 'true');
      } else if (selectedCategory === 'research-all') {
        // 연구논문 전체: arXiv 논문만
        params.append('only_arxiv', 'true');
      } else if (isResearchCategory(selectedCategory)) {
        // 특정 연구논문 카테고리: arXiv 논문이면서 해당 카테고리
        params.append('only_arxiv', 'true');
        params.append('category', selectedCategory);
      } else {
        // 일반 카테고리: 해당 카테고리이면서 arXiv 제외
        params.append('category', selectedCategory);
        params.append('exclude_arxiv', 'true');
      }
      
      const response = await fetch(`/api/news?${params}`);
      const result = await response.json();
      
      if (result.success) {
        const newArticles = result.data || [];
        
        if (reset) {
          setArticles(newArticles);
        } else {
          setArticles(prev => [...prev, ...newArticles]);
        }
        
        // If we got fewer than 20 articles, we've reached the end
        setHasMore(newArticles.length === 20);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch articles');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchArticles(nextPage, false);
    }
  }, [page, loadingMore, hasMore]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Toynbee News
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Categories */}
          <aside className="lg:w-64 space-y-6">
            {/* 일반 카테고리 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                카테고리
              </h2>
              <nav className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  전체
                </button>
                {CATEGORIES.map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                      selectedCategory === category.slug
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* 연구 논문 카테고리 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                연구 논문 (arXiv)
              </h2>
              <nav className="space-y-2">
                {RESEARCH_CATEGORIES.map((category) => (
                  <button
                    key={`research-${category.slug}`}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                      selectedCategory === category.slug
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Headlines Section */}
            {headlines.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  헤드라인 뉴스
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {headlines.map((headline) => (
                    <article
                      key={headline.id}
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-l-4 border-yellow-400 rounded-lg shadow p-4"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        <a
                          href={headline.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-yellow-600 dark:hover:text-yellow-400"
                        >
                          {decodeHtmlEntities(headline.title)}
                        </a>
                      </h3>
                      {headline.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                          {decodeHtmlEntities(headline.description)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{format(new Date(headline.published_at), 'MM월 dd일', { locale: ko })}</span>
                        {headline.sources?.name && (
                          <span className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                            {headline.sources.name}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Search Section */}
            <div className="mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  뉴스 검색
                </h2>
                
                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="뉴스 제목, 내용, 태그, 출처로 검색하세요..."
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Popular Search Terms */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600 dark:text-gray-400">인기 검색어:</span>
                  <button
                    onClick={() => handlePopularSearch('바이브코딩')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 
                             rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    바이브코딩
                  </button>
                  <button
                    onClick={() => handlePopularSearch('클로드')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 
                             rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    클로드
                  </button>
                  <button
                    onClick={() => handlePopularSearch('arXiv')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 
                             rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    arXiv
                  </button>
                  <button
                    onClick={() => handlePopularSearch('TechCrunch')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 
                             rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    TechCrunch
                  </button>
                </div>
                
                {/* Search Loading */}
                {searchLoading && (
                  <div className="mt-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">검색 중...</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Search Results or Articles */}
            {isSearching ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    "{searchQuery}" 검색 결과 ({searchResults.length}개)
                  </h3>
                  <button
                    onClick={clearSearch}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    검색 해제
                  </button>
                </div>
                
                {searchResults.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      검색 결과가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {searchResults.map((article) => (
                      <article
                        key={article.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6"
                      >
                        <div className="flex items-start gap-4">
                          {/* Article Image */}
                          {article.image_url && (
                            <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden">
                              <img
                                src={article.image_url}
                                alt={article.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                <a
                                  href={article.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                  {decodeHtmlEntities(article.title)}
                                </a>
                              </h2>
                              {article.is_headline && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                  헤드라인
                                </span>
                              )}
                            </div>
                            
                            {article.description && (
                              <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                                {decodeHtmlEntities(article.description)}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(article.published_at), 'MM월 dd일 HH:mm', { locale: ko })}
                              </div>
                              
                              {article.sources?.name && (
                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                  {article.sources.name}
                                </span>
                              )}
                              
                              {article.category && article.category !== 'general' && (
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                                  {CATEGORIES.find(c => c.slug === article.category)?.name || 
                                   RESEARCH_CATEGORIES.find(c => c.slug === article.category)?.name || 
                                   article.category}
                                </span>
                              )}
                            </div>
                            
                            {article.tags && article.tags.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <Tag className="w-4 h-4 text-gray-400" />
                                <div className="flex flex-wrap gap-1">
                                  {article.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {article.tags.length > 3 && (
                                    <span className="text-gray-500 text-xs">
                                      +{article.tags.length - 3}개
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                              </div>
                              
                              <a
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : loading && articles.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">뉴스를 불러오는 중...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  아직 수집된 뉴스가 없습니다. 뉴스 수집 버튼을 클릭해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {articles.map((article) => (
                  <article
                    key={article.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Article Image */}
                      {article.image_url && (
                        <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden">
                          <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            <a
                              href={article.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {decodeHtmlEntities(article.title)}
                            </a>
                          </h2>
                          {article.is_headline && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                              ⭐
                            </span>
                          )}
                        </div>
                        
                        {article.description && (
                          <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                            {decodeHtmlEntities(article.description)}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(article.published_at), 'MM월 dd일 HH:mm', { locale: ko })}
                          </div>
                          
                          {article.sources?.name && (
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                              {article.sources.name}
                            </span>
                          )}
                          
                          {article.category && article.category !== 'general' && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                              {CATEGORIES.find(c => c.slug === article.category)?.name || 
                               RESEARCH_CATEGORIES.find(c => c.slug === article.category)?.name || 
                               article.category}
                            </span>
                          )}
                        </div>
                        
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <div className="flex flex-wrap gap-1">
                              {article.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                              {article.tags.length > 3 && (
                                <span className="text-gray-500 text-xs">
                                  +{article.tags.length - 3}개
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                          </div>
                          
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                
                {/* Load more trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="py-8">
                    {loadingMore && (
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">더 많은 뉴스를 불러오는 중...</p>
                      </div>
                    )}
                  </div>
                )}
                
                {!hasMore && articles.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">모든 뉴스를 불러왔습니다.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}