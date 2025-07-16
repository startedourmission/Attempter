import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseRSSFeed } from '@/lib/rss-parser';
import { Article } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const source_id = searchParams.get('source_id');
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('articles')
      .select('*, sources(name)')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (source_id) {
      query = query.eq('source_id', source_id);
    }
    
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

export async function POST() {
  try {
    // 활성화된 모든 RSS 소스 가져오기
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'rss');
    
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
      
      try {
        const parseResult = await parseRSSFeed(source.rss_url, source.id);
        
        if (!parseResult.success) {
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
        
        totalNewArticles += newArticles.length;
        results.push({
          source: source.name,
          success: true,
          newArticles: newArticles.length,
        });
        
      } catch (error) {
        results.push({
          source: source.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
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