import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Search query is required' }, { status: 400 });
    }
    
    const offset = (page - 1) * limit;
    const searchTerm = searchQuery.trim();
    
    // 먼저 소스 이름으로 검색하여 ID 목록 가져오기
    const { data: sourceData } = await supabase
      .from('sources')
      .select('id')
      .ilike('name', `%${searchTerm}%`);
    
    const sourceIds = sourceData?.map(s => s.id) || [];
    
    // 검색 쿼리 생성
    const searchConditions = [
      `title.ilike.%${searchTerm}%`,
      `description.ilike.%${searchTerm}%`,
      `tags.cs.{${searchTerm}}`
    ];
    
    // 소스 ID가 있으면 추가
    if (sourceIds.length > 0) {
      searchConditions.push(`source_id.in.(${sourceIds.join(',')})`);
    }
    
    const { data, error } = await supabase
      .from('articles')
      .select('*, sources(name)')
      .or(searchConditions.join(','))
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      pagination: {
        page,
        limit,
        total: data?.length || 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to search articles' },
      { status: 500 }
    );
  }
}