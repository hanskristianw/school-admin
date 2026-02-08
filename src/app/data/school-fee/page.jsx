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
  faTrash
} from '@fortawesome/free-solid-svg-icons';

// Currency helpers (IDR style: thousand separator '.')
const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const fmtThousands = (digits) => {
  if (!digits) return '';
  const cleaned = digits.replace(/^0+(?!$)/, '');
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
  const [years, setYears] = useState([]);
  const [levels, setLevels] = useState([]);
  const [levelId, setLevelId] = useState('');
  const [yearId, setYearId] = useState('');
  const [tab, setTab] = useState('school'); // 'school' | 'udp'
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  // School fee state (USEK/SPP) — single amount per level per year
  const [sfId, setSfId] = useState(null);
  const [sfDefault, setSfDefault] = useState('0');

  // UDP state — multiple entries per level per year (period-based)
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

  const canLoad = useMemo(() => levelId && yearId, [levelId, yearId]);

  // Group levels by unit for display
  const groupedLevels = useMemo(() => {
    const groups = {};
    levels.forEach(l => {
      const unitName = l.unit?.unit_name || 'Unknown';
      if (!groups[unitName]) groups[unitName] = [];
      groups[unitName].push(l);
    });
    return groups;
  }, [levels]);

  useEffect(() => {
    (async () => {
      const { data: levelsData } = await supabase
        .from('admission_level')
        .select('level_id, level_name, level_order, unit_id, unit:unit_id(unit_id, unit_name)')
        .eq('is_active', true)
        .order('level_order');
      setLevels(levelsData || []);

      const { data: y } = await supabase.from('year').select('year_id, year_name').order('year_name');
      setYears(y || []);
    })();
  }, []);

  useEffect(() => {
    if (!levelId || !yearId) return;
    loadSchoolFee();
    loadUDPEntries();
  }, [levelId, yearId]);

  const show = (title, message, type = 'success') => setNotif({ isOpen: true, title, message, type });

  const selectedLevel = useMemo(() => levels.find(l => l.level_id === Number(levelId)), [levels, levelId]);

  // ==================== USEK (SPP) ====================
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

  // ==================== UDP (DPP) ====================
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

  // Group UDP entries by student_category for display
  const groupedUdpEntries = useMemo(() => {
    const groups = { eksternal: [], internal: [] };
    for (const e of udpEntries) {
      const cat = e.student_category || 'eksternal';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(e);
    }
    // Remove empty groups (except eksternal which always shows)
    if (groups.internal.length === 0) delete groups.internal;
    return groups;
  }, [udpEntries]);

  const usekYearly = useMemo(() => toNumber(sfDefault) * 12, [sfDefault]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faSackDollar} className="text-xl text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('schoolFee.title')}</h1>
          </div>
          <p className="text-gray-600 text-sm pl-[52px]">{t('schoolFee.subtitle')}</p>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FontAwesomeIcon icon={faSitemap} className="text-blue-600" />
            Pilih Jenjang &amp; Tahun Ajaran
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faSchool} className="text-gray-500" />
                Jenjang Pendaftaran
              </Label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={levelId} 
                onChange={e => setLevelId(e.target.value)}
              >
                <option value="">Pilih jenjang</option>
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
              <Label className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faCalendar} className="text-gray-500" />
                {t('schoolFee.year')}
              </Label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={yearId} 
                onChange={e => setYearId(e.target.value)}
              >
                <option value="">{t('schoolFee.selectYear')}</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </select>
            </div>
          </div>
          {selectedLevel && (
            <p className="text-xs text-gray-500 mt-3">
              Unit akademik: <span className="font-medium">{selectedLevel.unit?.unit_name}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {canLoad && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">SPP / Bulan</p>
                  <p className="text-2xl font-bold text-green-700">Rp {fmtThousands(String(toNumber(sfDefault)))}</p>
                  <p className="text-xs text-gray-500 mt-1">Per tahun: Rp {fmtThousands(String(usekYearly))}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="text-2xl text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">DPP (Periode)</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {udpEntries.length > 0 
                      ? `${udpEntries.length} periode` 
                      : 'Belum diatur'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Uang Dana Pembangunan</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faReceipt} className="text-2xl text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      {canLoad && (
        <Card className="shadow-lg">
          {/* Tab Headers */}
          <CardHeader className="border-b bg-gray-50">
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  tab === 'school'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
                onClick={() => setTab('school')}
              >
                <FontAwesomeIcon icon={faMoneyBillWave} />
                SPP (USEK)
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  tab === 'udp'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
                onClick={() => setTab('udp')}
              >
                <FontAwesomeIcon icon={faReceipt} />
                DPP (UDP)
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {tab === 'school' ? (
              /* ==================== SPP TAB ==================== */
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <Label className="flex items-center gap-2 text-green-900 mb-2">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-green-600" />
                    SPP per Bulan
                  </Label>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    value={sfDefault} 
                    onChange={e => setSfDefault(presentIDR(e.target.value))}
                    className="text-lg font-semibold border-green-300 focus:ring-green-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-green-700 mt-2">
                    Harga dasar SPP per bulan untuk jenjang <strong>{selectedLevel?.level_name}</strong>. 
                    SPP tidak berubah per periode pendaftaran, hanya per tahun ajaran.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Catatan Kenaikan SPP</p>
                    <p className="text-blue-600">SPP dapat naik setiap tahun ajaran. Buat entry baru untuk tahun ajaran berikutnya dengan nominal yang diperbarui.</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2" 
                    onClick={saveSchoolFee} 
                    disabled={loading}
                  >
                    {loading ? (
                      <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Menyimpan...</>
                    ) : (
                      <><FontAwesomeIcon icon={faSave} /> Simpan SPP</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* ==================== DPP TAB ==================== */
              <div className="space-y-6">
                {/* Add Button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Daftar Harga DPP</h3>
                    <p className="text-sm text-gray-500">DPP bervariasi berdasarkan periode pendaftaran dan kategori siswa</p>
                  </div>
                  <Button
                    type="button"
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                    onClick={() => { resetUdpForm(); setShowUdpForm(true); }}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Tambah Periode
                  </Button>
                </div>

                {/* UDP Entries Table */}
                {udpEntries.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                    <FontAwesomeIcon icon={faReceipt} className="text-4xl text-gray-300 mb-3" />
                    <p>Belum ada data DPP untuk jenjang dan tahun ajaran ini.</p>
                    <p className="text-sm mt-1">Klik "Tambah Periode" untuk menambahkan.</p>
                  </div>
                ) : (
                  Object.entries(groupedUdpEntries).map(([category, entries]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category === 'internal' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          Siswa {category === 'internal' ? 'Internal' : 'Eksternal'}
                        </span>
                      </div>

                      {/* Mobile View */}
                      <div className="block md:hidden space-y-2">
                        {entries.map(entry => (
                          <div key={entry.udp_def_id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-purple-700">Rp {fmtThousands(String(entry.total_amount || 0))}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {fmtDate(entry.effective_from)} — {fmtDate(entry.effective_until)}
                                </p>
                              </div>
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-gray-400">{entry.notes}</p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => handleEditUdp(entry)} className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                                Edit
                              </Button>
                              <Button size="sm" onClick={() => handleDeleteUdp(entry)} className="bg-red-600 hover:bg-red-700 text-white flex-1">
                                Hapus
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-200 px-4 py-2 text-left text-sm">Periode Berlaku</th>
                              <th className="border border-gray-200 px-4 py-2 text-right text-sm">Jumlah DPP</th>
                              <th className="border border-gray-200 px-4 py-2 text-left text-sm">Catatan</th>
                              <th className="border border-gray-200 px-4 py-2 text-center text-sm w-40">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map(entry => (
                              <tr key={entry.udp_def_id} className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-4 py-2 text-sm">
                                  {fmtDate(entry.effective_from)} — {fmtDate(entry.effective_until)}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 text-right font-semibold text-purple-700">
                                  Rp {fmtThousands(String(entry.total_amount || 0))}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-500">
                                  {entry.notes || '-'}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <Button size="sm" onClick={() => handleEditUdp(entry)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                      <FontAwesomeIcon icon={faEdit} className="mr-1" /> Edit
                                    </Button>
                                    <Button size="sm" onClick={() => handleDeleteUdp(entry)} className="bg-red-600 hover:bg-red-700 text-white">
                                      <FontAwesomeIcon icon={faTrash} className="mr-1" /> Hapus
                                    </Button>
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

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Harga DPP per Periode</p>
                    <p className="text-blue-600">
                      DPP bisa berbeda tergantung waktu pendaftaran. Misalnya early bird lebih murah daripada pendaftaran reguler. 
                      Sistem akan otomatis memilih harga DPP berdasarkan tanggal pendaftaran siswa.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* UDP Form Modal */}
      <Modal
        isOpen={showUdpForm}
        onClose={resetUdpForm}
        title={editingUdp ? 'Edit Periode DPP' : 'Tambah Periode DPP'}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveUdp(); }} className="space-y-4">
          <div>
            <Label htmlFor="total_amount">Jumlah DPP *</Label>
            <Input
              id="total_amount"
              type="text"
              inputMode="numeric"
              value={udpForm.total_amount}
              onChange={e => {
                setUdpForm(prev => ({ ...prev, total_amount: presentIDR(e.target.value) }));
                if (udpFormErrors.total_amount) setUdpFormErrors(prev => ({ ...prev, total_amount: '' }));
              }}
              className={`text-lg font-semibold ${udpFormErrors.total_amount ? 'border-red-500' : ''}`}
              placeholder="0"
            />
            {udpFormErrors.total_amount && <p className="text-red-500 text-sm mt-1">{udpFormErrors.total_amount}</p>}
          </div>

          <div>
            <Label htmlFor="student_category">Kategori Siswa *</Label>
            <select
              id="student_category"
              value={udpForm.student_category}
              onChange={e => setUdpForm(prev => ({ ...prev, student_category: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="eksternal">Siswa Eksternal (baru dari luar)</option>
              <option value="internal">Siswa Internal (pindah jenjang dari dalam)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="effective_from">Berlaku Dari *</Label>
              <Input
                id="effective_from"
                type="date"
                value={udpForm.effective_from}
                onChange={e => {
                  setUdpForm(prev => ({ ...prev, effective_from: e.target.value }));
                  if (udpFormErrors.effective_from) setUdpFormErrors(prev => ({ ...prev, effective_from: '' }));
                }}
                className={udpFormErrors.effective_from ? 'border-red-500' : ''}
              />
              {udpFormErrors.effective_from && <p className="text-red-500 text-sm mt-1">{udpFormErrors.effective_from}</p>}
            </div>
            <div>
              <Label htmlFor="effective_until">Berlaku Sampai *</Label>
              <Input
                id="effective_until"
                type="date"
                value={udpForm.effective_until}
                onChange={e => {
                  setUdpForm(prev => ({ ...prev, effective_until: e.target.value }));
                  if (udpFormErrors.effective_until) setUdpFormErrors(prev => ({ ...prev, effective_until: '' }));
                }}
                className={udpFormErrors.effective_until ? 'border-red-500' : ''}
              />
              {udpFormErrors.effective_until && <p className="text-red-500 text-sm mt-1">{udpFormErrors.effective_until}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="udp_notes">Catatan (opsional)</Label>
            <Input
              id="udp_notes"
              value={udpForm.notes}
              onChange={e => setUdpForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Contoh: Early Bird, Reguler, dll"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white flex-1 sm:flex-none"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : (editingUdp ? 'Update' : 'Simpan')}
            </Button>
            <Button
              type="button"
              onClick={resetUdpForm}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      <NotificationModal isOpen={notif.isOpen} title={notif.title} message={notif.message} type={notif.type} onClose={() => setNotif(p => ({ ...p, isOpen: false }))} />
    </div>
  );
}
