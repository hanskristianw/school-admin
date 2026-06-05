'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import ImageCropModal from '@/components/ImageCropModal';
import { supabase, createSupabaseWithAuth } from '@/lib/supabase';
import ImageCropUploader from '@/components/ui/image-crop-uploader';
import { useTheme } from '@/lib/theme';


export default function UserManagement() {
  const { theme } = useTheme()
  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }

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
    user_email: '',
    user_tanggal_lahir: '',
    user_manual_picture: '',
    user_role_id: '',
    user_unit_id: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);

  // Signature state
  const [signatureBlob, setSignatureBlob] = useState(null);   // pending blob before save
  const [signaturePreview, setSignaturePreview] = useState(''); // preview URL
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const signatureInputRef = { current: null }; // will be passed to ImageCropUploader

  
  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    unit: ''
  });

  // â”€â”€ Column visibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ALL_COLUMNS = [
    { key: 'id',            label: 'ID' },
    { key: 'nama',          label: 'Nama Lengkap' },
    { key: 'email',         label: 'Email' },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
    { key: 'role',          label: 'Role' },
    { key: 'unit',          label: 'Unit' },
    { key: 'status',        label: 'Status' },
  ];
  const DEFAULT_COLUMNS = new Set(['id', 'nama', 'email', 'role', 'unit', 'status']);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('user_table_columns');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return DEFAULT_COLUMNS;
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef(null);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem('user_table_columns', JSON.stringify([...next])); } catch (e) {}
      return next;
    });
  };

  // Close column selector when clicking outside
  useEffect(() => {
    if (!showColumnSelector) return;
    const handler = (e) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(e.target)) {
        setShowColumnSelector(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColumnSelector]);

  // â”€â”€ Date helpers: DD/MM/YYYY â†” ISO YYYY-MM-DD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toDisplayDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  const toIsoDate = (ddmmyyyy) => {
    if (!ddmmyyyy) return null;
    const parts = ddmmyyyy.replace(/\s/g, '').split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!d || !m || !y || y.length !== 4) return null;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (isNaN(Date.parse(iso))) return null;
    return iso;
  };

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
      const q = (filters.search || '').toLowerCase().trim();
      const fullName = `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.toLowerCase();
      const searchMatch = !q ||
        fullName.includes(q) ||
        (user.user_email || '').toLowerCase().includes(q) ||
        (user.role_name || '').toLowerCase().includes(q);
      const roleMatch = !filters.role || user.role_name === filters.role;
      const statusMatch = !filters.status ||
        (filters.status === 'active' && user.is_active) ||
        (filters.status === 'inactive' && !user.is_active);
      const unitMatch = !filters.unit || user.unit_name === filters.unit;
      return searchMatch && roleMatch && statusMatch && unitMatch;
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
      search: '',
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
        user_email: '',
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

      // Username column dropped - skip any username from CSV

      const emailValue = (row.email || row.user_email || '').trim();
      if (emailValue) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailValue)) {
          rowErrors.push('Invalid email format');
        } else {
          validRow.user_email = emailValue;
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
          user_email: String(userData.user_email || '').trim(),
          user_role_id: Number(userData.user_role_id),
          user_unit_id: userData.user_unit_id ? Number(userData.user_unit_id) : null,
          is_active: Boolean(userData.is_active)
        };

        // Additional validation before sending
    if (!cleanedUserData.user_nama_depan || !cleanedUserData.user_nama_belakang || 
            !cleanedUserData.user_role_id) {
          throw new Error('Missing required fields after cleaning');
        }

        const result = await supabase
          .from('users')
          .insert([{ 
            user_nama_depan: cleanedUserData.user_nama_depan,
            user_nama_belakang: cleanedUserData.user_nama_belakang,
            user_email: cleanedUserData.user_email || null,
            user_role_id: cleanedUserData.user_role_id,
            user_unit_id: cleanedUserData.user_unit_id,
            is_active: cleanedUserData.is_active
          }])
          .select('user_id')
          .single();

        if (result.error) throw new Error(result.error.message);

        const createdId = result.data?.user_id;
        if (!createdId) throw new Error('Gagal membuat user');

        results.success++;
      } catch (err) {
        results.failed++;
        let errorMsg = err.message;
        
        // Process error message to be more user-friendly
        errorMsg = processErrorMessage(errorMsg);
        
        results.errors.push({
          username: userData.user_nama_depan || 'Unknown',
          email: userData.user_email || '',
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
        message += `\n\nErrors:\n${results.errors.map(e => `${e.username}${e.email ? ` (${e.email})` : ''}: ${e.error}`).join('\n')}`;
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
    
  const csvContent = `nama_depan${delimiter}nama_belakang${delimiter}email${delimiter}role${delimiter}unit${delimiter}status\nJohn${delimiter}Doe${delimiter}john@ccs.sch.id${delimiter}${sampleRole1}${delimiter}${sampleUnit1}${delimiter}active\nJane${delimiter}Smith${delimiter}jane@ccs.sch.id${delimiter}${sampleRole2}${delimiter}${sampleUnit2}${delimiter}active`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_import_template_${withSemicolon ? 'semicolon' : 'comma'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uploadImage = async (userId) => {
    if (!imageFile) return null;

    try {
      setUploadingImage(true);
      const file = imageFile;
      const ext = file.name.split('.').pop();
      const path = `user-profiles/${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('uniform-receipts')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('uniform-receipts')
        .getPublicUrl(path);

      return publicUrlData?.publicUrl || null;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCropComplete = (croppedFile) => {
    setImageFile(croppedFile);
    setTempImageSrc(null);
    setShowCropModal(false);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch users terlebih dahulu
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_profile_picture, user_manual_picture, user_role_id, user_unit_id, is_active, signature_url, user_tanggal_lahir');


      if (usersError) {
        throw new Error(usersError.message);
      }

      // Fetch roles untuk mendapatkan nama role dan info admin
      const { data: rolesData, error: rolesError } = await supabase
        .from('role')
        .select('role_id, role_name, is_admin');

      if (rolesError) {
        throw new Error(rolesError.message);
      }

      // Fetch units untuk mendapatkan nama unit
      const { data: unitsData, error: unitsError } = await supabase
        .from('unit')
        .select('unit_id, unit_name');

      if (unitsError) {
        throw new Error(unitsError.message);
      }

      // Transform data dengan menggabungkan informasi dari ketiga tabel
      const transformedData = usersData.map(user => {
        const role = rolesData.find(r => r.role_id === user.user_role_id);
        const unit = unitsData.find(u => u.unit_id === user.user_unit_id);
        
        return {
          user_id: user.user_id,
          user_nama_depan: user.user_nama_depan,
          user_nama_belakang: user.user_nama_belakang,
          user_email: user.user_email || null,
          user_profile_picture: user.user_profile_picture || null,
          user_manual_picture: user.user_manual_picture || null,
          signature_url: user.signature_url || null,
          user_role_id: user.user_role_id,
          user_unit_id: user.user_unit_id,
          user_tanggal_lahir: user.user_tanggal_lahir || null,
          role_name: role?.role_name || '',
          is_admin: role?.is_admin || false,
          unit_name: unit?.unit_name || '',
          is_active: user.is_active
        };
      });

      // Sort by role_id first, then by nama_depan
      transformedData.sort((a, b) => {
        const roleCompare = (a.user_role_id || 0) - (b.user_role_id || 0);
        if (roleCompare !== 0) return roleCompare;
        return (a.user_nama_depan || '').localeCompare(b.user_nama_depan || '');
      });

      console.log('Fetched users from Supabase:', transformedData);
      setUsers(transformedData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error fetching users: ' + err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      // Menggunakan Supabase untuk fetch roles
      const { data, error } = await supabase
        .from('role')
        .select('role_id, role_name, is_admin')
        .order('role_id');

      if (error) {
        throw new Error(error.message);
      }

      setRoles(data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
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

  const validateForm = () => {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.user_nama_depan.trim()) {
      errors.user_nama_depan = 'Nama depan wajib diisi';
    }
    
    if (!formData.user_nama_belakang.trim()) {
      errors.user_nama_belakang = 'Nama belakang wajib diisi';
    }
    
    // Username and password validation removed - using Google login only
    
    if (formData.user_email && !emailPattern.test(formData.user_email.trim())) {
      errors.user_email = 'Email tidak valid';
    }

    if (!formData.user_role_id) {
      errors.user_role_id = 'Role wajib dipilih';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Upload signature blob using Supabase storage client (auth handled automatically)
  const uploadSignature = async (userId, blob) => {
    const path = `user-signatures/${userId}/signature.png`;
    const { error: uploadError } = await supabase.storage
      .from('report-assets')
      .upload(path, blob, { contentType: 'image/png', upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage
      .from('report-assets')
      .getPublicUrl(path);
    return `${publicUrlData.publicUrl}?t=${Date.now()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
    const submitData = { ...formData };
      
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

      submitData.user_email = submitData.user_email ? submitData.user_email.trim() : '';
      if (!submitData.user_email) {
        submitData.user_email = null;
      }

      let result;
      const baseData = { ...submitData };
      // Convert tanggal_lahir DD/MM/YYYY â†’ ISO YYYY-MM-DD before saving
      if (baseData.user_tanggal_lahir) {
        baseData.user_tanggal_lahir = toIsoDate(baseData.user_tanggal_lahir) || null;
      } else {
        baseData.user_tanggal_lahir = null;
      }

      if (editingUser) {
        // Upload profile image if new file selected
        if (imageFile) {
          const imageUrl = await uploadImage(editingUser.user_id);
          if (imageUrl) baseData.user_manual_picture = imageUrl;
        }
        // Upload signature if new blob selected
        if (signatureBlob) {
          setUploadingSignature(true);
          try {
            const sigUrl = await uploadSignature(editingUser.user_id, signatureBlob);
            baseData.signature_url = sigUrl;
            setSignaturePreview(sigUrl);
          } finally { setUploadingSignature(false); }
        }
        // Update existing user
        result = await supabase.from('users').update(baseData).eq('user_id', editingUser.user_id);
        if (result.error) throw new Error(result.error.message);

      } else {
        // Create new user first to get user_id
        const insertRes = await supabase
          .from('users')
          .insert([baseData])
          .select('user_id')
          .single();
        if (insertRes.error) throw new Error(insertRes.error.message);

        // Upload image if file selected
        if (imageFile && insertRes.data) {
          const imageUrl = await uploadImage(insertRes.data.user_id);
          if (imageUrl) {
            await supabase.from('users').update({ user_manual_picture: imageUrl }).eq('user_id', insertRes.data.user_id);
          }
        }
        // Upload signature if blob selected
        if (signatureBlob && insertRes.data) {
          setUploadingSignature(true);
          try {
            const sigUrl = await uploadSignature(insertRes.data.user_id, signatureBlob);
            await supabase.from('users').update({ signature_url: sigUrl }).eq('user_id', insertRes.data.user_id);
            setSignaturePreview(sigUrl);
          } finally { setUploadingSignature(false); }
        }
      }

      // Success
      await fetchUsers(); // Refresh the list
      resetForm();
      setError('');
      showNotification('Berhasil!', editingUser ? `Data user berhasil diupdate!` : `User baru berhasil ditambahkan!`, 'success');
    } catch (err) {
      const errorMessage = processErrorMessage(err.message);
      setError('Error: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      user_nama_depan: user.user_nama_depan,
      user_nama_belakang: user.user_nama_belakang,
      user_email: user.user_email || '',
      user_tanggal_lahir: toDisplayDate(user.user_tanggal_lahir || ''),
      user_manual_picture: user.user_manual_picture || '',
      user_role_id: user.user_role_id,
      user_unit_id: user.user_unit_id || '',
      is_active: user.is_active
    });
    setImageFile(null);
    setSignatureBlob(null);
    setSignaturePreview(user.signature_url || '');
    setShowForm(true);
    setFormErrors({});
  };




  const resetForm = () => {
    setFormData({
      user_nama_depan: '',
      user_nama_belakang: '',
      user_email: '',
      user_tanggal_lahir: '',
      user_manual_picture: '',
      user_role_id: '',
      user_unit_id: '',
      is_active: true
    });
    setImageFile(null);
    setTempImageSrc(null);
    setShowCropModal(false);
    setSignatureBlob(null);
    setSignaturePreview('');
    setEditingUser(null);
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
      <div className="p-4 md:p-6" style={{ background: theme.pageBg }}>
        <div className="text-center" style={{ color: theme.textSecondary }}>Loading...</div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="p-3" style={{ background: theme.pageBg, minHeight: '100%' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: theme.textPrimary }}>User Management</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setShowForm(true)}
            className=""
            style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}
          >
            Add New User
          </Button>
          <Button 
            onClick={() => setShowImportModal(true)}
            className=""
            style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}
          >
            Import Users
          </Button>
          <div className="flex gap-1">
            <Button 
              onClick={() => downloadTemplate(false)}
              variant="outline"
              className="text-xs px-2 py-1 h-auto"
              style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
              title="Download CSV template with comma separator"
            >
              Template (,)
            </Button>
            <Button 
              onClick={() => downloadTemplate(true)}
              variant="outline"
              className="text-xs px-2 py-1 h-auto"
              style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
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
        containerStyle={{ background: theme.cardBg }}
        headerStyle={{ borderColor: theme.border }}
        titleStyle={{ color: theme.textPrimary }}
      >
        {error && (
          <div className="px-3 py-2 rounded mb-3" style={{ background: theme.redBg, border: `1px solid ${theme.redText}`, color: theme.redText }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="user_nama_depan" style={{ color: theme.textBody }}>Nama Depan *</Label>
              <Input
                id="user_nama_depan"
                name="user_nama_depan"
                value={formData.user_nama_depan}
                onChange={handleInputChange}
                style={{ ...inputStyle, ...(formErrors.user_nama_depan ? { borderColor: theme.redText } : {}) }}
                disabled={submitting}
              />
              {formErrors.user_nama_depan && (
                <p className="text-sm mt-1" style={{ color: theme.redText }}>{formErrors.user_nama_depan}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_nama_belakang" style={{ color: theme.textBody }}>Nama Belakang *</Label>
              <Input
                id="user_nama_belakang"
                name="user_nama_belakang"
                value={formData.user_nama_belakang}
                onChange={handleInputChange}
                style={{ ...inputStyle, ...(formErrors.user_nama_belakang ? { borderColor: theme.redText } : {}) }}
                disabled={submitting}
              />
              {formErrors.user_nama_belakang && (
                <p className="text-sm mt-1" style={{ color: theme.redText }}>{formErrors.user_nama_belakang}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_email" style={{ color: theme.textBody }}>Email</Label>
              <Input
                id="user_email"
                name="user_email"
                type="email"
                value={formData.user_email}
                onChange={handleInputChange}
                style={{ ...inputStyle, ...(formErrors.user_email ? { borderColor: theme.redText } : {}) }}
                disabled={submitting}
              />
              {formErrors.user_email && (
                <p className="text-sm mt-1" style={{ color: theme.redText }}>{formErrors.user_email}</p>
              )}
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                Login menggunakan Google OAuth (@ccs.sch.id). Password tidak diperlukan.
              </p>
            </div>

            <div>
              <Label htmlFor="user_tanggal_lahir" style={{ color: theme.textBody }}>Tanggal Lahir</Label>
              <Input
                id="user_tanggal_lahir"
                name="user_tanggal_lahir"
                type="text"
                value={formData.user_tanggal_lahir || ''}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9/]/g, '');
                  // Auto-insert slashes
                  if (v.length === 2 && !v.includes('/')) v += '/';
                  if (v.length === 5 && v.lastIndexOf('/') === 2) v += '/';
                  handleInputChange({ target: { name: 'user_tanggal_lahir', value: v } });
                }}
                disabled={submitting}
                placeholder="DD/MM/YYYY"
                maxLength={10}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>Format: DD/MM/YYYY</p>
            </div>


            <div>
              <Label htmlFor="user_manual_picture" style={{ color: theme.textBody }}>Profile Picture (Opsional)</Label>
              <Input
                id="user_manual_picture"
                name="user_manual_picture"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setTempImageSrc(reader.result);
                      setShowCropModal(true);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                disabled={submitting || uploadingImage}
                className="cursor-pointer"
                style={inputStyle}
              />
              {imageFile && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium" style={{ color: theme.textBody }}>Preview:</p>
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-full border"
                  />
                  <p className="text-xs" style={{ color: theme.textSecondary }}>
                    Size: {(imageFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
              {!imageFile && formData.user_manual_picture && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1" style={{ color: theme.textBody }}>Current:</p>
                  <img
                    src={formData.user_manual_picture}
                    alt="Current"
                    className="w-24 h-24 object-cover rounded-full border"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="user_role_id" style={{ color: theme.textBody }}>Role *</Label>
              <select
                id="user_role_id"
                name="user_role_id"
                value={formData.user_role_id}
                onChange={handleInputChange}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-md"
                style={{ ...selectStyle, ...(formErrors.user_role_id ? { borderColor: theme.redText } : {}) }}
              >
                <option value="">Pilih Role</option>
                {roles.map(role => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name} {role.is_admin ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
              {formErrors.user_role_id && (
                <p className="text-sm mt-1" style={{ color: theme.redText }}>{formErrors.user_role_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="user_unit_id" style={{ color: theme.textBody }}>Unit</Label>
              <select
                id="user_unit_id"
                name="user_unit_id"
                value={formData.user_unit_id}
                onChange={handleInputChange}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-md"
                style={{ ...selectStyle, ...(formErrors.user_unit_id ? { borderColor: theme.redText } : {}) }}
              >
                <option value="">Pilih Unit (Opsional)</option>
                {units.map(unit => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_name}
                  </option>
                ))}
              </select>
              {formErrors.user_unit_id && (
                <p className="text-sm mt-1" style={{ color: theme.redText }}>{formErrors.user_unit_id}</p>
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
                <Label htmlFor="is_active" style={{ color: theme.textBody }}>Active</Label>
              </div>
            )}

            {/* Signature Upload */}
            <div className="md:col-span-2 border-t pt-3">
              <p className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary }}>Tanda Tangan</p>
              <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>
                Digunakan di laporan rapor sebagai tanda tangan wali kelas. Gunakan gambar PNG transparan untuk hasil terbaik.
              </p>
              <ImageCropUploader
                label="Upload Tanda Tangan"
                previewUrl={signaturePreview}
                uploading={uploadingSignature}
                inputRef={signatureInputRef}
                onCropped={(blob) => {
                  setSignatureBlob(blob);
                  // Show local preview immediately
                  setSignaturePreview(URL.createObjectURL(blob));
                }}
                onRemove={() => {
                  setSignatureBlob(null);
                  setSignaturePreview('');
                }}
              />
              {signatureBlob && (
                <p className="text-xs text-amber-600 mt-1">
                  âš  Tanda tangan baru belum tersimpan. Klik &quot;Update User&quot; / &quot;Create User&quot; untuk menyimpan.
                </p>
              )}
            </div>
          </div>


          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button 
              type="submit" 
              className="flex-1 sm:flex-none"
              style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : (editingUser ? 'Update User' : 'Create User')}
            </Button>
            <Button 
              type="button" 
              onClick={resetForm} 
              variant="outline"
              className="flex-1 sm:flex-none"
              style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
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
        containerStyle={{ background: theme.cardBg }}
        headerStyle={{ borderColor: theme.border }}
        titleStyle={{ color: theme.textPrimary }}
      >
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="csv-file" className="text-sm font-medium" style={{ color: theme.textBody }}>
              Select CSV File
            </Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
              Supported formats: CSV (.csv) with comma (,) or semicolon (;) separators. Excel files (.xlsx, .xls) coming soon.
            </p>
          </div>

          {/* Template Info */}
          <div className="rounded-lg p-3" style={{ background: theme.blueBg, border: `1px solid ${theme.border}` }}>
            <h4 className="font-medium mb-2" style={{ color: theme.blueText }}>CSV Format Required:</h4>
            <p className="text-sm mb-2" style={{ color: theme.blueText }}>
              Your CSV should have these columns (case-insensitive). Use comma (,) or semicolon (;) as separator:
            </p>
            <ul className="text-xs space-y-1" style={{ color: theme.blueText }}>
              <li>â€¢ <strong>nama_depan</strong> or <strong>first_name</strong> (required)</li>
              <li>â€¢ <strong>nama_belakang</strong> or <strong>last_name</strong> (required)</li>
              <li>â€¢ <strong>email</strong> (optional, @ccs.sch.id for Google OAuth)</li>
              <li>â€¢ <strong>role</strong> (required, available: {roles.map(r => r.role_name).join(', ') || 'Loading...'})</li>
              <li>â€¢ <strong>unit</strong> (optional, available: {units.map(u => u.unit_name).join(', ') || 'Loading...'})</li>
              <li>â€¢ <strong>status</strong> (optional: active/inactive, default: active)</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button 
                onClick={() => downloadTemplate(false)}
                variant="outline"
                size="sm"
                className="text-xs"
                style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
              >
                Download Template (Comma)
              </Button>
              <Button 
                onClick={() => downloadTemplate(true)}
                variant="outline"
                size="sm"
                className="text-xs"
                style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
              >
                Download Template (Semicolon)
              </Button>
            </div>
          </div>

          {/* Import Errors */}
          {importErrors.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: theme.redBg, border: `1px solid ${theme.border}` }}>
              <h4 className="font-medium mb-2" style={{ color: theme.redText }}>
                Validation Errors ({importErrors.length} rows):
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importErrors.map((error, index) => (
                  <div key={index} className="text-sm" style={{ color: theme.redText }}>
                    <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Preview */}
          {importPreview.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: theme.greenBg, border: `1px solid ${theme.border}` }}>
              <h4 className="font-medium mb-2" style={{ color: theme.greenText }}>
                Valid Users Ready to Import ({importPreview.length}):
              </h4>
              <div className="max-h-32 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <th className="text-left py-1" style={{ color: theme.greenText }}>Name</th>
                      <th className="text-left py-1" style={{ color: theme.greenText }}>Email</th>
                      <th className="text-left py-1" style={{ color: theme.greenText }}>Role</th>
                      <th className="text-left py-1" style={{ color: theme.greenText }}>Unit</th>
                      <th className="text-left py-1" style={{ color: theme.greenText }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 5).map((user, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td className="py-1" style={{ color: theme.textBody }}>{user.user_nama_depan} {user.user_nama_belakang}</td>
                        <td className="py-1" style={{ color: theme.textBody }}>{user.user_email || '-'}</td>
                        <td className="py-1" style={{ color: theme.textBody }}>
                          {roles.find(r => r.role_id === user.user_role_id)?.role_name || '-'}
                        </td>
                        <td className="py-1" style={{ color: theme.textBody }}>
                          {user.user_unit_id ? units.find(u => u.unit_id === user.user_unit_id)?.unit_name || '-' : '-'}
                        </td>
                        <td className="py-1" style={{ color: theme.textBody }}>{user.is_active ? 'Active' : 'Inactive'}</td>
                      </tr>
                    ))}
                    {importPreview.length > 5 && (
                      <tr>
                        <td colSpan="6" className="py-1 text-center" style={{ color: theme.textSecondary }}>
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
              className="flex-1 sm:flex-none"
              style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}
              disabled={importPreview.length === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${importPreview.length} Users`}
            </Button>
            <div className="flex gap-1">
              <Button 
                onClick={() => downloadTemplate(false)}
                variant="outline"
                className="text-xs px-2"
                style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
                disabled={isImporting}
                title="Download CSV template with comma separator"
              >
                Template (,)
              </Button>
              <Button 
                onClick={() => downloadTemplate(true)}
                variant="outline"
                className="text-xs px-2"
                style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
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
              style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
              disabled={isImporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Filters */}
      <Card className="mb-4" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
        <CardContent className="pt-4">
          {/* Search bar */}
          <div className="mb-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: theme.textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                id="user-search"
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Cari nama, email, atau role..."
                className="w-full pl-9 pr-9 py-2 rounded-md text-sm focus:outline-none"
                style={inputStyle}
              />
              {filters.search && (
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: theme.textSecondary }}
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Role Filter */}
              <div>
                <Label htmlFor="role-filter" className="text-sm font-medium" style={{ color: theme.textBody }}>
                  Filter by Role
                </Label>
                <select
                  id="role-filter"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={selectStyle}
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
                <Label htmlFor="unit-filter" className="text-sm font-medium" style={{ color: theme.textBody }}>
                  Filter by Unit
                </Label>
                <select
                  id="unit-filter"
                  value={filters.unit}
                  onChange={(e) => handleFilterChange('unit', e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={selectStyle}
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
                <Label htmlFor="status-filter" className="text-sm font-medium" style={{ color: theme.textBody }}>
                  Filter by Status
                </Label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={selectStyle}
                >
                  <option value="">Semua Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(filters.search || filters.role || filters.status || filters.unit) && (
              <Button 
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Summary */}
          {(filters.role || filters.status || filters.unit) && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm" style={{ color: theme.textSecondary }}>Active filters:</span>
              {filters.role && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs" style={{ background: theme.blueBg, color: theme.blueText }}>
                  Role: {filters.role}
                  <button onClick={() => handleFilterChange('role', '')} className="ml-1" style={{ color: theme.blueText }}>Ã—</button>
                </span>
              )}
              {filters.unit && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                  Unit: {filters.unit}
                  <button onClick={() => handleFilterChange('unit', '')} className="ml-1" style={{ color: theme.textSecondary }}>Ã—</button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs" style={{ background: theme.greenBg, color: theme.greenText }}>
                  Status: {filters.status === 'active' ? 'Active' : 'Inactive'}
                  <button onClick={() => handleFilterChange('status', '')} className="ml-1" style={{ color: theme.greenText }}>Ã—</button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
        <CardHeader style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between">
            <CardTitle style={{ color: theme.textPrimary }}>
              Users List ({filteredUsers.length} of {users.length} users)
              {(filters.search || filters.role || filters.status || filters.unit) && (
                <span className="text-sm font-normal ml-2" style={{ color: theme.textSecondary }}>(filtered)</span>
              )}
            </CardTitle>
            {/* Column selector â€” desktop only */}
            <div className="relative hidden md:block" ref={columnSelectorRef}>
              <button
                onClick={() => setShowColumnSelector(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors"
                style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.textSecondary }}
              >
                <svg className="w-4 h-4" style={{ color: theme.textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Columns
              </button>
              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-1 rounded-lg z-30 p-3 min-w-[180px]" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.textSecondary }}>Tampilkan Kolom</p>
                  {ALL_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 py-1 px-1 text-sm cursor-pointer rounded" style={{ color: theme.textBody }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                  <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                    <button
                      onClick={() => {
                        setVisibleColumns(DEFAULT_COLUMNS);
                        try { localStorage.removeItem('user_table_columns'); } catch(e) {}
                      }}
                      className="text-xs w-full text-left"
                      style={{ color: theme.blueText }}
                    >
                      Reset ke default
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-6" style={{ color: theme.textSecondary }}>
                {(filters.search || filters.role || filters.status || filters.unit) ? 'No users match the selected filters' : 'No users found'}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.user_id} className="rounded-lg p-3 space-y-2" style={{ border: `1px solid ${theme.border}`, background: theme.cardBgAlt }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold" style={{ color: theme.textPrimary }}>
                        {user.user_nama_depan} {user.user_nama_belakang}
                      </h3>
                      <p className="text-sm" style={{ color: theme.textBody }}>{user.user_email || '-'}</p>
                      <p className="text-sm" style={{ color: theme.textSecondary }}>Email: {user.user_email || '-'}</p>
                    </div>
                    <span className="text-xs" style={{ color: theme.textSecondary }}>ID: {user.user_id}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded text-xs" style={user.is_admin ? { background: theme.redBg, color: theme.redText } : { background: theme.blueBg, color: theme.blueText }}>
                      {user.role_name}
                    </span>
                    {user.unit_name && (
                      <span className="px-2 py-1 rounded text-xs" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                        {user.unit_name}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded text-xs" style={user.is_active ? { background: theme.greenBg, color: theme.greenText } : { background: theme.subtleBg, color: theme.textSecondary }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    <Button 
                      size="sm" 
                      onClick={() => handleEdit(user)}
                      className="flex-1"
                      style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}
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
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme.subtleBg }}>
                  {visibleColumns.has('id') && <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>ID</th>}
                  {visibleColumns.has('nama') && <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>Nama Lengkap</th>}
                  {visibleColumns.has('email') && <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>Email</th>}
                  {visibleColumns.has('tanggal_lahir') && <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>Tanggal Lahir</th>}
                  {visibleColumns.has('role') && <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>Role</th>}
                  {visibleColumns.has('unit') && <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>Unit</th>}
                  {visibleColumns.has('status') && <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>Status</th>}
                  <th className="px-4 py-2 text-left" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.size + 1} className="px-4 py-6 text-center" style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>
                      {(filters.search || filters.role || filters.status || filters.unit) ? 'No users match the selected filters' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.user_id}
                      onMouseEnter={e => { e.currentTarget.style.background = theme.subtleBg }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {visibleColumns.has('id') && <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}`, color: theme.textBody }}>{user.user_id}</td>}
                      {visibleColumns.has('nama') && <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}`, color: theme.textBody }}>{user.user_nama_depan} {user.user_nama_belakang}</td>}
                      {visibleColumns.has('email') && <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}`, color: theme.textBody }}>{user.user_email || '-'}</td>}
                      {visibleColumns.has('tanggal_lahir') && <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}`, color: theme.textBody }}>{user.user_tanggal_lahir ? toDisplayDate(user.user_tanggal_lahir) : '-'}</td>}

                      {visibleColumns.has('role') && (
                        <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}` }}>
                          <span className="px-2 py-1 rounded text-xs" style={user.is_admin ? { background: theme.redBg, color: theme.redText } : { background: theme.blueBg, color: theme.blueText }}>
                            {user.role_name}
                          </span>
                        </td>
                      )}
                      {visibleColumns.has('unit') && <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}`, color: theme.textBody }}>{user.unit_name || '-'}</td>}
                      {visibleColumns.has('status') && (
                        <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}` }}>
                          <span className="px-2 py-1 rounded text-xs" style={user.is_active ? { background: theme.greenBg, color: theme.greenText } : { background: theme.subtleBg, color: theme.textSecondary }}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-2" style={{ border: `1px solid ${theme.border}` }}>
                        <Button size="sm" onClick={() => handleEdit(user)} style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}>
                          Edit
                        </Button>
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

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setTempImageSrc(null);
        }}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />
    </div>
  );
}
