'use client';

import { useRef } from 'react';
import Modal from './ui/modal';
import { Button } from './ui/button';
import { formatCurrency } from '@/lib/utils';
import { formatTerbilang } from '@/lib/terbilang';

export default function POModal({ isOpen, onClose, purchase, items, uniforms, sizes, units }) {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current;
    const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    
    winPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order #${purchase.purchase_id}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              margin: 0;
              font-size: 12px;
            }
            .po-container { max-width: 750px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #000; }
            .header-left { flex: 1; }
            .header-left h1 { margin: 0; font-size: 16px; font-weight: bold; }
            .header-left p { margin: 2px 0; font-size: 10px; }
            .header-right { text-align: center; }
            .header-right h2 { margin: 0; font-size: 24px; font-weight: bold; }
            .info-section { display: flex; gap: 20px; margin-bottom: 20px; }
            .info-box { flex: 1; }
            .info-box h3 { margin: 0 0 10px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; }
            .info-row { display: flex; margin: 5px 0; font-size: 11px; }
            .info-label { width: 120px; }
            .info-value { flex: 1; font-weight: bold; }
            .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 11px; }
            .items-table th { background: #f0f0f0; font-weight: bold; }
            .items-table td.right { text-align: right; }
            .items-table td.center { text-align: center; }
            .total-section { margin-top: 10px; text-align: right; }
            .total-row { display: flex; justify-content: flex-end; margin: 5px 0; font-size: 12px; }
            .total-label { width: 150px; text-align: right; padding-right: 10px; }
            .total-value { width: 150px; text-align: right; font-weight: bold; border: 1px solid #000; padding: 5px; }
            .signature { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { margin-top: 60px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { margin-top: 30px; border-top: 1px solid #000; padding-top: 10px; font-size: 10px; text-align: center; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
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

  if (!purchase) return null;

  const itemsData = items.map(item => {
    const uniform = uniforms.find(u => u.uniform_id === item.uniform_id);
    const size = sizes.find(s => s.size_id === item.size_id);
    const unit = units.find(u => u.unit_id === item.unit_id);
    const amount = Number(item.qty) * Number(item.unit_cost);
    return {
      ...item,
      uniform_name: uniform?.uniform_name || '-',
      size_name: size?.size_name || '-',
      unit_name: unit?.unit_name || '-',
      amount: amount
    };
  });

  const totalAmount = itemsData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cetak Purchase Order" size="2xl">
      <div className="space-y-4">
        {/* Preview */}
        <div 
          ref={printRef}
          className="bg-white p-8 border border-gray-300"
        >
          <div className="po-container">
            {/* Header */}
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #000' }}>
              <div className="header-left" style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Yayasan Pendidikan Mayapada School</h1>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>Mayapada Tower 1 Lantai 3, Jl.</p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>Jendral Sudirman, Karet, Setiabudi</p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>DKI Jakarta</p>
              </div>
              <div className="header-right" style={{ textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Purchase Order</h2>
              </div>
            </div>

            {/* Info Section */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              {/* Left Column */}
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px' }}>Vendor:</h3>
                  <p style={{ margin: '2px 0', fontSize: '11px', fontWeight: 'bold' }}>{purchase.supplier?.supplier_name || '-'}</p>
                  {purchase.supplier?.address && <p style={{ margin: '2px 0', fontSize: '10px' }}>{purchase.supplier.address}</p>}
                  {(purchase.supplier?.city || purchase.supplier?.postal_code) && (
                    <p style={{ margin: '2px 0', fontSize: '10px' }}>
                      {[purchase.supplier.city, purchase.supplier.postal_code].filter(Boolean).join(' ')}
                    </p>
                  )}
                  {purchase.supplier?.province && <p style={{ margin: '2px 0', fontSize: '10px' }}>{purchase.supplier.province}</p>}
                  {purchase.supplier?.phone && <p style={{ margin: '2px 0', fontSize: '10px' }}>Tel: {purchase.supplier.phone}</p>}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px' }}>Ship To:</h3>
                  <p style={{ margin: '2px 0', fontSize: '11px', fontWeight: 'bold' }}>Mayapada Tower 1 Lantai 3, Jl.</p>
                  <p style={{ margin: '2px 0', fontSize: '10px' }}>Jendral Sudirman, Karet, Setiabudi</p>
                  <p style={{ margin: '2px 0', fontSize: '10px' }}>DKI Jakarta</p>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', margin: '5px 0', fontSize: '11px' }}>
                  <div style={{ width: '120px' }}>PO Date</div>
                  <div style={{ width: '10px' }}>:</div>
                  <div style={{ flex: 1, fontWeight: 'bold' }}>{new Date(purchase.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div style={{ display: 'flex', margin: '5px 0', fontSize: '11px' }}>
                  <div style={{ width: '120px' }}>PO Number</div>
                  <div style={{ width: '10px' }}>:</div>
                  <div style={{ flex: 1, fontWeight: 'bold' }}>{purchase.po_number || `PO/CCS/-/-/${String(purchase.purchase_id).padStart(4, '0')}`}</div>
                </div>
                <div style={{ display: 'flex', margin: '5px 0', fontSize: '11px' }}>
                  <div style={{ width: '120px' }}>Terms</div>
                  <div style={{ width: '10px' }}>:</div>
                  <div style={{ flex: 1, fontWeight: 'bold' }}>C.O.D</div>
                </div>
                <div style={{ display: 'flex', margin: '5px 0', fontSize: '11px' }}>
                  <div style={{ width: '120px' }}>Ship Via</div>
                  <div style={{ width: '10px' }}>:</div>
                  <div style={{ flex: 1 }}></div>
                </div>
                <div style={{ display: 'flex', margin: '5px 0', fontSize: '11px' }}>
                  <div style={{ width: '120px' }}>FOB</div>
                  <div style={{ width: '10px' }}>:</div>
                  <div style={{ flex: 1 }}>FOB</div>
                </div>
                <div style={{ display: 'flex', margin: '5px 0', fontSize: '11px' }}>
                  <div style={{ width: '120px' }}>Expected Date</div>
                  <div style={{ width: '10px' }}>:</div>
                  <div style={{ flex: 1 }}></div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'center', width: '40px', fontSize: '10px' }}>Item</th>
                  <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'left', fontSize: '10px' }}>Description</th>
                  <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'center', width: '50px', fontSize: '10px' }}>Qty</th>
                  <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'right', width: '90px', fontSize: '10px' }}>Unit Price</th>
                  <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'center', width: '50px', fontSize: '10px' }}>Disc %</th>
                  <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'center', width: '50px', fontSize: '10px' }}>Tax</th>
                  <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'right', width: '100px', fontSize: '10px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {itemsData.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px' }}>{item.purchase_item_id || (idx + 1)}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', fontSize: '10px' }}>
                      {item.uniform_name} - {item.size_name}
                      {item.unit_name !== '-' && <span style={{ color: '#666' }}> ({item.unit_name})</span>}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px' }}>{item.qty}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(item.unit_cost)}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px' }}>0</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bottom Section with Say, Description, and Summary */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
              {/* Left Side - Say and Description */}
              <div style={{ flex: 1 }}>
                {/* Say Field */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '11px', minWidth: '40px' }}>Say :</span>
                    <div style={{ flex: 1, border: '1px solid #000', padding: '5px', minHeight: '30px', fontSize: '10px' }}>
                      {formatTerbilang(totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Description Field */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ border: '1px solid #000', padding: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>Description</div>
                    <div style={{ fontSize: '10px' }}>
                      {purchase.notes || 'Pemesanan seragam sekolah CCS TA 2025/2026'}
                    </div>
                  </div>
                </div>

                {/* Prepared By and Approved By */}
                <div style={{ display: 'flex', gap: '40px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', marginBottom: '5px' }}>Prepared By</div>
                    <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '5px' }}>
                      <div style={{ fontSize: '10px' }}>Date:</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', marginBottom: '5px' }}>Approved By</div>
                    <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '5px' }}>
                      <div style={{ fontSize: '10px' }}>Date:</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Summary */}
              <div style={{ minWidth: '250px' }}>
                <table style={{ width: '100%', fontSize: '11px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>Sub Total :</td>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000', fontWeight: 'bold' }}>
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>Discount :</td>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>0</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>:</td>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>0</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>:</td>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>0</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>Estimated Freight</td>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000' }}>0</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000', fontWeight: 'bold' }}>Total Order :</td>
                      <td style={{ padding: '3px 10px', textAlign: 'right', border: '1px solid #000', fontWeight: 'bold' }}>
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer removed - replaced with bottom section above */}
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
            🖨️ Cetak PO
          </Button>
        </div>
      </div>
    </Modal>
  );
}
