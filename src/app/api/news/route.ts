import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseRSSFeed } from '../../../lib/rss-parser';
// import { Article } from '../../../types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const source_id = searchParams.get('source_id');
    const exclude_arxiv = searchParams.get('exclude_arxiv') === 'true';
    const only_arxiv = searchParams.get('only_arxiv') === 'true';
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('articles')
      .select('*, sources(name)')
      .order('published_at', { ascending: false });

    // arXiv 소스 필터링
    if (exclude_arxiv) {
      // arXiv 소스 제외
      const { data: arxivSources } = await supabase
        .from('sources')
        .select('id')
        .ilike('name', '%arxiv%');
      
      if (arxivSources && arxivSources.length > 0) {
        const arxivIds = arxivSources.map(s => s.id);
        query = query.not('source_id', 'in', `(${arxivIds.join(',')})`);
      }
    } else if (only_arxiv) {
      // arXiv 소스만
      const { data: arxivSources } = await supabase
        .from('sources')
        .select('id')
        .ilike('name', '%arxiv%');
      
      if (arxivSources && arxivSources.length > 0) {
        const arxivIds = arxivSources.map(s => s.id);
        query = query.in('source_id', arxivIds);
      } else {
        // arXiv 소스가 없으면 빈 결과 반환
        return NextResponse.json({ success: true, data: [] });
      }
    }
    
    if (category && category !== 'all' && category !== 'research-all') {
      query = query.eq('category', category);
    }
    
    if (source_id) {
      query = query.eq('source_id', source_id);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sourceId } = body;
    
    // 활성화된 RSS 소스 가져오기 (특정 소스 또는 모든 소스)
    let query = supabase
      .from('sources')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'rss');
    
    if (sourceId) {
      query = query.eq('id', sourceId);
    }
    
    const { data: sources, error: sourcesError } = await query;
    
    if (sourcesError) {
      return NextResponse.json({ success: false, error: sourcesError.message }, { status: 500 });
    }
    
    if (!sources || sources.length === 0) {
      return NextResponse.json({ success: false, error: 'No active RSS sources found' }, { status: 404 });
    }
    
    let totalNewArticles = 0;
    const results = [];
    
    // 각 RSS 소스에서 뉴스 수집
    for (const source of sources) {
      if (!source.rss_url) continue;
      
      const startTime = Date.now();
      
      try {
        const parseResult = await parseRSSFeed(source.rss_url, source.id);
        
        if (!parseResult.success) {
          const executionTime = Date.now() - startTime;
          
          // 실패 로그 저장
          await supabase.from('collection_logs').insert({
            source_id: source.id,
            source_name: source.name,
            success: false,
            new_articles_count: 0,
            error_message: parseResult.error,
            execution_time: executionTime
          });
          
          results.push({
            source: source.name,
            success: false,
            error: parseResult.error,
          });
          continue;
        }
        
        // 중복 체크 및 새 기사만 필터링
        const newArticles = [];
        for (const article of parseResult.articles) {
          if (!article.link) continue;
          
          const { data: existing } = await supabase
            .from('articles')
            .select('id')
            .eq('link', article.link)
            .single();
          
          if (!existing) {
            newArticles.push({
              ...article,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
        
        // 새 기사들을 데이터베이스에 저장
        if (newArticles.length > 0) {
          const { error: insertError } = await supabase
            .from('articles')
            .insert(newArticles);
          
          if (insertError) {
            results.push({
              source: source.name,
              success: false,
              error: insertError.message,
            });
            continue;
          }
        }
        
        // 소스의 last_fetched_at 업데이트
        await supabase
          .from('sources')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', source.id);
        
        const executionTime = Date.now() - startTime;
        
        // 성공 로그 저장
        await supabase.from('collection_logs').insert({
          source_id: source.id,
          source_name: source.name,
          success: true,
          new_articles_count: newArticles.length,
          execution_time: executionTime
        });
        
        totalNewArticles += newArticles.length;
        results.push({
          source: source.name,
          success: true,
          newArticles: newArticles.length,
        });
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // 예외 발생 시 로그 저장
        await supabase.from('collection_logs').insert({
          source_id: source.id,
          source_name: source.name,
          success: false,
          new_articles_count: 0,
          error_message: errorMessage,
          execution_time: executionTime
        });
        
        results.push({
          source: source.name,
          success: false,
          error: errorMessage,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalNewArticles,
        results,
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, link, category, tags } = body;
    
    if (!title || !link) {
      return NextResponse.json(
        { success: false, error: 'Title and link are required' },
        { status: 400 }
      );
    }
    
    // Check if link already exists
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('link', link)
      .single();
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Article with this link already exists' },
        { status: 409 }
      );
    }
    
    const article = {
      title,
      description: description || '',
      link,
      category: category || null,
      tags: tags || [],
      published_at: new Date().toISOString(),
      source_id: null, // Custom articles don't have a source
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('articles')
      .insert([article])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create article' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_headline, title, description, category, tags } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }
    
    // 업데이트할 필드들 구성
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (typeof is_headline === 'boolean') {
      updateData.is_headline = is_headline;
    }
    
    if (title !== undefined) {
      updateData.title = title;
    }
    
    if (description !== undefined) {
      updateData.description = description;
    }
    
    if (category !== undefined) {
      updateData.category = category;
    }
    
    if (tags !== undefined) {
      updateData.tags = tags;
    }
    
    const { error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');
    
    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}