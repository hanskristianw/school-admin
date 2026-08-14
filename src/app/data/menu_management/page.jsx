"use client";

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faPlus, faEdit, faTrash, faSearch, faCheck, faShieldAlt, 
  faFolder, faFileAlt, faTable, faExternalLinkAlt, faThLarge, faSlidersH,
  faLayerGroup, faCheckCircle
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'

export default function MenuManagementPage() {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [menus, setMenus] = useState([])
  const [roles, setRoles] = useState([])
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [permByRole, setPermByRole] = useState(new Map())
  const [search, setSearch] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({ 
    menu_id: null, 
    menu_name: '', 
    menu_path: '', 
    menu_icon: '', 
    menu_order: 0, 
    menu_parent_id: null, 
    menu_show_dashboard: false 
  })
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

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
        if (menusData && menusData.length > 0) {
          setSelectedMenu(menusData[0])
        }
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
    setForm({ 
      menu_id: null, 
      menu_name: '', 
      menu_path: '', 
      menu_icon: '', 
      menu_order: (menus.length + 1) * 10, 
      menu_parent_id: selectedMenu?.menu_id || null,
      menu_show_dashboard: false
    })
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
      setNotif({ isOpen: true, title: 'Validation', message: 'Menu name is required.', type: 'warning' })
      return
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
      const { data: menusData, error: menusErr } = await supabase.from('menus').select('*').order('menu_order')
      if (menusErr) throw new Error(menusErr.message)
      setMenus(menusData || [])
      setShowEdit(false)
      setNotif({ isOpen: true, title: 'Saved', message: 'Menu structure successfully updated.', type: 'success' })
    } catch (e) {
      setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const deleteMenu = async (menu) => {
    if (!isAdmin) return
    if (!confirm(`Permanently delete route "${menu.menu_name}"?`)) return
    try {
      const { error } = await supabase.from('menus').delete().eq('menu_id', menu.menu_id)
      if (error) throw new Error(error.message)
      const { data: menusData, error: menusErr } = await supabase.from('menus').select('*').order('menu_order')
      if (menusErr) throw new Error(menusErr.message)
      setMenus(menusData || [])
      if (selectedMenu?.menu_id === menu.menu_id) setSelectedMenu(menusData?.[0] || null)
      setNotif({ isOpen: true, title: 'Deleted', message: 'Menu route removed.', type: 'success' })
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

  const grantAllRoles = async () => {
    if (!isAdmin || !selectedMenu) return
    try {
      const missingRoles = roles.filter(r => !permByRole.get(r.role_id))
      if (missingRoles.length === 0) return
      const payloads = missingRoles.map(r => ({ menu_id: selectedMenu.menu_id, role_id: r.role_id }))
      const { error } = await supabase.from('menu_permissions').insert(payloads)
      if (error) throw new Error(error.message)
      const next = new Map(permByRole)
      roles.forEach(r => next.set(r.role_id, true))
      setPermByRole(next)
      setNotif({ isOpen: true, title: 'Permissions Granted', message: `All roles granted access to ${selectedMenu.menu_name}.`, type: 'success' })
    } catch (e) {
      setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
    }
  }

  const revokeAllRoles = async () => {
    if (!isAdmin || !selectedMenu) return
    try {
      const { error } = await supabase.from('menu_permissions').delete().eq('menu_id', selectedMenu.menu_id)
      if (error) throw new Error(error.message)
      setPermByRole(new Map())
      setNotif({ isOpen: true, title: 'Permissions Revoked', message: `Explicit permissions removed for ${selectedMenu.menu_name}.`, type: 'success' })
    } catch (e) {
      setNotif({ isOpen: true, title: 'Error', message: e.message, type: 'error' })
    }
  }

  // Tree filtering
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
    const matches = (m) => ((m.menu_name||'').toLowerCase().includes(q) || (m.menu_path||'').toLowerCase().includes(q) || (m.menu_icon||'').toLowerCase().includes(q))
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
    for (const m of menus||[]) if (m.menu_parent_id == null) dfs(m.menu_id)
    return (menus||[]).filter(m => visible.has(m.menu_id))
  }, [menus, search])

  const stats = useMemo(() => {
    const total = menus.length
    const roots = menus.filter(m => m.menu_parent_id == null).length
    const sub = total - roots
    const dash = menus.filter(m => m.menu_show_dashboard).length
    return { total, roots, sub, dash }
  }, [menus])

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 border rounded-lg" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <p className="text-xs font-mono font-bold uppercase text-red-600 mb-1">Access Restricted</p>
          <p className="text-sm" style={{ color: theme.textSecondary }}>Administrative credentials are required to modify workspace navigation and access controls.</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="py-6 px-4 sm:px-8 max-w-7xl mx-auto space-y-6"
      style={{ 
        fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif",
        color: theme.textBody 
      }}
    >
      {/* Editorial Document Header */}
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: theme.textSecondary }}>
            <span>WORKSPACE</span>
            <span>/</span>
            <span>ADMINISTRATION</span>
            <span>/</span>
            <span style={{ color: theme.textPrimary }}>NAVIGATION</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            Menu & Access Architecture
          </h1>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
            Configure routes, parent-child nesting, dashboard cards, and role-based permissions matrix.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={openNew}
            className="px-4 py-2 text-xs font-semibold rounded transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            style={{ 
              background: theme.textPrimary, 
              color: isDark ? '#111111' : '#FFFFFF',
              borderRadius: '6px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
            <span>Create Route</span>
          </button>
        </div>
      </div>

      {/* Stats & Search Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Search Field */}
        <div className="md:col-span-6 relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Filter by name, path (/data/...), or icon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-xs rounded border outline-none font-mono transition-colors"
            style={{
              background: theme.inputBg,
              borderColor: theme.border,
              color: theme.textPrimary,
              borderRadius: '6px'
            }}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Stat Badges */}
        <div className="md:col-span-6 flex items-center justify-start md:justify-end gap-2 flex-wrap font-mono text-[11px]">
          <div className="px-2.5 py-1 rounded border" style={{ borderColor: theme.border, background: theme.cardBg }}>
            <span style={{ color: theme.textSecondary }}>TOTAL: </span>
            <span className="font-bold" style={{ color: theme.textPrimary }}>{stats.total}</span>
          </div>
          <div className="px-2.5 py-1 rounded border" style={{ borderColor: theme.border, background: theme.cardBg }}>
            <span style={{ color: theme.textSecondary }}>ROOTS: </span>
            <span className="font-bold" style={{ color: theme.textPrimary }}>{stats.roots}</span>
          </div>
          <div className="px-2.5 py-1 rounded border" style={{ borderColor: theme.border, background: theme.cardBg }}>
            <span style={{ color: theme.textSecondary }}>SUBMENUS: </span>
            <span className="font-bold" style={{ color: theme.textPrimary }}>{stats.sub}</span>
          </div>
          <div className="px-2.5 py-1 rounded border" style={{ borderColor: theme.border, background: theme.cardBg }}>
            <span style={{ color: theme.textSecondary }}>DASHBOARD: </span>
            <span className="font-bold" style={{ color: theme.blueText }}>{stats.dash}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Menu Tree (Span 7) */}
        <div 
          className="lg:col-span-7 rounded-lg border overflow-hidden"
          style={{ 
            background: theme.cardBg, 
            borderColor: theme.border,
            borderRadius: '8px'
          }}
        >
          {/* Bento Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: theme.textPrimary }}>
                01. Navigation Hierarchy Tree
              </h2>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              SELECT TO MANAGE PERMISSIONS
            </span>
          </div>

          {/* Tree Content */}
          <div className="p-3">
            {loading ? (
              <div className="p-8 text-center font-mono text-xs text-gray-400">
                LOADING MENU HIERARCHY...
              </div>
            ) : (
              <MenuTree
                menus={menusTreeFiltered}
                selectedMenu={selectedMenu}
                onSelect={(m) => setSelectedMenu(m)}
                onEdit={openEdit}
                onDelete={deleteMenu}
                theme={theme}
                isDark={isDark}
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Permission Matrix (Span 5) */}
        <div 
          className="lg:col-span-5 rounded-lg border overflow-hidden space-y-4"
          style={{ 
            background: theme.cardBg, 
            borderColor: theme.border,
            borderRadius: '8px'
          }}
        >
          {/* Bento Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: theme.textPrimary }}>
                02. Role-Based Permissions
              </h2>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              LIVE SYNC
            </span>
          </div>

          <div className="p-4 pt-0 space-y-4">
            {!selectedMenu ? (
              <div className="p-8 text-center border rounded font-mono text-xs" style={{ borderColor: theme.border, background: theme.subtleBg, color: theme.textSecondary }}>
                Select a menu item on the left to configure role access.
              </div>
            ) : (
              <>
                {/* Selected Menu Metadata Strip */}
                <div className="p-3.5 rounded border flex flex-col gap-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-gray-400">TARGET ROUTE</span>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: theme.textPrimary }}>ID #{selectedMenu.menu_id}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded border flex items-center justify-center text-xs" style={{ borderColor: theme.border, background: theme.cardBg }}>
                      <FontAwesomeIcon icon={faFolder} className="text-gray-400 text-[10px]" />
                    </span>
                    <span className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>
                      {selectedMenu.menu_name}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono truncate" style={{ color: theme.textSecondary }}>
                    Path: {selectedMenu.menu_path || <span className="italic">N/A (Group Header)</span>}
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono font-semibold uppercase" style={{ color: theme.textPrimary }}>
                    Authorized Roles ({permByRole.size}/{roles.length})
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <button
                      onClick={grantAllRoles}
                      className="px-2 py-0.5 border rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      style={{ borderColor: theme.border, color: theme.textPrimary }}
                    >
                      Grant All
                    </button>
                    <button
                      onClick={revokeAllRoles}
                      className="px-2 py-0.5 border rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      style={{ borderColor: theme.border, color: theme.redText }}
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                {/* Role Toggles Grid */}
                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {roles.map(r => {
                    const isGranted = !!permByRole.get(r.role_id)
                    return (
                      <label 
                        key={r.role_id} 
                        className="flex items-center justify-between p-2.5 rounded border transition-all cursor-pointer select-none"
                        style={{
                          background: isGranted ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
                          borderColor: isGranted ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(31,108,159,0.2)') : theme.border,
                          borderRadius: '6px'
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isGranted}
                            onChange={(e) => toggleRolePermission(r.role_id, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                          />
                          <span className="text-xs font-semibold truncate" style={{ color: isGranted ? theme.textPrimary : theme.textBody }}>
                            {r.role_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {r.is_admin ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold" style={{ background: theme.yellowBg, color: theme.yellowText, borderColor: theme.border }}>
                              ADMIN
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                              STAFF
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>

                {/* Security Footnote */}
                <div className="p-3 border rounded text-[11px] leading-relaxed" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                  <span className="font-bold text-[10px] font-mono uppercase block mb-0.5" style={{ color: theme.textPrimary }}>Security Note</span>
                  Users with role <code className="font-mono text-[10px] px-1 py-0.5 border rounded">is_admin: true</code> possess superuser clearance and automatically bypass permission checks.
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Minimalist Edit / Create Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={form.menu_id ? `Edit Route: #${form.menu_id}` : 'Create New Route'}>
        <div className="space-y-4 py-1" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
          
          {/* Menu Name */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
              Menu Label *
            </label>
            <input 
              value={form.menu_name} 
              onChange={e => setForm(prev => ({ ...prev, menu_name: e.target.value }))} 
              placeholder="e.g. PYP Curriculum, Student Roster"
              className="w-full p-2 text-xs font-medium rounded border outline-none"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }} 
            />
          </div>

          {/* Menu Path */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
              Endpoint Path
            </label>
            <input 
              placeholder="e.g. /data/pyp, /data/class" 
              value={form.menu_path || ''} 
              onChange={e => setForm(prev => ({ ...prev, menu_path: e.target.value }))} 
              className="w-full p-2 text-xs font-mono rounded border outline-none"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }} 
            />
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Leave empty if this item acts solely as a collapsible parent group.</span>
          </div>

          {/* Icon & Order Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
                FontAwesome Icon Key
              </label>
              <input 
                placeholder="e.g. fas fa-graduation-cap" 
                value={form.menu_icon || ''} 
                onChange={e => setForm(prev => ({ ...prev, menu_icon: e.target.value }))} 
                className="w-full p-2 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }} 
              />
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
                Display Sort Order
              </label>
              <input 
                type="number" 
                value={form.menu_order} 
                onChange={e => setForm(prev => ({ ...prev, menu_order: e.target.value }))} 
                className="w-full p-2 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }} 
              />
            </div>
          </div>

          {/* Parent Nesting Selector */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
              Parent Navigation Group
            </label>
            <select
              className="w-full p-2 text-xs rounded border outline-none font-mono"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              value={form.menu_parent_id ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setForm(prev => ({ ...prev, menu_parent_id: v === '' ? null : Number(v) }))
              }}
            >
              <option value="">None (Top-Level Root Menu)</option>
              {menus
                .filter(m => m.menu_parent_id == null && (form.menu_id ? m.menu_id !== form.menu_id : true))
                .map(m => (
                  <option key={m.menu_id} value={m.menu_id}>[ROOT #{m.menu_id}] {m.menu_name}</option>
                ))}
            </select>
          </div>

          {/* Show on Dashboard Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded border cursor-pointer select-none" style={{ borderColor: theme.border, background: theme.subtleBg }}>
            <input
              type="checkbox"
              id="show_dashboard"
              checked={!!form.menu_show_dashboard}
              onChange={e => setForm(prev => ({ ...prev, menu_show_dashboard: e.target.checked }))}
              className="w-4 h-4 rounded cursor-pointer accent-zinc-900 dark:accent-zinc-100"
            />
            <div>
              <span className="text-xs font-semibold block" style={{ color: theme.textPrimary }}>
                Pin Card to Dashboard Overview
              </span>
              <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>
                Renders a quick-access shortcut card on the user landing dashboard.
              </span>
            </div>
          </label>

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <button 
              type="button" 
              onClick={() => setShowEdit(false)} 
              className="px-4 py-2 text-xs font-medium rounded border transition-colors cursor-pointer"
              style={{ borderColor: theme.border, background: theme.subtleBg, color: theme.textPrimary, borderRadius: '4px' }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={saveMenu} 
              disabled={saving} 
              className="px-5 py-2 text-xs font-semibold rounded transition-all active:scale-[0.98] cursor-pointer"
              style={{ background: theme.textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderRadius: '4px' }}
            >
              {saving ? 'Persisting...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </Modal>

      <NotificationModal 
        isOpen={notif.isOpen} 
        onClose={() => setNotif(prev => ({ ...prev, isOpen: false }))} 
        title={notif.title} 
        message={notif.message} 
        type={notif.type} 
      />
    </div>
  )
}

function MenuTree({ menus, selectedMenu, onSelect, onEdit, onDelete, theme, isDark }) {
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
    const isSelected = selectedMenu?.menu_id === node.menu_id
    const hasKids = (childrenOf.get(node.menu_id) || []).length > 0

    return (
      <div
        className="px-3 py-2 rounded transition-all select-none border mb-1"
        style={{ 
          background: isSelected ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
          borderColor: isSelected ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(31,108,159,0.25)') : 'transparent',
          borderRadius: '6px'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Left info */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Level indentation indicators */}
            {level > 0 && (
              <span className="font-mono text-gray-400 text-xs select-none">
                └──
              </span>
            )}

            {/* Monospace Order Tag */}
            <span className="font-mono text-[10px] text-gray-400 w-6 text-right">
              #{node.menu_order}
            </span>

            {/* Menu Name & Path */}
            <div 
              onClick={() => onSelect?.(node)} 
              className="cursor-pointer min-w-0"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold truncate" style={{ color: isSelected ? (isDark ? '#FFFFFF' : theme.blueText) : theme.textPrimary }}>
                  {node.menu_name}
                </span>

                {node.menu_show_dashboard && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border font-medium" style={{ background: theme.blueBg, color: theme.blueText, borderColor: theme.border }}>
                    DASHBOARD
                  </span>
                )}

                {hasKids && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                    {(childrenOf.get(node.menu_id) || []).length} SUBS
                  </span>
                )}
              </div>

              <span className="text-[10px] font-mono block truncate mt-0.5" style={{ color: theme.textSecondary }}>
                {node.menu_path || <span className="italic opacity-60">no endpoint path</span>}
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0 font-mono text-[11px]">
            <button
              onClick={() => onSelect?.(node)}
              className="px-2 py-1 rounded border transition-colors cursor-pointer"
              style={{ 
                borderColor: theme.border, 
                background: isSelected ? theme.textPrimary : theme.cardBg, 
                color: isSelected ? (isDark ? '#111111' : '#FFFFFF') : theme.textPrimary,
                borderRadius: '4px'
              }}
            >
              Select
            </button>
            <button
              onClick={() => onEdit?.(node)}
              className="px-2 py-1 rounded border transition-colors cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
              style={{ borderColor: theme.border, background: theme.cardBg, color: theme.textPrimary, borderRadius: '4px' }}
              title="Edit Route"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete?.(node)}
              className="px-2 py-1 rounded border transition-colors cursor-pointer hover:bg-red-50 dark:hover:bg-red-950"
              style={{ borderColor: theme.border, background: theme.cardBg, color: theme.redText, borderRadius: '4px' }}
              title="Delete Route"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderNode = (node, level=0) => {
    const kids = childrenOf.get(node.menu_id) || []
    return (
      <div key={node.menu_id} className="relative">
        <Row node={node} level={level} />
        {kids.length > 0 && (
          <div className="ml-5 pl-2 border-l space-y-0.5 my-1" style={{ borderColor: theme.border }}>
            {kids.map(k => renderNode(k, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {roots.map(r => renderNode(r, 0))}
      {roots.length === 0 && (
        <div className="p-8 text-center font-mono text-xs" style={{ color: theme.textSecondary }}>
          NO MENU ROUTES DEFINED
        </div>
      )}
    </div>
  )
}
