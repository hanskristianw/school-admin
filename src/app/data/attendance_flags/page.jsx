"use client";

import { useEffect, useState } from 'react';
import { supabase, setAuthToken, createSupabaseWithAuth } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faSpinner, faCalendar, faUser, faClock, faMobileAlt, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import NotificationModal from '@/components/ui/notification-modal';

export default function FlaggedAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [flaggedLogs, setFlaggedLogs] = useState([]);
  const [filterDate, setFilterDate] = useState(''); // Empty = show all
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  
  useEffect(() => {
    loadFlaggedLogs();
  }, []); // Only load once on mount

  async function loadFlaggedLogs() {
    setLoading(true);
    try {
      // Use default supabase client (RLS disabled)
      console.log('[attendance_flags] Loading flagged logs for date:', filterDate);

      // Get attendance_scan_log with flagged_reason
      // Use simple date comparison without time
      const { data: logs, error } = await supabase
        .from('attendance_scan_log')
        .select(`
          log_id,
          result,
          flagged_reason,
          created_at,
          device_hash,
          device_hash_client,
          lat,
          lng,
          detail_siswa_id,
          detail_siswa:detail_siswa_id (
            detail_siswa_id,
            detail_siswa_user_id,
            users:detail_siswa_user_id (
              user_id,
              user_nama_depan,
              user_nama_belakang
            ),
            kelas:detail_siswa_kelas_id (
              kelas_id,
              kelas_nama
            )
          )
        `)
        .not('flagged_reason', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[attendance_flags] Query error:', error);
        throw error;
      }

      console.log('[attendance_flags] Flagged logs found:', logs?.length);
      console.log('[attendance_flags] Sample log:', logs?.[0]);

      setFlaggedLogs(logs || []);
    } catch (e) {
      console.error('Error loading flagged logs:', e);
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'Gagal memuat data: ' + e.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }

  // Filter logs by selected date in client-side
  const filteredLogs = flaggedLogs.filter(log => {
    if (!filterDate) return true; // Show all if no date selected
    // Use UTC date comparison to avoid timezone issues
    const logDate = new Date(log.created_at).toISOString().slice(0, 10);
    return logDate === filterDate;
  });

  function formatTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function getFlagLabel(reason) {
    switch (reason) {
      case 'device_multi_user':
        return { text: 'Multi-User Device', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'outside_geofence':
        return { text: 'Di Luar Area', color: 'bg-red-100 text-red-800 border-red-300' };
      default:
        return { text: reason || 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  }

  return (
    <div className="p-6 space-y-6">
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500" />
            Attendance Flags
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor kehadiran yang terdeteksi mencurigakan (multiple users pada 1 device)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filter Tanggal</CardTitle>
            <Button
              type="button"
              onClick={loadFlaggedLogs}
              disabled={loading}
              className="text-sm"
            >
              <FontAwesomeIcon icon={faSpinner} spin={loading} className="mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <FontAwesomeIcon icon={faCalendar} className="text-gray-500" />
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Tanggal</option>
              <option value={new Date().toISOString().slice(0, 10)}>Hari Ini</option>
              <option value={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}>Kemarin</option>
              <option value={new Date(Date.now() - 7*86400000).toISOString().slice(0, 10)}>7 Hari Lalu</option>
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Atau pilih tanggal..."
            />
            <span className="text-sm text-gray-600">
              Menampilkan: <strong>{filteredLogs.length}</strong> dari {flaggedLogs.length} total flagged
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Kehadiran Terdeteksi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              <FontAwesomeIcon icon={faSpinner} spin className="text-2xl mb-2" />
              <div className="text-sm">Memuat data...</div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-3 text-gray-300" />
              <div className="text-sm">
                {flaggedLogs.length > 0 
                  ? `Tidak ada kehadiran suspicious pada tanggal ${filterDate}` 
                  : 'Tidak ada kehadiran suspicious'}
              </div>
              {flaggedLogs.length > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  Ada {flaggedLogs.length} flagged logs di tanggal lain. Ubah tanggal atau refresh untuk melihat semua.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const flag = getFlagLabel(log.flagged_reason);
                const student = log.detail_siswa;
                const user = student?.users;
                const kelas = student?.kelas;
                const userName = user ? `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.trim() : `User ID: ${student?.detail_siswa_user_id}`;
                
                return (
                  <div
                    key={log.log_id}
                    className="border border-amber-200 bg-amber-50 rounded-lg p-4 hover:bg-amber-100 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FontAwesomeIcon icon={faUser} className="text-gray-600" />
                          <span className="font-semibold text-gray-800">
                            {userName}
                          </span>
                          {kelas && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full border">
                              {kelas.kelas_nama}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} />
                            <span>{formatTime(log.created_at)}</span>
                          </div>
                          {log.lat && log.lng && (
                            <div className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faMapMarkerAlt} />
                              <span>{log.lat.toFixed(6)}, {log.lng.toFixed(6)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${flag.color}`}>
                        {flag.text}
                      </div>
                    </div>
                    
                    <div className="border-t border-amber-200 pt-3 mt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <FontAwesomeIcon icon={faMobileAlt} className="text-gray-500 mr-2" />
                          <span className="text-gray-600">Device Hash (Client):</span>
                          <div className="ml-5 font-mono text-[11px] text-gray-800 break-all">
                            {log.device_hash_client || log.device_hash || '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Alasan Flag:</span>
                          <div className="ml-5 text-gray-800">
                            {log.flagged_reason === 'device_multi_user' && (
                              <span>Device ini digunakan oleh user lain dalam 15 menit terakhir</span>
                            )}
                            {log.flagged_reason === 'outside_geofence' && (
                              <span>Lokasi di luar radius sekolah</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 bg-amber-100 border border-amber-300 rounded p-2 text-xs text-amber-800">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                      <strong>Catatan:</strong> Kehadiran ini tetap tercatat, namun perlu verifikasi manual oleh guru.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
