'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    kelas_nama: '',
    kelas_user_id: '',
    kelas_unit_id: ''
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

  // Filter states
  const [filters, setFilters] = useState({
    unit: '',
    waliKelas: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchUsers();
    fetchUnits();
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

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch classes terlebih dahulu
      const { data: classesData, error: classesError } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama, kelas_user_id, kelas_unit_id')
        .order('kelas_id');

      if (classesError) {
        throw new Error(classesError.message);
      }

      // Fetch users untuk mendapatkan nama user
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang');

      if (usersError) {
        throw new Error(usersError.message);
      }

      // Fetch units untuk mendapatkan nama unit
      const { data: unitsData, error: unitsError } = await supabase
        .from('unit')
        .select('unit_id, unit_name');

      if (unitsError) {
        throw new Error(unitsError.message);
      }

      // Transform data dengan menggabungkan informasi dari ketiga tabel
      const transformedData = classesData.map(kelas => {
        const user = usersData.find(u => u.user_id === kelas.kelas_user_id);
        const unit = unitsData.find(u => u.unit_id === kelas.kelas_unit_id);
        
        return {
          kelas_id: kelas.kelas_id,
          kelas_nama: kelas.kelas_nama,
          kelas_user_id: kelas.kelas_user_id,
          kelas_unit_id: kelas.kelas_unit_id,
          user_nama_depan: user?.user_nama_depan || '',
          user_nama_belakang: user?.user_nama_belakang || '',
          unit_name: unit?.unit_name || ''
        };
      });

      console.log('Fetched classes from Supabase:', transformedData);
      setClasses(transformedData);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Error fetching classes: ' + err.message);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch users terlebih dahulu
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_username, user_role_id')
        .eq('is_active', true)
        .order('user_nama_depan');

      if (usersError) {
        throw new Error(usersError.message);
      }

      // Fetch roles untuk mendapatkan nama role
      const { data: rolesData, error: rolesError } = await supabase
        .from('role')
        .select('role_id, role_name');

      if (rolesError) {
        throw new Error(rolesError.message);
      }

      // Transform data dengan menggabungkan informasi role
      const usersWithRoles = usersData.map(user => {
        const role = rolesData.find(r => r.role_id === user.user_role_id);
        
        return {
          ...user,
          role_name: role?.role_name || 'Unknown Role'
        };
      });

      setUsers(usersWithRoles || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      // Menggunakan Supabase untuk fetch units
      const { data, error } = await supabase
        .from('unit')
        .select('unit_id, unit_name')
        .order('unit_name');

      if (error) {
        throw new Error(error.message);
      }

      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const processErrorMessage = (errorMessage) => {
    const message = errorMessage?.toLowerCase() || '';
    
    // Handle duplicate class name
    if (message.includes('duplicate key value violates unique constraint') && 
        message.includes('kelas_nama')) {
      return 'Nama kelas sudah digunakan. Silakan gunakan nama yang berbeda.';
    }
    
    // Handle foreign key constraint
    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      return 'Data yang dipilih tidak valid. Pastikan wali kelas dan unit sudah benar.';
    }
    
    // Handle required fields
    if (message.includes('all fields are required') || message.includes('cannot be null')) {
      return 'Semua field wajib diisi.';
    }
    
    // Handle connection errors
    if (message.includes('connection') || message.includes('network')) {
      return 'Koneksi ke server bermasalah. Silakan coba lagi.';
    }
    
    // Handle server errors
    if (message.includes('server error') || message.includes('internal server error')) {
      return 'Terjadi kesalahan di server. Silakan coba lagi atau hubungi administrator.';
    }
    
    // Return original message if no specific pattern matches
    return errorMessage;
  };

  // Filter classes based on selected filters
  const getFilteredClasses = () => {
    return classes.filter(kelas => {
      const unitMatch = !filters.unit || kelas.unit_name === filters.unit;
      const waliKelasMatch = !filters.waliKelas || 
        `${kelas.user_nama_depan} ${kelas.user_nama_belakang}`.toLowerCase().includes(filters.waliKelas.toLowerCase());
      
      return unitMatch && waliKelasMatch;
    });
  };

  // Get unique units from classes for filter dropdown
  const getUniqueUnits = () => {
    const unitSet = new Set(classes.map(kelas => kelas.unit_name).filter(Boolean));
    return Array.from(unitSet).sort();
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.kelas_nama.trim()) {
      errors.kelas_nama = 'Nama kelas wajib diisi';
    } else if (formData.kelas_nama.length < 2) {
      errors.kelas_nama = 'Nama kelas minimal 2 karakter';
    }
    
    if (!formData.kelas_user_id) {
      errors.kelas_user_id = 'Wali kelas wajib dipilih';
    }
    
    if (!formData.kelas_unit_id) {
      errors.kelas_unit_id = 'Unit wajib dipilih';
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
        kelas_nama: formData.kelas_nama.trim(),
        kelas_user_id: Number(formData.kelas_user_id),
        kelas_unit_id: Number(formData.kelas_unit_id)
      };

      let result;

      if (editingClass) {
        // Update existing class
        result = await supabase
          .from('kelas')
          .update(submitData)
          .eq('kelas_id', editingClass.kelas_id);
      } else {
        // Create new class
        result = await supabase
          .from('kelas')
          .insert([submitData]);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Success
      await fetchClasses();
      setShowForm(false);
      setEditingClass(null);
      setFormData({
        kelas_nama: '',
        kelas_user_id: '',
        kelas_unit_id: ''
      });
      setError('');
      showNotification(
        'Berhasil!',
        editingClass ? 'Data kelas berhasil diupdate!' : 'Kelas baru berhasil ditambahkan!',
        'success'
      );
    } catch (err) {
      const friendlyErrorMessage = processErrorMessage(err.message);
      setError('Error: ' + friendlyErrorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (kelas) => {
    setEditingClass(kelas);
    setFormData({
      kelas_nama: kelas.kelas_nama,
      kelas_user_id: kelas.kelas_user_id,
      kelas_unit_id: kelas.kelas_unit_id
    });
    setShowForm(true);
    setFormErrors({});
    setError('');
  };

  const handleDelete = async (kelas) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kelas "${kelas.kelas_nama}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('kelas')
        .delete()
        .eq('kelas_id', kelas.kelas_id);

      if (error) {
        throw new Error(error.message);
      }

      await fetchClasses();
      showNotification(
        'Berhasil!',
        'Kelas berhasil dihapus!',
        'success'
      );
    } catch (err) {
      const friendlyErrorMessage = processErrorMessage(err.message);
      showNotification(
        'Error!',
        friendlyErrorMessage,
        'error'
      );
    }
  };

  const handleAddNew = () => {
    setEditingClass(null);
    setFormData({
      kelas_nama: '',
      kelas_user_id: '',
      kelas_unit_id: ''
    });
    setShowForm(true);
    setFormErrors({});
    setError('');
  };

  const filteredClasses = getFilteredClasses();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manajemen Kelas</h1>
        <Button onClick={handleAddNew}>
          + Tambah Kelas
        </Button>
      </div>

      {/* Filter Section */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Kelas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-unit">Filter by Unit</Label>
                <select
                  id="filter-unit"
                  value={filters.unit}
                  onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Semua Unit</option>
                  {getUniqueUnits().map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="filter-wali-kelas">Filter by Wali Kelas</Label>
                <Input
                  id="filter-wali-kelas"
                  placeholder="Cari nama wali kelas..."
                  value={filters.waliKelas}
                  onChange={(e) => setFilters(prev => ({ ...prev, waliKelas: e.target.value }))}
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.unit || filters.waliKelas) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Filter aktif:</span>
                {filters.unit && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Unit: {filters.unit}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, unit: '' }))}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.waliKelas && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Wali Kelas: {filters.waliKelas}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, waliKelas: '' }))}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setFilters({ unit: undefined, waliKelas: '' })}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Daftar Kelas 
            {filteredClasses.length !== classes.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredClasses.length} of {classes.length} kelas)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {classes.length === 0 
                ? "Belum ada kelas. Tambahkan kelas pertama Anda!"
                : "Tidak ada kelas yang sesuai dengan filter yang dipilih."
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Kelas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wali Kelas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClasses.map((kelas) => (
                    <tr key={kelas.kelas_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {kelas.kelas_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {kelas.kelas_nama}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {kelas.user_nama_depan} {kelas.user_nama_belakang}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {kelas.unit_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(kelas)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(kelas)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold mb-4">
            {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="kelas_nama">Nama Kelas *</Label>
              <Input
                id="kelas_nama"
                type="text"
                placeholder="Masukkan nama kelas"
                value={formData.kelas_nama}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_nama: e.target.value }))}
                className={formErrors.kelas_nama ? 'border-red-500' : ''}
              />
              {formErrors.kelas_nama && (
                <p className="text-red-500 text-sm mt-1">{formErrors.kelas_nama}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kelas_user_id">Wali Kelas *</Label>
              <select
                id="kelas_user_id"
                value={formData.kelas_user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_user_id: e.target.value }))}
                className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  formErrors.kelas_user_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Pilih Wali Kelas</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_nama_depan} {user.user_nama_belakang} ({user.role_name})
                  </option>
                ))}
              </select>
              {formErrors.kelas_user_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.kelas_user_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kelas_unit_id">Unit *</Label>
              <select
                id="kelas_unit_id"
                value={formData.kelas_unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_unit_id: e.target.value }))}
                className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  formErrors.kelas_unit_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Pilih Unit</option>
                {units.map((unit) => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_name}
                  </option>
                ))}
              </select>
              {formErrors.kelas_unit_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.kelas_unit_id}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
            >
              {submitting ? 'Menyimpan...' : (editingClass ? 'Update Kelas' : 'Tambah Kelas')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
