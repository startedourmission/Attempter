import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*, sources(name)')
      .eq('is_headline', true)
      .order('published_at', { ascending: false })
      .limit(5);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch headlines' },
      { status: 500 }
    );
  }
}