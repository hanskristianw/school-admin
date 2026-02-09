'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalculator, faArrowLeft, faSpinner, faTag, faPlus, faTrash,
  faArrowUp, faArrowDown, faPercent, faMoneyBill, faInfoCircle,
  faChevronRight, faFileInvoice, faPrint, faSchool, faCalendar
} from '@fortawesome/free-solid-svg-icons';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
};

const monthNames = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];

export default function FeeSimulationPage() {
  const router = useRouter();

  // Data from DB
  const [levels, setLevels] = useState([]);
  const [years, setYears] = useState([]);
  const [udpDefs, setUdpDefs] = useState([]);
  const [usekDefs, setUsekDefs] = useState([]);
  const [masterDiscounts, setMasterDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('eksternal');

  // Simulation discounts (local state, not saved to DB)
  const [simDiscounts, setSimDiscounts] = useState([]); // [{id, discount_id, fee_target, value_type, value, seq, discount_name, discount_code}]
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [addDiscountTarget, setAddDiscountTarget] = useState('udp');

  // Installment config
  const [installmentConfig, setInstallmentConfig] = useState({
    utj_percentage: 30,
    num_installments: 11,
    start_month: 7,
    start_year: new Date().getFullYear(),
  });

  // Notification
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  // Active step
  const [step, setStep] = useState(1); // 1: Pilih Jenjang, 2: Potongan, 3: Simulasi Cicilan

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [levelsRes, yearsRes, udpRes, usekRes, discRes] = await Promise.all([
        supabase.from('admission_level').select('level_id, level_name, level_order, unit_id, unit:unit_id(unit_name)').eq('is_active', true).order('level_order'),
        supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false }),
        supabase.from('udp_definition').select('*').eq('is_active', true),
        supabase.from('school_fee_definition').select('*').eq('is_active', true),
        supabase.from('fee_discount').select('*').eq('is_active', true),
      ]);

      setLevels(levelsRes.data || []);
      setYears(yearsRes.data || []);
      setUdpDefs(udpRes.data || []);
      setUsekDefs(usekRes.data || []);
      setMasterDiscounts(discRes.data || []);
    } catch (err) {
      console.error('Error:', err);
      showNotification('Error', 'Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Unique units from levels
  const units = useMemo(() =>
    [...new Map(levels.map(l => [l.unit_id, { unit_id: l.unit_id, unit_name: l.unit?.unit_name }])).values()],
    [levels]
  );

  // Available categories for selected level + year (derived from udp_definition)
  const categoryLabels = { eksternal: 'Eksternal (Siswa Baru)', internal: 'Internal (Pindah Jenjang)' };
  const availableCategories = useMemo(() => {
    if (!selectedLevel || !selectedYear) return [];
    const levelId = parseInt(selectedLevel);
    const yearId = parseInt(selectedYear);
    const cats = [...new Set(
      udpDefs
        .filter(u => u.level_id === levelId && u.year_id === yearId)
        .map(u => u.student_category || 'eksternal')
    )];
    // Sort so 'eksternal' comes first
    return cats.sort((a, b) => a === 'eksternal' ? -1 : 1);
  }, [selectedLevel, selectedYear, udpDefs]);

  // Auto-select category when available list changes
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories]);

  // Get matching UDP definition
  const matchedUdp = useMemo(() => {
    if (!selectedLevel || !selectedYear) return null;
    const levelId = parseInt(selectedLevel);
    const yearId = parseInt(selectedYear);
    const today = new Date().toISOString().slice(0, 10);

    const candidates = udpDefs.filter(u =>
      u.level_id === levelId && u.year_id === yearId &&
      (u.student_category || 'eksternal') === selectedCategory
    );

    // Try to match by today's date within effective period
    if (candidates.length > 1) {
      const dateMatch = candidates.find(u =>
        u.effective_from && u.effective_until &&
        today >= u.effective_from && today <= u.effective_until
      );
      if (dateMatch) return dateMatch;
    }
    return candidates[0] || null;
  }, [selectedLevel, selectedYear, selectedCategory, udpDefs]);

  // Get all UDP periods for display
  const udpPeriods = useMemo(() => {
    if (!selectedLevel || !selectedYear) return [];
    const levelId = parseInt(selectedLevel);
    const yearId = parseInt(selectedYear);
    return udpDefs.filter(u =>
      u.level_id === levelId && u.year_id === yearId &&
      (u.student_category || 'eksternal') === selectedCategory
    ).sort((a, b) => (a.effective_from || '').localeCompare(b.effective_from || ''));
  }, [selectedLevel, selectedYear, selectedCategory, udpDefs]);

  // Get matching USEK definition
  const matchedUsek = useMemo(() => {
    if (!selectedLevel || !selectedYear) return null;
    const levelId = parseInt(selectedLevel);
    const yearId = parseInt(selectedYear);
    return usekDefs.find(u => u.level_id === levelId && u.year_id === yearId) || null;
  }, [selectedLevel, selectedYear, usekDefs]);

  // Available discounts for selected level/unit/year
  const availableDiscounts = useMemo(() => {
    if (!selectedLevel || !selectedYear) return [];
    const levelId = parseInt(selectedLevel);
    const yearId = parseInt(selectedYear);
    const level = levels.find(l => l.level_id === levelId);
    if (!level) return [];

    return masterDiscounts.filter(d =>
      d.unit_id === level.unit_id &&
      d.year_id === yearId &&
      (d.level_id === null || d.level_id === levelId)
    );
  }, [selectedLevel, selectedYear, levels, masterDiscounts]);

  // Waterfall discount calculation
  const calculateDiscounts = (discountList, feeTarget) => {
    const base = feeTarget === 'udp' ? (matchedUdp?.total_amount || 0) : (matchedUsek?.monthly_amount || matchedUsek?.default_amount || 0);
    let subtotal = base;
    return discountList
      .filter(d => d.fee_target === feeTarget)
      .sort((a, b) => a.seq - b.seq)
      .map(d => {
        const before = subtotal;
        let amount = 0;
        if (d.value_type === 'percentage') {
          amount = Math.round(before * (d.value / 100));
        } else {
          amount = Math.min(d.value, before);
        }
        subtotal = Math.max(0, before - amount);
        return { ...d, base_before: before, calculated_amount: amount, subtotal_after: subtotal };
      });
  };

  const udpDiscCalc = useMemo(() => calculateDiscounts(simDiscounts, 'udp'), [simDiscounts, matchedUdp]);
  const usekDiscCalc = useMemo(() => calculateDiscounts(simDiscounts, 'usek'), [simDiscounts, matchedUsek]);

  const udpBase = matchedUdp?.total_amount || 0;
  const udpFinal = udpDiscCalc.length > 0 ? udpDiscCalc[udpDiscCalc.length - 1].subtotal_after : udpBase;
  const usekBase = matchedUsek?.monthly_amount || matchedUsek?.default_amount || 0;
  const usekFinal = usekDiscCalc.length > 0 ? usekDiscCalc[usekDiscCalc.length - 1].subtotal_after : usekBase;

  // Installment schedule
  const installmentSchedule = useMemo(() => {
    const totalEntry = udpFinal + usekFinal;
    if (totalEntry <= 0) return null;

    const utjAmount = Math.round(totalEntry * installmentConfig.utj_percentage / 100);
    const remaining = totalEntry - utjAmount;
    const numInst = installmentConfig.num_installments;
    const monthlyAmount = Math.floor(remaining / numInst);
    const lastMonthAmount = remaining - (monthlyAmount * (numInst - 1));

    const items = [];
    for (let i = 0; i < numInst; i++) {
      const mIdx = (installmentConfig.start_month - 1 + i) % 12;
      const yVal = installmentConfig.start_year + Math.floor((installmentConfig.start_month - 1 + i) / 12);
      const baseAmt = i === numInst - 1 ? lastMonthAmount : monthlyAmount;
      const isFirst = i === 0;
      const amt = isFirst ? baseAmt + utjAmount : baseAmt;
      items.push({
        seq: i + 1,
        label: `Cicilan ${i + 1} (${monthNames[mIdx]} ${yVal})`,
        info: isFirst ? `Termasuk UTJ ${formatCurrency(utjAmount)} (${installmentConfig.utj_percentage}% dari ${formatCurrency(totalEntry)})` : null,
        month: mIdx + 1,
        year: yVal,
        amount: amt,
      });
    }
    return { udpFinal, usekFinal: usekFinal, totalEntry, utjAmount, remaining, numInst, monthlyAmount, lastMonthAmount, items };
  }, [udpFinal, usekFinal, installmentConfig]);

  // === DISCOUNT ACTIONS (local state only) ===
  const handleAddDiscount = (master, feeTarget) => {
    const existing = simDiscounts.filter(d => d.fee_target === feeTarget);
    const newSeq = existing.length + 1;
    setSimDiscounts(prev => [...prev, {
      id: Date.now(),
      discount_id: master.discount_id,
      fee_target: feeTarget,
      value_type: master.discount_type,
      value: master.discount_value,
      seq: newSeq,
      discount_name: master.discount_name,
      discount_code: master.discount_code,
    }]);
    setShowAddDiscount(false);
  };

  const handleRemoveDiscount = (id, feeTarget) => {
    const updated = simDiscounts.filter(d => d.id !== id);
    // Re-sequence
    let seq = 1;
    const reSeq = updated.map(d => {
      if (d.fee_target === feeTarget) {
        return { ...d, seq: seq++ };
      }
      return d;
    });
    setSimDiscounts(reSeq);
  };

  const handleMoveDiscount = (id, feeTarget, direction) => {
    const targetDiscs = simDiscounts.filter(d => d.fee_target === feeTarget).sort((a, b) => a.seq - b.seq);
    const idx = targetDiscs.findIndex(d => d.id === id);
    if (direction === 'up' && idx > 0) {
      [targetDiscs[idx].seq, targetDiscs[idx - 1].seq] = [targetDiscs[idx - 1].seq, targetDiscs[idx].seq];
    } else if (direction === 'down' && idx < targetDiscs.length - 1) {
      [targetDiscs[idx].seq, targetDiscs[idx + 1].seq] = [targetDiscs[idx + 1].seq, targetDiscs[idx].seq];
    }
    const otherDiscs = simDiscounts.filter(d => d.fee_target !== feeTarget);
    setSimDiscounts([...otherDiscs, ...targetDiscs]);
  };

  // Reset discounts when level/year changes
  useEffect(() => {
    setSimDiscounts([]);
  }, [selectedLevel, selectedYear, selectedCategory]);

  // === PDF Generation ===
  const handlePrintSimulation = async () => {
    if (!installmentSchedule) return;
    const calc = installmentSchedule;
    const level = levels.find(l => l.level_id === parseInt(selectedLevel));
    const year = years.find(y => y.year_id === parseInt(selectedYear));

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const marginL = 20;
    const marginR = 20;
    const contentW = pageW - marginL - marginR;
    let y = 15;

    const fmtIDR = (v) => formatCurrency(v);

    // Logo
    try {
      const logoImg = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Logo not found'));
        img.src = '/images/login-logo.png';
      });
      const maxH = 18;
      const ratio = logoImg.width / logoImg.height;
      const imgH = maxH;
      const imgW = imgH * ratio;
      doc.addImage(logoImg, 'PNG', (pageW - imgW) / 2, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      y += 4;
    }

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CHUNG CHUNG CHRISTIAN SCHOOL', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Jl. Raya Gn. Anyar Sawah No.18, Gn. Anyar, Kec. Gn. Anyar', pageW / 2, y, { align: 'center' });
    y += 4;
    doc.text('Surabaya, Jawa Timur 60294', pageW / 2, y, { align: 'center' });
    y += 4;
    doc.text('Telp: (031) 5017171 | Email: info@ccs.sch.id', pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(100);
    doc.setLineWidth(0.8);
    doc.line(marginL, y, pageW - marginR, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);
    y += 8;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SIMULASI BIAYA PENDIDIKAN', pageW / 2, y, { align: 'center' });
    y += 8;

    // Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const infoData = [
      ['Jenjang', `: ${level?.level_name || '-'} (${level?.unit?.unit_name || '-'})`],
      ['Tahun Ajaran', `: ${year?.year_name || '-'}`],
      ['Kategori Siswa', `: ${categoryLabels[selectedCategory] || selectedCategory}`],
      ['Tanggal Simulasi', `: ${today}`],
    ];
    infoData.forEach(([label, val]) => {
      doc.text(label, marginL + 4, y);
      doc.text(val, marginL + 45, y);
      y += 5;
    });
    y += 4;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('* Simulasi ini bersifat estimasi. Biaya aktual dapat berbeda saat pendaftaran resmi.', marginL, y);
    doc.setTextColor(0);
    y += 8;

    // 1. Rincian Biaya
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. Rincian Biaya Masuk', marginL, y);
    y += 6;

    const feeBody = [
      ['Uang Daftar / Pangkal (UDP)', fmtIDR(udpBase)],
    ];
    if (udpDiscCalc.length > 0) {
      udpDiscCalc.forEach(d => {
        const desc = d.value_type === 'percentage' ? `${d.discount_name} (${d.value}%)` : `${d.discount_name}`;
        feeBody.push([`  Potongan: ${desc}`, `- ${fmtIDR(d.calculated_amount)}`]);
      });
      feeBody.push([{ content: 'UDP Setelah Potongan', styles: { fontStyle: 'bold' } }, { content: fmtIDR(udpFinal), styles: { fontStyle: 'bold' } }]);
    }
    feeBody.push(['SPP / Bulan', fmtIDR(usekBase)]);
    if (usekDiscCalc.length > 0) {
      usekDiscCalc.forEach(d => {
        const desc = d.value_type === 'percentage' ? `${d.discount_name} (${d.value}%)` : `${d.discount_name}`;
        feeBody.push([`  Potongan: ${desc}`, `- ${fmtIDR(d.calculated_amount)}`]);
      });
      feeBody.push([{ content: 'SPP Setelah Potongan / Bulan', styles: { fontStyle: 'bold' } }, { content: fmtIDR(usekFinal), styles: { fontStyle: 'bold' } }]);
    }
    feeBody.push([{ content: 'TOTAL BIAYA MASUK (UDP + SPP bulan pertama)', styles: { fontStyle: 'bold' } }, { content: fmtIDR(calc.totalEntry), styles: { fontStyle: 'bold' } }]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'left', cellWidth: 100 }, 1: { halign: 'right' } },
      head: [['Komponen', 'Jumlah']],
      body: feeBody
    });
    y = doc.lastAutoTable.finalY + 8;

    // 2. Skema Cicilan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('2. Skema Cicilan Inhouse', marginL, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const skemaText = `Total biaya masuk sebesar ${fmtIDR(calc.totalEntry)} dapat dibayar dengan skema cicilan sebagai berikut:`;
    const splitSkema = doc.splitTextToSize(skemaText, contentW);
    doc.text(splitSkema, marginL, y);
    y += splitSkema.length * 4.5 + 4;

    const tableRows = calc.items.map(item => [
      String(item.seq),
      item.seq === 1 ? `${item.label}\n(Termasuk UTJ ${fmtIDR(calc.utjAmount)})` : item.label,
      fmtIDR(item.amount)
    ]);
    tableRows.push([{ content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } }, { content: fmtIDR(calc.items.reduce((s, i) => s + i.amount, 0)), styles: { fontStyle: 'bold' } }]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'center', cellWidth: 18 }, 1: { halign: 'left' }, 2: { halign: 'right', cellWidth: 45 } },
      head: [['No', 'Keterangan', 'Jumlah']],
      body: tableRows
    });
    y = doc.lastAutoTable.finalY + 8;

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(marginL, pageH - 15, pageW - marginR, pageH - 15);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('Dokumen ini dicetak secara otomatis oleh sistem Chung Chung Christian School.', pageW / 2, pageH - 10, { align: 'center' });
    doc.text(`Simulasi | Dicetak: ${new Date().toLocaleString('id-ID')}`, pageW / 2, pageH - 6, { align: 'center' });
    doc.setTextColor(0);

    const levelName = level?.level_name?.replace(/\s+/g, '_') || 'Simulasi';
    doc.save(`Simulasi_Biaya_${levelName}_${year?.year_name?.replace(/\//g, '-') || ''}.pdf`);
  };

  // Selected level info
  const selectedLevelObj = levels.find(l => l.level_id === parseInt(selectedLevel));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FontAwesomeIcon icon={faCalculator} className="text-purple-600" />
            Simulasi Biaya Pendidikan
          </h1>
          <p className="text-gray-600">Hitung estimasi biaya masuk dan skema cicilan untuk calon siswa</p>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: 'Pilih Jenjang' },
          { num: 2, label: 'Potongan' },
          { num: 3, label: 'Simulasi Cicilan' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s.num === 1 || (s.num >= 2 && selectedLevel && selectedYear)) setStep(s.num);
              }}
              disabled={s.num >= 2 && (!selectedLevel || !selectedYear)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                step === s.num
                  ? 'bg-purple-600 text-white shadow-md'
                  : step > s.num
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-400'
              } disabled:cursor-not-allowed`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.num ? 'bg-white text-purple-600' : step > s.num ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-400'
              }`}>{s.num}</span>
              {s.label}
            </button>
            {idx < 2 && <FontAwesomeIcon icon={faChevronRight} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {/* ========== STEP 1: Pilih Jenjang ========== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faSchool} className="text-purple-600" />
              Pilih Jenjang & Tahun Ajaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Jenjang Pendaftaran *</Label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Pilih Jenjang</option>
                  {levels.map(l => (
                    <option key={l.level_id} value={l.level_id}>
                      {l.unit?.unit_name} — {l.level_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tahun Ajaran *</Label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Pilih Tahun</option>
                  {years.map(y => (
                    <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Kategori Siswa</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={availableCategories.length <= 1}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {availableCategories.length === 0 && (
                    <option value="">Pilih jenjang & tahun dulu</option>
                  )}
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{categoryLabels[cat] || cat}</option>
                  ))}
                </select>
                {selectedLevel && selectedYear && availableCategories.length === 1 && (
                  <p className="text-xs text-gray-400 mt-1">Hanya tersedia 1 kategori untuk jenjang ini</p>
                )}
              </div>
            </div>

            {/* Fee Preview */}
            {selectedLevel && selectedYear && (
              <div className="mt-6 space-y-4">
                {/* UDP Info */}
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-3">
                    <span className="font-semibold text-emerald-800">UDP (Uang Daftar / Pangkal)</span>
                  </div>
                  <div className="p-4">
                    {matchedUdp ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Biaya UDP saat ini</span>
                          <span className="text-xl font-bold text-emerald-700">{formatCurrency(matchedUdp.total_amount)}</span>
                        </div>
                        {matchedUdp.effective_from && (
                          <p className="text-xs text-gray-400">
                            Berlaku: {matchedUdp.effective_from} s/d {matchedUdp.effective_until || '~'}
                          </p>
                        )}
                        {udpPeriods.length > 1 && (
                          <div className="mt-2 border-t pt-2">
                            <p className="text-xs font-medium text-gray-500 mb-2">Semua periode harga UDP:</p>
                            <div className="space-y-1">
                              {udpPeriods.map((p, i) => (
                                <div key={i} className={`flex justify-between text-xs px-2 py-1 rounded ${p.udp_def_id === matchedUdp.udp_def_id ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-gray-500'}`}>
                                  <span>{p.effective_from || '-'} — {p.effective_until || '-'}</span>
                                  <span>{formatCurrency(p.total_amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-2">Belum ada definisi UDP untuk jenjang & tahun ini</p>
                    )}
                  </div>
                </div>

                {/* USEK Info */}
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3">
                    <span className="font-semibold text-blue-800">SPP (Sumbangan Pembinaan Pendidikan)</span>
                  </div>
                  <div className="p-4">
                    {matchedUsek ? (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">SPP / bulan</span>
                        <span className="text-xl font-bold text-blue-700">{formatCurrency(matchedUsek.monthly_amount || matchedUsek.default_amount)}</span>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-2">Belum ada definisi SPP untuk jenjang & tahun ini</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!matchedUdp && !matchedUsek}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Lanjut ke Potongan <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========== STEP 2: Potongan ========== */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faTag} className="text-purple-600" />
              Potongan / Diskon
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {selectedLevelObj?.unit?.unit_name} — {selectedLevelObj?.level_name} | {years.find(y => y.year_id === parseInt(selectedYear))?.year_name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* UDP Discounts */}
            {matchedUdp && (
              <div className="border border-emerald-200 rounded-lg overflow-hidden">
                <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-emerald-800">UDP</span>
                    <span className="text-sm text-emerald-600 ml-2">Base: {formatCurrency(udpBase)}</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => { setAddDiscountTarget('udp'); setShowAddDiscount(true); }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Tambah
                  </Button>
                </div>
                {(() => {
                  if (udpDiscCalc.length === 0) {
                    return <div className="px-4 py-4 text-center text-gray-400 text-sm">Belum ada potongan UDP</div>;
                  }
                  return (
                    <div className="divide-y divide-emerald-100">
                      {udpDiscCalc.map((d, idx) => (
                        <div key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{d.seq}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{d.discount_name}</p>
                            <p className="text-xs text-gray-500">
                              {d.value_type === 'percentage' ? <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</> : <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (fixed)</>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-red-600">-{formatCurrency(d.calculated_amount)}</p>
                            <p className="text-xs text-gray-400">→ {formatCurrency(d.subtotal_after)}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleMoveDiscount(d.id, 'udp', 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowUp} className="text-xs" /></button>
                            <button onClick={() => handleMoveDiscount(d.id, 'udp', 'down')} disabled={idx === udpDiscCalc.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowDown} className="text-xs" /></button>
                          </div>
                          <button onClick={() => handleRemoveDiscount(d.id, 'udp')} className="p-1 text-red-400 hover:text-red-600"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                        </div>
                      ))}
                      <div className="px-4 py-3 bg-emerald-50 flex items-center justify-between">
                        <span className="font-semibold text-emerald-800 text-sm">UDP Final</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(udpFinal)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* USEK Discounts */}
            {matchedUsek && (
              <div className="border border-blue-200 rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-blue-800">SPP</span>
                    <span className="text-sm text-blue-600 ml-2">Base/bulan: {formatCurrency(usekBase)}</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    onClick={() => { setAddDiscountTarget('usek'); setShowAddDiscount(true); }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Tambah
                  </Button>
                </div>
                {(() => {
                  if (usekDiscCalc.length === 0) {
                    return <div className="px-4 py-4 text-center text-gray-400 text-sm">Belum ada potongan SPP</div>;
                  }
                  return (
                    <div className="divide-y divide-blue-100">
                      {usekDiscCalc.map((d, idx) => (
                        <div key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{d.seq}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{d.discount_name}</p>
                            <p className="text-xs text-gray-500">
                              {d.value_type === 'percentage' ? <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</> : <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (fixed)</>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-red-600">-{formatCurrency(d.calculated_amount)}</p>
                            <p className="text-xs text-gray-400">→ {formatCurrency(d.subtotal_after)}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleMoveDiscount(d.id, 'usek', 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowUp} className="text-xs" /></button>
                            <button onClick={() => handleMoveDiscount(d.id, 'usek', 'down')} disabled={idx === usekDiscCalc.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowDown} className="text-xs" /></button>
                          </div>
                          <button onClick={() => handleRemoveDiscount(d.id, 'usek')} className="p-1 text-red-400 hover:text-red-600"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                        </div>
                      ))}
                      <div className="px-4 py-3 bg-blue-50 flex items-center justify-between">
                        <span className="font-semibold text-blue-800 text-sm">SPP Final / bulan</span>
                        <span className="font-bold text-blue-700">{formatCurrency(usekFinal)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Discount Picker */}
            {showAddDiscount && (
              <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-gray-900">
                    Tambah Potongan {addDiscountTarget === 'udp' ? 'UDP' : 'SPP'}
                  </h4>
                  <button onClick={() => setShowAddDiscount(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
                </div>
                <div className="space-y-2">
                  {availableDiscounts
                    .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                    .filter(m => !simDiscounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                    .map(m => (
                      <button
                        key={m.discount_id}
                        onClick={() => handleAddDiscount(m, addDiscountTarget)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-900">{m.discount_name}</p>
                          <p className="text-xs text-gray-500">{m.discount_code}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.discount_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                          {m.discount_type === 'percentage' ? `${m.discount_value}%` : formatCurrency(m.discount_value)}
                        </span>
                      </button>
                    ))
                  }
                  {availableDiscounts
                    .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                    .filter(m => !simDiscounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                    .length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-3">
                      Tidak ada potongan tersedia untuk {addDiscountTarget === 'udp' ? 'UDP' : 'SPP'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border border-purple-200 rounded-lg overflow-hidden">
              <div className="bg-purple-50 px-4 py-3">
                <span className="font-semibold text-purple-800">Ringkasan Biaya Masuk</span>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">UDP (setelah potongan)</span>
                  <span className="font-medium">{formatCurrency(udpFinal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">SPP bulan pertama (setelah potongan)</span>
                  <span className="font-medium">{formatCurrency(usekFinal)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-purple-800">
                  <span>Total Biaya Masuk</span>
                  <span>{formatCurrency(udpFinal + usekFinal)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep(3)}
              disabled={udpFinal + usekFinal <= 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Lanjut ke Simulasi Cicilan <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ========== STEP 3: Simulasi Cicilan ========== */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faFileInvoice} className="text-purple-600" />
              Simulasi Cicilan
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {selectedLevelObj?.unit?.unit_name} — {selectedLevelObj?.level_name} | {years.find(y => y.year_id === parseInt(selectedYear))?.year_name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fee Summary */}
            <div className="border border-purple-200 rounded-lg overflow-hidden">
              <div className="bg-purple-50 px-4 py-3">
                <span className="font-semibold text-purple-800">Ringkasan Biaya Masuk</span>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">UDP (setelah potongan)</span>
                  <span className="font-medium">{formatCurrency(udpFinal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">SPP bulan pertama (setelah potongan)</span>
                  <span className="font-medium">{formatCurrency(usekFinal)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-purple-800">
                  <span>Total Biaya Masuk</span>
                  <span>{formatCurrency(udpFinal + usekFinal)}</span>
                </div>
              </div>
            </div>

            {/* Installment Configuration */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-800">Pengaturan Cicilan</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Persentase UTJ (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1"
                    value={installmentConfig.utj_percentage}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, utj_percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Jumlah Cicilan (bulan)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    className="mt-1"
                    value={installmentConfig.num_installments}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, num_installments: Math.min(24, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Bulan Mulai</Label>
                  <select
                    className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={installmentConfig.start_month}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, start_month: parseInt(e.target.value) }))}
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Tahun Mulai</Label>
                  <Input
                    type="number"
                    min="2020"
                    max="2040"
                    className="mt-1"
                    value={installmentConfig.start_year}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, start_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  />
                </div>
              </div>
            </div>

            {/* UTJ Info */}
            {installmentSchedule && (
              <>
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="bg-amber-50 px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-amber-800">UTJ (Uang Tanda Jadi)</span>
                    <span className="font-bold text-amber-700 text-lg">{formatCurrency(installmentSchedule.utjAmount)}</span>
                  </div>
                  <div className="px-4 py-2 text-xs text-gray-500">
                    {installmentConfig.utj_percentage}% dari total {formatCurrency(installmentSchedule.totalEntry)} — sudah termasuk dalam Cicilan 1
                  </div>
                </div>

                {/* Remaining */}
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-blue-800">Sisa Cicilan</span>
                    <span className="font-bold text-blue-700">{formatCurrency(installmentSchedule.remaining)}</span>
                  </div>
                  <div className="px-4 py-2 text-xs text-gray-500">
                    Dibagi {installmentSchedule.numInst} bulan — {formatCurrency(installmentSchedule.monthlyAmount)}/bulan
                    {installmentSchedule.lastMonthAmount !== installmentSchedule.monthlyAmount && (
                      <span className="ml-1">(cicilan terakhir: {formatCurrency(installmentSchedule.lastMonthAmount)})</span>
                    )}
                  </div>
                </div>

                {/* Schedule Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3">
                    <span className="font-semibold text-gray-800">Jadwal Pembayaran</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs">
                          <th className="px-4 py-2 text-left w-12">No</th>
                          <th className="px-4 py-2 text-left">Keterangan</th>
                          <th className="px-4 py-2 text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {installmentSchedule.items.map((item) => (
                          <tr key={item.seq} className={item.seq === 1 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-gray-500">{item.seq}</td>
                            <td className="px-4 py-2">
                              <span className={`font-medium ${item.seq === 1 ? 'text-amber-800' : 'text-gray-900'}`}>{item.label}</span>
                              {item.info && <p className="text-xs text-gray-400">{item.info}</p>}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-purple-50 font-bold text-purple-800">
                          <td className="px-4 py-3" colSpan="2">Total</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(installmentSchedule.items.reduce((sum, i) => sum + i.amount, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Print */}
                <div className="flex justify-end">
                  <Button
                    onClick={handlePrintSimulation}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <FontAwesomeIcon icon={faPrint} className="mr-2" />
                    Cetak PDF Simulasi
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
