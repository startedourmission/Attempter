'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Source, Article } from '@/types';
import { 
  Settings, Lock, RefreshCw, Plus, Trash2, Power, PowerOff, 
  ExternalLink, Edit2, Star, StarOff, BarChart3, Activity, 
  Clock, CheckCircle, AlertCircle, Database, FileText, Eye, EyeOff 
} from 'lucide-react';

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

interface NewsCollectionResult {
  source: string;
  success: boolean;
  newArticles?: number;
  error?: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalSources: 0,
    activeSources: 0,
    headlineArticles: 0,
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [collectionResults, setCollectionResults] = useState<NewsCollectionResult[]>([]);
  const [collectionProgress, setCollectionProgress] = useState({
    current: 0,
    total: 0,
    currentSource: '',
  });
  
  // Forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    rss_url: '',
    type: 'rss' as const,
  });
  
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '',
    description: '',
    link: '',
    category: '',
    tags: '',
  });
  
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSources();
      fetchArticles();
      fetchStats();
      fetchLogs();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setAuthError('잘못된 비밀번호입니다.');
      }
    } catch (error) {
      setAuthError('로그인 중 오류가 발생했습니다.');
    }
  };

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources');
      const result = await response.json();
      if (result.success) {
        setSources(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [articlesRes, sourcesRes] = await Promise.all([
        fetch('/api/news?limit=1000'),
        fetch('/api/sources')
      ]);
      
      const articlesData = await articlesRes.json();
      const sourcesData = await sourcesRes.json();
      
      if (articlesData.success && sourcesData.success) {
        const articles = articlesData.data || [];
        const sources = sourcesData.data || [];
        
        setStats({
          totalArticles: articles.length,
          totalSources: sources.length,
          activeSources: sources.filter((s: Source) => s.is_active).length,
          headlineArticles: articles.filter((a: Article) => a.is_headline).length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs?limit=100');
      const result = await response.json();
      if (result.success) {
        setLogs(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const handleCollectNews = async () => {
    try {
      setLoading(true);
      setCollectionResults([]);
      
      const activeSources = sources.filter(s => s.is_active);
      setCollectionProgress({
        current: 0,
        total: activeSources.length,
        currentSource: '',
      });
      
      const results: NewsCollectionResult[] = [];
      
      for (let i = 0; i < activeSources.length; i++) {
        const source = activeSources[i];
        
        setCollectionProgress({
          current: i,
          total: activeSources.length,
          currentSource: source.name,
        });
        
        try {
          const response = await fetch('/api/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceId: source.id })
          });
          
          const result = await response.json();
          
          if (result.success && result.data.results && result.data.results.length > 0) {
            results.push(...result.data.results);
          } else if (result.success) {
            // 성공했지만 새 기사가 0개인 경우
            results.push({
              source: source.name,
              success: true,
              newArticles: 0,
            });
          } else {
            results.push({
              source: source.name,
              success: false,
              error: result.error || '알 수 없는 오류',
            });
          }
        } catch (error) {
          results.push({
            source: source.name,
            success: false,
            error: '연결 오류',
          });
        }
        
        setCollectionResults([...results]);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setCollectionProgress({
        current: activeSources.length,
        total: activeSources.length,
        currentSource: '수집 완료',
      });
      
      fetchStats();
      fetchLogs();
    } catch (error) {
      alert('뉴스 수집 중 오류 발생');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setCollectionProgress({ current: 0, total: 0, currentSource: '' });
      }, 1000);
    }
  };

  const toggleSourceActive = async (sourceId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sourceId, is_active: !isActive }),
      });
      
      if (response.ok) {
        fetchSources();
        fetchStats();
      }
    } catch (error) {
      alert('소스 상태 변경 실패');
    }
  };

  const deleteSource = async (sourceId: string) => {
    if (!confirm('정말 이 소스를 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch('/api/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sourceId }),
      });
      
      if (response.ok) {
        fetchSources();
        fetchStats();
      }
    } catch (error) {
      alert('소스 삭제 실패');
    }
  };

  const addNewSource = async () => {
    if (!newSource.name || !newSource.rss_url) {
      alert('이름과 RSS URL은 필수입니다.');
      return;
    }

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource),
      });
      
      if (response.ok) {
        setNewSource({ name: '', url: '', rss_url: '', type: 'rss' });
        setShowAddForm(false);
        fetchSources();
        fetchStats();
      }
    } catch (error) {
      alert('소스 추가 실패');
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/news?limit=1000');
      const result = await response.json();
      if (result.success) {
        const articlesData = result.data || [];
        const sortedArticles = articlesData.sort((a: Article, b: Article) => {
          if (a.is_headline && !b.is_headline) return -1;
          if (!a.is_headline && b.is_headline) return 1;
          return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        });
        setArticles(sortedArticles);
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    }
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('정말 이 뉴스를 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/news?id=${articleId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchArticles();
        fetchStats();
      } else {
        alert('뉴스 삭제 실패');
      }
    } catch (error) {
      alert('뉴스 삭제 중 오류 발생');
    }
  };

  const addCustomArticle = async () => {
    if (!newArticle.title || !newArticle.link) {
      alert('제목과 링크는 필수입니다.');
      return;
    }

    try {
      const tagsArray = newArticle.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const response = await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newArticle.title,
          description: newArticle.description,
          link: newArticle.link,
          category: newArticle.category || null,
          tags: tagsArray,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNewArticle({ title: '', description: '', link: '', category: '', tags: '' });
        setShowArticleForm(false);
        fetchArticles();
        fetchStats();
        alert('사용자 정의 뉴스가 추가되었습니다.');
      } else {
        alert('뉴스 추가 실패: ' + result.error);
      }
    } catch (error) {
      alert('뉴스 추가 중 오류 발생');
    }
  };

  const toggleHeadline = async (articleId: string, currentHeadlineStatus: boolean) => {
    try {
      const response = await fetch('/api/news', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: articleId,
          is_headline: !currentHeadlineStatus,
        }),
      });
      
      if (response.ok) {
        setArticles(prevArticles => {
          const updatedArticles = prevArticles.map(article => 
            article.id === articleId 
              ? { ...article, is_headline: !currentHeadlineStatus }
              : article
          );
          
          return updatedArticles.sort((a, b) => {
            if (a.is_headline && !b.is_headline) return -1;
            if (!a.is_headline && b.is_headline) return 1;
            return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
          });
        });
      } else {
        alert('헤드라인 설정 변경 실패');
      }
    } catch (error) {
      alert('헤드라인 설정 중 오류 발생');
    }
  };

  const startEditArticle = (article: Article) => {
    setEditingArticle(article);
    setShowEditForm(true);
  };

  const updateArticle = async () => {
    if (!editingArticle) return;
    
    try {
      const response = await fetch('/api/news', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingArticle.id,
          title: editingArticle.title,
          description: editingArticle.description,
          category: editingArticle.category,
          tags: editingArticle.tags,
        }),
      });
      
      if (response.ok) {
        setEditingArticle(null);
        setShowEditForm(false);
        fetchArticles();
        alert('뉴스가 수정되었습니다.');
      } else {
        alert('뉴스 수정 실패');
      }
    } catch (error) {
      alert('뉴스 수정 중 오류 발생');
    }
  };

  // 로그인 페이지
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="text-center mb-8">
              <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자 로그인</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                IT 뉴스 수집기 관리 페이지
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              
              {authError && (
                <div className="text-red-600 text-sm">{authError}</div>
              )}
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                로그인
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← 메인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 관리자 페이지 (인증 후)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                관리자
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">IT 뉴스 수집기</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                대시보드
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('sources')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                  activeTab === 'sources'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Database className="w-5 h-5" />
                RSS 소스 관리
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('articles')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                  activeTab === 'articles'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <FileText className="w-5 h-5" />
                뉴스 관리
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('logs')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                  activeTab === 'logs'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Clock className="w-5 h-5" />
                수집 로그
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-center"
            >
              ← 메인으로
            </Link>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'dashboard' && '대시보드'}
                {activeTab === 'sources' && 'RSS 소스 관리'}
                {activeTab === 'articles' && '뉴스 관리'}
                {activeTab === 'logs' && '수집 로그'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {activeTab === 'dashboard' && '전체 현황을 확인하고 뉴스를 수집하세요'}
                {activeTab === 'sources' && 'RSS 소스를 추가하고 관리하세요'}
                {activeTab === 'articles' && '수집된 뉴스를 관리하고 편집하세요'}
                {activeTab === 'logs' && '뉴스 수집 기록을 확인하세요'}
              </p>
            </div>
            
            {activeTab === 'dashboard' && (
              <button
                onClick={handleCollectNews}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? '수집 중...' : '뉴스 수집'}
              </button>
            )}
            
            {activeTab === 'sources' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                소스 추가
              </button>
            )}
            
            {activeTab === 'articles' && (
              <button
                onClick={() => setShowArticleForm(true)}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                뉴스 작성
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 기사</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalArticles.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Activity className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">활성 소스</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSources}/{stats.totalSources}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Star className="w-8 h-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">헤드라인</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.headlineArticles}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">최근 수집</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {logs.length > 0 ? new Date(logs[0]?.created_at).toLocaleDateString('ko-KR') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection Progress */}
              {loading && collectionProgress.total > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">수집 진행 상황</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>진행률: {collectionProgress.current}/{collectionProgress.total}</span>
                      <span>{Math.round((collectionProgress.current / collectionProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(collectionProgress.current / collectionProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    {collectionProgress.currentSource && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        현재: <strong>{collectionProgress.currentSource}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Two Column Layout for Additional Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity Feed */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">최근 활동</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {/* Recent logs as activity feed */}
                      {logs.slice(0, 10).map((log, index) => (
                        <div key={index} className="flex items-start gap-3 text-sm">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            log.success ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white font-medium truncate">
                              {log.source_name}
                            </p>
                            <p className={`text-sm ${
                              log.success 
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {log.success 
                                ? `${log.new_articles_count}개 기사 수집`
                                : `오류: ${log.error_message?.substring(0, 50)}...`
                              }
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(log.created_at).toLocaleString('ko-KR')}
                            </p>
                          </div>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          아직 활동 내역이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Source Status Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">소스 상태</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {sources.slice(0, 8).map((source) => (
                        <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              source.is_active ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-40">
                                {source.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {source.last_fetched_at 
                                  ? new Date(source.last_fetched_at).toLocaleDateString('ko-KR')
                                  : '수집 없음'
                                }
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            source.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {source.is_active ? '활성' : '비활성'}
                          </span>
                        </div>
                      ))}
                      {sources.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          등록된 소스가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">빠른 작업</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab('sources')}
                      className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Database className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">소스 관리</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('articles')}
                      className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">뉴스 관리</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('articles');
                        setShowArticleForm(true);
                      }}
                      className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <Plus className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">뉴스 작성</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('logs')}
                      className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">로그 확인</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Articles Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">최근 기사</h3>
                    <button
                      onClick={() => setActiveTab('articles')}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      전체 보기 →
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {articles.slice(0, 5).map((article) => (
                      <div key={article.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {decodeHtmlEntities(article.title)}
                            </h4>
                            {article.is_headline && (
                              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>{new Date(article.published_at).toLocaleDateString('ko-KR')}</span>
                            {article.category && (
                              <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                                {article.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                    {articles.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        수집된 기사가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Collection Results */}
              {collectionResults.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">수집 결과</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-2">
                      {collectionResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded flex items-center gap-3 ${
                            result.success
                              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          }`}
                        >
                          {result.success ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          <span>
                            <strong>{result.source}</strong>
                            {result.success 
                              ? ` - ${result.newArticles}개 수집`
                              : ` - ${result.error}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sources Tab */}
          {activeTab === 'sources' && (
            <div className="space-y-6">
              {/* Add Form */}
              {showAddForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">새 RSS 소스 추가</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="소스 이름"
                      value={newSource.name}
                      onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="웹사이트 URL"
                      value={newSource.url}
                      onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="RSS URL"
                      value={newSource.rss_url}
                      onChange={(e) => setNewSource({ ...newSource, rss_url: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white md:col-span-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addNewSource}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {/* Sources Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        소스 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        마지막 수집
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sources.map((source) => (
                      <tr key={source.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {source.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {source.rss_url}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            source.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {source.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {source.last_fetched_at 
                            ? new Date(source.last_fetched_at).toLocaleString('ko-KR')
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => toggleSourceActive(source.id, source.is_active)}
                              className={`p-1 rounded ${
                                source.is_active 
                                  ? 'text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/20'
                                  : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
                              }`}
                            >
                              {source.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deleteSource(source.id)}
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {sources.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    등록된 RSS 소스가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Articles Tab */}
          {activeTab === 'articles' && (
            <div className="space-y-6">
              {/* Add Form */}
              {showArticleForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">새 뉴스 작성</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="뉴스 제목을 입력하세요"
                      value={newArticle.title}
                      onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <textarea
                      placeholder="뉴스 설명을 입력하세요"
                      value={newArticle.description}
                      onChange={(e) => setNewArticle({ ...newArticle, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="url"
                      placeholder="https://example.com/news"
                      value={newArticle.link}
                      onChange={(e) => setNewArticle({ ...newArticle, link: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="예: 기술, AI, 개발"
                        value={newArticle.category}
                        onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="JavaScript, React, 개발"
                        value={newArticle.tags}
                        onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={addCustomArticle}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      뉴스 추가
                    </button>
                    <button
                      onClick={() => setShowArticleForm(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {/* Articles Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        뉴스 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        카테고리
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        발행일
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {articles.slice(0, 50).map((article) => (
                      <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="max-w-md">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                                {decodeHtmlEntities(article.title)}
                              </div>
                              {article.is_headline && (
                                <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {decodeHtmlEntities(article.description || '')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {article.category && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                              {article.category}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(article.published_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => toggleHeadline(article.id, article.is_headline || false)}
                              className={`p-1 rounded ${
                                article.is_headline 
                                  ? 'text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {article.is_headline ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                            </button>
                            <a
                              href={article.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => startEditArticle(article)}
                              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteArticle(article.id)}
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {articles.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    등록된 뉴스 기사가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">뉴스 수집 로그</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        소스
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        결과
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        실행 시간
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {log.source_name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {log.success ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-sm ${
                              log.success 
                                ? 'text-green-800 dark:text-green-300' 
                                : 'text-red-800 dark:text-red-300'
                            }`}>
                              {log.success 
                                ? `${log.new_articles_count}개 수집`
                                : log.error_message
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {log.execution_time ? `${log.execution_time}ms` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {logs.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    수집 로그가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Article Modal */}
      {showEditForm && editingArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              뉴스 수정
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  설명
                </label>
                <textarea
                  value={editingArticle.description || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={editingArticle.category || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    태그 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={editingArticle.tags?.join(', ') || ''}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                      setEditingArticle({ ...editingArticle, tags });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setEditingArticle(null);
                    setShowEditForm(false);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  취소
                </button>
                <button
                  onClick={updateArticle}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  수정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}