'use client'

import { useEffect, useState, memo } from "react"
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
  faChevronRight
} from "@fortawesome/free-solid-svg-icons"

// Object untuk mapping nama icon ke component FontAwesome
const iconMap = {
  'layout-dashboard': faGaugeHigh,
  'user': faUser,
  'user-plus': faUserPlus,
  'users': faUsers,
  'database': faDatabase,
  'table': faTable,
  'cogs': faCogs,
  'key': faKey,
}

// Mock data untuk fallback jika API gagal
const mockMenuData = [
  { id: 1, name: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard', parentId: null, order: 1 },
  { id: 2, name: 'Data Management', path: '#', icon: 'database', parentId: null, order: 2 },
  { id: 3, name: 'User Access', path: '/data/akses', icon: 'user', parentId: 2, order: 1 },
  { id: 4, name: 'View Data', path: '/data/lihat', icon: 'table', parentId: 2, order: 2 },
]

const Sidebar = memo(({ isOpen, setIsOpen }) => {
  const [menus, setMenus] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState({})
  const pathname = usePathname()

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Ensure we have a role - set default for testing
        let role = localStorage.getItem("user_role")
        if (!role) {
          console.log("🔧 No role found, setting default admin role for testing")
          localStorage.setItem("user_role", "admin")
          role = "admin"
        }
        
        console.log("🔍 Fetching menus for role:", role)
        console.log("🌐 Connecting to Neon database...")

        // WAJIB menggunakan data dari database - NO FALLBACK TO MOCK
        const res = await fetch(`http://localhost:8080/menu/${role}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          // Add timeout
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        console.log("📡 Response status:", res.status)

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Server returned ${res.status}: ${errorText}`)
        }

        const data = await res.json()
        console.log("✅ Raw API Response:", data)

        if (data.status === 'success' && data.menus && Array.isArray(data.menus)) {
          // Transform data from database - handle nullable values properly
          const transformedData = data.menus.map(item => ({
            id: item.menu_id,
            name: item.menu_name,
            path: item.menu_path || '#',        // Handle null path
            icon: item.menu_icon || '',         // Handle null icon  
            parentId: item.menu_parent_id,      // Can be null
            order: item.menu_order || 0
          }))

          console.log("🔄 Transformed database data:", transformedData)
          console.log("📊 Total menus from database:", transformedData.length)
          
          if (transformedData.length === 0) {
            throw new Error("No menus found in database for role: " + role)
          }

          setMenus(transformedData) // Use REAL database data ONLY!
          setError(null)
          console.log("✅ Successfully loaded menus from Neon database!")
        } else {
          throw new Error(`Invalid response format: ${JSON.stringify(data)}`)
        }
        
      } catch (error) {
        console.error("❌ CRITICAL ERROR - Failed to load menus from database:", error)
        setError(`Failed to connect to database: ${error.message}`)
        setMenus([]) // NO MOCK DATA - show error instead
      } finally {
        setIsLoading(false)
      }
    }

    fetchMenus()
  }, [])

  const organizeMenus = (items) => {
    if (!Array.isArray(items)) return []
    
    const mainMenus = items.filter(item => !item.parentId)
    const findChildren = (parentId) => {
      return items
        .filter(item => item.parentId === parentId)
        .sort((a, b) => a.order - b.order)
    }
    
    return mainMenus
      .sort((a, b) => a.order - b.order)
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

  // Fungsi helper untuk render icon
  const renderIcon = (iconName) => {
    const icon = iconMap[iconName]
    if (!icon) return null
    
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
              window.location.href = "/login"
            }}
            className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
          >
            <span className="mr-3 inline-flex items-center justify-center w-4 h-4">
              <FontAwesomeIcon icon={faUser} />
            </span>
            <span>Logout</span>
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
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>
        
        {/* Content */}
        <SidebarContent />
      </aside>
    </>
  )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
