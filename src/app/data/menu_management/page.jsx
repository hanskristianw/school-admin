"use client";

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'

export default function MenuManagementPage() {
  const [loading, setLoading] = useState(true)
  const [menus, setMenus] = useState([])
  const [roles, setRoles] = useState([])
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [permByRole, setPermByRole] = useState(new Map()) // role_id -> has permission
  const [search, setSearch] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({ menu_id: null, menu_name: '', menu_path: '', menu_icon: '', menu_order: 0, menu_parent_id: null, menu_show_dashboard: false })
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })
  // Tree-only view; table/drag ordering removed per request

  const isAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem('user_data')
      const user = raw ? JSON.parse(raw) : null
      return !!user?.isAdmin
    } catch { return false }
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const [{ data: menusData, error: menusErr }, { data: rolesData, error: rolesErr }] = await Promise.all([
          supabase.from('menus').select('*').order('menu_order'),
          supabase.from('role').select('role_id, role_name, is_admin').order('role_name')
        ])
        if (menusErr) throw new Error(menusErr.message)
        if (rolesErr) throw new Error(rolesErr.message)
        setMenus(menusData || [])
        setRoles(rolesData || [])
  // no-op for tree-only view
      } catch (e) {
        setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    const fetchPerms = async () => {
      if (!selectedMenu) { setPermByRole(new Map()); return }
      try {
        const { data, error } = await supabase.from('menu_permissions').select('role_id').eq('menu_id', selectedMenu.menu_id)
        if (error) throw new Error(error.message)
        const m = new Map()
        ;(data || []).forEach(r => m.set(r.role_id, true))
        setPermByRole(m)
      } catch (e) {
        setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
      }
    }
    fetchPerms()
  }, [selectedMenu])

  const openNew = () => {
    setForm({ menu_id: null, menu_name: '', menu_path: '', menu_icon: '', menu_order: 0, menu_parent_id: null })
    setShowEdit(true)
  }

  const openEdit = (menu) => {
    setForm({
      menu_id: menu.menu_id,
      menu_name: menu.menu_name || '',
      menu_path: menu.menu_path || '',
      menu_icon: menu.menu_icon || '',
      menu_order: menu.menu_order || 0,
      menu_parent_id: menu.menu_parent_id ?? null,
      menu_show_dashboard: !!menu.menu_show_dashboard
    })
    setShowEdit(true)
  }

  const saveMenu = async () => {
    if (!isAdmin) return
    if (!form.menu_name?.trim()) {
      setNotif({ isOpen: true, title: 'Validation', message: 'Menu name is required', type: 'warning' });
      return;
    }
    setSaving(true)
    try {
      const payload = {
        menu_name: form.menu_name.trim(),
        menu_path: form.menu_path?.trim() || null,
        menu_icon: form.menu_icon?.trim() || null,
        menu_order: Number(form.menu_order) || 0,
        menu_parent_id: (form.menu_parent_id === '' || form.menu_parent_id === null) ? null : Number(form.menu_parent_id),
        menu_show_dashboard: !!form.menu_show_dashboard
      }
      if (form.menu_id) {
        const { error } = await supabase.from('menus').update(payload).eq('menu_id', form.menu_id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('menus').insert([payload])
        if (error) throw new Error(error.message)
      }
      // reload
      const { data: menusData, error: menusErr } = await supabase.from('menus').select('*').order('menu_order')
      if (menusErr) throw new Error(menusErr.message)
      setMenus(menusData || [])
      setShowEdit(false)
      setNotif({ isOpen: true, title: 'Success', message: 'Menu saved', type: 'success' })
    } catch (e) {
      setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const deleteMenu = async (menu) => {
    if (!isAdmin) return
    if (!confirm(`Delete menu "${menu.menu_name}"?`)) return
    try {
      const { error } = await supabase.from('menus').delete().eq('menu_id', menu.menu_id)
      if (error) throw new Error(error.message)
      const { data: menusData, error: menusErr } = await supabase.from('menus').select('*').order('menu_order')
      if (menusErr) throw new Error(menusErr.message)
      setMenus(menusData || [])
      if (selectedMenu?.menu_id === menu.menu_id) setSelectedMenu(null)
      setNotif({ isOpen: true, title: 'Deleted', message: 'Menu removed', type: 'success' })
    } catch (e) {
      setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
    }
  }

  const toggleRolePermission = async (roleId, checked) => {
    if (!isAdmin || !selectedMenu) return
    try {
      if (checked) {
        const { error } = await supabase.from('menu_permissions').insert([{ menu_id: selectedMenu.menu_id, role_id: roleId }])
        if (error) throw new Error(error.message)
        const next = new Map(permByRole); next.set(roleId, true); setPermByRole(next)
      } else {
        const { error } = await supabase.from('menu_permissions').delete().match({ menu_id: selectedMenu.menu_id, role_id: roleId })
        if (error) throw new Error(error.message)
        const next = new Map(permByRole); next.delete(roleId); setPermByRole(next)
      }
    } catch (e) {
      setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
    }
  }

  // Tree filtering by search: keep nodes that match or have a matching descendant
  const menusTreeFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return menus
    const byId = new Map((menus||[]).map(m => [m.menu_id, m]))
    const children = new Map()
    for (const m of menus||[]) {
      if (m.menu_parent_id != null) {
        if (!children.has(m.menu_parent_id)) children.set(m.menu_parent_id, [])
        children.get(m.menu_parent_id).push(m.menu_id)
      }
    }
    const matches = (m) => ((m.menu_name||'').toLowerCase().includes(q) || (m.menu_path||'').toLowerCase().includes(q))
    const visible = new Set()
    const seen = new Set()
    const dfs = (id) => {
      if (seen.has(id)) return false
      seen.add(id)
      const node = byId.get(id)
      if (!node) return false
      let ok = matches(node)
      const kids = children.get(id) || []
      for (const kid of kids) {
        if (dfs(kid)) ok = true
      }
      if (ok) visible.add(id)
      return ok
    }
    // run for all roots
    for (const m of menus||[]) if (m.menu_parent_id == null) dfs(m.menu_id)
    return (menus||[]).filter(m => visible.has(m.menu_id))
  }, [menus, search])

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader><CardTitle>Menu Management</CardTitle></CardHeader>
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
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <div className="flex w-full sm:w-auto gap-2">
          <Input placeholder="Search menu name or path..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-64" />
          <Button className="whitespace-nowrap" onClick={openNew}>Add Menu</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Menus</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading menus...</div>
            ) : (
              <div>
                <div className="text-xs text-gray-500 mb-2">Tree view grouped by parent/child order. Use search to filter.</div>
                <MenuTree
                  menus={menusTreeFiltered}
                  selectedMenu={selectedMenu}
                  onSelect={(m)=>setSelectedMenu(m)}
                  onEdit={openEdit}
                  onDelete={deleteMenu}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Permissions</CardTitle></CardHeader>
          <CardContent>
            {!selectedMenu ? (
              <div className="text-sm text-gray-600">Select a menu to manage permissions.</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">Menu: <span className="font-medium">{selectedMenu.menu_name}</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {roles.map(r => (
                    <label key={r.role_id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!permByRole.get(r.role_id)}
                        onChange={(e) => toggleRolePermission(r.role_id, e.target.checked)}
                      />
                      <span>{r.role_name}{r.is_admin ? ' (admin)' : ''}</span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500">Note: Admins can access all menus regardless of explicit permission.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={form.menu_id ? 'Edit Menu' : 'Add Menu'}>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.menu_name} onChange={e => setForm(prev => ({ ...prev, menu_name: e.target.value }))} />
          </div>
          <div>
            <Label>Path</Label>
            <Input placeholder="e.g. /data/class" value={form.menu_path||''} onChange={e => setForm(prev => ({ ...prev, menu_path: e.target.value }))} />
          </div>
          <div>
            <Label>Icon</Label>
            <Input placeholder="e.g. fas fa-table" value={form.menu_icon||''} onChange={e => setForm(prev => ({ ...prev, menu_icon: e.target.value }))} />
            <div className="text-xs text-gray-500 mt-1">Use FontAwesome keys as stored in DB (e.g., "fas fa-comments"). See icon guide in docs.</div>
          </div>
          <div>
            <Label>Order</Label>
            <Input type="number" value={form.menu_order} onChange={e => setForm(prev => ({ ...prev, menu_order: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              id="show_dashboard"
              checked={!!form.menu_show_dashboard}
              onChange={e => setForm(prev => ({ ...prev, menu_show_dashboard: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <Label htmlFor="show_dashboard" className="cursor-pointer mb-0">
              Tampilkan di Dashboard
            </Label>
            <span className="text-xs text-gray-500">(muncul sebagai card di halaman dashboard)</span>
          </div>
          <div>
            <Label>Parent Menu (optional)</Label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.menu_parent_id ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setForm(prev => ({ ...prev, menu_parent_id: v === '' ? null : Number(v) }))
              }}
            >
              <option value="">None (root)</option>
              {menus
                .filter(m => m.menu_parent_id == null && (form.menu_id ? m.menu_id !== form.menu_id : true))
                .map(m => (
                  <option key={m.menu_id} value={m.menu_id}>{m.menu_name} (ID {m.menu_id})</option>
                ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">Choose a root menu as parent to create a submenu.</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={saveMenu} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <NotificationModal isOpen={notif.isOpen} onClose={() => setNotif(prev => ({ ...prev, isOpen: false }))} title={notif.title} message={notif.message} type={notif.type} />
    </div>
  )
}

function MenuTree({ menus, selectedMenu, onSelect, onEdit, onDelete }) {
  const roots = useMemo(() => (menus||[]).filter(m => m.menu_parent_id == null).sort((a,b)=> (a.menu_order??0) - (b.menu_order??0)), [menus])
  const childrenOf = useMemo(() => {
    const map = new Map()
    for (const m of menus||[]) {
      if (m.menu_parent_id != null) {
        if (!map.has(m.menu_parent_id)) map.set(m.menu_parent_id, [])
        map.get(m.menu_parent_id).push(m)
      }
    }
    for (const arr of map.values()) arr.sort((a,b)=> (a.menu_order??0) - (b.menu_order??0))
    return map
  }, [menus])

  const Row = ({ node, level }) => {
    const indentWidth = Math.max(0, level) * 12
    return (
      <div className={`px-2 py-2 rounded ${selectedMenu?.menu_id===node.menu_id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-gray-300 select-none" style={{ width: indentWidth }}>|</div>
            {level>0 && <div className="text-gray-400 select-none">└─</div>}
            <div className="font-medium truncate max-w-[50vw] sm:max-w-none">{node.menu_name}</div>
            <div className="text-[11px] sm:text-xs text-gray-500 truncate max-w-[40vw] sm:max-w-none">{node.menu_path || '-'}</div>
            {node.menu_show_dashboard && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">⊞ Dashboard</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Button variant="secondary" className="px-2 py-1 text-xs sm:text-sm" onClick={()=>onSelect?.(node)}>Select</Button>
            <Button variant="secondary" className="px-2 py-1 text-xs sm:text-sm" onClick={()=>onEdit?.(node)}>Edit</Button>
            <Button variant="destructive" className="px-2 py-1 text-xs sm:text-sm" onClick={()=>onDelete?.(node)}>Delete</Button>
          </div>
        </div>
      </div>
    )
  }

  const renderNode = (node, level=0) => {
    const kids = childrenOf.get(node.menu_id) || []
    return (
      <div key={node.menu_id} className="">
        <Row node={node} level={level} />
        {kids.length>0 && (
          <div className="ml-4 border-l border-gray-200">
            {kids.map(k => renderNode(k, level+1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {roots.map(r => renderNode(r, 0))}
      {roots.length===0 && <div className="text-sm text-gray-500">No root menus</div>}
    </div>
  )
}
