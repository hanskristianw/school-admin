// IMPROVED MENU MANAGEMENT INTERFACE
// Optimized for admin auto-access and better UX

'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faPlus, 
  faEdit, 
  faToggleOn,
  faToggleOff,
  faSave,
  faTimes,
  faLayerGroup,
  faHome,
  faChevronRight,
  faEye,
  faEyeSlash,
  faShieldAlt,
  faUsers,
  faUserGraduate,
  faChartBar,
  faCog
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '@/lib/supabase'

export default function ImprovedMenuManagement() {
  const [menus, setMenus] = useState([])
  const [roles, setRoles] = useState([])
  const [nonAdminRoles, setNonAdminRoles] = useState([]) // Only non-admin roles
  const [parentMenus, setParentMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)
  const [formData, setFormData] = useState({
    menu_name: '',
    menu_path: '',
    menu_icon: '',
    menu_order: 1,
    menu_parent_id: null,
  permissions: {} // Format: { role_id: true|false } -> access or not
  })

  // Enhanced icon options with categories
  const iconCategories = {
    'Navigation': [
      { value: 'home', label: 'Home', icon: faHome },
      { value: 'dashboard', label: 'Dashboard', icon: faLayerGroup },
      { value: 'database', label: 'Database', icon: faLayerGroup },
      { value: 'chart-bar', label: 'Reports', icon: faChartBar },
      { value: 'cog', label: 'Settings', icon: faCog },
    ],
    'User & Access': [
      { value: 'user', label: 'User', icon: faUsers },
      { value: 'user-graduate', label: 'Student', icon: faUserGraduate },
      { value: 'shield-alt', label: 'Security', icon: faShieldAlt },
      { value: 'users', label: 'Users', icon: faUsers },
    ],
    'Actions': [
      { value: 'plus', label: 'Add', icon: faPlus },
      { value: 'edit', label: 'Edit', icon: faEdit },
      { value: 'eye', label: 'View', icon: faEye },
      { value: 'file-alt', label: 'Document', icon: faEdit },
    ]
  }

  // No menu types in current schema; keep UI minimal

  useEffect(() => {
    fetchMenus()
    fetchRoles()
    fetchParentMenus()
  }, [])

  const fetchRoles = async () => {
    try {
      // Fetch all roles for general use
      const { data: allRoles, error: allRolesError } = await supabase
        .from('role')
        .select('role_id, role_name, is_admin')
        .order('role_name');

      if (allRolesError) {
        throw new Error(allRolesError.message);
      }

      setRoles(allRoles || []);
      
      // Filter non-admin roles for permission management
      const nonAdminData = allRoles?.filter(role => !role.is_admin) || [];
      setNonAdminRoles(nonAdminData);
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const fetchMenus = async () => {
    try {
      // Fetch menus terlebih dahulu
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
  .select('menu_id, menu_name, menu_path, menu_icon, menu_order, menu_parent_id')
        .order('menu_order');

      if (menusError) {
        throw new Error(menusError.message);
      }

      // Fetch menu permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('menu_permissions')
        .select('menu_id, role_id');

      if (permissionsError) {
        throw new Error(permissionsError.message);
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('role')
        .select('role_id, role_name, is_admin');

      if (rolesError) {
        throw new Error(rolesError.message);
      }

      // Transform data dengan menggabungkan informasi permissions (boolean access per role)
      const transformedMenus = menusData.map(menu => {
        const menuPermissions = permissionsData.filter(p => p.menu_id === menu.menu_id);
        const permissions = menuPermissions.map(perm => ({
          role_id: perm.role_id,
          role: rolesData.find(r => r.role_id === perm.role_id)
        }));

        return {
          ...menu,
          permissions: permissions
        };
      });

      setMenus(transformedMenus);
    } catch (error) {
      console.error('Error fetching menus:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchParentMenus = async () => {
    try {
      // Fetch parent menus (menus that can have children) from Supabase
      const { data, error } = await supabase
        .from('menus')
        .select('menu_id, menu_name')
        .is('menu_parent_id', null) // Only top-level menus can be parents
        .order('menu_name');

      if (error) {
        throw new Error(error.message);
      }

      setParentMenus(data || []);
    } catch (error) {
      console.error('Error fetching parent menus:', error)
    }
  }

  const handleEdit = (menu) => {
    setEditingMenu(menu)
    
    // Prepare permissions object for non-admin roles (boolean access)
    const permissions = {}
    nonAdminRoles.forEach(role => {
      const hasAccess = !!menu.permissions?.find(p => p.role_id === role.role_id)
      permissions[role.role_id] = hasAccess
    })

    setFormData({
      menu_name: menu.menu_name || '',
      menu_path: menu.menu_path || '',
      menu_icon: menu.menu_icon || '',
      menu_order: menu.menu_order || 1,
      menu_parent_id: menu.menu_parent_id || null,
      permissions: permissions
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Minimal validation: name required; path optional for top-level groups
    if (formData.menu_parent_id && !formData.menu_path) {
      alert('Path menu wajib diisi untuk submenu')
      return
    }

    try {
      // Prepare menu data for Supabase (schema: menu_name, menu_path, menu_icon, menu_order, menu_parent_id)
      const menuData = {
        menu_name: formData.menu_name,
        menu_path: formData.menu_path,
        menu_icon: formData.menu_icon,
        menu_order: formData.menu_order,
        menu_parent_id: formData.menu_parent_id || null
      };

      let result;
      let menuId;

      if (editingMenu) {
        // Update existing menu
        result = await supabase
          .from('menus')
          .update(menuData)
          .eq('menu_id', editingMenu.menu_id)
          .select('menu_id')
          .single();
        menuId = editingMenu.menu_id
      } else {
        // Create new menu
        result = await supabase
          .from('menus')
          .insert([menuData])
          .select('menu_id')
          .single();
        menuId = result.data?.menu_id
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Sync permissions for non-admin roles
      await syncMenuPermissions(menuId)

      fetchMenus()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving menu:', error)
      alert('Terjadi kesalahan saat menyimpan: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      menu_name: '',
      menu_path: '',
      menu_icon: '',
      menu_order: 1,
      menu_parent_id: null,
      permissions: {}
    })
    setEditingMenu(null)
  }

  const handlePermissionChange = (roleId, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [roleId]: value
      }
    }))
  }

  // For now, use a generic icon for list
  const getMenuTypeIcon = () => faHome

  // Sync menu_permissions with current formData.permissions
  const syncMenuPermissions = async (menuId) => {
    if (!menuId) return
    // Fetch current permissions for this menu
    const { data: existing, error: fetchErr } = await supabase
      .from('menu_permissions')
      .select('role_id')
      .eq('menu_id', menuId)

    if (fetchErr) throw new Error(fetchErr.message)

    const existingSet = new Set((existing || []).map(p => p.role_id))
    const desiredRoles = Object.entries(formData.permissions)
      .filter(([, has]) => !!has)
      .map(([roleId]) => parseInt(roleId, 10))
    const desiredSet = new Set(desiredRoles)

    // Roles to add: in desired but not existing
    const toAdd = desiredRoles.filter(r => !existingSet.has(r))
    if (toAdd.length) {
      const rows = toAdd.map(role_id => ({ menu_id: menuId, role_id }))
      const { error: addErr } = await supabase.from('menu_permissions').insert(rows)
      if (addErr) throw new Error(addErr.message)
    }

    // Roles to remove: in existing but not desired
    const toRemove = [...existingSet].filter(r => !desiredSet.has(r))
    if (toRemove.length) {
      const { error: delErr } = await supabase
        .from('menu_permissions')
        .delete()
        .eq('menu_id', menuId)
        .in('role_id', toRemove)
      if (delErr) throw new Error(delErr.message)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      {/* Header with better info */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Menu Management</h1>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <FontAwesomeIcon icon={faShieldAlt} className="text-blue-400 mr-2 mt-1" />
            <div>
              <p className="text-sm text-blue-700">
                <strong>Administrator:</strong> Memiliki akses otomatis ke semua menu. 
                Pengaturan ini hanya untuk mengatur akses Teacher dan Student.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faPlus} />
          Tambah Menu
        </button>
      </div>

      {/* Enhanced Menu Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Menu Structure
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type & Path
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Non-Admin Access
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {menus.map((menu) => (
              <tr key={menu.menu_id} className={menu.menu_parent_id ? "bg-gray-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {menu.menu_parent_id && (
                      <FontAwesomeIcon icon={faChevronRight} className="text-gray-400 mr-2" />
                    )}
                    <FontAwesomeIcon 
                      icon={getMenuTypeIcon()} 
                      className="text-gray-600 mr-2" 
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {menu.menu_name}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <span className="text-gray-600">
                      {menu.menu_path || '-'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {menu.menu_order}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    {nonAdminRoles.map(role => {
                      const permission = menu.permissions?.find(p => p.role_id === role.role_id)
                      const hasAccess = !!permission
                      
                      return (
                        <div key={role.role_id} className="flex items-center mb-1">
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                            hasAccess ? 'bg-green-400' : 'bg-gray-300'
                          }`}></span>
                          <span className="text-xs">
                            {role.role_name}: {hasAccess ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(menu)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingMenu ? 'Edit Menu' : 'Add New Menu'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Name *
                  </label>
                  <input
                    type="text"
                    value={formData.menu_name}
                    onChange={(e) => setFormData({...formData, menu_name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>

                {/* Path Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Path {formData.menu_parent_id ? ' *' : ''}
                  </label>
                  <input
                    type="text"
                    value={formData.menu_path}
                    onChange={(e) => setFormData({...formData, menu_path: e.target.value})}
                    placeholder={'/path/to/page'}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.menu_order}
                    onChange={(e) => setFormData({...formData, menu_order: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Description removed - not in schema */}

              {/* Parent Menu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Menu
                </label>
                <select
                  value={formData.menu_parent_id || ''}
                  onChange={(e) => setFormData({...formData, menu_parent_id: e.target.value || null})}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">Main Menu (No Parent)</option>
                  {parentMenus.map(parent => (
                    <option key={parent.menu_id} value={parent.menu_id}>
                      {parent.menu_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border p-2 rounded">
                  {Object.entries(iconCategories).map(([category, icons]) => (
                    <div key={category} className="col-span-4">
                      <div className="text-xs font-medium text-gray-600 mb-1">{category}</div>
                      <div className="grid grid-cols-4 gap-1">
                        {icons.map(icon => (
                          <button
                            key={icon.value}
                            type="button"
                            onClick={() => setFormData({...formData, menu_icon: icon.value})}
                            className={`p-2 border rounded text-center ${
                              formData.menu_icon === icon.value 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-300'
                            }`}
                          >
                            <FontAwesomeIcon icon={icon.icon} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Non-Admin Role Permissions (boolean access) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Permissions for Non-Admin Roles
                </label>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-3">
                  <p className="text-sm text-yellow-800">
                    <FontAwesomeIcon icon={faShieldAlt} className="mr-1" />
                    Administrator automatically has full access to all menus. 
                    Configure access below for Teacher and Student roles only.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {nonAdminRoles.map(role => (
                    <div key={role.role_id} className="border rounded p-3">
                      <h4 className="font-medium text-gray-800 mb-2">
                        {role.role_name} Permissions
                      </h4>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!!formData.permissions[role.role_id]}
                          onChange={(e) => handlePermissionChange(role.role_id, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Can Access</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              {/* Status toggles removed - not in schema */}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  {editingMenu ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
