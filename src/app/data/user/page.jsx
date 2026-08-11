'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import ImageCropModal from '@/components/ImageCropModal';
import { supabase } from '@/lib/supabase';
import ImageCropUploader from '@/components/ui/image-crop-uploader';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faExclamationTriangle,
  faSpinner,
  faBan,
  faSearch,
  faPlus,
  faFileImport,
  faColumns,
  faUsers,
  faUserCheck,
  faUserTimes,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';

// Bulletproof User Avatar Component with automatic fallback on broken image URLs
function UserAvatar({ user, theme, size = "w-7 h-7" }) {
  const [imgError, setImgError] = useState(false);
  const initials = `${user.user_nama_depan?.[0] || ''}${user.user_nama_belakang?.[0] || ''}`.toUpperCase();
  const pic = user.user_manual_picture || user.user_profile_picture;

  if (pic && !imgError) {
    return (
      <img
        src={pic}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${size} rounded-full object-cover border shrink-0`}
        style={{ borderColor: theme.border }}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-mono text-[10px] font-semibold border shrink-0`}
      style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}
    >
      {initials || '?'}
    </div>
  );
}

export default function UserManagement() {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();

  // Dynamic Styles tied to useTheme() (Works 100% in Light & Dark mode)
  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' };
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' };
  const btnPrimaryStyle = { background: theme.textPrimary, color: isDark ? '#18171A' : '#FFFFFF', border: 'none' };
  const btnSecondaryStyle = { background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}` };

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formTab, setFormTab] = useState('info'); // 'info' | 'media' | 'mesin' | 'posisi'
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    user_nama_depan: '',
    user_nama_belakang: '',
    user_email: '',
    user_tanggal_lahir: '',
    user_manual_picture: '',
    user_role_id: '',
    user_unit_id: '',
    is_active: true,
    user_pin: '',
    expected_check_in: '',
    expected_check_out: '',
    join_date: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);

  // Signature state
  const [signatureBlob, setSignatureBlob] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const signatureInputRef = { current: null };

  // Position history state
  const [positionHistory, setPositionHistory] = useState([]);
  const [posHistLoading, setPosHistLoading] = useState(false);
  const [posHistMsg, setPosHistMsg] = useState('');
  const [editingPosId, setEditingPosId] = useState(null);
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosStart, setNewPosStart] = useState('');
  const [newPosEnd, setNewPosEnd] = useState('');
  const [newPosNotes, setNewPosNotes] = useState('');
  const [showAddPos, setShowAddPos] = useState(false);

  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Delete modal state & safety verification
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    user: null,
    isChecking: false,
    canDelete: false,
    blockers: [],
    isDeleting: false
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    unit: ''
  });

  // Column visibility
  const ALL_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'nama', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'tanggal_lahir', label: 'Birth Date' },
    { key: 'role', label: 'Role' },
    { key: 'unit', label: 'Unit' },
    { key: 'status', label: 'Status' },
    { key: 'pin', label: 'Machine PIN' },
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

  // Date helpers
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

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const processErrorMessage = (errorMessage) => {
    if (!errorMessage) return 'An unknown error occurred';
    const message = errorMessage.toLowerCase();
    if (message.includes('duplicate key value violates unique constraint')) {
      return 'The entered data already exists in the system. Please check again.';
    }
    if (message.includes('invalid json') || message.includes('unexpected token')) {
      return 'Server returned an invalid response. Please try again.';
    }
    if (message.includes('role') && (message.includes('not found') || message.includes('invalid'))) {
      return 'The selected role is invalid.';
    }
    if (message.includes('cannot') && message.includes('admin') && message.includes('last')) {
      return 'Cannot change the role or deactivate the last active admin.';
    }
    if (message.includes('password must be at least')) {
      return 'Password must be at least 6 characters.';
    }
    if (message.includes('all fields are required')) {
      return 'All required fields must be filled.';
    }
    if (message.includes('connection') || message.includes('network')) {
      return 'Server connection issue. Please try again.';
    }
    return errorMessage;
  };

  const handleStartDeleteUser = async (userToDelete) => {
    if (!userToDelete) return;
    setDeleteModal({
      isOpen: true,
      user: userToDelete,
      isChecking: true,
      canDelete: false,
      blockers: [],
      isDeleting: false
    });

    const userId = userToDelete.user_id;
    const blockers = [];

    try {
      const { count } = await supabase.from('uniform_sale').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      if (count && count > 0) blockers.push(`Uniform Sales History (${count} transactions)`);
    } catch (e) {}

    try {
      const { count } = await supabase.from('detail_siswa').select('*', { count: 'exact', head: true }).eq('detail_siswa_user_id', userId);
      if (count && count > 0) blockers.push(`Student Profile & Class Membership (${count} classes/reports)`);
    } catch (e) {}

    try {
      const { count } = await supabase.from('assessment').select('*', { count: 'exact', head: true }).eq('assessment_user_id', userId);
      if (count && count > 0) blockers.push(`Assessment Records (${count} assessments)`);
    } catch (e) {}

    try {
      const { count } = await supabase.from('incident_reports').select('*', { count: 'exact', head: true }).or(`student_user_id.eq.${userId},reporter_user_id.eq.${userId}`);
      if (count && count > 0) blockers.push(`Incident Reports (${count} reports)`);
    } catch (e) {}

    try {
      const { count } = await supabase.from('fpb').select('*', { count: 'exact', head: true }).eq('requested_by_user_id', userId);
      if (count && count > 0) blockers.push(`Form Expense Requests / FPB (${count} requests)`);
    } catch (e) {}

    try {
      const { count } = await supabase.from('consultation').select('*', { count: 'exact', head: true }).or(`consultation_counselor_user_id.eq.${userId},created_by_user_id.eq.${userId}`);
      if (count && count > 0) blockers.push(`Consultation Notes (${count} notes)`);
    } catch (e) {}

    try {
      const { count } = await supabase.from('kelas_attendance').select('*', { count: 'exact', head: true }).eq('created_by', userId);
      if (count && count > 0) blockers.push(`Attendance Session Records (${count} sessions)`);
    } catch (e) {}

    setDeleteModal({
      isOpen: true,
      user: userToDelete,
      isChecking: false,
      canDelete: blockers.length === 0,
      blockers,
      isDeleting: false
    });
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteModal.user || !deleteModal.canDelete) return;
    try {
      setDeleteModal(prev => ({ ...prev, isDeleting: true }));
      await supabase.from('user_position_history').delete().eq('user_id', deleteModal.user.user_id);
      const { error } = await supabase.from('users').delete().eq('user_id', deleteModal.user.user_id);
      if (error) throw error;

      showNotification('Success', `User "${deleteModal.user.user_nama_depan} ${deleteModal.user.user_nama_belakang || ''}" has been deleted successfully.`, 'success');
      setDeleteModal({ isOpen: false, user: null, isChecking: false, canDelete: false, blockers: [], isDeleting: false });
      await fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      showNotification('Failed', err.message || 'Failed to delete user', 'error');
    } finally {
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const isStudentUser = (user) => {
    if (!user) return false;
    const roleName = (user.role_name || '').toLowerCase();
    return roleName.includes('student') || roleName.includes('siswa') || roleName.includes('murid') || user.user_role_id === 3;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_profile_picture, user_manual_picture, user_role_id, user_unit_id, is_active, signature_url, user_tanggal_lahir, user_pin, expected_check_in, expected_check_out');

      if (usersError) throw new Error(usersError.message);

      const { data: rolesData, error: rolesError } = await supabase
        .from('role')
        .select('role_id, role_name, is_admin');
      if (rolesError) throw new Error(rolesError.message);

      const { data: unitsData, error: unitsError } = await supabase
        .from('unit')
        .select('unit_id, unit_name');
      if (unitsError) throw new Error(unitsError.message);

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
          user_pin: user.user_pin || null,
          expected_check_in: user.expected_check_in || null,
          expected_check_out: user.expected_check_out || null,
          join_date: user.join_date || null,
          role_name: role?.role_name || '',
          is_admin: role?.is_admin || false,
          unit_name: unit?.unit_name || '',
          is_active: user.is_active
        };
      });

      transformedData.sort((a, b) => {
        const roleCompare = (a.user_role_id || 0) - (b.user_role_id || 0);
        if (roleCompare !== 0) return roleCompare;
        return (a.user_nama_depan || '').localeCompare(b.user_nama_depan || '');
      });

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
      const { data, error } = await supabase.from('role').select('role_id, role_name, is_admin').order('role_id');
      if (error) throw new Error(error.message);
      setRoles(data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase.from('unit').select('unit_id, unit_name').order('unit_name');
      if (error) throw new Error(error.message);
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

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

  const getUniqueRoles = () => {
    const roleSet = new Set(users.map(user => user.role_name));
    return Array.from(roleSet).sort();
  };

  const getUniqueUnits = () => {
    const unitSet = new Set(users.map(user => user.unit_name).filter(Boolean));
    return Array.from(unitSet).sort();
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', role: '', status: '', unit: '' });
  };

  // CSV Parsing & Validation
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().replace(/ /g, '_');
          row[normalizedHeader] = values[index] || '';
        });
        data.push(row);
      }
    }
    return data;
  };

  const validateImportData = (data) => {
    const errors = [];
    const validData = [];
    data.forEach((row, index) => {
      const rowErrors = [];
      const validRow = { user_nama_depan: '', user_nama_belakang: '', user_email: '', user_role_id: '', user_unit_id: '', is_active: true };

      if (!row.nama_depan && !row.user_nama_depan && !row.first_name) {
        rowErrors.push('First name is required');
      } else {
        validRow.user_nama_depan = (row.nama_depan || row.user_nama_depan || row.first_name || '').trim();
      }

      if (!row.nama_belakang && !row.user_nama_belakang && !row.last_name) {
        rowErrors.push('Last name is required');
      } else {
        validRow.user_nama_belakang = (row.nama_belakang || row.user_nama_belakang || row.last_name || '').trim();
      }

      const emailValue = (row.email || row.user_email || '').trim();
      if (emailValue) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailValue)) {
          rowErrors.push('Invalid email format');
        } else {
          validRow.user_email = emailValue;
        }
      }

      const roleName = (row.role || row.role_name || row.user_role || '').trim();
      if (!roleName) {
        rowErrors.push('Role is required');
      } else {
        const role = roles.find(r => r.role_name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          rowErrors.push(`Role "${roleName}" not found.`);
        } else {
          validRow.user_role_id = role.role_id;
        }
      }

      const unitName = (row.unit || row.unit_name || row.user_unit || '').trim();
      if (unitName) {
        const unit = units.find(u => u.unit_name.toLowerCase() === unitName.toLowerCase());
        if (!unit) {
          rowErrors.push(`Unit "${unitName}" not found.`);
        } else {
          validRow.user_unit_id = unit.unit_id;
        }
      } else {
        validRow.user_unit_id = null;
      }

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
      } else {
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

  const processBulkImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    const results = { success: 0, failed: 0, errors: [] };

    for (const userData of importPreview) {
      try {
        const cleanedUserData = {
          user_nama_depan: String(userData.user_nama_depan || '').trim(),
          user_nama_belakang: String(userData.user_nama_belakang || '').trim(),
          user_email: String(userData.user_email || '').trim(),
          user_role_id: Number(userData.user_role_id),
          user_unit_id: userData.user_unit_id ? Number(userData.user_unit_id) : null,
          is_active: Boolean(userData.is_active)
        };

        if (!cleanedUserData.user_nama_depan || !cleanedUserData.user_nama_belakang || !cleanedUserData.user_role_id) {
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
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          username: userData.user_nama_depan || 'Unknown',
          email: userData.user_email || '',
          error: processErrorMessage(err.message)
        });
      }
    }

    setIsImporting(false);
    let message = `Import completed! ${results.success} users successfully imported.`;
    if (results.failed > 0) message += ` ${results.failed} failed.`;

    showNotification(
      results.failed > 0 ? 'Import Completed with Issues' : 'Import Successful!',
      message,
      results.failed > 0 ? 'warning' : 'success'
    );

    if (results.success > 0) await fetchUsers();
    resetImportModal();
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportData([]);
    setImportPreview([]);
    setImportErrors([]);
    setIsImporting(false);
  };

  const downloadTemplate = (withSemicolon = false) => {
    const delimiter = withSemicolon ? ';' : ',';
    const sampleRole1 = roles[0]?.role_name || 'Admin';
    const sampleRole2 = roles[1]?.role_name || 'Teacher';
    const sampleUnit1 = units[0]?.unit_name || 'PYP';
    const sampleUnit2 = units[1]?.unit_name || 'MYP';

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
      const ext = imageFile.name.split('.').pop();
      const path = `user-profiles/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('uniform-receipts').upload(path, imageFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('uniform-receipts').getPublicUrl(path);
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

  const validateForm = () => {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.user_nama_depan.trim()) errors.user_nama_depan = 'First name is required';
    if (!formData.user_nama_belakang.trim()) errors.user_nama_belakang = 'Last name is required';
    if (formData.user_email && !emailPattern.test(formData.user_email.trim())) errors.user_email = 'Invalid email address';
    if (!formData.user_role_id) errors.user_role_id = 'Role is required';
    if (!formData.user_unit_id) errors.user_unit_id = 'Unit is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadSignature = async (userId, blob) => {
    const path = `user-signatures/${userId}/signature.png`;
    const { error: uploadError } = await supabase.storage.from('report-assets').upload(path, blob, { contentType: 'image/png', upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('report-assets').getPublicUrl(path);
    return `${publicUrlData.publicUrl}?t=${Date.now()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const submitData = { ...formData };
      submitData.user_role_id = submitData.user_role_id ? Number(submitData.user_role_id) : null;
      submitData.user_unit_id = submitData.user_unit_id ? Number(submitData.user_unit_id) : null;
      submitData.user_email = submitData.user_email ? submitData.user_email.trim() : null;

      const baseData = { ...submitData };
      baseData.user_tanggal_lahir = baseData.user_tanggal_lahir ? toIsoDate(baseData.user_tanggal_lahir) : null;
      if (!baseData.expected_check_in) baseData.expected_check_in = null;
      if (!baseData.expected_check_out) baseData.expected_check_out = null;
      if (!baseData.join_date) baseData.join_date = null;
      if (!baseData.user_pin) baseData.user_pin = null;

      if (editingUser) {
        if (imageFile) {
          const imageUrl = await uploadImage(editingUser.user_id);
          if (imageUrl) baseData.user_manual_picture = imageUrl;
        }
        if (signatureBlob) {
          setUploadingSignature(true);
          try {
            const sigUrl = await uploadSignature(editingUser.user_id, signatureBlob);
            baseData.signature_url = sigUrl;
            setSignaturePreview(sigUrl);
          } finally { setUploadingSignature(false); }
        }
        const result = await supabase.from('users').update(baseData).eq('user_id', editingUser.user_id);
        if (result.error) throw new Error(result.error.message);
      } else {
        const insertRes = await supabase.from('users').insert([baseData]).select('user_id').single();
        if (insertRes.error) throw new Error(insertRes.error.message);

        if (imageFile && insertRes.data) {
          const imageUrl = await uploadImage(insertRes.data.user_id);
          if (imageUrl) await supabase.from('users').update({ user_manual_picture: imageUrl }).eq('user_id', insertRes.data.user_id);
        }
        if (signatureBlob && insertRes.data) {
          setUploadingSignature(true);
          try {
            const sigUrl = await uploadSignature(insertRes.data.user_id, signatureBlob);
            await supabase.from('users').update({ signature_url: sigUrl }).eq('user_id', insertRes.data.user_id);
            setSignaturePreview(sigUrl);
          } finally { setUploadingSignature(false); }
        }
      }

      await fetchUsers();
      resetForm();
      setError('');
      showNotification('Success!', editingUser ? `User data updated successfully.` : `New user added successfully.`, 'success');
    } catch (err) {
      setError('Error: ' + processErrorMessage(err.message));
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
      is_active: user.is_active,
      user_pin: user.user_pin || '',
      expected_check_in: user.expected_check_in ? user.expected_check_in.slice(0, 5) : '',
      expected_check_out: user.expected_check_out ? user.expected_check_out.slice(0, 5) : '',
      join_date: user.join_date || ''
    });
    setImageFile(null);
    setSignatureBlob(null);
    setSignaturePreview(user.signature_url || '');
    setShowForm(true);
    setFormErrors({});
    loadPositionHistory(user.user_id);
  };

  const loadPositionHistory = async (uid) => {
    setPosHistLoading(true);
    const { data } = await supabase.from('user_position_history').select('*').eq('user_id', uid).order('start_date', { ascending: false });
    setPositionHistory(data || []);
    setPosHistLoading(false);
  };

  const resetPosForm = () => {
    setNewPosTitle(''); setNewPosStart(''); setNewPosEnd(''); setNewPosNotes('');
    setEditingPosId(null); setShowAddPos(false); setPosHistMsg('');
  };

  const handleSavePosition = async () => {
    if (!newPosTitle.trim() || !newPosStart) {
      setPosHistMsg('Position title and start date are required');
      return;
    }
    if (newPosEnd && newPosEnd < newPosStart) {
      setPosHistMsg('End date cannot be before start date');
      return;
    }
    setPosHistMsg('');
    const payload = {
      user_id: editingUser.user_id,
      position_title: newPosTitle.trim(),
      start_date: newPosStart,
      end_date: newPosEnd || null,
      notes: newPosNotes.trim() || null,
    };
    let error;
    if (editingPosId) {
      ({ error } = await supabase.from('user_position_history').update(payload).eq('id', editingPosId));
    } else {
      ({ error } = await supabase.from('user_position_history').insert([payload]));
    }
    if (error) { setPosHistMsg(error.message); return; }
    resetPosForm();
    loadPositionHistory(editingUser.user_id);
  };

  const handleDeletePosition = async (id) => {
    if (!confirm('Delete this position history record?')) return;
    const { error } = await supabase.from('user_position_history').delete().eq('id', id);
    if (error) { setPosHistMsg(error.message); return; }
    loadPositionHistory(editingUser.user_id);
  };

  const handleEditPosition = (pos) => {
    setEditingPosId(pos.id);
    setNewPosTitle(pos.position_title);
    setNewPosStart(pos.start_date);
    setNewPosEnd(pos.end_date || '');
    setNewPosNotes(pos.notes || '');
    setShowAddPos(true);
    setPosHistMsg('');
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
      is_active: true,
      user_pin: '',
      expected_check_in: '',
      expected_check_out: '',
      join_date: ''
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
    setFormTab('info');
    setPositionHistory([]);
    resetPosForm();
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

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center font-sans" style={{ background: theme.pageBg }}>
        <div className="flex items-center gap-3 text-sm font-medium tracking-tight" style={{ color: theme.textSecondary }}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ color: theme.textPrimary }} />
          <span>Loading user data...</span>
        </div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  // Summary counts for bento cards
  const totalUserCount = users.length;
  const activeUserCount = users.filter(u => u.is_active).length;
  const inactiveUserCount = totalUserCount - activeUserCount;
  const adminRoleCount = users.filter(u => u.is_admin).length;

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans antialiased" style={{ background: theme.pageBg, color: theme.textPrimary }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─── Minimalist Editorial Header Section ─── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b" style={{ borderColor: theme.border }}>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
              <span>User Management System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: theme.textPrimary }}>
              User Accounts
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
              style={btnPrimaryStyle}
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span>Add User</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-md transition-all duration-200 cursor-pointer"
              style={btnSecondaryStyle}
            >
              <FontAwesomeIcon icon={faFileImport} className="text-xs" style={{ color: theme.textSecondary }} />
              <span>Import CSV</span>
            </button>

            <div className="inline-flex items-center rounded-md border p-0.5" style={{ background: theme.cardBg, borderColor: theme.border }}>
              <button
                onClick={() => downloadTemplate(false)}
                className="px-2.5 py-1.5 text-xs font-mono rounded transition-colors"
                style={{ color: theme.textSecondary }}
                title="Download CSV template (comma ,)"
              >
                Template (,)
              </button>
              <span className="w-px h-4" style={{ background: theme.border }}></span>
              <button
                onClick={() => downloadTemplate(true)}
                className="px-2.5 py-1.5 text-xs font-mono rounded transition-colors"
                style={{ color: theme.textSecondary }}
                title="Download CSV template (semicolon ;)"
              >
                Template (;)
              </button>
            </div>
          </div>
        </div>

        {/* ─── Bento Summary Grid Cards ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-lg border flex flex-col justify-between" style={{ background: theme.cardBg, borderColor: theme.border }}>
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              <span>Total Users</span>
              <FontAwesomeIcon icon={faUsers} style={{ color: theme.textSecondary }} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tracking-tight" style={{ color: theme.textPrimary }}>{totalUserCount}</span>
              <span className="text-xs" style={{ color: theme.textSecondary }}>registered</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border flex flex-col justify-between" style={{ background: theme.cardBg, borderColor: theme.border }}>
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              <span>Active Users</span>
              <FontAwesomeIcon icon={faUserCheck} style={{ color: theme.greenText }} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tracking-tight" style={{ color: theme.greenText }}>{activeUserCount}</span>
              <span className="text-xs" style={{ color: theme.textSecondary }}>active</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border flex flex-col justify-between" style={{ background: theme.cardBg, borderColor: theme.border }}>
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              <span>Inactive Users</span>
              <FontAwesomeIcon icon={faUserTimes} style={{ color: theme.redText }} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tracking-tight" style={{ color: theme.redText }}>{inactiveUserCount}</span>
              <span className="text-xs" style={{ color: theme.textSecondary }}>inactive</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border flex flex-col justify-between" style={{ background: theme.cardBg, borderColor: theme.border }}>
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>
              <span>Admin Access</span>
              <FontAwesomeIcon icon={faUserShield} style={{ color: theme.blueText }} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tracking-tight" style={{ color: theme.blueText }}>{adminRoleCount}</span>
              <span className="text-xs" style={{ color: theme.textSecondary }}>administrators</span>
            </div>
          </div>
        </div>

        {/* ─── Search & Filter Controls ─── */}
        <div className="rounded-lg p-4 border space-y-3" style={{ background: theme.cardBg, borderColor: theme.border }}>
          {/* Search Input with Keyboard Shortcut Hint */}
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: theme.textSecondary }} />
            <input
              id="user-search"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by user name, email, or role..."
              className="w-full pl-9 pr-16 py-2 rounded-md text-xs sm:text-sm focus:outline-none transition-colors"
              style={inputStyle}
            />
            {filters.search ? (
              <button
                onClick={() => handleFilterChange('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: theme.textSecondary }}
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block">
                <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border" style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}>⌘F</kbd>
              </span>
            )}
          </div>

          {/* Filter Dropdowns Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t" style={{ borderColor: theme.border }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              <div>
                <select
                  id="role-filter"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md"
                  style={selectStyle}
                >
                  <option value="">All Roles</option>
                  {getUniqueRoles().map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  id="unit-filter"
                  value={filters.unit}
                  onChange={(e) => handleFilterChange('unit', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md"
                  style={selectStyle}
                >
                  <option value="">All Units</option>
                  {getUniqueUnits().map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md"
                  style={selectStyle}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Clear Button */}
            {(filters.search || filters.role || filters.status || filters.unit) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs font-medium border rounded-md transition-colors"
                style={btnSecondaryStyle}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Filter Badges Active */}
          {(filters.role || filters.status || filters.unit) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px]" style={{ color: theme.textSecondary }}>Active filters:</span>
              {filters.role && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono" style={{ background: theme.blueBg, color: theme.blueText }}>
                  Role: {filters.role}
                  <button onClick={() => handleFilterChange('role', '')} className="hover:opacity-75">✕</button>
                </span>
              )}
              {filters.unit && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono" style={{ background: theme.yellowBg, color: theme.yellowText }}>
                  Unit: {filters.unit}
                  <button onClick={() => handleFilterChange('unit', '')} className="hover:opacity-75">✕</button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono" style={{ background: theme.greenBg, color: theme.greenText }}>
                  Status: {filters.status === 'active' ? 'Active' : 'Inactive'}
                  <button onClick={() => handleFilterChange('status', '')} className="hover:opacity-75">✕</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── Main User Table Card ─── */}
        <div className="rounded-lg border overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
          {/* Card Table Header Toolbar */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                User List ({filteredUsers.length} of {users.length})
              </h2>
              {(filters.search || filters.role || filters.status || filters.unit) && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                  filtered
                </span>
              )}
            </div>

            {/* Desktop Column Selector */}
            <div className="relative hidden md:block" ref={columnSelectorRef}>
              <button
                onClick={() => setShowColumnSelector(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer"
                style={btnSecondaryStyle}
              >
                <FontAwesomeIcon icon={faColumns} className="text-xs" style={{ color: theme.textSecondary }} />
                <span>Columns</span>
              </button>

              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-1 border rounded-md shadow-sm z-30 p-3 min-w-[190px]" style={{ background: theme.cardBg, borderColor: theme.border }}>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: theme.textSecondary }}>Show Columns</p>
                  <div className="space-y-1">
                    {ALL_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 py-1 text-xs cursor-pointer px-1 rounded" style={{ color: theme.textPrimary }}>
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                    <button
                      onClick={() => {
                        setVisibleColumns(DEFAULT_COLUMNS);
                        try { localStorage.removeItem('user_table_columns'); } catch(e) {}
                      }}
                      className="text-[11px] hover:underline"
                      style={{ color: theme.blueText }}
                    >
                      Reset to default
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b font-medium tracking-wider uppercase text-[10px]" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                  {visibleColumns.has('id') && <th className="px-4 py-3 font-mono">ID</th>}
                  {visibleColumns.has('nama') && <th className="px-4 py-3">Full Name</th>}
                  {visibleColumns.has('email') && <th className="px-4 py-3">Email</th>}
                  {visibleColumns.has('tanggal_lahir') && <th className="px-4 py-3">Birth Date</th>}
                  {visibleColumns.has('role') && <th className="px-4 py-3">Role</th>}
                  {visibleColumns.has('unit') && <th className="px-4 py-3">Unit</th>}
                  {visibleColumns.has('status') && <th className="px-4 py-3">Status</th>}
                  {visibleColumns.has('pin') && <th className="px-4 py-3 font-mono">Machine PIN</th>}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.size + 1} className="px-4 py-8 text-center text-xs" style={{ color: theme.textSecondary }}>
                      No users match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr
                      key={user.user_id}
                      className="transition-colors duration-150"
                      onMouseEnter={e => { e.currentTarget.style.background = theme.subtleBg }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {visibleColumns.has('id') && (
                        <td className="px-4 py-3 font-mono" style={{ color: theme.textSecondary }}>
                          #{user.user_id}
                        </td>
                      )}

                      {visibleColumns.has('nama') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={user} theme={theme} size="w-7 h-7" />
                            <span className="font-medium" style={{ color: theme.textPrimary }}>
                              {user.user_nama_depan} {user.user_nama_belakang}
                            </span>
                          </div>
                        </td>
                      )}

                      {visibleColumns.has('email') && (
                        <td className="px-4 py-3 font-mono text-[11px]" style={{ color: theme.textSecondary }}>
                          {user.user_email || <span className="italic opacity-60">—</span>}
                        </td>
                      )}

                      {visibleColumns.has('tanggal_lahir') && (
                        <td className="px-4 py-3" style={{ color: theme.textSecondary }}>
                          {user.user_tanggal_lahir ? toDisplayDate(user.user_tanggal_lahir) : <span className="italic opacity-60">—</span>}
                        </td>
                      )}

                      {visibleColumns.has('role') && (
                        <td className="px-4 py-3">
                          <span
                            className="inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider"
                            style={
                              user.is_admin
                                ? { background: theme.redBg, color: theme.redText }
                                : isStudentUser(user)
                                ? { background: theme.yellowBg, color: theme.yellowText }
                                : { background: theme.blueBg, color: theme.blueText }
                            }
                          >
                            {user.role_name}
                          </span>
                        </td>
                      )}

                      {visibleColumns.has('unit') && (
                        <td className="px-4 py-3">
                          {user.unit_name ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px]" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                              {user.unit_name}
                            </span>
                          ) : (
                            <span className="italic opacity-60">—</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.has('status') && (
                        <td className="px-4 py-3">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                            style={user.is_active ? { background: theme.greenBg, color: theme.greenText } : { background: theme.redBg, color: theme.redText }}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}

                      {visibleColumns.has('pin') && (
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {user.user_pin ? (
                            <span className="px-1.5 py-0.5 rounded border" style={{ background: theme.subtleBg, color: theme.textPrimary, borderColor: theme.border }}>
                              {user.user_pin}
                            </span>
                          ) : (
                            <span className="italic opacity-60">—</span>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
                            style={btnSecondaryStyle}
                          >
                            Edit
                          </button>
                          {isStudentUser(user) && (
                            <button
                              onClick={() => handleStartDeleteUser(user)}
                              className="px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
                              style={{ background: theme.redBg, color: theme.redText, border: `1px solid ${theme.redBg}` }}
                              title="Delete user"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Table/Cards View */}
          <div className="block md:hidden divide-y" style={{ borderColor: theme.border }}>
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-xs" style={{ color: theme.textSecondary }}>
                No users match the selected filters.
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.user_id} className="p-4 space-y-2.5" style={{ background: theme.cardBg }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={user} theme={theme} size="w-8 h-8" />
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                          {user.user_nama_depan} {user.user_nama_belakang}
                        </h3>
                        <p className="text-xs font-mono" style={{ color: theme.textSecondary }}>{user.user_email || '-'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">#{user.user_id}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold" style={user.is_admin ? { background: theme.redBg, color: theme.redText } : { background: theme.blueBg, color: theme.blueText }}>
                      {user.role_name}
                    </span>
                    {user.unit_name && (
                      <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                        {user.unit_name}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold" style={user.is_active ? { background: theme.greenBg, color: theme.greenText } : { background: theme.redBg, color: theme.redText }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                    <button
                      onClick={() => handleEdit(user)}
                      className="flex-1 py-1.5 text-xs font-medium rounded border cursor-pointer"
                      style={btnSecondaryStyle}
                    >
                      Edit User
                    </button>
                    {isStudentUser(user) && (
                      <button
                        onClick={() => handleStartDeleteUser(user)}
                        className="px-3 py-1.5 text-xs font-medium rounded border cursor-pointer"
                        style={{ background: theme.redBg, color: theme.redText, borderColor: theme.redBg }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ─── User Form Modal ─── */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingUser ? `Edit User #${editingUser.user_id}` : 'Add New User'}
        size="md"
        disableBackdropClose
        containerStyle={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
        headerStyle={{ borderBottom: `1px solid ${theme.border}` }}
        titleStyle={{ color: theme.textPrimary, fontSize: '16px', fontWeight: '600' }}
      >
        {error && (
          <div className="p-3 rounded-md mb-4 text-xs" style={{ background: theme.redBg, border: `1px solid ${theme.redBg}`, color: theme.redText }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Minimalist Tab Navigation Bar */}
          <div className="flex border rounded-md overflow-hidden p-0.5 text-xs font-medium" style={{ background: theme.subtleBg, borderColor: theme.border }}>
            {[
              { key: 'info', label: 'Account Info' },
              { key: 'media', label: 'Photo & Signature' },
              { key: 'mesin', label: 'Attendance Machine' },
              ...(editingUser ? [{ key: 'posisi', label: 'Position History' }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFormTab(tab.key)}
                className="flex-1 py-1.5 px-2 rounded text-center transition-all cursor-pointer"
                style={{
                  background: formTab === tab.key ? theme.textPrimary : 'transparent',
                  color: formTab === tab.key ? (isDark ? '#18171A' : '#FFFFFF') : theme.textSecondary,
                  fontWeight: formTab === tab.key ? '600' : '400'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Info Data Diri */}
          {formTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div>
                <Label htmlFor="user_nama_depan" style={{ color: theme.textPrimary }} className="font-medium">First Name <span style={{ color: theme.redText }}>*</span></Label>
                <Input
                  id="user_nama_depan"
                  name="user_nama_depan"
                  value={formData.user_nama_depan}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={submitting}
                  className="mt-1"
                />
                {formErrors.user_nama_depan && (
                  <p className="text-[11px] mt-1" style={{ color: theme.redText }}>{formErrors.user_nama_depan}</p>
                )}
              </div>

              <div>
                <Label htmlFor="user_nama_belakang" style={{ color: theme.textPrimary }} className="font-medium">Last Name <span style={{ color: theme.redText }}>*</span></Label>
                <Input
                  id="user_nama_belakang"
                  name="user_nama_belakang"
                  value={formData.user_nama_belakang}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={submitting}
                  className="mt-1"
                />
                {formErrors.user_nama_belakang && (
                  <p className="text-[11px] mt-1" style={{ color: theme.redText }}>{formErrors.user_nama_belakang}</p>
                )}
              </div>

              <div>
                <Label htmlFor="user_email" style={{ color: theme.textPrimary }} className="font-medium">Google OAuth Email <span className="font-normal" style={{ color: theme.textSecondary }}>(optional)</span></Label>
                <Input
                  id="user_email"
                  name="user_email"
                  type="email"
                  value={formData.user_email}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={submitting}
                  className="mt-1 font-mono text-xs"
                  placeholder="name@ccs.sch.id"
                />
                {formErrors.user_email && (
                  <p className="text-[11px] mt-1" style={{ color: theme.redText }}>{formErrors.user_email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="user_tanggal_lahir" style={{ color: theme.textPrimary }} className="font-medium">Birth Date <span className="font-normal" style={{ color: theme.textSecondary }}>(DD/MM/YYYY)</span></Label>
                <Input
                  id="user_tanggal_lahir"
                  name="user_tanggal_lahir"
                  type="text"
                  value={formData.user_tanggal_lahir || ''}
                  onChange={(e) => {
                    let v = e.target.value.replace(/[^0-9/]/g, '');
                    if (v.length === 2 && !v.includes('/')) v += '/';
                    if (v.length === 5 && v.lastIndexOf('/') === 2) v += '/';
                    handleInputChange({ target: { name: 'user_tanggal_lahir', value: v } });
                  }}
                  disabled={submitting}
                  placeholder="DD/MM/YYYY"
                  maxLength={10}
                  style={inputStyle}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label htmlFor="user_role_id" style={{ color: theme.textPrimary }} className="font-medium">Account Role <span style={{ color: theme.redText }}>*</span></Label>
                <select
                  id="user_role_id"
                  name="user_role_id"
                  value={formData.user_role_id}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="w-full mt-1 px-3 py-2 text-xs"
                  style={selectStyle}
                >
                  <option value="">Select Role</option>
                  {roles.map(role => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name} {role.is_admin ? '(Admin)' : ''}
                    </option>
                  ))}
                </select>
                {formErrors.user_role_id && (
                  <p className="text-[11px] mt-1" style={{ color: theme.redText }}>{formErrors.user_role_id}</p>
                )}
              </div>

              <div>
                <Label htmlFor="user_unit_id" style={{ color: theme.textPrimary }} className="font-medium">Work Unit <span style={{ color: theme.redText }}>*</span></Label>
                <select
                  id="user_unit_id"
                  name="user_unit_id"
                  value={formData.user_unit_id}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="w-full mt-1 px-3 py-2 text-xs"
                  style={selectStyle}
                >
                  <option value="">Select Unit</option>
                  {units.map(unit => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.unit_name}
                    </option>
                  ))}
                </select>
                {formErrors.user_unit_id && (
                  <p className="text-[11px] mt-1" style={{ color: theme.redText }}>{formErrors.user_unit_id}</p>
                )}
              </div>

              {editingUser && (
                <div className="flex items-center space-x-2 md:col-span-2 pt-1">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    disabled={submitting}
                    className="rounded"
                  />
                  <Label htmlFor="is_active" className="text-xs font-medium" style={{ color: theme.textPrimary }}>Active Account Status</Label>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Foto & Tanda Tangan */}
          {formTab === 'media' && (
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-medium mb-1" style={{ color: theme.textPrimary }}>Profile Picture <span className="font-normal" style={{ color: theme.textSecondary }}>(optional)</span></p>
                <input
                  id="user_manual_picture"
                  name="user_manual_picture"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => { setTempImageSrc(reader.result); setShowCropModal(true); };
                      reader.readAsDataURL(file);
                    }
                  }}
                  disabled={submitting || uploadingImage}
                  className="w-full px-3 py-1.5 text-xs rounded border"
                  style={inputStyle}
                />
                {imageFile && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-14 h-14 object-cover rounded-full border" style={{ borderColor: theme.border }} />
                    <span className="text-[11px]" style={{ color: theme.textSecondary }}>Preview new picture ready to upload</span>
                  </div>
                )}
                {!imageFile && formData.user_manual_picture && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={formData.user_manual_picture} alt="Current" className="w-14 h-14 object-cover rounded-full border" style={{ borderColor: theme.border }} />
                    <span className="text-[11px]" style={{ color: theme.textSecondary }}>Current active picture</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3" style={{ borderColor: theme.border }}>
                <p className="font-medium mb-1" style={{ color: theme.textPrimary }}>Digital Signature <span className="font-normal" style={{ color: theme.textSecondary }}>(optional)</span></p>
                <p className="text-[11px] mb-2" style={{ color: theme.textSecondary }}>Used for official documents such as report cards & certificates.</p>
                <ImageCropUploader
                  label="Upload Signature"
                  previewUrl={signaturePreview}
                  uploading={uploadingSignature}
                  inputRef={signatureInputRef}
                  onCropped={(blob) => { setSignatureBlob(blob); setSignaturePreview(URL.createObjectURL(blob)); }}
                  onRemove={() => { setSignatureBlob(null); setSignaturePreview(''); }}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Mesin Absensi & Jadwal */}
          {formTab === 'mesin' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>Attendance Machine PIN</p>
                <p className="text-[11px]" style={{ color: theme.textSecondary }}>Unique PIN to match with fingerprint/attendance machine.</p>
                <Input
                  id="user_pin"
                  name="user_pin"
                  type="text"
                  value={formData.user_pin || ''}
                  onChange={handleInputChange}
                  disabled={submitting}
                  placeholder="Example: 155"
                  style={inputStyle}
                  className="font-mono text-xs"
                />
              </div>

              <div className="p-3 rounded border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>Expected Work Schedule</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px]" style={{ color: theme.textSecondary }}>Expected Check-in Time</label>
                    <Input type="time" name="expected_check_in" value={formData.expected_check_in || ''} onChange={handleInputChange} disabled={submitting} style={inputStyle} className="mt-1 font-mono text-xs" />
                  </div>
                  <div>
                    <label className="text-[11px]" style={{ color: theme.textSecondary }}>Expected Check-out Time</label>
                    <Input type="time" name="expected_check_out" value={formData.expected_check_out || ''} onChange={handleInputChange} disabled={submitting} style={inputStyle} className="mt-1 font-mono text-xs" />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>Join Date</p>
                <Input
                  type="date"
                  name="join_date"
                  value={formData.join_date || ''}
                  onChange={handleInputChange}
                  disabled={submitting}
                  style={inputStyle}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Posisi History */}
          {formTab === 'posisi' && editingUser && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-semibold" style={{ color: theme.textPrimary }}>Position History</p>
                {!showAddPos && (
                  <button
                    type="button"
                    onClick={() => { setShowAddPos(true); setEditingPosId(null); setNewPosTitle(''); setNewPosStart(''); setNewPosEnd(''); setNewPosNotes(''); }}
                    className="px-2.5 py-1 rounded text-xs font-medium cursor-pointer"
                    style={btnPrimaryStyle}
                  >
                    + Add Position
                  </button>
                )}
              </div>

              {showAddPos && (
                <div className="p-3 rounded border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                  <p className="font-medium" style={{ color: theme.textPrimary }}>{editingPosId ? 'Edit Position' : 'Add Position'}</p>
                  <input
                    type="text"
                    value={newPosTitle}
                    onChange={e => setNewPosTitle(e.target.value)}
                    placeholder="Position title..."
                    className="w-full px-3 py-1.5 rounded border text-xs"
                    style={inputStyle}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={newPosStart} onChange={e => setNewPosStart(e.target.value)} className="px-2 py-1 rounded border text-xs font-mono" style={inputStyle} />
                    <input type="date" value={newPosEnd} onChange={e => setNewPosEnd(e.target.value)} className="px-2 py-1 rounded border text-xs font-mono" style={inputStyle} />
                  </div>
                  {posHistMsg && <p className="text-[11px]" style={{ color: theme.redText }}>{posHistMsg}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={handleSavePosition} className="px-3 py-1 rounded text-xs cursor-pointer" style={btnPrimaryStyle}>Save</button>
                    <button type="button" onClick={resetPosForm} className="px-3 py-1 rounded text-xs cursor-pointer" style={btnSecondaryStyle}>Cancel</button>
                  </div>
                </div>
              )}

              {posHistLoading ? (
                <p className="text-center py-3 text-xs" style={{ color: theme.textSecondary }}>Loading history...</p>
              ) : positionHistory.length === 0 ? (
                <p className="text-center py-3 text-xs" style={{ color: theme.textSecondary }}>No position history found.</p>
              ) : (
                <div className="space-y-1.5">
                  {positionHistory.map(pos => (
                    <div key={pos.id} className="p-2.5 rounded border flex items-center justify-between gap-2" style={{ background: theme.cardBg, borderColor: theme.border }}>
                      <div>
                        <p className="font-medium" style={{ color: theme.textPrimary }}>{pos.position_title}</p>
                        <p className="text-[11px] font-mono" style={{ color: theme.textSecondary }}>{pos.start_date} → {pos.end_date || 'present'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleEditPosition(pos)} className="px-2 py-0.5 text-[11px] border rounded cursor-pointer" style={btnSecondaryStyle}>Edit</button>
                        <button type="button" onClick={() => handleDeletePosition(pos.id)} className="px-2 py-0.5 text-[11px] rounded cursor-pointer" style={{ background: theme.redBg, color: theme.redText }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
              style={btnSecondaryStyle}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50"
              style={btnPrimaryStyle}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (editingUser ? 'Update User' : 'Save User')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Import Users Modal ─── */}
      <Modal
        isOpen={showImportModal}
        onClose={resetImportModal}
        title="Import Users from CSV File"
        size="lg"
        containerStyle={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
        headerStyle={{ borderBottom: `1px solid ${theme.border}` }}
        titleStyle={{ color: theme.textPrimary, fontSize: '16px', fontWeight: '600' }}
      >
        <div className="space-y-4 text-xs">
          <div>
            <Label htmlFor="csv-file" className="text-xs font-medium" style={{ color: theme.textPrimary }}>
              Select CSV File
            </Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full mt-1 px-3 py-2 rounded border text-xs"
              style={inputStyle}
            />
          </div>

          <div className="p-3.5 rounded border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
            <h4 className="font-semibold mb-1" style={{ color: theme.textPrimary }}>CSV Column Format:</h4>
            <p className="mb-2 text-[11px]" style={{ color: theme.textSecondary }}>Use comma (,) or semicolon (;) delimiter:</p>
            <ul className="text-[11px] font-mono space-y-1 list-disc list-inside" style={{ color: theme.textSecondary }}>
              <li>nama_depan (required)</li>
              <li>nama_belakang (required)</li>
              <li>email (optional, @ccs.sch.id)</li>
              <li>role (required: {roles.map(r => r.role_name).join(', ') || 'Loading...'})</li>
              <li>unit (optional: {units.map(u => u.unit_name).join(', ') || 'Loading...'})</li>
              <li>status (optional: active / inactive)</li>
            </ul>
          </div>

          {importErrors.length > 0 && (
            <div className="p-3 rounded border text-xs" style={{ background: theme.redBg, borderColor: theme.redBg, color: theme.redText }}>
              <h4 className="font-semibold mb-1">Validation Errors ({importErrors.length} rows):</h4>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {importErrors.map((err, idx) => (
                  <p key={idx} className="text-[11px]">Row {err.row}: {err.errors.join(', ')}</p>
                ))}
              </div>
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="p-3 rounded border text-xs" style={{ background: theme.greenBg, borderColor: theme.greenBg, color: theme.greenText }}>
              <h4 className="font-semibold mb-1">Valid Users Ready to Import ({importPreview.length}):</h4>
              <div className="max-h-28 overflow-y-auto font-mono text-[11px]">
                {importPreview.slice(0, 5).map((u, i) => (
                  <p key={i}>• {u.user_nama_depan} {u.user_nama_belakang} ({u.user_email || 'No email'})</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
            <button
              onClick={resetImportModal}
              className="px-4 py-2 text-xs font-medium rounded cursor-pointer"
              style={btnSecondaryStyle}
            >
              Cancel
            </button>
            <button
              onClick={processBulkImport}
              disabled={importPreview.length === 0 || isImporting}
              className="px-4 py-2 text-xs font-medium rounded cursor-pointer disabled:opacity-50"
              style={btnPrimaryStyle}
            >
              {isImporting ? 'Importing...' : `Process Import (${importPreview.length} Users)`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Safety Verification Modal ─── */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          if (!deleteModal.isDeleting) setDeleteModal(prev => ({ ...prev, isOpen: false }))
        }}
        title={deleteModal.canDelete ? "Confirm User Deletion" : "User Data Protection"}
        size="md"
        containerStyle={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
        headerStyle={{ borderBottom: `1px solid ${theme.border}` }}
        titleStyle={{ color: theme.textPrimary, fontSize: '16px', fontWeight: '600' }}
      >
        <div className="space-y-4 text-xs">
          {deleteModal.isChecking ? (
            <div className="py-8 text-center space-y-3">
              <FontAwesomeIcon icon={faSpinner} spin className="text-xl" style={{ color: theme.textPrimary }} />
              <p className="font-medium" style={{ color: theme.textSecondary }}>Checking user data dependencies...</p>
            </div>
          ) : !deleteModal.canDelete ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded border text-xs" style={{ background: theme.redBg, borderColor: theme.redBg, color: theme.redText }}>
                <div className="flex items-start gap-2.5">
                  <FontAwesomeIcon icon={faBan} className="text-sm mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-xs mb-1">User Cannot Be Deleted</h4>
                    <p className="text-[11px] opacity-90">
                      User <span className="font-bold">{deleteModal.user?.user_nama_depan} {deleteModal.user?.user_nama_belakang || ''}</span> (ID #{deleteModal.user?.user_id}) has active history records in the system:
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <h5 className="font-semibold mb-1.5 text-xs" style={{ color: theme.textPrimary }}>Data Dependency Details:</h5>
                <ul className="space-y-1 list-disc list-inside text-[11px] font-mono" style={{ color: theme.redText }}>
                  {deleteModal.blockers.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 rounded text-[11px]" style={{ background: theme.blueBg, color: theme.blueText }}>
                Suggestion: You can change the account status to <strong>"Inactive"</strong> in the Edit menu.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-medium rounded cursor-pointer"
                  style={btnSecondaryStyle}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded border text-xs" style={{ background: theme.yellowBg, borderColor: theme.yellowBg, color: theme.yellowText }}>
                <div className="flex items-start gap-2.5">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-xs mb-1">Confirm Account Deletion</h4>
                    <p className="text-[11px]">
                      Are you sure you want to permanently delete <span className="font-bold">{deleteModal.user?.user_nama_depan} {deleteModal.user?.user_nama_belakang || ''}</span> (ID #{deleteModal.user?.user_id})?
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  disabled={deleteModal.isDeleting}
                  onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-medium rounded cursor-pointer"
                  style={btnSecondaryStyle}
                >
                  Cancel
                </button>
                <button
                  disabled={deleteModal.isDeleting}
                  onClick={handleConfirmDeleteUser}
                  className="px-4 py-2 text-xs font-medium text-white rounded cursor-pointer disabled:opacity-50"
                  style={{ background: theme.redText }}
                >
                  {deleteModal.isDeleting ? 'Deleting...' : 'Yes, Delete User'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

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
