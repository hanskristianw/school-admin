'use client'

import { useEffect, useState, useMemo, memo } from "react"
import { createPortal } from "react-dom"
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  faSitemap,
  faSackDollar,
  faFlag,
  faLightbulb,
  faHashtag,
  faCalculator,
  faLayerGroup,
  faNotesMedical,
  faHeartPulse,
  faStethoscope,
  faFileMedical,
  faTrophy,
  faFileInvoice,
  faFileInvoiceDollar,
  faLandmark,
  faHandHoldingHeart,
  faHandsHoldingChild,
  faUserShield,
  faHandsHolding,
  // PYP & MYP Curriculum & Inquiry Icons
  faShapes,
  faPuzzlePiece,
  faSeedling,
  faChild,
  faChildren,
  faCubes,
  faPalette,
  faGlobe,
  faEarthAmericas,
  faCompass,
  faFlask,
  faDiagramProject,
  faAtom,
  faBrain,
  faBookBookmark,
  faBookOpen,
  faSearch,
  faDoorOpen,
  faDoorClosed,
  faSignOutAlt,
  faQrcode,
  faBell,
  faChartBar,
  faFileSignature,
  faShieldAlt,
  faUserCheck,
  faCheckDouble,
  faListCheck,
  faCalendarCheck,
  faScrewdriverWrench,
  faWrench,
  faTools,
  faTicket,
  faTicketSimple,
  faCar,
  faCarSide,
  faBus,
  faFingerprint,
  faClock,
  faExclamationTriangle,
  faSliders,
  faShirt,
  faRuler,
  faCartShopping,
  faClipboardList,
  faTruck,
  faWarehouse,
  faCartPlus,
  faWandMagicSparkles,
  faBoxesStacked,
  faBoxOpen
} from "@fortawesome/free-solid-svg-icons"

// Complete icon mapping dictionary with all naming variations
const iconMap = {
  // Operational & Maintenance
  'fas fa-screwdriver-wrench': faScrewdriverWrench,
  'faScrewdriverWrench': faScrewdriverWrench,
  'screwdriver-wrench': faScrewdriverWrench,
  'fas fa-tools': faTools,
  'faTools': faTools,
  'tools': faTools,
  'fas fa-wrench': faWrench,
  'faWrench': faWrench,
  'wrench': faWrench,

  // Diknas & Institutional
  'fas fa-landmark': faLandmark,
  'faLandmark': faLandmark,
  'landmark': faLandmark,

  // Vehicles & Logistics
  'fas fa-car': faCar,
  'faCar': faCar,
  'car': faCar,
  'fas fa-car-side': faCarSide,
  'faCarSide': faCarSide,
  'fas fa-bus': faBus,
  'faBus': faBus,

  // Ticketing & Facility
  'fas fa-ticket': faTicket,
  'faTicket': faTicket,
  'ticket': faTicket,
  'fas fa-ticket-simple': faTicketSimple,
  'faTicketSimple': faTicketSimple,

  // Core & Database
  'fas fa-tachometer-alt': faTachometerAlt,
  'faTachometerAlt': faTachometerAlt,
  'fas fa-gauge-high': faGaugeHigh,
  'faGaugeHigh': faGaugeHigh,
  'fas fa-database': faDatabase,
  'faDatabase': faDatabase,
  'fas fa-user': faUser,
  'faUser': faUser,
  'fas fa-users': faUsers,
  'faUsers': faUsers,
  'fas fa-graduation-cap': faGraduationCap,
  'faGraduationCap': faGraduationCap,
  'fas fa-book': faBook,
  'faBook': faBook,
  'fas fa-house': faHouse,
  'faHouse': faHouse,
  'fas fa-chalkboard-teacher': faChalkboardTeacher,
  'faChalkboardTeacher': faChalkboardTeacher,
  'fas fa-clipboard-check': faClipboardCheck,
  'faClipboardCheck': faClipboardCheck,
  'fas fa-paper-plane': faPaperPlane,
  'faPaperPlane': faPaperPlane,
  'fas fa-calendar-alt': faCalendarAlt,
  'faCalendarAlt': faCalendarAlt,
  'fas fa-calendar-days': faCalendarDays,
  'faCalendarDays': faCalendarDays,
  'fas fa-edit': faEdit,
  'faEdit': faEdit,
  'fas fa-trash': faTrash,
  'faTrash': faTrash,
  'fas fa-qrcode': faQrcode,
  'faQrcode': faQrcode,
  'fas fa-comments': faComments,
  'faComments': faComments,
  'fas fa-door-open': faDoorOpen,
  'faDoorOpen': faDoorOpen,
  'fas fa-door-closed': faDoorClosed,
  'faDoorClosed': faDoorClosed,
  'fas fa-key': faKey,
  'faKey': faKey,
  'fas fa-sitemap': faSitemap,
  'faSitemap': faSitemap,
  'fas fa-building': faBuilding,
  'faBuilding': faBuilding,
  'fas fa-sack-dollar': faSackDollar,
  'faSackDollar': faSackDollar,
  'fas fa-flag': faFlag,
  'faFlag': faFlag,
  'fas fa-lightbulb': faLightbulb,
  'faLightbulb': faLightbulb,
  'fas fa-hashtag': faHashtag,
  'faHashtag': faHashtag,
  'fas fa-ruler': faRuler,
  'faRuler': faRuler,
  'fas fa-shirt': faShirt,
  'faShirt': faShirt,
  'fas fa-cart-shopping': faCartShopping,
  'faCartShopping': faCartShopping,
  'fas fa-clipboard-list': faClipboardList,
  'faClipboardList': faClipboardList,
  'fas fa-truck': faTruck,
  'faTruck': faTruck,
  'fas fa-warehouse': faWarehouse,
  'faWarehouse': faWarehouse,
  'fas fa-cart-plus': faCartPlus,
  'faCartPlus': faCartPlus,
  'fas fa-wand-magic-sparkles': faWandMagicSparkles,
  'faWandMagicSparkles': faWandMagicSparkles,
  'fas fa-boxes-stacked': faBoxesStacked,
  'faBoxesStacked': faBoxesStacked,
  'fas fa-box-open': faBoxOpen,
  'faBoxOpen': faBoxOpen,
  'fas fa-calculator': faCalculator,
  'faCalculator': faCalculator,
  'fas fa-layer-group': faLayerGroup,
  'faLayerGroup': faLayerGroup,
  'fas fa-notes-medical': faNotesMedical,
  'faNotesMedical': faNotesMedical,
  'fas fa-heart-pulse': faHeartPulse,
  'faHeartPulse': faHeartPulse,
  'fas fa-stethoscope': faStethoscope,
  'faStethoscope': faStethoscope,
  'fas fa-file-medical': faFileMedical,
  'faFileMedical': faFileMedical,
  'fas fa-trophy': faTrophy,
  'faTrophy': faTrophy,
  'fas fa-user-graduate': faUserGraduate,
  'faUserGraduate': faUserGraduate,
  'fas fa-file-invoice': faFileInvoice,
  'faFileInvoice': faFileInvoice,
  'fas fa-file-invoice-dollar': faFileInvoiceDollar,
  'faFileInvoiceDollar': faFileInvoiceDollar,
  'fas fa-fingerprint': faFingerprint,
  'faFingerprint': faFingerprint,
  'fas fa-clock': faClock,
  'faClock': faClock,
  'fas fa-exclamation-triangle': faExclamationTriangle,
  'faExclamationTriangle': faExclamationTriangle,
  'fas fa-sliders': faSliders,
  'faSliders': faSliders,
  'fas fa-shield-alt': faShieldAlt,
  'faShieldAlt': faShieldAlt,
  'fas fa-user-check': faUserCheck,
  'faUserCheck': faUserCheck,
  'fas fa-bell': faBell,
  'faBell': faBell,
  'fas fa-chart-bar': faChartBar,
  'faChartBar': faChartBar,
  'fas fa-file-signature': faFileSignature,
  'faFileSignature': faFileSignature,
  'fas fa-hand-holding-heart': faHandHoldingHeart,
  'faHandHoldingHeart': faHandHoldingHeart,
  'fas fa-hands-holding-child': faHandsHoldingChild,
  'faHandsHoldingChild': faHandsHoldingChild,
  'fas fa-user-shield': faUserShield,
  'faUserShield': faUserShield,
  'fas fa-hands-holding': faHandsHolding,
  'faHandsHolding': faHandsHolding,
  'fas fa-shapes': faShapes,
  'faShapes': faShapes,
  'shapes': faShapes,
  'fas fa-puzzle-piece': faPuzzlePiece,
  'faPuzzlePiece': faPuzzlePiece,
  'puzzle-piece': faPuzzlePiece,
  'fas fa-seedling': faSeedling,
  'faSeedling': faSeedling,
  'seedling': faSeedling,
  'fas fa-child': faChild,
  'faChild': faChild,
  'child': faChild,
  'fas fa-children': faChildren,
  'faChildren': faChildren,
  'children': faChildren,
  'fas fa-cubes': faCubes,
  'faCubes': faCubes,
  'cubes': faCubes,
  'fas fa-palette': faPalette,
  'faPalette': faPalette,
  'palette': faPalette,
  'fas fa-globe': faGlobe,
  'faGlobe': faGlobe,
  'globe': faGlobe,
  'fas fa-earth-americas': faEarthAmericas,
  'faEarthAmericas': faEarthAmericas,
  'earth-americas': faEarthAmericas,
  'fas fa-compass': faCompass,
  'faCompass': faCompass,
  'compass': faCompass,
  'fas fa-flask': faFlask,
  'faFlask': faFlask,
  'flask': faFlask,
  'fas fa-diagram-project': faDiagramProject,
  'faDiagramProject': faDiagramProject,
  'diagram-project': faDiagramProject,
  'fas fa-atom': faAtom,
  'faAtom': faAtom,
  'atom': faAtom,
  'fas fa-brain': faBrain,
  'faBrain': faBrain,
  'brain': faBrain,
  'fas fa-book-bookmark': faBookBookmark,
  'faBookBookmark': faBookBookmark,
  'book-bookmark': faBookBookmark,
  'fas fa-book-open': faBookOpen,
  'faBookOpen': faBookOpen,
  'book-open': faBookOpen,
  'fas fa-school': faSchool,
  'faSchool': faSchool,
  'school': faSchool,
  'fas fa-check-double': faCheckDouble,
  'faCheckDouble': faCheckDouble,
  'fas fa-list-check': faListCheck,
  'faListCheck': faListCheck,
  'fas fa-calendar-check': faCalendarCheck,
  'faCalendarCheck': faCalendarCheck
}

const Sidebar = memo(({ isOpen, setIsOpen }) => {
  const [menus, setMenus] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, height: 0 })
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState({
    name: 'Administrator',
    role: 'Admin',
    initials: 'AD'
  })

  const pathname = usePathname()
  const router = useRouter()
  const { translateMenu, t } = useI18n()
  const { theme, isDark } = useTheme()

  // Load User Profile
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user_data")
      if (rawUser) {
        const u = JSON.parse(rawUser)
        const name = u.fullName || u.nama_lengkap || u.userName || u.user_nama || 'Administrator'
        const role = u.roleName || localStorage.getItem("user_role") || 'User'
        
        const parts = name.trim().split(/\s+/)
        let initials = 'AD'
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[1][0]).toUpperCase()
        } else if (parts.length === 1 && parts[0].length >= 2) {
          initials = parts[0].substring(0, 2).toUpperCase()
        } else if (parts.length === 1 && parts[0].length === 1) {
          initials = parts[0][0].toUpperCase()
        }

        setCurrentUser({ name, role, initials })
      }
    } catch (e) {
      console.warn("Failed to load user profile in sidebar:", e)
    }
  }, [])

  // Close popup in collapsed mode on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeMenu && !e.target.closest('.sidebar-menu-button') && !e.target.closest('.sidebar-popup')) {
        setActiveMenu(null)
      }
    }

    if (activeMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeMenu])

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const userData = localStorage.getItem("user_data")
        let role = localStorage.getItem("user_role")
        let isAdmin = false
        let isCounselor = false
        let isTeacher = false
        let isStudent = false
        
        if (userData) {
          try {
            const user = JSON.parse(userData)
            role = user.roleName
            isAdmin = user.isAdmin
            isCounselor = !!user.isCounselor
            isTeacher = !!user.isTeacher
            isStudent = !!user.isStudent
          } catch (e) {
            console.warn("⚠️ Failed to parse user data:", e)
          }
        }
        
        if (!role) {
          role = "admin"
          isAdmin = true
        }
        
        if (role === "admin" || role === "Admin") {
          isAdmin = true
        }

        const { customAuth } = await import('@/lib/supabase')
        const result = await customAuth.getMenusByRole(role, isAdmin)

        if (result.success && result.menus && Array.isArray(result.menus)) {
          let transformedData = result.menus.map(item => ({
            id: item.menu_id,
            name: item.menu_name,
            path: item.menu_path || '#',        
            icon: item.menu_icon || '',         
            parentId: item.menu_parent_id,      
            order: item.menu_order || 0
          }))

          if (!isAdmin && !isCounselor) {
            transformedData = transformedData.filter(m => {
              const p = (m.path || '').trim()
              return !(p === '/data/consultation' || p.startsWith('/data/consultation/'))
            })
          }
          
          setMenus(transformedData)
          setError(null)

          // Auto-expand current active branch
          const currentOrganized = organizeMenus(transformedData)
          const autoExpandState = {}
          currentOrganized.forEach(parent => {
            if (parent.children && parent.children.some(c => c.path === pathname)) {
              autoExpandState[parent.id] = true
            }
          })
          setExpandedMenus(prev => ({ ...prev, ...autoExpandState }))

          // Update allowed_paths cookie for SSR
          try {
            const normalize = (p) => {
              if (!p) return ''
              let s = String(p).trim()
              if (!s.startsWith('/')) s = '/' + s
              if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
              return s
            }
            const defaults = ['/dashboard', '/profile']
            const counselorExtra = isCounselor ? ['/data/consultation'] : []
            const teacherExtra = isTeacher ? ['/teacher', '/teacher/assessment_submission', '/room', '/room/booking'] : []
            const studentExtra = isStudent ? ['/student'] : []
            const merged = Array.from(new Set([
              ...transformedData.map(m => normalize(m.path)),
              ...defaults.map(normalize),
              ...counselorExtra.map(normalize),
              ...teacherExtra.map(normalize),
              ...studentExtra.map(normalize)
            ]))
            const maxAge = 60 * 60 * 8
            const safeJoin = encodeURIComponent(merged.join('|'))
            document.cookie = `allowed_paths=${safeJoin}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
          } catch (e) {
            console.warn('Failed updating allowed_paths cookie from Sidebar', e)
          }
        } else {
          throw new Error(`Failed to fetch menus: ${result.message || 'Unknown error'}`)
        }
        
      } catch (error) {
        console.error("❌ Failed to load menus from Supabase:", error)
        setError(`Database error: ${error.message}`)
        setMenus([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMenus()
  }, [pathname])

  const organizeMenus = (items) => {
    if (!Array.isArray(items)) return []

    const num = (v) => {
      const n = typeof v === 'number' ? v : parseInt(v ?? 0, 10)
      return Number.isFinite(n) ? n : 0
    }

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

  const organizedMenus = useMemo(() => organizeMenus(menus), [menus])

  // Filtered menu items based on search query
  const filteredOrganizedMenus = useMemo(() => {
    if (!searchQuery.trim()) return organizedMenus
    const q = searchQuery.toLowerCase().trim()
    return organizedMenus
      .map(menu => {
        const matchParent = menu.name.toLowerCase().includes(q)
        const matchingChildren = (menu.children || []).filter(c => c.name.toLowerCase().includes(q))
        if (matchParent) {
          return menu
        } else if (matchingChildren.length > 0) {
          return {
            ...menu,
            children: matchingChildren
          }
        }
        return null
      })
      .filter(Boolean)
  }, [organizedMenus, searchQuery])

  // Toggle expanded menu
  const toggleExpanded = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  const renderIcon = (iconName) => {
    if (!iconName) {
      return <FontAwesomeIcon icon={faTable} className="w-3.5 h-3.5" />
    }
    // Check direct match or trimmed key
    const trimmed = String(iconName).trim()
    let icon = iconMap[trimmed]
    if (!icon) {
      // Try alias without 'fas fa-' or with 'fa'
      const cleanKey = trimmed.replace(/^fas\s+fa-|^fa-|^fa/, '')
      const camelCaseKey = 'fa' + cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)
      const fasKey = 'fas fa-' + cleanKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      icon = iconMap[camelCaseKey] || iconMap[fasKey] || iconMap[cleanKey.toLowerCase()]
    }
    if (!icon) {
      return <FontAwesomeIcon icon={faTable} className="w-3.5 h-3.5" />
    }
    return <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" />
  }

  const LoadingSkeleton = () => (
    <div className="animate-pulse p-3 space-y-2.5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-7 rounded" style={{ background: theme.border, width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  )

  const SidebarContent = () => {
    if (isLoading) return <LoadingSkeleton />
    
    if (error) {
      return (
        <div className="p-3">
          <div className="p-3 border rounded" style={{ borderColor: theme.border, background: theme.redBg }}>
            <p className="text-xs font-semibold mb-1 font-mono uppercase" style={{ color: theme.redText }}>Load Error</p>
            <p className="text-[11px] mb-2.5" style={{ color: theme.textSecondary }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-2.5 py-1 rounded font-medium border transition-colors cursor-pointer"
              style={{ background: theme.textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderColor: theme.border }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    if (filteredOrganizedMenus.length === 0) {
      return (
        <div className="p-3 text-center">
          <div className="p-4 border rounded" style={{ borderColor: theme.border, background: theme.subtleBg }}>
            <p className="text-xs font-mono" style={{ color: theme.textSecondary }}>
              {searchQuery ? `No results for "${searchQuery}"` : 'No navigation menus available'}
            </p>
          </div>
        </div>
      )
    }

    return (
      <nav className="flex-1 px-2.5 py-2 overflow-y-auto space-y-0.5 custom-scrollbar">


        {filteredOrganizedMenus.map((menu, index) => {
          const hasChildren = menu.children && menu.children.length > 0
          const isDirectActive = pathname === menu.path
          const isChildActive = hasChildren && menu.children.some(c => pathname === c.path)
          const isMenuOpen = expandedMenus[menu.id] || searchQuery.length > 0

          return (
            <div key={menu.id || index} className="relative">
              {hasChildren ? (
                <>
                  {/* Parent Menu Item */}
                  <button
                    onClick={(e) => {
                      if (isCollapsed) {
                        e.preventDefault()
                        if (activeMenu === menu.id) {
                          setActiveMenu(null)
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const viewportHeight = window.innerHeight
                          const popupHeight = Math.min(menu.children.length * 36 + 40, viewportHeight - 20)
                          let top = rect.top
                          let height = popupHeight
                          if (top + popupHeight > viewportHeight) {
                            top = Math.max(10, viewportHeight - popupHeight - 10)
                            height = Math.min(popupHeight, viewportHeight - top - 20)
                          }
                          setPopupPosition({ top, left: rect.right, height })
                          setActiveMenu(menu.id)
                        }
                      } else {
                        toggleExpanded(menu.id)
                      }
                    }}
                    className={`sidebar-menu-button w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2.5 py-1.5 text-xs rounded transition-all cursor-pointer`}
                    style={{
                      borderRadius: '4px',
                      background: (isChildActive || activeMenu === menu.id) ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
                      color: (isChildActive || activeMenu === menu.id) ? (isDark ? '#F0EFE9' : theme.blueText) : theme.textBody,
                      fontWeight: (isChildActive || activeMenu === menu.id) ? 600 : 500,
                      borderLeft: (isChildActive || activeMenu === menu.id) ? `2px solid ${theme.blueText}` : '2px solid transparent'
                    }}
                    onMouseEnter={e => { 
                      if (!isChildActive && activeMenu !== menu.id) {
                        e.currentTarget.style.background = theme.subtleBg
                        e.currentTarget.style.color = theme.textPrimary
                      }
                    }}
                    onMouseLeave={e => { 
                      if (!isChildActive && activeMenu !== menu.id) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = theme.textBody
                      }
                    }}
                    title={isCollapsed ? `${menu.name} (${menu.children.length})` : ''}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0" style={{ color: (isChildActive || activeMenu === menu.id) ? theme.blueText : 'inherit' }}>
                        {renderIcon(menu.icon)}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate text-xs">{menu.name}</span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <FontAwesomeIcon
                        icon={isMenuOpen ? faChevronDown : faChevronRight}
                        className="w-2.5 h-2.5 opacity-50 transition-transform flex-shrink-0"
                      />
                    )}
                  </button>

                  {/* Indented Submenu Children with Structural Tree Line */}
                  {!isCollapsed && isMenuOpen && (
                    <div className="mt-0.5 mb-1 ml-3.5 pl-2.5 border-l space-y-0.5" style={{ borderColor: theme.border }}>
                      {menu.children.map((child) => {
                        const isSubActive = pathname === child.path
                        return (
                          <Link
                            key={child.id}
                            href={child.path}
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className="flex items-center justify-between px-2 py-1 text-xs rounded transition-all"
                            style={{
                              borderRadius: '4px',
                              background: isSubActive ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
                              color: isSubActive ? (isDark ? '#F0EFE9' : theme.blueText) : theme.textSecondary,
                              fontWeight: isSubActive ? 600 : 400
                            }}
                            onMouseEnter={e => {
                              if (!isSubActive) {
                                e.currentTarget.style.background = theme.subtleBg
                                e.currentTarget.style.color = theme.textPrimary
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isSubActive) {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = theme.textSecondary
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0" style={{ color: isSubActive ? theme.blueText : 'inherit' }}>
                                {renderIcon(child.icon)}
                              </span>
                              <span className="truncate text-xs">{child.name}</span>
                            </div>
                            {isSubActive && (
                              <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {/* Collapsed Mode Popup */}
                  {isCollapsed && activeMenu === menu.id && typeof window !== 'undefined' && (
                    <div
                      className="sidebar-popup fixed min-w-[200px] max-w-[260px] overflow-hidden p-1.5 rounded border shadow-xl"
                      style={{
                        zIndex: 99999,
                        top: `${popupPosition.top}px`,
                        left: `${popupPosition.left + 6}px`,
                        background: theme.cardBg,
                        borderColor: theme.border,
                        borderRadius: '6px'
                      }}
                    >
                      <div
                        className="px-2.5 py-1.5 text-xs font-bold font-mono uppercase tracking-wider rounded mb-1 flex items-center justify-between border-b"
                        style={{
                          color: theme.textPrimary,
                          background: theme.subtleBg,
                          borderColor: theme.border
                        }}
                      >
                        <span>{menu.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">[{menu.children.length}]</span>
                      </div>
                      <div className="overflow-y-auto space-y-0.5" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                        {menu.children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.path}
                            onClick={() => { setActiveMenu(null); setIsOpen && setIsOpen(false) }}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded transition-colors"
                            style={{
                              borderRadius: '4px',
                              color: pathname === child.path ? (isDark ? '#F0EFE9' : theme.blueText) : theme.textBody,
                              background: pathname === child.path ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
                              fontWeight: pathname === child.path ? 600 : 400
                            }}
                          >
                            <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                              {renderIcon(child.icon)}
                            </span>
                            <span className="truncate">{child.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Direct Menu Link */
                <Link
                  href={menu.path}
                  onClick={() => setIsOpen && setIsOpen(false)}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2.5 py-1.5 text-xs rounded transition-all`}
                  style={{
                    borderRadius: '4px',
                    background: isDirectActive ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
                    color: isDirectActive ? (isDark ? '#F0EFE9' : theme.blueText) : theme.textBody,
                    fontWeight: isDirectActive ? 600 : 500,
                    borderLeft: isDirectActive ? `2px solid ${theme.blueText}` : '2px solid transparent'
                  }}
                  onMouseEnter={e => { 
                    if (!isDirectActive) {
                      e.currentTarget.style.background = theme.subtleBg
                      e.currentTarget.style.color = theme.textPrimary
                    }
                  }}
                  onMouseLeave={e => { 
                    if (!isDirectActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = theme.textBody
                    }
                  }}
                  title={isCollapsed ? menu.name : ''}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0" style={{ color: isDirectActive ? theme.blueText : 'inherit' }}>
                      {renderIcon(menu.icon)}
                    </span>
                    {!isCollapsed && <span className="truncate text-xs">{menu.name}</span>}
                  </div>

                  {!isCollapsed && isDirectActive && (
                    <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </Link>
              )}
            </div>
          )
        })}

        {/* Logout Option directly below Profile in navigation */}
        <div className="pt-1 mt-1 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`sidebar-menu-button w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2.5 py-1.5 text-xs rounded transition-all cursor-pointer`}
            style={{
              borderRadius: '4px',
              color: isDark ? '#DC8585' : '#9F2F2D',
              background: 'transparent'
            }}
            onMouseEnter={e => { 
              e.currentTarget.style.background = isDark ? '#3A1E1E' : '#FDEBEC'
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.background = 'transparent'
            }}
            title={isCollapsed ? (t('common.logout') || 'Log Out') : ''}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0" style={{ color: isDark ? '#DC8585' : '#9F2F2D' }}>
                <FontAwesomeIcon icon={faSignOutAlt} className="w-3.5 h-3.5" />
              </span>
              {!isCollapsed && (
                <span className="truncate text-xs font-semibold">
                  {t('common.logout') || 'Log Out'}
                </span>
              )}
            </div>
          </button>
        </div>
      </nav>
    )
  }

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded border"
        style={{ background: theme.cardBg, borderColor: theme.border }}
        aria-label="Toggle menu"
      >
        <FontAwesomeIcon icon={isOpen ? faXmark : faBars} className="w-3.5 h-3.5" style={{ color: theme.textPrimary }} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Utilitarian Minimalist Docked Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen flex flex-col
          transform transition-all duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'lg:w-16' : 'lg:w-60'}
          lg:translate-x-0 lg:static lg:h-[calc(100vh-3rem)] lg:self-stretch
        `}
        style={{
          width: isCollapsed ? '4rem' : '15rem',
          background: theme.cardBg,
          borderRight: `1px solid ${theme.border}`,
          fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif"
        }}
      >
        {/* Workspace Brand Header */}
        <div className="px-3.5 py-3 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon.png"
              alt="CCS"
              className="w-5 h-5 rounded flex-shrink-0 object-cover"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-tight block truncate" style={{ color: theme.textPrimary, letterSpacing: '-0.01em' }}>
                  Chung Chung School
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded border transition-colors cursor-pointer"
            style={{ borderColor: theme.border, color: theme.textSecondary, background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.subtleBg; e.currentTarget.style.color = theme.textPrimary }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FontAwesomeIcon
              icon={isCollapsed ? faChevronRight : faBars}
              className="w-2.5 h-2.5"
            />
          </button>
        </div>

        {/* Minimalist Search Input */}
        {!isCollapsed && (
          <div className="px-2.5 pt-2 pb-1 flex-shrink-0">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-2.5 h-2.5 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs rounded outline-none border transition-colors font-mono"
                style={{
                  background: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                  borderRadius: '4px'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Navigation Content */}
        <SidebarContent />



        {/* Logout Modal */}
        {showLogoutModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.35)' }}
              onClick={() => setShowLogoutModal(false)}
            />
            <div
              className="relative p-5 w-full max-w-xs mx-4 rounded border shadow-2xl"
              style={{ 
                background: theme.cardBg, 
                borderColor: theme.border,
                borderRadius: '8px'
              }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded border flex items-center justify-center" style={{ background: theme.redBg, borderColor: theme.border }}>
                  <FontAwesomeIcon icon={faSignOutAlt} style={{ color: theme.redText, fontSize: '12px' }} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider" style={{ color: theme.textPrimary }}>
                    {t('common.logoutConfirmTitle') || 'Confirm Logout'}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">SESSION TERMINATION</span>
                </div>
              </div>
              <p className="text-xs mb-4" style={{ color: theme.textSecondary, lineHeight: '1.5' }}>
                {t('common.logoutConfirmMessage') || 'Are you sure you want to end your current session?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
                  style={{ borderColor: theme.border, color: theme.textPrimary, background: theme.cardBg, borderRadius: '4px' }}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const role = localStorage.getItem('user_role')
                      if (role) sessionStorage.removeItem(`allowed_menu_paths:${role}`)
                      sessionStorage.removeItem('allowed_menu_paths:admin')
                    } catch {}
                    localStorage.clear()
                    const past = 'Thu, 01 Jan 1970 00:00:00 GMT'
                    document.cookie = `kr_id=; Path=/; Expires=${past}; SameSite=Lax`
                    document.cookie = `role_name=; Path=/; Expires=${past}; SameSite=Lax`
                    document.cookie = `is_admin=; Path=/; Expires=${past}; SameSite=Lax`
                    document.cookie = `allowed_paths=; Path=/; Expires=${past}; SameSite=Lax`
                    router.push('/login')
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer"
                  style={{ background: theme.textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderRadius: '4px' }}
                >
                  {t('common.logout') || 'Log Out'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </aside>
    </>
  )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
