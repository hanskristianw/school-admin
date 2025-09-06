"use client";

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import supabase from '@/lib/supabase'
import Modal from '@/components/ui/modal'
import { useI18n } from '@/lib/i18n'

export default function RoomMasterPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const nameRef = useRef(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_data')
      const user = raw ? JSON.parse(raw) : null
      if (user?.isAdmin) {
        setIsAdmin(true)
      } else {
        router.replace('/dashboard?forbidden=1')
      }
    } finally {
      setChecked(true)
    }
  }, [router])

  const loadRooms = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('room')
        .select('*')
        .order('room_name')
      if (error) throw error
      setRooms(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (isAdmin) loadRooms() }, [isAdmin])

  const resetForm = () => { setName(''); setEditing(null) }

  const openCreate = () => {
    resetForm()
    setIsModalOpen(true)
    setTimeout(() => nameRef.current?.focus(), 0)
  }

  const openEdit = (r) => {
    setEditing(r)
    setName(r.room_name)
    setIsModalOpen(true)
    setTimeout(() => nameRef.current?.focus(), 0)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setLoading(true)
      setError('')
    if (editing && editing.room_id) {
        const { error } = await supabase
          .from('room')
      .update({ room_name: name.trim(), updated_at: new Date().toISOString() })
          .eq('room_id', editing.room_id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('room')
          .insert([{ room_name: name.trim() }])
        if (error) throw error
      }
  resetForm()
  setIsModalOpen(false)
      await loadRooms()
    } catch (e) {
  setError(e.message.includes('unique') ? t('roomMaster.errors.nameDuplicate') : e.message)
    } finally {
      setLoading(false)
    }
  }

  const onEdit = (r) => openEdit(r)
  const onDelete = async (r) => {
  if (!confirm(t('roomMaster.confirmDeleteQuestion', { name: r.room_name }))) return
    try {
      setLoading(true)
      setError('')
      const { error } = await supabase
        .from('room')
        .delete()
        .eq('room_id', r.room_id)
      if (error) throw error
      if (editing?.room_id === r.room_id) resetForm()
      await loadRooms()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!checked || !isAdmin) return null

  return (
    <div className="space-y-6 pb-8">
      <div className="px-1">
  <h1 className="text-2xl font-bold text-gray-900">{t('roomMaster.title')}</h1>
  <p className="text-gray-600 text-sm">{t('roomMaster.subtitle')}</p>
      </div>

      <div className="flex items-center justify-between">
        <div />
        <Button type="button" onClick={openCreate}>{t('roomMaster.add')}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('roomMaster.listTitle')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-2 py-2">{t('roomMaster.name')}</th>
                  <th className="px-2 py-2 w-36">{t('roomMaster.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.room_id} className="border-t">
                    <td className="px-2 py-2">{r.room_name}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => onEdit(r)} variant="secondary" className="text-xs">{t('roomMaster.edit')}</Button>
                        <Button type="button" onClick={() => onDelete(r)} className="bg-red-600 hover:bg-red-700 text-xs">{t('roomMaster.delete')}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr><td className="px-2 py-3 text-gray-500" colSpan={2}>{t('roomMaster.empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
    title={editing ? t('roomMaster.modalTitleEdit') : t('roomMaster.modalTitleCreate')}
        size="sm"
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
      <label className="text-sm text-gray-600">{t('roomMaster.nameLabel')}</label>
      <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('roomMaster.namePlaceholder')} required />
          </div>
          {error && <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>{t('roomMaster.cancel')}</Button>
      <Button type="submit" disabled={loading}>{editing ? t('roomMaster.save') : t('roomMaster.create')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
