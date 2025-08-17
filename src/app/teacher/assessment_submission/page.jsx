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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus,
  faBook,
  faClipboardList,
  faInfoCircle,
  faSpinner,
  faPaperPlane
} from '@fortawesome/free-solid-svg-icons';

export default function AssessmentSubmission() {
  const { t, lang } = useI18n();
  const [assessments, setAssessments] = useState([]);
  // detail_kelas options for this teacher: { detail_kelas_id, subject_id, subject_name, kelas_id, kelas_nama }
  const [detailKelasOptions, setDetailKelasOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [formData, setFormData] = useState({
    assessment_nama: '',
    assessment_tanggal: '',
    assessment_keterangan: '',
    assessment_detail_kelas_id: '',
    assessment_topic_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Topic state (dependent on selected subject within detail_kelas)
  const [topicsCache, setTopicsCache] = useState(new Map()); // key: subject_id|kelas_id -> topics[]
  const [topics, setTopics] = useState([]); // topics for current selected subject
  const [topicsLoading, setTopicsLoading] = useState(false);
  
  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    subject: '', // holds detail_kelas_id
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    // Get current user ID from localStorage
    const kr_id = localStorage.getItem("kr_id");
    if (kr_id) {
      setCurrentUserId(parseInt(kr_id));
      fetchUserDetailKelas(parseInt(kr_id));
      fetchUserAssessments(parseInt(kr_id));
    } else {
  setError(t('teacherSubmission.unauth'));
      setLoading(false);
    }
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

  const fetchUserDetailKelas = async (userId) => {
    try {
      // 1) Get subjects taught by this user
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name')
        .eq('subject_user_id', userId)
        .order('subject_name');
      if (subjectsError) throw new Error(subjectsError.message);

      if (!subjectsData || subjectsData.length === 0) {
        setDetailKelasOptions([]);
        return;
      }

      const subjectIds = subjectsData.map(s => s.subject_id);

      // 2) Get detail_kelas rows linked to those subjects
      const { data: details, error: detailErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id')
        .in('detail_kelas_subject_id', subjectIds);
      if (detailErr) throw new Error(detailErr.message);

      if (!details || details.length === 0) {
        setDetailKelasOptions([]);
        return;
      }

      const kelasIds = Array.from(new Set(details.map(d => d.detail_kelas_kelas_id)));

      // 3) Get kelas names
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .in('kelas_id', kelasIds);
      if (kelasErr) throw new Error(kelasErr.message);

      const kelasMap = new Map((kelasData || []).map(k => [k.kelas_id, k.kelas_nama]));
      const subjectMap = new Map((subjectsData || []).map(s => [s.subject_id, s.subject_name]));

      const options = (details || []).map(d => ({
        detail_kelas_id: d.detail_kelas_id,
        subject_id: d.detail_kelas_subject_id,
        subject_name: subjectMap.get(d.detail_kelas_subject_id) || 'Unknown Subject',
        kelas_id: d.detail_kelas_kelas_id,
        kelas_nama: kelasMap.get(d.detail_kelas_kelas_id) || '-'
      }));

      // Sort by kelas then subject
      options.sort((a, b) => (a.kelas_nama || '').localeCompare(b.kelas_nama || '') || (a.subject_name || '').localeCompare(b.subject_name || ''));

      setDetailKelasOptions(options);
    } catch (err) {
      console.error('Error fetching detail_kelas for user:', err);
      setError(t('teacherSubmission.notifErrorSubjects') + err.message);
    }
  };

  const fetchUserAssessments = async (userId) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch assessments yang dibuat oleh user ini
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessment')
        .select('assessment_id, assessment_nama, assessment_tanggal, assessment_keterangan, assessment_status, assessment_user_id, assessment_detail_kelas_id')
        .eq('assessment_user_id', userId)
        .order('assessment_tanggal', { ascending: false });

      if (assessmentsError) {
        throw new Error(assessmentsError.message);
      }

      setAssessments(assessmentsData || []);
      
    } catch (err) {
  console.error('Error fetching user assessments:', err);
  setError(t('teacherSubmission.notifErrorLoad') + err.message);
  showNotification(t('teacherSubmission.notifErrorTitle'), t('teacherSubmission.notifErrorLoad') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
  switch (status) {
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      {t('teacherSubmission.statusWaiting')}
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {t('teacherSubmission.statusWaitingPrincipal')}
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      {t('teacherSubmission.statusApproved')}
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      {t('teacherSubmission.statusRejected')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {t('teacherSubmission.statusBadgeUnknown')}
          </span>
        );
    }
  };

  const getSubjectName = (detailKelasId) => {
    const opt = detailKelasOptions.find(o => o.detail_kelas_id === detailKelasId);
    return opt ? `${opt.subject_name} - ${opt.kelas_nama}` : 'Unknown Subject';
  };

  // Helper function untuk menghitung perbedaan hari
  const getDaysDifference = (date1, date2) => {
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function untuk validasi tanggal minimum
  const getMinimumDate = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2); // Minimal 2 hari ke depan
    return minDate;
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.assessment_nama.trim()) {
  errors.assessment_nama = t('teacherSubmission.validation.nameRequired');
    }
    
    if (!formData.assessment_tanggal) {
  errors.assessment_tanggal = t('teacherSubmission.validation.dateRequired');
    }
    
    if (!formData.assessment_detail_kelas_id) {
  errors.assessment_detail_kelas_id = t('teacherSubmission.validation.subjectRequired');
    }
    // Topic enforcement: now ALWAYS require a topic for a selected subject+class. If none exist, block submission with an error.
    if (formData.assessment_detail_kelas_id) {
      const selectedDetail = detailKelasOptions.find(o => o.detail_kelas_id.toString() === formData.assessment_detail_kelas_id.toString());
      const subjId = selectedDetail?.subject_id;
      const kelasId = selectedDetail?.kelas_id;
      if (subjId && kelasId) {
        const cacheKey = subjId + '|' + kelasId;
        const availableTopics = topicsCache.get(cacheKey) || [];
        if (availableTopics.length === 0) {
          errors.assessment_topic_id = t('teacherSubmission.validation.topicRequired');
        } else if (!formData.assessment_topic_id) {
          errors.assessment_topic_id = t('teacherSubmission.validation.topicRequired');
        }
      }
    }
    
    // Validasi tanggal 
    if (formData.assessment_tanggal) {
      const selectedDate = new Date(formData.assessment_tanggal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      // Cek apakah tanggal di masa lalu
      if (selectedDate < today) {
        errors.assessment_tanggal = t('teacherSubmission.validation.datePast');
      }
      // Cek apakah tanggal hanya beda 1 hari (besok)
      else {
        const daysDiff = getDaysDifference(today, selectedDate);
        if (daysDiff === 1) {
          const todayStr = today.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const selectedStr = selectedDate.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          errors.assessment_tanggal = t('teacherSubmission.validation.dateTomorrow', { date: selectedStr })
        }
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
    
  if (!currentUserId) {
  showNotification(t('teacherSubmission.notifErrorTitle'), t('teacherSubmission.unauth'), 'error');
      return;
    }

    try {
      setSubmitting(true);
      // Check per-day limit: max 2 assessments for the same detail_kelas on the same date
      const selectedDetailId = parseInt(formData.assessment_detail_kelas_id);
      const selectedDateStr = formData.assessment_tanggal;
      const { count: existingCount, error: countErr } = await supabase
        .from('assessment')
        .select('assessment_id', { count: 'exact', head: true })
        .eq('assessment_detail_kelas_id', selectedDetailId)
        .eq('assessment_tanggal', selectedDateStr);
      if (countErr) throw new Error(countErr.message);
      if ((existingCount || 0) >= 2) {
        const selectedOpt = detailKelasOptions.find(o => o.detail_kelas_id === selectedDetailId);
        const className = selectedOpt?.kelas_nama || '-';
        const friendlyDate = new Date(selectedDateStr).toLocaleDateString(
          lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID',
          { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        );
        const msg = t('teacherSubmission.limitPerDayReachedSubmit', { class: className, date: friendlyDate })
          || `On ${friendlyDate}, class ${className} already has 2 assessments scheduled. Please choose another date.`;
        showNotification(t('teacherSubmission.notifWarnTitle'), msg, 'warning');
        setSubmitting(false);
        return;
      }
      
      // Determine status based on date difference: 2-6 days => waiting for principal approval (3)
      const selectedDate = new Date(formData.assessment_tanggal);
      selectedDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = getDaysDifference(today, selectedDate);
      const computedStatus = diffDays >= 2 && diffDays <= 6 ? 3 : 0;

      const assessmentData = {
        assessment_nama: formData.assessment_nama.trim(),
        assessment_tanggal: formData.assessment_tanggal,
        assessment_keterangan: formData.assessment_keterangan.trim() || null,
        assessment_status: computedStatus, // 0: waiting, 3: waiting for principal approval
        assessment_user_id: currentUserId,
  assessment_detail_kelas_id: parseInt(formData.assessment_detail_kelas_id),
  assessment_topic_id: formData.assessment_topic_id ? parseInt(formData.assessment_topic_id) : null
      };

      const { data, error } = await supabase
        .from('assessment')
        .insert([assessmentData])
        .select();

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      if (data && data[0]) {
        setAssessments([data[0], ...assessments]);
      }

      // Reset form
      setFormData({
        assessment_nama: '',
        assessment_tanggal: '',
        assessment_keterangan: '',
  assessment_detail_kelas_id: '',
  assessment_topic_id: ''
      });
      setFormErrors({});
      setShowForm(false);

      showNotification(
        t('teacherSubmission.notifSuccessTitle'), 
        t('teacherSubmission.notifSuccessMsg'), 
        'success'
      );
      
    } catch (err) {
  console.error('Error submitting assessment:', err);
  showNotification(t('teacherSubmission.notifErrorTitle'), t('teacherSubmission.notifErrorSubmit') + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
  if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Real-time validation untuk tanggal
    if (name === 'assessment_tanggal' && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
  if (selectedDate < today) {
        setFormErrors(prev => ({
          ...prev,
          assessment_tanggal: t('teacherSubmission.validation.datePast')
        }));
      } else {
        const daysDiff = getDaysDifference(today, selectedDate);
        if (daysDiff === 1) {
          const selectedStr = selectedDate.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          setFormErrors(prev => ({
            ...prev,
            assessment_tanggal: t('teacherSubmission.validation.dateTomorrowShort', { date: selectedStr })
          }));
          
          // Show notification juga
          showNotification(
            t('teacherSubmission.notifWarnTitle'), 
            t('teacherSubmission.validation.dateTomorrow', { date: selectedStr }), 
            'warning'
          );
        }
      }
  }
  // If subject (detail_kelas) changes, load topics for its subject_id & kelas_id
    if (name === 'assessment_detail_kelas_id') {
      const selectedDetail = detailKelasOptions.find(o => o.detail_kelas_id.toString() === value);
      const subjId = selectedDetail?.subject_id;
      const kelasId = selectedDetail?.kelas_id;
      setFormData(prev => ({ ...prev, assessment_topic_id: '' }));
      if (subjId && kelasId) {
        loadTopicsForSubject(subjId, kelasId);
      } else {
        setTopics([]);
      }
    }
  };

  const loadTopicsForSubject = async (subjectId, kelasId) => {
    const cacheKey = subjectId + '|' + kelasId;
    if (topicsCache.has(cacheKey)) {
      setTopics(topicsCache.get(cacheKey));
      return;
    }
    try {
      setTopicsLoading(true);
      const { data, error } = await supabase
        .from('topic')
        .select('topic_id, topic_nama, topic_subject_id, topic_kelas_id')
        .eq('topic_subject_id', subjectId)
        .eq('topic_kelas_id', kelasId)
        .order('topic_nama');
      if (error) throw new Error(error.message);
      const list = data || [];
      setTopics(list);
      setTopicsCache(prev => new Map(prev).set(cacheKey, list));
    } catch (e) {
      console.error('Failed loading topics for subject/class', subjectId, kelasId, e);
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    return (
      (!filters.status || assessment.assessment_status.toString() === filters.status) &&
      (!filters.subject || assessment.assessment_detail_kelas_id.toString() === filters.subject) &&
      (!filters.dateFrom || assessment.assessment_tanggal >= filters.dateFrom) &&
      (!filters.dateTo || assessment.assessment_tanggal <= filters.dateTo)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('teacherSubmission.title')}</h1>
          <p className="text-gray-600">{t('teacherSubmission.subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={detailKelasOptions.length === 0}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {t('teacherSubmission.newButton')}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

  {detailKelasOptions.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <FontAwesomeIcon icon={faBook} className="text-4xl mb-2" />
              <p>Anda belum memiliki mata pelajaran yang diajar.</p>
              <p className="text-sm">Hubungi administrator untuk menambahkan mata pelajaran.</p>
            </div>
          </CardContent>
        </Card>
      )}

  {detailKelasOptions.length > 0 && (
        <>
          {/* Filters */}
          <Card>
            <CardHeader>
      <CardTitle>{t('teacherSubmission.filtersTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('teacherSubmission.status')}
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
        <option value="">{t('teacherSubmission.allStatus')}</option>
        <option value="0">{t('teacherSubmission.statusWaiting')}</option>
  <option value="3">{t('teacherSubmission.statusWaitingPrincipal')}</option>
        <option value="1">{t('teacherSubmission.statusApproved')}</option>
        <option value="2">{t('teacherSubmission.statusRejected')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('teacherSubmission.subject')}
                  </label>
                  <select
                    value={filters.subject}
                    onChange={(e) => setFilters({...filters, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
        <option value="">{t('teacherSubmission.subjectLabel')}</option>
                    {detailKelasOptions.map(opt => (
                      <option key={opt.detail_kelas_id} value={opt.detail_kelas_id}>
                        {opt.subject_name} - {opt.kelas_nama}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('teacherSubmission.fromDate')}
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('teacherSubmission.toDate')}
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('teacherSubmission.myAssessments', { count: filteredAssessments.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAssessments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {assessments.length === 0 ? (
                    <>
                      <FontAwesomeIcon icon={faClipboardList} className="text-4xl mb-4" />
                      <p className="text-lg mb-2">{t('teacherSubmission.emptyNone')}</p>
                      <p className="text-sm">{t('teacherSubmission.emptyHint')}</p>
                    </>
                  ) : (
                    <p>{t('teacherSubmission.emptyAny')}</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('teacherSubmission.thName')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('teacherSubmission.thDate')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('teacherSubmission.thSubject')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('teacherSubmission.thStatus')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('teacherSubmission.thSubmittedAt')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAssessments.map((assessment) => (
                        <tr key={assessment.assessment_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assessment.assessment_nama}
                              </div>
                              {assessment.assessment_keterangan && (
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {assessment.assessment_keterangan}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(assessment.assessment_tanggal)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getSubjectName(assessment.assessment_detail_kelas_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(assessment.assessment_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
            setShowForm(false);
            setFormData({
            assessment_nama: '',
            assessment_tanggal: '',
            assessment_keterangan: '',
                assessment_detail_kelas_id: '',
                assessment_topic_id: ''
          });
          setFormErrors({});
        }}
  title={t('teacherSubmission.modalTitle')}
      >
        {/* Info Panel Aturan Tanggal */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5 mr-2" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">{t('teacherSubmission.rulesTitle')}</p>
              <ul className="text-xs space-y-1">
                <li>{t('teacherSubmission.rules1')}</li>
                <li>
                  {t('teacherSubmission.rules2Prefix')}
                  {getMinimumDate().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {t('teacherSubmission.rules2Suffix')}
                </li>
                <li>{t('teacherSubmission.rules3')}</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assessment_nama">{t('teacherSubmission.nameLabel')}</Label>
            <Input
              id="assessment_nama"
              name="assessment_nama"
              type="text"
              value={formData.assessment_nama}
              onChange={handleInputChange}
              placeholder={t('teacherSubmission.namePlaceholder')}
              className={formErrors.assessment_nama ? 'border-red-500' : ''}
            />
            {formErrors.assessment_nama && (
              <p className="text-red-500 text-sm mt-1">{formErrors.assessment_nama}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assessment_tanggal">{t('teacherSubmission.dateLabel')}</Label>
            <Input
              id="assessment_tanggal"
              name="assessment_tanggal"
              type="date"
              value={formData.assessment_tanggal}
              onChange={handleInputChange}
              min={getMinimumDate().toISOString().split('T')[0]}
              className={formErrors.assessment_tanggal ? 'border-red-500' : ''}
            />
            {formErrors.assessment_tanggal && (
              <p className="text-red-500 text-sm mt-1">{formErrors.assessment_tanggal}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              {t('teacherSubmission.dateHintPrefix')}
              {getMinimumDate().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
              {t('teacherSubmission.dateHintSuffix')}
            </p>
          </div>

          <div>
            <Label htmlFor="assessment_detail_kelas_id">{t('teacherSubmission.subjectLabel')}</Label>
            <select
              id="assessment_detail_kelas_id"
              name="assessment_detail_kelas_id"
              value={formData.assessment_detail_kelas_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.assessment_detail_kelas_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{t('teacherSubmission.subjectPlaceholder')}</option>
              {detailKelasOptions.map(opt => (
                <option key={opt.detail_kelas_id} value={opt.detail_kelas_id}>
                  {opt.subject_name} - {opt.kelas_nama}
                </option>
              ))}
            </select>
            {formErrors.assessment_detail_kelas_id && (
              <p className="text-red-500 text-sm mt-1">{formErrors.assessment_detail_kelas_id}</p>
            )}
          </div>

          {/* Topic selection (mandatory; block submission if none) */}
          {formData.assessment_detail_kelas_id && (
            <div>
              <Label htmlFor="assessment_topic_id">{t('teacherSubmission.topicLabel')}</Label>
              <select
                id="assessment_topic_id"
                name="assessment_topic_id"
                value={formData.assessment_topic_id}
                onChange={handleInputChange}
                disabled={topicsLoading || topics.length === 0}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.assessment_topic_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{topicsLoading ? t('teacherSubmission.topicLoading') : (topics.length === 0 ? t('teacherSubmission.topicPlaceholderDisabled') : t('teacherSubmission.topicPlaceholder'))}</option>
                {topics.map(tp => (
                  <option key={tp.topic_id} value={tp.topic_id}>{tp.topic_nama}</option>
                ))}
              </select>
              {formErrors.assessment_topic_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.assessment_topic_id}</p>
              )}
              {(!topicsLoading && topics.length === 0 && formData.assessment_detail_kelas_id) && (
                <p className="text-xs text-red-500 mt-1">{t('teacherSubmission.topicNoneForSubject')}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="assessment_keterangan">{t('teacherSubmission.noteLabel')}</Label>
            <textarea
              id="assessment_keterangan"
              name="assessment_keterangan"
              value={formData.assessment_keterangan}
              onChange={handleInputChange}
              placeholder={t('teacherSubmission.notePlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({
                  assessment_nama: '',
                  assessment_tanggal: '',
                  assessment_keterangan: '',
                  assessment_detail_kelas_id: ''
                });
                setFormErrors({});
              }}
              disabled={submitting}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              {t('teacherSubmission.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {t('teacherSubmission.submitting')}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                  {t('teacherSubmission.submit')}
                </>
              )}
            </Button>
          </div>
        </form>
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
