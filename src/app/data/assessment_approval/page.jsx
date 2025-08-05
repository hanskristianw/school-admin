'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';

export default function AssessmentApproval() {
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
      showNotification('Error', 'Gagal memuat data assessment: ' + err.message, 'error');
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
            Menunggu Persetujuan
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Disetujui
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Tidak Diketahui
          </span>
        );
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.user_id === userId);
    return user ? `${user.user_nama_depan} ${user.user_nama_belakang}` : 'Unknown User';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.subject_id === subjectId);
    return subject ? subject.subject_name : 'Unknown Subject';
  };

  const handleApprovalAction = (assessment, action) => {
    if (assessment.assessment_status !== 0) {
      showNotification('Peringatan', 'Assessment ini sudah diproses sebelumnya', 'warning');
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
      
      const newStatus = actionType === 'approve' ? 1 : 2;
      
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

      const actionText = actionType === 'approve' ? 'disetujui' : 'ditolak';
      showNotification(
        'Berhasil', 
        `Assessment "${selectedAssessment.assessment_nama}" berhasil ${actionText}`, 
        'success'
      );

      setShowConfirmModal(false);
      setSelectedAssessment(null);
      setActionType(null);
      
    } catch (err) {
      console.error('Error processing approval:', err);
      showNotification('Error', 'Gagal memproses persetujuan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    return (
      (!filters.status || assessment.assessment_status.toString() === filters.status) &&
      (!filters.subject || assessment.assessment_subject_id.toString() === filters.subject) &&
      (!filters.user || assessment.assessment_user_id.toString() === filters.user)
    );
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
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
          <h1 className="text-2xl font-bold text-gray-900">Assessment Approval</h1>
          <p className="text-gray-600">Kelola persetujuan assessment</p>
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
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="0">Menunggu Persetujuan</option>
                <option value="1">Disetujui</option>
                <option value="2">Ditolak</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mata Pelajaran
              </label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Mata Pelajaran</option>
                {subjects.map(subject => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pengajar
              </label>
              <select
                value={filters.user}
                onChange={(e) => setFilters({...filters, user: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Pengajar</option>
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
          <CardTitle>Daftar Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada data assessment yang ditemukan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Assessment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mata Pelajaran
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pengajar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
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
                        {assessment.assessment_status === 0 && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleApprovalAction(assessment, 'approve')}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                            >
                              <i className="fas fa-check mr-1"></i>
                              Setujui
                            </Button>
                            <Button
                              onClick={() => handleApprovalAction(assessment, 'reject')}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                            >
                              <i className="fas fa-times mr-1"></i>
                              Tolak
                            </Button>
                          </div>
                        )}
                        {assessment.assessment_status !== 0 && (
                          <span className="text-gray-400 text-sm">
                            Sudah diproses
                          </span>
                        )}
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
        title={`Konfirmasi ${actionType === 'approve' ? 'Persetujuan' : 'Penolakan'}`}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Apakah Anda yakin ingin {actionType === 'approve' ? 'menyetujui' : 'menolak'} assessment "{selectedAssessment?.assessment_nama}"?
          </p>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm space-y-2">
              <div><strong>Nama Assessment:</strong> {selectedAssessment?.assessment_nama}</div>
              <div><strong>Tanggal:</strong> {selectedAssessment && formatDate(selectedAssessment.assessment_tanggal)}</div>
              <div><strong>Mata Pelajaran:</strong> {selectedAssessment && getSubjectName(selectedAssessment.assessment_subject_id)}</div>
              <div><strong>Pengajar:</strong> {selectedAssessment && getUserName(selectedAssessment.assessment_user_id)}</div>
              {selectedAssessment?.assessment_keterangan && (
                <div><strong>Keterangan:</strong> {selectedAssessment.assessment_keterangan}</div>
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
              Batal
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
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Memproses...
                </>
              ) : (
                <>
                  <i className={`fas ${actionType === 'approve' ? 'fa-check' : 'fa-times'} mr-2`}></i>
                  {actionType === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
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
