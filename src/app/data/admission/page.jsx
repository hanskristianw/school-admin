'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserGraduate,
  faSearch,
  faEye,
  faCheck,
  faTimes,
  faHourglassHalf,
  faClock,
  faListAlt,
  faSpinner,
  faFilter,
  faPhone,
  faEnvelope,
  faSchool,
  faCalendar,
  faUser,
  faMapMarkerAlt,
  faBriefcase,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const statusConfig = {
  pending: {
    label: 'Menunggu Review',
    icon: faClock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300'
  },
  under_review: {
    label: 'Sedang Direview',
    icon: faHourglassHalf,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300'
  },
  approved: {
    label: 'Diterima',
    icon: faCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300'
  },
  rejected: {
    label: 'Ditolak',
    icon: faTimes,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300'
  },
  waitlist: {
    label: 'Daftar Tunggu',
    icon: faListAlt,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300'
  }
};

export default function AdmissionManagement() {
  const [applications, setApplications] = useState([]);
  const [units, setUnits] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterYear, setFilterYear] = useState('');
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve', 'reject', 'under_review', 'waitlist'
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch applications with related data
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('student_applications')
        .select(`
          *,
          unit:unit_id(unit_id, unit_name),
          year:year_id(year_id, year_name),
          reviewer:reviewed_by(user_id, user_nama_depan, user_nama_belakang)
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch units for filter
      const { data: unitsData, error: unitsError } = await supabase
        .from('unit')
        .select('unit_id, unit_name')
        .eq('is_school', true)
        .order('unit_name');

      if (unitsError) throw unitsError;

      // Fetch years for filter
      const { data: yearsData, error: yearsError } = await supabase
        .from('year')
        .select('year_id, year_name')
        .order('year_name', { ascending: false });

      if (yearsError) throw yearsError;

      setApplications(applicationsData || []);
      setUnits(unitsData || []);
      setYears(yearsData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal memuat data: ' + err.message);
      showNotification('Error', 'Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (application) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
  };

  const handleActionClick = (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setAdminNotes(application.admin_notes || '');
    setShowActionModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedApplication || !actionType) return;

    try {
      setProcessing(true);

      // Get current user ID from localStorage
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const reviewerId = userData.userID;

      const updateData = {
        status: actionType,
        admin_notes: adminNotes.trim() || null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('student_applications')
        .update(updateData)
        .eq('application_id', selectedApplication.application_id);

      if (error) throw error;

      // Update local state
      setApplications(applications.map(app => 
        app.application_id === selectedApplication.application_id
          ? { ...app, ...updateData }
          : app
      ));

      const actionLabels = {
        approved: 'disetujui',
        rejected: 'ditolak',
        under_review: 'ditandai sedang direview',
        waitlist: 'dimasukkan ke daftar tunggu'
      };

      showNotification('Berhasil', `Pendaftaran ${selectedApplication.application_number} berhasil ${actionLabels[actionType]}`, 'success');
      setShowActionModal(false);
      setSelectedApplication(null);
      setActionType('');
      setAdminNotes('');

      // Refresh data
      fetchData();

    } catch (err) {
      console.error('Error updating status:', err);
      showNotification('Error', 'Gagal mengubah status: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm || 
      app.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.parent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.parent_phone?.includes(searchTerm);
    
    const matchesStatus = !filterStatus || app.status === filterStatus;
    const matchesUnit = !filterUnit || app.unit_id === parseInt(filterUnit);
    const matchesYear = !filterYear || app.year_id === parseInt(filterYear);

    return matchesSearch && matchesStatus && matchesUnit && matchesYear;
  });

  // Count by status
  const statusCounts = {
    pending: applications.filter(a => a.status === 'pending').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    waitlist: applications.filter(a => a.status === 'waitlist').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FontAwesomeIcon icon={faSpinner} className="text-3xl text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pendaftaran Siswa</h1>
          <p className="text-gray-600">Review dan kelola pendaftaran siswa baru</p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => (
          <Card 
            key={status}
            className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === status ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{config.label}</p>
                  <p className={`text-2xl font-bold ${config.color}`}>{statusCounts[status]}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <FontAwesomeIcon icon={config.icon} className={config.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Cari</Label>
              <div className="relative mt-1">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Nama, No. Pendaftaran, Telepon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Status</option>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Sekolah</Label>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Sekolah</option>
                {units.map(unit => (
                  <option key={unit.unit_id} value={unit.unit_id}>{unit.unit_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Tahun Ajaran</Label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Tahun</option>
                {years.map(year => (
                  <option key={year.year_id} value={year.year_id}>{year.year_name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUserGraduate} className="text-blue-600" />
            Daftar Pendaftaran ({filteredApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FontAwesomeIcon icon={faUserGraduate} className="text-4xl mb-4 text-gray-300" />
              <p>Tidak ada data pendaftaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pendaftaran</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Siswa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orang Tua</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sekolah</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tahun</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Daftar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredApplications.map(app => (
                    <tr key={app.application_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-blue-600">{app.application_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{app.student_name}</p>
                          {app.student_nickname && (
                            <p className="text-sm text-gray-500">({app.student_nickname})</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900">{app.parent_name}</p>
                          <p className="text-sm text-gray-500">{app.parent_phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{app.unit?.unit_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{app.year?.year_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{formatDate(app.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[app.status]?.bgColor} ${statusConfig[app.status]?.color}`}>
                          <FontAwesomeIcon icon={statusConfig[app.status]?.icon} className="text-xs" />
                          {statusConfig[app.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(app)}
                            title="Lihat Detail"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleActionClick(app, 'under_review')}
                                title="Tandai Sedang Review"
                              >
                                <FontAwesomeIcon icon={faHourglassHalf} />
                              </Button>
                            </>
                          )}
                          {(app.status === 'pending' || app.status === 'under_review') && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleActionClick(app, 'approved')}
                                title="Setujui"
                              >
                                <FontAwesomeIcon icon={faCheck} />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleActionClick(app, 'rejected')}
                                title="Tolak"
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => handleActionClick(app, 'waitlist')}
                                title="Daftar Tunggu"
                              >
                                <FontAwesomeIcon icon={faListAlt} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Detail Pendaftaran - ${selectedApplication?.application_number}`}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className={`p-4 rounded-lg ${statusConfig[selectedApplication.status]?.bgColor} ${statusConfig[selectedApplication.status]?.borderColor} border`}>
              <div className="flex items-center gap-3">
                <FontAwesomeIcon 
                  icon={statusConfig[selectedApplication.status]?.icon} 
                  className={`text-2xl ${statusConfig[selectedApplication.status]?.color}`} 
                />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`font-semibold ${statusConfig[selectedApplication.status]?.color}`}>
                    {statusConfig[selectedApplication.status]?.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Student Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-blue-600" />
                Data Siswa
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Nama Lengkap</p>
                  <p className="font-medium">{selectedApplication.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nama Panggilan</p>
                  <p className="font-medium">{selectedApplication.student_nickname || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jenis Kelamin</p>
                  <p className="font-medium">{selectedApplication.student_gender === 'male' ? 'Laki-laki' : selectedApplication.student_gender === 'female' ? 'Perempuan' : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tempat, Tanggal Lahir</p>
                  <p className="font-medium">
                    {selectedApplication.student_birth_place || '-'}, {formatDate(selectedApplication.student_birth_date)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Alamat</p>
                  <p className="font-medium">{selectedApplication.student_address || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Asal Sekolah</p>
                  <p className="font-medium">{selectedApplication.student_previous_school || '-'}</p>
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-green-600" />
                Data Orang Tua / Wali
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Nama</p>
                  <p className="font-medium">{selectedApplication.parent_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pekerjaan</p>
                  <p className="font-medium">{selectedApplication.parent_occupation || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telepon</p>
                  <p className="font-medium flex items-center gap-2">
                    <FontAwesomeIcon icon={faPhone} className="text-gray-400" />
                    {selectedApplication.parent_phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="text-gray-400" />
                    {selectedApplication.parent_email || '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Alamat</p>
                  <p className="font-medium">{selectedApplication.parent_address || '-'}</p>
                </div>
              </div>
            </div>

            {/* School Selection */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faSchool} className="text-purple-600" />
                Pilihan Sekolah
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Sekolah</p>
                  <p className="font-medium">{selectedApplication.unit?.unit_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tahun Ajaran</p>
                  <p className="font-medium">{selectedApplication.year?.year_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kelas Diminati</p>
                  <p className="font-medium">{selectedApplication.preferred_grade || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tanggal Daftar</p>
                  <p className="font-medium">{formatDateTime(selectedApplication.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {selectedApplication.additional_notes && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-orange-600" />
                  Catatan dari Pendaftar
                </h3>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-gray-700">{selectedApplication.additional_notes}</p>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selectedApplication.admin_notes && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600" />
                  Catatan Admin
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-700">{selectedApplication.admin_notes}</p>
                  {selectedApplication.reviewed_at && (
                    <p className="text-sm text-gray-500 mt-2">
                      Diupdate: {formatDateTime(selectedApplication.reviewed_at)}
                      {selectedApplication.reviewer && ` oleh ${selectedApplication.reviewer.user_nama_depan} ${selectedApplication.reviewer.user_nama_belakang}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Tutup
              </Button>
              {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review') && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleActionClick(selectedApplication, 'approved');
                    }}
                  >
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Setujui
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleActionClick(selectedApplication, 'rejected');
                    }}
                  >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                    Tolak
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={`Konfirmasi ${actionType === 'approved' ? 'Persetujuan' : actionType === 'rejected' ? 'Penolakan' : actionType === 'under_review' ? 'Review' : 'Daftar Tunggu'}`}
      >
        {selectedApplication && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {actionType === 'approved' && 'Anda akan menyetujui pendaftaran siswa ini.'}
              {actionType === 'rejected' && 'Anda akan menolak pendaftaran siswa ini.'}
              {actionType === 'under_review' && 'Anda akan menandai pendaftaran ini sedang dalam proses review.'}
              {actionType === 'waitlist' && 'Anda akan memasukkan siswa ini ke daftar tunggu.'}
            </p>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">{selectedApplication.student_name}</p>
              <p className="text-sm text-gray-500">{selectedApplication.application_number}</p>
            </div>

            <div>
              <Label htmlFor="admin_notes">Catatan (Opsional)</Label>
              <textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Tambahkan catatan untuk pendaftaran ini..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowActionModal(false)} disabled={processing}>
                Batal
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={processing}
                className={
                  actionType === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  actionType === 'rejected' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  actionType === 'under_review' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                  'bg-purple-600 hover:bg-purple-700 text-white'
                }
              >
                {processing ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon 
                      icon={actionType === 'approved' ? faCheck : actionType === 'rejected' ? faTimes : actionType === 'under_review' ? faHourglassHalf : faListAlt} 
                      className="mr-2" 
                    />
                    {actionType === 'approved' ? 'Ya, Setujui' : actionType === 'rejected' ? 'Ya, Tolak' : actionType === 'under_review' ? 'Ya, Review' : 'Ya, Daftar Tunggu'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
