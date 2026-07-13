import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const OFPPTLogo = ({ collapsed }) => (
  <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/8">
    <svg viewBox="0 0 60 48" className="w-8 h-auto flex-shrink-0">
      <rect x="8" y="8" width="13" height="13" rx="1" transform="rotate(45 14.5 14.5)" fill="none" stroke="#00962e" strokeWidth="2.5" strokeLinejoin="round"/>
      <rect x="23" y="8" width="13" height="13" rx="1" transform="rotate(45 29.5 14.5)" fill="none" stroke="#8f9194" strokeWidth="2.5" strokeLinejoin="round"/>
      <rect x="38" y="8" width="13" height="13" rx="1" transform="rotate(45 44.5 14.5)" fill="none" stroke="#005a9c" strokeWidth="2.5" strokeLinejoin="round"/>
      <text x="30" y="42" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="800" textAnchor="middle" fill="white" letterSpacing="0.3">OFPPT</text>
    </svg>
    {!collapsed && (
      <div className="sidebar-label-transition">
        <p className="text-white font-bold text-sm leading-tight">OFPPT Connect</p>
        <p className="text-slate-500 text-[10px]">Portail Académique</p>
      </div>
    )}
  </div>
)

const NAV = {
  direction: [
    { to: '/dashboard',        icon: '⊞', label: 'Tableau de Bord' },
    { to: '/users',            icon: '👥', label: 'Utilisateurs' },
    { to: '/branches',         icon: '🏛', label: 'Filières & Groupes' },
    { to: '/modules',          icon: '📚', label: 'Modules' },
    { to: '/schedule',         icon: '📅', label: 'Emploi du Temps' },
    { to: '/schedule/builder', icon: '🔧', label: 'Constructeur EDT' },
    { to: '/assignments',      icon: '📝', label: 'Devoirs' },
    { to: '/documents',        icon: '📁', label: 'Documents' },
    { to: '/absences',         icon: '📋', label: 'Absences' },
  ],
  formateur: [
    { to: '/dashboard',   icon: '⊞', label: 'Tableau de Bord' },
    { to: '/schedule',    icon: '📅', label: 'Emploi du Temps' },
    { to: '/assignments', icon: '📝', label: 'Devoirs' },
    { to: '/documents',   icon: '📁', label: 'Documents' },
    { to: '/absences',    icon: '📋', label: 'Absences' },
  ],
  stagiaire: [
    { to: '/dashboard',   icon: '⊞', label: 'Tableau de Bord' },
    { to: '/schedule',    icon: '📅', label: 'Emploi du Temps' },
    { to: '/assignments', icon: '📝', label: 'Devoirs' },
    { to: '/documents',   icon: '📁', label: 'Documents' },
    { to: '/absences',    icon: '📋', label: 'Mes Absences' },
  ],
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = NAV[user?.role] ?? NAV.stagiaire

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside
      className={`sidebar-bg sidebar-transition flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden ${collapsed ? 'w-[60px]' : 'w-[260px]'}`}
    >
      <OFPPTLogo collapsed={collapsed} />

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {links.map(link => (
          collapsed ? (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.label}
              className={({ isActive }) =>
                `sidebar-link-icon ${isActive ? 'active' : ''} flex items-center justify-center h-10 mx-2 my-0.5`
              }
            >
              <span className="text-base">{link.icon}</span>
            </NavLink>
          ) : (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{link.icon}</span>
              <span className="sidebar-label-transition">{link.label}</span>
            </NavLink>
          )
        ))}
      </nav>

      <div className="border-t border-white/8 p-2 space-y-1">
        {collapsed ? (
          <>
            <NavLink to="/profile" title="Mon Profil" className={({ isActive }) => `sidebar-link-icon ${isActive ? 'active' : ''} flex items-center justify-center h-10 mx-0`}>
              <span className="text-base">👤</span>
            </NavLink>
            <button onClick={handleLogout} title="Déconnexion" className="sidebar-link-icon flex items-center justify-center h-10 w-full hover:text-red-400">
              <span className="text-base">🚪</span>
            </button>
          </>
        ) : (
          <>
            <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="text-base w-5 text-center flex-shrink-0">👤</span>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
              </div>
            </NavLink>
            <button onClick={handleLogout} className="sidebar-link w-full text-left hover:text-red-400">
              <span className="text-base w-5 text-center">🚪</span>
              <span className="sidebar-label-transition">Déconnexion</span>
            </button>
          </>
        )}

        <button
          onClick={onToggle}
          className="sidebar-link w-full text-left hover:text-white mt-1"
          title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
        >
          <span className="text-base w-5 text-center flex-shrink-0">{collapsed ? '▶' : '◀'}</span>
          {!collapsed && <span className="sidebar-label-transition text-slate-500 text-xs">Réduire</span>}
        </button>
      </div>
    </aside>
  )
}
