'use client';

import { useRef } from 'react';
import Modal from './ui/modal';
import { Button } from './ui/button';

const PAYMENT_NOTE = `Seluruh pembayaran dapat dilakukan dengan cara transfer ke rekening Bank Mayapada 100-3000-3853 an Yayasan Pendidikan Mayapada School.

Apabila parents telah melakukan pembayaran, silakan melakukan konfirmasi, dengan mengirimkan bukti transfer ke whatsapp admission. Tuhan memberkati!`;

export default function DetailTransaksiModal({ isOpen, onClose, sale, items, uniforms, sizes }) {
  const printRef = useRef();

  const handlePrint = () => {
    const winPrint = window.open('', '', 'left=0,top=0,width=620,height=820,toolbar=0,scrollbars=0,status=0');
    winPrint.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Detail Transaksi</title>
  <style>
    @page { size: A5; margin: 12mm 14mm 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; }
    .no-print { display: none; }
  </style>
</head>
<body>
  ${printRef.current.innerHTML}
</body>
</html>`);
    winPrint.document.close();
    winPrint.focus();
    setTimeout(() => { winPrint.print(); winPrint.close(); }, 250);
  };

  if (!sale) return null;

  const itemsData = items.map(item => {
    const u = uniforms.find(u => u.uniform_id === item.uniform_id);
    const s = sizes.find(s => s.size_id === item.size_id);
    return { ...item, uniform_name: u?.uniform_name || '-', size_name: s?.size_name || '-' };
  });

  const computedTotal = itemsData.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
  const fmtRp = (n) => Number(n).toLocaleString('id-ID');
  const saleDate = sale.sale_date
    ? new Date(sale.sale_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cetak Detail Transaksi" size="lg">
      <div className="space-y-4">
        {/* Preview */}
        <div
          ref={printRef}
          className="bg-white p-6 border-2 border-gray-800"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px' }}
        >
          {/* Header */}
          <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px' }}>
            Parent:
          </div>

          {/* Student Name */}
          <div style={{ marginBottom: '6px' }}>
            Nama: &nbsp;&nbsp;&nbsp; <strong>{sale.user_name || '-'}</strong>
          </div>
          <div style={{ marginBottom: '16px', fontSize: '12px', color: '#444' }}>
            Dipesan untuk siswa: <strong>{sale.user_name || '-'}</strong>
          </div>

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
            <tbody>
              {itemsData.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '3px 0', verticalAlign: 'top' }}>
                    {it.uniform_name} No.{it.size_name},&nbsp;&nbsp;{it.qty} Pcs
                  </td>
                  <td style={{ width: '14px', textAlign: 'center', padding: '3px 0' }}>:</td>
                  <td style={{ width: '110px', textAlign: 'right', padding: '3px 0' }}>
                    {fmtRp(Number(it.subtotal || 0))},-
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ borderTop: '1px solid #000', paddingTop: '8px', marginBottom: '22px', fontSize: '14px' }}>
            <strong>Total Rp. {fmtRp(computedTotal)},-</strong>
          </div>

          {/* Signature row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '22px', fontSize: '13px' }}>
            <span>Diterima oleh (paraf) :</span>
            <span style={{ flex: 1, borderBottom: '1px solid #000', minWidth: '80px' }}>&nbsp;</span>
            <span>Tgl: {saleDate}</span>
          </div>

          {/* Payment Note */}
          <div style={{
            borderTop: '1px dashed #aaa',
            paddingTop: '12px',
            fontSize: '11px',
            lineHeight: '1.7',
            color: '#333',
            whiteSpace: 'pre-line',
          }}>
            {PAYMENT_NOTE}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end no-print">
          <Button onClick={onClose} variant="outline" className="px-6">
            Tutup
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
          >
            🖨️ Cetak Detail
          </Button>
        </div>
      </div>
    </Modal>
  );
}
