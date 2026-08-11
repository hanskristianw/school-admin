'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase, createSupabaseWithAuth } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import ImageCropUploader from '@/components/ui/image-crop-uploader';


const STORAGE_BUCKET = 'report-assets';

export default function UnitManagement() {
  const { theme } = useTheme();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({ unit_name: '', is_school: false, is_pyp: false, is_myp: false, is_dp: false });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Report Settings state
  const [years, setYears] = useState([]);
  const [rsUnitId, setRsUnitId] = useState('');
  const [rsYearId, setRsYearId] = useState('');
  const [rsLoading, setRsLoading] = useState(false);
  const [rsSaving, setRsSaving] = useState(false);
  const [rsData, setRsData] = useState({
    principal_name: '',
    principal_title: '',
    report_greeting_s1: '',
    report_greeting_s2: '',
    report_date_s1: '',
    report_date_s2: '',
    signature_principal_url: '',
    stamp_url: '',
  });
  const [rsExistingId, setRsExistingId] = useState(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const signatureInputRef = useRef(null);
  const stampInputRef = useRef(null);

  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  useEffect(() => { fetchUnits(); fetchYears(); }, []);

  const showNotification = (title, message, type = 'success') =>
    setNotification({ isOpen: true, title, message, type });
  const closeNotification = () => setNotification(p => ({ ...p, isOpen: false }));

  const fetchYears = async () => {
    const { data } = await supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false });
    setYears(data || []);
  };

  const fetchReportSettings = async (unitId, yearId) => {
    if (!unitId || !yearId) return;
    setRsLoading(true);
    const { data } = await supabase
      .from('report_settings')
      .select('id, principal_name, principal_title, report_greeting_s1, report_greeting_s2, report_date_s1, report_date_s2, signature_principal_url, stamp_url')
      .eq('unit_id', unitId)
      .eq('year_id', yearId)
      .single();
    if (data) {
      setRsData({
        principal_name: data.principal_name || '',
        principal_title: data.principal_title || '',
        report_greeting_s1: data.report_greeting_s1 || '',
        report_greeting_s2: data.report_greeting_s2 || '',
        report_date_s1: data.report_date_s1 || '',
        report_date_s2: data.report_date_s2 || '',
        signature_principal_url: data.signature_principal_url || '',
        stamp_url: data.stamp_url || '',
      });
      setRsExistingId(data.id);
    } else {
      setRsData({ principal_name: '', principal_title: '', report_greeting_s1: '', report_greeting_s2: '', report_date_s1: '', report_date_s2: '', signature_principal_url: '', stamp_url: '' });
      setRsExistingId(null);
    }
    setRsLoading(false);
  };

  const handleRsUnitChange = (e) => {
    setRsUnitId(e.target.value);
    setRsExistingId(null);
    if (e.target.value && rsYearId) fetchReportSettings(e.target.value, rsYearId);
  };

  const handleRsYearChange = (e) => {
    setRsYearId(e.target.value);
    setRsExistingId(null);
    if (rsUnitId && e.target.value) fetchReportSettings(rsUnitId, e.target.value);
  };

  const handleSaveReportSettings = async () => {
    if (!rsUnitId || !rsYearId) return;
    setRsSaving(true);
    try {
      const payload = {
        unit_id: parseInt(rsUnitId),
        year_id: parseInt(rsYearId),
        principal_name: rsData.principal_name.trim() || null,
        principal_title: rsData.principal_title.trim() || null,
        report_greeting_s1: rsData.report_greeting_s1.trim() || null,
        report_greeting_s2: rsData.report_greeting_s2.trim() || null,
        report_date_s1: rsData.report_date_s1 || null,
        report_date_s2: rsData.report_date_s2 || null,
        signature_principal_url: rsData.signature_principal_url || null,
        stamp_url: rsData.stamp_url || null,
      };
      let err;
      if (rsExistingId) {
        ({ error: err } = await supabase.from('report_settings').update(payload).eq('id', rsExistingId));
      } else {
        const { data: inserted, error: insertErr } = await supabase.from('report_settings').insert([payload]).select('id').single();
        err = insertErr;
        if (inserted) setRsExistingId(inserted.id);
      }
      if (err) throw err;
      showNotification('Berhasil!', 'Report settings berhasil disimpan!', 'success');
    } catch (e) {
      showNotification('Error!', e.message, 'error');
    } finally {
      setRsSaving(false);
    }
  };

  // Upload a Blob to Supabase storage via native fetch (bypasses JS client header inheritance issues)
  const uploadFile = async (blob, pathSuffix, setUploading, field) => {
    if (!rsUnitId || !rsYearId) {
      showNotification('Error!', 'Pilih Unit dan Tahun Ajaran terlebih dahulu.', 'error');
      return;
    }
    setUploading(true);
    try {
      const path = `${rsUnitId}/${rsYearId}/${pathSuffix}.png`;
      const tok = typeof window !== 'undefined' ? localStorage.getItem('app_jwt') : null;
      const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const isTokenExpired = (t) => {
        if (!t) return true;
        try {
          const payload = JSON.parse(atob(t.split('.')[1]));
          return payload && payload.exp ? payload.exp * 1000 < Date.now() : false;
        } catch {
          return true;
        }
      };

      const authToken = (tok && !isTokenExpired(tok)) ? tok : supabaseAnon;

      // Use native fetch so Authorization header is guaranteed to be sent
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${path}`;
      let res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnon,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        body: blob,
      });

      // Retry with anon key if 401 Unauthorized occurs due to expired JWT
      if (res.status === 401 && authToken !== supabaseAnon) {
        res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnon}`,
            'apikey': supabaseAnon,
            'Content-Type': 'image/png',
            'x-upsert': 'true',
          },
          body: blob,
        });
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || errBody.error || `Upload failed (${res.status})`);
      }

      // Build public URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}?t=${Date.now()}`;
      setRsData(p => ({ ...p, [field]: publicUrl }));
      showNotification('Berhasil!', 'Gambar berhasil diupload. Klik Simpan untuk menyimpan perubahan.', 'success');
    } catch (e) {
      showNotification('Error Upload!', e.message, 'error');
    } finally {
      setUploading(false);
    }
  };


  const fetchUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('unit').select('unit_id, unit_name, is_school, is_pyp, is_myp, is_dp').order('unit_name');
      if (error) {
        // Fallback if columns not yet created
        const { data: fallbackData, error: fallbackError } = await supabase.from('unit').select('unit_id, unit_name, is_school').order('unit_name');
        if (fallbackError) throw new Error(fallbackError.message);
        setUnits((fallbackData || []).map(u => ({
          ...u,
          is_pyp: u.unit_name ? u.unit_name.toUpperCase().includes('PYP') : false,
          is_myp: u.unit_name ? u.unit_name.toUpperCase().includes('MYP') : false,
          is_dp: u.unit_name ? u.unit_name.toUpperCase().includes('DP') : false,
        })));
      } else {
        setUnits((data || []).map(u => ({
          ...u,
          is_pyp: u.is_pyp ?? (u.unit_name ? u.unit_name.toUpperCase().includes('PYP') : false),
          is_myp: u.is_myp ?? (u.unit_name ? u.unit_name.toUpperCase().includes('MYP') : false),
          is_dp: u.is_dp ?? (u.unit_name ? u.unit_name.toUpperCase().includes('DP') : false),
        })));
      }
    } catch (err) {
      setError('Error fetching units: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.unit_name.trim()) errors.unit_name = 'Unit name is required';
    else if (formData.unit_name.length < 2) errors.unit_name = 'Unit name must be at least 2 characters';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const submitData = {
        unit_name: formData.unit_name.trim(),
        is_school: !!formData.is_school,
        is_pyp: !!formData.is_pyp,
        is_myp: !!formData.is_myp,
        is_dp: !!formData.is_dp,
      };
      let result = await supabase.from('unit').update(submitData).eq('unit_id', editingUnit?.unit_id);
      if (result.error) {
        // Fallback without new boolean columns if DB not migrated yet
        const basicData = { unit_name: formData.unit_name.trim(), is_school: !!formData.is_school };
        if (editingUnit) {
          result = await supabase.from('unit').update(basicData).eq('unit_id', editingUnit.unit_id);
        } else {
          result = await supabase.from('unit').insert([basicData]);
        }
      } else if (!editingUnit) {
        result = await supabase.from('unit').insert([submitData]);
      }
      if (result.error) throw new Error(result.error.message);
      await fetchUnits();
      resetForm();
      showNotification('Success!', editingUnit ? 'Unit updated successfully!' : 'New unit added successfully!', 'success');
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      unit_name: unit.unit_name,
      is_school: !!unit.is_school,
      is_pyp: !!unit.is_pyp,
      is_myp: !!unit.is_myp,
      is_dp: !!unit.is_dp,
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (unit) => {
    if (!confirm(`Delete unit "${unit.unit_name}"?`)) return;
    try {
      const { error } = await supabase.from('unit').delete().eq('unit_id', unit.unit_id);
      if (error) throw new Error(error.message);
      await fetchUnits();
      showNotification('Success!', 'Unit deleted successfully!', 'success');
    } catch (err) {
      showNotification('Error!', err.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({ unit_name: '', is_school: false, is_pyp: false, is_myp: false, is_dp: false });
    setEditingUnit(null);
    setShowForm(false);
    setFormErrors({});
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (loading) return <div className="p-4 text-center" style={{ color: theme.textSecondary }}>Loading...</div>;

  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody };
  const selectClass = "w-full mt-1 rounded-md px-3 py-2 text-xs focus:outline-none";
  const sectionLabel = "text-xs font-mono font-bold uppercase tracking-wider mb-3 flex items-center gap-2";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-4" style={{ borderColor: theme.border }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">
            SYSTEM CONFIGURATION • UNIT ARCHITECTURE
          </span>
          <h1 className="text-xl md:text-2xl font-bold mt-2 tracking-tight" style={{ color: theme.textPrimary }}>
            Unit & Report Management
          </h1>
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            Configure organizational units, IB programme mappings (PYP/MYP/DP), and report card signatures.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-xs font-bold rounded-md border-none cursor-pointer"
          style={{ background: theme.textPrimary, color: theme.pageBg }}
        >
          + Add New Unit
        </Button>
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editingUnit ? 'Edit Unit' : 'Add New Unit'} size="sm">
        {error && <div className="px-3 py-2 rounded mb-3 text-xs font-medium" style={{ background: theme.redBg, border: `1px solid ${theme.border}`, color: theme.redText }}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <Label htmlFor="unit_name" style={{ color: theme.textPrimary }} className="font-semibold block mb-1">Unit Name *</Label>
            <Input id="unit_name" name="unit_name" value={formData.unit_name} onChange={handleInputChange}
              className={`text-xs ${formErrors.unit_name ? 'border-red-500' : ''}`}
              style={{ background: theme.inputBg, border: `1px solid ${formErrors.unit_name ? '#ef4444' : theme.border}`, color: theme.textPrimary }}
              disabled={submitting} placeholder="e.g. Primary, Secondary MYP, Management" />
            {formErrors.unit_name && <p className="text-red-500 text-[11px] mt-1">{formErrors.unit_name}</p>}
          </div>

          <div className="p-3 rounded-lg border space-y-2.5" style={{ background: theme.subtleBg, borderColor: theme.border }}>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider block" style={{ color: theme.textSecondary }}>Type & Programme Mapping</span>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input id="is_school" name="is_school" type="checkbox" checked={!!formData.is_school}
                onChange={handleInputChange} disabled={submitting} className="h-4 w-4 rounded cursor-pointer" />
              <span className="font-medium" style={{ color: theme.textPrimary }}>Is School Unit</span>
            </label>

            <div className="pt-2 border-t space-y-2" style={{ borderColor: theme.border }}>
              <span className="text-[10px] font-semibold block" style={{ color: theme.textSecondary }}>IB Programme Categories:</span>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer p-2 rounded border transition-colors" style={{ background: theme.cardBg, borderColor: theme.border }}>
                  <input id="is_pyp" name="is_pyp" type="checkbox" checked={!!formData.is_pyp}
                    onChange={handleInputChange} disabled={submitting} className="rounded cursor-pointer" />
                  <span className="font-mono font-bold text-[10px]" style={{ color: theme.greenText }}>PYP</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer p-2 rounded border transition-colors" style={{ background: theme.cardBg, borderColor: theme.border }}>
                  <input id="is_myp" name="is_myp" type="checkbox" checked={!!formData.is_myp}
                    onChange={handleInputChange} disabled={submitting} className="rounded cursor-pointer" />
                  <span className="font-mono font-bold text-[10px]" style={{ color: theme.blueText }}>MYP</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer p-1.5 rounded border transition-colors" style={{ background: theme.cardBg, borderColor: theme.border }}>
                  <input id="is_dp" name="is_dp" type="checkbox" checked={!!formData.is_dp}
                    onChange={handleInputChange} disabled={submitting} className="rounded cursor-pointer" />
                  <span className="font-mono font-bold text-[10px] text-[#A855F7]">DP</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none', flex: 1 }} disabled={submitting} className="text-xs font-bold py-2">
              {submitting ? 'Processing...' : (editingUnit ? 'Update Unit' : 'Create Unit')}
            </Button>
            <Button type="button" onClick={resetForm} variant="outline" style={{ background: theme.subtleBg, color: theme.textPrimary, borderColor: theme.border, flex: 1 }} disabled={submitting} className="text-xs font-medium py-2">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Units Table */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardHeader className="p-4 border-b" style={{ borderColor: theme.border }}>
          <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: theme.textPrimary }}>Units Directory ({units.length} units)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="block md:hidden p-3 space-y-3">
            {units.length === 0 ? (
              <div className="text-center py-6 text-xs" style={{ color: theme.textSecondary }}>No units found</div>
            ) : units.map(unit => (
              <div key={unit.unit_id} className="rounded-lg p-3 space-y-2.5 border" style={{ borderColor: theme.border, background: theme.subtleBg }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xs" style={{ color: theme.textPrimary }}>{unit.unit_name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {unit.is_school
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">School</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">Management</span>}

                      {unit.is_pyp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">PYP</span>}
                      {unit.is_myp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">MYP</span>}
                      {unit.is_dp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]">DP</span>}
                    </div>
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: theme.textSecondary }}>ID: #{unit.unit_id}</span>
                </div>
                <div className="flex gap-2 pt-1 border-t" style={{ borderColor: theme.border }}>
                  <Button size="sm" onClick={() => handleEdit(unit)} className="text-xs py-1" style={{ background: theme.textPrimary, color: theme.pageBg, border: 'none', flex: 1 }}>Edit</Button>
                  <Button size="sm" onClick={() => handleDelete(unit)} className="text-xs py-1 bg-[#FDEBEC] text-[#9F2F2D] border border-[#F8C9CC] flex-1">Delete</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b font-mono font-semibold uppercase tracking-wider text-[10px]" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                  <th className="p-3 text-left w-16">ID</th>
                  <th className="p-3 text-left">Unit Name</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Programme Mapping</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {units.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-xs" style={{ color: theme.textSecondary }}>No units found</td></tr>
                ) : units.map(unit => (
                  <tr key={unit.unit_id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-[11px]" style={{ color: theme.textSecondary }}>#{unit.unit_id}</td>
                    <td className="p-3 font-bold" style={{ color: theme.textPrimary }}>{unit.unit_name}</td>
                    <td className="p-3">
                      {unit.is_school
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">School</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">Management</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {unit.is_pyp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">PYP</span>}
                        {unit.is_myp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">MYP</span>}
                        {unit.is_dp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]">DP</span>}
                        {!unit.is_pyp && !unit.is_myp && !unit.is_dp && <span className="text-[10px] text-neutral-400 font-mono">-</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <Button size="sm" onClick={() => handleEdit(unit)} className="text-xs px-3 py-1 font-semibold" style={{ background: theme.textPrimary, color: theme.pageBg, border: 'none' }}>Edit</Button>
                      <Button size="sm" onClick={() => handleDelete(unit)} className="text-xs px-3 py-1 font-semibold bg-[#FDEBEC] text-[#9F2F2D] border border-[#F8C9CC] hover:bg-red-100">Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Report Settings */}
      <Card className="mt-6" style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardHeader className="p-4 border-b" style={{ borderColor: theme.border }}>
          <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: theme.textPrimary }}>Report Settings</CardTitle>
          <p className="text-xs" style={{ color: theme.textSecondary }}>Report card configuration per unit per academic year</p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Unit & Year selector */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Unit</Label>
              <select value={rsUnitId} onChange={handleRsUnitChange} className={selectClass} style={selectStyle}>
                <option value="">-- Select Unit --</option>
                {units.filter(u => u.is_school).map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Academic Year</Label>
              <select value={rsYearId} onChange={handleRsYearChange} className={selectClass} style={selectStyle}>
                <option value="">-- Select Academic Year --</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
            </div>
          </div>

          {rsUnitId && rsYearId && (
            rsLoading ? (
              <div className="text-xs py-4 text-center" style={{ color: theme.textSecondary }}>Loading settings...</div>
            ) : (
              <div className="space-y-6 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                {!rsExistingId && (
                  <p className="text-xs rounded px-3 py-2" style={{ color: theme.blueText, background: theme.blueBg, border: `1px solid ${theme.border}` }}>
                    No report configuration found for this combination. Fill in the details below and save to create a record.
                  </p>
                )}

                {/* ── General Info ── */}
                <div className="space-y-3">
                  <p className={sectionLabel} style={{ color: theme.textSecondary }}>
                    <span className="w-5 h-0.5 inline-block" style={{ background: theme.border }} />
                    Principal Information
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Principal Full Name</Label>
                      <Input value={rsData.principal_name}
                        onChange={e => setRsData(p => ({ ...p, principal_name: e.target.value }))}
                        placeholder="e.g. Edwin Arlianto" className="text-xs mt-1"
                        style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }} />
                    </div>
                    <div className="flex-1">
                      <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Principal Title</Label>
                      <Input value={rsData.principal_title}
                        onChange={e => setRsData(p => ({ ...p, principal_title: e.target.value }))}
                        placeholder="e.g. HS Principal" className="text-xs mt-1"
                        style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }} />
                    </div>
                  </div>
                </div>

                {/* ── Semester 1 ── */}
                <div className="space-y-3 rounded-lg p-4 border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                  <p className={sectionLabel} style={{ color: theme.textSecondary }}>
                    <span className="text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: '#1F6C9F' }}>S1</span>
                    Semester 1
                  </p>
                  <div>
                    <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Semester 1 Report Date <span className="font-normal text-[11px]" style={{ color: theme.textSecondary }}>("Prepared on")</span></Label>
                    <Input type="date" value={rsData.report_date_s1}
                      onChange={e => setRsData(p => ({ ...p, report_date_s1: e.target.value }))}
                      className="mt-1 text-xs w-full sm:w-48"
                      style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }} />
                  </div>
                  <div>
                    <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Semester 1 Opening Greeting</Label>
                    <p className="text-[11px] mb-1" style={{ color: theme.textSecondary }}>Use <code className="px-1 rounded font-mono text-[10px]" style={{ background: theme.cardBg, color: theme.textPrimary }}>{'{semester}'}</code> for automatic semester name replacement.</p>
                    <textarea
                      value={rsData.report_greeting_s1}
                      onChange={e => setRsData(p => ({ ...p, report_greeting_s1: e.target.value }))}
                      rows={4}
                      placeholder="Enter opening remarks for Semester 1..."
                      className="w-full rounded-md px-3 py-2 text-xs focus:outline-none resize-y"
                      style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                    />
                    <p className="text-[11px] mt-1 font-mono" style={{ color: theme.textSecondary }}>{rsData.report_greeting_s1.length} characters</p>
                  </div>
                </div>

                {/* ── Semester 2 ── */}
                <div className="space-y-3 rounded-lg p-4 border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                  <p className={sectionLabel} style={{ color: theme.textSecondary }}>
                    <span className="text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: '#956400' }}>S2</span>
                    Semester 2
                  </p>
                  <div>
                    <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Semester 2 Report Date <span className="font-normal text-[11px]" style={{ color: theme.textSecondary }}>("Prepared on")</span></Label>
                    <Input type="date" value={rsData.report_date_s2}
                      onChange={e => setRsData(p => ({ ...p, report_date_s2: e.target.value }))}
                      className="mt-1 text-xs w-full sm:w-48"
                      style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }} />
                    <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>Leave blank to use automatic print date.</p>
                  </div>
                  <div>
                    <Label style={{ color: theme.textPrimary }} className="text-xs font-semibold block mb-1">Semester 2 Opening Greeting</Label>
                    <p className="text-[11px] mb-1" style={{ color: theme.textSecondary }}>Leave blank to inherit Semester 1 greeting.</p>
                    <textarea
                      value={rsData.report_greeting_s2}
                      onChange={e => setRsData(p => ({ ...p, report_greeting_s2: e.target.value }))}
                      rows={4}
                      placeholder="Enter opening remarks for Semester 2 (optional)..."
                      className="w-full rounded-md px-3 py-2 text-xs focus:outline-none resize-y"
                      style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                    />
                    <p className="text-[11px] mt-1 font-mono" style={{ color: theme.textSecondary }}>{rsData.report_greeting_s2.length} characters</p>
                  </div>
                </div>

                {/* ── Signatures ── */}
                <div className="space-y-4">
                  <p className={sectionLabel} style={{ color: theme.textSecondary }}>
                    <span className="w-5 h-0.5 inline-block" style={{ background: theme.border }} />
                    Signature &amp; School Stamp
                  </p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>Image file (PNG/JPG, transparent background recommended). Rendered on Semester 2 Progression Report.</p>

                  {/* Principal Signature */}
                  <ImageCropUploader
                    label="Principal Signature"
                    previewUrl={rsData.signature_principal_url}
                    uploading={uploadingSignature}
                    inputRef={signatureInputRef}
                    onCropped={(blob) => uploadFile(blob, 'signature_principal', setUploadingSignature, 'signature_principal_url')}
                    onRemove={() => setRsData(p => ({ ...p, signature_principal_url: '' }))}
                  />

                  {/* School Stamp */}
                  <ImageCropUploader
                    label="School Stamp / Seal"
                    previewUrl={rsData.stamp_url}
                    uploading={uploadingStamp}
                    inputRef={stampInputRef}
                    onCropped={(blob) => uploadFile(blob, 'stamp', setUploadingStamp, 'stamp_url')}
                    onRemove={() => setRsData(p => ({ ...p, stamp_url: '' }))}
                  />
                </div>

                <div className="flex justify-end pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <Button onClick={handleSaveReportSettings} disabled={rsSaving} className="text-xs font-bold px-4 py-2" style={{ background: theme.textPrimary, color: theme.pageBg, border: 'none' }}>
                    {rsSaving ? 'Saving...' : (rsExistingId ? 'Update Report Settings' : 'Save Report Settings')}
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <NotificationModal isOpen={notification.isOpen} onClose={closeNotification}
        title={notification.title} message={notification.message} type={notification.type} />
    </div>
  );
}
