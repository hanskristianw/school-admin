'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';

export default function AssessmentSubmission() {
  const [assessments, setAssessments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [formData, setFormData] = useState({
    assessment_nama: '',
    assessment_tanggal: '',
    assessment_keterangan: '',
    assessment_subject_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
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
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    // Get current user ID from localStorage
    const kr_id = localStorage.getItem("kr_id");
    if (kr_id) {
      setCurrentUserId(parseInt(kr_id));
      fetchUserSubjects(parseInt(kr_id));
      fetchUserAssessments(parseInt(kr_id));
    } else {
      setError('User tidak terautentikasi');
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

  const fetchUserSubjects = async (userId) => {
    try {
      // Fetch subjects yang diajar oleh user ini
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name')
        .eq('subject_user_id', userId)
        .order('subject_name');

      if (subjectsError) {
        throw new Error(subjectsError.message);
      }

      setSubjects(subjectsData || []);
      
    } catch (err) {
      console.error('Error fetching user subjects:', err);
      setError('Gagal memuat mata pelajaran: ' + err.message);
    }
  };

  const fetchUserAssessments = async (userId) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch assessments yang dibuat oleh user ini
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessment')
        .select('assessment_id, assessment_nama, assessment_tanggal, assessment_keterangan, assessment_status, assessment_user_id, assessment_subject_id')
        .eq('assessment_user_id', userId)
        .order('assessment_tanggal', { ascending: false });

      if (assessmentsError) {
        throw new Error(assessmentsError.message);
      }

      setAssessments(assessmentsData || []);
      
    } catch (err) {
      console.error('Error fetching user assessments:', err);
      setError('Gagal memuat data assessment: ' + err.message);
      showNotification('Error', 'Gagal memuat data assessment: ' + err.message, 'error');
    } finally {
      setLoading(false);
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

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.subject_id === subjectId);
    return subject ? subject.subject_name : 'Unknown Subject';
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.assessment_nama.trim()) {
      errors.assessment_nama = 'Nama assessment wajib diisi';
    }
    
    if (!formData.assessment_tanggal) {
      errors.assessment_tanggal = 'Tanggal assessment wajib diisi';
    }
    
    if (!formData.assessment_subject_id) {
      errors.assessment_subject_id = 'Mata pelajaran wajib dipilih';
    }
    
    // Validasi tanggal tidak boleh di masa lalu
    if (formData.assessment_tanggal) {
      const selectedDate = new Date(formData.assessment_tanggal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.assessment_tanggal = 'Tanggal assessment tidak boleh di masa lalu';
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
      showNotification('Error', 'User tidak terautentikasi', 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      const assessmentData = {
        assessment_nama: formData.assessment_nama.trim(),
        assessment_tanggal: formData.assessment_tanggal,
        assessment_keterangan: formData.assessment_keterangan.trim() || null,
        assessment_status: 0, // Status awal: menunggu persetujuan
        assessment_user_id: currentUserId,
        assessment_subject_id: parseInt(formData.assessment_subject_id)
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
        assessment_subject_id: ''
      });
      setFormErrors({});
      setShowForm(false);

      showNotification(
        'Berhasil', 
        'Assessment berhasil disubmit dan menunggu persetujuan', 
        'success'
      );
      
    } catch (err) {
      console.error('Error submitting assessment:', err);
      showNotification('Error', 'Gagal submit assessment: ' + err.message, 'error');
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
  };

  const filteredAssessments = assessments.filter(assessment => {
    return (
      (!filters.status || assessment.assessment_status.toString() === filters.status) &&
      (!filters.subject || assessment.assessment_subject_id.toString() === filters.subject) &&
      (!filters.dateFrom || assessment.assessment_tanggal >= filters.dateFrom) &&
      (!filters.dateTo || assessment.assessment_tanggal <= filters.dateTo)
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
          <h1 className="text-2xl font-bold text-gray-900">Assessment Submission</h1>
          <p className="text-gray-600">Submit assessment untuk mata pelajaran yang Anda ajar</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={subjects.length === 0}
        >
          <i className="fas fa-plus mr-2"></i>
          Submit Assessment Baru
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {subjects.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <i className="fas fa-book text-4xl mb-2"></i>
              <p>Anda belum memiliki mata pelajaran yang diajar.</p>
              <p className="text-sm">Hubungi administrator untuk menambahkan mata pelajaran.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {subjects.length > 0 && (
        <>
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    Dari Tanggal
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
                    Sampai Tanggal
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
              <CardTitle>Assessment Saya ({filteredAssessments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAssessments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {assessments.length === 0 ? (
                    <>
                      <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                      <p className="text-lg mb-2">Belum ada assessment yang disubmit</p>
                      <p className="text-sm">Klik tombol "Submit Assessment Baru" untuk memulai</p>
                    </>
                  ) : (
                    <p>Tidak ada assessment yang sesuai dengan filter</p>
                  )}
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
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal Submit
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(assessment.assessment_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date().toLocaleDateString('id-ID')}
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
            assessment_subject_id: ''
          });
          setFormErrors({});
        }}
        title="Submit Assessment Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assessment_nama">Nama Assessment *</Label>
            <Input
              id="assessment_nama"
              name="assessment_nama"
              type="text"
              value={formData.assessment_nama}
              onChange={handleInputChange}
              placeholder="Contoh: Ujian Tengah Semester"
              className={formErrors.assessment_nama ? 'border-red-500' : ''}
            />
            {formErrors.assessment_nama && (
              <p className="text-red-500 text-sm mt-1">{formErrors.assessment_nama}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assessment_tanggal">Tanggal Assessment *</Label>
            <Input
              id="assessment_tanggal"
              name="assessment_tanggal"
              type="date"
              value={formData.assessment_tanggal}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className={formErrors.assessment_tanggal ? 'border-red-500' : ''}
            />
            {formErrors.assessment_tanggal && (
              <p className="text-red-500 text-sm mt-1">{formErrors.assessment_tanggal}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assessment_subject_id">Mata Pelajaran *</Label>
            <select
              id="assessment_subject_id"
              name="assessment_subject_id"
              value={formData.assessment_subject_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.assessment_subject_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map(subject => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_name}
                </option>
              ))}
            </select>
            {formErrors.assessment_subject_id && (
              <p className="text-red-500 text-sm mt-1">{formErrors.assessment_subject_id}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assessment_keterangan">Keterangan (Opsional)</Label>
            <textarea
              id="assessment_keterangan"
              name="assessment_keterangan"
              value={formData.assessment_keterangan}
              onChange={handleInputChange}
              placeholder="Deskripsi atau catatan tambahan tentang assessment"
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
                  assessment_subject_id: ''
                });
                setFormErrors({});
              }}
              disabled={submitting}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Submit Assessment
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
