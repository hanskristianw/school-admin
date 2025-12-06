'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faSpinner, faTrash, faUser } from '@fortawesome/free-solid-svg-icons';

export default function AssessmentApproval() {
  const { t, lang } = useI18n();
  const [assessments, setAssessments] = useState([]);
  // topic_id -> topic_nama map for display
  const [topicNameMap, setTopicNameMap] = useState(new Map());
  // criterion_id -> { code, name } map for display
  const [criterionNameMap, setCriterionNameMap] = useState(new Map());
  // detail_kelas options across system for filtering/display
  const [detailKelasOptions, setDetailKelasOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  // actionType can also be 'delete'
  const [submitting, setSubmitting] = useState(false);
  
  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Filter states - default to showing pending approvals
  const [filters, setFilters] = useState({
    status: '0', // Default to status 0 (waiting for approval)
    subject: '',
    user: ''
  });

  // Role: detect if current user is principal
  const [isPrincipal, setIsPrincipal] = useState(false);

  useEffect(() => {
    const detectPrincipal = async () => {
      try {
        // Try localStorage user_data first
        const raw = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null;
        if (raw) {
          try {
            const ud = JSON.parse(raw);
            if (typeof ud?.isPrincipal === 'boolean') {
              setIsPrincipal(ud.isPrincipal);
              if (ud.isPrincipal) setFilters(prev => ({ ...prev, status: '3' }));
              return;
            }
            if (ud?.roleID) {
              const { data: roleData, error: roleErr } = await supabase
                .from('role')
                .select('is_principal')
                .eq('role_id', ud.roleID)
                .single();
              if (!roleErr && roleData) {
                const principal = !!roleData.is_principal;
                setIsPrincipal(principal);
                if (principal) setFilters(prev => ({ ...prev, status: '3' }));
              }
              return;
            }
          } catch (_) {
            // ignore parse errors
          }
        }
        // Fallback: use stored role name if available
        const roleName = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
        if (roleName) {
          const { data: roleDataByName } = await supabase
            .from('role')
            .select('is_principal')
            .eq('role_name', roleName)
            .maybeSingle();
          if (roleDataByName) {
            const principal = !!roleDataByName.is_principal;
            setIsPrincipal(principal);
            if (principal) setFilters(prev => ({ ...prev, status: '3' }));
          }
        }
      } catch (e) {
        // silent fail
      }
    };
    detectPrincipal();
  }, []);

  useEffect(() => {
    fetchAssessments();
  fetchDetailKelasOptions();
    fetchUsers();
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

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch assessments
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessment')
        .select('assessment_id, assessment_nama, assessment_tanggal, assessment_keterangan, assessment_status, assessment_user_id, assessment_detail_kelas_id, assessment_topic_id')
        .order('assessment_tanggal', { ascending: false });

      if (assessmentsError) {
        throw new Error(assessmentsError.message);
      }

      const list = assessmentsData || [];

      // Load topic names for any referenced topic IDs
      const topicIds = Array.from(new Set(list.map(a => a.assessment_topic_id).filter(Boolean)));
      if (topicIds.length) {
        const { data: topicsData, error: topicsErr } = await supabase
          .from('topic')
          .select('topic_id, topic_nama')
          .in('topic_id', topicIds);
        if (!topicsErr && topicsData) {
          setTopicNameMap(new Map(topicsData.map(t => [t.topic_id, t.topic_nama])));
        }
      } else {
        setTopicNameMap(new Map());
      }
      
      // Load criteria for assessments via junction table
      const assessmentIds = list.map(a => a.assessment_id);
      let assessmentCriteriaMap = new Map(); // assessment_id -> array of criteria
      
      if (assessmentIds.length) {
        const { data: junctionData, error: jError } = await supabase
          .from('assessment_criteria')
          .select('assessment_id, criterion_id')
          .in('assessment_id', assessmentIds);
        
        if (!jError && junctionData) {
          // Group by assessment_id
          junctionData.forEach(j => {
            if (!assessmentCriteriaMap.has(j.assessment_id)) {
              assessmentCriteriaMap.set(j.assessment_id, []);
            }
            assessmentCriteriaMap.get(j.assessment_id).push(j.criterion_id);
          });
          
          // Fetch all unique criterion details
          const allCriterionIds = [...new Set(junctionData.map(j => j.criterion_id))];
          let criterionMap = new Map();
          
          if (allCriterionIds.length > 0) {
            const { data: criteriaData, error: cError } = await supabase
              .from('criteria')
              .select('criterion_id, code, name')
              .in('criterion_id', allCriterionIds);
            
            if (!cError && criteriaData) {
              criteriaData.forEach(c => {
                criterionMap.set(c.criterion_id, { code: c.code, name: c.name });
              });
            }
          }
          
          // Map criteria details to assessments
          const enrichedList = list.map(a => {
            const criterionIds = assessmentCriteriaMap.get(a.assessment_id) || [];
            const criteria = criterionIds.map(id => criterionMap.get(id)).filter(Boolean);
            return {
              ...a,
              criteria: criteria // Array of { code, name }
            };
          });
          
          setAssessments(enrichedList);
        } else {
          setAssessments(list.map(a => ({ ...a, criteria: [] })));
        }
      } else {
        setAssessments(list.map(a => ({ ...a, criteria: [] })));
      }
      
    } catch (err) {
      console.error('Error fetching assessments:', err);
      setError(err.message);
  showNotification(t('assessmentApproval.notifErrorTitle'), t('assessmentApproval.notifErrorLoad') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailKelasOptions = async () => {
    try {
      // Step 1: fetch all detail_kelas rows
      const { data: details, error: detailsErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id');
      if (detailsErr) throw new Error(detailsErr.message);

      if (!details || details.length === 0) {
        setDetailKelasOptions([]);
        return;
      }

      const subjectIds = Array.from(new Set(details.map(d => d.detail_kelas_subject_id)));
      const kelasIds = Array.from(new Set(details.map(d => d.detail_kelas_kelas_id)));

      // Step 2: fetch subject names
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name')
        .in('subject_id', subjectIds);
      if (subjectsError) throw new Error(subjectsError.message);

      // Step 3: fetch kelas names
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .in('kelas_id', kelasIds);
      if (kelasErr) throw new Error(kelasErr.message);

      const subjectMap = new Map((subjectsData || []).map(s => [s.subject_id, s.subject_name]));
      const kelasMap = new Map((kelasData || []).map(k => [k.kelas_id, k.kelas_nama]));

      const options = (details || []).map(d => ({
        detail_kelas_id: d.detail_kelas_id,
        subject_id: d.detail_kelas_subject_id,
        subject_name: subjectMap.get(d.detail_kelas_subject_id) || '',
        kelas_id: d.detail_kelas_kelas_id,
        kelas_nama: kelasMap.get(d.detail_kelas_kelas_id) || ''
      }));

      // Sort for nicer dropdown
      options.sort((a, b) => (a.kelas_nama || '').localeCompare(b.kelas_nama || '') || (a.subject_name || '').localeCompare(b.subject_name || ''));

      setDetailKelasOptions(options);
    } catch (err) {
      console.error('Error fetching detail_kelas options:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .eq('is_active', true)
        .order('user_nama_depan');

      if (usersError) {
        throw new Error(usersError.message);
      }

      setUsers(usersData || []);
      
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {t('assessmentApproval.statusWaiting')}
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {t('assessmentApproval.statusWaitingPrincipal')}
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {t('assessmentApproval.statusApproved')}
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {t('assessmentApproval.statusRejected')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {t('assessmentApproval.statusUnknown')}
          </span>
        );
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.user_id === userId);
  return user ? `${user.user_nama_depan} ${user.user_nama_belakang}` : t('assessmentApproval.unknownUser');
  };

  const getSubjectName = (detailKelasId) => {
    const opt = detailKelasOptions.find(o => o.detail_kelas_id === detailKelasId);
    if (!opt) return t('assessmentApproval.unknownSubject');
    return `${opt.subject_name} - ${opt.kelas_nama}`;
  };

  const getKelasName = (detailKelasId) => {
    const opt = detailKelasOptions.find(o => o.detail_kelas_id === detailKelasId);
    return opt?.kelas_nama || '';
  };

  const getTopicName = (topicId) => {
    if (!topicId) return t('assessmentApproval.noTopic');
    return topicNameMap.get(topicId) || t('assessmentApproval.unknownTopic');
  };

  // Convert URLs in plain text into clickable links
  const linkifyText = (text) => {
    if (!text) return '-';
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (!part) return null;
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `http://${part}`;
        return (
          <a
            key={`lnk-${idx}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-words"
          >
            {part}
          </a>
        );
      }
      return <span key={`txt-${idx}`}>{part}</span>;
    });
  };

  const handleApprovalAction = (assessment, action) => {
    const requiredStatus = isPrincipal ? 3 : 0;
    if (assessment.assessment_status !== requiredStatus) {
      showNotification(t('assessmentApproval.warningAlreadyProcessedTitle'), t('assessmentApproval.warningAlreadyProcessed'), 'warning');
      return;
    }
    
    setSelectedAssessment(assessment);
    setActionType(action);
    setShowConfirmModal(true);
  };

  const handleDeleteAction = (assessment) => {
    setSelectedAssessment(assessment);
    setActionType('delete');
    setShowConfirmModal(true);
  };

  const processApproval = async () => {
    if (!selectedAssessment || !actionType) return;

    try {
      setSubmitting(true);
      
      // Delete
      if (actionType === 'delete') {
        const { error: delErr } = await supabase
          .from('assessment')
          .delete()
          .eq('assessment_id', selectedAssessment.assessment_id);
        if (delErr) throw new Error(delErr.message);

        // Update local state by removing the deleted assessment
        setAssessments(assessments.filter(a => a.assessment_id !== selectedAssessment.assessment_id));
        showNotification(
          t('assessmentApproval.notifSuccessTitle'),
          t('assessmentApproval.notifDeleted', { name: selectedAssessment.assessment_nama }),
          'success'
        );

        setShowConfirmModal(false);
        setSelectedAssessment(null);
        setActionType(null);
        return;
      }

      // Principal approves -> back to waiting (0); others -> approved (1)
      const newStatus = actionType === 'approve' ? (isPrincipal ? 0 : 1) : 2;

      // Business rule: Max 2 approved (status=1) assessments per class per date
      if (newStatus === 1) {
        // 1) Resolve kelas_id from selected assessment's detail_kelas
        const { data: dkSel, error: dkSelErr } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_kelas_id')
          .eq('detail_kelas_id', selectedAssessment.assessment_detail_kelas_id)
          .single();
        if (dkSelErr) throw new Error(dkSelErr.message);
        const kelasId = dkSel?.detail_kelas_kelas_id;
        if (kelasId) {
          // 2) All detail_kelas_ids under this kelas
          const { data: dkList, error: dkListErr } = await supabase
            .from('detail_kelas')
            .select('detail_kelas_id')
            .eq('detail_kelas_kelas_id', kelasId);
          if (dkListErr) throw new Error(dkListErr.message);
          const detailIds = (dkList || []).map(d => d.detail_kelas_id);
          if (detailIds.length > 0) {
            // 3) Count approved assessments on the same date for this kelas
            const { count: approvedCount, error: countErr } = await supabase
              .from('assessment')
              .select('*', { count: 'exact', head: true })
              .eq('assessment_status', 1)
              .eq('assessment_tanggal', selectedAssessment.assessment_tanggal)
              .in('assessment_detail_kelas_id', detailIds);
            if (countErr) throw new Error(countErr.message);
            if ((approvedCount || 0) >= 2) {
              // Prevent approval and notify user
              showNotification(
                t('assessmentApproval.notifErrorTitle') || 'Gagal',
                t('assessmentApproval.limitPerDayReached') || 'Pada tanggal tersebut sudah ada 2 assessment disetujui untuk kelas ini. Persetujuan dibatalkan.',
                'error'
              );
              setSubmitting(false);
              return;
            }
          }
        }
      }
      
      const { error } = await supabase
        .from('assessment')
        .update({ assessment_status: newStatus })
        .eq('assessment_id', selectedAssessment.assessment_id);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setAssessments(assessments.map(assessment => 
        assessment.assessment_id === selectedAssessment.assessment_id 
          ? { ...assessment, assessment_status: newStatus }
          : assessment
      ));

  if (actionType === 'approve') {
        showNotification(t('assessmentApproval.notifSuccessTitle'), t('assessmentApproval.notifApproved', { name: selectedAssessment.assessment_nama }), 'success');
      } else {
        showNotification(t('assessmentApproval.notifSuccessTitle'), t('assessmentApproval.notifRejected', { name: selectedAssessment.assessment_nama }), 'success');
      }

      setShowConfirmModal(false);
      setSelectedAssessment(null);
      setActionType(null);
      
    } catch (err) {
      console.error('Error processing approval:', err);
  showNotification(t('assessmentApproval.notifErrorTitle'), t('assessmentApproval.notifErrorProcess') + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    return (
      // Principals only see status = 3 items
      (!isPrincipal || assessment.assessment_status === 3) &&
      (!filters.status || assessment.assessment_status.toString() === filters.status) &&
  (!filters.subject || assessment.assessment_detail_kelas_id?.toString() === filters.subject) &&
      (!filters.user || assessment.assessment_user_id.toString() === filters.user)
    );
  });

  const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: assessments.length,
    waiting: assessments.filter(a => a.assessment_status === 0).length,
    waitingPrincipal: assessments.filter(a => a.assessment_status === 3).length,
    approved: assessments.filter(a => a.assessment_status === 1).length,
    rejected: assessments.filter(a => a.assessment_status === 2).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('assessmentApproval.title')}</h1>
        <p className="text-gray-600 mt-1">{t('assessmentApproval.subtitle')}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Waiting</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.waiting}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Principal</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.waitingPrincipal}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faTimes} className="text-red-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('assessmentApproval.filtersTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('assessmentApproval.status')}</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isPrincipal ? (
                  <>
                    <option value="3">{t('assessmentApproval.statusWaitingPrincipal')}</option>
                  </>
                ) : (
                  <>
                    <option value="">{t('assessmentApproval.allStatus')}</option>
                    <option value="0">{t('assessmentApproval.statusWaiting')}</option>
                    <option value="3">{t('assessmentApproval.statusWaitingPrincipal')}</option>
                    <option value="1">{t('assessmentApproval.statusApproved')}</option>
                    <option value="2">{t('assessmentApproval.statusRejected')}</option>
                  </>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('assessmentApproval.subject')}</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('assessmentApproval.allSubjects')}</option>
                {detailKelasOptions.map(opt => (
                  <option key={opt.detail_kelas_id} value={opt.detail_kelas_id}>
                    {opt.subject_name} - {opt.kelas_nama}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('assessmentApproval.teacher')}</label>
              <select
                value={filters.user}
                onChange={(e) => setFilters({...filters, user: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('assessmentApproval.allTeachers')}</option>
                {users.map(user => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_nama_depan} {user.user_nama_belakang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-blue-500" />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">{t('assessmentApproval.empty')}</p>
            <p className="text-sm text-gray-500 mt-1">No assessments found matching your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssessments.map((assessment) => {
            const teacherName = getUserName(assessment.assessment_user_id)
            const subjectKelas = getSubjectName(assessment.assessment_detail_kelas_id)
            const kelasName = getKelasName(assessment.assessment_detail_kelas_id)
            const gradeMatch = kelasName?.match(/(\d{1,2})/)
            const gradeNumber = gradeMatch ? gradeMatch[1] : ''
            const canApprove = (!isPrincipal && assessment.assessment_status === 0) || (isPrincipal && assessment.assessment_status === 3)
            
            return (
              <div 
                key={assessment.assessment_id}
                className="relative border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all overflow-hidden bg-white"
              >
                {/* Grade Watermark */}
                {gradeNumber && (
                  <div className="absolute top-0 right-0 text-[120px] font-black text-gray-50 leading-none pointer-events-none select-none" style={{ transform: 'translate(20%, -20%)' }}>
                    {gradeNumber}
                  </div>
                )}
                
                {/* Header */}
                <div className="mb-4 pb-3 border-b border-gray-100 relative z-10">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-2 flex-1">
                      {assessment.assessment_nama}
                    </h3>
                    {getStatusBadge(assessment.assessment_status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                      {getSubjectName(assessment.assessment_detail_kelas_id).split(' - ')[0] || 'N/A'}
                    </span>
                    {kelasName && (
                      <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-medium">
                        {kelasName}
                      </span>
                    )}
                    {assessment.criteria && assessment.criteria.length > 0 ? (
                      assessment.criteria.map(c => (
                        <span key={c.code} className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-xs font-bold">
                          Criterion {c.code}
                        </span>
                      ))
                    ) : (
                      <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold">
                        ⚠ No Criteria
                      </span>
                    )}

                  </div>
                </div>

                {/* Criteria Names */}
                {assessment.criteria && assessment.criteria.length > 0 && (
                  <div className="mb-3 relative z-10">
                    <p className="text-xs text-purple-500 font-medium mb-1">IB MYP Criteria</p>
                    <div className="flex flex-wrap gap-2">
                      {assessment.criteria.map(c => (
                        <div key={c.code} className="text-sm text-gray-700 bg-purple-50 px-2 py-1 rounded font-medium">
                          {c.code}: {c.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="mb-3 flex items-center gap-2 text-sm relative z-10">
                  <span className="text-gray-500">📅</span>
                  <span className="text-gray-700 font-medium">
                    {formatDate(assessment.assessment_tanggal)}
                  </span>
                </div>

                {/* Teacher */}
                <div className="mb-3 flex items-center gap-2 text-sm relative z-10">
                  <FontAwesomeIcon icon={faUser} className="text-gray-500" />
                  <span className="text-gray-700">
                    {teacherName}
                  </span>
                </div>

                {/* Topic */}
                {assessment.assessment_topic_id && (
                  <div className="mb-3 relative z-10">
                    <p className="text-xs text-cyan-500 font-medium mb-1">Topic/Unit</p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {topicNameMap.get(assessment.assessment_topic_id) || '-'}
                    </p>
                  </div>
                )}

                {/* Note */}
                {assessment.assessment_keterangan && (
                  <div className="mb-3 relative z-10">
                    <p className="text-xs text-cyan-500 font-medium mb-1">Note</p>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {linkifyText(assessment.assessment_keterangan)}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {canApprove && (
                  <div className="relative z-10 pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleApprovalAction(assessment, 'approve')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      {t('assessmentApproval.approve')}
                    </button>
                    <button
                      onClick={() => handleApprovalAction(assessment, 'reject')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      {t('assessmentApproval.reject')}
                    </button>
                  </div>
                )}
                
                {/* Delete Button - admin only, for rejected assessments */}
                {!isPrincipal && assessment.assessment_status === 2 && (
                  <div className="relative z-10 pt-3 border-t border-gray-100 mt-3">
                    <button
                      onClick={() => handleApprovalAction(assessment, 'delete')}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      {t('assessmentApproval.delete')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedAssessment(null);
          setActionType(null);
        }}
  title={actionType === 'approve' ? t('assessmentApproval.confirmTitleApprove') : actionType === 'reject' ? t('assessmentApproval.confirmTitleReject') : t('assessmentApproval.confirmTitleDelete')}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {
              t('assessmentApproval.confirmQuestion', {
                action: actionType === 'approve' ? t('assessmentApproval.confirmActionApprove') : t('assessmentApproval.confirmActionReject'),
                name: selectedAssessment?.assessment_nama || ''
              })
            }
          </p>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm space-y-2">
              <div><strong>{t('assessmentApproval.labelName')}:</strong> {selectedAssessment?.assessment_nama}</div>
              <div><strong>{t('assessmentApproval.labelDate')}:</strong> {selectedAssessment && formatDate(selectedAssessment.assessment_tanggal)}</div>
              <div><strong>{t('assessmentApproval.labelSubject')}:</strong> {selectedAssessment && getSubjectName(selectedAssessment.assessment_detail_kelas_id)}</div>
              <div><strong>{t('assessmentApproval.labelTopic')}:</strong> {selectedAssessment && getTopicName(selectedAssessment.assessment_topic_id)}</div>
              <div><strong>{t('assessmentApproval.labelTeacher')}:</strong> {selectedAssessment && getUserName(selectedAssessment.assessment_user_id)}</div>
              {selectedAssessment?.assessment_keterangan && (
                <div className="space-x-1">
                  <strong>{t('assessmentApproval.labelNote')}:</strong>
                  <span className="break-words">{linkifyText(selectedAssessment.assessment_keterangan)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => {
                setShowConfirmModal(false);
                setSelectedAssessment(null);
                setActionType(null);
              }}
              disabled={submitting}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              {t('assessmentApproval.btnCancel')}
            </Button>
            <Button
              onClick={processApproval}
              disabled={submitting}
              className={actionType === 'approve'
                ? "bg-green-600 hover:bg-green-700 text-white"
                : actionType === 'reject'
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-700 hover:bg-gray-800 text-white"}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {t('assessmentApproval.processing')}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={actionType === 'approve' ? faCheck : actionType === 'reject' ? faTimes : faTrash} className="mr-2" />
                  {actionType === 'approve' ? t('assessmentApproval.btnYesApprove') : actionType === 'reject' ? t('assessmentApproval.btnYesReject') : t('assessmentApproval.btnYesDelete')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
