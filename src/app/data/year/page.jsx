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
  faPlus, 
  faCalendar, 
  faEdit, 
  faTrash, 
  faSave,
  faSpinner,
  faInfoCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

export default function YearManagement() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [formData, setFormData] = useState({
    year_name: '',
    start_date: '',
    end_date: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [yearToDelete, setYearToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
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

  const fetchYears = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: yearsData, error: yearsError } = await supabase
        .from('year')
        .select('year_id, year_name, start_date, end_date')
        .order('year_name');

      if (yearsError) {
        throw new Error(yearsError.message);
      }

      setYears(yearsData || []);
      
    } catch (err) {
      console.error('Error fetching years:', err);
      setError('Gagal memuat data tahun: ' + err.message);
      showNotification('Error', 'Gagal memuat data tahun: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Extract year numbers from year_name like "2026-2027" or "2026/2027"
  const extractYearRange = (yearName) => {
    const match = yearName.match(/(\d{4})[\-\/](\d{4})/);
    if (match) {
      return { startYear: parseInt(match[1]), endYear: parseInt(match[2]) };
    }
    return null;
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.year_name.trim()) {
      errors.year_name = 'Nama tahun wajib diisi';
    } else if (formData.year_name.trim().length < 4) {
      errors.year_name = 'Nama tahun minimal 4 karakter (contoh: 2025)';
    }
    
    // Check for duplicate year name (excluding current editing year)
    const duplicateYear = years.find(year => 
      year.year_name.toLowerCase() === formData.year_name.trim().toLowerCase() &&
      year.year_id !== editingYear?.year_id
    );
    
    if (duplicateYear) {
      errors.year_name = 'Nama tahun sudah ada';
    }

    // Validate start_date
    if (!formData.start_date) {
      errors.start_date = 'Tanggal mulai wajib diisi';
    }

    // Validate end_date
    if (!formData.end_date) {
      errors.end_date = 'Tanggal berakhir wajib diisi';
    }

    // Validate start < end
    if (formData.start_date && formData.end_date) {
      if (formData.start_date >= formData.end_date) {
        errors.end_date = 'Tanggal berakhir harus setelah tanggal mulai';
      }
    }

    // Validate year numbers match the year_name (e.g. "2026-2027" => start in 2026, end in 2027)
    if (formData.year_name.trim() && formData.start_date && formData.end_date && !errors.start_date && !errors.end_date) {
      const yearRange = extractYearRange(formData.year_name.trim());
      if (yearRange) {
        const startDateYear = new Date(formData.start_date).getFullYear();
        const endDateYear = new Date(formData.end_date).getFullYear();
        if (startDateYear !== yearRange.startYear) {
          errors.start_date = `Tahun pada tanggal mulai harus ${yearRange.startYear} sesuai nama tahun ajaran`;
        }
        if (endDateYear !== yearRange.endYear) {
          errors.end_date = `Tahun pada tanggal berakhir harus ${yearRange.endYear} sesuai nama tahun ajaran`;
        }
      }
    }

    // Check for overlapping date ranges with other years
    if (formData.start_date && formData.end_date && !errors.start_date && !errors.end_date) {
      const overlapping = years.find(year => {
        if (year.year_id === editingYear?.year_id) return false;
        if (!year.start_date || !year.end_date) return false;
        // Overlap: newStart < existingEnd AND newEnd > existingStart
        return formData.start_date < year.end_date && formData.end_date > year.start_date;
      });
      if (overlapping) {
        errors.start_date = `Tanggal tumpang tindih dengan tahun ajaran "${overlapping.year_name}" (${overlapping.start_date} s.d. ${overlapping.end_date})`;
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

    try {
      setSubmitting(true);
      
      const yearData = {
        year_name: formData.year_name.trim(),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingYear) {
        // Update existing year
        const { error } = await supabase
          .from('year')
          .update(yearData)
          .eq('year_id', editingYear.year_id);

        if (error) {
          throw new Error(error.message);
        }

        // Update local state
        setYears(years.map(year => 
          year.year_id === editingYear.year_id 
            ? { ...year, ...yearData }
            : year
        ));

        showNotification('Berhasil', 'Data tahun berhasil diperbarui', 'success');
      } else {
        // Create new year
        const { data, error } = await supabase
          .from('year')
          .insert([yearData])
          .select('year_id, year_name, start_date, end_date');

        if (error) {
          throw new Error(error.message);
        }

        // Update local state
        if (data && data[0]) {
          setYears([...years, data[0]].sort((a, b) => a.year_name.localeCompare(b.year_name)));
        }

        showNotification('Berhasil', 'Tahun baru berhasil ditambahkan', 'success');
      }

      // Reset form
      setFormData({ year_name: '', start_date: '', end_date: '' });
      setFormErrors({});
      setShowForm(false);
      setEditingYear(null);
      
    } catch (err) {
      console.error('Error saving year:', err);
      showNotification('Error', 'Gagal menyimpan data tahun: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (year) => {
    setEditingYear(year);
    setFormData({
      year_name: year.year_name,
      start_date: year.start_date || '',
      end_date: year.end_date || ''
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (year) => {
    setYearToDelete(year);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!yearToDelete) return;

    try {
      setDeleting(true);
      
      const { error } = await supabase
        .from('year')
        .delete()
        .eq('year_id', yearToDelete.year_id);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setYears(years.filter(year => year.year_id !== yearToDelete.year_id));
      
      showNotification('Berhasil', 'Tahun berhasil dihapus', 'success');
      setShowDeleteModal(false);
      setYearToDelete(null);
      
    } catch (err) {
      console.error('Error deleting year:', err);
      showNotification('Error', 'Gagal menghapus tahun: ' + err.message, 'error');
    } finally {
      setDeleting(false);
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

  const filteredYears = years.filter(year =>
    year.year_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Year Management</h1>
          <p className="text-gray-600">Kelola data tahun ajaran</p>
        </div>
        <Button
          onClick={() => {
            setEditingYear(null);
            setFormData({ year_name: '', start_date: '', end_date: '' });
            setFormErrors({});
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Tambah Tahun
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search and Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Cari Tahun</Label>
              <Input
                id="search"
                type="text"
                placeholder="Cari berdasarkan nama tahun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                Total: <span className="font-semibold">{filteredYears.length}</span> tahun
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Years List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Tahun</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredYears.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {years.length === 0 ? (
                <>
                  <FontAwesomeIcon icon={faCalendar} className="text-4xl mb-4" />
                  <p className="text-lg mb-2">Belum ada data tahun</p>
                  <p className="text-sm">Klik tombol "Tambah Tahun" untuk memulai</p>
                </>
              ) : (
                <p>Tidak ada tahun yang sesuai dengan pencarian "{searchTerm}"</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Tahun
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Mulai
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Berakhir
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredYears.map((year) => (
                    <tr key={year.year_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {year.year_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {year.year_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {year.start_date ? new Date(year.start_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {year.end_date ? new Date(year.end_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleEdit(year)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 text-sm"
                          >
                            <FontAwesomeIcon icon={faEdit} className="mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(year)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                          >
                            <FontAwesomeIcon icon={faTrash} className="mr-1" />
                            Hapus
                          </Button>
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

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingYear(null);
          setFormData({ year_name: '', start_date: '', end_date: '' });
          setFormErrors({});
        }}
        title={editingYear ? 'Edit Tahun' : 'Tambah Tahun Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="year_name">Nama Tahun *</Label>
            <Input
              id="year_name"
              name="year_name"
              type="text"
              value={formData.year_name}
              onChange={handleInputChange}
              placeholder="Contoh: 2025-2026"
              className={formErrors.year_name ? 'border-red-500' : ''}
            />
            {formErrors.year_name && (
              <p className="text-red-500 text-sm mt-1">{formErrors.year_name}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              Format: "2025-2026" atau "2024-2025". Tahun awal harus cocok dengan tanggal mulai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Tanggal Mulai *</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleInputChange}
                className={formErrors.start_date ? 'border-red-500' : ''}
              />
              {formErrors.start_date && (
                <p className="text-red-500 text-sm mt-1">{formErrors.start_date}</p>
              )}
            </div>
            <div>
              <Label htmlFor="end_date">Tanggal Berakhir *</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleInputChange}
                className={formErrors.end_date ? 'border-red-500' : ''}
              />
              {formErrors.end_date && (
                <p className="text-red-500 text-sm mt-1">{formErrors.end_date}</p>
              )}
            </div>
          </div>

          {formData.year_name.trim() && formData.start_date && formData.end_date && (() => {
            const yearRange = extractYearRange(formData.year_name.trim());
            if (yearRange) {
              const startOk = new Date(formData.start_date).getFullYear() === yearRange.startYear;
              const endOk = new Date(formData.end_date).getFullYear() === yearRange.endYear;
              if (startOk && endOk) {
                return (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faInfoCircle} className="text-green-500 mr-2" />
                      <span className="text-sm text-green-700">
                        Tahun pada tanggal sesuai dengan nama tahun ajaran {yearRange.startYear}-{yearRange.endYear}
                      </span>
                    </div>
                  </div>
                );
              }
            }
            return null;
          })()}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingYear(null);
                setFormData({ year_name: '', start_date: '', end_date: '' });
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
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {editingYear ? 'Mengupdate...' : 'Menyimpan...'}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={editingYear ? faSave : faPlus} className="mr-2" />
                  {editingYear ? 'Update Tahun' : 'Tambah Tahun'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setYearToDelete(null);
        }}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Apakah Anda yakin ingin menghapus tahun "{yearToDelete?.year_name}"?
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500 mt-0.5 mr-2" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Peringatan!</p>
                <p>Data yang sudah dihapus tidak dapat dikembalikan. Pastikan tahun ini tidak sedang digunakan dalam data lain.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setYearToDelete(null);
              }}
              disabled={deleting}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              Batal
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Menghapus...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrash} className="mr-2" />
                  Ya, Hapus
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
