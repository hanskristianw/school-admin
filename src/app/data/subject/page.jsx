'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faPlus,
  faSearch,
  faFilter,
  faEdit,
  faTrash,
  faSpinner,
  faLayerGroup,
  faExternalLinkAlt,
  faChevronDown,
  faChevronRight,
  faCopy,
  faCheckCircle,
  faExclamationTriangle,
  faAward,
  faListCheck,
  faSliders
} from '@fortawesome/free-solid-svg-icons';

export default function SubjectManagement() {
  const { theme, isDark } = useTheme();

  // Primary Data States
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const [expandedStrands, setExpandedStrands] = useState(new Set());

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
    type: 'all' // 'all' | 'core' | 'other'
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
          unit:subject_unit_id (
            unit_name
          ),
          subject_group:subject_group_id (
            name
          )
        `)
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
      setError('Failed to fetch subjects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
        .eq('is_active', true)
        .order('user_nama_depan');

      if (usersErr) throw usersErr;

      const { data: rolesData } = await supabase
        .from('role')
        .select('role_id, role_name, is_teacher')
        .eq('is_teacher', true);

      const teacherRoleIds = (rolesData || []).map(r => r.role_id);
      const teacherUsers = (usersData || []).filter(u => teacherRoleIds.includes(u.user_role_id));

      setUsers(teacherUsers.length > 0 ? teacherUsers : (usersData || []));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error: sbErr } = await supabase
        .from('unit')
        .select('unit_id, unit_name')
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

  // Filtered Subjects Computation
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      // Unit Filter
      if (filters.unit && subject.unit_name !== filters.unit) return false;

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

      // Type Filter
      if (filters.type === 'core' && !subject.core_subject) return false;
      if (filters.type === 'other' && subject.core_subject) return false;

      return true;
    });
  }, [subjects, filters]);

  const coreSubjectsList = useMemo(() => filteredSubjects.filter(s => s.core_subject), [filteredSubjects]);
  const otherSubjectsList = useMemo(() => filteredSubjects.filter(s => !s.core_subject), [filteredSubjects]);

  const validateForm = () => {
    const errors = {};
    if (!formData.subject_name.trim()) errors.subject_name = 'Subject name is required';
    if (!formData.subject_user_id) errors.subject_user_id = 'Teacher selection is required';
    if (!formData.subject_unit_id) errors.subject_unit_id = 'Unit selection is required';
    if (formData.subject_code && formData.subject_code.length > 12) {
      errors.subject_code = 'Subject code must be 12 characters or less';
    }
    if (formData.subject_guide && formData.subject_guide.trim()) {
      try {
        const u = new URL(formData.subject_guide.trim());
        if (!/^https?:$/.test(u.protocol)) throw new Error();
      } catch {
        errors.subject_guide = 'Must be a valid URL (e.g. https://drive.google.com/...)';
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
      const submitData = {
        subject_name: formData.subject_name.trim(),
        subject_user_id: Number(formData.subject_user_id),
        subject_unit_id: Number(formData.subject_unit_id),
        subject_code: formData.subject_code?.trim() || null,
        subject_guide: formData.subject_guide?.trim() || null,
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

      if (iconFile) {
        setUploadingIcon(true);
        const ext = iconFile.name.split('.').pop();
        const path = `subject-icons/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('profile-pictures')
          .upload(path, iconFile, { cacheControl: '3600', upsert: false });
        if (uploadErr) throw uploadErr;

        const { data: pub } = supabase.storage.from('profile-pictures').getPublicUrl(path);
        submitData.subject_icon = pub?.publicUrl || null;
        setUploadingIcon(false);
      } else if (removeIcon) {
        submitData.subject_icon = null;
      }

      let res;
      if (editingSubject) {
        res = await supabase.from('subject').update(submitData).eq('subject_id', editingSubject.subject_id);
      } else {
        res = await supabase.from('subject').insert([submitData]);
      }

      if (res.error) throw new Error(res.error.message);

      await fetchSubjects();
      setShowForm(false);
      setEditingSubject(null);
      showNotification('Success', editingSubject ? 'Subject updated successfully.' : 'New subject added successfully.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      subject_name: subject.subject_name,
      subject_user_id: subject.subject_user_id || '',
      subject_unit_id: subject.subject_unit_id || '',
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
    if (!confirm(`Are you sure you want to delete "${subject.subject_name}"?`)) return;

    try {
      const { error: delErr } = await supabase.from('subject').delete().eq('subject_id', subject.subject_id);
      if (delErr) throw delErr;

      await fetchSubjects();
      showNotification('Success', 'Subject deleted successfully.', 'success');
    } catch (err) {
      showNotification('Error', 'Failed to delete subject: ' + err.message, 'error');
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
      showNotification('Error', 'Failed to fetch criteria: ' + err.message, 'error');
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleSaveCriteria = async () => {
    if (!criteriaFormData.code.trim() || !criteriaFormData.name.trim()) {
      showNotification('Error', 'Code and Name are required.', 'error');
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
      showNotification('Success', editingCriterion ? 'Criterion updated.' : 'Criterion added.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleDeleteCriteria = async (criterion) => {
    if (!confirm(`Delete Criterion ${criterion.code}? All strands and rubrics will also be removed.`)) return;

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
      showNotification('Success', 'Criterion deleted.', 'success');
    } catch (err) {
      showNotification('Error', 'Failed to delete criterion: ' + err.message, 'error');
    }
  };

  const handleSaveStrand = async () => {
    if (!strandFormData.criterion_id || !strandFormData.year_level || !strandFormData.content.trim()) {
      showNotification('Error', 'Criterion, Year Level, and Content are required.', 'error');
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
      showNotification('Success', editingStrand ? 'Strand updated.' : 'Strand added.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleDeleteStrand = async (strand) => {
    if (!confirm('Delete this strand and its rubrics?')) return;
    try {
      const { error: rErr } = await supabase.from('rubrics').delete().eq('strand_id', strand.strand_id);
      if (rErr) throw rErr;

      const { error: sErr } = await supabase.from('strands').delete().eq('strand_id', strand.strand_id);
      if (sErr) throw sErr;

      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Success', 'Strand deleted.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleSaveRubric = async () => {
    if (!rubricFormData.band_label.trim() || !rubricFormData.description.trim()) {
      showNotification('Error', 'Band Label and Description are required.', 'error');
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
      showNotification('Success', editingRubric ? 'Rubric updated.' : 'Rubric added.', 'success');
    } catch (err) {
      showNotification('Error', err.message, 'error');
    }
  };

  const handleDeleteRubric = async (rubric) => {
    if (!confirm('Delete this rubric?')) return;
    try {
      const { error: rErr } = await supabase.from('rubrics').delete().eq('rubric_id', rubric.rubric_id);
      if (rErr) throw rErr;

      await fetchCriteria(selectedSubject.subject_id);
      showNotification('Success', 'Rubric deleted.', 'success');
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
        showNotification('Error', 'Source subject has no criteria to copy.', 'error');
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
      showNotification('Success', 'Criteria successfully synced!', 'success');
      setCopySourceSubjectId('');
    } catch (err) {
      showNotification('Error', 'Failed to copy criteria: ' + err.message, 'error');
    } finally {
      setIsCopying(false);
    }
  };

  // Minimalist Styling Tokens (strictly 1px #EAEAEA borders, crisp Geist/SF font, muted pastels)
  const pageBg = isDark ? '#09090B' : '#FBFBFA';
  const cardBg = isDark ? '#18181B' : '#FFFFFF';
  const borderColor = isDark ? '#27272A' : '#EAEAEA';
  const textPrimary = isDark ? '#F4F4F5' : '#111111';
  const textSecondary = isDark ? '#A1A1AA' : '#787774';

  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '8px',
    fontSize: '13px'
  };

  const selectStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '8px',
    fontSize: '13px',
    padding: '8px 12px'
  };

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '32px 24px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------------------- */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 32px auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
              <FontAwesomeIcon icon={faBookOpen} style={{ fontSize: '10px' }} />
              Curriculum & Subject Directory
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: textPrimary }}>
              Subject Management
            </h1>
            <p style={{ margin: '6px 0 0 0', color: textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Configure academic subjects, teacher coordinators, grading methods, and IB MYP criteria rubrics.
            </p>
          </div>

          <Button
            onClick={handleAddNew}
            style={{
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              padding: '10px 16px',
              boxShadow: 'none'
            }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
            Add New Subject
          </Button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* FILTER & SEARCH BAR */}
        {/* ------------------------------------------------------------- */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
            
            {/* Search Input */}
            <div>
              <Label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: textSecondary, marginBottom: '6px', display: 'block' }}>
                Search Subject
              </Label>
              <div style={{ position: 'relative' }}>
                <Input
                  type="text"
                  placeholder="Subject name or code..."
                  value={filters.search}
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', paddingLeft: '32px', height: '36px' }}
                />
                <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '10px', top: '11px', color: textSecondary, fontSize: '12px' }} />
              </div>
            </div>

            {/* School Unit Filter */}
            <div>
              <Label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: textSecondary, marginBottom: '6px', display: 'block' }}>
                School Unit
              </Label>
              <select
                value={filters.unit}
                onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                style={{ ...selectStyle, width: '100%' }}
              >
                <option value="">All Units</option>
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_name}>{u.unit_name}</option>
                ))}
              </select>
            </div>

            {/* Teacher Search Filter */}
            <div>
              <Label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: textSecondary, marginBottom: '6px', display: 'block' }}>
                Teacher / Coordinator
              </Label>
              <Input
                type="text"
                placeholder="Teacher name..."
                value={filters.teacher}
                onChange={e => setFilters(prev => ({ ...prev, teacher: e.target.value }))}
                style={{ ...inputStyle, height: '36px' }}
              />
            </div>

            {/* Subject Category Type */}
            <div>
              <Label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: textSecondary, marginBottom: '6px', display: 'block' }}>
                Subject Type
              </Label>
              <select
                value={filters.type}
                onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                style={{ ...selectStyle, width: '100%' }}
              >
                <option value="all">All Types</option>
                <option value="core">Core Subjects Only</option>
                <option value="other">Other Subjects</option>
              </select>
            </div>

          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', border: `1px solid ${isDark ? '#EF4444' : '#F87171'}`, borderRadius: '8px', padding: '12px 16px', color: isDark ? '#FCA5A5' : '#9F2F2D', fontSize: '13px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBJECTS DIRECTORY LIST / TABLES */}
        {/* ------------------------------------------------------------- */}
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: textSecondary }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '20px', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>Loading subject directory...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          /* CLEAN ELEGANT EMPTY STATE */
          <div style={{ background: cardBg, border: `1px dashed ${borderColor}`, borderRadius: '12px', padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isDark ? '#27272A' : '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: textSecondary }}>
              <FontAwesomeIcon icon={faBookOpen} style={{ fontSize: '18px' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0', color: textPrimary }}>
              No Subjects Found
            </h3>
            <p style={{ fontSize: '13px', color: textSecondary, margin: '0 0 20px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              No subjects match your selected filters. Try clearing filters or add a new subject.
            </p>
            <Button
              onClick={handleAddNew}
              style={{
                background: textPrimary,
                color: isDark ? '#09090B' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                padding: '8px 16px'
              }}
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
              Add Subject
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* CORE SUBJECTS SECTION */}
            {coreSubjectsList.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: isDark ? '#60A5FA' : '#1F6C9F' }}>
                    Core Subjects
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', fontFamily: 'monospace' }}>
                    {coreSubjectsList.length}
                  </span>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: isDark ? '#27272A' : '#F9F9F8', borderBottom: `1px solid ${borderColor}`, color: textSecondary, fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px', width: '40px' }}>#</th>
                        <th style={{ padding: '12px 16px', width: '50px' }}>Icon</th>
                        <th style={{ padding: '12px 16px' }}>Subject Name</th>
                        <th style={{ padding: '12px 16px', width: '100px' }}>Code</th>
                        <th style={{ padding: '12px 16px', width: '90px' }}>Print</th>
                        <th style={{ padding: '12px 16px' }}>Teacher / Coordinator</th>
                        <th style={{ padding: '12px 16px', width: '120px' }}>Unit</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '220px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coreSubjectsList.map((subject, idx) => (
                        <tr key={subject.subject_id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                          <td style={{ padding: '14px 16px', color: textSecondary, fontFamily: 'monospace' }}>{idx + 1}</td>
                          <td style={{ padding: '14px 16px' }}>
                            {subject.subject_icon ? (
                              <img src={subject.subject_icon} alt={subject.subject_name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                                {subject.subject_name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: textPrimary }}>
                            <div>{subject.subject_name}</div>
                            {subject.subject_guide && (
                              <a href={subject.subject_guide} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: isDark ? '#60A5FA' : '#1F6C9F', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                Subject Guide <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '9px' }} />
                              </a>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: textSecondary, fontSize: '12px' }}>
                            {subject.subject_code || '-'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {subject.include_in_print !== false ? (
                              <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '9999px', background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC', color: isDark ? '#4ADE80' : '#346538', textTransform: 'uppercase' }}>Included</span>
                            ) : (
                              <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '9999px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, textTransform: 'uppercase' }}>Hidden</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', color: textPrimary }}>
                            {subject.user_nama_depan ? `${subject.user_nama_depan} ${subject.user_nama_belakang}` : '-'}
                          </td>
                          <td style={{ padding: '14px 16px', color: textSecondary }}>
                            {subject.unit_name || '-'}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <Button size="sm" onClick={() => handleEdit(subject)} style={{ background: isDark ? '#27272A' : '#F4F4F5', color: textPrimary, border: `1px solid ${borderColor}`, padding: '4px 10px', fontSize: '12px' }}>
                                Edit
                              </Button>
                              <Button size="sm" onClick={() => handleManageCriteria(subject)} style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`, padding: '4px 10px', fontSize: '12px' }}>
                                Criteria
                              </Button>
                              <Button size="sm" onClick={() => handleDelete(subject)} style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#FCA5A5' : '#9F2F2D', border: `1px solid ${isDark ? '#EF4444' : '#FCA5A5'}`, padding: '4px 10px', fontSize: '12px' }}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* OTHER SUBJECTS SECTION */}
            {otherSubjectsList.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: textSecondary }}>
                    Other Subjects
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, fontFamily: 'monospace' }}>
                    {otherSubjectsList.length}
                  </span>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: isDark ? '#27272A' : '#F9F9F8', borderBottom: `1px solid ${borderColor}`, color: textSecondary, fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px', width: '40px' }}>#</th>
                        <th style={{ padding: '12px 16px', width: '50px' }}>Icon</th>
                        <th style={{ padding: '12px 16px' }}>Subject Name</th>
                        <th style={{ padding: '12px 16px', width: '100px' }}>Code</th>
                        <th style={{ padding: '12px 16px', width: '90px' }}>Print</th>
                        <th style={{ padding: '12px 16px' }}>Teacher / Coordinator</th>
                        <th style={{ padding: '12px 16px', width: '120px' }}>Unit</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '220px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherSubjectsList.map((subject, idx) => (
                        <tr key={subject.subject_id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                          <td style={{ padding: '14px 16px', color: textSecondary, fontFamily: 'monospace' }}>{idx + 1}</td>
                          <td style={{ padding: '14px 16px' }}>
                            {subject.subject_icon ? (
                              <img src={subject.subject_icon} alt={subject.subject_name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                                {subject.subject_name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: textPrimary }}>
                            <div>{subject.subject_name}</div>
                            {subject.subject_guide && (
                              <a href={subject.subject_guide} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: isDark ? '#60A5FA' : '#1F6C9F', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                Subject Guide <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '9px' }} />
                              </a>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: textSecondary, fontSize: '12px' }}>
                            {subject.subject_code || '-'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {subject.include_in_print !== false ? (
                              <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '9999px', background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC', color: isDark ? '#4ADE80' : '#346538', textTransform: 'uppercase' }}>Included</span>
                            ) : (
                              <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '9999px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, textTransform: 'uppercase' }}>Hidden</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', color: textPrimary }}>
                            {subject.user_nama_depan ? `${subject.user_nama_depan} ${subject.user_nama_belakang}` : '-'}
                          </td>
                          <td style={{ padding: '14px 16px', color: textSecondary }}>
                            {subject.unit_name || '-'}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <Button size="sm" onClick={() => handleEdit(subject)} style={{ background: isDark ? '#27272A' : '#F4F4F5', color: textPrimary, border: `1px solid ${borderColor}`, padding: '4px 10px', fontSize: '12px' }}>
                                Edit
                              </Button>
                              <Button size="sm" onClick={() => handleManageCriteria(subject)} style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`, padding: '4px 10px', fontSize: '12px' }}>
                                Criteria
                              </Button>
                              <Button size="sm" onClick={() => handleDelete(subject)} style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#FCA5A5' : '#9F2F2D', border: `1px solid ${isDark ? '#EF4444' : '#FCA5A5'}`, padding: '4px 10px', fontSize: '12px' }}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT SUBJECT */}
      {/* ------------------------------------------------------------- */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Subject Name */}
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px', display: 'block' }}>
                Subject Name *
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. Mathematics Standard Level"
                value={formData.subject_name}
                onChange={e => setFormData({ ...formData, subject_name: e.target.value })}
                style={inputStyle}
              />
              {formErrors.subject_name && (
                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{formErrors.subject_name}</p>
              )}
            </div>

            {/* Subject Code & Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px', display: 'block' }}>
                  Subject Code
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. MATH7A"
                  value={formData.subject_code}
                  onChange={e => setFormData({ ...formData, subject_code: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px', display: 'block' }}>
                  School Unit *
                </Label>
                <select
                  required
                  value={formData.subject_unit_id}
                  onChange={e => setFormData({ ...formData, subject_unit_id: e.target.value })}
                  style={{ ...selectStyle, width: '100%' }}
                >
                  <option value="">Select Unit</option>
                  {units.map(u => (
                    <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teacher Assignment & Subject Group */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px', display: 'block' }}>
                  Teacher / Coordinator *
                </Label>
                <select
                  required
                  value={formData.subject_user_id}
                  onChange={e => setFormData({ ...formData, subject_user_id: e.target.value })}
                  style={{ ...selectStyle, width: '100%' }}
                >
                  <option value="">Select Teacher</option>
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_nama_depan} {u.user_nama_belakang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px', display: 'block' }}>
                  MYP Subject Group
                </Label>
                <select
                  value={formData.subject_group_id}
                  onChange={e => setFormData({ ...formData, subject_group_id: e.target.value })}
                  style={{ ...selectStyle, width: '100%' }}
                >
                  <option value="">Select Subject Group</option>
                  {subjectGroups.map(sg => (
                    <option key={sg.id} value={sg.id}>{sg.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Guide Link */}
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px', display: 'block' }}>
                Subject Guide URL (Google Drive / PDF)
              </Label>
              <Input
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.subject_guide}
                onChange={e => setFormData({ ...formData, subject_guide: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Grading Calculation Method */}
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px', display: 'block' }}>
                Grading Calculation Method
              </Label>
              <select
                value={formData.grading_method}
                onChange={e => setFormData({ ...formData, grading_method: e.target.value })}
                style={{ ...selectStyle, width: '100%' }}
              >
                <option value="highest">Highest (Best-fit) - IB MYP Standard</option>
                <option value="average">Average (Mean of all strands)</option>
                <option value="median">Median (Middle value)</option>
                <option value="mode">Mode (Most frequent grade)</option>
              </select>
            </div>

            {/* Checkboxes Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={formData.core_subject}
                  onChange={e => setFormData({ ...formData, core_subject: e.target.checked })}
                />
                <span>Core Subject</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={formData.include_in_print}
                  onChange={e => setFormData({ ...formData, include_in_print: e.target.checked })}
                />
                <span>Include in Report Cards</span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '13px' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '13px' }}
              >
                {submitting ? 'Saving...' : 'Save Subject'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANAGE CRITERIA & RUBRICS */}
      {/* ------------------------------------------------------------- */}
      {showCriteriaModal && selectedSubject && (
        <Modal
          isOpen={showCriteriaModal}
          onClose={() => setShowCriteriaModal(false)}
          title={`IB Criteria & Rubrics — ${selectedSubject.subject_name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Sync / Copy Tool */}
            <div style={{ background: isDark ? '#27272A' : '#F9F9F8', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: textSecondary }}>
                Copy criteria structure from another subject:
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={copySourceSubjectId}
                  onChange={e => setCopySourceSubjectId(e.target.value)}
                  style={{ ...selectStyle, padding: '4px 8px', fontSize: '12px' }}
                >
                  <option value="">Select Source Subject</option>
                  {subjects.filter(s => s.subject_id !== selectedSubject.subject_id).map(s => (
                    <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!copySourceSubjectId || isCopying}
                  onClick={() => handleCopyCriteria(copySourceSubjectId, selectedSubject.subject_id)}
                  style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none', fontSize: '12px', padding: '4px 10px' }}
                >
                  <FontAwesomeIcon icon={faCopy} style={{ marginRight: '6px' }} />
                  {isCopying ? 'Syncing...' : 'Sync Criteria'}
                </Button>
              </div>
            </div>

            {/* Criteria Header Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: textPrimary }}>
                Criteria List ({criteria.length})
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCriterion(null);
                  setCriteriaFormData({ code: '', name: '' });
                  setShowCriteriaForm(true);
                }}
                style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`, fontSize: '12px' }}
              >
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: '6px' }} /> Add Criterion
              </Button>
            </div>

            {/* Loading / Empty State */}
            {loadingCriteria ? (
              <div style={{ padding: '32px', textAlign: 'center', color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '18px', marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Loading criteria & rubrics...</p>
              </div>
            ) : criteria.length === 0 ? (
              <div style={{ border: `1px dashed ${borderColor}`, borderRadius: '8px', padding: '32px', textAlign: 'center', color: textSecondary }}>
                <p style={{ margin: 0, fontSize: '13px' }}>No assessment criteria configured for this subject yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {criteria.map(crit => {
                  const critStrands = strands.filter(s => s.criterion_id === crit.criterion_id);

                  return (
                    <div key={crit.criterion_id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px' }}>
                      
                      {/* Criterion Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '6px', background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'monospace', fontSize: '13px' }}>
                            {crit.code}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                            {crit.name}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Button size="sm" onClick={() => {
                            setEditingCriterion(crit);
                            setCriteriaFormData({ code: crit.code, name: crit.name });
                            setShowCriteriaForm(true);
                          }} style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '11px', padding: '2px 8px' }}>
                            Edit
                          </Button>

                          <Button size="sm" onClick={() => handleDeleteCriteria(crit)} style={{ background: 'none', border: `1px solid ${borderColor}`, color: '#EF4444', fontSize: '11px', padding: '2px 8px' }}>
                            Delete
                          </Button>

                          <Button size="sm" onClick={() => {
                            setEditingStrand(null);
                            setStrandFormData({ criterion_id: crit.criterion_id, year_level: '1', label: '', content: '' });
                            setShowStrandForm(true);
                          }} style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none', fontSize: '11px', padding: '2px 8px' }}>
                            + Strand
                          </Button>
                        </div>
                      </div>

                      {/* Strands List */}
                      {critStrands.length === 0 ? (
                        <div style={{ fontSize: '12px', color: textSecondary, fontStyle: 'italic', padding: '8px 0' }}>
                          No strands added for Criterion {crit.code}.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                          {critStrands.map(st => {
                            const strandRubrics = rubrics.filter(r => r.strand_id === st.strand_id).sort((a, b) => (a.min_score || 0) - (b.min_score || 0));

                            return (
                              <div key={st.strand_id} style={{ background: isDark ? '#27272A' : '#FBFBFA', border: `1px solid ${borderColor}`, borderRadius: '6px', padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isDark ? '#3F3F46' : '#EAEAEA', color: textPrimary, fontFamily: 'monospace' }}>
                                        MYP Year {st.year_level}
                                      </span>
                                      {st.label && (
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: textSecondary }}>
                                          Strand ({st.label})
                                        </span>
                                      )}
                                    </div>
                                    <p style={{ fontSize: '13px', margin: 0, color: textPrimary, lineHeight: 1.4 }}>
                                      {st.content}
                                    </p>
                                  </div>

                                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                    <Button size="sm" onClick={() => {
                                      setEditingStrand(st);
                                      setStrandFormData({ criterion_id: st.criterion_id, year_level: st.year_level, label: st.label || '', content: st.content });
                                      setShowStrandForm(true);
                                    }} style={{ background: 'none', border: 'none', color: textSecondary, fontSize: '11px' }}>
                                      Edit
                                    </Button>

                                    <Button size="sm" onClick={() => handleDeleteStrand(st)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px' }}>
                                      Delete
                                    </Button>

                                    <Button size="sm" onClick={() => {
                                      setSelectedStrandForRubric(st);
                                      setEditingRubric(null);
                                      setRubricFormData({ strand_id: st.strand_id, band_label: '1-2', min_score: '1', max_score: '2', description: '' });
                                      setShowRubricForm(true);
                                    }} style={{ background: isDark ? '#3F3F46' : '#EAEAEA', color: textPrimary, border: 'none', fontSize: '11px', padding: '2px 6px' }}>
                                      + Rubric Band
                                    </Button>
                                  </div>
                                </div>

                                {/* Rubrics Display Grid */}
                                {strandRubrics.length > 0 && (
                                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${borderColor}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                                    {strandRubrics.map(rub => (
                                      <div key={rub.rubric_id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '4px', padding: '8px 10px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: isDark ? '#60A5FA' : '#1F6C9F' }}>
                                            Band {rub.band_label}
                                          </span>
                                          <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => {
                                              setEditingRubric(rub);
                                              setRubricFormData({ strand_id: rub.strand_id, band_label: rub.band_label, min_score: rub.min_score || '', max_score: rub.max_score || '', description: rub.description });
                                              setShowRubricForm(true);
                                            }} style={{ background: 'none', border: 'none', color: textSecondary, fontSize: '10px', cursor: 'pointer' }}>
                                              edit
                                            </button>
                                            <button onClick={() => handleDeleteRubric(rub)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '10px', cursor: 'pointer' }}>
                                              del
                                            </button>
                                          </div>
                                        </div>
                                        <p style={{ margin: 0, color: textSecondary, fontSize: '11px', lineHeight: 1.3 }}>
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

      {/* SUB-MODAL: ADD/EDIT CRITERION */}
      {showCriteriaForm && (
        <Modal isOpen={showCriteriaForm} onClose={() => setShowCriteriaForm(false)} title={editingCriterion ? 'Edit Criterion' : 'Add Criterion'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Code (e.g. A, B, C, D) *</Label>
              <Input type="text" maxLength={2} value={criteriaFormData.code} onChange={e => setCriteriaFormData({ ...criteriaFormData, code: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Criterion Name *</Label>
              <Input type="text" placeholder="e.g. Knowing and Understanding" value={criteriaFormData.name} onChange={e => setCriteriaFormData({ ...criteriaFormData, name: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button onClick={() => setShowCriteriaForm(false)} style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '12px' }}>Cancel</Button>
              <Button onClick={handleSaveCriteria} style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '12px' }}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SUB-MODAL: ADD/EDIT STRAND */}
      {showStrandForm && (
        <Modal isOpen={showStrandForm} onClose={() => setShowStrandForm(false)} title={editingStrand ? 'Edit Strand' : 'Add Strand'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>MYP Year Level *</Label>
              <select value={strandFormData.year_level} onChange={e => setStrandFormData({ ...strandFormData, year_level: e.target.value })} style={{ ...selectStyle, width: '100%' }}>
                <option value="1">MYP Year 1 (Grade 6)</option>
                <option value="2">MYP Year 2 (Grade 7)</option>
                <option value="3">MYP Year 3 (Grade 8)</option>
                <option value="4">MYP Year 4 (Grade 9)</option>
                <option value="5">MYP Year 5 (Grade 10)</option>
              </select>
            </div>
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Label / Roman Numeral (e.g. i, ii, iii)</Label>
              <Input type="text" placeholder="e.g. i" value={strandFormData.label} onChange={e => setStrandFormData({ ...strandFormData, label: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Strand Content Description *</Label>
              <textarea rows={3} placeholder="Describe what students should be able to do..." value={strandFormData.content} onChange={e => setStrandFormData({ ...strandFormData, content: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '8px 12px', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button onClick={() => setShowStrandForm(false)} style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '12px' }}>Cancel</Button>
              <Button onClick={handleSaveStrand} style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '12px' }}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SUB-MODAL: ADD/EDIT RUBRIC */}
      {showRubricForm && (
        <Modal isOpen={showRubricForm} onClose={() => setShowRubricForm(false)} title={editingRubric ? 'Edit Rubric Band' : 'Add Rubric Band'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Band Label *</Label>
                <Input type="text" placeholder="1-2" value={rubricFormData.band_label} onChange={e => setRubricFormData({ ...rubricFormData, band_label: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Min Score</Label>
                <Input type="number" placeholder="1" value={rubricFormData.min_score} onChange={e => setRubricFormData({ ...rubricFormData, min_score: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Max Score</Label>
                <Input type="number" placeholder="2" value={rubricFormData.max_score} onChange={e => setRubricFormData({ ...rubricFormData, max_score: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>Level Achievement Description *</Label>
              <textarea rows={4} placeholder="Describe the student achievement at this level..." value={rubricFormData.description} onChange={e => setRubricFormData({ ...rubricFormData, description: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '8px 12px', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button onClick={() => setShowRubricForm(false)} style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '12px' }}>Cancel</Button>
              <Button onClick={handleSaveRubric} style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '12px' }}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* NOTIFICATION MODAL */}
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
