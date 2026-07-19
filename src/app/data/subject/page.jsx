'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

export default function SubjectManagement() {
  const { theme } = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_user_id: '',
    subject_unit_id: '',
    subject_code: '',
    subject_guide: '',
    grading_method: 'highest',
    core_subject: false,
    is_community_project: false,
    print_order: 0,
    include_in_print: true,
    subject_group_id: '',
    custom_grade_boundaries: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Icon upload states
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [removeIcon, setRemoveIcon] = useState(false);
  
  // Criteria & Strands Management States
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [strands, setStrands] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [criteriaFormData, setCriteriaFormData] = useState({ code: '', name: '' });
  const [showStrandForm, setShowStrandForm] = useState(false);
  const [editingStrand, setEditingStrand] = useState(null);
  const [strandFormData, setStrandFormData] = useState({ criterion_id: '', year_level: '', label: '', content: '' });
  
  // Rubrics Management States
  const [rubrics, setRubrics] = useState([]);
  const [expandedStrands, setExpandedStrands] = useState(new Set());
  const [showRubricForm, setShowRubricForm] = useState(false);
  const [editingRubric, setEditingRubric] = useState(null);
  const [selectedStrandForRubric, setSelectedStrandForRubric] = useState(null);
  const [rubricFormData, setRubricFormData] = useState({ 
    strand_id: '', 
    band_label: '', 
    min_score: '', 
    max_score: '', 
    description: '' 
  });
  
  // Copy Criteria States
  const [copySourceSubjectId, setCopySourceSubjectId] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  
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
    fetchSubjectGroups();
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
          subject_code,
          subject_guide,
          subject_icon,
          grading_method,
          core_subject,
          is_community_project,
          print_order,
          include_in_print,
          subject_group_id,
          custom_grade_boundaries,
          users:subject_user_id (
            user_nama_depan,
            user_nama_belakang
          ),
          unit:subject_unit_id (
            unit_name
          ),
          subject_group:subject_group_id (
            name
          )
        `)
        .order('print_order', { ascending: true })
        .order('subject_id', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Transform data untuk kompatibilitas dengan UI yang ada
      const transformedData = data.map(subject => ({
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        subject_user_id: subject.subject_user_id,
        subject_unit_id: subject.subject_unit_id,
        subject_code: subject.subject_code || '',
        subject_guide: subject.subject_guide || '',
        subject_icon: subject.subject_icon || '',
        grading_method: subject.grading_method || 'highest',
        core_subject: subject.core_subject || false,
        is_community_project: subject.is_community_project || false,
        print_order: subject.print_order ?? 0,
        include_in_print: subject.include_in_print !== false,
        user_nama_depan: subject.users?.user_nama_depan || '',
        user_nama_belakang: subject.users?.user_nama_belakang || '',
        unit_name: subject.unit?.unit_name || '',
        subject_group_id: subject.subject_group_id || null,
        subject_group_name: subject.subject_group?.name || '',
        custom_grade_boundaries: subject.custom_grade_boundaries || null
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
        .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
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
          .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
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

  const fetchSubjectGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_group')
        .select('id, name')
        .order('name');
      if (error) throw new Error(error.message);
      setSubjectGroups(data || []);
    } catch (err) {
      console.error('Error fetching subject groups:', err);
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
    if (formData.subject_code && formData.subject_code.length > 12) {
      errors.subject_code = 'Kode subject maksimal 12 karakter';
    }
    if (formData.subject_guide && formData.subject_guide.trim()) {
      try {
        const u = new URL(formData.subject_guide.trim());
        if (!/^https?:$/.test(u.protocol)) throw new Error('invalid');
      } catch {
        errors.subject_guide = 'Link harus berupa URL yang valid (contoh: https://drive.google.com/...)';
      }
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
        subject_unit_id: Number(formData.subject_unit_id),
        subject_code: formData.subject_code?.trim() || null,
        subject_guide: formData.subject_guide?.trim() || null,
        grading_method: formData.grading_method || 'highest',
        core_subject: formData.core_subject || false,
        is_community_project: formData.is_community_project || false,
        print_order: Number(formData.print_order) || 0,
        include_in_print: formData.include_in_print !== false,
        subject_group_id: formData.subject_group_id ? Number(formData.subject_group_id) : null,
        custom_grade_boundaries: (() => {
          const raw = (formData.custom_grade_boundaries || '').trim();
          if (!raw) return null;
          const nums = raw.split(',').map(s => parseInt(s.trim(), 10));
          if (nums.length === 6 && nums.every(n => !isNaN(n))) return nums;
          return null;
        })()
      };

      // Handle icon upload if file selected
      if (iconFile) {
        try {
          setUploadingIcon(true);
          const ext = iconFile.name.split('.').pop();
          const path = `subject-icons/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('profile-pictures')
            .upload(path, iconFile, { cacheControl: '3600', upsert: false });
          if (uploadErr) throw uploadErr;
          const { data: pub } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(path);
          submitData.subject_icon = pub?.publicUrl || null;
        } catch (uploadErr) {
          console.error('Error uploading icon:', uploadErr);
          showNotification('Error', 'Gagal upload icon: ' + uploadErr.message, 'error');
          setSubmitting(false);
          return;
        } finally {
          setUploadingIcon(false);
        }
      } else if (removeIcon) {
        submitData.subject_icon = null;
      }

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
        subject_unit_id: '',
        subject_code: '',
        subject_guide: '',
        grading_method: 'highest',
        core_subject: false,
        is_community_project: false,
        print_order: 0,
        include_in_print: true,
        custom_grade_boundaries: ''
      });
      setIconFile(null);
      setIconPreview(null);
      setRemoveIcon(false);
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
      subject_unit_id: subject.subject_unit_id,
      subject_code: subject.subject_code || '',
      subject_guide: subject.subject_guide || '',
      grading_method: subject.grading_method || 'highest',
      core_subject: subject.core_subject || false,
      is_community_project: subject.is_community_project || false,
      print_order: subject.print_order ?? 0,
      include_in_print: subject.include_in_print !== false,
      subject_group_id: subject.subject_group_id || '',
      custom_grade_boundaries: subject.custom_grade_boundaries ? subject.custom_grade_boundaries.join(', ') : ''
    });
    setIconFile(null);
    setIconPreview(subject.subject_icon || null);
    setRemoveIcon(false);
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
      subject_unit_id: '',
      subject_code: '',
      subject_guide: '',
      grading_method: 'highest',
      core_subject: false,
      is_community_project: false,
      print_order: 0,
      include_in_print: true,
      subject_group_id: ''
    });
    setIconFile(null);
    setIconPreview(null);
    setRemoveIcon(false);
    setShowForm(true);
    setFormErrors({});
    setError('');
  };

  // Criteria & Strands Management Functions
  const handleManageCriteria = async (subject) => {
    setSelectedSubject(subject);
    setShowCriteriaModal(true);
    await fetchCriteria(subject.subject_id);
  };

  const fetchCriteria = async (subjectId) => {
    setLoadingCriteria(true);
    try {
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('criteria')
        .select('*')
        .eq('subject_id', subjectId)
        .order('code');

      if (criteriaError) throw criteriaError;
      setCriteria(criteriaData || []);

      // Fetch all strands for these criteria
      if (criteriaData && criteriaData.length > 0) {
        const criterionIds = criteriaData.map(c => c.criterion_id);
        const { data: strandsData, error: strandsError } = await supabase
          .from('strands')
          .select('*')
          .in('criterion_id', criterionIds)
          .order('year_level, label');

        if (strandsError) throw strandsError;
        setStrands(strandsData || []);

        // Fetch all rubrics for these strands
        if (strandsData && strandsData.length > 0) {
          const strandIds = strandsData.map(s => s.strand_id);
          const { data: rubricsData, error: rubricsError } = await supabase
            .from('rubrics')
            .select('*')
            .in('strand_id', strandIds)
            .order('min_score');

          if (rubricsError) throw rubricsError;
          setRubrics(rubricsData || []);
        } else {
          setRubrics([]);
        }
      } else {
        setStrands([]);
        setRubrics([]);
      }
    } catch (err) {
      console.error('Error fetching criteria:', err);
      showNotification('Error', 'Gagal memuat criteria: ' + err.message, 'error');
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleAddCriteria = () => {
    setEditingCriterion(null);
    setCriteriaFormData({ code: '', name: '' });
    setShowCriteriaForm(true);
  };

  const handleEditCriteria = (criterion) => {
    setEditingCriterion(criterion);
    setCriteriaFormData({ code: criterion.code, name: criterion.name });
    setShowCriteriaForm(true);
  };

  const handleSaveCriteria = async () => {
    if (!criteriaFormData.code.trim() || !criteriaFormData.name.trim()) {
      showNotification('Error', 'Code dan Name wajib diisi', 'error');
      return;
    }

    try {
      if (editingCriterion) {
        const { error } = await supabase
          .from('criteria')
          .update({ code: criteriaFormData.code.toUpperCase(), name: criteriaFormData.name })
          .eq('criterion_id', editingCriterion.criterion_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('criteria')
          .insert([{
            subject_id: selectedSubject.subject_id,
            code: criteriaFormData.code.toUpperCase(),
            name: criteriaFormData.name
          }]);
        if (error) throw error;
      }
      
      await fetchCriteria(selectedSubject.subject_id);
      setShowCriteriaForm(false);
      showNotification('Success', editingCriterion ? 'Criterion updated!' : 'Criterion added!', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menyimpan criterion: ' + err.message, 'error');
    }
  };

  const handleDeleteCriteria = async (criterion) => {
    if (!confirm(`Hapus criterion ${criterion.code}? Semua strands dan rubrics terkait juga akan terhapus.`)) return;

    try {
      // Must delete child records first due to FK constraints (no ON DELETE CASCADE in DB):
      // rubrics → strands → criteria

      // 1. Get all strand IDs for this criterion
      const criterionStrands = strands.filter(s => s.criterion_id === criterion.criterion_id);
      const strandIds = criterionStrands.map(s => s.strand_id);

      // 2. Delete rubrics for those strands first
      if (strandIds.length > 0) {
        const { error: rubErr } = await supabase
          .from('rubrics')
          .delete()
          .in('strand_id', strandIds);
        if (rubErr) throw rubErr;
      }

      // 3. Delete strands for this criterion
      if (strandIds.length > 0) {
        const { error: strandErr } = await supabase
          .from('strands')
          .delete()
          .eq('criterion_id', criterion.criterion_id);
        if (strandErr) throw strandErr;
      }

      // 4. Now safe to delete the criterion itself
      const { error } = await supabase
        .from('criteria')
        .delete()
        .eq('criterion_id', criterion.criterion_id);
      if (error) throw error;
      
      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Success', 'Criterion deleted!', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menghapus criterion: ' + err.message, 'error');
    }
  };

  const handleAddStrand = (criterionId = null) => {
    setEditingStrand(null);
    setStrandFormData({ 
      criterion_id: criterionId || (criteria[0]?.criterion_id || ''), 
      year_level: '', 
      label: '', 
      content: '' 
    });
    setShowStrandForm(true);
  };

  const handleEditStrand = (strand) => {
    setEditingStrand(strand);
    setStrandFormData({
      criterion_id: strand.criterion_id,
      year_level: strand.year_level,
      label: strand.label || '',
      content: strand.content
    });
    setShowStrandForm(true);
  };

  const handleSaveStrand = async () => {
    if (!strandFormData.criterion_id || !strandFormData.year_level || !strandFormData.content.trim()) {
      showNotification('Error', 'Criterion, Year Level, dan Content wajib diisi', 'error');
      return;
    }

    try {
      const payload = {
        criterion_id: Number(strandFormData.criterion_id),
        year_level: Number(strandFormData.year_level),
        label: strandFormData.label.trim() || null,
        content: strandFormData.content.trim()
      };

      if (editingStrand) {
        const { error } = await supabase
          .from('strands')
          .update(payload)
          .eq('strand_id', editingStrand.strand_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('strands')
          .insert([payload]);
        if (error) throw error;
      }
      
      await fetchCriteria(selectedSubject.subject_id);
      setShowStrandForm(false);
      showNotification('Success', editingStrand ? 'Strand updated!' : 'Strand added!', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menyimpan strand: ' + err.message, 'error');
    }
  };

  const handleDeleteStrand = async (strand) => {
    if (!confirm('Hapus strand ini?')) return;

    try {
      const { error } = await supabase
        .from('strands')
        .delete()
        .eq('strand_id', strand.strand_id);
      if (error) throw error;
      
      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Success', 'Strand deleted!', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menghapus strand: ' + err.message, 'error');
    }
  };

  const getStrandsForCriterion = (criterionId) => {
    return strands.filter(s => s.criterion_id === criterionId);
  };

  const getRubricsForStrand = (strandId) => {
    return rubrics.filter(r => r.strand_id === strandId).sort((a, b) => a.min_score - b.min_score);
  };

  const toggleStrandExpansion = (strandId) => {
    setExpandedStrands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(strandId)) {
        newSet.delete(strandId);
      } else {
        newSet.add(strandId);
      }
      return newSet;
    });
  };

  const handleAddRubric = (strand) => {
    setSelectedStrandForRubric(strand);
    setEditingRubric(null);
    setRubricFormData({ 
      strand_id: strand.strand_id, 
      band_label: '', 
      min_score: '', 
      max_score: '', 
      description: '' 
    });
    setShowRubricForm(true);
  };

  const handleEditRubric = (rubric) => {
    setEditingRubric(rubric);
    setRubricFormData({
      strand_id: rubric.strand_id,
      band_label: rubric.band_label,
      min_score: rubric.min_score,
      max_score: rubric.max_score,
      description: rubric.description
    });
    setShowRubricForm(true);
  };

  const handleSaveRubric = async () => {
    if (!rubricFormData.band_label.trim() || !rubricFormData.description.trim()) {
      showNotification('Error', 'Band Label dan Description wajib diisi', 'error');
      return;
    }

    try {
      const payload = {
        strand_id: Number(rubricFormData.strand_id),
        band_label: rubricFormData.band_label.trim(),
        min_score: rubricFormData.min_score ? Number(rubricFormData.min_score) : null,
        max_score: rubricFormData.max_score ? Number(rubricFormData.max_score) : null,
        description: rubricFormData.description.trim()
      };

      if (editingRubric) {
        const { error } = await supabase
          .from('rubrics')
          .update(payload)
          .eq('rubric_id', editingRubric.rubric_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rubrics')
          .insert([payload]);
        if (error) throw error;
      }
      
      await fetchCriteria(selectedSubject.subject_id);
      setShowRubricForm(false);
      showNotification('Success', editingRubric ? 'Rubric updated!' : 'Rubric added!', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menyimpan rubric: ' + err.message, 'error');
    }
  };

  const handleDeleteRubric = async (rubric) => {
    if (!confirm('Hapus rubric ini?')) return;

    try {
      const { error } = await supabase
        .from('rubrics')
        .delete()
        .eq('rubric_id', rubric.rubric_id);
      if (error) throw error;
      
      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Success', 'Rubric deleted!', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menghapus rubric: ' + err.message, 'error');
    }
  };

  const handleCopyCriteria = async (sourceId, targetId) => {
    if (!sourceId || !targetId) return;
    try {
      setIsCopying(true);
      
      // 1. Fetch source criteria
      const { data: sourceCriteria, error: errC } = await supabase
        .from('criteria')
        .select('*')
        .eq('subject_id', sourceId);
      if (errC) throw errC;
      
      if (!sourceCriteria || sourceCriteria.length === 0) {
        showNotification('Error', 'Subject sumber tidak memiliki criteria.', 'error');
        setIsCopying(false);
        return;
      }
      
      const sourceCriteriaIds = sourceCriteria.map(c => c.criterion_id);
      
      // 2. Fetch source strands
      const { data: sourceStrands, error: errS } = await supabase
        .from('strands')
        .select('*')
        .in('criterion_id', sourceCriteriaIds);
      if (errS) throw errS;
        
      const sourceStrandIds = sourceStrands && sourceStrands.length > 0 ? sourceStrands.map(s => s.strand_id) : [];
      
      // 3. Fetch source rubrics
      let sourceRubrics = [];
      if (sourceStrandIds.length > 0) {
        const { data: sr, error: errR } = await supabase
          .from('rubrics')
          .select('*')
          .in('strand_id', sourceStrandIds);
        if (errR) throw errR;
        sourceRubrics = sr || [];
      }
      
      // 4. Smart Merge Process
      for (const oldCrit of sourceCriteria) {
        // Find if target already has this criterion (by code)
        let targetCrit = criteria.find(c => c.code === oldCrit.code);
        
        if (!targetCrit) {
          // Insert new criterion
          const { data: newCrit, error: insCritErr } = await supabase
            .from('criteria')
            .insert([{ 
              subject_id: targetId, 
              code: oldCrit.code, 
              name: oldCrit.name 
            }])
            .select()
            .single();
          if (insCritErr) throw insCritErr;
          targetCrit = newCrit;
        }
        
        const myOldStrands = sourceStrands ? sourceStrands.filter(s => s.criterion_id === oldCrit.criterion_id) : [];
        if (myOldStrands.length > 0) {
          // Find target strands for this criterion
          const existingTargetStrands = strands.filter(s => s.criterion_id === targetCrit.criterion_id);
          
          for (const oldStrand of myOldStrands) {
            let targetStrand = existingTargetStrands.find(s => s.year_level === oldStrand.year_level && s.label === oldStrand.label);
            
            if (!targetStrand) {
              const { data: newStrand, error: insStrandErr } = await supabase
                .from('strands')
                .insert([{
                  criterion_id: targetCrit.criterion_id,
                  year_level: oldStrand.year_level,
                  label: oldStrand.label,
                  content: oldStrand.content
                }])
                .select()
                .single();
              if (insStrandErr) throw insStrandErr;
              targetStrand = newStrand;
            }
            
            // Now handle rubrics
            const myOldRubrics = sourceRubrics.filter(r => r.strand_id === oldStrand.strand_id);
            if (myOldRubrics.length > 0) {
              // Find existing rubrics for this target strand
              const existingTargetRubrics = rubrics.filter(r => r.strand_id === targetStrand.strand_id);
              
              let rubricsToInsert = [];
              for (const oldRub of myOldRubrics) {
                const targetRubric = existingTargetRubrics.find(r => r.band_label === oldRub.band_label);
                if (!targetRubric) {
                  rubricsToInsert.push({
                    strand_id: targetStrand.strand_id,
                    band_label: oldRub.band_label,
                    min_score: oldRub.min_score,
                    max_score: oldRub.max_score,
                    description: oldRub.description
                  });
                }
              }
              
              if (rubricsToInsert.length > 0) {
                const { error: insRubErr } = await supabase.from('rubrics').insert(rubricsToInsert);
                if (insRubErr) throw insRubErr;
              }
            }
          }
        }
      }
      
      await fetchCriteria(targetId);
      showNotification('Success', 'Sinkronisasi kriteria berhasil!', 'success');
      setCopySourceSubjectId('');
    } catch (err) {
      console.error(err);
      showNotification('Error', 'Gagal menyalin criteria: ' + err.message, 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const getBandColor = (bandLabel) => {
    const band = bandLabel.toLowerCase();
    if (band === '0' || band.startsWith('0')) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (band.includes('1-2')) return 'bg-red-50 text-red-800 border-red-300';
    if (band.includes('3-4')) return 'bg-yellow-50 text-yellow-800 border-yellow-300';
    if (band.includes('5-6')) return 'bg-blue-50 text-blue-800 border-blue-300';
    if (band.includes('7-8')) return 'bg-green-50 text-green-800 border-green-300';
    return 'bg-gray-50 text-gray-800 border-gray-300';
  };

  const filteredSubjects = getFilteredSubjects();

  if (loading) {
    return <div className="flex justify-center items-center h-64" style={{ color: theme.textSecondary }}>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: theme.textPrimary }}>Manajemen Subject</h1>
        <Button onClick={handleAddNew} style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}>
          + Tambah Subject
        </Button>
      </div>

      {/* Filter Section */}
      {Array.isArray(subjects) && subjects.length > 0 && (
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardHeader>
            <CardTitle style={{ color: theme.textPrimary }}>Filter Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-unit" style={{ color: theme.textBody }}>Filter by Unit</Label>
                <select
                  id="filter-unit"
                  value={filters.unit}
                  onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                >
                  <option value="">Semua Unit</option>
                  {getUniqueUnits().map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="filter-teacher" style={{ color: theme.textBody }}>Filter by Teacher</Label>
                <Input
                  id="filter-teacher"
                  placeholder="Cari nama teacher..."
                  value={filters.teacher}
                  onChange={(e) => setFilters(prev => ({ ...prev, teacher: e.target.value }))}
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.unit || filters.teacher) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm" style={{ color: theme.textSecondary }}>Filter aktif:</span>
                {filters.unit && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ background: theme.blueBg, color: theme.blueText }}>
                    Unit: {filters.unit}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, unit: '' }))}
                      className="ml-2"
                      style={{ color: theme.blueText }}
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.teacher && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ background: theme.greenBg, color: theme.greenText }}>
                    Teacher: {filters.teacher}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, teacher: '' }))}
                      className="ml-2"
                      style={{ color: theme.greenText }}
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setFilters({ unit: '', teacher: '' })}
                  className="text-sm underline"
                  style={{ color: theme.textSecondary }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="px-4 py-3 rounded" style={{ background: theme.redBg, border: `1px solid ${theme.border}`, color: theme.redText }}>
          {error}
        </div>
      )}

      {/* Subjects Table */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.textPrimary }}>
            Daftar Subject 
            {Array.isArray(subjects) && filteredSubjects.length !== subjects.length && (
              <span className="text-sm font-normal ml-2" style={{ color: theme.textSecondary }}>
                ({filteredSubjects.length} of {subjects.length} subjects)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-8" style={{ color: theme.textSecondary }}>
              {!Array.isArray(subjects) || subjects.length === 0 
                ? "Belum ada subject. Tambahkan subject pertama Anda!"
                : "Tidak ada subject yang sesuai dengan filter yang dipilih."
              }
            </div>
          ) : (() => {
            const coreSubjects = filteredSubjects.filter(s => s.core_subject)
            const nonCoreSubjects = filteredSubjects.filter(s => !s.core_subject)

            const renderRow = (subject, idx) => (
              <tr
                key={subject.subject_id}
                style={{ borderBottom: `1px solid ${theme.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center w-12" style={{ color: theme.textSecondary }}>
                  {idx + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {subject.subject_icon ? (
                    <img src={subject.subject_icon} alt={subject.subject_name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                      {subject.subject_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: theme.textPrimary }}>
                  {subject.subject_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.textBody }}>
                  {subject.subject_code || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {subject.include_in_print !== false ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: theme.greenBg, color: theme.greenText }}>Print</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: theme.subtleBg, color: theme.textSecondary }}>Skip</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.blueText }}>
                  {subject.subject_guide ? (
                    <a href={subject.subject_guide} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: theme.blueText }}>
                      Open
                    </a>
                  ) : (
                    <span style={{ color: theme.textSecondary }}>-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.textBody }}>
                  {subject.user_nama_depan} {subject.user_nama_belakang}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.textBody }}>
                  {subject.unit_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(subject)} style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleManageCriteria(subject)} style={{ background: theme.cardBg, color: theme.blueText, borderColor: theme.border }}>Criteria</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(subject)} style={{ background: theme.cardBg, color: theme.redText, borderColor: theme.border }}>Hapus</Button>
                </td>
              </tr>
            )

            const thead = (
              <thead>
                <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-12" style={{ color: theme.textSecondary }}>#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Icon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Subject Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Code</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Print</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Guide Link</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Aksi</th>
                </tr>
              </thead>
            )

            return (
              <div className="overflow-x-auto space-y-6">
                {coreSubjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.blueText }}>Core Subjects</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: theme.blueBg, color: theme.blueText }}>{coreSubjects.length}</span>
                    </div>
                    <table className="min-w-full table-auto rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                      {thead}
                      <tbody>
                        {coreSubjects.map((subject, idx) => renderRow(subject, idx))}
                      </tbody>
                    </table>
                  </div>
                )}
                {nonCoreSubjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Other Subjects</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: theme.subtleBg, color: theme.textSecondary }}>{nonCoreSubjects.length}</span>
                    </div>
                    <table className="min-w-full table-auto rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                      {thead}
                      <tbody>
                        {nonCoreSubjects.map((subject, idx) => renderRow(subject, idx))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Add/Edit Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>
            {editingSubject ? 'Edit Subject' : 'Tambah Subject Baru'}
          </h2>

          {error && (
            <div className="px-4 py-3 rounded" style={{ background: theme.redBg, border: `1px solid ${theme.border}`, color: theme.redText }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Icon Upload */}
            <div>
              <Label style={{ color: theme.textBody }}>Subject Icon</Label>
              <div className="flex items-center gap-4 mt-1">
                {/* Preview */}
                {(iconPreview && !removeIcon) ? (
                  <div className="relative">
                    <img src={iconPreview} alt="Icon preview" className="w-16 h-16 rounded-lg object-cover" style={{ border: `1px solid ${theme.border}` }} />
                    <button
                      type="button"
                      onClick={() => { setIconFile(null); setIconPreview(null); setRemoveIcon(true); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="subject_icon"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          showNotification('Error', 'Ukuran file maksimal 2MB', 'error');
                          return;
                        }
                        setIconFile(file);
                        setIconPreview(URL.createObjectURL(file));
                        setRemoveIcon(false);
                      }
                    }}
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold"
                    style={{ color: theme.textSecondary }}
                  />
                  <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>PNG, JPG, GIF, WebP, atau SVG. Maks 2MB.</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="subject_name" style={{ color: theme.textBody }}>Subject Name *</Label>
              <Input
                id="subject_name"
                type="text"
                placeholder="Masukkan nama subject"
                value={formData.subject_name}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
                className={formErrors.subject_name ? 'border-red-500' : ''}
                style={{ background: theme.inputBg, border: `1px solid ${formErrors.subject_name ? '#ef4444' : theme.border}`, color: theme.textBody }}
              />
              {formErrors.subject_name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.subject_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subject_code" style={{ color: theme.textBody }}>Subject Code</Label>
              <Input
                id="subject_code"
                type="text"
                placeholder="(Opsional) Kode unik subject"
                value={formData.subject_code}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_code: e.target.value }))}
                className={formErrors.subject_code ? 'border-red-500' : ''}
                style={{ background: theme.inputBg, border: `1px solid ${formErrors.subject_code ? '#ef4444' : theme.border}`, color: theme.textBody }}
              />
              {formErrors.subject_code && (
                <p className="text-red-500 text-sm mt-1">{formErrors.subject_code}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subject_guide" style={{ color: theme.textBody }}>Subject Guide (Google Drive/PDF URL)</Label>
              <Input
                id="subject_guide"
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.subject_guide}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_guide: e.target.value }))}
                className={formErrors.subject_guide ? 'border-red-500' : ''}
                style={{ background: theme.inputBg, border: `1px solid ${formErrors.subject_guide ? '#ef4444' : theme.border}`, color: theme.textBody }}
              />
              {formErrors.subject_guide && (
                <p className="text-red-500 text-sm mt-1">{formErrors.subject_guide}</p>
              )}
            </div>

            <div>
              <Label htmlFor="grading_method" style={{ color: theme.textBody }}>Grading Calculation Method *</Label>
              <select
                id="grading_method"
                value={formData.grading_method}
                onChange={(e) => setFormData(prev => ({ ...prev, grading_method: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
              >
                <option value="highest">Highest (Best-fit) - IB MYP Standard</option>
                <option value="average">Average (Mean of all strands)</option>
                <option value="median">Median (Middle value)</option>
                <option value="mode">Mode (Most frequent)</option>
              </select>
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                {formData.grading_method === 'highest' && '✓ Takes the highest strand grade (IB MYP best-fit approach). Recommended for IB schools.'}
                {formData.grading_method === 'average' && 'Calculates the mean of all strand grades and rounds to nearest integer.'}
                {formData.grading_method === 'median' && 'Takes the middle value when strand grades are sorted.'}
                {formData.grading_method === 'mode' && 'Takes the most frequently occurring strand grade.'}
              </p>
            </div>

            <div>
              <Label htmlFor="subject_user_id" style={{ color: theme.textBody }}>Teacher *</Label>
              <select
                id="subject_user_id"
                value={formData.subject_user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_user_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{ background: theme.inputBg, border: `1px solid ${formErrors.subject_user_id ? '#ef4444' : theme.border}`, color: theme.textBody }}
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
              <Label htmlFor="subject_unit_id" style={{ color: theme.textBody }}>Unit *</Label>
              <select
                id="subject_unit_id"
                value={formData.subject_unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_unit_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{ background: theme.inputBg, border: `1px solid ${formErrors.subject_unit_id ? '#ef4444' : theme.border}`, color: theme.textBody }}
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

            <div>
              <Label htmlFor="subject_group_id" style={{ color: theme.textBody }}>Subject Group</Label>
              <select
                id="subject_group_id"
                value={formData.subject_group_id}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_group_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
              >
                <option value="">— Tidak ada group —</option>
                {subjectGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>Digunakan untuk Achievement Level Descriptors</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="print_order" style={{ color: theme.textBody }}>Print Order</Label>
                <Input
                  id="print_order"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.print_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, print_order: e.target.value }))}
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                />
                <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>Urutan cetak laporan (0 = paling pertama)</p>
              </div>

              <div className="flex items-center">
                <div className="flex-1">
                  <Label style={{ color: theme.textBody }}>Core Subject</Label>
                  <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>Tandai sebagai mata pelajaran inti</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, core_subject: !prev.core_subject }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.core_subject ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    formData.core_subject ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center">
                <div className="flex-1">
                  <Label style={{ color: theme.textBody }}>Community Project</Label>
                  <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>Tandai sebagai Community Project (muncul di halaman CP pada rapor)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_community_project: !prev.is_community_project, core_subject: !prev.is_community_project ? false : prev.core_subject }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.is_community_project ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    formData.is_community_project ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="col-span-2">
                <Label style={{ color: theme.textBody }}>Custom Grade Boundaries</Label>
                <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>6 angka dipisah koma — batas atas untuk grade 1–6 (kosongkan untuk pakai rumus IB standar). Contoh Bible: 4, 7, 11, 14, 17, 20</p>
                <Input
                  value={formData.custom_grade_boundaries}
                  onChange={e => setFormData(prev => ({ ...prev, custom_grade_boundaries: e.target.value }))}
                  placeholder="contoh: 4, 7, 11, 14, 17, 20"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                />
              </div>

              <div className="flex items-center">
                <div className="flex-1">
                  <Label style={{ color: theme.textBody }}>Include in Print</Label>
                  <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>Tampilkan subject ini saat cetak laporan</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, include_in_print: !prev.include_in_print }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.include_in_print !== false ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    formData.include_in_print !== false ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}
            >
              {submitting ? 'Menyimpan...' : (editingSubject ? 'Update Subject' : 'Tambah Subject')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Criteria & Strands Management Modal */}
      <Modal 
        isOpen={showCriteriaModal} 
        onClose={() => setShowCriteriaModal(false)}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: theme.textPrimary }}>Manage Criteria &amp; Strands</h2>
              <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                Subject: <span className="font-semibold" style={{ color: theme.textPrimary }}>{selectedSubject?.subject_name}</span>
              </p>
            </div>
            <Button onClick={handleAddCriteria} size="sm" style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}>+ Add Criterion</Button>
          </div>

          {loadingCriteria ? (
            <div className="text-center py-8" style={{ color: theme.textSecondary }}>Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Copy / Sync UI */}
              <div className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center gap-3 text-left" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: theme.textPrimary }}>Sync / Copy dari subject lain:</span>
                <div className="flex gap-2 flex-1">
                  <select 
                    value={copySourceSubjectId} 
                    onChange={(e) => setCopySourceSubjectId(e.target.value)}
                    className="border rounded px-3 py-2 flex-1 text-sm outline-none"
                    style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textBody }}
                  >
                    <option value="">-- Pilih Subject Sumber --</option>
                    {subjects.filter(s => s.subject_id !== selectedSubject?.subject_id).map(s => (
                      <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                    ))}
                  </select>
                  <Button 
                    onClick={() => handleCopyCriteria(copySourceSubjectId, selectedSubject?.subject_id)}
                    disabled={!copySourceSubjectId || isCopying}
                    style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}
                  >
                    {isCopying ? 'Syncing...' : 'Sync / Copy'}
                  </Button>
                </div>
              </div>

              {criteria.length === 0 ? (
                <div className="text-center py-8" style={{ color: theme.textSecondary }}>
                  Belum ada criteria. Tambahkan criterion pertama (A, B, C, D) atau copy dari subject lain.
                </div>
              ) : (
                <div className="space-y-6">
              {criteria.map((criterion) => {
                const criterionStrands = getStrandsForCriterion(criterion.criterion_id);
                return (
                  <div key={criterion.criterion_id} className="border rounded-lg p-4" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold" style={{ color: theme.blueText }}>
                          Criterion {criterion.code}
                        </h3>
                        <p className="text-sm mt-1" style={{ color: theme.textBody }}>{criterion.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddStrand(criterion.criterion_id)}
                          style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
                        >
                          + Strand
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCriteria(criterion)}
                          style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCriteria(criterion)}
                          style={{ background: theme.cardBg, color: theme.redText, borderColor: theme.border }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Strands by Year */}
                    {criterionStrands.length === 0 ? (
                      <p className="text-sm italic" style={{ color: theme.textSecondary }}>No strands yet</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Group strands by year_level */}
                        {[...new Set(criterionStrands.map(s => s.year_level))].sort((a, b) => a - b).map(yearLevel => {
                          const yearStrands = criterionStrands.filter(s => s.year_level === yearLevel);
                          return (
                            <div key={yearLevel} className="rounded-lg border p-3" style={{ background: theme.cardBg, borderColor: theme.border }}>
                              <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                                <span className="px-2 py-1 rounded text-xs" style={{ background: theme.blueBg, color: theme.blueText }}>
                                  Year {yearLevel}
                                </span>
                                <span className="text-xs font-normal" style={{ color: theme.textSecondary }}>
                                  ({yearStrands.length} {yearStrands.length === 1 ? 'strand' : 'strands'})
                                </span>
                              </h4>
                              <div className="space-y-3">
                                {yearStrands.map((strand) => {
                                  const strandRubrics = getRubricsForStrand(strand.strand_id);
                                  const isExpanded = expandedStrands.has(strand.strand_id);
                                  
                                  return (
                                    <div key={strand.strand_id} className="border rounded-lg overflow-hidden" style={{ borderColor: theme.border }}>
                                      {/* Strand Header */}
                                      <div className="flex items-start gap-3 p-3" style={{ background: theme.cardBg }}
                                        onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                                        onMouseLeave={e => e.currentTarget.style.background = theme.cardBg}
                                      >
                                        {strand.label && (
                                          <span className="font-bold text-sm min-w-[30px]" style={{ color: theme.blueText }}>
                                            {strand.label}.
                                          </span>
                                        )}
                                        <div className="flex-1">
                                          <p className="text-sm font-medium" style={{ color: theme.textBody }}>
                                            {strand.content}
                                          </p>
                                          {strandRubrics.length > 0 && (
                                            <div className="mt-2 flex items-center gap-2">
                                              <span className="text-xs" style={{ color: theme.textSecondary }}>
                                                {strandRubrics.length} rubric{strandRubrics.length !== 1 ? 's' : ''}
                                              </span>
                                              <button
                                                onClick={() => toggleStrandExpansion(strand.strand_id)}
                                                className="text-xs font-medium flex items-center gap-1"
                                                style={{ color: theme.blueText }}
                                              >
                                                {isExpanded ? '▼ Hide' : '▶ Show'} Rubrics
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                          <button
                                            onClick={() => handleAddRubric(strand)}
                                            className="text-xs font-medium"
                                            style={{ color: theme.textSecondary }}
                                            title="Add Rubric"
                                          >
                                            + Rubric
                                          </button>
                                          <button
                                            onClick={() => handleEditStrand(strand)}
                                            className="text-xs font-medium"
                                            style={{ color: theme.blueText }}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteStrand(strand)}
                                            className="text-xs font-medium"
                                            style={{ color: theme.redText }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      {/* Rubrics Section (Expandable) */}
                                      {isExpanded && strandRubrics.length > 0 && (
                                        <div className="border-t p-3" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                                          <div className="space-y-2">
                                            {strandRubrics.map((rubric) => (
                                              <div 
                                                key={rubric.rubric_id} 
                                                className={`flex items-start gap-3 p-3 rounded-lg border ${getBandColor(rubric.band_label)}`}
                                              >
                                                <div className="flex-shrink-0">
                                                  <span className="font-bold text-xs px-2 py-1 rounded bg-white border border-current">
                                                    {rubric.band_label}
                                                  </span>
                                                  {rubric.min_score !== null && rubric.max_score !== null && (
                                                    <div className="text-xs text-center mt-1 opacity-75">
                                                      {rubric.min_score}-{rubric.max_score}
                                                    </div>
                                                  )}
                                                </div>
                                                <p className="flex-1 text-sm">
                                                  {rubric.description}
                                                </p>
                                                <div className="flex gap-2 flex-shrink-0">
                                                  <button
                                                    onClick={() => handleEditRubric(rubric)}
                                                    className="text-xs font-medium"
                                                    style={{ color: theme.blueText }}
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteRubric(rubric)}
                                                    className="text-xs font-medium"
                                                    style={{ color: theme.redText }}
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}
        </div>
      </Modal>

      {/* Criteria Form Modal */}
      <Modal isOpen={showCriteriaForm} onClose={() => setShowCriteriaForm(false)}>
        <div className="space-y-4">
          <h3 className="text-xl font-bold" style={{ color: theme.textPrimary }}>
            {editingCriterion ? 'Edit Criterion' : 'Add New Criterion'}
          </h3>
          
          <div>
            <Label htmlFor="criteria_code" style={{ color: theme.textBody }}>Code (A, B, C, D) *</Label>
            <Input
              id="criteria_code"
              maxLength={1}
              placeholder="A"
              value={criteriaFormData.code}
              onChange={(e) => setCriteriaFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
            />
          </div>

          <div>
            <Label htmlFor="criteria_name" style={{ color: theme.textBody }}>Name *</Label>
            <Input
              id="criteria_name"
              placeholder="e.g., Knowing and Understanding"
              value={criteriaFormData.name}
              onChange={(e) => setCriteriaFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCriteriaForm(false)} style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}>
              Cancel
            </Button>
            <Button onClick={handleSaveCriteria} style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}>
              {editingCriterion ? 'Update' : 'Add'} Criterion
            </Button>
          </div>
        </div>
      </Modal>

      {/* Strand Form Modal */}
      <Modal isOpen={showStrandForm} onClose={() => setShowStrandForm(false)}>
        <div className="space-y-4">
          <h3 className="text-xl font-bold" style={{ color: theme.textPrimary }}>
            {editingStrand ? 'Edit Strand' : 'Add New Strand'}
          </h3>

          <div>
            <Label htmlFor="strand_criterion" style={{ color: theme.textBody }}>Criterion *</Label>
            <select
              id="strand_criterion"
              value={strandFormData.criterion_id}
              onChange={(e) => setStrandFormData(prev => ({ ...prev, criterion_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
            >
              <option value="">Select Criterion</option>
              {criteria.map((c) => (
                <option key={c.criterion_id} value={c.criterion_id}>
                  Criterion {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="strand_year" style={{ color: theme.textBody }}>Year Level (1-5 for MYP) *</Label>
            <Input
              id="strand_year"
              type="number"
              min="1"
              max="5"
              placeholder="1"
              value={strandFormData.year_level}
              onChange={(e) => setStrandFormData(prev => ({ ...prev, year_level: e.target.value }))}
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
            />
          </div>

          <div>
            <Label htmlFor="strand_label" style={{ color: theme.textBody }}>Label (optional)</Label>
            <Input
              id="strand_label"
              placeholder="e.g., i, ii, iii"
              value={strandFormData.label}
              onChange={(e) => setStrandFormData(prev => ({ ...prev, label: e.target.value }))}
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
            />
          </div>

          <div>
            <Label htmlFor="strand_content" style={{ color: theme.textBody }}>Content *</Label>
            <textarea
              id="strand_content"
              rows={4}
              placeholder="Enter strand content/description"
              value={strandFormData.content}
              onChange={(e) => setStrandFormData(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowStrandForm(false)} style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}>
              Cancel
            </Button>
            <Button onClick={handleSaveStrand} style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}>
              {editingStrand ? 'Update' : 'Add'} Strand
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rubric Form Modal */}
      <Modal isOpen={showRubricForm} onClose={() => setShowRubricForm(false)}>
        <div className="space-y-4">
          <h3 className="text-xl font-bold" style={{ color: theme.textPrimary }}>
            {editingRubric ? 'Edit Rubric' : 'Add New Rubric'}
          </h3>

          {selectedStrandForRubric && !editingRubric && (
            <div className="rounded-lg p-3" style={{ background: theme.blueBg, border: `1px solid ${theme.border}` }}>
              <p className="text-sm" style={{ color: theme.blueText }}>
                <span className="font-semibold">Adding rubric for:</span>
                <br />
                {selectedStrandForRubric.label && `${selectedStrandForRubric.label}. `}
                {selectedStrandForRubric.content}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rubric_band" style={{ color: theme.textBody }}>Band Label *</Label>
              <select
                id="rubric_band"
                value={rubricFormData.band_label}
                onChange={(e) => {
                  const val = e.target.value;
                  let min = '', max = '';
                  if (val === '0') { min = 0; max = 0; }
                  else if (val === '1-2') { min = 1; max = 2; }
                  else if (val === '3-4') { min = 3; max = 4; }
                  else if (val === '5-6') { min = 5; max = 6; }
                  else if (val === '7-8') { min = 7; max = 8; }
                  setRubricFormData(prev => ({ 
                    ...prev, 
                    band_label: val,
                    min_score: min,
                    max_score: max
                  }));
                }}
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
              >
                <option value="">Select Band</option>
                <option value="0">0 (No Achievement)</option>
                <option value="1-2">1-2 (Limited)</option>
                <option value="3-4">3-4 (Adequate)</option>
                <option value="5-6">5-6 (Substantial)</option>
                <option value="7-8">7-8 (Excellent)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="rubric_min" style={{ color: theme.textBody }}>Min Score</Label>
                <Input
                  id="rubric_min"
                  type="number"
                  min="0"
                  max="8"
                  value={rubricFormData.min_score}
                  onChange={(e) => setRubricFormData(prev => ({ ...prev, min_score: e.target.value }))}
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                />
              </div>
              <div>
                <Label htmlFor="rubric_max" style={{ color: theme.textBody }}>Max Score</Label>
                <Input
                  id="rubric_max"
                  type="number"
                  min="0"
                  max="8"
                  value={rubricFormData.max_score}
                  onChange={(e) => setRubricFormData(prev => ({ ...prev, max_score: e.target.value }))}
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="rubric_description" style={{ color: theme.textBody }}>Description *</Label>
            <textarea
              id="rubric_description"
              rows={5}
              placeholder="Enter rubric description for this achievement level"
              value={rubricFormData.description}
              onChange={(e) => setRubricFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
            />
            <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
              Tip: Be specific about what students need to demonstrate at this level
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowRubricForm(false)} style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}>
              Cancel
            </Button>
            <Button onClick={handleSaveRubric} style={{ background: theme.textPrimary, color: theme.cardBg, border: 'none' }}>
              {editingRubric ? 'Update' : 'Add'} Rubric
            </Button>
          </div>
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
