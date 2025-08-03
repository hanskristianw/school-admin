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
    menu_type: 'navigation',
    menu_description: '',
    is_active: true,
    is_visible: true,
    permissions: {} // Format: { role_id: { can_view: true, can_create: false, etc } }
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

  // Menu types
  const menuTypes = [
    { value: 'navigation', label: 'Navigation Menu', description: 'Standard navigation menu with routing' },
    { value: 'action', label: 'Action Menu', description: 'Menu for actions (no routing needed)' },
    { value: 'external', label: 'External Link', description: 'External website link' },
    { value: 'divider', label: 'Divider', description: 'Visual separator in menu' }
  ]

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
        .select('menu_id, menu_name, menu_url, menu_icon, menu_order, menu_parent_id, is_active')
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

      // Transform data dengan menggabungkan informasi permissions
      const transformedMenus = menusData.map(menu => {
        const menuPermissions = permissionsData.filter(p => p.menu_id === menu.menu_id);
        const permissions = menuPermissions.map(perm => {
          const role = rolesData.find(r => r.role_id === perm.role_id);
          return {
            role_id: perm.role_id,
            role: role
          };
        });

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
        .eq('is_active', true)
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
    
    // Prepare permissions object for non-admin roles
    const permissions = {}
    nonAdminRoles.forEach(role => {
      const rolePermission = menu.permissions?.find(p => p.role_id === role.role_id) || {}
      permissions[role.role_id] = {
        can_view: rolePermission.can_view || false,
        can_create: rolePermission.can_create || false,
        can_edit: rolePermission.can_edit || false,
        can_delete: rolePermission.can_delete || false
      }
    })

    setFormData({
      menu_name: menu.menu_name || '',
      menu_path: menu.menu_path || '',
      menu_icon: menu.menu_icon || '',
      menu_order: menu.menu_order || 1,
      menu_parent_id: menu.menu_parent_id || null,
      menu_type: menu.menu_type || 'navigation',
      menu_description: menu.menu_description || '',
      is_active: menu.is_active !== false,
      is_visible: menu.is_visible !== false,
      permissions: permissions
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation based on menu type
    if (formData.menu_type === 'navigation' && formData.menu_parent_id && !formData.menu_path) {
      alert('Path menu wajib diisi untuk submenu navigasi')
      return
    }

    if (formData.menu_type === 'divider') {
      formData.menu_path = null
      formData.menu_icon = null
    }

    try {
      // Prepare menu data for Supabase
      const menuData = {
        menu_name: formData.menu_name,
        menu_url: formData.menu_path,
        menu_icon: formData.menu_icon,
        menu_order: formData.menu_order,
        menu_parent_id: formData.menu_parent_id || null,
        is_active: formData.is_active
      };

      let result;

      if (editingMenu) {
        // Update existing menu
        result = await supabase
          .from('menus')
          .update(menuData)
          .eq('menu_id', editingMenu.menu_id);
      } else {
        // Create new menu
        result = await supabase
          .from('menus')
          .insert([menuData]);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

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
      menu_type: 'navigation',
      menu_description: '',
      is_active: true,
      is_visible: true,
      permissions: {}
    })
    setEditingMenu(null)
  }

  const handlePermissionChange = (roleId, permissionType, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [roleId]: {
          ...prev.permissions[roleId],
          [permissionType]: value
        }
      }
    }))
  }

  const toggleMenuStatus = async (menuId, field, currentValue) => {
    try {
      const { error } = await supabase
        .from('menus')
        .update({ [field]: !currentValue })
        .eq('menu_id', menuId);

      if (error) {
        throw new Error(error.message);
      }

      fetchMenus()
    } catch (error) {
      console.error('Error toggling menu status:', error)
    }
  }

  const getMenuTypeLabel = (type) => {
    const menuType = menuTypes.find(mt => mt.value === type)
    return menuType?.label || type
  }

  const getMenuTypeIcon = (type) => {
    switch(type) {
      case 'navigation': return faHome
      case 'action': return faEdit
      case 'external': return faChevronRight
      case 'divider': return faTimes
      default: return faHome
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
                Status
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
                      icon={getMenuTypeIcon(menu.menu_type)} 
                      className="text-gray-600 mr-2" 
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {menu.menu_name}
                      </div>
                      {menu.menu_description && (
                        <div className="text-sm text-gray-500">
                          {menu.menu_description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <span className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-2">
                      {getMenuTypeLabel(menu.menu_type)}
                    </span>
                    <br />
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
                      const hasAccess = permission?.can_view
                      
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

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => toggleMenuStatus(menu.menu_id, 'is_active', menu.is_active)}
                      className={`text-sm ${menu.is_active ? 'text-green-600' : 'text-red-600'}`}
                    >
                      <FontAwesomeIcon icon={menu.is_active ? faToggleOn : faToggleOff} className="mr-1" />
                      {menu.is_active ? 'Active' : 'Inactive'}
                    </button>
                    
                    <button
                      onClick={() => toggleMenuStatus(menu.menu_id, 'is_visible', menu.is_visible)}
                      className={`text-sm ${menu.is_visible ? 'text-blue-600' : 'text-gray-600'}`}
                    >
                      <FontAwesomeIcon icon={menu.is_visible ? faEye : faEyeSlash} className="mr-1" />
                      {menu.is_visible ? 'Visible' : 'Hidden'}
                    </button>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Type *
                  </label>
                  <select
                    value={formData.menu_type}
                    onChange={(e) => setFormData({...formData, menu_type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    {menuTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {menuTypes.find(t => t.value === formData.menu_type)?.description}
                  </p>
                </div>

                {/* Conditional Path Field */}
                {formData.menu_type !== 'divider' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Menu Path 
                      {formData.menu_type === 'navigation' && formData.menu_parent_id && ' *'}
                    </label>
                    <input
                      type="text"
                      value={formData.menu_path}
                      onChange={(e) => setFormData({...formData, menu_path: e.target.value})}
                      placeholder={formData.menu_type === 'external' ? 'https://...' : '/path/to/page'}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                )}

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

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.menu_description}
                  onChange={(e) => setFormData({...formData, menu_description: e.target.value})}
                  rows="2"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Brief description of this menu"
                />
              </div>

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
              {formData.menu_type !== 'divider' && (
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
              )}

              {/* Non-Admin Role Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Permissions for Non-Admin Roles
                </label>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-3">
                  <p className="text-sm text-yellow-800">
                    <FontAwesomeIcon icon={faShieldAlt} className="mr-1" />
                    Administrator automatically has full access to all menus. 
                    Configure permissions below for Teacher and Student roles only.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {nonAdminRoles.map(role => (
                    <div key={role.role_id} className="border rounded p-3">
                      <h4 className="font-medium text-gray-800 mb-2">
                        {role.role_name} Permissions
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['can_view', 'can_create', 'can_edit', 'can_delete'].map(permission => (
                          <label key={permission} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.permissions[role.role_id]?.[permission] || false}
                              onChange={(e) => handlePermissionChange(role.role_id, permission, e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm">
                              {permission.replace('can_', '').replace('_', ' ').toUpperCase()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Menu Active</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_visible}
                    onChange={(e) => setFormData({...formData, is_visible: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Visible in Sidebar</span>
                </label>
              </div>

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
