'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_user_id: '',
    subject_unit_id: ''
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
    teacher: ''
  });

  useEffect(() => {
    fetchSubjects();
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

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Menggunakan Supabase langsung tanpa Go API
      const { data, error } = await supabase
        .from('subject')
        .select(`
          subject_id,
          subject_name,
          subject_user_id,
          subject_unit_id,
          users:subject_user_id (
            user_nama_depan,
            user_nama_belakang
          ),
          unit:subject_unit_id (
            unit_name
          )
        `)
        .order('subject_id');

      if (error) {
        throw new Error(error.message);
      }

      // Transform data untuk kompatibilitas dengan UI yang ada
      const transformedData = data.map(subject => ({
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        subject_user_id: subject.subject_user_id,
        subject_unit_id: subject.subject_unit_id,
        user_nama_depan: subject.users?.user_nama_depan || '',
        user_nama_belakang: subject.users?.user_nama_belakang || '',
        unit_name: subject.unit?.unit_name || ''
      }));

      console.log('Fetched subjects from Supabase:', transformedData);
      setSubjects(transformedData);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Error fetching subjects: ' + err.message);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching teacher users...');
      
      // Alternatif 1: Coba menggunakan RPC function (jika sudah dibuat)
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_teacher_users');

        if (!rpcError && rpcData && rpcData.length > 0) {
          console.log('Successfully fetched teachers using RPC:', rpcData);
          setUsers(rpcData.map(user => ({
            ...user,
            role: {
              role_name: user.role_name,
              is_teacher: user.is_teacher
            }
          })));
          return;
        }
      } catch (rpcErr) {
        console.log('RPC function not available, using manual JOIN');
      }

      // Alternatif 2: Manual JOIN menggunakan dua query terpisah
      console.log('Using manual JOIN approach...');
      
      // Query 1: Ambil semua users aktif
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_username, user_role_id')
        .eq('is_active', true)
        .order('user_nama_depan');

      if (usersError) {
        throw new Error('Error fetching users: ' + usersError.message);
      }

      // Query 2: Ambil roles yang is_teacher = true
      const { data: rolesData, error: rolesError } = await supabase
        .from('role')
        .select('role_id, role_name, is_teacher')
        .eq('is_teacher', true);

      if (rolesError) {
        throw new Error('Error fetching roles: ' + rolesError.message);
      }

      // Manual JOIN: Filter users yang role_id nya ada di rolesData
      const teacherRoleIds = rolesData.map(role => role.role_id);
      const teacherUsers = usersData.filter(user => 
        teacherRoleIds.includes(user.user_role_id)
      );

      // Tambahkan info role ke setiap teacher user
      const enrichedUsers = teacherUsers.map(user => {
        const role = rolesData.find(role => role.role_id === user.user_role_id);
        return {
          ...user,
          role: role || null
        };
      });

      console.log('Teacher roles found:', rolesData);
      console.log('Filtered teacher users:', enrichedUsers);
      
      if (enrichedUsers.length === 0) {
        console.warn('No teacher users found. Check if role.is_teacher is set correctly.');
        showNotification('Warning', 'Tidak ada teacher yang ditemukan. Pastikan role teacher sudah dikonfigurasi dengan benar.', 'warning');
      }
      
      setUsers(enrichedUsers);
    } catch (err) {
      console.error('Error fetching teacher users:', err);
      
      // Fallback: Ambil semua user aktif tanpa filter role
      try {
        console.log('Using fallback: fetching all users...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_username, user_role_id')
          .eq('is_active', true)
          .order('user_nama_depan');

        if (fallbackError) {
          throw new Error(fallbackError.message);
        }

        console.log('Fallback: Using all active users');
        setUsers(fallbackData || []);
        showNotification('Warning', 'Menggunakan semua user karena filter teacher tidak tersedia', 'warning');
      } catch (fallbackErr) {
        console.error('Error in fallback fetch users:', fallbackErr);
        setUsers([]);
        showNotification('Error', 'Gagal memuat data teacher: ' + fallbackErr.message, 'error');
      }
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
    
    // Handle duplicate subject name
    if (message.includes('duplicate key value violates unique constraint') && 
        message.includes('subject_name')) {
      return 'Nama subject sudah digunakan. Silakan gunakan nama yang berbeda.';
    }
    
    // Handle foreign key constraint
    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      return 'Data yang dipilih tidak valid. Pastikan teacher dan unit sudah benar.';
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

  // Filter subjects based on selected filters
  const getFilteredSubjects = () => {
    if (!Array.isArray(subjects)) {
      return [];
    }
    
    return subjects.filter(subject => {
      const unitMatch = !filters.unit || subject.unit_name === filters.unit;
      const teacherMatch = !filters.teacher || 
        `${subject.user_nama_depan} ${subject.user_nama_belakang}`.toLowerCase().includes(filters.teacher.toLowerCase());
      
      return unitMatch && teacherMatch;
    });
  };

  // Get unique units from subjects for filter dropdown
  const getUniqueUnits = () => {
    if (!Array.isArray(subjects)) {
      return [];
    }
    
    const unitSet = new Set(subjects.map(subject => subject.unit_name).filter(Boolean));
    return Array.from(unitSet).sort();
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.subject_name.trim()) {
      errors.subject_name = 'Nama subject wajib diisi';
    } else if (formData.subject_name.length < 2) {
      errors.subject_name = 'Nama subject minimal 2 karakter';
    }
    
    if (!formData.subject_user_id) {
      errors.subject_user_id = 'Teacher wajib dipilih';
    }
    
    if (!formData.subject_unit_id) {
      errors.subject_unit_id = 'Unit wajib dipilih';
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
        subject_name: formData.subject_name,
        subject_user_id: Number(formData.subject_user_id),
        subject_unit_id: Number(formData.subject_unit_id)
      };

      let result;
      
      if (editingSubject) {
        // Update existing subject menggunakan Supabase
        result = await supabase
          .from('subject')
          .update(submitData)
          .eq('subject_id', editingSubject.subject_id);
      } else {
        // Create new subject menggunakan Supabase
        result = await supabase
          .from('subject')
          .insert([submitData]);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Success
      await fetchSubjects();
      setShowForm(false);
      setEditingSubject(null);
      setFormData({
        subject_name: '',
        subject_user_id: '',
        subject_unit_id: ''
      });
      setError('');
      showNotification(
        'Berhasil!',
        editingSubject ? 'Data subject berhasil diupdate!' : 'Subject baru berhasil ditambahkan!',
        'success'
      );
    } catch (err) {
      const friendlyErrorMessage = processErrorMessage(err.message);
      setError('Error: ' + friendlyErrorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      subject_name: subject.subject_name,
      subject_user_id: subject.subject_user_id,
      subject_unit_id: subject.subject_unit_id
    });
    setShowForm(true);
    setFormErrors({});
    setError('');
  };

  const handleDelete = async (subject) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus subject "${subject.subject_name}"?`)) {
      return;
    }

    try {
      // Delete menggunakan Supabase
      const { error } = await supabase
        .from('subject')
        .delete()
        .eq('subject_id', subject.subject_id);

      if (error) {
        throw new Error(error.message);
      }

      await fetchSubjects();
      showNotification(
        'Berhasil!',
        'Subject berhasil dihapus!',
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
    setEditingSubject(null);
    setFormData({
      subject_name: '',
      subject_user_id: '',
      subject_unit_id: ''
    });
    setShowForm(true);
    setFormErrors({});
    setError('');
  };

  const filteredSubjects = getFilteredSubjects();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manajemen Subject</h1>
        <Button onClick={handleAddNew}>
          + Tambah Subject
        </Button>
      </div>

      {/* Filter Section */}
      {Array.isArray(subjects) && subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Subject</CardTitle>
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
                <Label htmlFor="filter-teacher">Filter by Teacher</Label>
                <Input
                  id="filter-teacher"
                  placeholder="Cari nama teacher..."
                  value={filters.teacher}
                  onChange={(e) => setFilters(prev => ({ ...prev, teacher: e.target.value }))}
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.unit || filters.teacher) && (
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
                {filters.teacher && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Teacher: {filters.teacher}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, teacher: '' }))}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setFilters({ unit: '', teacher: '' })}
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

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Daftar Subject 
            {Array.isArray(subjects) && filteredSubjects.length !== subjects.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredSubjects.length} of {subjects.length} subjects)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {!Array.isArray(subjects) || subjects.length === 0 
                ? "Belum ada subject. Tambahkan subject pertama Anda!"
                : "Tidak ada subject yang sesuai dengan filter yang dipilih."
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
                      Subject Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teacher
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
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.subject_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.subject_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subject.subject_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.user_nama_depan} {subject.user_nama_belakang}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.unit_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subject)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subject)}
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
            {editingSubject ? 'Edit Subject' : 'Tambah Subject Baru'}
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="subject_name">Subject Name *</Label>
              <Input
                id="subject_name"
                type="text"
                placeholder="Masukkan nama subject"
                value={formData.subject_name}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
                className={formErrors.subject_name ? 'border-red-500' : ''}
              />
              {formErrors.subject_name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.subject_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subject_user_id">Teacher *</Label>
              <select
                id="subject_user_id"
                value={formData.subject_user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_user_id: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  formErrors.subject_user_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Pilih Teacher</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_nama_depan} {user.user_nama_belakang} 
                    {user.role?.role_name && ` (${user.role.role_name})`}
                  </option>
                ))}
              </select>
              {formErrors.subject_user_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.subject_user_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subject_unit_id">Unit *</Label>
              <select
                id="subject_unit_id"
                value={formData.subject_unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_unit_id: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  formErrors.subject_unit_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Pilih Unit</option>
                {units.map((unit) => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_name}
                  </option>
                ))}
              </select>
              {formErrors.subject_unit_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.subject_unit_id}</p>
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
              {submitting ? 'Menyimpan...' : (editingSubject ? 'Update Subject' : 'Tambah Subject')}
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
