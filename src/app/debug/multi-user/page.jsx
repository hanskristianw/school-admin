'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function DebugMultiUserPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      
      // Get recent logs from today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error: dbError } = await supabase
        .from('attendance_scan_log')
        .select(`
          log_id,
          detail_siswa_id,
          result,
          flagged_reason,
          device_hash_client,
          device_hash,
          ua_ip_hash,
          created_at,
          detail_siswa:detail_siswa_id (
            siswa_id,
            users:user_id (
              user_id,
              user_nama_depan,
              user_nama_belakang
            )
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbError) throw dbError;

      setLogs(data || []);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Group logs by device hash
  const deviceGroups = {};
  logs.forEach(log => {
    const deviceKey = log.device_hash_client || log.device_hash || log.ua_ip_hash || 'unknown';
    if (!deviceGroups[deviceKey]) {
      deviceGroups[deviceKey] = [];
    }
    deviceGroups[deviceKey].push(log);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Debug Multi-User Detection</h1>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <h2 className="font-semibold text-blue-900 mb-2">📋 Diagnostic Info</h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Total scans today: <strong>{logs.length}</strong></li>
          <li>• Unique devices: <strong>{Object.keys(deviceGroups).length}</strong></li>
          <li>• Flagged scans: <strong>{logs.filter(l => l.flagged_reason).length}</strong></li>
          <li>• Window: <strong>15 minutes</strong></li>
          <li>• Mode: <strong>Warning (no block)</strong></li>
          <li>• Match: <strong>client_or_uaip</strong></li>
        </ul>
      </div>

      <button
        onClick={loadLogs}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🔄 Refresh
      </button>

      {loading && <div className="text-gray-600">Loading...</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          Error: {error}
        </div>
      )}

      {/* Device Groups */}
      <div className="space-y-6">
        {Object.entries(deviceGroups).map(([deviceKey, deviceLogs]) => {
          const isMultiUser = deviceLogs.length > 1;
          const uniqueUsers = new Set(deviceLogs.map(l => l.detail_siswa_id).filter(Boolean));
          const hasMultipleUsers = uniqueUsers.size > 1;

          return (
            <div
              key={deviceKey}
              className={`border rounded-lg p-4 ${
                hasMultipleUsers
                  ? 'border-red-500 bg-red-50'
                  : isMultiUser
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  {hasMultipleUsers ? '🚨' : isMultiUser ? '⚠️' : '✅'} Device:{' '}
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {deviceKey.substring(0, 16)}...
                  </code>
                </h3>
                <div className="text-sm">
                  <span
                    className={`px-3 py-1 rounded ${
                      hasMultipleUsers
                        ? 'bg-red-200 text-red-800'
                        : isMultiUser
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-green-200 text-green-800'
                    }`}
                  >
                    {uniqueUsers.size} user{uniqueUsers.size > 1 ? 's' : ''} • {deviceLogs.length} scan
                    {deviceLogs.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {hasMultipleUsers && (
                <div className="bg-red-100 border border-red-300 rounded p-2 mb-3 text-sm text-red-900">
                  <strong>⚠️ MULTI-USER DETECTED!</strong> This device was used by {uniqueUsers.size}{' '}
                  different users today.
                  {deviceLogs.some(l => l.flagged_reason) ? (
                    <span className="text-green-700"> ✓ Correctly flagged</span>
                  ) : (
                    <span className="text-red-700"> ✗ NOT FLAGGED (BUG!)</span>
                  )}
                </div>
              )}

              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Student ID</th>
                    <th className="text-left p-2">Result</th>
                    <th className="text-left p-2">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceLogs.map((log, idx) => {
                    const user = log.detail_siswa?.users;
                    const userName = user
                      ? `${user.user_nama_depan} ${user.user_nama_belakang}`
                      : 'N/A';

                    return (
                      <tr key={log.log_id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="p-2">
                          {new Date(log.created_at).toLocaleTimeString('id-ID')}
                        </td>
                        <td className="p-2 font-medium">{userName}</td>
                        <td className="p-2">
                          <code className="text-xs">{log.detail_siswa_id || '-'}</code>
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              log.result === 'ok'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="p-2">
                          {log.flagged_reason ? (
                            <span className="text-red-600 font-semibold">
                              {log.flagged_reason}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Hash details */}
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  🔐 Hash Details
                </summary>
                <div className="mt-2 bg-gray-100 p-2 rounded space-y-1">
                  <div>
                    <strong>Client Hash:</strong>{' '}
                    <code>{deviceLogs[0].device_hash_client || 'null'}</code>
                  </div>
                  <div>
                    <strong>Server Hash:</strong>{' '}
                    <code>{deviceLogs[0].device_hash?.substring(0, 32) || 'null'}...</code>
                  </div>
                  <div>
                    <strong>UA+IP Hash:</strong>{' '}
                    <code>{deviceLogs[0].ua_ip_hash?.substring(0, 32) || 'null'}...</code>
                  </div>
                </div>
              </details>
            </div>
          );
        })}
      </div>

      {logs.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">No scans found today. Try scanning first!</div>
      )}
    </div>
  );
}
