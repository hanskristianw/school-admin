"use client";

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'

export default function RoleManagementPage() {
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState([])
  const [dashboardTypes, setDashboardTypes] = useState([])
  const [search, setSearch] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })
  const [form, setForm] = useState({
    role_id: null,
    role_name: '',
    dashboard_type_id: null,
    role_priority: 50,
    is_admin: false,
    is_teacher: false,
    is_principal: false,
    is_student: false,
    is_counselor: false,
    can_void_transactions: false
  })

  const isAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem('user_data')
      const user = raw ? JSON.parse(raw) : null
      return !!user?.isAdmin
    } catch { return false }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        // Fetch dashboard types
        const { data: dtData, error: dtError } = await supabase
          .from('dashboard_type')
          .select('dashboard_type_id, type_code, type_name')
          .eq('is_active', true)
          .order('type_name')
        if (dtError) throw new Error(dtError.message)
        setDashboardTypes(dtData || [])
        
        // Fetch roles with dashboard_type info
        const { data, error } = await supabase
          .from('role')
          .select('role_id, role_name, dashboard_type_id, role_priority, is_admin, is_teacher, is_principal, is_student, is_counselor, can_void_transactions')
          .order('role_priority', { ascending: false })
          .order('role_name')
        if (error) throw new Error(error.message)
        setRoles(data || [])
      } catch (e) {
        setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roles
    return (roles||[]).filter(r => (r.role_name||'').toLowerCase().includes(q))
  }, [roles, search])

  const openNew = () => {
    setForm({ role_id: null, role_name: '', dashboard_type_id: null, role_priority: 50, is_admin: false, is_teacher: false, is_principal: false, is_student: false, is_counselor: false, can_void_transactions: false })
    setShowEdit(true)
  }
  const openEdit = (r) => {
    setForm({
      role_id: r.role_id,
      role_name: r.role_name || '',
      dashboard_type_id: r.dashboard_type_id || null,
      role_priority: r.role_priority || 50,
      is_admin: !!r.is_admin,
      is_teacher: !!r.is_teacher,
      is_principal: !!r.is_principal,
      is_student: !!r.is_student,
      is_counselor: !!r.is_counselor,
      can_void_transactions: !!r.can_void_transactions
    })
    setShowEdit(true)
  }

  const saveRole = async () => {
    if (!isAdmin) return
    if (!form.role_name?.trim()) {
      setNotif({ isOpen: true, title: 'Validation', message: 'Role name is required', type: 'warning' });
      return;
    }
    if (!form.dashboard_type_id) {
      setNotif({ isOpen: true, title: 'Validation', message: 'Dashboard type is required', type: 'warning' });
      return;
    }
    setSaving(true)
    try {
      const payload = {
        role_name: form.role_name.trim(),
        role_priority: parseInt(form.role_priority) || 50,
        dashboard_type_id: parseInt(form.dashboard_type_id),
        is_admin: !!form.is_admin,
        is_teacher: !!form.is_teacher,
        is_principal: !!form.is_principal,
        is_student: !!form.is_student,
        is_counselor: !!form.is_counselor,
        can_void_transactions: !!form.can_void_transactions
      }
      if (form.role_id) {
        const { error } = await supabase.from('role').update(payload).eq('role_id', form.role_id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('role').insert([payload])
        if (error) throw new Error(error.message)
      }
      const { data, error: rErr } = await supabase.from('role').select('role_id, role_name, dashboard_type_id, role_priority, is_admin, is_teacher, is_principal, is_student, is_counselor, can_void_transactions').order('role_priority', { ascending: false }).order('role_name')
      if (rErr) throw new Error(rErr.message)
      setRoles(data || [])
      setShowEdit(false)
      setNotif({ isOpen: true, title: 'Success', message: 'Role saved', type: 'success' })
    } catch (e) {
      setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
    } finally { setSaving(false) }
  }

  const deleteRole = async (r) => {
    if (!isAdmin) return
    if (!confirm(`Delete role "${r.role_name}"?`)) return
    try {
      const { error } = await supabase.from('role').delete().eq('role_id', r.role_id)
      if (error) throw error
      const { data, error: rErr } = await supabase.from('role').select('role_id, role_name, dashboard_type_id, role_priority, is_admin, is_teacher, is_principal, is_student, is_counselor').order('role_priority', { ascending: false }).order('role_name')
      if (rErr) throw rErr
      setRoles(data || [])
      setNotif({ isOpen: true, title: 'Deleted', message: 'Role removed', type: 'success' })
    } catch (e) {
      const msg = e?.message?.includes('violates foreign key')
        ? 'Role is in use by users and cannot be deleted.'
        : (e.message || 'Delete failed')
      setNotif({ isOpen: true, title: 'Error', message: msg, type: 'error' })
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader><CardTitle>Role Management</CardTitle></CardHeader>
          <CardContent>
            <div className="text-red-700 text-sm">Forbidden: Admin only.</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Role Management</h1>
        <div className="flex w-full sm:w-auto gap-2">
          <Input placeholder="Search role name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-64" />
          <Button className="whitespace-nowrap" onClick={openNew}>Add Role</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading roles...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Priority</th>
                    <th className="py-2 pr-2">Dashboard Type</th>
                    <th className="py-2 pr-2">Flags</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.role_id} className="hover:bg-gray-50">
                      <td className="py-2 pr-2 font-medium">{r.role_name}</td>
                      <td className="py-2 pr-2 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {r.role_priority || 50}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-sm">
                        {r.dashboard_type_id ? (
                          <span className="text-gray-700">
                            {dashboardTypes.find(dt => dt.dashboard_type_id === r.dashboard_type_id)?.type_name || 'Unknown'}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {r.is_admin && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">Admin</span>}
                          {r.is_teacher && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">Teacher</span>}
                          {r.is_principal && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">Principal</span>}
                          {r.is_student && <span className="px-2 py-0.5 rounded bg-green-100 text-green-800">Student</span>}
                          {r.is_counselor && <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-800">Counselor</span>}
                          {!r.is_admin && !r.is_teacher && !r.is_principal && !r.is_student && !r.is_counselor && (
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">Staff</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                          <Button variant="destructive" onClick={() => deleteRole(r)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-500 py-4">No roles found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={form.role_id ? 'Edit Role' : 'Add Role'}>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.role_name} onChange={e => setForm(prev => ({ ...prev, role_name: e.target.value }))} />
          </div>
          <div>
            <Label>Dashboard Type <span className="text-red-500">*</span></Label>
            <select
              value={form.dashboard_type_id || ''}
              onChange={e => setForm(prev => ({ ...prev, dashboard_type_id: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Pilih Dashboard Type --</option>
              {dashboardTypes.map(dt => (
                <option key={dt.dashboard_type_id} value={dt.dashboard_type_id}>
                  {dt.type_name} ({dt.type_code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Dashboard type wajib dipilih (menentukan halaman dashboard yang akan ditampilkan)</p>
          </div>
          <div>
            <Label>Priority <span className="text-gray-400">(untuk multi-role user)</span></Label>
            <Input 
              type="number" 
              min="1" 
              max="100" 
              value={form.role_priority} 
              onChange={e => setForm(prev => ({ ...prev, role_priority: parseInt(e.target.value) || 50 }))} 
            />
            <p className="text-xs text-gray-500 mt-1">
              Priority tinggi diprioritaskan untuk dashboard. 
              <span className="font-medium"> Student: 10, Teacher: 50, Counselor: 60, Principal: 80, Admin: 100</span>
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_admin} onChange={e=>setForm(p=>({...p,is_admin:e.target.checked}))} />Admin</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_teacher} onChange={e=>setForm(p=>({...p,is_teacher:e.target.checked}))} />Teacher</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_principal} onChange={e=>setForm(p=>({...p,is_principal:e.target.checked}))} />Principal</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_student} onChange={e=>setForm(p=>({...p,is_student:e.target.checked}))} />Student</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_counselor} onChange={e=>setForm(p=>({...p,is_counselor:e.target.checked}))} />Counselor</label>
          </div>
          <div className="border-t pt-3">
            <Label className="text-sm font-medium mb-2 block">Permissions</Label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.can_void_transactions} onChange={e=>setForm(p=>({...p,can_void_transactions:e.target.checked}))} />
              <span>Can Void Transactions</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Allow this role to void/cancel purchase orders, sales, and other transactions</p>
          </div>
          <div className="text-xs text-gray-500">Note: Admin bypasses all guards. Flags affect access to specific sections (teacher, student, counselor overrides).</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={saveRole} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <NotificationModal isOpen={notif.isOpen} onClose={() => setNotif(prev => ({ ...prev, isOpen: false }))} title={notif.title} message={notif.message} type={notif.type} />
    </div>
  )
}
