'use client';

import { useState } from 'react';

export default function RLSDebugPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function testAdminAccess() {
    setLoading(true);
    try {
      const res = await fetch('/api/debug/scan-log');
      const data = await res.json();
      console.log('Admin API result:', data);
      setResult(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔐 RLS Debug - Admin Access Test</h1>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <h2 className="font-semibold text-blue-900 mb-2">📋 Test Purpose</h2>
        <p className="text-sm text-blue-800">
          This test uses <strong>service role key</strong> (bypasses RLS) to check if data exists in attendance_scan_log.
        </p>
        <ul className="text-sm text-blue-800 list-disc ml-5 mt-2">
          <li>If count = 0 with admin → Table is truly empty</li>
          <li>If count {'>'} 0 with admin but 0 from client → RLS is blocking reads</li>
        </ul>
      </div>

      <button
        onClick={testAdminAccess}
        disabled={loading}
        className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
      >
        {loading ? '⏳ Testing...' : '🔓 Test with Admin Key (Bypass RLS)'}
      </button>

      {result && (
        <div className={`mt-6 border rounded-lg p-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h2 className={`font-bold text-lg mb-3 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
            {result.success ? '✅ Admin Query Success' : '❌ Admin Query Failed'}
          </h2>

          {result.success && (
            <div className="space-y-3">
              <div className="bg-white border border-gray-300 rounded p-3">
                <p className="text-sm text-gray-700">
                  <strong>Total Rows:</strong> <span className="text-2xl font-bold text-blue-600">{result.totalRows}</span>
                </p>
              </div>

              {result.totalRows === 0 ? (
                <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                  <p className="text-yellow-900 font-semibold">⚠️ Table is Empty!</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Tidak ada data di attendance_scan_log. Ini artinya:
                  </p>
                  <ul className="text-sm text-yellow-800 list-disc ml-5 mt-2">
                    <li>Belum pernah ada scan yang sukses, ATAU</li>
                    <li>Scan API tidak insert data, ATAU</li>
                    <li>Data sudah di-delete</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <div className="bg-green-100 border border-green-300 rounded p-3 mb-3">
                    <p className="text-green-900 font-semibold">✅ Data Found!</p>
                    <p className="text-sm text-green-800 mt-1">
                      Ada {result.totalRows} records. Jika client query return 0, berarti <strong>RLS blocking!</strong>
                    </p>
                  </div>

                  {result.recentRecords && result.recentRecords.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Recent Records:</h3>
                      <div className="bg-white border border-gray-300 rounded p-3 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-2">Log ID</th>
                              <th className="text-left p-2">Result</th>
                              <th className="text-left p-2">Student ID</th>
                              <th className="text-left p-2">Device Hash</th>
                              <th className="text-left p-2">Flag</th>
                              <th className="text-left p-2">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.recentRecords.map((log, idx) => (
                              <tr key={log.log_id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="p-2">{log.log_id}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    log.result === 'ok' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.result}
                                  </span>
                                </td>
                                <td className="p-2">{log.detail_siswa_id || '-'}</td>
                                <td className="p-2 font-mono text-xs">
                                  {log.device_hash_client ? log.device_hash_client.substring(0, 12) + '...' : '-'}
                                </td>
                                <td className="p-2">
                                  {log.flagged_reason ? (
                                    <span className="text-red-600 text-xs">{log.flagged_reason}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="p-2 text-xs">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  Show raw result
                </summary>
                <pre className="mt-2 bg-gray-100 rounded p-3 overflow-x-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {!result.success && (
            <div className="bg-red-100 border border-red-300 rounded p-3">
              <p className="text-red-900 font-semibold">Error:</p>
              <pre className="text-xs text-red-800 overflow-x-auto mt-1">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            </div>
          )}

          {result.message && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-900">{result.message}</p>
            </div>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="mt-6 text-center text-gray-500 py-8">
          Click the button above to test admin access
        </div>
      )}
    </div>
  );
}
