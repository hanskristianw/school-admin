'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import { supabase } from '@/lib/supabase'

export default function AdmissionLevelManagement() {
  const [levels, setLevels] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingLevel, setEditingLevel] = useState(null)
  const [formData, setFormData] = useState({
    unit_id: '',
    level_name: '',
    level_order: '',
    is_active: true
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [filterUnit, setFilterUnit] = useState('')

  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  const processErrorMessage = (errorMessage) => {
    if (!errorMessage) return 'Terjadi kesalahan yang tidak diketahui'
    const message = errorMessage.toLowerCase()

    if (message.includes('duplicate key value violates unique constraint') && message.includes('uq_admission_level')) {
      return 'Nama jenjang sudah ada untuk unit ini. Gunakan nama yang berbeda.'
    }
    if (message.includes('duplicate key value violates unique constraint')) {
      return 'Data yang dimasukkan sudah ada dalam sistem.'
    }
    if (message.includes('violates foreign key constraint')) {
      return 'Jenjang ini masih digunakan oleh data lain (pendaftaran/biaya). Hapus data terkait terlebih dahulu.'
    }
    if (message.includes('connection') || message.includes('network')) {
      return 'Koneksi ke server bermasalah. Silakan coba lagi.'
    }
    return errorMessage
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      const [unitsRes, levelsRes] = await Promise.all([
        supabase
          .from('unit')
          .select('unit_id, unit_name')
          .eq('is_school', true)
          .order('unit_name'),
        supabase
          .from('admission_level')
          .select('level_id, unit_id, level_name, level_order, is_active, unit:unit_id(unit_name)')
          .order('level_order')
      ])

      if (unitsRes.error) throw new Error(unitsRes.error.message)
      if (levelsRes.error) throw new Error(levelsRes.error.message)

      setUnits(unitsRes.data || [])
      setLevels(levelsRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Group levels by unit for display
  const groupedLevels = useMemo(() => {
    const filtered = filterUnit
      ? levels.filter(l => l.unit_id === parseInt(filterUnit))
      : levels

    const groups = {}
    for (const level of filtered) {
      const unitName = level.unit?.unit_name || 'Unknown'
      if (!groups[unitName]) groups[unitName] = []
      groups[unitName].push(level)
    }
    // Sort each group by level_order
    for (const key in groups) {
      groups[key].sort((a, b) => a.level_order - b.level_order)
    }
    return groups
  }, [levels, filterUnit])

  const validateForm = () => {
    const errors = {}
    if (!formData.unit_id) {
      errors.unit_id = 'Unit wajib dipilih'
    }
    if (!formData.level_name.trim()) {
      errors.level_name = 'Nama jenjang wajib diisi'
    } else if (formData.level_name.trim().length < 2) {
      errors.level_name = 'Nama jenjang minimal 2 karakter'
    }
    if (formData.level_order === '' || formData.level_order === null || formData.level_order === undefined) {
      errors.level_order = 'Urutan wajib diisi'
    } else if (isNaN(Number(formData.level_order)) || Number(formData.level_order) < 0) {
      errors.level_order = 'Urutan harus berupa angka positif'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const submitData = {
        unit_id: parseInt(formData.unit_id),
        level_name: formData.level_name.trim(),
        level_order: parseInt(formData.level_order),
        is_active: !!formData.is_active
      }

      let result
      if (editingLevel) {
        result = await supabase
          .from('admission_level')
          .update(submitData)
          .eq('level_id', editingLevel.level_id)
      } else {
        result = await supabase
          .from('admission_level')
          .insert([submitData])
      }

      if (result.error) throw new Error(result.error.message)

      await fetchData()
      resetForm()
      setError('')
      showNotification(
        'Berhasil!',
        editingLevel ? 'Jenjang berhasil diupdate!' : 'Jenjang baru berhasil ditambahkan!',
        'success'
      )
    } catch (err) {
      const friendlyMsg = processErrorMessage(err.message)
      setError('Error: ' + friendlyMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (level) => {
    setEditingLevel(level)
    setFormData({
      unit_id: String(level.unit_id),
      level_name: level.level_name,
      level_order: String(level.level_order),
      is_active: !!level.is_active
    })
    setShowForm(true)
    setFormErrors({})
    setError('')
  }

  const handleDelete = async (level) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jenjang "${level.level_name}"?`)) return

    try {
      const { error } = await supabase
        .from('admission_level')
        .delete()
        .eq('level_id', level.level_id)

      if (error) throw new Error(error.message)

      await fetchData()
      showNotification('Berhasil!', 'Jenjang berhasil dihapus!', 'success')
    } catch (err) {
      const friendlyMsg = processErrorMessage(err.message)
      showNotification('Error!', friendlyMsg, 'error')
    }
  }

  const handleToggleActive = async (level) => {
    try {
      const { error } = await supabase
        .from('admission_level')
        .update({ is_active: !level.is_active })
        .eq('level_id', level.level_id)

      if (error) throw new Error(error.message)

      await fetchData()
      showNotification(
        'Berhasil!',
        `Jenjang "${level.level_name}" ${!level.is_active ? 'diaktifkan' : 'dinonaktifkan'}!`,
        'success'
      )
    } catch (err) {
      showNotification('Error!', processErrorMessage(err.message), 'error')
    }
  }

  const resetForm = () => {
    setFormData({ unit_id: '', level_name: '', level_order: '', is_active: true })
    setEditingLevel(null)
    setShowForm(false)
    setFormErrors({})
    setError('')
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Auto-suggest next order number when unit is selected
  const handleUnitChange = (e) => {
    const unitId = e.target.value
    setFormData(prev => ({ ...prev, unit_id: unitId }))
    if (formErrors.unit_id) setFormErrors(prev => ({ ...prev, unit_id: '' }))

    if (unitId && !editingLevel) {
      const unitLevels = levels.filter(l => l.unit_id === parseInt(unitId))
      const maxOrder = unitLevels.reduce((max, l) => Math.max(max, l.level_order), 0)
      setFormData(prev => ({ ...prev, unit_id: unitId, level_order: String(maxOrder + 1) }))
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Jenjang Pendaftaran</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola jenjang pendaftaran per unit akademik</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Tambah Jenjang
        </Button>
      </div>

      {/* Filter by Unit */}
      <div className="mb-4">
        <select
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Unit</option>
          {units.map(u => (
            <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
          ))}
        </select>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingLevel ? 'Edit Jenjang' : 'Tambah Jenjang Baru'}
        size="sm"
      >
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="unit_id">Unit Akademik *</Label>
            <select
              id="unit_id"
              name="unit_id"
              value={formData.unit_id}
              onChange={handleUnitChange}
              disabled={submitting}
              className={`mt-1 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.unit_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Pilih unit</option>
              {units.map(u => (
                <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
              ))}
            </select>
            {formErrors.unit_id && (
              <p className="text-red-500 text-sm mt-1">{formErrors.unit_id}</p>
            )}
          </div>

          <div>
            <Label htmlFor="level_name">Nama Jenjang *</Label>
            <Input
              id="level_name"
              name="level_name"
              value={formData.level_name}
              onChange={handleInputChange}
              className={formErrors.level_name ? 'border-red-500' : ''}
              disabled={submitting}
              placeholder="Contoh: Nursery 1, K1, Elementary, JHS"
            />
            {formErrors.level_name && (
              <p className="text-red-500 text-sm mt-1">{formErrors.level_name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="level_order">Urutan *</Label>
            <Input
              id="level_order"
              name="level_order"
              type="number"
              min="0"
              value={formData.level_order}
              onChange={handleInputChange}
              className={formErrors.level_order ? 'border-red-500' : ''}
              disabled={submitting}
              placeholder="Urutan tampil (angka kecil = tampil duluan)"
            />
            {formErrors.level_order && (
              <p className="text-red-500 text-sm mt-1">{formErrors.level_order}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              checked={!!formData.is_active}
              onChange={handleInputChange}
              disabled={submitting}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="is_active">Aktif</Label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              disabled={submitting}
            >
              {submitting ? 'Menyimpan...' : (editingLevel ? 'Update Jenjang' : 'Simpan Jenjang')}
            </Button>
            <Button
              type="button"
              onClick={resetForm}
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={submitting}
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Levels Display */}
      {Object.keys(groupedLevels).length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              {filterUnit ? 'Tidak ada jenjang untuk unit ini' : 'Belum ada jenjang pendaftaran. Klik "Tambah Jenjang" untuk memulai.'}
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedLevels).map(([unitName, unitLevels]) => (
          <Card key={unitName} className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {unitName}
                </span>
                <span className="text-sm text-gray-400 font-normal">
                  {unitLevels.length} jenjang
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile View */}
              <div className="block md:hidden space-y-3">
                {unitLevels.map(level => (
                  <div key={level.level_id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{level.level_name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Urutan: {level.level_order}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {level.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Aktif</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Nonaktif</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleToggleActive(level)}
                        className={`flex-1 ${level.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
                      >
                        {level.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEdit(level)}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDelete(level)}
                        className="bg-red-600 hover:bg-red-700 text-white flex-1"
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left w-16">Urutan</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Nama Jenjang</th>
                      <th className="border border-gray-300 px-4 py-2 text-center w-24">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left w-64">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitLevels.map(level => (
                      <tr key={level.level_id} className={`hover:bg-gray-50 ${!level.is_active ? 'bg-gray-100 text-gray-400' : ''}`}>
                        <td className="border border-gray-300 px-4 py-2 text-center font-mono text-sm">
                          {level.level_order}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {level.level_name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {level.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Aktif</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Nonaktif</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleToggleActive(level)}
                              className={`${level.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
                            >
                              {level.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEdit(level)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDelete(level)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  )
}
