"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import NotificationModal from '@/components/ui/notification-modal';
import { sha256 } from '@/lib/utils';

export default function StudentScanPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [last, setLast] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const videoContainerId = 'qr-reader-video';
  const qrRef = useRef(null);
  const processingRef = useRef(false);
  const cooldownRef = useRef(0);
  const deviceHashRef = useRef(null);
  const geoRef = useRef(null);
  const notifInit = { isOpen: false, title: '', message: '', type: 'success' };
  const [notif, setNotif] = useState(notifInit);

  useEffect(() => {
    return () => {
      if (qrRef.current) {
        try { qrRef.current.stop(); } catch {}
        try { qrRef.current.clear(); } catch {}
        qrRef.current = null;
      }
    };
  }, []);

  async function onScanSuccess(decodedText) {
  // Ignore scans while processing or during cooldown
  const nowMs = Date.now();
  if (processingRef.current || nowMs < cooldownRef.current) return;
  processingRef.current = true;
    try {
      setStatus('scanning');
      const payload = JSON.parse(decodedText);
      const kr_id = localStorage.getItem('kr_id');
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: payload.sid, tok: payload.tok, user_id: kr_id, deviceHash: deviceHashRef.current, geo: geoRef.current })
      });
      const j = await res.json();
      if (res.ok && j.status === 'ok') {
        setMessage(t('studentScan.success') || 'Presensi tercatat.');
        setStatus('ok');
        setLast(new Date());
        try { await qrRef.current?.stop(); } catch {}
        setScanning(false);
        setNotif({ isOpen: true, title: t('teacherSubmission.notifSuccessTitle') || 'Success', message: t('studentScan.success') || 'Presensi tercatat.', type: 'success' });
        // After success, prevent further scans until user restarts
        cooldownRef.current = Date.now() + 5 * 60 * 1000; // 5 minutes guard
      } else if (j.status === 'duplicate') {
        setMessage(t('studentScan.duplicate') || 'Anda sudah presensi hari ini.');
        setStatus('duplicate');
        setNotif({ isOpen: true, title: t('attendance.infoTitle') || 'Info', message: t('studentScan.duplicate') || 'Anda sudah presensi hari ini.', type: 'info' });
        // Stop scanning to avoid repeat submits; user can start again if needed
        try { await qrRef.current?.stop(); } catch {}
        setScanning(false);
        cooldownRef.current = Date.now() + 60 * 1000; // 1 minute cool-down
      } else {
        setMessage(t('studentScan.invalid') || 'QR tidak valid atau sesi ditutup.');
        setStatus('error');
        setNotif({ isOpen: true, title: t('attendance.errorTitle') || 'Error', message: t('studentScan.invalid') || 'QR tidak valid atau sesi ditutup.', type: 'error' });
        // Brief cooldown to avoid flooding
        cooldownRef.current = Date.now() + 1500;
      }
    } catch (e) {
      setMessage((t('studentScan.errorPrefix') || 'Gagal: ') + e.message);
      setStatus('error');
      setNotif({ isOpen: true, title: t('attendance.errorTitle') || 'Error', message: (t('studentScan.errorPrefix') || 'Gagal: ') + e.message, type: 'error' });
      cooldownRef.current = Date.now() + 1500;
    }
    finally {
      processingRef.current = false;
    }
  }

  function onScanFailure() {
    // ignore frame errors
  }

  async function startCamera() {
    setStarting(true);
    try {
      // Acquire geolocation first (required)
      const getGeo = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation tidak tersedia'));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          (err) => reject(new Error(err.message || 'Tidak dapat mengambil lokasi')),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });
      geoRef.current = await getGeo();

      // Compute a stable device hash and keep it in localStorage
      const key = 'device_hash_v1';
      let dh = localStorage.getItem(key);
      if (!dh) {
        const seed = `${navigator.userAgent}|${Math.random()}|${Date.now()}`;
        dh = (await sha256(seed)).slice(0, 32);
        localStorage.setItem(key, dh);
      }
      deviceHashRef.current = dh;

      if (!qrRef.current) qrRef.current = new Html5Qrcode(videoContainerId);
      processingRef.current = false; cooldownRef.current = 0;
      await qrRef.current.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
      );
      setScanning(true);
      setStatus('ready');
      setMessage('');
    } catch (e) {
      setStatus('error');
      setMessage((t('studentScan.errorPrefix') || 'Gagal: ') + e.message);
      setNotif({ isOpen: true, title: t('attendance.errorTitle') || 'Error', message: (t('studentScan.errorPrefix') || 'Gagal: ') + e.message, type: 'error' });
    } finally {
      setStarting(false);
    }
  }

  async function stopCamera() {
    try { await qrRef.current?.stop(); } catch {}
    setScanning(false);
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="px-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('studentScan.title') || 'Scan Presensi'}</h1>
        <p className="text-gray-600 text-sm">{t('studentScan.subtitle') || 'Arahkan kamera ke QR di kelas.'}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('studentScan.scanner') || 'Pemindai QR'}</CardTitle></CardHeader>
        <CardContent>
          <div className="mx-auto w-full sm:w-[420px]">
            <div id={videoContainerId} className="rounded-lg overflow-hidden shadow-sm border border-gray-200 min-h-[260px] flex items-center justify-center bg-black/5" />
          </div>
          <div className="mt-4 text-sm">
            {status !== 'idle' && <div className={status==='ok' ? 'text-green-700' : status==='duplicate' ? 'text-amber-700' : 'text-red-700'}>{message}</div>}
            {last && <div className="text-xs text-gray-500">{t('studentScan.last') || 'Terakhir:'} {last.toLocaleTimeString()}</div>}
          </div>
          <div className="mt-3 flex gap-2">
            {!scanning && (
              <Button type="button" onClick={startCamera} disabled={starting} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {starting ? 'Meminta Izin Kamera...' : 'Aktifkan Kamera'}
              </Button>
            )}
            {scanning && (
              <Button type="button" onClick={stopCamera} className="bg-gray-600 hover:bg-gray-700 text-white text-xs">{t('studentScan.restart') || 'Mulai Ulang'}</Button>
            )}
          </div>
        </CardContent>
      </Card>
      <NotificationModal isOpen={notif.isOpen} onClose={() => setNotif(prev => ({ ...prev, isOpen: false }))} title={notif.title} message={notif.message} type={notif.type} />
    </div>
  );
}
