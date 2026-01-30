"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'

export default function POSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Edit form state
  const [editMode, setEditMode] = useState(false)
  const [lastSequence, setLastSequence] = useState(0)
  const [prefix, setPrefix] = useState('PO/CCS')
  const [notes, setNotes] = useState('')
  
  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetValue, setResetValue] = useState('0')
  const [resetNotes, setResetNotes] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('uniform_po_settings')
        .select('*')
        .eq('id', 1)
        .single()
      
      if (err) throw err
      
      setSettings(data)
      setLastSequence(data.last_sequence || 0)
      setPrefix(data.prefix || 'PO/CCS')
      setNotes(data.notes || '')
    } catch (e) {
      setError('Gagal memuat settings: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: err } = await supabase
        .from('uniform_po_settings')
        .update({
          last_sequence: Number(lastSequence),
          prefix: prefix.trim(),
          notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
      
      if (err) throw err
      
      setSuccess('Settings berhasil disimpan')
      setEditMode(false)
      await loadSettings()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('Gagal menyimpan: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const newSequence = Number(resetValue) || 0
      const resetDate = new Date().toISOString().split('T')[0]
      
      const { error: err } = await supabase
        .from('uniform_po_settings')
        .update({
          last_sequence: newSequence,
          last_reset_date: resetDate,
          notes: resetNotes.trim() || `Reset to ${newSequence} on ${resetDate}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
      
      if (err) throw err
      
      setSuccess(`Counter berhasil direset ke ${newSequence}`)
      setShowResetModal(false)
      setResetValue('0')
      setResetNotes('')
      await loadSettings()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('Gagal reset: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditMode(false)
    setLastSequence(settings?.last_sequence || 0)
    setPrefix(settings?.prefix || 'PO/CCS')
    setNotes(settings?.notes || '')
    setError('')
  }

  const formatNextPONumber = () => {
    if (!settings) return '-'
    const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    const now = new Date()
    const month = monthRoman[now.getMonth()]
    const year = String(now.getFullYear()).slice(-2)
    const seq = String((settings.last_sequence || 0) + 1).padStart(4, '0')
    return `${settings.prefix || 'PO/CCS'}/${month}/${year}/${seq}`
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pengaturan Nomor PO</h1>
            <p className="text-sm text-gray-600 mt-1">Kelola penomoran otomatis Purchase Order</p>
          </div>
          <Button 
            onClick={() => window.history.back()} 
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            ← Kembali
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Current Status Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Status Saat Ini</h2>
              <p className="text-sm text-gray-600">Nomor PO yang akan digunakan untuk pesanan berikutnya</p>
            </div>
            <Button 
              onClick={loadSettings} 
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1.5"
            >
              🔄 Refresh
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Nomor PO Berikutnya:</div>
              <div className="text-3xl font-mono font-bold text-blue-900">
                {formatNextPONumber()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-gray-600">Sequence Terakhir:</span>
                <span className="font-semibold text-lg">{settings?.last_sequence || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-gray-600">Prefix:</span>
                <span className="font-mono font-semibold">{settings?.prefix || 'PO/CCS'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-gray-600">Terakhir Reset:</span>
                <span className="font-semibold">
                  {settings?.last_reset_date 
                    ? new Date(settings.last_reset_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-gray-600">Terakhir Update:</span>
                <span className="font-semibold text-sm">
                  {settings?.updated_at 
                    ? new Date(settings.updated_at).toLocaleString('id-ID')
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {settings?.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Catatan:</div>
              <div className="text-sm text-gray-800">{settings.notes}</div>
            </div>
          )}
        </Card>

        {/* Edit Settings Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Kelola Settings</h2>
            {!editMode ? (
              <Button 
                onClick={() => setEditMode(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                ✏️ Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={cancelEdit} 
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={saving}
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan'}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="last_sequence">Last Sequence *</Label>
              <Input
                id="last_sequence"
                type="number"
                value={lastSequence}
                onChange={(e) => setLastSequence(e.target.value)}
                disabled={!editMode}
                className="font-mono"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nomor urut terakhir yang digunakan. Sistem akan increment +1 untuk PO berikutnya.
              </p>
            </div>

            <div>
              <Label htmlFor="prefix">Prefix *</Label>
              <Input
                id="prefix"
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                disabled={!editMode}
                className="font-mono"
                placeholder="PO/CCS"
              />
              <p className="text-xs text-gray-500 mt-1">
                Prefix untuk nomor PO. Format: {prefix || 'PO/CCS'}/{'{Bulan Romawi}'}/{'{Tahun}'}/{'{Nomor Urut}'}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Catatan</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                rows={3}
                placeholder="Catatan optional..."
              />
            </div>
          </div>
        </Card>

        {/* Reset Card */}
        <Card className="p-6 border-2 border-orange-200 bg-orange-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-orange-900 mb-2">⚠️ Reset Counter</h2>
              <p className="text-sm text-gray-700 mb-3">
                Reset counter untuk memulai penomoran baru (biasanya di awal tahun ajaran).
              </p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Reset akan mengubah last_sequence sesuai nilai yang ditentukan</li>
                <li>PO berikutnya akan menggunakan sequence dari nilai reset + 1</li>
                <li>Tanggal reset akan tercatat untuk audit</li>
              </ul>
            </div>
            <Button 
              onClick={() => setShowResetModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white ml-4"
            >
              🔄 Reset Counter
            </Button>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Informasi Format PO</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Format:</strong> <code className="bg-white px-2 py-1 rounded">{prefix || 'PO/CCS'}/{'{Bulan}'}/{'{Tahun}'}/{'{Nomor}'}</code></p>
            <p><strong>Contoh:</strong> <code className="bg-white px-2 py-1 rounded">PO/CCS/I/26/0001</code></p>
            <div className="mt-3">
              <p className="font-semibold mb-1">Bulan Romawi:</p>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div>I = Januari</div>
                <div>II = Februari</div>
                <div>III = Maret</div>
                <div>IV = April</div>
                <div>V = Mei</div>
                <div>VI = Juni</div>
                <div>VII = Juli</div>
                <div>VIII = Agustus</div>
                <div>IX = September</div>
                <div>X = Oktober</div>
                <div>XI = November</div>
                <div>XII = Desember</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Reset Modal */}
        <Modal
          isOpen={showResetModal}
          onClose={() => !saving && setShowResetModal(false)}
          title="Reset PO Counter"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Peringatan:</strong> Reset counter akan mengubah penomoran PO berikutnya.
                Pastikan Anda memahami dampaknya sebelum melanjutkan.
              </p>
            </div>

            <div>
              <Label htmlFor="reset_value">Reset Ke Nomor *</Label>
              <Input
                id="reset_value"
                type="number"
                value={resetValue}
                onChange={(e) => setResetValue(e.target.value)}
                min="0"
                className="font-mono"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                PO berikutnya akan menggunakan nomor: {Number(resetValue) + 1}
              </p>
            </div>

            <div>
              <Label htmlFor="reset_notes">Catatan Reset *</Label>
              <textarea
                id="reset_notes"
                value={resetNotes}
                onChange={(e) => setResetNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Contoh: Reset untuk tahun ajaran 2026/2027"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                onClick={() => setShowResetModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white"
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                onClick={handleReset}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={saving}
              >
                {saving ? 'Mereset...' : '🔄 Reset Sekarang'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
