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
  faFilter,
  faToggleOn,
  faToggleOff,
  faInfoCircle,
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
};

const appliesToLabel = {
  udp: 'UDP',
  usek: 'USEK',
  both: 'UDP & USEK'
};

const appliesToColor = {
  udp: 'bg-emerald-100 text-emerald-700',
  usek: 'bg-blue-100 text-blue-700',
  both: 'bg-purple-100 text-purple-700'
};

export default function DiscountMasterPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState([]);
  const [units, setUnits] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterUnit, setFilterUnit] = useState('');
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

      const [discountsRes, unitsRes, yearsRes] = await Promise.all([
        supabase
          .from('fee_discount')
          .select('*, unit:unit_id(unit_name), year:year_id(year_name)')
          .order('created_at', { ascending: false }),
        supabase.from('unit').select('unit_id, unit_name').eq('is_school', true).order('unit_name'),
        supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false }),
      ]);

      if (discountsRes.error) throw discountsRes.error;
      setDiscounts(discountsRes.data || []);
      setUnits(unitsRes.data || []);
      setYears(yearsRes.data || []);
    } catch (err) {
      console.error('Error:', err);
      showNotification('Error', 'Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDiscounts = discounts.filter(d => {
    if (filterUnit && d.unit_id !== parseInt(filterUnit)) return false;
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
      unit_id: '', year_id: '', discount_code: '', discount_name: '',
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
    setEditingDiscount(discount);
    setFormData({
      unit_id: discount.unit_id?.toString() || '',
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
      const payload = {
        unit_id: parseInt(formData.unit_id),
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

      if (editingDiscount) {
        const { error } = await supabase
          .from('fee_discount')
          .update(payload)
          .eq('discount_id', editingDiscount.discount_id);
        if (error) throw error;
        showNotification('Berhasil', 'Potongan berhasil diupdate');
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
    if (!confirm(`Hapus potongan "${discount.discount_name}"?`)) return;
    setDeleting(discount.discount_id);
    try {
      // Check if discount is used by any application
      const { count, error: countErr } = await supabase
        .from('application_discount')
        .select('app_discount_id', { count: 'exact', head: true })
        .eq('discount_id', discount.discount_id);
      
      if (!countErr && count > 0) {
        showNotification(
          'Tidak Dapat Dihapus', 
          `Potongan "${discount.discount_name}" sudah digunakan oleh ${count} pendaftar. Nonaktifkan saja jika tidak ingin digunakan lagi.`, 
          'error'
        );
        return;
      }

      const { error } = await supabase
        .from('fee_discount')
        .delete()
        .eq('discount_id', discount.discount_id);
      if (error) throw error;
      showNotification('Berhasil', 'Potongan berhasil dihapus');
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
      const { error } = await supabase
        .from('fee_discount')
        .update({ is_active: !discount.is_active })
        .eq('discount_id', discount.discount_id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      showNotification('Error', 'Gagal mengubah status: ' + err.message, 'error');
    }
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
            <p className="text-gray-600">Kelola master potongan untuk UDP dan USEK</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Cari</Label>
              <div className="relative mt-1">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Kode atau nama potongan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Sekolah</Label>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Sekolah</option>
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
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
                <option value="udp">UDP</option>
                <option value="usek">USEK</option>
                <option value="both">UDP & USEK</option>
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
              <p className="text-sm mt-1">Klik "Tambah Potongan" untuk membuat potongan baru</p>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit / Tahun</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penggunaan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDiscounts.map(d => (
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
                        <p>{d.unit?.unit_name || '-'}</p>
                        <p className="text-xs text-gray-400">{d.year?.year_name || '-'}</p>
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
                  ))}
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
          {/* Unit & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit_id">Sekolah *</Label>
              <select
                id="unit_id"
                value={formData.unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                className={`mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.unit_id ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Pilih Sekolah</option>
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                ))}
              </select>
              {formErrors.unit_id && <p className="text-red-500 text-xs mt-1">{formErrors.unit_id}</p>}
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
                <option value="udp">UDP saja</option>
                <option value="usek">USEK saja</option>
                <option value="both">UDP & USEK</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            <p className="font-medium text-gray-900">
              {formData.discount_type === 'percentage'
                ? `Potongan ${formData.discount_value || 0}% dari subtotal`
                : `Potongan ${formatCurrency(parseFloat(formData.discount_value) || 0)}`
              }
              {' '}— berlaku untuk <span className="font-semibold">{appliesToLabel[formData.applies_to]}</span>
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
