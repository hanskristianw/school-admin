'use client';

import { useRef } from 'react';
import Modal from './ui/modal';
import { Button } from './ui/button';
import { formatCurrency } from '@/lib/utils';
import { formatTerbilang } from '@/lib/terbilang';

export default function KwitansiModal({ isOpen, onClose, sale, items, uniforms, sizes }) {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current;
    const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    
    winPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kwitansi #${sale.sale_id}${sale.is_voided ? ' - DIBATALKAN' : ''}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Times New Roman', serif; 
              padding: 40px; 
              margin: 0;
              font-size: 14px;
            }
            .kwitansi-container { max-width: 700px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 20px; }
            .header .logo { height: 80px; margin: 0 auto 10px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .header h2 { margin: 5px 0 0 0; font-size: 20px; }
            .header p { margin: 5px 0; font-size: 12px; }
            .kwitansi-title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-decoration: underline; }
            .nomor { text-align: center; margin-bottom: 20px; }
            .content { margin: 20px 0; line-height: 2; }
            .row { display: flex; margin: 10px 0; }
            .label { width: 200px; }
            .colon { width: 20px; }
            .value { flex: 1; }
            .nominal-box { border: 2px solid #000; padding: 10px; margin: 15px 0; background: #f9f9f9; }
            .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .items-table th { background: #f0f0f0; font-weight: bold; }
            .items-table td.right { text-align: right; }
            .items-table td.center { text-align: center; }
            .signature { margin-top: 40px; display: flex; justify-content: flex-end; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { margin-top: 80px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { margin-top: 30px; border-top: 1px solid #000; padding-top: 10px; font-size: 11px; text-align: center; }
            .void-watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 120px;
              font-weight: bold;
              color: rgba(220, 38, 38, 0.15);
              z-index: 1000;
              pointer-events: none;
              white-space: nowrap;
              text-transform: uppercase;
              letter-spacing: 20px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${sale.is_voided ? '<div class="void-watermark">DIBATALKAN</div>' : ''}
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    
    winPrint.document.close();
    winPrint.focus();
    setTimeout(() => {
      winPrint.print();
      winPrint.close();
    }, 250);
  };

  if (!sale) return null;

  const itemsData = items.map(item => {
    const uniform = uniforms.find(u => u.uniform_id === item.uniform_id);
    const size = sizes.find(s => s.size_id === item.size_id);
    return {
      ...item,
      uniform_name: uniform?.uniform_name || '-',
      size_name: size?.size_name || '-'
    };
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cetak Kwitansi" size="2xl">
      <div className="space-y-4">
        {/* Preview */}
        <div 
          ref={printRef}
          className="bg-white p-8 border border-gray-300 relative"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          {/* Void Watermark */}
          {sale.is_voided && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 pointer-events-none select-none"
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: 'rgba(220, 38, 38, 0.15)',
                zIndex: 1000,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '20px'
              }}
            >
              DIBATALKAN
            </div>
          )}

          <div className="kwitansi-container">
            {/* Header */}
            <div className="header">
              <img 
                src="/images/login-logo.png" 
                alt="Chung Chung Christian School" 
                style={{ height: '80px', margin: '0 auto 10px', display: 'block' }}
              />
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                CHUNG CHUNG CHRISTIAN SCHOOL
              </h1>
              <p style={{ margin: '5px 0', fontSize: '12px' }}>
                Jl. Raya Gn. Anyar Sawah No.18, Gn. Anyar, Kec. Gn. Anyar, Surabaya, Jawa Timur 60294
              </p>
              <p style={{ margin: '5px 0', fontSize: '12px' }}>
                Telp: (031) 123-4567 | Email: admin@ccs.sch.id
              </p>
            </div>

            {/* Title */}
            <div className="kwitansi-title">
              <strong style={{ textDecoration: 'underline' }}>
                KWITANSI{sale.is_voided ? ' (DIBATALKAN)' : ''}
              </strong>
            </div>
            
            {/* Nomor */}
            <div className="nomor" style={{ textAlign: 'center', marginBottom: '20px' }}>
              No: {String(sale.sale_id).padStart(6, '0')}/KWT-SRG/{new Date(sale.sale_date).getFullYear()}
            </div>

            {/* Void Notice */}
            {sale.is_voided && (
              <div style={{ 
                background: '#fee2e2', 
                border: '2px solid #dc2626', 
                padding: '15px', 
                marginBottom: '20px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold', fontSize: '16px' }}>
                  ⚠️ TRANSAKSI INI TELAH DIBATALKAN
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#7f1d1d' }}>
                  Dibatalkan pada: {new Date(sale.voided_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {sale.void_reason && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#7f1d1d' }}>
                    Alasan: {sale.void_reason}
                  </p>
                )}
                {sale.voided_by && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#7f1d1d' }}>
                    Dibatalkan oleh: {sale.voided_by}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="content">
              <div className="row" style={{ display: 'flex', margin: '10px 0' }}>
                <div className="label" style={{ width: '200px' }}>Sudah terima dari</div>
                <div className="colon" style={{ width: '20px' }}>:</div>
                <div className="value" style={{ flex: 1 }}><strong>{sale.user_name}</strong></div>
              </div>
              
              <div className="row" style={{ display: 'flex', margin: '10px 0' }}>
                <div className="label" style={{ width: '200px' }}>Uang sejumlah</div>
                <div className="colon" style={{ width: '20px' }}>:</div>
                <div className="value" style={{ flex: 1 }}>
                  <div className="nominal-box" style={{ border: '2px solid #000', padding: '10px', background: '#f9f9f9' }}>
                    <strong style={{ fontSize: '16px' }}>{formatTerbilang(sale.total_amount)}</strong>
                  </div>
                </div>
              </div>
              
              <div className="row" style={{ display: 'flex', margin: '10px 0' }}>
                <div className="label" style={{ width: '200px' }}>Untuk pembayaran</div>
                <div className="colon" style={{ width: '20px' }}>:</div>
                <div className="value" style={{ flex: 1 }}><strong>Pembelian Seragam Sekolah</strong></div>
              </div>
            </div>

            {/* Items Detail */}
            <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '8px', background: '#f0f0f0' }}>No</th>
                  <th style={{ border: '1px solid #000', padding: '8px', background: '#f0f0f0' }}>Item Seragam</th>
                  <th style={{ border: '1px solid #000', padding: '8px', background: '#f0f0f0' }}>Ukuran</th>
                  <th style={{ border: '1px solid #000', padding: '8px', background: '#f0f0f0', textAlign: 'center' }}>Qty</th>
                  <th style={{ border: '1px solid #000', padding: '8px', background: '#f0f0f0', textAlign: 'right' }}>Harga</th>
                  <th style={{ border: '1px solid #000', padding: '8px', background: '#f0f0f0', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {itemsData.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>{item.uniform_name}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.size_name}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="5" style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}><strong>TOTAL</strong></td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}><strong>{formatCurrency(sale.total_amount)}</strong></td>
                </tr>
              </tbody>
            </table>

            {/* Payment Info */}
            <div style={{ margin: '15px 0', fontSize: '13px' }}>
              <div className="row" style={{ display: 'flex', margin: '5px 0' }}>
                <div className="label" style={{ width: '200px' }}>Tanggal Pembayaran</div>
                <div className="colon" style={{ width: '20px' }}>:</div>
                <div className="value" style={{ flex: 1 }}>
                  {new Date(sale.sale_date).toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <div className="row" style={{ display: 'flex', margin: '5px 0' }}>
                <div className="label" style={{ width: '200px' }}>Metode Pembayaran</div>
                <div className="colon" style={{ width: '20px' }}>:</div>
                <div className="value" style={{ flex: 1 }}>Transfer Bank</div>
              </div>
            </div>

            {/* Signature */}
            <div className="signature" style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
              <div className="signature-box" style={{ textAlign: 'center', width: '200px' }}>
                <p style={{ margin: 0 }}>Surabaya, {new Date(sale.sale_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p style={{ margin: '5px 0' }}>Penerima,</p>
                <div className="signature-line" style={{ marginTop: '80px', borderTop: '1px solid #000', paddingTop: '5px' }}>
                  <strong>(............................)</strong>
                  <p style={{ margin: '5px 0', fontSize: '12px' }}>Bagian Keuangan</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="footer" style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', fontSize: '11px', textAlign: 'center' }}>
              <p style={{ margin: 0 }}>
                <em>Kwitansi ini sah sebagai bukti pembayaran. Harap disimpan dengan baik.</em>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end no-print">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-6"
          >
            Tutup
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            🖨️ Cetak Kwitansi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
