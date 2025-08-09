'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function AssessmentApproval() {
  const { t, lang } = useI18n();
  const [assessments, setAssessments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
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
    status: '',
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
    fetchSubjects();
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
        .select('assessment_id, assessment_nama, assessment_tanggal, assessment_keterangan, assessment_status, assessment_user_id, assessment_subject_id')
        .order('assessment_tanggal', { ascending: false });

      if (assessmentsError) {
        throw new Error(assessmentsError.message);
      }

      setAssessments(assessmentsData || []);
      
    } catch (err) {
      console.error('Error fetching assessments:', err);
      setError(err.message);
  showNotification(t('assessmentApproval.notifErrorTitle'), t('assessmentApproval.notifErrorLoad') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name')
        .order('subject_name');

      if (subjectsError) {
        throw new Error(subjectsError.message);
      }

      setSubjects(subjectsData || []);
      
    } catch (err) {
      console.error('Error fetching subjects:', err);
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

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.subject_id === subjectId);
  return subject ? subject.subject_name : t('assessmentApproval.unknownSubject');
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

  const processApproval = async () => {
    if (!selectedAssessment || !actionType) return;

    try {
      setSubmitting(true);
      
      // Principal approves -> back to waiting (0); others -> approved (1)
      const newStatus = actionType === 'approve' ? (isPrincipal ? 0 : 1) : 2;
      
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
      (!filters.subject || assessment.assessment_subject_id.toString() === filters.subject) &&
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('assessmentApproval.title')}</h1>
          <p className="text-gray-600">{t('assessmentApproval.subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

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
                {subjects.map(subject => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name}
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
      <Card>
        <CardHeader>
          <CardTitle>{t('assessmentApproval.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('assessmentApproval.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assessmentApproval.thName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assessmentApproval.thDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assessmentApproval.thSubject')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assessmentApproval.thTeacher')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assessmentApproval.thStatus')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assessmentApproval.thActions')}
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
                        {getSubjectName(assessment.assessment_subject_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getUserName(assessment.assessment_user_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(assessment.assessment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {(!isPrincipal && assessment.assessment_status === 0) || (isPrincipal && assessment.assessment_status === 3) ? (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleApprovalAction(assessment, 'approve')}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                            >
                              <FontAwesomeIcon icon={faCheck} className="mr-1" />
                              {t('assessmentApproval.approve')}
                            </Button>
                            <Button
                              onClick={() => handleApprovalAction(assessment, 'reject')}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                            >
                              <FontAwesomeIcon icon={faTimes} className="mr-1" />
                {t('assessmentApproval.reject')}
                            </Button>
                          </div>
                        ) : null}
                        {(!isPrincipal && assessment.assessment_status !== 0) || (isPrincipal && assessment.assessment_status !== 3) ? (
              <span className="text-gray-400 text-sm">{t('assessmentApproval.processed')}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedAssessment(null);
          setActionType(null);
        }}
  title={actionType === 'approve' ? t('assessmentApproval.confirmTitleApprove') : t('assessmentApproval.confirmTitleReject')}
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
              <div><strong>{t('assessmentApproval.labelSubject')}:</strong> {selectedAssessment && getSubjectName(selectedAssessment.assessment_subject_id)}</div>
              <div><strong>{t('assessmentApproval.labelTeacher')}:</strong> {selectedAssessment && getUserName(selectedAssessment.assessment_user_id)}</div>
              {selectedAssessment?.assessment_keterangan && (
                <div><strong>{t('assessmentApproval.labelNote')}:</strong> {selectedAssessment.assessment_keterangan}</div>
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
                : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {t('assessmentApproval.processing')}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={actionType === 'approve' ? faCheck : faTimes} className="mr-2" />
                  {actionType === 'approve' ? t('assessmentApproval.btnYesApprove') : t('assessmentApproval.btnYesReject')}
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
