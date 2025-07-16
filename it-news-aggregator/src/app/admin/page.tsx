'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Source } from '@/types';
import { Plus, Trash2, Power, PowerOff, RefreshCw, Settings } from 'lucide-react';

interface NewsCollectionResult {
  source: string;
  success: boolean;
  newArticles?: number;
  error?: string;
}

export default function AdminPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [collectionResults, setCollectionResults] = useState<NewsCollectionResult[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    rss_url: '',
    type: 'rss' as const,
  });

  useEffect(() => {
    fetchSources();
  }, []);

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

  const handleCollectNews = async () => {
    try {
      setLoading(true);
      setCollectionResults([]);
      
      const response = await fetch('/api/news', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        setCollectionResults(result.data.results || []);
      } else {
        alert('뉴스 수집 실패: ' + result.error);
      }
    } catch (error) {
      alert('뉴스 수집 중 오류 발생');
    } finally {
      setLoading(false);
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
      }
    } catch (error) {
      alert('소스 추가 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                IT 뉴스 수집기 - 개발자 관리
              </h1>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              ← 메인으로
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* News Collection Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              뉴스 수집 관리
            </h2>
            <button
              onClick={handleCollectNews}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '수집 중...' : '뉴스 수집 실행'}
            </button>
          </div>

          {collectionResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white">수집 결과:</h3>
              {collectionResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded text-sm ${
                    result.success
                      ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  <strong>{result.source}</strong>: {' '}
                  {result.success 
                    ? `성공 (새 기사 ${result.newArticles}개)`
                    : `실패 - ${result.error}`
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sources Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              RSS 소스 관리 ({sources.length}개)
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              소스 추가
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">새 RSS 소스 추가</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="소스 이름"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="px-3 py-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="웹사이트 URL"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  className="px-3 py-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="RSS URL"
                  value={newSource.rss_url}
                  onChange={(e) => setNewSource({ ...newSource, rss_url: e.target.value })}
                  className="px-3 py-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addNewSource}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
            </div>
          )}

          {/* Sources List */}
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {source.name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      source.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {source.is_active ? '활성' : '비활성'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {source.rss_url}
                  </p>
                  {source.last_fetched_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      마지막 수집: {new Date(source.last_fetched_at).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSourceActive(source.id, source.is_active)}
                    className={`p-2 rounded ${
                      source.is_active 
                        ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900'
                    }`}
                  >
                    {source.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteSource(source.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}