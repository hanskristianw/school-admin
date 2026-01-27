'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';

export default function DashboardTypeManagement() {
  const [dashboardTypes, setDashboardTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDashboardType, setEditingDashboardType] = useState(null);
  const [formData, setFormData] = useState({
    type_code: '',
    type_name: '',
    type_description: '',
    default_route: '/dashboard/',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    fetchDashboardTypes();
  }, []);

  // Show notification helper
  const showNotification = (title, message, type = 'success') => {
    setNotification({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const fetchDashboardTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dashboard_type')
        .select('*')
        .order('dashboard_type_id');

      if (error) {
        throw new Error(error.message);
      }

      console.log('Fetched dashboard types from Supabase:', data);
      setDashboardTypes(data || []);
    } catch (err) {
      console.error('Error fetching dashboard types:', err);
      setError('Error fetching dashboard types: ' + err.message);
      setDashboardTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.type_code.trim()) {
      errors.type_code = 'Kode tipe wajib diisi';
    } else if (!/^[a-z_]+$/.test(formData.type_code)) {
      errors.type_code = 'Kode tipe hanya boleh huruf kecil dan underscore';
    }

    if (!formData.type_name.trim()) {
      errors.type_name = 'Nama tipe wajib diisi';
    } else if (formData.type_name.length < 2) {
      errors.type_name = 'Nama tipe minimal 2 karakter';
    }

    if (!formData.default_route.trim()) {
      errors.default_route = 'Route default wajib diisi';
    } else if (!formData.default_route.startsWith('/dashboard/')) {
      errors.default_route = 'Route harus dimulai dengan /dashboard/';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        type_code: formData.type_code.trim().toLowerCase(),
        type_name: formData.type_name.trim(),
        type_description: formData.type_description?.trim() || null,
        default_route: formData.default_route.trim(),
        is_active: !!formData.is_active,
        updated_at: new Date().toISOString()
      };

      let result;

      if (editingDashboardType) {
        result = await supabase
          .from('dashboard_type')
          .update(submitData)
          .eq('dashboard_type_id', editingDashboardType.dashboard_type_id);
      } else {
        result = await supabase
          .from('dashboard_type')
          .insert([submitData]);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      await fetchDashboardTypes();
      resetForm();
      setError('');
      showNotification(
        'Berhasil!',
        editingDashboardType ? 'Dashboard type berhasil diupdate!' : 'Dashboard type baru berhasil ditambahkan!',
        'success'
      );
    } catch (err) {
      const errorMessage = err.message.toLowerCase();
      let friendlyMessage = 'Terjadi kesalahan: ' + err.message;
      
      if (errorMessage.includes('duplicate') && errorMessage.includes('type_code')) {
        friendlyMessage = 'Kode tipe sudah digunakan. Silakan gunakan kode yang berbeda.';
      }
      
      setError(friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dashboardType) => {
    setEditingDashboardType(dashboardType);
    setFormData({
      type_code: dashboardType.type_code,
      type_name: dashboardType.type_name,
      type_description: dashboardType.type_description || '',
      default_route: dashboardType.default_route,
      is_active: !!dashboardType.is_active
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (dashboardType) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dashboard type "${dashboardType.type_name}"?`)) {
      return;
    }

    try {
      const { data: roles, error: checkError } = await supabase
        .from('role')
        .select('role_id, role_name')
        .eq('dashboard_type_id', dashboardType.dashboard_type_id);

      if (checkError) throw new Error(checkError.message);

      if (roles && roles.length > 0) {
        const roleNames = roles.map(r => r.role_name).join(', ');
        showNotification(
          'Tidak Bisa Hapus',
          `Dashboard type digunakan oleh role: ${roleNames}`,
          'error'
        );
        return;
      }

      const { error } = await supabase
        .from('dashboard_type')
        .delete()
        .eq('dashboard_type_id', dashboardType.dashboard_type_id);

      if (error) throw new Error(error.message);

      await fetchDashboardTypes();
      showNotification('Berhasil!', 'Dashboard type berhasil dihapus!', 'success');
    } catch (err) {
      showNotification('Error!', err.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      type_code: '',
      type_name: '',
      type_description: '',
      default_route: '/dashboard/',
      is_active: true
    });
    setEditingDashboardType(null);
    setShowForm(false);
    setFormErrors({});
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Type Management</h1>
          <p className="text-sm text-gray-600 mt-1">Kelola tipe dashboard untuk berbagai peran pengguna</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          Tambah Dashboard Type
        </Button>
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editingDashboardType ? 'Edit Dashboard Type' : 'Tambah Dashboard Type'} size="sm">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="type_code">Kode Tipe *</Label>
            <Input id="type_code" name="type_code" value={formData.type_code} onChange={handleInputChange} 
              className={formErrors.type_code ? 'border-red-500' : ''} disabled={submitting || editingDashboardType}
              placeholder="student, teacher, parent" />
            {formErrors.type_code && <p className="text-red-500 text-sm mt-1">{formErrors.type_code}</p>}
            <p className="text-xs text-gray-500 mt-1">Huruf kecil & underscore. Tidak bisa diubah.</p>
          </div>
          <div>
            <Label htmlFor="type_name">Nama Tipe *</Label>
            <Input id="type_name" name="type_name" value={formData.type_name} onChange={handleInputChange}
              className={formErrors.type_name ? 'border-red-500' : ''} disabled={submitting} placeholder="Student Dashboard" />
            {formErrors.type_name && <p className="text-red-500 text-sm mt-1">{formErrors.type_name}</p>}
          </div>
          <div>
            <Label htmlFor="type_description">Deskripsi</Label>
            <textarea id="type_description" name="type_description" value={formData.type_description} onChange={handleInputChange}
              disabled={submitting} placeholder="Deskripsi singkat" rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <Label htmlFor="default_route">Route Default *</Label>
            <Input id="default_route" name="default_route" value={formData.default_route} onChange={handleInputChange}
              className={formErrors.default_route ? 'border-red-500' : ''} disabled={submitting} placeholder="/dashboard/student" />
            {formErrors.default_route && <p className="text-red-500 text-sm mt-1">{formErrors.default_route}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input id="is_active" name="is_active" type="checkbox" checked={!!formData.is_active} onChange={handleInputChange}
              disabled={submitting} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <Label htmlFor="is_active">Aktif</Label>
          </div>
          <div className="flex gap-2 pt-3">
            <Button type="submit" className="bg-green-600 hover:bg-green-700 flex-1" disabled={submitting}>
              {submitting ? 'Processing...' : (editingDashboardType ? 'Update' : 'Tambah')}
            </Button>
            <Button type="button" onClick={resetForm} variant="outline" className="flex-1" disabled={submitting}>Batal</Button>
          </div>
        </form>
      </Modal>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Memuat...</p>
          </div>
        ) : dashboardTypes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Belum ada dashboard type</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Kode</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Nama</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Deskripsi</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Route</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardTypes.map(dt => (
                  <tr key={dt.dashboard_type_id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm text-blue-600">{dt.type_code}</code>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{dt.type_name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">{dt.type_description || '-'}</td>
                    <td className="border border-gray-300 px-4 py-2"><code className="text-xs">{dt.default_route}</code></td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${dt.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {dt.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleEdit(dt)} className="bg-blue-600 hover:bg-blue-700">Edit</Button>
                        <Button size="sm" onClick={() => handleDelete(dt)} className="bg-red-600 hover:bg-red-700">Hapus</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NotificationModal isOpen={notification.isOpen} onClose={closeNotification} 
        title={notification.title} message={notification.message} type={notification.type} />
    </div>
  );
}
