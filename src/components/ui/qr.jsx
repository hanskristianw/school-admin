"use client";

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function Qr({ text, size = 220, className = '' }) {
  const [dataUrl, setDataUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function gen() {
      try {
        if (!text) { setDataUrl(''); return; }
        setLoading(true);
        const url = await QRCode.toDataURL(String(text), { width: size, margin: 1 });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setDataUrl('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    gen();
    return () => { cancelled = true; };
  }, [text, size]);

  // If no text provided, render placeholder box (no <img src="">)
  if (!text) return <div style={{ width: size, height: size }} className={`bg-gray-100 rounded ${className}`} />;

  // While generating or if dataUrl still empty, render skeleton
  if (!dataUrl) return (
    <div style={{ width: size, height: size }} className={`bg-gray-100 rounded animate-pulse ${className}`} aria-busy={loading} />
  );

  return (
    <img src={dataUrl} alt="QR" width={size} height={size} className={className} />
  );
}
