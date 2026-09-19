'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTag,
  faPlus,
  faEdit,
  faTrash,
  faSpinner,
  faPercent,
  faMoneyBill,
  faArrowLeft,
  faSearch,
  faToggleOn,
  faToggleOff,
  faCheck,
  faInfinity,
  faCalendarAlt,
  faCheckCircle,
  faTimesCircle,
  faLayerGroup,
  faClock,
  faShieldAlt,
  faRotateLeft
} from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const appliesToLabel = {
  udp: 'DPP / UDP',
  usek: 'SPP / USEK',
  both: 'DPP & SPP'
};

export default function DiscountMasterPage() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [discounts, setDiscounts] = useState([]);
  const [levels, setLevels] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterUnit, setFilterUnit] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterAppliesTo, setFilterAppliesTo] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'active', 'inactive'
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    level_id: '',
    year_id: '',
    discount_code: '',
    discount_name: '',
    discount_description: '',
    discount_type: 'fixed',
    discount_value: '',
    applies_to: 'udp',
    valid_from: '',
    valid_until: '',
    max_usage: '',
    is_active: true,
  });
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [isPermanent, setIsPermanent] = useState(true);

  // Notification state
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [discountsRes, levelsRes, yearsRes] = await Promise.all([
        supabase
          .from('fee_discount')
          .select('*, unit:unit_id(unit_name), level:level_id(level_name, unit_id, unit:unit_id(unit_name)), year:year_id(year_name)')
          .order('discount_name', { ascending: true }),
        supabase
          .from('admission_level')
          .select('level_id, level_name, level_order, unit_id, unit:unit_id(unit_name)')
          .eq('is_active', true)
          .order('level_order'),
        supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false }),
      ]);

      if (discountsRes.error) throw discountsRes.error;
      setDiscounts(discountsRes.data || []);
      setLevels(levelsRes.data || []);
      setYears(yearsRes.data || []);
    } catch (err) {
      console.error('Error loading discounts data:', err);
      showNotification('Gagal Memuat Data', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique units
  const units = useMemo(() => {
    return [...new Map(levels.map(l => [l.unit_id, { unit_id: l.unit_id, unit_name: l.unit?.unit_name }])).values()];
  }, [levels]);

  // Form levels filtered by selected unit
  const formLevels = selectedUnitIds.length === 1
    ? levels.filter(l => l.unit_id === selectedUnitIds[0])
    : [];

  // Dropdown levels filtered by filter unit
  const filterLevelsForDropdown = filterUnit
    ? levels.filter(l => l.unit_id === parseInt(filterUnit))
    : levels;

  // Get unit_ids that belong to a discount group
  const getDiscountUnitIds = (discountCode, yearId, levelId) => {
    return discounts
      .filter(d => d.discount_code === discountCode && d.year_id === yearId && d.level_id === levelId)
      .map(d => d.unit_id);
  };

  // Group discounts by code+year+level
  const deduplicatedDiscounts = useMemo(() => {
    const seen = new Set();
    return discounts.filter(d => {
      const key = `${d.discount_code}|${d.year_id}|${d.level_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [discounts]);

  // Filtered discount items
  const filteredDiscounts = useMemo(() => {
    return deduplicatedDiscounts.filter(d => {
      const discountUnitIds = getDiscountUnitIds(d.discount_code, d.year_id, d.level_id);
      if (filterUnit && !discountUnitIds.includes(parseInt(filterUnit))) return false;
      if (filterLevel && d.level_id !== parseInt(filterLevel)) return false;
      if (filterYear && d.year_id !== parseInt(filterYear) && d.year_id !== null) return false;
      if (filterAppliesTo && d.applies_to !== filterAppliesTo) return false;
      if (filterStatus === 'active' && !d.is_active) return false;
      if (filterStatus === 'inactive' && d.is_active) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!d.discount_code?.toLowerCase().includes(term) &&
            !d.discount_name?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [deduplicatedDiscounts, filterUnit, filterLevel, filterYear, filterAppliesTo, filterStatus, searchTerm]);

  // Metrics calculation for Bento cards
  const metrics = useMemo(() => {
    const totalCount = deduplicatedDiscounts.length;
    const activeCount = deduplicatedDiscounts.filter(d => d.is_active).length;
    const permanentCount = deduplicatedDiscounts.filter(d => !d.valid_from && !d.valid_until).length;
    const totalUsage = discounts.reduce((acc, curr) => acc + (curr.current_usage || 0), 0);

    return {
      total: totalCount,
      active: activeCount,
      permanent: permanentCount,
      usage: totalUsage
    };
  }, [deduplicatedDiscounts, discounts]);

  const resetForm = () => {
    setFormData({
      level_id: '',
      year_id: '',
      discount_code: '',
      discount_name: '',
      discount_description: '',
      discount_type: 'fixed',
      discount_value: '',
      applies_to: 'udp',
      valid_from: '',
      valid_until: '',
      max_usage: '',
      is_active: true,
    });
    setSelectedUnitIds([]);
    setFormErrors({});
    setEditingDiscount(null);
    setIsPermanent(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (discount) => {
    const discountUnitIds = getDiscountUnitIds(discount.discount_code, discount.year_id, discount.level_id);
    setEditingDiscount(discount);
    setSelectedUnitIds(discountUnitIds);
    setFormData({
      level_id: discount.level_id?.toString() || '',
      year_id: discount.year_id === null ? 'all' : (discount.year_id?.toString() || ''),
      discount_code: discount.discount_code || '',
      discount_name: discount.discount_name || '',
      discount_description: discount.discount_description || '',
      discount_type: discount.discount_type || 'fixed',
      discount_value: discount.discount_value?.toString() || '',
      applies_to: discount.applies_to || 'udp',
      valid_from: discount.valid_from || '',
      valid_until: discount.valid_until || '',
      max_usage: discount.max_usage?.toString() || '',
      is_active: discount.is_active ?? true,
    });
    setIsPermanent(!discount.valid_from && !discount.valid_until);
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (selectedUnitIds.length === 0) errors.unit_ids = 'Pilih minimal satu unit sekolah';
    if (!formData.year_id) errors.year_id = 'Pilih tahun ajaran';
    if (!formData.discount_code.trim()) errors.discount_code = 'Kode kupon wajib diisi';
    if (!formData.discount_name.trim()) errors.discount_name = 'Nama potongan wajib diisi';
    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      errors.discount_value = 'Nilai potongan harus lebih dari 0';
    }
    if (formData.discount_type === 'percentage' && parseFloat(formData.discount_value) > 100) {
      errors.discount_value = 'Persentase maksimal 100%';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const isAllUnits = selectedUnitIds.length === units.length;
      const basePayload = {
        level_id: isAllUnits ? null : (formData.level_id ? parseInt(formData.level_id) : null),
        year_id: formData.year_id === 'all' ? null : parseInt(formData.year_id),
        discount_code: formData.discount_code.trim().toUpperCase(),
        discount_name: formData.discount_name.trim(),
        discount_description: formData.discount_description.trim() || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        applies_to: formData.applies_to,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
        is_active: formData.is_active,
      };

      const checkUsage = async (ids) => {
        if (ids.length === 0) return new Set();
        const { data } = await supabase
          .from('application_discount')
          .select('discount_id')
          .in('discount_id', ids);
        return new Set((data || []).map(r => r.discount_id));
      };

      const safeRemove = async (ids) => {
        if (ids.length === 0) return;
        const usedSet = await checkUsage(ids);
        const canDelete = ids.filter(id => !usedSet.has(id));
        const mustSoftDelete = ids.filter(id => usedSet.has(id));
        if (canDelete.length > 0) {
          const { error } = await supabase.from('fee_discount').delete().in('discount_id', canDelete);
          if (error) throw error;
        }
        if (mustSoftDelete.length > 0) {
          const { error } = await supabase.from('fee_discount').update({ is_active: false }).in('discount_id', mustSoftDelete);
          if (error) throw error;
        }
      };

      if (editingDiscount) {
        const existingSiblings = discounts.filter(d =>
          d.discount_code === editingDiscount.discount_code &&
          d.year_id === editingDiscount.year_id &&
          d.level_id === editingDiscount.level_id
        );
        const existingUnitMap = new Map(existingSiblings.map(d => [d.unit_id, d]));

        const unitsToKeep = selectedUnitIds.filter(uid => existingUnitMap.has(uid));
        const unitsToAdd = selectedUnitIds.filter(uid => !existingUnitMap.has(uid));
        const unitsToRemove = [...existingUnitMap.keys()].filter(uid => !selectedUnitIds.includes(uid));

        for (const uid of unitsToKeep) {
          const rec = existingUnitMap.get(uid);
          const { error } = await supabase
            .from('fee_discount')
            .update({ ...basePayload, unit_id: uid })
            .eq('discount_id', rec.discount_id);
          if (error) throw error;
        }

        const removeIds = unitsToRemove.map(uid => existingUnitMap.get(uid).discount_id);
        await safeRemove(removeIds);

        if (unitsToAdd.length > 0) {
          const inserts = unitsToAdd.map(uid => ({
            ...basePayload,
            unit_id: uid,
            current_usage: 0,
          }));
          const { error } = await supabase.from('fee_discount').insert(inserts);
          if (error) throw error;
        }

        showNotification('Berhasil Disimpan', `Potongan "${basePayload.discount_name}" berhasil diperbarui untuk ${selectedUnitIds.length} unit.`);
      } else {
        const inserts = selectedUnitIds.map(uid => ({
          ...basePayload,
          unit_id: uid,
          current_usage: 0,
        }));
        const { error } = await supabase.from('fee_discount').insert(inserts);
        if (error) throw error;
        showNotification('Berhasil Ditambahkan', `Potongan baru "${basePayload.discount_name}" berhasil dibuat untuk ${selectedUnitIds.length} unit.`);
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error saving discount:', err);
      showNotification('Gagal Menyimpan', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (discount) => {
    const discountUnitIds = getDiscountUnitIds(discount.discount_code, discount.year_id, discount.level_id);
    const unitCount = discountUnitIds.length;
    const confirmMsg = unitCount > 1
      ? `Apakah Anda yakin ingin menghapus potongan "${discount.discount_name}" (${discount.discount_code}) dari ${unitCount} unit sekolah?`
      : `Apakah Anda yakin ingin menghapus potongan "${discount.discount_name}" (${discount.discount_code})?`;
    
    if (!confirm(confirmMsg)) return;
    setDeleting(discount.discount_id);
    try {
      const idsToDelete = discounts
        .filter(d => d.discount_code === discount.discount_code && d.year_id === discount.year_id && d.level_id === discount.level_id)
        .map(d => d.discount_id);

      const { data: usedData } = await supabase
        .from('application_discount')
        .select('discount_id')
        .in('discount_id', idsToDelete);
      const usedSet = new Set((usedData || []).map(r => r.discount_id));

      const canDelete = idsToDelete.filter(id => !usedSet.has(id));
      const mustSoftDelete = idsToDelete.filter(id => usedSet.has(id));

      if (canDelete.length > 0) {
        const { error } = await supabase.from('fee_discount').delete().in('discount_id', canDelete);
        if (error) throw error;
      }
      if (mustSoftDelete.length > 0) {
        const { error } = await supabase.from('fee_discount').update({ is_active: false }).in('discount_id', mustSoftDelete);
        if (error) throw error;
      }

      if (mustSoftDelete.length > 0) {
        showNotification(
          'Dihapus & Dinonaktifkan',
          `${canDelete.length} unit dihapus, ${mustSoftDelete.length} unit dinonaktifkan karena telah digunakan pada pendaftar.`,
          'success'
        );
      } else {
        showNotification('Berhasil Dihapus', `Potongan "${discount.discount_name}" berhasil dihapus.`);
      }
      fetchData();
    } catch (err) {
      console.error('Error deleting discount:', err);
      showNotification('Gagal Menghapus', err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (discount) => {
    try {
      const siblingIds = discounts
        .filter(d => d.discount_code === discount.discount_code && d.year_id === discount.year_id && d.level_id === discount.level_id)
        .map(d => d.discount_id);
      const newStatus = !discount.is_active;
      const { error } = await supabase
        .from('fee_discount')
        .update({ is_active: newStatus })
        .in('discount_id', siblingIds);
      if (error) throw error;
      
      setDiscounts(prev => prev.map(d => siblingIds.includes(d.discount_id) ? { ...d, is_active: newStatus } : d));
    } catch (err) {
      showNotification('Gagal Mengubah Status', err.message, 'error');
    }
  };

  const getDiscountScope = (d) => {
    const discountUnitIds = getDiscountUnitIds(d.discount_code, d.year_id, d.level_id);
    const unitCount = discountUnitIds.length;
    const isGlobal = unitCount === units.length && units.length > 0;
    const yearLabel = d.year_id === null ? 'Semua Tahun' : (d.year?.year_name || '-');
    if (isGlobal) {
      return { primary: 'Semua Unit', secondary: d.level?.level_name || 'Semua Jenjang', yearLabel, isGlobal: true, isAllYears: d.year_id === null };
    }
    if (unitCount > 1) {
      const unitNames = units.filter(u => discountUnitIds.includes(u.unit_id)).map(u => u.unit_name).join(', ');
      return { primary: `${unitCount} Unit`, secondary: unitNames, yearLabel, isGlobal: false, isMultiUnit: true, isAllYears: d.year_id === null };
    }
    if (d.level?.level_name) {
      return { primary: d.level.level_name, secondary: d.level.unit?.unit_name || d.unit?.unit_name, yearLabel, isGlobal: false, isAllYears: d.year_id === null };
    }
    return { primary: d.unit?.unit_name || '-', secondary: 'Semua Jenjang', yearLabel, isGlobal: false, isAllYears: d.year_id === null };
  };

  // Styling helpers based on Minimalist UI protocol
  const cardStyle = {
    background: theme.cardBg,
    borderColor: theme.border,
    borderWidth: '1px',
    borderRadius: '8px',
  };

  const inputStyle = {
    background: theme.inputBg,
    borderColor: theme.border,
    borderWidth: '1px',
    color: theme.textPrimary,
    borderRadius: '6px',
    fontSize: '13px'
  };

  const selectStyle = {
    background: theme.inputBg,
    borderColor: theme.border,
    borderWidth: '1px',
    color: theme.textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '7px 10px'
  };

  if (loading) {
    return (
      <div
        className="p-8 flex flex-col items-center justify-center min-h-[500px]"
        style={{ background: theme.pageBg }}
      >
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl mb-3" style={{ color: theme.textSecondary }} />
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: theme.textSecondary }}>
          Memuat Data Potongan & Kupon...
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-6 md:p-8 space-y-6 overflow-y-auto min-h-screen transition-colors duration-200"
      style={{ background: theme.pageBg, color: theme.textPrimary }}
    >
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/data/admission')}
            className="mt-0.5 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded transition-all active:scale-95"
            style={{
              borderColor: theme.border,
              background: theme.cardBg,
              color: theme.textSecondary,
              borderRadius: '6px'
            }}
            title="Kembali ke Daftar Pendaftaran"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            <span>Pendaftaran</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: theme.textPrimary }}>
                Master Potongan & Kupon Diskon
              </h1>
              <span
                className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded font-medium"
                style={{ background: theme.blueBg, color: theme.blueText }}
              >
                PPDB / Admisi
              </span>
            </div>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
              Kelola skema potongan biaya admisi, kode kupon promosi, kuota pemakaian, dan masa berlaku potongan (DPP & SPP).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-all active:scale-95"
            style={{
              borderColor: theme.border,
              background: theme.cardBg,
              color: theme.textSecondary,
              borderRadius: '6px'
            }}
            title="Muat Ulang Data"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
            <span>Muat Ulang</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded transition-all active:scale-95 shadow-sm"
            style={{
              background: isDark ? '#F0EFE9' : '#111111',
              color: isDark ? '#111111' : '#FFFFFF',
              borderRadius: '6px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>Tambah Kupon / Potongan</span>
          </button>
        </div>
      </div>

      {/* ─── Bento Grid Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 border transition-all" style={cardStyle}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              Total Kupon
            </span>
            <FontAwesomeIcon icon={faTag} className="text-xs" style={{ color: theme.textSecondary }} />
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: theme.textPrimary }}>
            {metrics.total}
          </div>
          <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
            Skema potongan terdaftar
          </p>
        </div>

        <div className="p-4 border transition-all" style={cardStyle}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              Kupon Aktif
            </span>
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]"
              style={{ background: theme.greenBg, color: theme.greenText }}
            >
              <FontAwesomeIcon icon={faCheck} />
            </span>
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: theme.greenText }}>
            {metrics.active}
          </div>
          <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
            Siap digunakan saat observasi
          </p>
        </div>

        <div className="p-4 border transition-all" style={cardStyle}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              Permanen
            </span>
            <FontAwesomeIcon icon={faInfinity} className="text-xs" style={{ color: theme.textSecondary }} />
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: theme.textPrimary }}>
            {metrics.permanent}
          </div>
          <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
            Tanpa batas waktu kedaluwarsa
          </p>
        </div>

        <div className="p-4 border transition-all" style={cardStyle}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              Total Digunakan
            </span>
            <FontAwesomeIcon icon={faLayerGroup} className="text-xs" style={{ color: theme.textSecondary }} />
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: theme.blueText }}>
            {metrics.usage} <span className="text-xs font-normal" style={{ color: theme.textSecondary }}>kali</span>
          </div>
          <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
            Teraplikasi pada pendaftar
          </p>
        </div>
      </div>

      {/* ─── Search & Filter Toolbar ───────────────────────────────────── */}
      <div className="p-4 border space-y-3" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider font-medium" style={{ color: theme.textSecondary }}>
              Filter & Pencarian Kupon
            </span>
          </div>
          {(filterUnit || filterLevel || filterYear || filterAppliesTo || filterStatus || searchTerm) && (
            <button
              onClick={() => {
                setFilterUnit('');
                setFilterLevel('');
                setFilterYear('');
                setFilterAppliesTo('');
                setFilterStatus('');
                setSearchTerm('');
              }}
              className="text-xs text-rose-500 hover:underline font-mono"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: theme.textSecondary }}
              />
              <input
                type="text"
                placeholder="Cari kode kupon atau nama potongan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={inputStyle}
                className="w-full pl-8 pr-3 py-1.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Unit Filter */}
          <div>
            <select
              value={filterUnit}
              onChange={(e) => {
                setFilterUnit(e.target.value);
                setFilterLevel('');
              }}
              style={selectStyle}
              className="w-full focus:outline-none"
            >
              <option value="">Semua Unit</option>
              {units.map(u => (
                <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={selectStyle}
              className="w-full focus:outline-none"
            >
              <option value="">Semua Jenjang</option>
              {filterLevelsForDropdown.map(l => (
                <option key={l.level_id} value={l.level_id}>
                  {!filterUnit ? `${l.unit?.unit_name} - ` : ''}{l.level_name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={selectStyle}
              className="w-full focus:outline-none"
            >
              <option value="">Semua Tahun</option>
              {years.map(y => (
                <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
              ))}
            </select>
          </div>

          {/* Applies To & Status */}
          <div>
            <select
              value={filterAppliesTo}
              onChange={(e) => setFilterAppliesTo(e.target.value)}
              style={selectStyle}
              className="w-full focus:outline-none"
            >
              <option value="">Semua Target Biaya</option>
              <option value="udp">DPP / UDP saja</option>
              <option value="usek">SPP / USEK saja</option>
              <option value="both">DPP & SPP</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Utilitarian Minimalist Table ──────────────────────────────── */}
      <div className="border overflow-hidden" style={cardStyle}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: theme.textPrimary }}>
              Daftar Kupon & Potongan
            </span>
            <span
              className="px-2 py-0.5 text-[10px] font-mono rounded-full font-bold"
              style={{ background: theme.cardBgAlt, color: theme.textSecondary, border: `1px solid ${theme.border}` }}
            >
              {filteredDiscounts.length}
            </span>
          </div>
          <span className="text-[11px] font-mono" style={{ color: theme.textSecondary }}>
            Menampilkan data unik per kode promosi
          </span>
        </div>

        {filteredDiscounts.length === 0 ? (
          <div className="p-12 text-center">
            <FontAwesomeIcon icon={faTag} className="text-3xl mb-3 opacity-20" />
            <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>
              Tidak ada data potongan ditemukan
            </p>
            <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
              Sesuaikan kata kunci pencarian atau klik &quot;Tambah Kupon / Potongan&quot; untuk membuat data baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b font-mono text-[11px] uppercase tracking-wider" style={{ borderColor: theme.border, background: theme.cardBgAlt, color: theme.textSecondary }}>
                  <th className="px-4 py-3 font-semibold">Kode Kupon</th>
                  <th className="px-4 py-3 font-semibold">Nama Potongan</th>
                  <th className="px-4 py-3 font-semibold">Nilai Potongan</th>
                  <th className="px-4 py-3 font-semibold">Target Biaya</th>
                  <th className="px-4 py-3 font-semibold">Cakupan (Scope)</th>
                  <th className="px-4 py-3 font-semibold">Masa Berlaku</th>
                  <th className="px-4 py-3 font-semibold">Penggunaan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {filteredDiscounts.map(d => {
                  const scope = getDiscountScope(d);
                  return (
                    <tr
                      key={d.discount_id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      style={{ opacity: d.is_active ? 1 : 0.55 }}
                    >
                      {/* Code badge (styled as keyboard shortcut / voucher tag) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className="font-mono text-xs px-2 py-1 rounded font-bold tracking-wider"
                          style={{
                            background: isDark ? '#2A2830' : '#F7F6F3',
                            border: `1px solid ${theme.border}`,
                            color: theme.textPrimary
                          }}
                        >
                          {d.discount_code}
                        </span>
                      </td>

                      {/* Name & Description */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <p className="font-semibold text-xs leading-snug" style={{ color: theme.textPrimary }}>
                          {d.discount_name}
                        </p>
                        {d.discount_description && (
                          <p className="text-[11px] mt-0.5 truncate leading-tight" style={{ color: theme.textSecondary }} title={d.discount_description}>
                            {d.discount_description}
                          </p>
                        )}
                      </td>

                      {/* Value & Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs" style={{ color: theme.textPrimary }}>
                            {d.discount_type === 'percentage'
                              ? `${d.discount_value}%`
                              : formatCurrency(d.discount_value)}
                          </span>
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded font-medium"
                            style={d.discount_type === 'percentage'
                              ? { background: isDark ? '#2E1065' : '#F5F3FF', color: isDark ? '#C4B5FD' : '#6D28D9' }
                              : { background: theme.greenBg, color: theme.greenText }
                            }
                          >
                            {d.discount_type === 'percentage' ? 'Persen' : 'Nominal'}
                          </span>
                        </div>
                      </td>

                      {/* Target fee */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 text-[10px] font-medium rounded font-mono"
                          style={d.applies_to === 'udp'
                            ? { background: theme.greenBg, color: theme.greenText }
                            : d.applies_to === 'usek'
                            ? { background: theme.blueBg, color: theme.blueText }
                            : { background: theme.yellowBg, color: theme.yellowText }
                          }
                        >
                          {appliesToLabel[d.applies_to]}
                        </span>
                      </td>

                      {/* Scope & Year */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {scope.isGlobal && (
                            <span
                              className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded"
                              style={{ background: theme.yellowBg, color: theme.yellowText }}
                            >
                              GLOBAL
                            </span>
                          )}
                          {scope.isMultiUnit && !scope.isGlobal && (
                            <span
                              className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded"
                              style={{ background: theme.blueBg, color: theme.blueText }}
                            >
                              {scope.primary}
                            </span>
                          )}
                          {scope.isAllYears && (
                            <span
                              className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded"
                              style={{ background: isDark ? '#1F2937' : '#F3F4F6', color: theme.textSecondary }}
                            >
                              ALL YEAR
                            </span>
                          )}
                          {!scope.isMultiUnit && (
                            <span className="font-medium text-xs" style={{ color: theme.textPrimary }}>
                              {scope.primary}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: theme.textSecondary }}>
                          {scope.secondary} &middot; {scope.yearLabel}
                        </p>
                      </td>

                      {/* Validity */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {!d.valid_from && !d.valid_until ? (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                            style={{ background: isDark ? '#1F2937' : '#F3F4F6', color: theme.textSecondary }}
                          >
                            <FontAwesomeIcon icon={faInfinity} className="text-[8px]" />
                            Selamanya
                          </span>
                        ) : (
                          <div className="font-mono text-[11px] space-y-0.5">
                            {d.valid_from && (
                              <p style={{ color: theme.textPrimary }}>
                                {new Date(d.valid_from).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                            {d.valid_until && (
                              <p style={{ color: theme.textSecondary }}>
                                s/d {new Date(d.valid_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Usage quota */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px]">
                        <span style={{ color: theme.textPrimary }} className="font-semibold">
                          {d.current_usage || 0}
                        </span>
                        <span style={{ color: theme.textSecondary }}>
                          {' '}/ {d.max_usage ? d.max_usage : '∞'}
                        </span>
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(d)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 active:scale-95"
                          style={{ color: d.is_active ? theme.greenText : theme.textSecondary }}
                          title={d.is_active ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                        >
                          <FontAwesomeIcon icon={d.is_active ? faToggleOn : faToggleOff} className="text-base" />
                          <span>{d.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="p-1.5 rounded border transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                            style={{ borderColor: theme.border, color: theme.textSecondary, borderRadius: '6px' }}
                            title="Edit Potongan"
                          >
                            <FontAwesomeIcon icon={faEdit} className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            disabled={deleting === d.discount_id}
                            className="p-1.5 rounded border transition-all text-rose-500 hover:bg-rose-500/10 active:scale-95 disabled:opacity-50"
                            style={{ borderColor: theme.border, borderRadius: '6px' }}
                            title="Hapus Potongan"
                          >
                            {deleting === d.discount_id ? (
                              <FontAwesomeIcon icon={faSpinner} className="text-xs animate-spin" />
                            ) : (
                              <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingDiscount ? 'Edit Potongan / Kupon Diskon' : 'Tambah Potongan / Kupon Baru'}
        size="lg"
      >
        <div className="space-y-4 pt-1">
          {/* Unit selection matrix */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Unit Sekolah *
              </Label>
              {selectedUnitIds.length > 0 && (
                <span className="text-[11px] font-mono" style={{ color: theme.blueText }}>
                  {selectedUnitIds.length} dari {units.length} unit dipilih
                </span>
              )}
            </div>

            <div
              className="p-3 border rounded-lg transition-colors"
              style={{
                background: theme.cardBgAlt,
                borderColor: formErrors.unit_ids ? '#EF4444' : theme.border
              }}
            >
              <label className="flex items-center gap-2 pb-2 mb-2 border-b cursor-pointer select-none" style={{ borderColor: theme.border }}>
                <input
                  type="checkbox"
                  checked={selectedUnitIds.length === units.length && units.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUnitIds(units.map(u => u.unit_id));
                    } else {
                      setSelectedUnitIds([]);
                    }
                    setFormData(prev => ({ ...prev, level_id: '' }));
                  }}
                  className="rounded"
                />
                <span className="text-xs font-semibold" style={{ color: theme.textPrimary }}>
                  Pilih Semua Unit (Berlaku Global)
                </span>
                {selectedUnitIds.length === units.length && units.length > 0 && (
                  <span
                    className="ml-auto text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold"
                    style={{ background: theme.yellowBg, color: theme.yellowText }}
                  >
                    GLOBAL
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {units.map(u => (
                  <label
                    key={u.unit_id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUnitIds.includes(u.unit_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUnitIds(prev => [...prev, u.unit_id]);
                        } else {
                          setSelectedUnitIds(prev => prev.filter(id => id !== u.unit_id));
                        }
                        setFormData(prev => ({ ...prev, level_id: '' }));
                      }}
                      className="rounded"
                    />
                    <span className="text-xs" style={{ color: theme.textPrimary }}>
                      {u.unit_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {formErrors.unit_ids && (
              <p className="text-rose-500 text-[11px] mt-1">{formErrors.unit_ids}</p>
            )}
          </div>

          {/* Jenjang & Tahun Ajaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="level_id" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Jenjang Khusus
              </Label>
              <select
                id="level_id"
                value={formData.level_id}
                onChange={(e) => setFormData(prev => ({ ...prev, level_id: e.target.value }))}
                disabled={selectedUnitIds.length !== 1}
                style={selectStyle}
                className="mt-1 w-full focus:outline-none disabled:opacity-50"
              >
                <option value="">
                  {selectedUnitIds.length !== 1 ? 'Semua Jenjang (Otomatis Multi-Unit)' : 'Semua Jenjang di Unit Ini'}
                </option>
                {formLevels.map(l => (
                  <option key={l.level_id} value={l.level_id}>{l.level_name}</option>
                ))}
              </select>
              <p className="text-[10px] mt-1" style={{ color: theme.textSecondary }}>
                {selectedUnitIds.length !== 1
                  ? 'Pilihan jenjang spesifik hanya aktif jika memilih 1 unit.'
                  : 'Kosongkan jika berlaku untuk seluruh jenjang di unit ini.'}
              </p>
            </div>

            <div>
              <Label htmlFor="year_id" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Tahun Ajaran *
              </Label>
              <select
                id="year_id"
                value={formData.year_id}
                onChange={(e) => setFormData(prev => ({ ...prev, year_id: e.target.value }))}
                style={selectStyle}
                className="mt-1 w-full focus:outline-none"
              >
                <option value="">Pilih Tahun Ajaran</option>
                <option value="all" className="font-semibold">✦ Semua Tahun Ajaran (Permanen)</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
              {formErrors.year_id && (
                <p className="text-rose-500 text-[11px] mt-1">{formErrors.year_id}</p>
              )}
            </div>
          </div>

          {/* Kode Kupon & Nama Potongan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="discount_code" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Kode Kupon / Promo *
              </Label>
              <input
                id="discount_code"
                type="text"
                placeholder="Contoh: SIBLING10, EARLYBIRD"
                value={formData.discount_code}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  discount_code: e.target.value.replace(/\s/g, '').toUpperCase()
                }))}
                style={inputStyle}
                className="mt-1 w-full px-3 py-1.5 font-mono font-bold tracking-wider focus:outline-none"
              />
              <p className="text-[10px] mt-1" style={{ color: theme.textSecondary }}>
                Kode unik kupon (otomatis huruf kapital tanpa spasi).
              </p>
              {formErrors.discount_code && (
                <p className="text-rose-500 text-[11px] mt-1">{formErrors.discount_code}</p>
              )}
            </div>

            <div>
              <Label htmlFor="discount_name" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Nama Potongan *
              </Label>
              <input
                id="discount_name"
                type="text"
                placeholder="Contoh: Potongan Saudara Kandung 10%"
                value={formData.discount_name}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_name: e.target.value }))}
                style={inputStyle}
                className="mt-1 w-full px-3 py-1.5 focus:outline-none"
              />
              {formErrors.discount_name && (
                <p className="text-rose-500 text-[11px] mt-1">{formErrors.discount_name}</p>
              )}
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <Label htmlFor="discount_description" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              Deskripsi & Catatan (Opsional)
            </Label>
            <textarea
              id="discount_description"
              rows={2}
              placeholder="Catatan persyaratan atau ketentuan khusus potongan ini..."
              value={formData.discount_description}
              onChange={(e) => setFormData(prev => ({ ...prev, discount_description: e.target.value }))}
              style={inputStyle}
              className="mt-1 w-full px-3 py-1.5 focus:outline-none"
            />
          </div>

          {/* Type, Value, Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="discount_type" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Tipe Potongan *
              </Label>
              <select
                id="discount_type"
                value={formData.discount_type}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value }))}
                style={selectStyle}
                className="mt-1 w-full focus:outline-none"
              >
                <option value="fixed">Nominal Tetap (Rp)</option>
                <option value="percentage">Persentase (%)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="discount_value" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Nilai * {formData.discount_type === 'percentage' ? '(%)' : '(Rp)'}
              </Label>
              <input
                id="discount_value"
                type="number"
                placeholder={formData.discount_type === 'percentage' ? '1 - 100' : '500000'}
                value={formData.discount_value}
                min={formData.discount_type === 'percentage' ? '1' : '0'}
                max={formData.discount_type === 'percentage' ? '100' : undefined}
                onChange={(e) => {
                  let val = e.target.value;
                  if (formData.discount_type === 'percentage') {
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 100) val = '100';
                    if (!isNaN(num) && num < 0) val = '0';
                  }
                  setFormData(prev => ({ ...prev, discount_value: val }));
                }}
                style={inputStyle}
                className="mt-1 w-full px-3 py-1.5 focus:outline-none"
              />
              {formErrors.discount_value && (
                <p className="text-rose-500 text-[11px] mt-1">{formErrors.discount_value}</p>
              )}
            </div>

            <div>
              <Label htmlFor="applies_to" className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Berlaku Untuk *
              </Label>
              <select
                id="applies_to"
                value={formData.applies_to}
                onChange={(e) => setFormData(prev => ({ ...prev, applies_to: e.target.value }))}
                style={selectStyle}
                className="mt-1 w-full focus:outline-none"
              >
                <option value="udp">DPP / UDP saja</option>
                <option value="usek">SPP / USEK saja</option>
                <option value="both">DPP & SPP</option>
              </select>
            </div>
          </div>

          {/* Pratinjau Kalkulasi */}
          <div
            className="p-3 border rounded-lg transition-colors"
            style={{
              background: theme.cardBgAlt,
              borderColor: theme.border
            }}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: theme.textSecondary }}>
              Pratinjau Kalkulasi Potongan
            </span>
            <div className="mt-1 flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                {formData.discount_type === 'percentage'
                  ? `Potongan ${formData.discount_value || 0}% dari subtotal`
                  : `Potongan ${formatCurrency(parseFloat(formData.discount_value) || 0)}`}
                {' '}
                <span className="text-xs font-normal" style={{ color: theme.textSecondary }}>
                  pada <span className="font-semibold">{appliesToLabel[formData.applies_to]}</span>
                </span>
              </span>
              {formData.discount_code && (
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded font-bold"
                  style={{
                    background: isDark ? '#2A2830' : '#F7F6F3',
                    border: `1px solid ${theme.border}`,
                    color: theme.textPrimary
                  }}
                >
                  {formData.discount_code}
                </span>
              )}
            </div>
          </div>

          {/* Masa Berlaku & Kuota Penggunaan */}
          <div className="space-y-2 pt-1 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Masa Berlaku Kupon
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !isPermanent;
                  setIsPermanent(next);
                  if (next) {
                    setFormData(prev => ({ ...prev, valid_from: '', valid_until: '' }));
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-all active:scale-95 font-mono"
                style={{
                  borderColor: isPermanent ? (isDark ? '#3B82F6' : '#2563EB') : theme.border,
                  background: isPermanent ? theme.blueBg : 'transparent',
                  color: isPermanent ? theme.blueText : theme.textSecondary
                }}
              >
                <FontAwesomeIcon icon={faInfinity} className="text-[10px]" />
                <span>{isPermanent ? 'Berlaku Selamanya' : 'Batasi Tanggal'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="valid_from" className="text-[11px] font-mono" style={{ color: theme.textSecondary }}>
                  Mulai Berlaku
                </Label>
                <input
                  id="valid_from"
                  type="date"
                  disabled={isPermanent}
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                  style={inputStyle}
                  className="mt-1 w-full px-3 py-1.5 focus:outline-none disabled:opacity-40"
                />
              </div>

              <div>
                <Label htmlFor="valid_until" className="text-[11px] font-mono" style={{ color: theme.textSecondary }}>
                  Berlaku Sampai
                </Label>
                <input
                  id="valid_until"
                  type="date"
                  disabled={isPermanent}
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  style={inputStyle}
                  className="mt-1 w-full px-3 py-1.5 focus:outline-none disabled:opacity-40"
                />
              </div>

              <div>
                <Label htmlFor="max_usage" className="text-[11px] font-mono" style={{ color: theme.textSecondary }}>
                  Batas Kuota Penggunaan
                </Label>
                <input
                  id="max_usage"
                  type="number"
                  placeholder="Kosongkan = Unlimited"
                  value={formData.max_usage}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_usage: e.target.value }))}
                  style={inputStyle}
                  className="mt-1 w-full px-3 py-1.5 focus:outline-none"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Toggle Aktif */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: theme.border }}>
            <div>
              <span className="text-xs font-semibold block" style={{ color: theme.textPrimary }}>
                Status Aktif Kupon
              </span>
              <span className="text-[11px]" style={{ color: theme.textSecondary }}>
                Kupon yang nonaktif tidak akan muncul di opsi pendaftaran calon siswa.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-all active:scale-95"
              style={{
                borderColor: theme.border,
                background: formData.is_active ? theme.greenBg : theme.cardBgAlt,
                color: formData.is_active ? theme.greenText : theme.textSecondary
              }}
            >
              <FontAwesomeIcon icon={formData.is_active ? faToggleOn : faToggleOff} className="text-base" />
              <span>{formData.is_active ? 'Kupon Aktif' : 'Kupon Nonaktif'}</span>
            </button>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-medium border rounded transition-all active:scale-95 disabled:opacity-50"
              style={{ borderColor: theme.border, background: theme.cardBg, color: theme.textSecondary, borderRadius: '6px' }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              style={{
                background: isDark ? '#F0EFE9' : '#111111',
                color: isDark ? '#111111' : '#FFFFFF',
                borderRadius: '6px'
              }}
            >
              {saving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  <span>{editingDiscount ? 'Simpan Perubahan' : 'Buat Kupon'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
