'use client';

import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faSpinner,
  faLayerGroup,
  faExternalLinkAlt,
  faCopy,
  faAward,
  faListCheck,
  faUserTie,
  faFilter,
  faSave,
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

export default function SubjectManagement() {
  const { theme, isDark } = useTheme();

  // Minimalist-UI Theme Tokens (Matching /data/pyp)
  const pageBg        = isDark ? '#09090B' : '#FAFAF9';
  const cardBg        = isDark ? '#18181B' : '#FFFFFF';
  const subtleBg      = isDark ? '#27272A' : '#F7F6F3';
  const borderColor   = isDark ? '#27272A' : '#EAEAEA';
  const textPrimary   = isDark ? '#F4F4F5' : '#111111';
  const textSecondary = isDark ? '#A1A1AA' : '#787774';

  // Primary Data States
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Tab: 'all' | 'core' | 'other'
  const [activeTab, setActiveTab] = useState('all');

  // Form & Edit States
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

  // Criteria & Strands & Rubrics Management States
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [strands, setStrands] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);

  // Sub-forms inside Criteria Modal
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [criteriaFormData, setCriteriaFormData] = useState({ code: '', name: '' });

  const [showStrandForm, setShowStrandForm] = useState(false);
  const [editingStrand, setEditingStrand] = useState(null);
  const [strandFormData, setStrandFormData] = useState({ criterion_id: '', year_level: '1', label: '', content: '' });

  const [showRubricForm, setShowRubricForm] = useState(false);
  const [editingRubric, setEditingRubric] = useState(null);
  const [selectedStrandForRubric, setSelectedStrandForRubric] = useState(null);
  const [rubricFormData, setRubricFormData] = useState({
    strand_id: '',
    band_label: '1-2',
    min_score: '1',
    max_score: '2',
    description: ''
  });

  // Copy / Sync Criteria States
  const [copySourceSubjectId, setCopySourceSubjectId] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  // Notification modal state
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Filter states
  const [filters, setFilters] = useState({
    unit: '',
    teacher: '',
    search: '',
    subjectGroup: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchUsers();
    fetchUnits();
    fetchSubjectGroups();
  }, []);

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: sbErr } = await supabase
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
          unit:subject_unit_id!inner (
            unit_name,
            is_myp
          ),
          subject_group:subject_group_id (
            name
          )
        `)
        .eq('unit.is_myp', true)
        .order('print_order', { ascending: true })
        .order('subject_id', { ascending: true });

      if (sbErr) throw new Error(sbErr.message);

      const transformed = (data || []).map(item => ({
        subject_id: item.subject_id,
        subject_name: item.subject_name,
        subject_user_id: item.subject_user_id,
        subject_unit_id: item.subject_unit_id,
        subject_code: item.subject_code || '',
        subject_guide: item.subject_guide || '',
        subject_icon: item.subject_icon || '',
        grading_method: item.grading_method || 'highest',
        core_subject: item.core_subject || false,
        is_community_project: item.is_community_project || false,
        print_order: item.print_order ?? 0,
        include_in_print: item.include_in_print !== false,
        user_nama_depan: item.users?.user_nama_depan || '',
        user_nama_belakang: item.users?.user_nama_belakang || '',
        unit_name: item.unit?.unit_name || '',
        subject_group_id: item.subject_group_id || null,
        subject_group_name: item.subject_group?.name || '',
        custom_grade_boundaries: item.custom_grade_boundaries || null
      }));

      setSubjects(transformed);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Gagal memuat mata pelajaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error: sbErr } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .eq('is_active', true)
        .order('user_nama_depan');
      if (sbErr) throw sbErr;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error: sbErr } = await supabase
        .from('unit')
        .select('unit_id, unit_name, is_myp')
        .eq('is_myp', true)
        .order('unit_name');
      if (sbErr) throw sbErr;
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchSubjectGroups = async () => {
    try {
      const { data, error: sbErr } = await supabase
        .from('subject_group')
        .select('id, name')
        .order('name');
      if (sbErr) throw sbErr;
      setSubjectGroups(data || []);
    } catch (err) {
      console.error('Error fetching subject groups:', err);
    }
  };

  // Filter computation
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      // Unit Filter
      if (filters.unit && subject.unit_name !== filters.unit) return false;

      // Subject Group Filter
      if (filters.subjectGroup && String(subject.subject_group_id) !== filters.subjectGroup) return false;

      // Teacher Filter
      if (filters.teacher) {
        const fullName = `${subject.user_nama_depan} ${subject.user_nama_belakang}`.toLowerCase();
        if (!fullName.includes(filters.teacher.toLowerCase())) return false;
      }

      // Search Query
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const nameMatch = subject.subject_name.toLowerCase().includes(q);
        const codeMatch = subject.subject_code.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }

      // Active Tab Filter
      if (activeTab === 'core' && !subject.core_subject) return false;
      if (activeTab === 'other' && subject.core_subject) return false;

      return true;
    });
  }, [subjects, filters, activeTab]);

  // Counts for tabs
  const totalCount = useMemo(() => {
    return subjects.filter(subject => {
      if (filters.unit && subject.unit_name !== filters.unit) return false;
      if (filters.subjectGroup && String(subject.subject_group_id) !== filters.subjectGroup) return false;
      if (filters.teacher) {
        const fullName = `${subject.user_nama_depan} ${subject.user_nama_belakang}`.toLowerCase();
        if (!fullName.includes(filters.teacher.toLowerCase())) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const nameMatch = subject.subject_name.toLowerCase().includes(q);
        const codeMatch = subject.subject_code.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }
      return true;
    }).length;
  }, [subjects, filters]);

  const coreCount = useMemo(() => {
    return subjects.filter(subject => {
      if (!subject.core_subject) return false;
      if (filters.unit && subject.unit_name !== filters.unit) return false;
      if (filters.subjectGroup && String(subject.subject_group_id) !== filters.subjectGroup) return false;
      if (filters.teacher) {
        const fullName = `${subject.user_nama_depan} ${subject.user_nama_belakang}`.toLowerCase();
        if (!fullName.includes(filters.teacher.toLowerCase())) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const nameMatch = subject.subject_name.toLowerCase().includes(q);
        const codeMatch = subject.subject_code.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }
      return true;
    }).length;
  }, [subjects, filters]);

  const otherCount = totalCount - coreCount;

  const validateForm = () => {
    const errors = {};
    if (!formData.subject_name.trim()) errors.subject_name = 'Nama mata pelajaran wajib diisi';
    if (!formData.subject_user_id) errors.subject_user_id = 'Pilih guru koordinator';
    if (!formData.subject_unit_id) errors.subject_unit_id = 'Pilih unit sekolah';
    if (formData.subject_code && formData.subject_code.length > 12) {
      errors.subject_code = 'Kode mapel maksimal 12 karakter';
    }
    if (formData.subject_guide && formData.subject_guide.trim()) {
      try {
        const u = new URL(formData.subject_guide.trim());
        if (!/^https?:$/.test(u.protocol)) throw new Error();
      } catch {
        errors.subject_guide = 'URL harus valid (contoh: https://drive.google.com/...)';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let iconUrl = editingSubject?.subject_icon || null;
      if (removeIcon) {
        iconUrl = null;
      } else if (iconFile) {
        setUploadingIcon(true);
        const ext = iconFile.name.split('.').pop();
        const path = `subject-icons/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('profile-pictures')
          .upload(path, iconFile, { cacheControl: '3600', upsert: false });
        if (uploadErr) throw uploadErr;

        const { data: pub } = supabase.storage.from('profile-pictures').getPublicUrl(path);
        iconUrl = pub?.publicUrl || null;
        setUploadingIcon(false);
      }

      const submitData = {
        subject_name: formData.subject_name.trim(),
        subject_user_id: Number(formData.subject_user_id),
        subject_unit_id: Number(formData.subject_unit_id || units[0]?.unit_id),
        subject_code: formData.subject_code?.trim() || null,
        subject_guide: formData.subject_guide?.trim() || null,
        subject_icon: iconUrl,
        grading_method: formData.grading_method || 'highest',
        core_subject: !!formData.core_subject,
        is_community_project: !!formData.is_community_project,
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

      if (editingSubject) {
        const { error: updateErr } = await supabase
          .from('subject')
          .update(submitData)
          .eq('subject_id', editingSubject.subject_id);

        if (updateErr) throw updateErr;
        showNotification('Sukses', 'Mata pelajaran berhasil diperbarui.', 'success');
      } else {
        const { error: insertErr } = await supabase
          .from('subject')
          .insert([submitData]);

        if (insertErr) throw insertErr;
        showNotification('Sukses', 'Mata pelajaran baru berhasil ditambahkan.', 'success');
      }

      setShowForm(false);
      resetForm();
      await fetchSubjects();
    } catch (err) {
      console.error('Error saving subject:', err);
      showNotification('Error', 'Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
      setUploadingIcon(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subject_name: '',
      subject_user_id: '',
      subject_unit_id: units.length > 0 ? String(units[0].unit_id) : '',
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
    setFormErrors({});
    setIconFile(null);
    setIconPreview(null);
    setRemoveIcon(false);
    setEditingSubject(null);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      subject_name: subject.subject_name,
      subject_user_id: subject.subject_user_id || '',
      subject_unit_id: subject.subject_unit_id || (units.length > 0 ? String(units[0].unit_id) : ''),
      subject_code: subject.subject_code || '',
      subject_guide: subject.subject_guide || '',
      grading_method: subject.grading_method || 'highest',
      core_subject: !!subject.core_subject,
      is_community_project: !!subject.is_community_project,
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
  };

  const handleDelete = async (subject) => {
    if (!confirm(`Hapus mata pelajaran "${subject.subject_name}"?`)) return;

    try {
      const { error: delErr } = await supabase.from('subject').delete().eq('subject_id', subject.subject_id);
      if (delErr) throw delErr;

      await fetchSubjects();
      showNotification('Sukses', 'Mata pelajaran berhasil dihapus.', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menghapus: ' + err.message, 'error');
    }
  };

  const handleAddNew = () => {
    setEditingSubject(null);
    setFormData({
      subject_name: '',
      subject_user_id: '',
      subject_unit_id: units.length > 0 ? String(units[0].unit_id) : '',
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
    setIconFile(null);
    setIconPreview(null);
    setRemoveIcon(false);
    setShowForm(true);
    setFormErrors({});
  };

  // Criteria & Rubrics Management Functions
  const handleManageCriteria = async (subject) => {
    setSelectedSubject(subject);
    setShowCriteriaModal(true);
    await fetchCriteria(subject.subject_id);
  };

  const fetchCriteria = async (subjectId) => {
    setLoadingCriteria(true);
    try {
      const { data: criteriaData, error: cErr } = await supabase
        .from('criteria')
        .select('*')
        .eq('subject_id', subjectId)
        .order('code');

      if (cErr) throw cErr;
      setCriteria(criteriaData || []);

      if (criteriaData && criteriaData.length > 0) {
        const criterionIds = criteriaData.map(c => c.criterion_id);
        const { data: strandsData, error: sErr } = await supabase
          .from('strands')
          .select('*')
          .in('criterion_id', criterionIds)
          .order('year_level, label');

        if (sErr) throw sErr;
        setStrands(strandsData || []);

        if (strandsData && strandsData.length > 0) {
          const strandIds = strandsData.map(s => s.strand_id);
          const { data: rubricsData, error: rErr } = await supabase
            .from('rubrics')
            .select('*')
            .in('strand_id', strandIds)
            .order('min_score');

          if (rErr) throw rErr;
          setRubrics(rubricsData || []);
        } else {
          setRubrics([]);
        }
      } else {
        setStrands([]);
        setRubrics([]);
      }
    } catch (err) {
      showNotification('Error', 'Gagal memuat kriteria: ' + err.message, 'error');
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleSaveCriteria = async () => {
    if (!criteriaFormData.code.trim() || !criteriaFormData.name.trim()) {
      showNotification('Error', 'Kode dan nama kriteria wajib diisi.', 'error');
      return;
    }

    try {
      if (editingCriterion) {
        const { error: upErr } = await supabase
          .from('criteria')
          .update({ code: criteriaFormData.code.toUpperCase().trim(), name: criteriaFormData.name.trim() })
          .eq('criterion_id', editingCriterion.criterion_id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from('criteria')
          .insert([{
            subject_id: selectedSubject.subject_id,
            code: criteriaFormData.code.toUpperCase().trim(),
            name: criteriaFormData.name.trim()
          }]);
        if (insErr) throw insErr;
      }

      await fetchCriteria(selectedSubject.subject_id);
      setShowCriteriaForm(false);
      showNotification('Sukses', editingCriterion ? 'Kriteria berhasil diperbarui.' : 'Kriteria berhasil ditambahkan.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleDeleteCriteria = async (criterion) => {
    if (!confirm(`Hapus Kriteria ${criterion.code}? Semua strand dan rubrik terkait akan ikut terhapus.`)) return;

    try {
      const criterionStrands = strands.filter(s => s.criterion_id === criterion.criterion_id);
      const strandIds = criterionStrands.map(s => s.strand_id);

      if (strandIds.length > 0) {
        const { error: rubErr } = await supabase.from('rubrics').delete().in('strand_id', strandIds);
        if (rubErr) throw rubErr;

        const { error: strErr } = await supabase.from('strands').delete().eq('criterion_id', criterion.criterion_id);
        if (strErr) throw strErr;
      }

      const { error: critErr } = await supabase.from('criteria').delete().eq('criterion_id', criterion.criterion_id);
      if (critErr) throw critErr;

      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Sukses', 'Kriteria berhasil dihapus.', 'success');
    } catch (err) {
      showNotification('Error', 'Gagal menghapus kriteria: ' + err.message, 'error');
    }
  };

  const handleSaveStrand = async () => {
    if (!strandFormData.criterion_id || !strandFormData.year_level || !strandFormData.content.trim()) {
      showNotification('Error', 'Kriteria, Year Level, dan Deskripsi wajib diisi.', 'error');
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
        const { error: upErr } = await supabase.from('strands').update(payload).eq('strand_id', editingStrand.strand_id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from('strands').insert([payload]);
        if (insErr) throw insErr;
      }

      await fetchCriteria(selectedSubject.subject_id);
      setShowStrandForm(false);
      showNotification('Sukses', editingStrand ? 'Strand berhasil diperbarui.' : 'Strand berhasil ditambahkan.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleDeleteStrand = async (strand) => {
    if (!confirm('Hapus strand ini beserta rubriknya?')) return;
    try {
      const { error: rErr } = await supabase.from('rubrics').delete().eq('strand_id', strand.strand_id);
      if (rErr) throw rErr;

      const { error: sErr } = await supabase.from('strands').delete().eq('strand_id', strand.strand_id);
      if (sErr) throw sErr;

      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Sukses', 'Strand berhasil dihapus.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleSaveRubric = async () => {
    if (!rubricFormData.band_label.trim() || !rubricFormData.description.trim()) {
      showNotification('Error', 'Band label dan deskripsi rubrik wajib diisi.', 'error');
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
        const { error: upErr } = await supabase.from('rubrics').update(payload).eq('rubric_id', editingRubric.rubric_id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from('rubrics').insert([payload]);
        if (insErr) throw insErr;
      }

      await fetchCriteria(selectedSubject.subject_id);
      setShowRubricForm(false);
      showNotification('Sukses', editingRubric ? 'Rubrik diperbarui.' : 'Rubrik ditambahkan.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleDeleteRubric = async (rubric) => {
    if (!confirm('Hapus rubrik ini?')) return;
    try {
      const { error: rErr } = await supabase.from('rubrics').delete().eq('rubric_id', rubric.rubric_id);
      if (rErr) throw rErr;

      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Sukses', 'Rubrik berhasil dihapus.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleCopyCriteria = async (sourceId, targetId) => {
    if (!sourceId || !targetId) return;
    try {
      setIsCopying(true);
      const { data: sourceCriteria, error: errC } = await supabase.from('criteria').select('*').eq('subject_id', sourceId);
      if (errC) throw errC;

      if (!sourceCriteria || sourceCriteria.length === 0) {
        showNotification('Error', 'Mata pelajaran sumber belum memiliki kriteria.', 'error');
        setIsCopying(false);
        return;
      }

      const sourceCriteriaIds = sourceCriteria.map(c => c.criterion_id);
      const { data: sourceStrands } = await supabase.from('strands').select('*').in('criterion_id', sourceCriteriaIds);
      const sourceStrandIds = (sourceStrands || []).map(s => s.strand_id);

      let sourceRubrics = [];
      if (sourceStrandIds.length > 0) {
        const { data: sr } = await supabase.from('rubrics').select('*').in('strand_id', sourceStrandIds);
        sourceRubrics = sr || [];
      }

      for (const oldCrit of sourceCriteria) {
        let targetCrit = criteria.find(c => c.code === oldCrit.code);
        if (!targetCrit) {
          const { data: newCrit, error: insCErr } = await supabase
            .from('criteria')
            .insert([{ subject_id: targetId, code: oldCrit.code, name: oldCrit.name }])
            .select()
            .single();
          if (insCErr) throw insCErr;
          targetCrit = newCrit;
        }

        const myOldStrands = (sourceStrands || []).filter(s => s.criterion_id === oldCrit.criterion_id);
        for (const oldStrand of myOldStrands) {
          let targetStrand = strands.find(s => s.criterion_id === targetCrit.criterion_id && s.year_level === oldStrand.year_level && s.label === oldStrand.label);
          if (!targetStrand) {
            const { data: newStrand, error: insSErr } = await supabase
              .from('strands')
              .insert([{ criterion_id: targetCrit.criterion_id, year_level: oldStrand.year_level, label: oldStrand.label, content: oldStrand.content }])
              .select()
              .single();
            if (insSErr) throw insSErr;
            targetStrand = newStrand;
          }

          const myOldRubrics = sourceRubrics.filter(r => r.strand_id === oldStrand.strand_id);
          const rubricsToInsert = [];
          for (const oldRub of myOldRubrics) {
            rubricsToInsert.push({
              strand_id: targetStrand.strand_id,
              band_label: oldRub.band_label,
              min_score: oldRub.min_score,
              max_score: oldRub.max_score,
              description: oldRub.description
            });
          }

          if (rubricsToInsert.length > 0) {
            await supabase.from('rubrics').insert(rubricsToInsert);
          }
        }
      }

      await fetchCriteria(targetId);
      showNotification('Sukses', 'Kriteria berhasil disalin!', 'success');
      setCopySourceSubjectId('');
    } catch (err) {
      showNotification('Error', 'Gagal menyalin kriteria: ' + err.message, 'error');
    } finally {
      setIsCopying(false);
    }
  };

  // Minimalist-UI Input Styles
  const inputStyle = {
    background: isDark ? '#18181B' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── HEADER (MATCHING /data/pyp) ────────────────────────────────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-xs" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: isDark ? '#60A5FA' : '#0284C7' }}>
            <FontAwesomeIcon icon={faBookOpen} className="text-base" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
              Mata Pelajaran
            </h1>
            <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
              Daftar mata pelajaran, koordinator guru, kriteria penilaian, dan rubrik MYP.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          style={{
            background: isDark ? '#F4F4F5' : '#111111',
            color: isDark ? '#111111' : '#FFFFFF',
          }}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      {/* ── BENTO FILTER BAR ─────────────────────────────────────────────────── */}
      <div className="p-3.5 rounded-lg border mb-6" style={{ background: cardBg, borderColor }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-semibold tracking-wider" style={{ color: textSecondary }}>
              Pencarian
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama atau kode mapel..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{ ...inputStyle, paddingLeft: '32px' }}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-xs" style={{ color: textSecondary }} />
            </div>
          </div>

          {/* School Unit Filter */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-semibold tracking-wider" style={{ color: textSecondary }}>
              Unit Sekolah
            </label>
            <select
              value={filters.unit}
              onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Semua Unit</option>
              {units.map(u => (
                <option key={u.unit_id} value={u.unit_name}>{u.unit_name} (MYP)</option>
              ))}
            </select>
          </div>

          {/* Subject Group Filter */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-semibold tracking-wider" style={{ color: textSecondary }}>
              Kelompok Mapel
            </label>
            <select
              value={filters.subjectGroup}
              onChange={e => setFilters(prev => ({ ...prev, subjectGroup: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Semua Kelompok</option>
              {subjectGroups.map(sg => (
                <option key={sg.id} value={String(sg.id)}>{sg.name}</option>
              ))}
            </select>
          </div>

          {/* Teacher Filter */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-semibold tracking-wider" style={{ color: textSecondary }}>
              Guru Koordinator
            </label>
            <input
              type="text"
              placeholder="Nama guru koordinator..."
              value={filters.teacher}
              onChange={e => setFilters(prev => ({ ...prev, teacher: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION (/data/pyp STYLE) ────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'all',   label: 'Semua Mata Pelajaran', count: totalCount, icon: faBookOpen },
          { id: 'core',  label: 'Mata Pelajaran Wajib', count: coreCount,  icon: faAward },
          { id: 'other', label: 'Mata Pelajaran Pilihan', count: otherCount, icon: faLayerGroup },
        ].map(t => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '12px 0',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: active ? textPrimary : textSecondary,
                borderBottom: active ? `2px solid ${textPrimary}` : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <FontAwesomeIcon icon={t.icon} style={{ fontSize: '12px', color: active ? (isDark ? '#60A5FA' : '#0284C7') : textSecondary }} />
              <span>{t.label}</span>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-mono font-medium"
                style={{
                  background: active ? (isDark ? '#27272A' : '#E1F3FE') : subtleBg,
                  color: active ? (isDark ? '#F4F4F5' : '#1F6C9F') : textSecondary
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── ERROR MESSAGE IF ANY ─────────────────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-lg border mb-6 text-xs font-mono" style={{ background: '#FDEBEC', borderColor: '#FECACA', color: '#9F2F2D' }}>
          {error}
        </div>
      )}

      {/* ── SUBJECTS TABLE ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center" style={{ color: textSecondary }}>
          <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-3" />
          <p className="text-xs m-0">Memuat daftar mata pelajaran...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="p-12 text-center rounded-lg border" style={{ background: cardBg, borderColor, borderStyle: 'dashed' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: subtleBg, color: textSecondary }}>
            <FontAwesomeIcon icon={faBookOpen} className="text-base" />
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>
            Tidak ada mata pelajaran
          </h3>
          <p className="text-xs mb-4 max-w-sm mx-auto" style={{ color: textSecondary }}>
            Tidak ada mata pelajaran yang cocok dengan filter yang Anda tentukan.
          </p>
          <button
            type="button"
            onClick={handleAddNew}
            className="px-3.5 py-1.5 rounded text-xs font-semibold"
            style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF' }}
          >
            + Tambah Mata Pelajaran
          </button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b font-mono text-[10px] uppercase tracking-wider" style={{ background: subtleBg, borderColor, color: textSecondary }}>
                <th className="px-4 py-2.5 w-10">#</th>
                <th className="px-4 py-2.5 w-12">Ikon</th>
                <th className="px-4 py-2.5">Nama Mata Pelajaran</th>
                <th className="px-4 py-2.5 w-24">Kode</th>
                <th className="px-4 py-2.5">Kelompok Mapel</th>
                <th className="px-4 py-2.5">Koordinator Guru</th>
                <th className="px-4 py-2.5 w-28">Unit</th>
                <th className="px-4 py-2.5 w-24">Raport</th>
                <th className="px-4 py-2.5 text-right w-52">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor }}>
              {filteredSubjects.map((subject, idx) => (
                <tr key={subject.subject_id} style={{ background: cardBg }}>
                  <td className="px-4 py-3 font-mono text-secondary">{idx + 1}</td>
                  <td className="px-4 py-3">
                    {subject.subject_icon ? (
                      <img src={subject.subject_icon} alt={subject.subject_name} className="w-7 h-7 rounded object-cover border" style={{ borderColor }} />
                    ) : (
                      <div className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs" style={{ background: subtleBg, color: textSecondary }}>
                        {subject.subject_name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: textPrimary }}>
                      {subject.subject_name}
                    </div>
                    {subject.subject_guide && (
                      <a
                        href={subject.subject_guide}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-0.5 text-[11px] hover:underline"
                        style={{ color: isDark ? '#60A5FA' : '#0284C7' }}
                      >
                        <span>Panduan Mapel</span>
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px]" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: textSecondary }}>
                    {subject.subject_code || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {subject.subject_group_name ? (
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#FBF3DB', color: '#956400', border: '1px solid #FDE68A' }}>
                        {subject.subject_group_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: textPrimary }}>
                    {subject.user_nama_depan ? `${subject.user_nama_depan} ${subject.user_nama_belakang}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: textSecondary }}>
                    {subject.unit_name || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {subject.include_in_print !== false ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#EDF3EC', color: '#346538', border: '1px solid #B2D8B4' }}>
                        Cetak
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}>
                        Sembunyi
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(subject)}
                        className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                        style={{ background: subtleBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                      >
                        <FontAwesomeIcon icon={faEdit} className="mr-1 text-[10px]" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleManageCriteria(subject)}
                        className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                        style={{ background: '#E1F3FE', color: '#1F6C9F', border: '1px solid #BAE6FD' }}
                      >
                        <FontAwesomeIcon icon={faListCheck} className="mr-1 text-[10px]" />
                        Kriteria
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(subject)}
                        className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                        style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #FECACA' }}
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-1 text-[10px]" />
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT SUBJECT ────────────────────────────────────────── */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Subject Name */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Nama Mata Pelajaran *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Mathematics Standard Level"
                value={formData.subject_name}
                onChange={e => setFormData({ ...formData, subject_name: e.target.value })}
                style={inputStyle}
              />
              {formErrors.subject_name && (
                <p className="text-red-500 text-[11px] mt-1">{formErrors.subject_name}</p>
              )}
            </div>

            {/* Code & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                  Kode Mapel
                </label>
                <input
                  type="text"
                  placeholder="Contoh: MATH7A"
                  value={formData.subject_code}
                  onChange={e => setFormData({ ...formData, subject_code: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                  Unit Sekolah *
                </label>
                <select
                  required
                  value={formData.subject_unit_id || (units[0]?.unit_id ? String(units[0].unit_id) : '')}
                  disabled={units.length <= 1}
                  onChange={e => setFormData({ ...formData, subject_unit_id: e.target.value })}
                  style={{
                    ...selectStyle,
                    opacity: units.length <= 1 ? 0.9 : 1,
                    cursor: units.length <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {units.map(u => (
                    <option key={u.unit_id} value={u.unit_id}>{u.unit_name} (MYP)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teacher & Subject Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                  Guru Koordinator *
                </label>
                <select
                  required
                  value={formData.subject_user_id}
                  onChange={e => setFormData({ ...formData, subject_user_id: e.target.value })}
                  style={selectStyle}
                >
                  <option value="">Pilih Guru Koordinator</option>
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_nama_depan} {u.user_nama_belakang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                  Kelompok Mapel (MYP Subject Group)
                </label>
                <select
                  value={formData.subject_group_id}
                  onChange={e => setFormData({ ...formData, subject_group_id: e.target.value })}
                  style={selectStyle}
                >
                  <option value="">Pilih Kelompok Mapel</option>
                  {subjectGroups.map(sg => (
                    <option key={sg.id} value={sg.id}>{sg.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Guide */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Link Panduan Mapel (Google Drive / URL PDF)
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.subject_guide}
                onChange={e => setFormData({ ...formData, subject_guide: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Grading Calculation Method */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Metode Kalkulasi Nilai Akhir
              </label>
              <select
                value={formData.grading_method}
                onChange={e => setFormData({ ...formData, grading_method: e.target.value })}
                style={selectStyle}
              >
                <option value="highest">Highest (Best-fit) — Standar IB MYP</option>
                <option value="average">Average (Rata-rata seluruh strand)</option>
                <option value="median">Median (Nilai tengah)</option>
                <option value="mode">Mode (Nilai paling sering muncul)</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formData.core_subject}
                  onChange={e => setFormData({ ...formData, core_subject: e.target.checked })}
                  className="rounded"
                />
                <span style={{ color: textPrimary }}>Mata Pelajaran Wajib (Core)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formData.include_in_print}
                  onChange={e => setFormData({ ...formData, include_in_print: e.target.checked })}
                  className="rounded"
                />
                <span style={{ color: textPrimary }}>Tampilkan di Cetak Raport</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded text-xs font-medium"
                style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded text-xs font-semibold flex items-center gap-1.5"
                style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</> : <><FontAwesomeIcon icon={faSave} /> Simpan Mata Pelajaran</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: MANAGE CRITERIA & RUBRICS ─────────────────────────────────── */}
      {showCriteriaModal && selectedSubject && (
        <Modal
          isOpen={showCriteriaModal}
          onClose={() => setShowCriteriaModal(false)}
          title={`Kriteria & Rubrik — ${selectedSubject.subject_name}`}
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Sync / Copy Tool */}
            <div className="p-3 rounded-lg border flex items-center justify-between flex-wrap gap-3" style={{ background: subtleBg, borderColor }}>
              <span className="text-xs" style={{ color: textSecondary }}>
                Salin susunan kriteria dari mata pelajaran lain:
              </span>
              <div className="flex gap-2 items-center">
                <select
                  value={copySourceSubjectId}
                  onChange={e => setCopySourceSubjectId(e.target.value)}
                  style={{ ...selectStyle, width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                >
                  <option value="">Pilih Mapel Sumber</option>
                  {subjects.filter(s => s.subject_id !== selectedSubject.subject_id).map(s => (
                    <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!copySourceSubjectId || isCopying}
                  onClick={() => handleCopyCriteria(copySourceSubjectId, selectedSubject.subject_id)}
                  className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all"
                  style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', opacity: (!copySourceSubjectId || isCopying) ? 0.5 : 1 }}
                >
                  <FontAwesomeIcon icon={faCopy} />
                  <span>{isCopying ? 'Menyalin...' : 'Salin Kriteria'}</span>
                </button>
              </div>
            </div>

            {/* Criteria Header Action */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider" style={{ color: textPrimary }}>
                Daftar Kriteria ({criteria.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingCriterion(null);
                  setCriteriaFormData({ code: '', name: '' });
                  setShowCriteriaForm(true);
                }}
                className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5"
                style={{ background: '#E1F3FE', color: '#1F6C9F', border: '1px solid #BAE6FD' }}
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                <span>Tambah Kriteria</span>
              </button>
            </div>

            {/* Loading / Empty State */}
            {loadingCriteria ? (
              <div className="p-8 text-center" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin className="text-lg mb-2" />
                <p className="text-xs m-0">Memuat kriteria &amp; rubrik...</p>
              </div>
            ) : criteria.length === 0 ? (
              <div className="p-8 text-center rounded-lg border" style={{ borderColor, borderStyle: 'dashed', color: textSecondary }}>
                Belum ada kriteria penilaian yang ditambahkan untuk mata pelajaran ini.
              </div>
            ) : (
              <div className="space-y-4">
                {criteria.map(crit => {
                  const critStrands = strands.filter(s => s.criterion_id === crit.criterion_id);

                  return (
                    <div key={crit.criterion_id} className="p-4 rounded-lg border" style={{ background: cardBg, borderColor }}>
                      {/* Criterion Header */}
                      <div className="flex items-center justify-between pb-2 mb-3 border-b" style={{ borderColor }}>
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs" style={{ background: '#E1F3FE', color: '#1F6C9F', border: '1px solid #BAE6FD' }}>
                            {crit.code}
                          </span>
                          <span className="font-semibold text-sm" style={{ color: textPrimary }}>
                            {crit.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCriterion(crit);
                              setCriteriaFormData({ code: crit.code, name: crit.name });
                              setShowCriteriaForm(true);
                            }}
                            className="px-2.5 py-1 rounded text-xs"
                            style={{ background: subtleBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCriteria(crit)}
                            className="px-2.5 py-1 rounded text-xs"
                            style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #FECACA' }}
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStrand(null);
                              setStrandFormData({ criterion_id: crit.criterion_id, year_level: '1', label: '', content: '' });
                              setShowStrandForm(true);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-semibold"
                            style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF' }}
                          >
                            + Strand
                          </button>
                        </div>
                      </div>

                      {/* Strands List */}
                      {critStrands.length === 0 ? (
                        <div className="text-xs italic py-2" style={{ color: textSecondary }}>
                          Belum ada strand untuk Kriteria {crit.code}.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {critStrands.map(st => {
                            const strandRubrics = rubrics.filter(r => r.strand_id === st.strand_id).sort((a, b) => (a.min_score || 0) - (b.min_score || 0));

                            return (
                              <div key={st.strand_id} className="p-3 rounded-lg border" style={{ background: subtleBg, borderColor }}>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium" style={{ background: cardBg, color: textPrimary, border: `1px solid ${borderColor}` }}>
                                        MYP Year {st.year_level}
                                      </span>
                                      {st.label && (
                                        <span className="text-xs font-medium" style={{ color: textSecondary }}>
                                          Strand {st.label}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs m-0 leading-relaxed" style={{ color: textPrimary }}>
                                      {st.content}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStrand(st);
                                        setStrandFormData({ criterion_id: st.criterion_id, year_level: st.year_level, label: st.label || '', content: st.content });
                                        setShowStrandForm(true);
                                      }}
                                      className="px-2 py-0.5 rounded text-[11px]"
                                      style={{ background: cardBg, color: textSecondary, border: `1px solid ${borderColor}` }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStrand(st)}
                                      className="px-2 py-0.5 rounded text-[11px]"
                                      style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #FECACA' }}
                                    >
                                      Hapus
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedStrandForRubric(st);
                                        setEditingRubric(null);
                                        setRubricFormData({ strand_id: st.strand_id, band_label: '1-2', min_score: '1', max_score: '2', description: '' });
                                        setShowRubricForm(true);
                                      }}
                                      className="px-2 py-0.5 rounded text-[11px] font-medium"
                                      style={{ background: '#E1F3FE', color: '#1F6C9F', border: '1px solid #BAE6FD' }}
                                    >
                                      + Rubrik
                                    </button>
                                  </div>
                                </div>

                                {/* Rubric Bands */}
                                {strandRubrics.length > 0 && (
                                  <div className="mt-3 pt-2.5 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2" style={{ borderColor }}>
                                    {strandRubrics.map(rub => (
                                      <div key={rub.rubric_id} className="p-2.5 rounded border" style={{ background: cardBg, borderColor }}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-mono text-xs font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                                            Band {rub.band_label}
                                          </span>
                                          <div className="flex gap-1.5 text-[10px]">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingRubric(rub);
                                                setRubricFormData({ strand_id: rub.strand_id, band_label: rub.band_label, min_score: rub.min_score || '', max_score: rub.max_score || '', description: rub.description });
                                                setShowRubricForm(true);
                                              }}
                                              style={{ color: textSecondary }}
                                            >
                                              edit
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteRubric(rub)}
                                              style={{ color: '#EF4444' }}
                                            >
                                              hapus
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-[11px] leading-relaxed m-0" style={{ color: textSecondary }}>
                                          {rub.description}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
        </Modal>
      )}

      {/* ── SUB-MODAL: ADD/EDIT CRITERION ────────────────────────────────────── */}
      {showCriteriaForm && (
        <Modal
          isOpen={showCriteriaForm}
          onClose={() => setShowCriteriaForm(false)}
          title={editingCriterion ? 'Edit Kriteria' : 'Tambah Kriteria'}
          size="sm"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Kode Kriteria (contoh: A, B, C, D) *
              </label>
              <input
                type="text"
                maxLength={2}
                value={criteriaFormData.code}
                onChange={e => setCriteriaFormData({ ...criteriaFormData, code: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Nama Kriteria *
              </label>
              <input
                type="text"
                placeholder="Contoh: Knowing and Understanding"
                value={criteriaFormData.name}
                onChange={e => setCriteriaFormData({ ...criteriaFormData, name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
              <button
                type="button"
                onClick={() => setShowCriteriaForm(false)}
                className="px-3.5 py-1.5 rounded text-xs"
                style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCriteria}
                className="px-4 py-1.5 rounded text-xs font-semibold"
                style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF' }}
              >
                Simpan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── SUB-MODAL: ADD/EDIT STRAND ───────────────────────────────────────── */}
      {showStrandForm && (
        <Modal
          isOpen={showStrandForm}
          onClose={() => setShowStrandForm(false)}
          title={editingStrand ? 'Edit Strand' : 'Tambah Strand'}
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Tingkat Kelas (MYP Year Level) *
              </label>
              <select
                value={strandFormData.year_level}
                onChange={e => setStrandFormData({ ...strandFormData, year_level: e.target.value })}
                style={selectStyle}
              >
                <option value="1">MYP Year 1 (Kelas 6)</option>
                <option value="2">MYP Year 2 (Kelas 7)</option>
                <option value="3">MYP Year 3 (Kelas 8)</option>
                <option value="4">MYP Year 4 (Kelas 9)</option>
                <option value="5">MYP Year 5 (Kelas 10)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Label Romawi (contoh: i, ii, iii)
              </label>
              <input
                type="text"
                placeholder="Contoh: i"
                value={strandFormData.label}
                onChange={e => setStrandFormData({ ...strandFormData, label: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Deskripsi Capaian Strand *
              </label>
              <textarea
                rows={3}
                placeholder="Deskripsikan apa yang harus dicapai siswa pada strand ini..."
                value={strandFormData.content}
                onChange={e => setStrandFormData({ ...strandFormData, content: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
              <button
                type="button"
                onClick={() => setShowStrandForm(false)}
                className="px-3.5 py-1.5 rounded text-xs"
                style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveStrand}
                className="px-4 py-1.5 rounded text-xs font-semibold"
                style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF' }}
              >
                Simpan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── SUB-MODAL: ADD/EDIT RUBRIC ───────────────────────────────────────── */}
      {showRubricForm && (
        <Modal
          isOpen={showRubricForm}
          onClose={() => setShowRubricForm(false)}
          title={editingRubric ? 'Edit Rubrik Band' : 'Tambah Rubrik Band'}
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                  Label Band *
                </label>
                <input
                  type="text"
                  placeholder="1-2"
                  value={rubricFormData.band_label}
                  onChange={e => setRubricFormData({ ...rubricFormData, band_label: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                  Skor Min
                </label>
                <input
                  type="number"
                  placeholder="1"
                  value={rubricFormData.min_score}
                  onChange={e => setRubricFormData({ ...rubricFormData, min_score: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                  Skor Max
                </label>
                <input
                  type="number"
                  placeholder="2"
                  value={rubricFormData.max_score}
                  onChange={e => setRubricFormData({ ...rubricFormData, max_score: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: textPrimary }}>
                Deskripsi Kualitatif Level *
              </label>
              <textarea
                rows={4}
                placeholder="Deskripsikan capaian siswa pada rentang skor ini..."
                value={rubricFormData.description}
                onChange={e => setRubricFormData({ ...rubricFormData, description: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
              <button
                type="button"
                onClick={() => setShowRubricForm(false)}
                className="px-3.5 py-1.5 rounded text-xs"
                style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRubric}
                className="px-4 py-1.5 rounded text-xs font-semibold"
                style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF' }}
              >
                Simpan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── NOTIFICATION MODAL ───────────────────────────────────────────────── */}
      {notification.isOpen && (
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification({ ...notification, isOpen: false })}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      )}

    </div>
  );
}
