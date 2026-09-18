'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { useI18n } from '@/lib/i18n';
import supabase from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSackDollar, 
  faSchool, 
  faCalendar, 
  faMoneyBillWave,
  faSave, 
  faSpinner, 
  faReceipt, 
  faInfoCircle, 
  faSitemap, 
  faPlus, 
  faEdit, 
  faTrash,
  faFileInvoiceDollar,
  faCheckCircle,
  faExclamationTriangle,
  faClock,
  faTag
} from '@fortawesome/free-solid-svg-icons';

// Currency formatting helpers (Indonesian Thousand Separator: '.')
const onlyDigits = (s) => (s || '').toString().replace(/\D/g, '');
const fmtThousands = (digits) => {
  if (!digits) return '';
  const cleaned = digits.toString().replace(/^0+(?!$)/, '');
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const presentIDR = (s) => fmtThousands(onlyDigits(s));
const toNumber = (s) => {
  const d = onlyDigits(s);
  return d ? Number(d) : 0;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function SchoolFeePage() {
  const { t } = useI18n();
  const { theme, isDark } = useTheme();

  // Primary selections
  const [years, setYears] = useState([]);
  const [levels, setLevels] = useState([]);
  const [levelId, setLevelId] = useState('');
  const [yearId, setYearId] = useState('');
  
  // Tabs: 'school' (SPP) | 'udp' (DPP) | 'admission' (Form Fee)
  const [tab, setTab] = useState('school');
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  // ─── TAB 1: SPP (USEK) STATE ───────────────────────────────────────
  const [sfId, setSfId] = useState(null);
  const [sfDefault, setSfDefault] = useState('0');

  // ─── TAB 2: DPP (UDP) STATE ─────────────────────────────────────────
  const [udpEntries, setUdpEntries] = useState([]);
  const [showUdpForm, setShowUdpForm] = useState(false);
  const [editingUdp, setEditingUdp] = useState(null);
  const [udpForm, setUdpForm] = useState({
    total_amount: '',
    student_category: 'eksternal',
    effective_from: '',
    effective_until: '',
    notes: ''
  });
  const [udpFormErrors, setUdpFormErrors] = useState({});

  // ─── TAB 3: BIAYA FORMULIR (ADMISSION) STATE ───────────────────────
  const [admissionFormFees, setAdmissionFormFees] = useState([]);
  const [loadingFormFees, setLoadingFormFees] = useState(false);
  const [showFormFeeModal, setShowFormFeeModal] = useState(false);
  const [editingFormFee, setEditingFormFee] = useState(null);
  const [formFeeForm, setFormFeeForm] = useState({
    wave_name: '',
    amount: '',
    effective_from: '',
    effective_until: '',
    year_id: '',
    level_id: '',
    is_active: true,
    notes: ''
  });
  const [formFeeErrors, setFormFeeErrors] = useState({});

  const canLoad = useMemo(() => Boolean(levelId && yearId), [levelId, yearId]);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Group levels by unit for display in select optgroups
  const groupedLevels = useMemo(() => {
    const groups = {};
    levels.forEach(l => {
      const unitName = l.unit?.unit_name || 'Umum';
      if (!groups[unitName]) groups[unitName] = [];
      groups[unitName].push(l);
    });
    return groups;
  }, [levels]);

  const selectedLevel = useMemo(() => levels.find(l => l.level_id === Number(levelId)), [levels, levelId]);

  const show = (title, message, type = 'success') => setNotif({ isOpen: true, title, message, type });

  // ─── INITIAL DATA FETCHING ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: levelsData, error: lErr } = await supabase
          .from('admission_level')
          .select('level_id, level_name, level_order, unit_id, unit:unit_id(unit_id, unit_name)')
          .eq('is_active', true)
          .order('level_order');
        if (!lErr) setLevels(levelsData || []);

        const { data: yData, error: yErr } = await supabase
          .from('year')
          .select('year_id, year_name')
          .order('year_name', { ascending: false });
        if (!yErr) {
          setYears(yData || []);
          if (yData && yData.length > 0) {
            setYearId(String(yData[0].year_id));
          }
        }
      } catch (err) {
        console.error('Error loading master data:', err);
      }
    })();

    loadAdmissionFormFees();
  }, []);

  // Sync SPP and UDP when Jenjang or Year changes
  useEffect(() => {
    if (!levelId || !yearId) return;
    loadSchoolFee();
    loadUDPEntries();
  }, [levelId, yearId]);

  // ─── USEK / SPP LOGIC ───────────────────────────────────────────────
  const loadSchoolFee = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('school_fee_definition')
        .select('*')
        .eq('level_id', Number(levelId))
        .eq('year_id', Number(yearId))
        .maybeSingle();
      if (data) {
        setSfId(data.fee_def_id);
        setSfDefault(presentIDR(String(data.default_amount ?? data.monthly_amount ?? '0')));
      } else {
        setSfId(null);
        setSfDefault('');
      }
    } catch (e) {
      show('SPP', 'Gagal memuat data SPP: ' + e.message, 'error');
    } finally { setLoading(false); }
  };

  const saveSchoolFee = async () => {
    if (!canLoad || !selectedLevel) return;
    setLoading(true);
    try {
      const payload = {
        unit_id: selectedLevel.unit_id,
        level_id: Number(levelId),
        year_id: Number(yearId),
        default_amount: toNumber(sfDefault),
      };
      if (sfId) {
        const { error } = await supabase
          .from('school_fee_definition')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('fee_def_id', sfId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('school_fee_definition')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setSfId(data.fee_def_id);
      }
      show('SPP', 'Data SPP berhasil disimpan!');
    } catch (e) {
      show('SPP', 'Gagal menyimpan SPP: ' + (e?.message || e), 'error');
    } finally { setLoading(false); }
  };

  // ─── UDP / DPP LOGIC ────────────────────────────────────────────────
  const loadUDPEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('udp_definition')
        .select('*')
        .eq('level_id', Number(levelId))
        .eq('year_id', Number(yearId))
        .order('student_category')
        .order('effective_from', { ascending: true });
      if (error) throw error;
      setUdpEntries(data || []);
    } catch (e) {
      show('DPP', 'Gagal memuat data DPP: ' + e.message, 'error');
    }
  };

  const validateUdpForm = () => {
    const errors = {};
    if (!udpForm.total_amount || toNumber(udpForm.total_amount) <= 0) {
      errors.total_amount = 'Jumlah DPP wajib diisi';
    }
    if (!udpForm.effective_from) {
      errors.effective_from = 'Tanggal mulai berlaku wajib diisi';
    }
    if (!udpForm.effective_until) {
      errors.effective_until = 'Tanggal akhir berlaku wajib diisi';
    }
    if (udpForm.effective_from && udpForm.effective_until && udpForm.effective_from > udpForm.effective_until) {
      errors.effective_until = 'Tanggal akhir harus setelah tanggal mulai';
    }
    setUdpFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUdp = async () => {
    if (!validateUdpForm() || !selectedLevel) return;
    setLoading(true);
    try {
      const payload = {
        unit_id: selectedLevel.unit_id,
        level_id: Number(levelId),
        year_id: Number(yearId),
        total_amount: toNumber(udpForm.total_amount),
        student_category: udpForm.student_category,
        effective_from: udpForm.effective_from,
        effective_until: udpForm.effective_until,
        notes: udpForm.notes.trim() || null,
        is_active: true
      };

      if (editingUdp) {
        const { error } = await supabase
          .from('udp_definition')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('udp_def_id', editingUdp.udp_def_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('udp_definition')
          .insert([payload]);
        if (error) throw error;
      }

      await loadUDPEntries();
      resetUdpForm();
      show('DPP', editingUdp ? 'Data DPP berhasil diupdate!' : 'Data DPP berhasil ditambahkan!');
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('duplicate key') || msg.includes('uq_udp_def_level')) {
        show('DPP', 'Sudah ada data DPP untuk kombinasi jenjang, tahun, kategori, dan tanggal mulai yang sama.', 'error');
      } else {
        show('DPP', 'Gagal menyimpan DPP: ' + msg, 'error');
      }
    } finally { setLoading(false); }
  };

  const handleEditUdp = (entry) => {
    setEditingUdp(entry);
    setUdpForm({
      total_amount: presentIDR(String(entry.total_amount ?? 0)),
      student_category: entry.student_category || 'eksternal',
      effective_from: entry.effective_from || '',
      effective_until: entry.effective_until || '',
      notes: entry.notes || ''
    });
    setUdpFormErrors({});
    setShowUdpForm(true);
  };

  const handleDeleteUdp = async (entry) => {
    if (!confirm(`Hapus data DPP ${entry.student_category} (${fmtDate(entry.effective_from)} - ${fmtDate(entry.effective_until)})?`)) return;
    try {
      const { error } = await supabase
        .from('udp_definition')
        .delete()
        .eq('udp_def_id', entry.udp_def_id);
      if (error) throw error;
      await loadUDPEntries();
      show('DPP', 'Data DPP berhasil dihapus!');
    } catch (e) {
      show('DPP', 'Gagal menghapus: ' + (e?.message || e), 'error');
    }
  };

  const resetUdpForm = () => {
    setEditingUdp(null);
    setShowUdpForm(false);
    setUdpForm({
      total_amount: '',
      student_category: 'eksternal',
      effective_from: '',
      effective_until: '',
      notes: ''
    });
    setUdpFormErrors({});
  };

  const groupedUdpEntries = useMemo(() => {
    const groups = { eksternal: [], internal: [] };
    for (const e of udpEntries) {
      const cat = e.student_category || 'eksternal';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(e);
    }
    if (groups.internal.length === 0) delete groups.internal;
    return groups;
  }, [udpEntries]);

  const usekYearly = useMemo(() => toNumber(sfDefault) * 12, [sfDefault]);

  // ─── TAB 3: BIAYA FORMULIR (ADMISSION) LOGIC ───────────────────────
  const loadAdmissionFormFees = async () => {
    setLoadingFormFees(true);
    try {
      const { data, error } = await supabase
        .from('admission_form_fee')
        .select('*, year:year_id(year_id, year_name), level:level_id(level_id, level_name)')
        .order('effective_from', { ascending: true });
      if (error) throw error;
      setAdmissionFormFees(data || []);
    } catch (err) {
      console.error('Error fetching admission form fees:', err);
      show('Biaya Formulir', 'Gagal memuat tarif formulir: ' + err.message, 'error');
    } finally {
      setLoadingFormFees(false);
    }
  };

  // Smart date-driven active admission fee
  const activeAdmissionFee = useMemo(() => {
    // 1. Cek gelombang yang tepat mencakup hari ini
    const current = admissionFormFees.find(f => f.effective_from <= todayStr && todayStr <= f.effective_until);
    if (current) return { ...current, _type: 'current' };
    // 2. Jika belum ada gelombang yang mulai (semua masa depan), ambil gelombang terdekat pertama
    const upcoming = [...admissionFormFees].filter(f => f.effective_from > todayStr).sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0];
    if (upcoming) return { ...upcoming, _type: 'upcoming' };
    // 3. Jika semua sudah lewat di masa lalu, ambil gelombang terakhir
    const past = [...admissionFormFees].sort((a, b) => b.effective_until.localeCompare(a.effective_until))[0];
    if (past) return { ...past, _type: 'past' };
    return null;
  }, [admissionFormFees, todayStr]);

  const validateFormFee = () => {
    const errors = {};
    if (!formFeeForm.wave_name.trim()) {
      errors.wave_name = 'Nama Gelombang wajib diisi (misal: Gelombang 1 - Early Bird)';
    }
    if (!formFeeForm.amount || toNumber(formFeeForm.amount) < 0) {
      errors.amount = 'Nominal biaya formulir wajib diisi';
    }
    if (!formFeeForm.effective_from) {
      errors.effective_from = 'Tanggal mulai berlaku wajib diisi';
    }
    if (!formFeeForm.effective_until) {
      errors.effective_until = 'Tanggal akhir berlaku wajib diisi';
    }
    if (formFeeForm.effective_from && formFeeForm.effective_until && formFeeForm.effective_from > formFeeForm.effective_until) {
      errors.effective_until = 'Tanggal akhir harus sama atau setelah tanggal mulai';
    }
    setFormFeeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveFormFee = async () => {
    if (!validateFormFee()) return;
    setLoadingFormFees(true);
    try {
      const payload = {
        wave_name: formFeeForm.wave_name.trim(),
        amount: toNumber(formFeeForm.amount),
        effective_from: formFeeForm.effective_from,
        effective_until: formFeeForm.effective_until,
        year_id: formFeeForm.year_id ? Number(formFeeForm.year_id) : null,
        level_id: formFeeForm.level_id ? Number(formFeeForm.level_id) : null,
        unit_id: formFeeForm.level_id ? (levels.find(l => l.level_id === Number(formFeeForm.level_id))?.unit_id || null) : null,
        is_active: true,
        notes: formFeeForm.notes.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingFormFee) {
        const { error } = await supabase
          .from('admission_form_fee')
          .update(payload)
          .eq('fee_id', editingFormFee.fee_id);
        if (error) throw error;
        show('Biaya Formulir', `Gelombang "${payload.wave_name}" berhasil diupdate.`);
      } else {
        const { error } = await supabase
          .from('admission_form_fee')
          .insert([payload]);
        if (error) throw error;
        show('Biaya Formulir', `Gelombang baru "${payload.wave_name}" berhasil ditambahkan.`);
      }

      await loadAdmissionFormFees();
      resetFormFeeForm();
    } catch (err) {
      console.error('Error saving admission form fee:', err);
      show('Biaya Formulir', 'Gagal menyimpan: ' + (err.message || err), 'error');
    } finally {
      setLoadingFormFees(false);
    }
  };

  const handleEditFormFee = (entry) => {
    setEditingFormFee(entry);
    setFormFeeForm({
      wave_name: entry.wave_name || '',
      amount: presentIDR(String(entry.amount || 0)),
      effective_from: entry.effective_from || '',
      effective_until: entry.effective_until || '',
      year_id: entry.year_id ? String(entry.year_id) : '',
      level_id: entry.level_id ? String(entry.level_id) : '',
      is_active: true,
      notes: entry.notes || ''
    });
    setFormFeeErrors({});
    setShowFormFeeModal(true);
  };

  const handleDeleteFormFee = async (entry) => {
    if (!confirm(`Hapus tarif formulir "${entry.wave_name}" (Rp ${fmtThousands(String(entry.amount))})?`)) return;
    try {
      const { error } = await supabase
        .from('admission_form_fee')
        .delete()
        .eq('fee_id', entry.fee_id);
      if (error) throw error;
      await loadAdmissionFormFees();
      show('Biaya Formulir', 'Tarif gelombang berhasil dihapus.');
    } catch (err) {
      console.error('Error deleting form fee:', err);
      show('Biaya Formulir', 'Gagal menghapus: ' + err.message, 'error');
    }
  };

  const resetFormFeeForm = () => {
    setEditingFormFee(null);
    setShowFormFeeModal(false);
    setFormFeeForm({
      wave_name: '',
      amount: '',
      effective_from: '',
      effective_until: '',
      year_id: yearId || '',
      level_id: levelId || '',
      is_active: true,
      notes: ''
    });
    setFormFeeErrors({});
  };

  // ─── MINIMALIST UI STYLING TOKENS (MATCHING /DATA/PYP) ─────────────
  const pageBg = isDark ? '#09090B' : '#FBFBFA';
  const cardBg = isDark ? '#18181B' : '#FFFFFF';
  const cardBgAlt = isDark ? '#1F1F23' : '#F9F9F8';
  const borderColor = isDark ? '#27272A' : '#EAEAEA';
  const textPrimary = isDark ? '#F4F4F5' : '#111111';
  const textSecondary = isDark ? '#A1A1AA' : '#787774';

  const selectStyle = {
    background: isDark ? '#18181B' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '12px'
  };

  const inputStyle = {
    background: isDark ? '#18181B' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px'
  };

  return (
    <div 
      style={{ 
        background: pageBg, 
        minHeight: '100vh', 
        padding: '24px 32px', 
        color: textPrimary, 
        fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', system-ui, -apple-system, sans-serif" 
      }}
    >
      {/* ── HEADER & BREADCRUMBS (MATCHING /DATA/PYP LAYOUT) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[KEUANGAN]</span>
            <span>/</span>
            <span>[BIAYA SEKOLAH]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[STRUKTUR TARIF]</span>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded flex items-center justify-center border" 
              style={{ 
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', 
                borderColor: isDark ? '#2563EB' : '#BAE6FD', 
                color: isDark ? '#60A5FA' : '#0284C7' 
              }}
            >
              <FontAwesomeIcon icon={faSackDollar} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                {t('schoolFee.title') || 'Manajemen Biaya Sekolah'}
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Konfigurasi tarif SPP bulanan, Uang Dana Pembangunan (DPP/UDP), dan Biaya Formulir Admisi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR (MATCHING /DATA/PYP ACADEMIC YEAR BAR) ───────────── */}
      <div className="p-3.5 rounded border mb-6" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              1. Jenjang Pendaftaran *
            </label>
            <select
              value={levelId}
              onChange={e => setLevelId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={selectStyle}
            >
              <option value="">Pilih Jenjang Pendaftaran</option>
              {Object.entries(groupedLevels).map(([unitName, unitLevels]) => (
                <optgroup key={unitName} label={unitName}>
                  {unitLevels.map(l => (
                    <option key={l.level_id} value={l.level_id}>{l.level_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              2. Tahun Ajaran *
            </label>
            <select
              value={yearId}
              onChange={e => setYearId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={selectStyle}
            >
              <option value="">Pilih Tahun Ajaran</option>
              {years.map(y => (
                <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedLevel && (
          <div className="mt-2.5 pt-2 border-t flex items-center gap-2 text-[11px] font-mono" style={{ borderColor, color: textSecondary }}>
            <FontAwesomeIcon icon={faSchool} className="text-[10px]" />
            <span>Unit Akademik:</span>
            <span className="font-semibold" style={{ color: textPrimary }}>{selectedLevel.unit?.unit_name}</span>
          </div>
        )}
      </div>

      {/* ── BENTO SUMMARY CARDS (MINIMALIST UI) ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card 1: SPP Bulanan */}
        <div className="p-4 rounded border" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: textSecondary }}>
              SPP (USEK) / Bulan
            </span>
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: isDark ? '#1C3326' : '#EDF3EC', color: isDark ? '#34D399' : '#346538' }}>
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-xs" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight" style={{ color: isDark ? '#34D399' : '#155724' }}>
            {canLoad && sfDefault ? `Rp ${fmtThousands(String(toNumber(sfDefault)))}` : 'Belum Diset'}
          </div>
          <p className="text-[11px] mt-1" style={{ color: textSecondary }}>
            {canLoad && sfDefault ? `Total setahun: Rp ${fmtThousands(String(usekYearly))}` : 'Pilih jenjang & tahun'}
          </p>
        </div>

        {/* Card 2: DPP / UDP Periode */}
        <div className="p-4 rounded border" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: textSecondary }}>
              DPP (UDP)
            </span>
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: isDark ? '#2E1E38' : '#F5EEF8', color: isDark ? '#C084FC' : '#7D3C98' }}>
              <FontAwesomeIcon icon={faReceipt} className="text-xs" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight" style={{ color: textPrimary }}>
            {canLoad ? `${udpEntries.length} Periode` : 'Belum Diset'}
          </div>
          <p className="text-[11px] mt-1" style={{ color: textSecondary }}>
            Uang Dana Pembangunan / Gedung
          </p>
        </div>

        {/* Card 3: Biaya Formulir Admisi */}
        <div className="p-4 rounded border" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: textSecondary }}>
              Formulir Admisi Aktif
            </span>
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#0284C7' }}>
              <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-xs" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight" style={{ color: activeAdmissionFee ? (isDark ? '#60A5FA' : '#0284C7') : textSecondary }}>
            {activeAdmissionFee ? `Rp ${fmtThousands(String(activeAdmissionFee.amount))}` : 'Tidak Ada Gelombang'}
          </div>
          <p className="text-[11px] mt-1 truncate" style={{ color: textSecondary }}>
            {activeAdmissionFee ? activeAdmissionFee.wave_name : 'Belum ada tarif aktif hari ini'}
          </p>
        </div>
      </div>

      {/* ── TABS NAVIGATION (UNDERLINE STYLE MATCHING /DATA/PYP) ───────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setTab('school')}
          style={{
            padding: '12px 0',
            fontSize: '13px',
            fontWeight: tab === 'school' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: tab === 'school' ? textPrimary : textSecondary,
            borderBottom: tab === 'school' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} style={{ fontSize: '12px' }} />
          SPP (USEK)
        </button>

        <button
          type="button"
          onClick={() => setTab('udp')}
          style={{
            padding: '12px 0',
            fontSize: '13px',
            fontWeight: tab === 'udp' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: tab === 'udp' ? textPrimary : textSecondary,
            borderBottom: tab === 'udp' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faReceipt} style={{ fontSize: '12px' }} />
          DPP (UDP) {canLoad && `(${udpEntries.length})`}
        </button>

        <button
          type="button"
          onClick={() => setTab('admission')}
          style={{
            padding: '12px 0',
            fontSize: '13px',
            fontWeight: tab === 'admission' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: tab === 'admission' ? textPrimary : textSecondary,
            borderBottom: tab === 'admission' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ fontSize: '12px' }} />
          Biaya Formulir (Admisi) ({admissionFormFees.length})
        </button>
      </div>

      {/* ── TAB CONTENT AREA ─────────────────────────────────────────── */}
      
      {/* ── TAB 1: SPP (USEK) ────────────────────────────────────────── */}
      {tab === 'school' && (
        <div>
          {!canLoad ? (
            <div className="p-8 rounded border text-center" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-3xl mb-3" style={{ color: textSecondary }} />
              <p className="text-sm font-semibold" style={{ color: textPrimary }}>Pilih Jenjang &amp; Tahun Ajaran Terlebih Dahulu</p>
              <p className="text-xs mt-1" style={{ color: textSecondary }}>
                Gunakan filter di atas untuk menentukan jenjang pendidikan dan tahun ajaran yang akan diatur tarif SPP-nya.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded border space-y-6" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
              <div>
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider" style={{ color: textPrimary, margin: 0 }}>
                  Pengaturan SPP Bulanan ({selectedLevel?.level_name})
                </h3>
                <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                  Tarif SPP standar yang dibayarkan setiap bulan selama tahun ajaran terpilih.
                </p>
              </div>

              <div className="p-4 rounded border max-w-xl" style={{ background: cardBgAlt, borderColor, borderRadius: '6px' }}>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textPrimary }}>
                  Nominal SPP per Bulan (IDR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold" style={{ color: textSecondary }}>
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sfDefault}
                    onChange={e => setSfDefault(presentIDR(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 text-base font-bold font-mono rounded border outline-none"
                    style={inputStyle}
                    placeholder="0"
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: textSecondary }}>
                  Kalkulasi estimasi 1 tahun (12 bulan): <strong style={{ color: textPrimary }}>Rp {fmtThousands(String(usekYearly))}</strong>
                </p>
              </div>

              <div 
                className="p-3.5 rounded border max-w-xl flex items-start gap-3" 
                style={{ 
                  background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#E1F3FE', 
                  borderColor: isDark ? '#1E3A8A' : '#BAE6FD', 
                  color: isDark ? '#93C5FD' : '#1F6C9F',
                  borderRadius: '6px'
                }}
              >
                <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5 text-sm" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold mb-0.5">Catatan Perubahan SPP</p>
                  <p>Tarif SPP berlaku flat per tahun ajaran. Jika terdapat penyesuaian untuk tahun ajaran baru, pilih tahun ajaran tersebut di filter atas dan simpan nominal barunya.</p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  style={{
                    background: textPrimary,
                    color: isDark ? '#09090B' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    padding: '8px 16px'
                  }}
                  onClick={saveSchoolFee}
                  disabled={loading}
                >
                  {loading ? (
                    <><FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> Menyimpan...</>
                  ) : (
                    <><FontAwesomeIcon icon={faSave} className="mr-2" /> Simpan SPP</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DPP (UDP) ─────────────────────────────────────────── */}
      {tab === 'udp' && (
        <div>
          {!canLoad ? (
            <div className="p-8 rounded border text-center" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
              <FontAwesomeIcon icon={faReceipt} className="text-3xl mb-3" style={{ color: textSecondary }} />
              <p className="text-sm font-semibold" style={{ color: textPrimary }}>Pilih Jenjang &amp; Tahun Ajaran Terlebih Dahulu</p>
              <p className="text-xs mt-1" style={{ color: textSecondary }}>
                Gunakan filter di atas untuk menentukan jenjang pendidikan dan tahun ajaran yang akan diatur tarif DPP-nya.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
                <div>
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider" style={{ color: textPrimary, margin: 0 }}>
                    Daftar Periode DPP ({selectedLevel?.level_name})
                  </h3>
                  <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                    Tarif Uang Dana Pembangunan bervariasi sesuai tanggal pendaftaran dan status asal siswa (Internal / Eksternal).
                  </p>
                </div>
                <Button
                  type="button"
                  style={{
                    background: textPrimary,
                    color: isDark ? '#09090B' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                  onClick={() => { resetUdpForm(); setShowUdpForm(true); }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Tambah Periode DPP
                </Button>
              </div>

              {udpEntries.length === 0 ? (
                <div className="p-8 rounded border text-center" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
                  <FontAwesomeIcon icon={faReceipt} className="text-3xl mb-3" style={{ color: textSecondary }} />
                  <p className="text-sm font-semibold" style={{ color: textPrimary }}>Belum Ada Data Periode DPP</p>
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    Klik tombol "Tambah Periode DPP" untuk mulai menentukan skema biaya pembangunan.
                  </p>
                </div>
              ) : (
                Object.entries(groupedUdpEntries).map(([category, entries]) => (
                  <div key={category} className="rounded border overflow-hidden" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
                    <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ background: cardBgAlt, borderColor }}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase font-bold"
                          style={{
                            background: category === 'internal' ? (isDark ? '#1E2E1E' : '#EDF3EC') : (isDark ? '#1A2F3D' : '#E1F3FE'),
                            color: category === 'internal' ? (isDark ? '#7BAF7B' : '#346538') : (isDark ? '#7CB8DC' : '#1F6C9F'),
                            border: `1px solid ${category === 'internal' ? (isDark ? '#2E4E2E' : '#C3E6CB') : (isDark ? '#2A4E6D' : '#BAE6FD')}`
                          }}
                        >
                          Siswa {category === 'internal' ? 'Internal' : 'Eksternal'}
                        </span>
                        <span className="text-xs font-mono" style={{ color: textSecondary }}>
                          ({entries.length} periode)
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b text-[10px] font-mono uppercase tracking-wider" style={{ borderColor, color: textSecondary }}>
                            <th className="px-4 py-2.5 font-semibold">Periode Berlaku</th>
                            <th className="px-4 py-2.5 font-semibold text-right">Nominal DPP</th>
                            <th className="px-4 py-2.5 font-semibold">Catatan</th>
                            <th className="px-4 py-2.5 font-semibold text-center w-32">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map(entry => (
                            <tr key={entry.udp_def_id} className="border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor }}>
                              <td className="px-4 py-3 font-mono">
                                {fmtDate(entry.effective_from)} &mdash; {fmtDate(entry.effective_until)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: textPrimary }}>
                                Rp {fmtThousands(String(entry.total_amount || 0))}
                              </td>
                              <td className="px-4 py-3" style={{ color: textSecondary }}>
                                {entry.notes || '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEditUdp(entry)}
                                    className="px-2 py-1 rounded border text-xs hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ borderColor, color: textPrimary }}
                                    title="Edit"
                                  >
                                    <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUdp(entry)}
                                    className="px-2 py-1 rounded border text-xs hover:bg-red-500/10"
                                    style={{ borderColor, color: isDark ? '#DC8585' : '#9F2F2D' }}
                                    title="Hapus"
                                  >
                                    <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: BIAYA FORMULIR (ADMISSION) ───────────────────────── */}
      {tab === 'admission' && (
        <div className="space-y-6">
          {/* Active Running Wave Highlight Banner */}
          {activeAdmissionFee ? (
            <div 
              className="p-4 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                background: activeAdmissionFee._type === 'current' 
                  ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#EDF3EC') 
                  : (isDark ? 'rgba(245, 158, 11, 0.12)' : '#FBF3DB'),
                borderColor: activeAdmissionFee._type === 'current' 
                  ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#C3E6CB') 
                  : (isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A'),
                borderRadius: '8px'
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded flex items-center justify-center border mt-0.5" 
                  style={{ 
                    background: activeAdmissionFee._type === 'current' ? (isDark ? '#064E3B' : '#D1E7DD') : (isDark ? '#78350F' : '#FEF3C7'), 
                    borderColor: activeAdmissionFee._type === 'current' ? (isDark ? '#059669' : '#A3CFBB') : (isDark ? '#D97706' : '#FCD34D'), 
                    color: activeAdmissionFee._type === 'current' ? (isDark ? '#6EE7B7' : '#0F5132') : (isDark ? '#FDE68A' : '#B45309') 
                  }}
                >
                  <FontAwesomeIcon icon={activeAdmissionFee._type === 'current' ? faCheckCircle : faClock} className="text-sm" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-[10px] font-mono tracking-wider uppercase font-bold px-2 py-0.5 rounded-full" 
                      style={{ 
                        background: activeAdmissionFee._type === 'current' ? (isDark ? '#065F46' : '#D1E7DD') : (isDark ? '#92400E' : '#FDE68A'), 
                        color: activeAdmissionFee._type === 'current' ? (isDark ? '#A7F3D0' : '#0F5132') : (isDark ? '#FEF3C7' : '#78350F') 
                      }}
                    >
                      {activeAdmissionFee._type === 'current' ? 'GELOMBANG BERJALAN SAAT INI' : 'GELOMBANG TERDEKAT (AKAN DATANG)'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold mt-1" style={{ color: activeAdmissionFee._type === 'current' ? (isDark ? '#ECFDF5' : '#0F5132') : (isDark ? '#FEF3C7' : '#78350F'), margin: 0 }}>
                    {activeAdmissionFee.wave_name}: Rp {fmtThousands(String(activeAdmissionFee.amount))}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: activeAdmissionFee._type === 'current' ? (isDark ? '#A7F3D0' : '#146C43') : (isDark ? '#FDE68A' : '#92400E') }}>
                    Berlaku {fmtDate(activeAdmissionFee.effective_from)} s/d {fmtDate(activeAdmissionFee.effective_until)}
                    {activeAdmissionFee.notes ? ` • ${activeAdmissionFee.notes}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded border" style={{ background: cardBg, borderColor, color: textSecondary }}>
                  Otomatis Diterapkan di Email
                </span>
              </div>
            </div>
          ) : (
            <div 
              className="p-4 rounded border flex items-start gap-3"
              style={{
                background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FBF3DB',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                borderRadius: '8px'
              }}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-base mt-0.5" style={{ color: isDark ? '#FBBF24' : '#956400' }} />
              <div className="text-xs leading-relaxed" style={{ color: isDark ? '#FDE68A' : '#956400' }}>
                <p className="font-bold mb-0.5">Belum Ada Jadwal Gelombang Pendaftaran</p>
                <p>
                  Klik tombol "Tambah Gelombang" untuk membuat jadwal dan harga formulir pendaftaran.
                </p>
              </div>
            </div>
          )}

          {/* Table Header Bar */}
          <div className="p-4 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
            <div>
              <h3 className="text-sm font-bold uppercase font-mono tracking-wider" style={{ color: textPrimary, margin: 0 }}>
                Daftar Gelombang Biaya Formulir Admisi
              </h3>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Atur nominal pembelian formulir berdasarkan jadwal gelombang registrasi calon siswa.
              </p>
            </div>
            <Button
              type="button"
              style={{
                background: textPrimary,
                color: isDark ? '#09090B' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px'
              }}
              onClick={() => { resetFormFeeForm(); setShowFormFeeModal(true); }}
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Tambah Gelombang
            </Button>
          </div>

          {/* Waves Table */}
          {loadingFormFees && admissionFormFees.length === 0 ? (
            <div className="p-8 rounded border text-center" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl mb-2" style={{ color: textSecondary }} />
              <p className="text-xs font-mono" style={{ color: textSecondary }}>Memuat daftar gelombang...</p>
            </div>
          ) : admissionFormFees.length === 0 ? (
            <div className="p-8 rounded border text-center" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
              <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-3xl mb-3" style={{ color: textSecondary }} />
              <p className="text-sm font-semibold" style={{ color: textPrimary }}>Belum Ada Data Gelombang Pendaftaran</p>
              <p className="text-xs mt-1" style={{ color: textSecondary }}>
                Klik tombol "Tambah Gelombang" untuk membuat jadwal dan harga formulir pendaftaran.
              </p>
            </div>
          ) : (
            <div className="rounded border overflow-hidden" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-mono uppercase tracking-wider" style={{ borderColor, color: textSecondary }}>
                      <th className="px-4 py-2.5 font-semibold">Nama Gelombang</th>
                      <th className="px-4 py-2.5 font-semibold">Periode Berlaku</th>
                      <th className="px-4 py-2.5 font-semibold">Jenjang / Tahun</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Nominal Formulir</th>
                      <th className="px-4 py-2.5 font-semibold text-center">Status Jadwal</th>
                      <th className="px-4 py-2.5 font-semibold text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissionFormFees.map(fee => {
                      const isCurrent = fee.effective_from <= todayStr && todayStr <= fee.effective_until;
                      const isUpcoming = todayStr < fee.effective_from;
                      const isExpired = todayStr > fee.effective_until;

                      return (
                        <tr key={fee.fee_id} className="border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor }}>
                          <td className="px-4 py-3">
                            <div className="font-semibold" style={{ color: textPrimary }}>{fee.wave_name}</div>
                            {fee.notes && (
                              <div className="text-[11px] mt-0.5" style={{ color: textSecondary }}>{fee.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {fmtDate(fee.effective_from)} &mdash; {fmtDate(fee.effective_until)}
                          </td>
                          <td className="px-4 py-3 font-mono" style={{ color: textSecondary }}>
                            <div>{fee.year?.year_name || 'Semua Tahun'}</div>
                            <div className="text-[11px]">{fee.level?.level_name || 'Semua Jenjang'}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-sm" style={{ color: textPrimary }}>
                            Rp {fmtThousands(String(fee.amount || 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isCurrent ? (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase font-bold"
                                style={{ background: isDark ? '#1E2E1E' : '#EDF3EC', color: isDark ? '#7BAF7B' : '#346538', border: `1px solid ${isDark ? '#2E4E2E' : '#C3E6CB'}` }}
                              >
                                Sedang Berjalan
                              </span>
                            ) : isUpcoming ? (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase font-bold"
                                style={{ background: isDark ? '#2A2618' : '#FBF3DB', color: isDark ? '#C4A24A' : '#956400' }}
                              >
                                Akan Datang
                              </span>
                            ) : (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase"
                                style={{ background: isDark ? '#27272A' : '#F4F4F5', color: isDark ? '#A1A1AA' : '#71717A' }}
                              >
                                Selesai
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit */}
                              <button
                                onClick={() => handleEditFormFee(fee)}
                                className="px-2 py-1 rounded border text-xs hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ borderColor, color: textPrimary }}
                                title="Edit Gelombang"
                              >
                                <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteFormFee(fee)}
                                className="px-2 py-1 rounded border text-xs hover:bg-red-500/10"
                                style={{ borderColor, color: isDark ? '#DC8585' : '#9F2F2D' }}
                                title="Hapus Gelombang"
                              >
                                <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: TAMBAH / EDIT DPP ─────────────────────────────────── */}
      <Modal
        isOpen={showUdpForm}
        onClose={resetUdpForm}
        title={editingUdp ? 'Edit Periode DPP' : 'Tambah Periode DPP'}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveUdp(); }} className="space-y-4">
          <div>
            <Label htmlFor="total_amount" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
              Jumlah DPP (IDR) *
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-xs font-mono font-bold" style={{ color: textSecondary }}>
                Rp
              </span>
              <input
                id="total_amount"
                type="text"
                inputMode="numeric"
                value={udpForm.total_amount}
                onChange={e => {
                  setUdpForm(prev => ({ ...prev, total_amount: presentIDR(e.target.value) }));
                  if (udpFormErrors.total_amount) setUdpFormErrors(prev => ({ ...prev, total_amount: '' }));
                }}
                className="w-full pl-10 pr-3 py-2 text-base font-bold font-mono rounded border outline-none"
                style={{ ...inputStyle, borderColor: udpFormErrors.total_amount ? '#EF4444' : borderColor }}
                placeholder="0"
              />
            </div>
            {udpFormErrors.total_amount && <p className="text-red-500 text-xs mt-1 font-mono">{udpFormErrors.total_amount}</p>}
          </div>

          <div>
            <Label htmlFor="student_category" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
              Kategori Siswa *
            </Label>
            <select
              id="student_category"
              value={udpForm.student_category}
              onChange={e => setUdpForm(prev => ({ ...prev, student_category: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-xs font-mono rounded border outline-none"
              style={selectStyle}
            >
              <option value="eksternal">Siswa Eksternal (baru dari luar)</option>
              <option value="internal">Siswa Internal (pindah jenjang dari dalam)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="effective_from" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
                Berlaku Dari *
              </Label>
              <input
                id="effective_from"
                type="date"
                value={udpForm.effective_from}
                onChange={e => {
                  setUdpForm(prev => ({ ...prev, effective_from: e.target.value }));
                  if (udpFormErrors.effective_from) setUdpFormErrors(prev => ({ ...prev, effective_from: '' }));
                }}
                className="mt-1 w-full px-3 py-2 text-xs font-mono rounded border outline-none"
                style={{ ...inputStyle, borderColor: udpFormErrors.effective_from ? '#EF4444' : borderColor }}
              />
              {udpFormErrors.effective_from && <p className="text-red-500 text-xs mt-1 font-mono">{udpFormErrors.effective_from}</p>}
            </div>

            <div>
              <Label htmlFor="effective_until" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
                Berlaku Sampai *
              </Label>
              <input
                id="effective_until"
                type="date"
                value={udpForm.effective_until}
                onChange={e => {
                  setUdpForm(prev => ({ ...prev, effective_until: e.target.value }));
                  if (udpFormErrors.effective_until) setUdpFormErrors(prev => ({ ...prev, effective_until: '' }));
                }}
                className="mt-1 w-full px-3 py-2 text-xs font-mono rounded border outline-none"
                style={{ ...inputStyle, borderColor: udpFormErrors.effective_until ? '#EF4444' : borderColor }}
              />
              {udpFormErrors.effective_until && <p className="text-red-500 text-xs mt-1 font-mono">{udpFormErrors.effective_until}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="udp_notes" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
              Catatan (opsional)
            </Label>
            <input
              id="udp_notes"
              value={udpForm.notes}
              onChange={e => setUdpForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Contoh: Gelombang 1, Early Bird, Reguler"
              className="mt-1 w-full px-3 py-2 text-xs rounded border outline-none"
              style={inputStyle}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <Button
              type="button"
              onClick={resetUdpForm}
              variant="outline"
              style={{
                background: 'none',
                border: `1px solid ${borderColor}`,
                color: textPrimary,
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              style={{
                background: textPrimary,
                color: isDark ? '#09090B' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px'
              }}
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : (editingUdp ? 'Update DPP' : 'Simpan DPP')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: TAMBAH / EDIT GELOMBANG BIAYA FORMULIR ───────────── */}
      <Modal
        isOpen={showFormFeeModal}
        onClose={resetFormFeeForm}
        title={editingFormFee ? 'Edit Gelombang Formulir Admisi' : 'Tambah Gelombang Formulir Admisi'}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveFormFee(); }} className="space-y-4">
          <div>
            <Label htmlFor="wave_name" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
              Nama Gelombang *
            </Label>
            <input
              id="wave_name"
              type="text"
              value={formFeeForm.wave_name}
              onChange={e => {
                setFormFeeForm(prev => ({ ...prev, wave_name: e.target.value }));
                if (formFeeErrors.wave_name) setFormFeeErrors(prev => ({ ...prev, wave_name: '' }));
              }}
              placeholder="Contoh: Gelombang 1 - Early Bird, Gelombang Reguler"
              className="mt-1 w-full px-3 py-2 text-xs rounded border outline-none font-medium"
              style={{ ...inputStyle, borderColor: formFeeErrors.wave_name ? '#EF4444' : borderColor }}
            />
            {formFeeErrors.wave_name && <p className="text-red-500 text-xs mt-1 font-mono">{formFeeErrors.wave_name}</p>}
          </div>

          <div>
            <Label htmlFor="amount" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
              Nominal Biaya Formulir (IDR) *
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-xs font-mono font-bold" style={{ color: textSecondary }}>
                Rp
              </span>
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                value={formFeeForm.amount}
                onChange={e => {
                  setFormFeeForm(prev => ({ ...prev, amount: presentIDR(e.target.value) }));
                  if (formFeeErrors.amount) setFormFeeErrors(prev => ({ ...prev, amount: '' }));
                }}
                className="w-full pl-10 pr-3 py-2 text-base font-bold font-mono rounded border outline-none"
                style={{ ...inputStyle, borderColor: formFeeErrors.amount ? '#EF4444' : borderColor }}
                placeholder="0"
              />
            </div>
            {formFeeErrors.amount && <p className="text-red-500 text-xs mt-1 font-mono">{formFeeErrors.amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fee_from" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
                Mulai Berlaku *
              </Label>
              <input
                id="fee_from"
                type="date"
                value={formFeeForm.effective_from}
                onChange={e => {
                  setFormFeeForm(prev => ({ ...prev, effective_from: e.target.value }));
                  if (formFeeErrors.effective_from) setFormFeeErrors(prev => ({ ...prev, effective_from: '' }));
                }}
                className="mt-1 w-full px-3 py-2 text-xs font-mono rounded border outline-none"
                style={{ ...inputStyle, borderColor: formFeeErrors.effective_from ? '#EF4444' : borderColor }}
              />
              {formFeeErrors.effective_from && <p className="text-red-500 text-xs mt-1 font-mono">{formFeeErrors.effective_from}</p>}
            </div>

            <div>
              <Label htmlFor="fee_until" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
                Berakhir Sampai *
              </Label>
              <input
                id="fee_until"
                type="date"
                value={formFeeForm.effective_until}
                onChange={e => {
                  setFormFeeForm(prev => ({ ...prev, effective_until: e.target.value }));
                  if (formFeeErrors.effective_until) setFormFeeErrors(prev => ({ ...prev, effective_until: '' }));
                }}
                className="mt-1 w-full px-3 py-2 text-xs font-mono rounded border outline-none"
                style={{ ...inputStyle, borderColor: formFeeErrors.effective_until ? '#EF4444' : borderColor }}
              />
              {formFeeErrors.effective_until && <p className="text-red-500 text-xs mt-1 font-mono">{formFeeErrors.effective_until}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fee_year" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
                Tahun Ajaran (Opsional)
              </Label>
              <select
                id="fee_year"
                value={formFeeForm.year_id}
                onChange={e => setFormFeeForm(prev => ({ ...prev, year_id: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-xs font-mono rounded border outline-none"
                style={selectStyle}
              >
                <option value="">Semua Tahun Ajaran</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="fee_level" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
                Jenjang (Opsional)
              </Label>
              <select
                id="fee_level"
                value={formFeeForm.level_id}
                onChange={e => setFormFeeForm(prev => ({ ...prev, level_id: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-xs font-mono rounded border outline-none"
                style={selectStyle}
              >
                <option value="">Semua Jenjang</option>
                {levels.map(l => (
                  <option key={l.level_id} value={l.level_id}>{l.level_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="fee_notes" className="text-xs font-mono uppercase font-bold" style={{ color: textPrimary }}>
              Catatan / Promosi (Opsional)
            </Label>
            <input
              id="fee_notes"
              value={formFeeForm.notes}
              onChange={e => setFormFeeForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Contoh: Diskon pendaftaran awal 40%"
              className="mt-1 w-full px-3 py-2 text-xs rounded border outline-none"
              style={inputStyle}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <Button
              type="button"
              onClick={resetFormFeeForm}
              variant="outline"
              style={{
                background: 'none',
                border: `1px solid ${borderColor}`,
                color: textPrimary,
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              style={{
                background: textPrimary,
                color: isDark ? '#09090B' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px'
              }}
              disabled={loadingFormFees}
            >
              {loadingFormFees ? 'Menyimpan...' : (editingFormFee ? 'Update Gelombang' : 'Simpan Gelombang')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── NOTIFICATION MODAL ───────────────────────────────────────── */}
      <NotificationModal 
        isOpen={notif.isOpen} 
        title={notif.title} 
        message={notif.message} 
        type={notif.type} 
        onClose={() => setNotif(p => ({ ...p, isOpen: false }))} 
      />
    </div>
  );
}
