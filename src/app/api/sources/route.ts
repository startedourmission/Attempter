import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, rss_url, type = 'rss' } = body;
    
    if (!name || !rss_url) {
      return NextResponse.json(
        { success: false, error: 'Name and RSS URL are required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('sources')
      .insert([{
        name,
        url: url || '',
        rss_url,
        type,
        is_active: true,
      }])
      .select();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create source' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_active } = body;
    
    if (!id || is_active === undefined) {
      return NextResponse.json(
        { success: false, error: 'ID and is_active are required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('sources')
      .update({ is_active })
      .eq('id', id)
      .select();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // 먼저 해당 소스의 기사들을 삭제
    await supabase
      .from('articles')
      .delete()
      .eq('source_id', id);
    
    // 그 다음 소스 삭제
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}