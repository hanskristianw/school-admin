'use client';

import { useState } from 'react';
import supabase from '@/lib/supabase';

export default function DatabaseDebugPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function testQuery(queryName, queryFn) {
    setLoading(true);
    try {
      console.log(`Running: ${queryName}`);
      const start = Date.now();
      const result = await queryFn();
      const duration = Date.now() - start;
      
      console.log(`Result (${duration}ms):`, result);
      
      setResult({
        name: queryName,
        duration,
        success: !result.error,
        error: result.error,
        count: result.count || result.data?.length || 0,
        data: result.data,
        rawResult: result
      });
    } catch (err) {
      console.error('Query error:', err);
      setResult({
        name: queryName,
        success: false,
        error: err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  }

  const tests = [
    {
      name: '🔓 Count ALL attendance_scan_log (After RLS Fix)',
      fn: () => supabase
        .from('attendance_scan_log')
        .select('*', { count: 'exact', head: true })
    },
    {
      name: 'Get FIRST 5 logs (any time)',
      fn: () => supabase
        .from('attendance_scan_log')
        .select('log_id, result, created_at, detail_siswa_id')
        .order('created_at', { ascending: false })
        .limit(5)
    },
    {
      name: 'Get logs from last 30 days',
      fn: () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return supabase
          .from('attendance_scan_log')
          .select('log_id, result, created_at, detail_siswa_id')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);
      }
    },
    {
      name: 'Get logs TODAY (WIB timezone)',
      fn: () => {
        // Use UTC midnight for today
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);
        
        console.log('Today UTC start:', todayUTC.toISOString());
        console.log('Current time:', new Date().toISOString());
        
        return supabase
          .from('attendance_scan_log')
          .select('log_id, result, created_at, detail_siswa_id')
          .gte('created_at', todayUTC.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);
      }
    },
    {
      name: 'Get logs from LAST 24 HOURS',
      fn: () => {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log('Last 24h start:', last24h.toISOString());
        console.log('Current time:', new Date().toISOString());
        
        return supabase
          .from('attendance_scan_log')
          .select('log_id, result, created_at, detail_siswa_id')
          .gte('created_at', last24h.toISOString())
          .order('created_at', { ascending: false })
          .limit(20);
      }
    },
    {
      name: '🔥 Get ALL logs (no filter)',
      fn: () => supabase
        .from('attendance_scan_log')
        .select('log_id, result, created_at, detail_siswa_id')
        .order('created_at', { ascending: false })
        .limit(20)
    },
    {
      name: 'Count by result type',
      fn: async () => {
        const { data, error } = await supabase
          .from('attendance_scan_log')
          .select('result');
        
        if (error) return { error };
        
        // Manual count by result type
        const counts = {};
        data.forEach(row => {
          counts[row.result] = (counts[row.result] || 0) + 1;
        });
        
        return {
          data: Object.entries(counts).map(([result, count]) => ({ result, count })),
          count: Object.keys(counts).length
        };
      }
    },
    {
      name: 'Get logs with device_hash_client',
      fn: () => supabase
        .from('attendance_scan_log')
        .select('log_id, device_hash_client, created_at')
        .not('device_hash_client', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5)
    },
    {
      name: 'Get LATEST scan (to check date)',
      fn: () => supabase
        .from('attendance_scan_log')
        .select('log_id, result, created_at, detail_siswa_id, device_hash_client')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    },
    {
      name: 'Get date range of ALL scans',
      fn: async () => {
        const { data: oldest } = await supabase
          .from('attendance_scan_log')
          .select('created_at')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        const { data: newest } = await supabase
          .from('attendance_scan_log')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        return {
          data: {
            oldest: oldest?.created_at,
            newest: newest?.created_at,
            oldestLocal: oldest ? new Date(oldest.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : null,
            newestLocal: newest ? new Date(newest.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : null
          }
        };
      }
    },
    {
      name: 'Count absen table (for comparison)',
      fn: () => supabase
        .from('absen')
        .select('*', { count: 'exact', head: true })
    },
    {
      name: 'Get recent absen records',
      fn: () => supabase
        .from('absen')
        .select('absen_id, absen_method, absen_date, absen_time, absen_detail_siswa_id')
        .order('absen_date', { ascending: false })
        .limit(10)
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔬 Database Debug Tool</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <h2 className="font-semibold text-yellow-900 mb-2">⚠️ Diagnosis</h2>
        <p className="text-sm text-yellow-800">
          Debug page menunjukkan 0 scans. Mari kita cek apakah:
        </p>
        <ul className="text-sm text-yellow-800 list-disc ml-5 mt-2">
          <li>Table attendance_scan_log benar-benar kosong?</li>
          <li>Ada RLS policy yang block read?</li>
          <li>Timezone issue?</li>
          <li>Query syntax issue?</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {tests.map((test, idx) => (
          <button
            key={idx}
            onClick={() => testQuery(test.name, test.fn)}
            disabled={loading}
            className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-left text-sm"
          >
            {idx + 1}. {test.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-gray-100 border border-gray-300 rounded p-4 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-700">Running query...</p>
        </div>
      )}

      {result && !loading && (
        <div className={`border rounded-lg p-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
              {result.success ? '✅' : '❌'} {result.name}
            </h2>
            {result.duration && (
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                {result.duration}ms
              </span>
            )}
          </div>

          {result.error && (
            <div className="bg-red-100 border border-red-300 rounded p-3 mb-3">
              <p className="text-red-900 font-semibold">Error:</p>
              <pre className="text-xs text-red-800 overflow-x-auto mt-1">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-2">
            <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              <strong>Count:</strong> {result.count}
            </p>

            {result.data && result.data.length > 0 && (
              <div>
                <p className="text-sm text-gray-700 font-semibold mb-2">Data Preview:</p>
                <div className="bg-white rounded border border-gray-300 p-3 overflow-x-auto">
                  <pre className="text-xs">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-900">
                Show full result object
              </summary>
              <div className="mt-2 bg-gray-100 rounded p-3 overflow-x-auto">
                <pre className="text-xs">
                  {JSON.stringify(result.rawResult, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center text-gray-500 py-12">
          Click a test button above to run diagnostics
        </div>
      )}
    </div>
  );
}
