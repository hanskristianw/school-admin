"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function StudentScanPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [last, setLast] = useState(null);
  const ref = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const scanner = new Html5QrcodeScanner(ref.current.id, { fps: 10, qrbox: 250 }, false);
    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;
    return () => { try { scanner.clear(); } catch {} };
  }, []);

  async function onScanSuccess(decodedText) {
    try {
      setStatus('scanning');
      const payload = JSON.parse(decodedText);
      const kr_id = localStorage.getItem('kr_id');
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: payload.sid, tok: payload.tok, user_id: kr_id })
      });
      const j = await res.json();
      if (res.ok && j.status === 'ok') {
        setMessage(t('studentScan.success') || 'Presensi tercatat.');
        setStatus('ok');
        setLast(new Date());
      } else if (j.status === 'duplicate') {
        setMessage(t('studentScan.duplicate') || 'Anda sudah presensi hari ini.');
        setStatus('duplicate');
      } else {
        setMessage(t('studentScan.invalid') || 'QR tidak valid atau sesi ditutup.');
        setStatus('error');
      }
    } catch (e) {
      setMessage((t('studentScan.errorPrefix') || 'Gagal: ') + e.message);
      setStatus('error');
    }
  }

  function onScanFailure() {
    // ignore frame errors
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
            <div id="qr-reader" ref={ref} className="rounded-lg overflow-hidden shadow-sm border border-gray-200" />
          </div>
          <div className="mt-4 text-sm">
            {status !== 'idle' && <div className={status==='ok' ? 'text-green-700' : status==='duplicate' ? 'text-amber-700' : 'text-red-700'}>{message}</div>}
            {last && <div className="text-xs text-gray-500">{t('studentScan.last') || 'Terakhir:'} {last.toLocaleTimeString()}</div>}
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={() => { try { scannerRef.current?.clear(); } catch {} window.location.reload(); }} className="bg-gray-600 hover:bg-gray-700 text-white text-xs">{t('studentScan.restart') || 'Mulai Ulang'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
