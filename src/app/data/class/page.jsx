'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

export default function ClassManagement() {
  const { t } = useI18n();
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    kelas_nama: '',
    kelas_user_id: '',
    kelas_unit_id: '',
    kelas_year_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Manage Subjects modal states
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState([]); // current from DB
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]); // UI selection
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsSaving, setSubjectsSaving] = useState(false);
  
  // Manage Students modal states
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]); // users with is_student=true
  const [assignedStudentIds, setAssignedStudentIds] = useState([]); // from detail_siswa
  const [selectedStudentIds, setSelectedStudentIds] = useState([]); // UI selection
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsSaving, setStudentsSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  // Students already assigned to another class in the same year
  const [yearConflictByUser, setYearConflictByUser] = useState(new Map()); // user_id -> { kelas_id, kelas_nama }
  
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

  // Cache roles for display
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetchClasses();
    fetchUsers();
    fetchUnits();
    fetchYears();
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
      
      // Fetch classes terlebih dahulu dengan year_id
      const { data: classesData, error: classesError } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama, kelas_user_id, kelas_unit_id, kelas_year_id')
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

      // Fetch years untuk mendapatkan nama year
      const { data: yearsData, error: yearsError } = await supabase
        .from('year')
        .select('year_id, year_name');

      if (yearsError) {
        throw new Error(yearsError.message);
      }

      // Transform data dengan menggabungkan informasi dari keempat tabel
      const transformedData = classesData.map(kelas => {
        const user = usersData.find(u => u.user_id === kelas.kelas_user_id);
        const unit = unitsData.find(u => u.unit_id === kelas.kelas_unit_id);
        const year = yearsData.find(y => y.year_id === kelas.kelas_year_id);
        
        return {
          kelas_id: kelas.kelas_id,
          kelas_nama: kelas.kelas_nama,
          kelas_user_id: kelas.kelas_user_id,
          kelas_unit_id: kelas.kelas_unit_id,
          kelas_year_id: kelas.kelas_year_id,
          user_nama_depan: user?.user_nama_depan || '',
          user_nama_belakang: user?.user_nama_belakang || '',
          unit_name: unit?.unit_name || '',
          year_name: year?.year_name || ''
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
  setRoles(rolesData || []);
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

  const fetchYears = async () => {
    try {
      // Menggunakan Supabase untuk fetch years
      const { data, error } = await supabase
        .from('year')
        .select('year_id, year_name')
        .order('year_name');

      if (error) {
        throw new Error(error.message);
      }

      setYears(data || []);
    } catch (err) {
      console.error('Error fetching years:', err);
    }
  };

  // Open Manage Subjects modal for a class
  const openManageSubjects = async (kelas) => {
    setSelectedClassForSubjects(kelas);
    setSubjectModalOpen(true);
    setAvailableSubjects([]);
    setAssignedSubjectIds([]);
    setSelectedSubjectIds([]);
    setSubjectsLoading(true);

    try {
      // Fetch subjects for the same unit as the class (recommended)
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name, subject_unit_id')
        .eq('subject_unit_id', kelas.kelas_unit_id)
        .order('subject_name');

      if (subjectsError) throw new Error(subjectsError.message);

      // Fetch existing assignments from detail_kelas
      const { data: details, error: detailError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_subject_id')
        .eq('detail_kelas_kelas_id', kelas.kelas_id);

      if (detailError) throw new Error(detailError.message);

      const assignedIds = (details || []).map(d => d.detail_kelas_subject_id);
      setAvailableSubjects(subjectsData || []);
      setAssignedSubjectIds(assignedIds);
      setSelectedSubjectIds(assignedIds);

    } catch (err) {
  console.error('Error opening Manage Subjects:', err);
  showNotification(t('classManagement.notifErrorTitle') || 'Error', (t('classManagement.loadSubjectsErrorPrefix') || 'Failed to load subjects/relations: ') + err.message, 'error');
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Open Manage Students modal for a class
  const openManageStudents = async (kelas) => {
    setSelectedClassForStudents(kelas);
    setStudentModalOpen(true);
    setAvailableStudents([]);
    setAssignedStudentIds([]);
    setSelectedStudentIds([]);
    setStudentsLoading(true);

    try {
      // Determine student roles (role.is_student = true)
      const { data: studentRoles, error: studentRolesErr } = await supabase
        .from('role')
        .select('role_id, role_name, is_student')
        .eq('is_student', true);
      if (studentRolesErr) throw new Error(studentRolesErr.message);

      const studentRoleIds = (studentRoles || []).map(r => r.role_id);

      // Fetch users whose role is a student role
      let studentsData = [];
      if (studentRoleIds.length > 0) {
        const { data: uData, error: usersError } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_username, user_role_id')
          .eq('is_active', true)
          .in('user_role_id', studentRoleIds)
          .order('user_nama_depan');
        if (usersError) throw new Error(usersError.message);
        studentsData = uData || [];
      }

      // Attach role names (merge roles cache with fetched studentRoles)
      const combinedRoles = [...(roles || []), ...(studentRoles || [])];
      const roleMap = new Map(combinedRoles.map(r => [r.role_id, r.role_name]));
      const studentsWithRole = (studentsData || []).map(u => ({
        ...u,
        role_name: roleMap.get(u.user_role_id) || 'Student'
      }));

      // Fetch existing assignments from detail_siswa
      const { data: details, error: detailErr } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', kelas.kelas_id);
      if (detailErr) throw new Error(detailErr.message);

      const assignedIds = (details || []).map(d => d.detail_siswa_user_id);
      // Find conflicts within same academic year
      const sameYearClassIds = classes
        .filter(c => c.kelas_year_id === kelas.kelas_year_id)
        .map(c => c.kelas_id);

      let conflictMap = new Map();
      if (sameYearClassIds.length > 0) {
        const { data: allYearDetails, error: yearDetailsErr } = await supabase
          .from('detail_siswa')
          .select('detail_siswa_user_id, detail_siswa_kelas_id')
          .in('detail_siswa_kelas_id', sameYearClassIds);
        if (yearDetailsErr) throw new Error(yearDetailsErr.message);

        const kelasMap = new Map(classes.map(c => [c.kelas_id, c.kelas_nama]));
        for (const row of (allYearDetails || [])) {
          // Record only if assigned to a different class than currently opened
          if (row.detail_siswa_kelas_id !== kelas.kelas_id) {
            conflictMap.set(row.detail_siswa_user_id, {
              kelas_id: row.detail_siswa_kelas_id,
              kelas_nama: kelasMap.get(row.detail_siswa_kelas_id) || ''
            });
          }
        }
      }

      setYearConflictByUser(conflictMap);
      setAvailableStudents(studentsWithRole);
      setAssignedStudentIds(assignedIds);
      setSelectedStudentIds(assignedIds);
    } catch (err) {
  console.error('Error opening Manage Students:', err);
  showNotification(t('classManagement.notifErrorTitle') || 'Error', (t('classManagement.loadStudentsErrorPrefix') || 'Failed to load students/relations: ') + err.message, 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleStudentSelection = (userId) => {
  // Prevent selecting students who are already assigned to another class in the same year
  if (yearConflictByUser.has(userId)) return;
    setSelectedStudentIds(prev => {
      const set = new Set(prev);
      if (set.has(userId)) set.delete(userId); else set.add(userId);
      return Array.from(set);
    });
  };

  const saveStudents = async () => {
    if (!selectedClassForStudents) return;
    setStudentsSaving(true);
    try {
      const existing = new Set(assignedStudentIds);
      const selected = new Set(selectedStudentIds);
  // toAdd excludes users with conflicts in same year
  const toAddRaw = Array.from(selected).filter(id => !existing.has(id));
  const toAdd = toAddRaw.filter(id => !yearConflictByUser.has(id));
      const toRemove = Array.from(existing).filter(id => !selected.has(id));

      // Insert new relations
      if (toAdd.length > 0) {
        const rows = toAdd.map(userId => ({
          detail_siswa_user_id: userId,
          detail_siswa_kelas_id: selectedClassForStudents.kelas_id
        }));
        const { error: insertErr } = await supabase
          .from('detail_siswa')
          .insert(rows);
        if (insertErr) throw new Error(insertErr.message);
      }

      // Delete removed relations
      if (toRemove.length > 0) {
        const { error: deleteErr } = await supabase
          .from('detail_siswa')
          .delete()
          .eq('detail_siswa_kelas_id', selectedClassForStudents.kelas_id)
          .in('detail_siswa_user_id', toRemove);
        if (deleteErr) throw new Error(deleteErr.message);
      }

      setAssignedStudentIds(selectedStudentIds);
      showNotification(t('classManagement.notifSuccessTitle') || 'Success', t('classManagement.studentsSaved') || 'Class-student relations saved successfully.', 'success');
      setStudentModalOpen(false);
      setSelectedClassForStudents(null);
      // If there were blocked students, notify
      const blocked = toAddRaw.filter(id => yearConflictByUser.has(id));
      if (blocked.length > 0) {
        const name = (id) => {
          const u = availableStudents.find(s => s.user_id === id);
          return u ? `${u.user_nama_depan} ${u.user_nama_belakang}` : `User ${id}`;
        };
        const details = blocked.map(id => {
          const info = yearConflictByUser.get(id);
          const line = t('classManagement.partialItem', { name: name(id), class: info?.kelas_nama || info?.kelas_id || '?' });
          return line || `- ${name(id)} (already in class ${info?.kelas_nama || info?.kelas_id || '?'})`;
        }).join('\n');
        showNotification(t('classManagement.studentsPartialTitle') || 'Some not saved', (t('classManagement.studentsPartialMessagePrefix') || 'Some students couldn\'t be added because they\'re already assigned to another class in the same academic year:') + '\n' + details, 'error');
      }
    } catch (err) {
      showNotification(t('classManagement.notifErrorTitle') || 'Error', (t('classManagement.saveStudentsErrorPrefix') || 'Failed to save student relations: ') + err.message, 'error');
    } finally {
      setStudentsSaving(false);
    }
  };

  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjectIds(prev => {
      const set = new Set(prev);
      if (set.has(subjectId)) set.delete(subjectId); else set.add(subjectId);
      return Array.from(set);
    });
  };

  const saveSubjects = async () => {
    if (!selectedClassForSubjects) return;
    setSubjectsSaving(true);
    try {
      const existing = new Set(assignedSubjectIds);
      const selected = new Set(selectedSubjectIds);
      const toAdd = Array.from(selected).filter(id => !existing.has(id));
      const toRemove = Array.from(existing).filter(id => !selected.has(id));

      // Insert new relations
      if (toAdd.length > 0) {
        const rows = toAdd.map(subjectId => ({
          detail_kelas_subject_id: subjectId,
          detail_kelas_kelas_id: selectedClassForSubjects.kelas_id
        }));
        const { error: insertErr } = await supabase
          .from('detail_kelas')
          .insert(rows);
        if (insertErr) throw new Error(insertErr.message);
      }

      // Delete removed relations
      if (toRemove.length > 0) {
        const { error: deleteErr } = await supabase
          .from('detail_kelas')
          .delete()
          .eq('detail_kelas_kelas_id', selectedClassForSubjects.kelas_id)
          .in('detail_kelas_subject_id', toRemove);
        if (deleteErr) throw new Error(deleteErr.message);
      }

  setAssignedSubjectIds(selectedSubjectIds);
  showNotification(t('classManagement.notifSuccessTitle') || 'Success', t('classManagement.subjectsSaved') || 'Class-subject relations saved successfully.', 'success');
      setSubjectModalOpen(false);
      setSelectedClassForSubjects(null);
    } catch (err) {
  showNotification(t('classManagement.notifErrorTitle') || 'Error', (t('classManagement.saveSubjectsErrorPrefix') || 'Failed to save subject relations: ') + err.message, 'error');
    } finally {
      setSubjectsSaving(false);
    }
  };

  const processErrorMessage = (errorMessage) => {
    const message = errorMessage?.toLowerCase() || '';
    
    // Handle duplicate class name
    if (message.includes('duplicate key value violates unique constraint') && 
        message.includes('kelas_nama')) {
  return t('classManagement.classNameDuplicate') || 'Class name already in use. Please choose a different name.';
    }
    
    // Handle foreign key constraint
    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
  return t('classManagement.invalidSelection') || 'Invalid selection. Please ensure homeroom teacher and unit are correct.';
    }
    
    // Handle required fields
    if (message.includes('all fields are required') || message.includes('cannot be null')) {
  return t('classManagement.requiredFields') || 'All fields are required.';
    }
    
    // Handle connection errors
    if (message.includes('connection') || message.includes('network')) {
  return t('classManagement.connectionError') || 'Connection issue. Please try again.';
    }
    
    // Handle server errors
    if (message.includes('server error') || message.includes('internal server error')) {
  return t('classManagement.serverError') || 'Server error. Please try again or contact administrator.';
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
  errors.kelas_nama = t('classManagement.validation.classNameRequired') || 'Class name is required';
    } else if (formData.kelas_nama.length < 2) {
  errors.kelas_nama = t('classManagement.validation.classNameMin') || 'Class name must be at least 2 characters';
    }
    
    if (!formData.kelas_user_id) {
  errors.kelas_user_id = t('classManagement.validation.waliKelasRequired') || 'Homeroom teacher is required';
    }
    
    if (!formData.kelas_unit_id) {
  errors.kelas_unit_id = t('classManagement.validation.unitRequired') || 'Unit is required';
    }

    if (!formData.kelas_year_id) {
  errors.kelas_year_id = t('classManagement.validation.yearRequired') || 'Academic year is required';
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
        kelas_unit_id: Number(formData.kelas_unit_id),
        kelas_year_id: Number(formData.kelas_year_id)
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
        kelas_unit_id: '',
        kelas_year_id: ''
      });
      setError('');
      showNotification(
        t('classManagement.notifSuccessTitle') || 'Success',
        editingClass ? (t('classManagement.classUpdated') || 'Class updated successfully') : (t('classManagement.classCreated') || 'Class created successfully'),
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
      kelas_unit_id: kelas.kelas_unit_id,
      kelas_year_id: kelas.kelas_year_id
    });
    setShowForm(true);
    setFormErrors({});
    setError('');
  };

  const handleDelete = async (kelas) => {
    if (!confirm(t('classManagement.confirmDeleteQuestion', { name: kelas.kelas_nama }) || `Are you sure you want to delete class "${kelas.kelas_nama}"?`)) {
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
        t('classManagement.notifSuccessTitle') || 'Success',
        t('classManagement.deleted') || 'Class deleted successfully!',
        'success'
      );
    } catch (err) {
      const friendlyErrorMessage = processErrorMessage(err.message);
      showNotification(t('classManagement.notifErrorTitle') || 'Error', friendlyErrorMessage, 'error');
    }
  };

  const handleAddNew = () => {
    setEditingClass(null);
    setFormData({
      kelas_nama: '',
      kelas_user_id: '',
      kelas_unit_id: '',
      kelas_year_id: ''
    });
    setShowForm(true);
    setFormErrors({});
    setError('');
  };

  const filteredClasses = getFilteredClasses();

  if (loading) {
    return <div className="flex justify-center items-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('classManagement.title') || 'Class Management'}</h1>
        <Button onClick={handleAddNew}>
          {t('classManagement.addNew') || '+ Add Class'}
        </Button>
      </div>

      {/* Filter Section */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('classManagement.filtersTitle') || 'Filters'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-unit">{t('classManagement.filterByUnit') || 'Filter by Unit'}</Label>
                <select
                  id="filter-unit"
                  value={filters.unit}
                  onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">{t('classManagement.allUnits') || 'All Units'}</option>
                  {getUniqueUnits().map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="filter-wali-kelas">{t('classManagement.filterByWaliKelas') || 'Filter by Homeroom Teacher'}</Label>
                <Input
                  id="filter-wali-kelas"
                  placeholder={t('classManagement.filterByWaliKelasPlaceholder') || 'Search homeroom teacher...'}
                  value={filters.waliKelas}
                  onChange={(e) => setFilters(prev => ({ ...prev, waliKelas: e.target.value }))}
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.unit || filters.waliKelas) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">{t('classManagement.activeFilters') || 'Active filters:'}</span>
                {filters.unit && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t('classManagement.unit') || 'Unit'}: {filters.unit}
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
                    {t('classManagement.waliKelas') || 'Homeroom Teacher'}: {filters.waliKelas}
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
                  {t('classManagement.clearFilters') || 'Clear all filters'}
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
            {t('classManagement.listTitle') || 'Class List'}
            {filteredClasses.length !== classes.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                {t('classManagement.listCount', { filtered: filteredClasses.length, total: classes.length }) || `(${filteredClasses.length} of ${classes.length} classes)`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {classes.length === 0 
                ? (t('classManagement.emptyNone') || 'No classes yet. Add your first class!')
                : (t('classManagement.emptyNoMatch') || 'No classes match the selected filters.')
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('classManagement.thId') || 'ID'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('classManagement.thClassName') || 'Class Name'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('classManagement.thWaliKelas') || 'Homeroom Teacher'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('classManagement.thUnit') || 'Unit'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('classManagement.thYear') || 'Academic Year'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('classManagement.thActions') || 'Actions'}</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {kelas.year_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(kelas)}>
                          {t('classManagement.edit') || 'Edit'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageSubjects(kelas)}
                        >
                          {t('classManagement.manageSubjects') || 'Manage Subjects'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageStudents(kelas)}
                        >
                          {t('classManagement.manageStudents') || 'Manage Students'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(kelas)}
                          className="text-red-600 hover:text-red-800"
                        >
                          {t('classManagement.delete') || 'Delete'}
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
            {editingClass ? (t('classManagement.editTitle') || 'Edit Class') : (t('classManagement.createTitle') || 'Add New Class')}
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="kelas_nama">{t('classManagement.classNameLabel') || 'Class Name *'}</Label>
              <Input
                id="kelas_nama"
                type="text"
                placeholder={t('classManagement.classNamePlaceholder') || 'Enter class name'}
                value={formData.kelas_nama}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_nama: e.target.value }))}
                className={formErrors.kelas_nama ? 'border-red-500' : ''}
              />
              {formErrors.kelas_nama && (
                <p className="text-red-500 text-sm mt-1">{formErrors.kelas_nama}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kelas_user_id">{t('classManagement.waliKelasLabel') || 'Homeroom Teacher *'}</Label>
              <select
                id="kelas_user_id"
                value={formData.kelas_user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_user_id: e.target.value }))}
                className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  formErrors.kelas_user_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{t('classManagement.selectWaliKelas') || 'Select Homeroom Teacher'}</option>
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
              <Label htmlFor="kelas_unit_id">{t('classManagement.unitLabel') || 'Unit *'}</Label>
              <select
                id="kelas_unit_id"
                value={formData.kelas_unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_unit_id: e.target.value }))}
                className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  formErrors.kelas_unit_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{t('classManagement.selectUnit') || 'Select Unit'}</option>
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

            <div>
              <Label htmlFor="kelas_year_id">{t('classManagement.yearLabel') || 'Academic Year *'}</Label>
              <select
                id="kelas_year_id"
                value={formData.kelas_year_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_year_id: e.target.value }))}
                className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  formErrors.kelas_year_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{t('classManagement.selectYear') || 'Select Academic Year'}</option>
                {years.map((year) => (
                  <option key={year.year_id} value={year.year_id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
              {formErrors.kelas_year_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.kelas_year_id}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
              {t('classManagement.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (t('classManagement.saving') || 'Saving...') : (editingClass ? (t('classManagement.updateClass') || 'Update Class') : (t('classManagement.createClass') || 'Add Class'))}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Students Modal */}
      <Modal isOpen={studentModalOpen} onClose={() => setStudentModalOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t('classManagement.manageStudentsTitle', { class: selectedClassForStudents?.kelas_nama || '' }) || `Manage Students for Class ${selectedClassForStudents?.kelas_nama || ''}`}</h2>

          {studentsLoading ? (
            <div className="text-gray-600">{t('classManagement.loadingStudents') || 'Loading students...'}</div>
          ) : (
            <>
              {availableStudents.length === 0 ? (
                <div className="text-gray-500">{t('classManagement.emptyStudents') || 'No students available.'}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="student-search">{t('classManagement.studentSearchLabel') || 'Search Students'}</Label>
                    <Input
                      id="student-search"
                      placeholder={t('classManagement.studentSearchPlaceholder') || 'Type student name...'}
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="max-h-72 overflow-auto border rounded-md p-3 mt-2">
                    <ul className="space-y-2">
                      {availableStudents
                        .filter(s =>
                          !studentSearch ||
                          `${s.user_nama_depan} ${s.user_nama_belakang}`
                            .toLowerCase()
                            .includes(studentSearch.toLowerCase())
                        )
                        .map(stu => (
                          <li key={stu.user_id} className="flex items-center gap-3">
                            <input
                              id={`stu-${stu.user_id}`}
                              type="checkbox"
                              checked={selectedStudentIds.includes(stu.user_id)}
                              onChange={() => toggleStudentSelection(stu.user_id)}
                              disabled={yearConflictByUser.has(stu.user_id)}
                            />
                            <label htmlFor={`stu-${stu.user_id}`} className="cursor-pointer">
                              {stu.user_nama_depan} {stu.user_nama_belakang} {stu.role_name ? `(${stu.role_name})` : ''}
                              {yearConflictByUser.has(stu.user_id) && (
                                <span className="ml-2 text-xs text-red-600">{t('classManagement.conflictNote', { class: yearConflictByUser.get(stu.user_id)?.kelas_nama || yearConflictByUser.get(stu.user_id)?.kelas_id }) || `(already in class ${yearConflictByUser.get(stu.user_id)?.kelas_nama || yearConflictByUser.get(stu.user_id)?.kelas_id})`}</span>
                              )}
                            </label>
                          </li>
                        ))}
                    </ul>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStudentModalOpen(false)} disabled={studentsSaving}>
                  {t('classManagement.cancel') || 'Cancel'}
                </Button>
                <Button type="button" onClick={saveStudents} disabled={studentsSaving}>
                  {studentsSaving ? (t('classManagement.saving') || 'Saving...') : (t('classManagement.save') || 'Save')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Manage Subjects Modal */}
      <Modal isOpen={subjectModalOpen} onClose={() => setSubjectModalOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t('classManagement.manageSubjectsTitle', { class: selectedClassForSubjects?.kelas_nama || '' }) || `Manage Subjects for Class ${selectedClassForSubjects?.kelas_nama || ''}`}</h2>

          {subjectsLoading ? (
            <div className="text-gray-600">{t('classManagement.loadingSubjects') || 'Loading subjects...'}</div>
          ) : (
            <>
              {availableSubjects.length === 0 ? (
                <div className="text-gray-500">{t('classManagement.emptySubjects') || 'No subjects in this unit.'}</div>
              ) : (
                <div className="max-h-72 overflow-auto border rounded-md p-3">
                  <ul className="space-y-2">
                    {availableSubjects.map(subj => (
                      <li key={subj.subject_id} className="flex items-center gap-3">
                        <input
                          id={`subj-${subj.subject_id}`}
                          type="checkbox"
                          checked={selectedSubjectIds.includes(subj.subject_id)}
                          onChange={() => toggleSubjectSelection(subj.subject_id)}
                        />
                        <label htmlFor={`subj-${subj.subject_id}`} className="cursor-pointer">
                          {subj.subject_name}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSubjectModalOpen(false)} disabled={subjectsSaving}>
                  {t('classManagement.cancel') || 'Cancel'}
                </Button>
                <Button type="button" onClick={saveSubjects} disabled={subjectsSaving}>
                  {subjectsSaving ? (t('classManagement.saving') || 'Saving...') : (t('classManagement.save') || 'Save')}
                </Button>
              </div>
            </>
          )}
        </div>
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
