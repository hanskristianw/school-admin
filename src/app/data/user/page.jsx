'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    user_nama_depan: '',
    user_nama_belakang: '',
    user_username: '',
    user_password: '',
    user_role_id: '',
    user_unit_id: '',
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

  // Filter states
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    unit: ''
  });

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState([]);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
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

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Process error message to be more user-friendly
  const processErrorMessage = (errorMessage) => {
    if (!errorMessage) return 'Terjadi kesalahan yang tidak diketahui';
    
    const message = errorMessage.toLowerCase();
    
    // Handle duplicate username error
    if (message.includes('duplicate key value violates unique constraint') && 
        message.includes('users_user_username_key')) {
      return 'Username sudah digunakan oleh user lain. Silakan gunakan username yang berbeda.';
    }
    
    // Handle other duplicate constraints
    if (message.includes('duplicate key value violates unique constraint')) {
      return 'Data yang dimasukkan sudah ada dalam sistem. Silakan periksa kembali.';
    }
    
    // Handle invalid JSON responses
    if (message.includes('invalid json') || message.includes('unexpected token')) {
      return 'Server mengembalikan response yang tidak valid. Silakan coba lagi atau hubungi administrator.';
    }
    
    // Handle role-related errors
    if (message.includes('role') && (message.includes('not found') || message.includes('invalid'))) {
      return 'Role yang dipilih tidak valid. Silakan pilih role yang tersedia.';
    }
    
    // Handle admin restriction errors
    if (message.includes('cannot') && message.includes('admin') && message.includes('last')) {
      return 'Tidak dapat mengubah role atau menonaktifkan admin terakhir yang aktif.';
    }
    
    // Handle password validation errors
    if (message.includes('password must be at least')) {
      return 'Password minimal harus 6 karakter.';
    }
    
    // Handle required field errors
    if (message.includes('all fields are required')) {
      return 'Semua field wajib diisi.';
    }
    
    // Handle last admin error
    if (message.includes('tidak dapat mengubah role atau menonaktifkan admin terakhir')) {
      return 'Tidak dapat mengubah role atau menonaktifkan admin terakhir yang aktif.';
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

  // Filter users based on selected filters
  const getFilteredUsers = () => {
    return users.filter(user => {
      const roleMatch = !filters.role || user.role_name === filters.role;
      const statusMatch = !filters.status || 
        (filters.status === 'active' && user.is_active) ||
        (filters.status === 'inactive' && !user.is_active);
      const unitMatch = !filters.unit || user.unit_name === filters.unit;
      
      return roleMatch && statusMatch && unitMatch;
    });
  };

  // Get unique roles from users for filter dropdown
  const getUniqueRoles = () => {
    const roleSet = new Set(users.map(user => user.role_name));
    return Array.from(roleSet).sort();
  };

  // Get unique units from users for filter dropdown
  const getUniqueUnits = () => {
    const unitSet = new Set(users.map(user => user.unit_name).filter(Boolean));
    return Array.from(unitSet).sort();
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      role: '',
      status: '',
      unit: ''
    });
  };

  // Parse CSV content
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Try to detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
      
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().replace(/ /g, '_');
          row[normalizedHeader] = values[index] || ''; // Ensure we have a value
        });
        data.push(row);
      }
    }
    
    return data;
  };

  // Validate import data
  const validateImportData = (data) => {
    const errors = [];
    const validData = [];

    data.forEach((row, index) => {
      const rowErrors = [];
      const validRow = {
        user_nama_depan: '',
        user_nama_belakang: '',
        user_username: '',
        user_password: '',
        user_role_id: '',
        user_unit_id: '',
        is_active: true
      };

      // Validate required fields
      if (!row.nama_depan && !row.user_nama_depan && !row.first_name) {
        rowErrors.push('Nama depan is required');
      } else {
        validRow.user_nama_depan = (row.nama_depan || row.user_nama_depan || row.first_name || '').trim();
      }

      if (!row.nama_belakang && !row.user_nama_belakang && !row.last_name) {
        rowErrors.push('Nama belakang is required');
      } else {
        validRow.user_nama_belakang = (row.nama_belakang || row.user_nama_belakang || row.last_name || '').trim();
      }

      if (!row.username && !row.user_username) {
        rowErrors.push('Username is required');
      } else {
        validRow.user_username = (row.username || row.user_username || '').trim();
      }

      if (!row.password && !row.user_password) {
        rowErrors.push('Password is required');
      } else {
        const password = (row.password || row.user_password || '').trim();
        if (password.length < 6) {
          rowErrors.push('Password must be at least 6 characters');
        } else {
          validRow.user_password = password;
        }
      }

      // Find role ID by role name
      const roleName = (row.role || row.role_name || row.user_role || '').trim();
      if (!roleName) {
        rowErrors.push('Role is required');
      } else {
        const role = roles.find(r => r.role_name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          rowErrors.push(`Role "${roleName}" not found. Available roles: ${roles.map(r => r.role_name).join(', ')}`);
        } else {
          validRow.user_role_id = role.role_id;
        }
      }

      // Find unit ID by unit name
      const unitName = (row.unit || row.unit_name || row.user_unit || '').trim();
      if (unitName) {
        const unit = units.find(u => u.unit_name.toLowerCase() === unitName.toLowerCase());
        if (!unit) {
          rowErrors.push(`Unit "${unitName}" not found. Available units: ${units.map(u => u.unit_name).join(', ')}`);
        } else {
          validRow.user_unit_id = unit.unit_id;
        }
      } else {
        // Unit is optional, set to null if not provided
        validRow.user_unit_id = null;
      }

      // Handle status
      const status = (row.status || row.is_active || row.active || '').trim().toLowerCase();
      if (status) {
        validRow.is_active = status === 'true' || status === 'active' || status === '1';
      }

      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors, data: row });
      } else {
        validData.push(validRow);
      }
    });

    return { validData, errors };
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      let parsedData = [];

      if (file.name.endsWith('.csv')) {
        parsedData = parseCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For Excel files, we'd need a library like xlsx
        // For now, show an error message
        setImportErrors([{ row: 1, errors: ['Excel files not supported yet. Please use CSV format.'], data: {} }]);
        return;
      }

      setImportData(parsedData);
      const { validData, errors } = validateImportData(parsedData);
      setImportPreview(validData);
      setImportErrors(errors);
    };

    reader.readAsText(file);
  };

  // Process bulk import
  const processBulkImport = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const userData of importPreview) {
      try {
        // Ensure all required fields are strings and not empty
        const cleanedUserData = {
          user_nama_depan: String(userData.user_nama_depan || '').trim(),
          user_nama_belakang: String(userData.user_nama_belakang || '').trim(),
          user_username: String(userData.user_username || '').trim(),
          user_password: String(userData.user_password || '').trim(),
          user_role_id: Number(userData.user_role_id),
          user_unit_id: userData.user_unit_id ? Number(userData.user_unit_id) : null,
          is_active: Boolean(userData.is_active)
        };

        // Additional validation before sending
        if (!cleanedUserData.user_nama_depan || !cleanedUserData.user_nama_belakang || 
            !cleanedUserData.user_username || !cleanedUserData.user_password || 
            !cleanedUserData.user_role_id) {
          throw new Error('Missing required fields after cleaning');
        }

        const response = await fetch('http://localhost:8080/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanedUserData),
        });

        const responseText = await response.text();
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
        
        if (response.ok && data.status === 'success') {
          results.success++;
        } else {
          results.failed++;
          let errorMsg = data.message || data.error || `HTTP ${response.status}`;
          
          // Process error message to be more user-friendly
          errorMsg = processErrorMessage(errorMsg);
          
          results.errors.push({
            username: cleanedUserData.user_username,
            error: errorMsg
          });
        }
      } catch (err) {
        results.failed++;
        let errorMsg = err.message;
        
        // Process error message to be more user-friendly
        errorMsg = processErrorMessage(errorMsg);
        
        results.errors.push({
          username: userData.user_username || 'Unknown',
          error: errorMsg
        });
      }
    }

    setIsImporting(false);
    
    // Show results
    let message = `Import completed! ${results.success} users imported successfully.`;
    if (results.failed > 0) {
      message += ` ${results.failed} failed.`;
      if (results.errors.length > 0) {
        message += `\n\nErrors:\n${results.errors.map(e => `${e.username}: ${e.error}`).join('\n')}`;
      }
    }
    
    showNotification(
      results.failed > 0 ? 'Import Completed with Errors' : 'Import Successful!',
      message,
      results.failed > 0 ? 'warning' : 'success'
    );

    if (results.success > 0) {
      await fetchUsers(); // Refresh the list
    }

    // Reset import state
    resetImportModal();
  };

  // Reset import modal
  const resetImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportData([]);
    setImportPreview([]);
    setImportErrors([]);
    setIsImporting(false);
  };

  // Download CSV template
  const downloadTemplate = (withSemicolon = false) => {
    const delimiter = withSemicolon ? ';' : ',';
    
    // Get available roles and units for template
    const availableRoles = roles.length > 0 ? roles.map(r => r.role_name) : ['Admin', 'User'];
    const availableUnits = units.length > 0 ? units.map(u => u.unit_name) : ['PYP', 'MYP'];
    const sampleRole1 = availableRoles[0] || 'Admin';
    const sampleRole2 = availableRoles.length > 1 ? availableRoles[1] : availableRoles[0] || 'User';
    const sampleUnit1 = availableUnits[0] || 'PYP';
    const sampleUnit2 = availableUnits.length > 1 ? availableUnits[1] : availableUnits[0] || 'MYP';
    
    const csvContent = `nama_depan${delimiter}nama_belakang${delimiter}username${delimiter}password${delimiter}role${delimiter}unit${delimiter}status\nJohn${delimiter}Doe${delimiter}johndoe${delimiter}password123${delimiter}${sampleRole1}${delimiter}${sampleUnit1}${delimiter}active\nJane${delimiter}Smith${delimiter}janesmith${delimiter}password456${delimiter}${sampleRole2}${delimiter}${sampleUnit2}${delimiter}active`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_import_template_${withSemicolon ? 'semicolon' : 'comma'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/users');
      const data = await response.json();
      
      if (data.status === 'success') {
        setUsers(data.users || []);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      setError('Error connecting to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('http://localhost:8080/roles');
      const data = await response.json();
      
      if (data.status === 'success') {
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await fetch('http://localhost:8080/units');
      const data = await response.json();
      
      if (data.status === 'success') {
        setUnits(data.units || []);
      }
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.user_nama_depan.trim()) {
      errors.user_nama_depan = 'Nama depan wajib diisi';
    }
    
    if (!formData.user_nama_belakang.trim()) {
      errors.user_nama_belakang = 'Nama belakang wajib diisi';
    }
    
    if (!formData.user_username.trim()) {
      errors.user_username = 'Username wajib diisi';
    } else if (formData.user_username.length < 3) {
      errors.user_username = 'Username minimal 3 karakter';
    }
    
    if (!editingUser && !formData.user_password.trim()) {
      errors.user_password = 'Password wajib diisi';
    } else if (formData.user_password && formData.user_password.length < 6) {
      errors.user_password = 'Password minimal 6 karakter';
    }
    
    if (!formData.user_role_id) {
      errors.user_role_id = 'Role wajib dipilih';
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
      const url = editingUser 
        ? `http://localhost:8080/users/${editingUser.user_id}`
        : 'http://localhost:8080/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const submitData = { ...formData };
      if (editingUser && !submitData.user_password) {
        delete submitData.user_password; // Don't send empty password for updates
      }

      // Ensure role_id is a number
      if (submitData.user_role_id) {
        submitData.user_role_id = Number(submitData.user_role_id);
      }

      // Ensure unit_id is a number or null
      if (submitData.user_unit_id) {
        submitData.user_unit_id = Number(submitData.user_unit_id);
      } else {
        submitData.user_unit_id = null;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // If response is not JSON, treat the text as the error message
        const friendlyErrorMessage = processErrorMessage(responseText);
        setError(friendlyErrorMessage);
        return;
      }
      
      if (response.ok && data.status === 'success') {
        await fetchUsers(); // Refresh the list
        resetForm();
        setError('');
        showNotification(
          'Berhasil!',
          editingUser ? 'Data user berhasil diupdate!' : 'User baru berhasil ditambahkan!',
          'success'
        );
      } else {
        // Handle error response - bisa dari status !== 'success' atau HTTP error status
        const rawErrorMessage = data.message || data.error || `Server error: ${response.status} ${response.statusText}`;
        const friendlyErrorMessage = processErrorMessage(rawErrorMessage);
        setError(friendlyErrorMessage);
      }
    } catch (err) {
      const friendlyErrorMessage = processErrorMessage(err.message);
      setError('Error: ' + friendlyErrorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      user_nama_depan: user.user_nama_depan,
      user_nama_belakang: user.user_nama_belakang,
      user_username: user.user_username,
      user_password: '', // Don't fill password for editing
      user_role_id: user.user_role_id,
      user_unit_id: user.user_unit_id || '',
      is_active: user.is_active
    });
    setShowForm(true);
    setFormErrors({});
  };



  const resetForm = () => {
    setFormData({
      user_nama_depan: '',
      user_nama_belakang: '',
      user_username: '',
      user_password: '',
      user_role_id: '',
      user_unit_id: '',
      is_active: true
    });
    setEditingUser(null);
    setShowForm(false);
    setFormErrors({});
    setError(''); // Clear error when closing modal
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="p-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add New User
          </Button>
          <Button 
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Import Users
          </Button>
          <div className="flex gap-1">
            <Button 
              onClick={() => downloadTemplate(false)}
              variant="outline"
              className="border-gray-300 text-xs px-2 py-1 h-auto"
              title="Download CSV template with comma separator"
            >
              Template (,)
            </Button>
            <Button 
              onClick={() => downloadTemplate(true)}
              variant="outline"
              className="border-gray-300 text-xs px-2 py-1 h-auto"
              title="Download CSV template with semicolon separator"
            >
              Template (;)
            </Button>
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="md"
      >
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="user_nama_depan">Nama Depan *</Label>
              <Input
                id="user_nama_depan"
                name="user_nama_depan"
                value={formData.user_nama_depan}
                onChange={handleInputChange}
                className={formErrors.user_nama_depan ? 'border-red-500' : ''}
                disabled={submitting}
              />
              {formErrors.user_nama_depan && (
                <p className="text-red-500 text-sm mt-1">{formErrors.user_nama_depan}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_nama_belakang">Nama Belakang *</Label>
              <Input
                id="user_nama_belakang"
                name="user_nama_belakang"
                value={formData.user_nama_belakang}
                onChange={handleInputChange}
                className={formErrors.user_nama_belakang ? 'border-red-500' : ''}
                disabled={submitting}
              />
              {formErrors.user_nama_belakang && (
                <p className="text-red-500 text-sm mt-1">{formErrors.user_nama_belakang}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_username">Username *</Label>
              <Input
                id="user_username"
                name="user_username"
                value={formData.user_username}
                onChange={handleInputChange}
                className={formErrors.user_username ? 'border-red-500' : ''}
                disabled={submitting}
              />
              {formErrors.user_username && (
                <p className="text-red-500 text-sm mt-1">{formErrors.user_username}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_password">
                Password {editingUser ? '(kosongkan jika tidak ingin mengubah)' : '*'}
              </Label>
              <Input
                id="user_password"
                name="user_password"
                type="password"
                value={formData.user_password}
                onChange={handleInputChange}
                className={formErrors.user_password ? 'border-red-500' : ''}
                disabled={submitting}
              />
              {formErrors.user_password && (
                <p className="text-red-500 text-sm mt-1">{formErrors.user_password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_role_id">Role *</Label>
              <select
                id="user_role_id"
                name="user_role_id"
                value={formData.user_role_id}
                onChange={handleInputChange}
                disabled={submitting}
                className={`w-full px-3 py-2 border rounded-md ${formErrors.user_role_id ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Pilih Role</option>
                {roles.map(role => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name} {role.is_admin ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
              {formErrors.user_role_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.user_role_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_unit_id">Unit</Label>
              <select
                id="user_unit_id"
                name="user_unit_id"
                value={formData.user_unit_id}
                onChange={handleInputChange}
                disabled={submitting}
                className={`w-full px-3 py-2 border rounded-md ${formErrors.user_unit_id ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Pilih Unit (Opsional)</option>
                {units.map(unit => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_name}
                  </option>
                ))}
              </select>
              {formErrors.user_unit_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.user_unit_id}</p>
              )}
            </div>

            {editingUser && (
              <div className="flex items-center space-x-2 md:col-span-2">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : (editingUser ? 'Update User' : 'Create User')}
            </Button>
            <Button 
              type="button" 
              onClick={resetForm} 
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Users Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={resetImportModal}
        title="Import Users from CSV"
        size="lg"
      >
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="csv-file" className="text-sm font-medium">
              Select CSV File
            </Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: CSV (.csv) with comma (,) or semicolon (;) separators. Excel files (.xlsx, .xls) coming soon.
            </p>
          </div>

          {/* Template Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-800 mb-2">CSV Format Required:</h4>
            <p className="text-sm text-blue-700 mb-2">
              Your CSV should have these columns (case-insensitive). Use comma (,) or semicolon (;) as separator:
            </p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• <strong>nama_depan</strong> or <strong>first_name</strong> (required)</li>
              <li>• <strong>nama_belakang</strong> or <strong>last_name</strong> (required)</li>
              <li>• <strong>username</strong> (required, must be unique)</li>
              <li>• <strong>password</strong> (required, min 6 characters)</li>
              <li>• <strong>role</strong> (required, available: {roles.map(r => r.role_name).join(', ') || 'Loading...'})</li>
              <li>• <strong>unit</strong> (optional, available: {units.map(u => u.unit_name).join(', ') || 'Loading...'})</li>
              <li>• <strong>status</strong> (optional: active/inactive, default: active)</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button 
                onClick={() => downloadTemplate(false)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                📥 Download Template (Comma)
              </Button>
              <Button 
                onClick={() => downloadTemplate(true)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                📥 Download Template (Semicolon)
              </Button>
            </div>
          </div>

          {/* Import Errors */}
          {importErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-medium text-red-800 mb-2">
                Validation Errors ({importErrors.length} rows):
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importErrors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Preview */}
          {importPreview.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-green-800 mb-2">
                Valid Users Ready to Import ({importPreview.length}):
              </h4>
              <div className="max-h-32 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="text-left py-1">Name</th>
                      <th className="text-left py-1">Username</th>
                      <th className="text-left py-1">Role</th>
                      <th className="text-left py-1">Unit</th>
                      <th className="text-left py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 5).map((user, index) => (
                      <tr key={index} className="border-b border-green-100">
                        <td className="py-1">{user.user_nama_depan} {user.user_nama_belakang}</td>
                        <td className="py-1">{user.user_username}</td>
                        <td className="py-1">
                          {roles.find(r => r.role_id === user.user_role_id)?.role_name}
                        </td>
                        <td className="py-1">
                          {user.user_unit_id ? units.find(u => u.unit_id === user.user_unit_id)?.unit_name || '-' : '-'}
                        </td>
                        <td className="py-1">{user.is_active ? 'Active' : 'Inactive'}</td>
                      </tr>
                    ))}
                    {importPreview.length > 5 && (
                      <tr>
                        <td colSpan="5" className="py-1 text-gray-500 text-center">
                          ... and {importPreview.length - 5} more users
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button 
              onClick={processBulkImport}
              className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              disabled={importPreview.length === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${importPreview.length} Users`}
            </Button>
            <div className="flex gap-1">
              <Button 
                onClick={() => downloadTemplate(false)}
                variant="outline"
                className="text-xs px-2"
                disabled={isImporting}
                title="Download CSV template with comma separator"
              >
                Template (,)
              </Button>
              <Button 
                onClick={() => downloadTemplate(true)}
                variant="outline"
                className="text-xs px-2"
                disabled={isImporting}
                title="Download CSV template with semicolon separator"
              >
                Template (;)
              </Button>
            </div>
            <Button 
              onClick={resetImportModal}
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={isImporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Role Filter */}
              <div>
                <Label htmlFor="role-filter" className="text-sm font-medium">
                  Filter by Role
                </Label>
                <select
                  id="role-filter"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Semua Role</option>
                  {getUniqueRoles().map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Filter */}
              <div>
                <Label htmlFor="unit-filter" className="text-sm font-medium">
                  Filter by Unit
                </Label>
                <select
                  id="unit-filter"
                  value={filters.unit}
                  onChange={(e) => handleFilterChange('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Semua Unit</option>
                  {getUniqueUnits().map(unit => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <Label htmlFor="status-filter" className="text-sm font-medium">
                  Filter by Status
                </Label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Semua Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(filters.role || filters.status || filters.unit) && (
              <Button 
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Summary */}
          {(filters.role || filters.status || filters.unit) && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filters.role && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Role: {filters.role}
                  <button
                    onClick={() => handleFilterChange('role', '')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.unit && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  Unit: {filters.unit}
                  <button
                    onClick={() => handleFilterChange('unit', '')}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Status: {filters.status === 'active' ? 'Active' : 'Inactive'}
                  <button
                    onClick={() => handleFilterChange('status', '')}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users List ({filteredUsers.length} of {users.length} users)
            {(filters.role || filters.status || filters.unit) && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (filtered)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                {(filters.role || filters.status || filters.unit) ? 'No users match the selected filters' : 'No users found'}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.user_id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {user.user_nama_depan} {user.user_nama_belakang}
                      </h3>
                      <p className="text-sm text-gray-600">@{user.user_username}</p>
                    </div>
                    <span className="text-xs text-gray-500">ID: {user.user_id}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${user.is_admin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role_name}
                    </span>
                    {user.unit_name && (
                      <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                        {user.unit_name}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    <Button 
                      size="sm" 
                      onClick={() => handleEdit(user)}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Nama Lengkap</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Username</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Role</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Unit</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="border border-gray-300 px-4 py-6 text-center text-gray-500">
                      {(filters.role || filters.status || filters.unit) ? 'No users match the selected filters' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{user.user_id}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {user.user_nama_depan} {user.user_nama_belakang}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{user.user_username}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${user.is_admin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {user.role_name}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-sm text-gray-600">
                          {user.unit_name || '-'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleEdit(user)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
