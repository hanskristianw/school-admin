'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChalkboardTeacher,
  faGraduationCap,
  faBookOpen,
  faUserGraduate,
  faPlus,
  faSearch,
  faFilter,
  faBuilding,
  faCalendarAlt,
  faEdit,
  faTrash,
  faSlidersH,
  faSpinner,
  faThLarge,
  faList,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faUserCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

export default function ClassManagement() {
  const { t } = useI18n();
  const { theme, isDark } = useTheme();

  // Dynamic Styles tied to useTheme() (100% Light & Dark Mode Compatible)
  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '8px' };
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '8px' };
  const btnPrimaryStyle = { background: theme.textPrimary, color: isDark ? '#18171A' : '#FFFFFF', border: 'none' };
  const btnSecondaryStyle = { background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}` };

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');

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
  const [subjectMypYearMap, setSubjectMypYearMap] = useState({}); // { [subject_id]: { s1: myp_year, s2: myp_year } }
  const [detailKelasIdMap, setDetailKelasIdMap] = useState({}); // { [subject_id]: detail_kelas_id }
  const [teacherOverrideMap, setTeacherOverrideMap] = useState({}); // { [subject_id]: teacher_user_id | null }
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
    year: '',
    unit: '',
    waliKelas: '',
    search: ''
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
      
      const { data: classesData, error: classesError } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama, kelas_user_id, kelas_unit_id, kelas_year_id')
        .order('kelas_id');

      if (classesError) {
        throw new Error(classesError.message);
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang');

      if (usersError) {
        throw new Error(usersError.message);
      }

      const { data: unitsData, error: unitsError } = await supabase
        .from('unit')
        .select('unit_id, unit_name');

      if (unitsError) {
        throw new Error(unitsError.message);
      }

      const { data: yearsData, error: yearsError } = await supabase
        .from('year')
        .select('year_id, year_name');

      if (yearsError) {
        throw new Error(yearsError.message);
      }

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
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
        .eq('is_active', true)
        .order('user_nama_depan');

      if (usersError) throw new Error(usersError.message);

      const { data: rolesData, error: rolesError } = await supabase
        .from('role')
        .select('role_id, role_name');

      if (rolesError) throw new Error(rolesError.message);

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
      const { data, error } = await supabase
        .from('unit')
        .select('unit_id, unit_name')
        .order('unit_name');

      if (error) throw new Error(error.message);
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchYears = async () => {
    try {
      const { data, error } = await supabase
        .from('year')
        .select('year_id, year_name, start_date, end_date')
        .order('year_name');

      if (error) throw new Error(error.message);
      setYears(data || []);

      const today = new Date();
      const current = (data || []).find(y => {
        if (!y.start_date || !y.end_date) return false;
        return new Date(y.start_date) <= today && today <= new Date(y.end_date);
      });
      if (current) {
        setFilters(prev => ({ ...prev, year: String(current.year_id) }));
      }
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
    setTeacherOverrideMap({});
    setSubjectsLoading(true);

    try {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name, subject_unit_id')
        .eq('subject_unit_id', kelas.kelas_unit_id)
        .order('subject_name');

      if (subjectsError) throw new Error(subjectsError.message);

      const { data: details, error: detailError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_subject_id, myp_year_s1, myp_year_s2, teacher_user_id')
        .eq('detail_kelas_kelas_id', kelas.kelas_id);

      if (detailError) throw new Error(detailError.message);

      const assignedIds = (details || []).map(d => d.detail_kelas_subject_id);
      const mypMap = {};
      const idMap = {};
      const teacherMap = {};
      (details || []).forEach(d => {
        mypMap[d.detail_kelas_subject_id] = { s1: d.myp_year_s1 ?? 1, s2: d.myp_year_s2 ?? 1 };
        idMap[d.detail_kelas_subject_id] = d.detail_kelas_id;
        teacherMap[d.detail_kelas_subject_id] = d.teacher_user_id ?? null;
      });
      setAvailableSubjects(subjectsData || []);
      setAssignedSubjectIds(assignedIds);
      setSelectedSubjectIds(assignedIds);
      setSubjectMypYearMap(mypMap);
      setDetailKelasIdMap(idMap);
      setTeacherOverrideMap(teacherMap);

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
      const { data: studentRoles, error: studentRolesErr } = await supabase
        .from('role')
        .select('role_id, role_name, is_student')
        .eq('is_student', true);
      if (studentRolesErr) throw new Error(studentRolesErr.message);

      const studentRoleIds = (studentRoles || []).map(r => r.role_id);

      let studentsData = [];
      if (studentRoleIds.length > 0) {
        const { data: uData, error: usersError } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
          .eq('is_active', true)
          .in('user_role_id', studentRoleIds)
          .order('user_nama_depan');
        if (usersError) throw new Error(usersError.message);
        studentsData = uData || [];
      }

      const combinedRoles = [...(roles || []), ...(studentRoles || [])];
      const roleMap = new Map(combinedRoles.map(r => [r.role_id, r.role_name]));
      const studentsWithRole = (studentsData || []).map(u => ({
        ...u,
        role_name: roleMap.get(u.user_role_id) || 'Student'
      }));

      const sameYearClassIds = classes
        .filter(c => c.kelas_year_id === kelas.kelas_year_id)
        .map(c => c.kelas_id);

      const studentsRes = await fetch(
        `/api/class/students?kelas_id=${kelas.kelas_id}&year_kelas_ids=${sameYearClassIds.join(',')}`
      );
      if (!studentsRes.ok) throw new Error('Failed to load student assignments');
      const { assigned: assignedIds, year_details: allYearDetails } = await studentsRes.json();

      const kelasMap = new Map(classes.map(c => [c.kelas_id, c.kelas_nama]));
      const conflictMap = new Map();
      for (const row of (allYearDetails || [])) {
        if (row.detail_siswa_kelas_id !== kelas.kelas_id) {
          conflictMap.set(row.detail_siswa_user_id, {
            kelas_id: row.detail_siswa_kelas_id,
            kelas_nama: kelasMap.get(row.detail_siswa_kelas_id) || ''
          });
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
      const toAddRaw = Array.from(selected).filter(id => !existing.has(id));
      const toAdd = toAddRaw.filter(id => !yearConflictByUser.has(id));
      const toRemove = Array.from(existing).filter(id => !selected.has(id));

      const res = await fetch('/api/class/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas_id: selectedClassForStudents.kelas_id,
          to_add: toAdd,
          to_remove: toRemove,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to save');
      }

      setAssignedStudentIds(selectedStudentIds);
      showNotification(t('classManagement.notifSuccessTitle') || 'Success', t('classManagement.studentsSaved') || 'Class-student relations saved successfully.', 'success');
      setStudentModalOpen(false);
      setSelectedClassForStudents(null);

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

      if (toAdd.length > 0) {
        const rows = toAdd.map(subjectId => ({
          detail_kelas_subject_id: subjectId,
          detail_kelas_kelas_id: selectedClassForSubjects.kelas_id,
          myp_year_s1: subjectMypYearMap[subjectId]?.s1 ?? 1,
          myp_year_s2: subjectMypYearMap[subjectId]?.s2 ?? 1,
          teacher_user_id: teacherOverrideMap[subjectId] || null
        }));
        const { error: insertErr } = await supabase
          .from('detail_kelas')
          .insert(rows);
        if (insertErr) throw new Error(insertErr.message);
      }

      const toKeep = Array.from(selected).filter(id => existing.has(id));
      for (const subjectId of toKeep) {
        if (detailKelasIdMap[subjectId]) {
          const { error: updateErr } = await supabase
            .from('detail_kelas')
            .update({
              myp_year_s1: subjectMypYearMap[subjectId]?.s1 ?? 1,
              myp_year_s2: subjectMypYearMap[subjectId]?.s2 ?? 1,
              teacher_user_id: teacherOverrideMap[subjectId] || null
            })
            .eq('detail_kelas_id', detailKelasIdMap[subjectId]);
          if (updateErr) throw new Error(updateErr.message);
        }
      }

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
    if (message.includes('duplicate key value violates unique constraint') && message.includes('kelas_nama')) {
      return t('classManagement.classNameDuplicate') || 'Class name already in use. Please choose a different name.';
    }
    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      return t('classManagement.invalidSelection') || 'Invalid selection. Please ensure homeroom teacher and unit are correct.';
    }
    if (message.includes('all fields are required') || message.includes('cannot be null')) {
      return t('classManagement.requiredFields') || 'All fields are required.';
    }
    if (message.includes('connection') || message.includes('network')) {
      return t('classManagement.connectionError') || 'Connection issue. Please try again.';
    }
    if (message.includes('server error') || message.includes('internal server error')) {
      return t('classManagement.serverError') || 'Server error. Please try again or contact administrator.';
    }
    return errorMessage;
  };

  // Filter classes based on selected filters
  const filteredClasses = useMemo(() => {
    return classes.filter(kelas => {
      const yearMatch = !filters.year || String(kelas.kelas_year_id) === String(filters.year);
      const unitMatch = !filters.unit || kelas.unit_name === filters.unit;
      const waliKelasMatch = !filters.waliKelas || 
        `${kelas.user_nama_depan} ${kelas.user_nama_belakang}`.toLowerCase().includes(filters.waliKelas.toLowerCase());
      const searchMatch = !filters.search ||
        (kelas.kelas_nama || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        `${kelas.user_nama_depan} ${kelas.user_nama_belakang}`.toLowerCase().includes(filters.search.toLowerCase());
      
      return yearMatch && unitMatch && waliKelasMatch && searchMatch;
    });
  }, [classes, filters]);

  const getUniqueYears = () => {
    const seen = new Map();
    classes.forEach(k => { if (k.kelas_year_id && k.year_name) seen.set(k.kelas_year_id, k.year_name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => String(b.name).localeCompare(String(a.name)));
  };

  const getUniqueUnits = () => {
    const src = filters.year ? classes.filter(k => String(k.kelas_year_id) === String(filters.year)) : classes;
    const unitSet = new Set(src.map(k => k.unit_name).filter(Boolean));
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
    if (!validateForm()) return;

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
        result = await supabase
          .from('kelas')
          .update(submitData)
          .eq('kelas_id', editingClass.kelas_id);
      } else {
        result = await supabase
          .from('kelas')
          .insert([submitData]);
      }

      if (result.error) throw new Error(result.error.message);

      await fetchClasses();
      setShowForm(false);
      setEditingClass(null);
      setFormData({ kelas_nama: '', kelas_user_id: '', kelas_unit_id: '', kelas_year_id: '' });
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

      if (error) throw new Error(error.message);

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

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans antialiased space-y-6" style={{ background: theme.pageBg, color: theme.textPrimary }}>

      {/* ─── High-End Editorial Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b" style={{ borderColor: theme.border }}>
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
            <FontAwesomeIcon icon={faChalkboardTeacher} className="text-xs text-blue-500" />
            <span>Academic Roster & Class Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: theme.textPrimary }}>
            {t('classManagement.title') || 'Class Management'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="inline-flex p-1 rounded-lg border" style={{ background: theme.cardBg, borderColor: theme.border }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <FontAwesomeIcon icon={faThLarge} className="text-[11px]" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <FontAwesomeIcon icon={faList} className="text-[11px]" />
              <span>Table View</span>
            </button>
          </div>

          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            style={btnPrimaryStyle}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>{t('classManagement.addNew')?.replace(/^\+\s*/, '') || 'Add Class'}</span>
          </button>
        </div>
      </div>

      {/* ─── Search & Filter Toolbar (Double-Bezel Shell) ─── */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            
            {/* Quick Search */}
            <div className="relative sm:col-span-1">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
              <Input
                type="text"
                placeholder="Search class name or teacher..."
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                style={inputStyle}
                className="pl-9 text-xs w-full"
              />
            </div>

            {/* Year Filter */}
            <div>
              <select
                value={filters.year}
                onChange={e => setFilters(prev => ({ ...prev, year: e.target.value, unit: '' }))}
                style={selectStyle}
                className="w-full px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="">Semua Tahun Ajaran</option>
                {getUniqueYears().map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            {/* Unit Filter */}
            <div>
              <select
                value={filters.unit}
                onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                style={selectStyle}
                className="w-full px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="">{t('classManagement.allUnits') || 'All Units'}</option>
                {getUniqueUnits().map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Teacher Search */}
            <div>
              <Input
                placeholder={t('classManagement.filterByWaliKelasPlaceholder') || 'Filter by homeroom teacher...'}
                value={filters.waliKelas}
                onChange={(e) => setFilters(prev => ({ ...prev, waliKelas: e.target.value }))}
                style={inputStyle}
                className="text-xs w-full"
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          {(filters.year || filters.unit || filters.waliKelas || filters.search) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs" style={{ borderColor: theme.border }}>
              <span className="font-semibold" style={{ color: theme.textSecondary }}>Active Filters:</span>
              
              {filters.year && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#FBF3DB] text-[#956400] border border-[#F5E6B3]">
                  Tahun: {getUniqueYears().find(y => String(y.id) === String(filters.year))?.name || filters.year}
                  <button onClick={() => setFilters(prev => ({ ...prev, year: '', unit: '' }))} className="hover:text-black font-bold">✕</button>
                </span>
              )}

              {filters.unit && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">
                  Unit: {filters.unit}
                  <button onClick={() => setFilters(prev => ({ ...prev, unit: '' }))} className="hover:text-black font-bold">✕</button>
                </span>
              )}

              {filters.waliKelas && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">
                  Wali Kelas: {filters.waliKelas}
                  <button onClick={() => setFilters(prev => ({ ...prev, waliKelas: '' }))} className="hover:text-black font-bold">✕</button>
                </span>
              )}

              {filters.search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]">
                  Search: {filters.search}
                  <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="hover:text-black font-bold">✕</button>
                </span>
              )}

              <button
                onClick={() => setFilters({ year: '', unit: '', waliKelas: '', search: '' })}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-2"
              >
                Clear all filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="px-4 py-3 rounded-lg border text-xs font-semibold" style={{ background: theme.redBg, borderColor: theme.border, color: theme.redText }}>
          {error}
        </div>
      )}

      {/* ─── CLASS LIST CONTENT (GRID / BENTO VIEW vs TABLE VIEW) ─── */}
      {loading ? (
        <div className="py-16 text-center text-xs flex flex-col items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-blue-500" />
          <span className="font-semibold">Loading class architecture & rosters...</span>
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardContent className="py-16 text-center text-xs" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faChalkboardTeacher} className="text-4xl mb-3 opacity-30" />
            <p className="font-bold text-sm" style={{ color: theme.textPrimary }}>No Classes Found</p>
            <p className="mt-1">
              {classes.length === 0 
                ? (t('classManagement.emptyNone') || 'No classes created yet. Click "+ Add Class" to set up your first class!')
                : (t('classManagement.emptyNoMatch') || 'No classes match the selected filter criteria.')
              }
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* ─── BENTO GRID VIEW (High-End Doppelrand Card Architecture) ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((kelas) => {
            const teacherName = `${kelas.user_nama_depan || ''} ${kelas.user_nama_belakang || ''}`.trim() || 'Unassigned Teacher';

            return (
              <div
                key={kelas.kelas_id}
                className="p-1 rounded-2xl border transition-all duration-300 hover:shadow-md group"
                style={{ background: theme.cardBg, borderColor: theme.border }}
              >
                <div className="p-4 rounded-xl space-y-3" style={{ background: theme.subtleBg }}>
                  
                  {/* Card Header Tag & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">
                        <FontAwesomeIcon icon={faBuilding} className="text-[9px]" />
                        {kelas.unit_name || 'Unit'}
                      </span>
                      <h3 className="text-lg font-bold mt-1 tracking-tight" style={{ color: theme.textPrimary }}>
                        {kelas.kelas_nama}
                      </h3>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textSecondary }}>
                      ID: #{kelas.kelas_id}
                    </span>
                  </div>

                  {/* Class Details */}
                  <div className="space-y-1.5 pt-2 border-t text-xs" style={{ borderColor: theme.border }}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium" style={{ color: theme.textSecondary }}>
                        <FontAwesomeIcon icon={faChalkboardTeacher} className="text-xs text-blue-500" />
                        Homeroom Teacher:
                      </span>
                      <span className="font-bold" style={{ color: theme.textPrimary }}>{teacherName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium" style={{ color: theme.textSecondary }}>
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-xs text-emerald-500" />
                        Academic Year:
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{kelas.year_name || '-'}</span>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="pt-3 border-t grid grid-cols-2 gap-2" style={{ borderColor: theme.border }}>
                    <button
                      onClick={() => openManageSubjects(kelas)}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                    >
                      <FontAwesomeIcon icon={faBookOpen} className="text-[10px]" />
                      <span>Subjects</span>
                    </button>

                    <button
                      onClick={() => openManageStudents(kelas)}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                    >
                      <FontAwesomeIcon icon={faUserGraduate} className="text-[10px]" />
                      <span>Students</span>
                    </button>

                    <button
                      onClick={() => handleEdit(kelas)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      style={btnSecondaryStyle}
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(kelas)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-[#FDEBEC] text-[#9F2F2D] border-[#F8C9CC] hover:bg-red-100"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                      <span>Delete</span>
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ─── TABLE VIEW ─── */
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardHeader className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
            <CardTitle className="text-sm font-bold" style={{ color: theme.textPrimary }}>
              Class Directory ({filteredClasses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="border-b font-semibold uppercase tracking-wider text-[11px]" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Class Name</th>
                  <th className="p-3 text-left">Homeroom Teacher</th>
                  <th className="p-3 text-left">Unit</th>
                  <th className="p-3 text-left">Academic Year</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {filteredClasses.map((kelas) => (
                  <tr key={kelas.kelas_id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold" style={{ color: theme.textSecondary }}>
                      #{kelas.kelas_id}
                    </td>
                    <td className="p-3 font-bold" style={{ color: theme.textPrimary }}>
                      {kelas.kelas_nama}
                    </td>
                    <td className="p-3 font-medium" style={{ color: theme.textPrimary }}>
                      {kelas.user_nama_depan} {kelas.user_nama_belakang}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">
                        {kelas.unit_name}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {kelas.year_name || '-'}
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openManageSubjects(kelas)}
                        className="px-2.5 py-1 text-xs font-bold rounded border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 cursor-pointer"
                      >
                        Subjects
                      </button>
                      <button
                        onClick={() => openManageStudents(kelas)}
                        className="px-2.5 py-1 text-xs font-bold rounded border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 cursor-pointer"
                      >
                        Students
                      </button>
                      <button
                        onClick={() => handleEdit(kelas)}
                        className="px-2.5 py-1 text-xs font-semibold rounded border cursor-pointer"
                        style={btnSecondaryStyle}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(kelas)}
                        className="px-2.5 py-1 text-xs font-semibold rounded border bg-[#FDEBEC] text-[#9F2F2D] border-[#F8C9CC] cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ─── MODAL 1: ADD / EDIT CLASS MODAL ─── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="border-b pb-3" style={{ borderColor: theme.border }}>
            <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
              {editingClass ? (t('classManagement.editTitle') || 'Edit Class Architecture') : (t('classManagement.createTitle') || 'Add New Class')}
            </h2>
            <p className="text-[11px]" style={{ color: theme.textSecondary }}>Assign homeroom teacher, unit, and academic year.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg border font-semibold text-xs" style={{ background: theme.redBg, borderColor: theme.border, color: theme.redText }}>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="kelas_nama" className="block font-semibold mb-1" style={{ color: theme.textPrimary }}>{t('classManagement.classNameLabel') || 'Class Name *'}</Label>
              <Input
                id="kelas_nama"
                type="text"
                required
                placeholder={t('classManagement.classNamePlaceholder') || 'e.g. 7 Humility, MYP 1 Alpha, Grade 10-A'}
                value={formData.kelas_nama}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_nama: e.target.value }))}
                style={inputStyle}
                className="w-full text-xs"
              />
              {formErrors.kelas_nama && (
                <p className="text-red-500 text-[11px] mt-1">{formErrors.kelas_nama}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kelas_user_id" className="block font-semibold mb-1" style={{ color: theme.textPrimary }}>{t('classManagement.waliKelasLabel') || 'Homeroom Teacher *'}</Label>
              <select
                id="kelas_user_id"
                required
                value={formData.kelas_user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_user_id: e.target.value }))}
                style={selectStyle}
                className="w-full p-2.5 text-xs font-semibold focus:outline-none"
              >
                <option value="">{t('classManagement.selectWaliKelas') || '-- Select Homeroom Teacher --'}</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_nama_depan} {user.user_nama_belakang} ({user.role_name})
                  </option>
                ))}
              </select>
              {formErrors.kelas_user_id && (
                <p className="text-red-500 text-[11px] mt-1">{formErrors.kelas_user_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kelas_unit_id" className="block font-semibold mb-1" style={{ color: theme.textPrimary }}>{t('classManagement.unitLabel') || 'Unit *'}</Label>
              <select
                id="kelas_unit_id"
                required
                value={formData.kelas_unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_unit_id: e.target.value }))}
                style={selectStyle}
                className="w-full p-2.5 text-xs font-semibold focus:outline-none"
              >
                <option value="">{t('classManagement.selectUnit') || '-- Select School Unit --'}</option>
                {units.map((unit) => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_name}
                  </option>
                ))}
              </select>
              {formErrors.kelas_unit_id && (
                <p className="text-red-500 text-[11px] mt-1">{formErrors.kelas_unit_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kelas_year_id" className="block font-semibold mb-1" style={{ color: theme.textPrimary }}>{t('classManagement.yearLabel') || 'Academic Year *'}</Label>
              <select
                id="kelas_year_id"
                required
                value={formData.kelas_year_id}
                onChange={(e) => setFormData(prev => ({ ...prev, kelas_year_id: e.target.value }))}
                style={selectStyle}
                className="w-full p-2.5 text-xs font-semibold focus:outline-none"
              >
                <option value="">{t('classManagement.selectYear') || '-- Select Academic Year --'}</option>
                {years.map((year) => (
                  <option key={year.year_id} value={year.year_id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
              {formErrors.kelas_year_id && (
                <p className="text-red-500 text-[11px] mt-1">{formErrors.kelas_year_id}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
              style={btnSecondaryStyle}
            >
              {t('classManagement.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold rounded-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              style={btnPrimaryStyle}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Saving...</span>
                </>
              ) : (
                editingClass ? (t('classManagement.updateClass') || 'Update Class') : (t('classManagement.createClass') || 'Add Class')
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: MANAGE STUDENTS MODAL ─── */}
      <Modal isOpen={studentModalOpen} onClose={() => setStudentModalOpen(false)}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="border-b pb-2" style={{ borderColor: theme.border }}>
            <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
              {t('classManagement.manageStudentsTitle', { class: selectedClassForStudents?.kelas_nama || '' }) || `Manage Students for Class ${selectedClassForStudents?.kelas_nama || ''}`}
            </h2>
            <p className="text-[11px]" style={{ color: theme.textSecondary }}>Select students enrolled in this class roster.</p>
          </div>

          {studentsLoading ? (
            <div className="py-8 text-center" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-1 text-blue-500" />
              <p>{t('classManagement.loadingStudents') || 'Loading student roster...'}</p>
            </div>
          ) : (
            <>
              {availableStudents.length === 0 ? (
                <div className="py-8 text-center" style={{ color: theme.textSecondary }}>
                  {t('classManagement.emptyStudents') || 'No students found in directory.'}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
                    <Input
                      id="student-search"
                      placeholder={t('classManagement.studentSearchPlaceholder') || 'Search student by name...'}
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      style={inputStyle}
                      className="pl-9 text-xs w-full"
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-lg border p-2 space-y-1.5" style={{ borderColor: theme.border, background: theme.subtleBg }}>
                    {availableStudents
                      .filter(s =>
                        !studentSearch ||
                        `${s.user_nama_depan} ${s.user_nama_belakang}`
                          .toLowerCase()
                          .includes(studentSearch.toLowerCase())
                      )
                      .map(stu => {
                        const isConflict = yearConflictByUser.has(stu.user_id);
                        const conflictInfo = yearConflictByUser.get(stu.user_id);
                        const isChecked = selectedStudentIds.includes(stu.user_id);

                        return (
                          <div
                            key={stu.user_id}
                            onClick={() => !isConflict && toggleStudentSelection(stu.user_id)}
                            className={`p-2 rounded-md border flex items-center justify-between transition-all ${
                              isConflict ? 'opacity-50 cursor-not-allowed bg-red-50/50 dark:bg-red-950/20' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                            style={{ borderColor: theme.border, background: isChecked ? theme.cardBg : 'transparent' }}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleStudentSelection(stu.user_id)}
                                disabled={isConflict}
                                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <span className="font-semibold block" style={{ color: theme.textPrimary }}>
                                  {stu.user_nama_depan} {stu.user_nama_belakang}
                                </span>
                                {stu.role_name && (
                                  <span className="text-[10px]" style={{ color: theme.textSecondary }}>{stu.role_name}</span>
                                )}
                              </div>
                            </div>

                            {isConflict && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                                {t('classManagement.conflictNote', { class: conflictInfo?.kelas_nama || conflictInfo?.kelas_id }) || `Already in ${conflictInfo?.kelas_nama || conflictInfo?.kelas_id}`}
                              </span>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.border }}>
                <span className="text-[11px] font-semibold" style={{ color: theme.textSecondary }}>
                  Selected: {selectedStudentIds.length} students
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentModalOpen(false)}
                    disabled={studentsSaving}
                    className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                    style={btnSecondaryStyle}
                  >
                    {t('classManagement.cancel') || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={saveStudents}
                    disabled={studentsSaving}
                    className="px-4 py-2 text-xs font-bold rounded-md cursor-pointer bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {studentsSaving ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        <span>Saving...</span>
                      </>
                    ) : (
                      t('classManagement.save') || 'Save Roster'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ─── MODAL 3: MANAGE SUBJECTS MODAL ─── */}
      <Modal isOpen={subjectModalOpen} onClose={() => setSubjectModalOpen(false)}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="border-b pb-2" style={{ borderColor: theme.border }}>
            <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
              {t('classManagement.manageSubjectsTitle', { class: selectedClassForSubjects?.kelas_nama || '' }) || `Manage Subjects for Class ${selectedClassForSubjects?.kelas_nama || ''}`}
            </h2>
            <p className="text-[11px]" style={{ color: theme.textSecondary }}>Assign unit subjects, teacher overrides, and MYP Year mapping (S1/S2).</p>
          </div>

          {subjectsLoading ? (
            <div className="py-8 text-center" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-1 text-blue-500" />
              <p>{t('classManagement.loadingSubjects') || 'Loading subject relations...'}</p>
            </div>
          ) : (
            <>
              {availableSubjects.length === 0 ? (
                <div className="py-8 text-center" style={{ color: theme.textSecondary }}>
                  {t('classManagement.emptySubjects') || 'No subjects registered for this unit.'}
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-lg border p-3 space-y-2" style={{ borderColor: theme.border, background: theme.subtleBg }}>
                  {availableSubjects.map(subj => {
                    const isSelected = selectedSubjectIds.includes(subj.subject_id);

                    return (
                      <div key={subj.subject_id} className="p-3 rounded-lg border space-y-2" style={{ background: theme.cardBg, borderColor: theme.border }}>
                        <div className="flex items-center justify-between">
                          <label htmlFor={`subj-${subj.subject_id}`} className="flex items-center gap-2 cursor-pointer font-bold text-xs" style={{ color: theme.textPrimary }}>
                            <input
                              id={`subj-${subj.subject_id}`}
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSubjectSelection(subj.subject_id)}
                              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                            />
                            <span>{subj.subject_name}</span>
                          </label>
                        </div>

                        {isSelected && (
                          <div className="pl-6 space-y-2 pt-2 border-t text-xs" style={{ borderColor: theme.border }}>
                            {/* Teacher Override */}
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold w-24 shrink-0" style={{ color: theme.textSecondary }}>Teacher Override:</span>
                              <select
                                value={teacherOverrideMap[subj.subject_id] ?? ''}
                                onChange={e => setTeacherOverrideMap(prev => ({ ...prev, [subj.subject_id]: e.target.value ? Number(e.target.value) : null }))}
                                style={selectStyle}
                                className="text-xs p-1.5 flex-1 focus:outline-none font-medium"
                              >
                                <option value="">— Use Subject Default Teacher —</option>
                                {users.map(u => (
                                  <option key={u.user_id} value={u.user_id}>
                                    {u.user_nama_depan} {u.user_nama_belakang}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* MYP Year S1/S2 Selectors */}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">MYP S1:</span>
                                {[1, 2, 3, 4, 5].map(yr => (
                                  <button
                                    key={yr}
                                    type="button"
                                    onClick={() => setSubjectMypYearMap(prev => ({
                                      ...prev,
                                      [subj.subject_id]: { ...(prev[subj.subject_id] ?? { s1: 1, s2: 1 }), s1: yr }
                                    }))}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                                      (subjectMypYearMap[subj.subject_id]?.s1 ?? 1) === yr
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'bg-slate-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    Yr {yr}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">MYP S2:</span>
                                {[1, 2, 3, 4, 5].map(yr => (
                                  <button
                                    key={yr}
                                    type="button"
                                    onClick={() => setSubjectMypYearMap(prev => ({
                                      ...prev,
                                      [subj.subject_id]: { ...(prev[subj.subject_id] ?? { s1: 1, s2: 1 }), s2: yr }
                                    }))}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                                      (subjectMypYearMap[subj.subject_id]?.s2 ?? 1) === yr
                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                        : 'bg-slate-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    Yr {yr}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.border }}>
                <span className="text-[11px] font-semibold" style={{ color: theme.textSecondary }}>
                  Selected: {selectedSubjectIds.length} subjects
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubjectModalOpen(false)}
                    disabled={subjectsSaving}
                    className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                    style={btnSecondaryStyle}
                  >
                    {t('classManagement.cancel') || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={saveSubjects}
                    disabled={subjectsSaving}
                    className="px-4 py-2 text-xs font-bold rounded-md cursor-pointer bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {subjectsSaving ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        <span>Saving...</span>
                      </>
                    ) : (
                      t('classManagement.save') || 'Save Subject Relations'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Notification Toast Modal */}
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
