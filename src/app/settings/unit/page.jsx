'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';

export default function UnitManagement() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    unit_name: ''
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

  useEffect(() => {
    fetchUnits();
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

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Process error message to be more user-friendly
  const processErrorMessage = (errorMessage) => {
    if (!errorMessage) return 'Terjadi kesalahan yang tidak diketahui';
    
    const message = errorMessage.toLowerCase();
    
    // Handle duplicate unit name error
    if (message.includes('duplicate key value violates unique constraint') && 
        message.includes('unit_name')) {
      return 'Nama unit sudah digunakan. Silakan gunakan nama yang berbeda.';
    }
    
    // Handle other duplicate constraints
    if (message.includes('duplicate key value violates unique constraint')) {
      return 'Data yang dimasukkan sudah ada dalam sistem. Silakan periksa kembali.';
    }
    
    // Handle invalid JSON responses
    if (message.includes('invalid json') || message.includes('unexpected token')) {
      return 'Server mengembalikan response yang tidak valid. Silakan coba lagi atau hubungi administrator.';
    }
    
    // Handle required field errors
    if (message.includes('all fields are required') || message.includes('unit_name is required')) {
      return 'Nama unit wajib diisi.';
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

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Menggunakan Supabase untuk fetch units
      const { data, error } = await supabase
        .from('unit')
        .select('unit_id, unit_name')
        .order('unit_name');

      if (error) {
        throw new Error(error.message);
      }

      console.log('Fetched units from Supabase:', data);
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
      setError('Error fetching units: ' + err.message);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.unit_name.trim()) {
      errors.unit_name = 'Nama unit wajib diisi';
    } else if (formData.unit_name.length < 2) {
      errors.unit_name = 'Nama unit minimal 2 karakter';
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
        unit_name: formData.unit_name.trim()
      };

      let result;

      if (editingUnit) {
        // Update existing unit
        result = await supabase
          .from('unit')
          .update(submitData)
          .eq('unit_id', editingUnit.unit_id);
      } else {
        // Create new unit
        result = await supabase
          .from('unit')
          .insert([submitData]);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Success
      await fetchUnits(); // Refresh the list
      resetForm();
      setError('');
      showNotification(
        'Berhasil!',
        editingUnit ? 'Data unit berhasil diupdate!' : 'Unit baru berhasil ditambahkan!',
        'success'
      );
    } catch (err) {
      const friendlyErrorMessage = processErrorMessage(err.message);
      setError('Error: ' + friendlyErrorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      unit_name: unit.unit_name
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (unit) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus unit "${unit.unit_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('unit')
        .delete()
        .eq('unit_id', unit.unit_id);

      if (error) {
        throw new Error(error.message);
      }

      await fetchUnits(); // Refresh the list
      showNotification(
        'Berhasil!',
        'Unit berhasil dihapus!',
        'success'
      );
    } catch (err) {
      const friendlyErrorMessage = processErrorMessage(err.message);
      showNotification('Error!', friendlyErrorMessage, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      unit_name: ''
    });
    setEditingUnit(null);
    setShowForm(false);
    setFormErrors({});
    setError(''); // Clear error when closing modal
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

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Unit Management</h1>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Add New Unit
        </Button>
      </div>

      {/* Unit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingUnit ? 'Edit Unit' : 'Add New Unit'}
        size="sm"
      >
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="unit_name">Nama Unit *</Label>
            <Input
              id="unit_name"
              name="unit_name"
              value={formData.unit_name}
              onChange={handleInputChange}
              className={formErrors.unit_name ? 'border-red-500' : ''}
              disabled={submitting}
              placeholder="Masukkan nama unit"
            />
            {formErrors.unit_name && (
              <p className="text-red-500 text-sm mt-1">{formErrors.unit_name}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : (editingUnit ? 'Update Unit' : 'Create Unit')}
            </Button>
            <Button 
              type="button" 
              onClick={resetForm} 
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Units Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Units List ({units.length} units)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="block md:hidden space-y-3">
            {units.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                No units found
              </div>
            ) : (
              units.map(unit => (
                <div key={unit.unit_id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{unit.unit_name}</h3>
                    </div>
                    <span className="text-xs text-gray-500">ID: {unit.unit_id}</span>
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    <Button 
                      size="sm" 
                      onClick={() => handleEdit(unit)}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleDelete(unit)}
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Nama Unit</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="border border-gray-300 px-4 py-6 text-center text-gray-500">
                      No units found
                    </td>
                  </tr>
                ) : (
                  units.map(unit => (
                    <tr key={unit.unit_id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{unit.unit_id}</td>
                      <td className="border border-gray-300 px-4 py-2">{unit.unit_name}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleEdit(unit)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleDelete(unit)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
