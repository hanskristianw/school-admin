'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
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
  faCheck
} from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
};

const appliesToLabel = {
  udp: 'DPP',
  usek: 'SPP',
  both: 'DPP & SPP'
};

const appliesToColor = {
  udp: 'bg-emerald-100 text-emerald-700',
  usek: 'bg-blue-100 text-blue-700',
  both: 'bg-purple-100 text-purple-700'
};

export default function DiscountMasterPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState([]);
  const [levels, setLevels] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterUnit, setFilterUnit] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterAppliesTo, setFilterAppliesTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    unit_id: '',
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
  const [formErrors, setFormErrors] = useState({});

  // Notification
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [discountsRes, levelsRes, yearsRes] = await Promise.all([
        supabase
          .from('fee_discount')
          .select('*, unit:unit_id(unit_name), level:level_id(level_name, unit_id, unit:unit_id(unit_name)), year:year_id(year_name)')
          .order('created_at', { ascending: false }),
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
      console.error('Error:', err);
      showNotification('Error', 'Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get unique units from levels
  const units = [...new Map(levels.map(l => [l.unit_id, { unit_id: l.unit_id, unit_name: l.unit?.unit_name }])).values()];

  // Levels filtered by selected unit (for form)
  const formLevels = formData.unit_id
    ? levels.filter(l => l.unit_id === parseInt(formData.unit_id))
    : [];

  // Levels filtered by filter unit (for table filter)
  const filterLevelsForDropdown = filterUnit
    ? levels.filter(l => l.unit_id === parseInt(filterUnit))
    : levels;

  // Check if a discount code exists across all units for a year
  const isAllUnitsDiscount = (discountCode, yearId) => {
    if (!discountCode || !yearId) return false;
    const matching = discounts.filter(d => d.discount_code === discountCode && d.year_id === yearId);
    return matching.length > 1 && matching.length >= units.length;
  };

  // Deduplicate all-units discounts: show one row per code+year instead of N rows
  const deduplicatedDiscounts = (() => {
    const seen = new Set();
    return discounts.filter(d => {
      if (isAllUnitsDiscount(d.discount_code, d.year_id)) {
        const key = `${d.discount_code}|${d.year_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
  })();

  const filteredDiscounts = deduplicatedDiscounts.filter(d => {
    const dIsGlobal = isAllUnitsDiscount(d.discount_code, d.year_id);
    if (filterUnit && d.unit_id !== parseInt(filterUnit) && !dIsGlobal) return false;
    if (filterLevel && d.level_id !== parseInt(filterLevel)) return false;
    if (filterYear && d.year_id !== parseInt(filterYear)) return false;
    if (filterAppliesTo && d.applies_to !== filterAppliesTo) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!d.discount_code?.toLowerCase().includes(term) &&
          !d.discount_name?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const resetForm = () => {
    setFormData({
      unit_id: '', level_id: '', year_id: '', discount_code: '', discount_name: '',
      discount_description: '', discount_type: 'fixed', discount_value: '',
      applies_to: 'udp', valid_from: '', valid_until: '', max_usage: '', is_active: true,
    });
    setFormErrors({});
    setEditingDiscount(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (discount) => {
    const allUnits = isAllUnitsDiscount(discount.discount_code, discount.year_id);
    setEditingDiscount({ ...discount, _isAllUnits: allUnits });
    setFormData({
      unit_id: allUnits ? 'all' : (discount.level?.unit_id || discount.unit_id)?.toString() || '',
      level_id: discount.level_id?.toString() || '',
      year_id: discount.year_id?.toString() || '',
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
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.unit_id) errors.unit_id = 'Wajib dipilih';
    if (!formData.year_id) errors.year_id = 'Wajib dipilih';
    if (!formData.discount_code.trim()) errors.discount_code = 'Wajib diisi';
    if (!formData.discount_name.trim()) errors.discount_name = 'Wajib diisi';
    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      errors.discount_value = 'Harus lebih dari 0';
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
      const basePayload = {
        level_id: formData.unit_id === 'all' ? null : (formData.level_id ? parseInt(formData.level_id) : null),
        year_id: parseInt(formData.year_id),
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

      const payload = formData.unit_id === 'all'
        ? basePayload
        : { ...basePayload, unit_id: parseInt(formData.unit_id) };

      if (editingDiscount) {
        // Helper: check which discount_ids are referenced by application_discount
        const checkUsage = async (ids) => {
          const { data } = await supabase
            .from('application_discount')
            .select('discount_id')
            .in('discount_id', ids);
          return new Set((data || []).map(r => r.discount_id));
        };

        // Helper: safely remove records — hard-delete if unused, soft-delete if in use
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
          return { deleted: canDelete.length, deactivated: mustSoftDelete.length };
        };

        if (editingDiscount._isAllUnits) {
          const siblings = discounts.filter(d => d.discount_code === editingDiscount.discount_code && d.year_id === editingDiscount.year_id);
          const siblingIds = siblings.map(d => d.discount_id);

          if (formData.unit_id === 'all') {
            // All → All: update every sibling record
            const { unit_id: _ignore, ...updatePayload } = payload;
            for (const id of siblingIds) {
              const { error } = await supabase
                .from('fee_discount')
                .update({ ...updatePayload, level_id: null })
                .eq('discount_id', id);
              if (error) throw error;
            }
            showNotification('Berhasil', `Potongan berhasil diupdate untuk ${siblingIds.length} unit`);
          } else {
            // All → Single: keep record for target unit, safely remove the rest
            const targetUnitId = parseInt(formData.unit_id);
            const keepRecord = siblings.find(d => d.unit_id === targetUnitId) || siblings[0];
            const removeIds = siblingIds.filter(id => id !== keepRecord.discount_id);

            await safeRemove(removeIds);

            const { error } = await supabase
              .from('fee_discount')
              .update(payload)
              .eq('discount_id', keepRecord.discount_id);
            if (error) throw error;
            showNotification('Berhasil', 'Potongan diubah menjadi satu unit saja');
          }
        } else {
          if (formData.unit_id === 'all') {
            // Single → All: keep existing record, update it, add missing units
            const existingUnitId = editingDiscount.unit_id;

            // Update the existing record
            const { error: updErr } = await supabase
              .from('fee_discount')
              .update({ ...basePayload, unit_id: existingUnitId, level_id: null })
              .eq('discount_id', editingDiscount.discount_id);
            if (updErr) throw updErr;

            // Insert records for units that don't have this discount yet
            const missingUnits = units.filter(u => u.unit_id !== existingUnitId);
            if (missingUnits.length > 0) {
              const inserts = missingUnits.map(u => ({
                ...basePayload,
                unit_id: u.unit_id,
                level_id: null,
                current_usage: 0,
              }));
              const { error } = await supabase.from('fee_discount').insert(inserts);
              if (error) throw error;
            }
            showNotification('Berhasil', `Potongan diperluas ke ${units.length} unit sekaligus`);
          } else {
            // Single → Single: normal update
            const { error } = await supabase
              .from('fee_discount')
              .update(payload)
              .eq('discount_id', editingDiscount.discount_id);
            if (error) throw error;
            showNotification('Berhasil', 'Potongan berhasil diupdate');
          }
        }
      } else if (formData.unit_id === 'all') {
        // Insert one record per unit
        const inserts = units.map(u => ({
          ...basePayload,
          unit_id: u.unit_id,
          level_id: null,
          current_usage: 0,
        }));
        const { error } = await supabase
          .from('fee_discount')
          .insert(inserts);
        if (error) throw error;
        showNotification('Berhasil', `Potongan berhasil ditambahkan untuk ${units.length} unit sekaligus`);
      } else {
        payload.current_usage = 0;
        const { error } = await supabase
          .from('fee_discount')
          .insert(payload);
        if (error) throw error;
        showNotification('Berhasil', 'Potongan baru berhasil ditambahkan');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error saving:', err);
      showNotification('Error', 'Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (discount) => {
    const allUnits = isAllUnitsDiscount(discount.discount_code, discount.year_id);
    const confirmMsg = allUnits
      ? `Hapus potongan "${discount.discount_name}" dari SEMUA unit?`
      : `Hapus potongan "${discount.discount_name}"?`;
    if (!confirm(confirmMsg)) return;
    setDeleting(discount.discount_id);
    try {
      // Get all IDs to delete (multiple if all-units discount)
      const idsToDelete = allUnits
        ? discounts
            .filter(d => d.discount_code === discount.discount_code && d.year_id === discount.year_id)
            .map(d => d.discount_id)
        : [discount.discount_id];

      // Check which IDs are in use by application_discount
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
          'Berhasil (Sebagian Dinonaktifkan)',
          `${canDelete.length} dihapus, ${mustSoftDelete.length} dinonaktifkan karena sudah digunakan pendaftar.`,
          'success'
        );
      } else {
        showNotification('Berhasil', allUnits ? `Potongan berhasil dihapus dari ${canDelete.length} unit` : 'Potongan berhasil dihapus');
      }
      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      if (err.message?.includes('violates foreign key constraint')) {
        showNotification(
          'Tidak Dapat Dihapus',
          `Potongan "${discount.discount_name}" sudah digunakan oleh pendaftar. Nonaktifkan saja jika tidak ingin digunakan lagi.`,
          'error'
        );
      } else {
        showNotification('Error', 'Gagal menghapus: ' + err.message, 'error');
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (discount) => {
    try {
      const allUnits = isAllUnitsDiscount(discount.discount_code, discount.year_id);
      if (allUnits) {
        // Toggle all sibling discount records
        const siblingIds = discounts
          .filter(d => d.discount_code === discount.discount_code && d.year_id === discount.year_id)
          .map(d => d.discount_id);
        const { error } = await supabase
          .from('fee_discount')
          .update({ is_active: !discount.is_active })
          .in('discount_id', siblingIds);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fee_discount')
          .update({ is_active: !discount.is_active })
          .eq('discount_id', discount.discount_id);
        if (error) throw error;
      }
      fetchData();
    } catch (err) {
      showNotification('Error', 'Gagal mengubah status: ' + err.message, 'error');
    }
  };

  const getDiscountScope = (d) => {
    const allUnits = isAllUnitsDiscount(d.discount_code, d.year_id);
    if (allUnits) {
      return { primary: 'Semua Unit', secondary: d.level?.level_name || 'Semua jenjang', isGlobal: true };
    }
    if (d.level?.level_name) {
      return { primary: d.level.level_name, secondary: d.level.unit?.unit_name || d.unit?.unit_name, isGlobal: false };
    }
    return { primary: d.unit?.unit_name || '-', secondary: 'Semua jenjang', isGlobal: false };
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-blue-600" />
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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/data/admission')}
            className="flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Potongan / Diskon</h1>
            <p className="text-gray-600">Kelola master potongan untuk DPP dan SPP per jenjang</p>
          </div>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Tambah Potongan
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Cari</Label>
              <div className="relative mt-1">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Kode atau nama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Unit</Label>
              <select
                value={filterUnit}
                onChange={(e) => { setFilterUnit(e.target.value); setFilterLevel(''); }}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Unit</option>
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Jenjang</Label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Jenjang</option>
                {filterLevelsForDropdown.map(l => (
                  <option key={l.level_id} value={l.level_id}>
                    {!filterUnit ? `${l.unit?.unit_name} - ` : ''}{l.level_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Tahun Ajaran</Label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Tahun</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Berlaku Untuk</Label>
              <select
                value={filterAppliesTo}
                onChange={(e) => setFilterAppliesTo(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua</option>
                <option value="udp">DPP</option>
                <option value="usek">SPP</option>
                <option value="both">DPP & SPP</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTag} className="text-emerald-600" />
            Daftar Potongan ({filteredDiscounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDiscounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FontAwesomeIcon icon={faTag} className="text-4xl mb-4 text-gray-300" />
              <p>Belum ada data potongan</p>
              <p className="text-sm mt-1">Klik &quot;Tambah Potongan&quot; untuk membuat potongan baru</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Potongan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Berlaku</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenjang / Tahun</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penggunaan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDiscounts.map(d => {
                    const scope = getDiscountScope(d);
                    return (
                      <tr key={d.discount_id} className={`hover:bg-gray-50 ${!d.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-blue-600 font-semibold">{d.discount_code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{d.discount_name}</p>
                          {d.discount_description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{d.discount_description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${d.discount_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            <FontAwesomeIcon icon={d.discount_type === 'percentage' ? faPercent : faMoneyBill} className="text-[10px]" />
                            {d.discount_type === 'percentage' ? 'Persen' : 'Nominal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {d.discount_type === 'percentage' ? `${d.discount_value}%` : formatCurrency(d.discount_value)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${appliesToColor[d.applies_to]}`}>
                            {appliesToLabel[d.applies_to]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            {scope.isGlobal && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">GLOBAL</span>
                            )}
                            <p className="font-medium">{scope.primary}</p>
                          </div>
                          <p className="text-xs text-gray-400">{scope.secondary} &middot; {d.year?.year_name || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {d.max_usage ? `${d.current_usage || 0} / ${d.max_usage}` : `${d.current_usage || 0} (unlimited)`}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(d)}
                            className={`flex items-center gap-1 text-sm font-medium ${d.is_active ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            <FontAwesomeIcon icon={d.is_active ? faToggleOn : faToggleOff} className="text-lg" />
                            {d.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(d)}
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 border-red-200"
                              onClick={() => handleDelete(d)}
                              disabled={deleting === d.discount_id}
                            >
                              {deleting === d.discount_id ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                              ) : (
                                <FontAwesomeIcon icon={faTrash} />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingDiscount ? 'Edit Potongan' : 'Tambah Potongan Baru'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Unit, Level & Year */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unit_id">Unit *</Label>
              <select
                id="unit_id"
                value={formData.unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value, level_id: '' }))}
                className={`mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.unit_id ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Pilih Unit</option>
                <option value="all" className="font-semibold">✦ Semua Unit</option>
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                ))}
              </select>
              {formData.unit_id === 'all' && (
                <p className="text-xs text-amber-600 mt-1 font-medium">Potongan akan dibuat untuk semua unit sekaligus</p>
              )}
              {formErrors.unit_id && <p className="text-red-500 text-xs mt-1">{formErrors.unit_id}</p>}
            </div>
            <div>
              <Label htmlFor="level_id">Jenjang</Label>
              <select
                id="level_id"
                value={formData.level_id}
                onChange={(e) => setFormData(prev => ({ ...prev, level_id: e.target.value }))}
                disabled={!formData.unit_id || formData.unit_id === 'all'}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">{formData.unit_id === 'all' ? 'Semua jenjang (otomatis)' : 'Semua jenjang di unit ini'}</option>
                {formLevels.map(l => (
                  <option key={l.level_id} value={l.level_id}>{l.level_name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">{formData.unit_id === 'all' ? 'Level tidak bisa dipilih untuk semua unit' : 'Kosongkan = berlaku untuk semua jenjang'}</p>
            </div>
            <div>
              <Label htmlFor="year_id">Tahun Ajaran *</Label>
              <select
                id="year_id"
                value={formData.year_id}
                onChange={(e) => setFormData(prev => ({ ...prev, year_id: e.target.value }))}
                className={`mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.year_id ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Pilih Tahun</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
              {formErrors.year_id && <p className="text-red-500 text-xs mt-1">{formErrors.year_id}</p>}
            </div>
          </div>

          {/* Code & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_code">Kode Potongan *</Label>
              <Input
                id="discount_code"
                value={formData.discount_code}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_code: e.target.value.replace(/\s/g, '').toUpperCase() }))}
                placeholder="Contoh: SIBLING10, PAMERAN2026"
                className={`mt-1 font-mono ${formErrors.discount_code ? 'border-red-500' : ''}`}
              />
              {formErrors.discount_code && <p className="text-red-500 text-xs mt-1">{formErrors.discount_code}</p>}
            </div>
            <div>
              <Label htmlFor="discount_name">Nama Potongan *</Label>
              <Input
                id="discount_name"
                value={formData.discount_name}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_name: e.target.value }))}
                placeholder="Contoh: Potongan Anak Kedua 10%"
                className={`mt-1 ${formErrors.discount_name ? 'border-red-500' : ''}`}
              />
              {formErrors.discount_name && <p className="text-red-500 text-xs mt-1">{formErrors.discount_name}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="discount_description">Deskripsi (Opsional)</Label>
            <textarea
              id="discount_description"
              value={formData.discount_description}
              onChange={(e) => setFormData(prev => ({ ...prev, discount_description: e.target.value }))}
              rows={2}
              placeholder="Keterangan tambahan tentang potongan ini..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type, Value, Applies To */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="discount_type">Tipe *</Label>
              <select
                id="discount_type"
                value={formData.discount_type}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Nominal Tetap (Rp)</option>
                <option value="percentage">Persentase (%)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="discount_value">
                Nilai * {formData.discount_type === 'percentage' ? '(%)' : '(Rp)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                value={formData.discount_value}
                onChange={(e) => {
                  let val = e.target.value;
                  if (formData.discount_type === 'percentage') {
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 100) val = '100';
                    if (!isNaN(num) && num < 0) val = '0';
                  }
                  setFormData(prev => ({ ...prev, discount_value: val }));
                }}
                placeholder={formData.discount_type === 'percentage' ? '1 - 100' : '500000'}
                min={formData.discount_type === 'percentage' ? '1' : '0'}
                max={formData.discount_type === 'percentage' ? '100' : undefined}
                className={`mt-1 ${formErrors.discount_value ? 'border-red-500' : ''}`}
              />
              {formErrors.discount_value && <p className="text-red-500 text-xs mt-1">{formErrors.discount_value}</p>}
            </div>
            <div>
              <Label htmlFor="applies_to">Berlaku Untuk *</Label>
              <select
                id="applies_to"
                value={formData.applies_to}
                onChange={(e) => setFormData(prev => ({ ...prev, applies_to: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="udp">DPP saja</option>
                <option value="usek">SPP saja</option>
                <option value="both">DPP & SPP</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className={`p-3 rounded-lg border ${formData.unit_id === 'all' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            <p className="font-medium text-gray-900">
              {formData.discount_type === 'percentage'
                ? `Potongan ${formData.discount_value || 0}% dari subtotal`
                : `Potongan ${formatCurrency(parseFloat(formData.discount_value) || 0)}`
              }
              {' '}— berlaku untuk <span className="font-semibold">{appliesToLabel[formData.applies_to]}</span>
              {formData.unit_id === 'all' && (
                <span className="text-amber-700 font-semibold"> — diterapkan ke {units.length} unit</span>
              )}
            </p>
          </div>

          {/* Validity & Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="valid_from">Berlaku Dari</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="valid_until">Berlaku Sampai</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="max_usage">Maks. Penggunaan</Label>
              <Input
                id="max_usage"
                type="number"
                value={formData.max_usage}
                onChange={(e) => setFormData(prev => ({ ...prev, max_usage: e.target.value }))}
                placeholder="Unlimited"
                min="1"
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Kosongkan = unlimited</p>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${formData.is_active ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
            >
              <FontAwesomeIcon icon={formData.is_active ? faToggleOn : faToggleOff} className="text-lg" />
              {formData.is_active ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }} disabled={saving}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (
                <><FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> Menyimpan...</>
              ) : (
                <><FontAwesomeIcon icon={faCheck} className="mr-2" /> {editingDiscount ? 'Simpan Perubahan' : 'Tambah Potongan'}</>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
