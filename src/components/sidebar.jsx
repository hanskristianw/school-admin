'use client'

import { useEffect, useState, memo } from "react"
import { useI18n } from '@/lib/i18n'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faGaugeHigh, 
  faUser, 
  faUserPlus,
  faUsers,
  faDatabase,
  faTable,
  faCogs,
  faKey,
  faBars, 
  faXmark,
  faChevronDown,
  faChevronRight,
  faTachometerAlt,
  faEye,
  faGraduationCap,
  faBook,
  faSchool,
  faChalkboardTeacher,
  faUserGraduate,
  faHouse,
  faClipboardCheck,
  faPaperPlane,
  faCalendarAlt,
  faEdit,
  faTrash,
  faComments,
  faBuilding,
  faCalendarDays,
  faSitemap
} from "@fortawesome/free-solid-svg-icons"
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons"
import { faQrcode } from "@fortawesome/free-solid-svg-icons"

// Object untuk mapping nama icon ke component FontAwesome
const iconMap = {
  // Format FontAwesome lengkap (dari database lama)
  'fas fa-tachometer-alt': faTachometerAlt,
  'fas fa-database': faDatabase,
  'fas fa-user': faUser,
  'fas fa-eye': faEye,
  'fas fa-users': faUsers,
  'fas fa-graduation-cap': faGraduationCap,
  'fas fa-book': faBook,
  'fas fa-house': faHouse,
  'fas fa-chalkboard-teacher': faChalkboardTeacher,
  'fas fa-clipboard-check': faClipboardCheck,
  'fas fa-paper-plane': faPaperPlane,
  'fas fa-calendar-alt': faCalendarAlt,
  'fas fa-edit': faEdit,
  'fas fa-trash': faTrash
  , 'fas fa-qrcode': faQrcode
  , 'fas fa-comments': faComments
  , 'fas fa-door-open': faDoorOpen
  , 'fas fa-key': faKey
  , 'fas fa-sitemap': faSitemap
  , 'fas fa-building': faBuilding
  , 'fas fa-calendar-days': faCalendarDays
}

const Sidebar = memo(({ isOpen, setIsOpen }) => {
  const [menus, setMenus] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState({})
  const pathname = usePathname()
  const { translateMenu, t } = useI18n()

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get user data from localStorage
  const userData = localStorage.getItem("user_data")
        let role = localStorage.getItem("user_role")
        let isAdmin = false
  let isCounselor = false
        
        if (userData) {
          try {
            const user = JSON.parse(userData)
            role = user.roleName
            isAdmin = user.isAdmin
            isCounselor = !!user.isCounselor
            console.log("👤 User data from localStorage:", { role, isAdmin, isCounselor, user })
          } catch (e) {
            console.warn("⚠️ Failed to parse user data:", e)
          }
        }
        
        // Fallback: jika role tidak ada atau role adalah 'admin', set as admin
        if (!role) {
          console.log("🔧 No role found, setting default admin role for testing")
          role = "admin"
          isAdmin = true
        }
        
        // Override: jika role name adalah 'admin', force isAdmin = true
        if (role === "admin" || role === "Admin") {
          isAdmin = true
        }
        
        console.log("🔍 Final values - role:", role, "isAdmin:", isAdmin)
        console.log("🌐 Connecting to Supabase...")

        // Menggunakan Supabase langsung tanpa Go API
        const { customAuth } = await import('@/lib/supabase')
        const result = await customAuth.getMenusByRole(role, isAdmin)

        console.log("📥 Menu result:", result)

        if (result.success && result.menus && Array.isArray(result.menus)) {
          // Transform data from Supabase
          let transformedData = result.menus.map(item => ({
            id: item.menu_id,
            name: item.menu_name,
            path: item.menu_path || '#',        
            icon: item.menu_icon || '',         
            parentId: item.menu_parent_id,      
            order: item.menu_order || 0
          }))

          // Hide Consultation menu for non-counselor users (admins always see all)
          if (!isAdmin && !isCounselor) {
            transformedData = transformedData.filter(m => {
              const p = (m.path || '').trim()
              return !(p === '/data/consultation' || p.startsWith('/data/consultation/'))
            })
          }

          console.log("🔄 Transformed Supabase data:", transformedData)
          console.log("📊 Total menus from Supabase:", transformedData.length)
          
          // Debug: Log semua icon names dari database
          transformedData.forEach(menu => {
            console.log(`🎯 Menu "${menu.name}" has icon: "${menu.icon}"`)
          })
          
          setMenus(transformedData)
          setError(null)
          console.log("✅ Successfully loaded menus from Supabase!")
          
          if (transformedData.length === 0) {
            console.warn("⚠️ No menus found for role:", role)
            setError(`No menus configured for role: ${role}. Please check database setup.`)
          }
        } else {
          throw new Error(`Failed to fetch menus: ${result.message || 'Unknown error'}`)
        }
        
      } catch (error) {
        console.error("❌ Failed to load menus from Supabase:", error)
        setError(`Database error: ${error.message}`)
        setMenus([])
        
        // Debug info for development
        if (process.env.NODE_ENV === 'development') {
          console.log("🔧 Debug info:")
          console.log("- Error:", error.message)
          console.log("- Check /debug/supabase for detailed testing")
          console.log("- Verify environment variables")
          console.log("- Check Supabase dashboard for RLS policies")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchMenus()
  }, [])

  const organizeMenus = (items) => {
    if (!Array.isArray(items)) return []

    // Helper: coerce order to a safe number
    const num = (v) => {
      const n = typeof v === 'number' ? v : parseInt(v ?? 0, 10)
      return Number.isFinite(n) ? n : 0
    }

    // Root menus are those with menu_parent_id NULL/undefined per documentation
    const rootMenus = items.filter(item => item.parentId == null)

    const findChildren = (parentId) => {
      return items
        .filter(item => item.parentId === parentId)
        .sort((a, b) => num(a.order) - num(b.order))
    }

    return rootMenus
      .sort((a, b) => num(a.order) - num(b.order))
      .map(menu => ({
        ...menu,
        children: findChildren(menu.id)
      }))
  }

  const organizedMenus = organizeMenus(menus)

  // Toggle expanded menu
  const toggleExpanded = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  // Fungsi helper untuk render icon - langsung gunakan nama dari database
  const renderIcon = (iconName) => {
    if (!iconName) {
      console.warn('⚠️ No icon name provided')
      return <FontAwesomeIcon icon={faTable} className="w-4 h-4" /> // Default icon
    }
    
    // Langsung gunakan nama icon dari database sebagai key untuk mapping
    const icon = iconMap[iconName]
    if (!icon) {
      console.warn(`⚠️ Icon not found in iconMap: "${iconName}"`)
      console.log('📋 Available icons in iconMap:', Object.keys(iconMap))
      console.log('🔍 Icon name from database:', iconName)
      return <FontAwesomeIcon icon={faTable} className="w-4 h-4" /> // Default icon
    }
    
    return <FontAwesomeIcon icon={icon} className="w-4 h-4" />
  }

  const LoadingSkeleton = () => (
    <div className="animate-pulse p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 mb-4">
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  )

  const SidebarContent = () => {
    if (isLoading) return <LoadingSkeleton />
    
    if (error) {
      return (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h3 className="text-red-800 font-medium mb-2">Database Connection Error</h3>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )
    }

    if (menus.length === 0) {
      return (
        <div className="p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <h3 className="text-yellow-800 font-medium mb-2">No Menus Available</h3>
            <p className="text-yellow-600 text-sm">No menu items found for your role in the database.</p>
          </div>
        </div>
      )
    }

    return (
      <nav className="flex-1 px-4 pb-4 overflow-y-auto">
        {organizedMenus.map((menu) => (
          <div key={menu.id} className="mb-1">
            {menu.children && menu.children.length > 0 ? (
              // Parent menu with children - clickable to expand
              <>
                <button
                  onClick={() => toggleExpanded(menu.id)}
                  className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <div className="flex items-center">
                    {menu.icon && (
                      <span className="mr-3 inline-flex items-center justify-center w-4 h-4">
                        {renderIcon(menu.icon)}
                      </span>
                    )}
                    <span>{menu.name}</span>
                  </div>
                  <FontAwesomeIcon 
                    icon={expandedMenus[menu.id] ? faChevronDown : faChevronRight} 
                    className="w-3 h-3 transition-transform"
                  />
                </button>
                
                {/* Child menus */}
                {expandedMenus[menu.id] && (
                  <div className="ml-6 mt-1 space-y-1">
                    {menu.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.path}
                        onClick={() => setIsOpen && setIsOpen(false)} // Close mobile menu when clicking
                        className={`flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md ${
                          pathname === child.path ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        {child.icon && (
                          <span className="mr-3 inline-flex items-center justify-center w-4 h-4">
                            {renderIcon(child.icon)}
                          </span>
                        )}
                        <span>{child.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Regular menu item without children
              <Link 
                href={menu.path}
                onClick={() => setIsOpen && setIsOpen(false)} // Close mobile menu when clicking
                className={`flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md ${
                  pathname === menu.path ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                {menu.icon && (
                  <span className="mr-3 inline-flex items-center justify-center w-4 h-4">
                    {renderIcon(menu.icon)}
                  </span>
                )}
                <span>{menu.name}</span>
              </Link>
            )}
          </div>
        ))}

        {/* Logout button */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              localStorage.clear()
              // Clear auth cookies for middleware
              const past = 'Thu, 01 Jan 1970 00:00:00 GMT'
              document.cookie = `kr_id=; Path=/; Expires=${past}; SameSite=Lax`
              document.cookie = `role_name=; Path=/; Expires=${past}; SameSite=Lax`
              document.cookie = `is_admin=; Path=/; Expires=${past}; SameSite=Lax`
              document.cookie = `allowed_paths=; Path=/; Expires=${past}; SameSite=Lax`
              window.location.href = "/login"
            }}
            className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
          >
            <span className="mr-3 inline-flex items-center justify-center w-4 h-4">
              <FontAwesomeIcon icon={faUser} />
            </span>
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </nav>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white hover:bg-gray-100 shadow-md"
        aria-label="Toggle menu"
      >
        <FontAwesomeIcon icon={isOpen ? faXmark : faBars} className="w-6 h-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-white shadow-lg flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:h-full
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-800">School System</h1>
        </div>
        
        {/* Content */}
        <SidebarContent />
      </aside>
    </>
  )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
