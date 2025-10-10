import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-updated';

export async function GET() {
  try {
    console.log('[debug-api] Testing attendance_scan_log access...');

    // Test 1: Count with admin client (bypass RLS)
    const { count, error: countError } = await supabaseAdmin
      .from('attendance_scan_log')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[debug-api] Count error:', countError);
      return NextResponse.json({
        test: 'Count with admin',
        success: false,
        error: countError
      });
    }

    console.log('[debug-api] Total rows:', count);

    // Test 2: Get last 10 records
    const { data, error: dataError } = await supabaseAdmin
      .from('attendance_scan_log')
      .select('log_id, result, detail_siswa_id, device_hash_client, flagged_reason, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (dataError) {
      console.error('[debug-api] Data error:', dataError);
      return NextResponse.json({
        test: 'Get data with admin',
        success: false,
        error: dataError
      });
    }

    console.log('[debug-api] Records found:', data?.length);

    // Test 3: Check RLS status
    const { data: rlsData, error: rlsError } = await supabaseAdmin
      .rpc('check_table_rls', { table_name: 'attendance_scan_log' })
      .single();

    return NextResponse.json({
      success: true,
      totalRows: count,
      recentRecords: data,
      recordCount: data?.length,
      rlsStatus: rlsData || 'Unable to check',
      rlsError: rlsError?.message || null,
      message: count === 0 
        ? '⚠️ Table is completely empty! No scans have been recorded.'
        : `✅ Found ${count} total records. RLS may be blocking client access.`
    });

  } catch (err) {
    console.error('[debug-api] Unexpected error:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
