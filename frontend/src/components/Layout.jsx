// src/components/Layout.jsx
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ChatBot from './ChatBot.jsx';

const NAV_ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>
  ),
  employees: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M15.5 14.2c2.9.4 5 2.7 5.2 5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  attendance: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M8 14l2.5 2.5L16 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  timeoff: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M3 12l6-6 4 4 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 2h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 16v4a2 2 0 002 2h14a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
};

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isAdmin = user?.role === 'admin';

  function handleSearch(e) {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;

    const normalized = q.toLowerCase();
    const sectionRoutes = [
      { keys: ['dashboard', 'home'], path: '/' },
      { keys: ['attendance', 'check in', 'check out'], path: '/attendance' },
      { keys: ['leave', 'time off', 'request', 'requests'], path: '/time-off' },
      { keys: ['profile', 'my profile'], path: '/profile' },
      { keys: ['setting', 'settings', 'password'], path: '/settings' },
    ];

    if (isAdmin && ['employee', 'employees', 'staff', 'team'].some((key) => normalized.includes(key))) {
      navigate(`/employees?search=${encodeURIComponent(q)}`);
      return;
    }

    const match = sectionRoutes.find((item) => item.keys.some((key) => normalized.includes(key)));
    if (match) {
      navigate(match.path);
      return;
    }

    if (isAdmin) {
      navigate(`/employees?search=${encodeURIComponent(q)}`);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">OI</div>
          <div className="brand-text">
            <span className="brand-name">Orbit HRMS</span>
            <span className="brand-sub">{user?.company || 'Workspace'}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">
            <span className="sidebar-icon">{NAV_ICONS.dashboard}</span> Dashboard
          </NavLink>
          {isAdmin && (
            <NavLink to="/employees" className="sidebar-link">
              <span className="sidebar-icon">{NAV_ICONS.employees}</span> Employees
            </NavLink>
          )}
          <NavLink to="/attendance" className="sidebar-link">
            <span className="sidebar-icon">{NAV_ICONS.attendance}</span> Attendance
          </NavLink>
          <NavLink to="/time-off" className="sidebar-link">
            <span className="sidebar-icon">{NAV_ICONS.timeoff}</span> Time Off
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <p>Every workday, perfectly aligned.</p>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <form className="topbar-search" onSubmit={handleSearch}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employees, requests..."
              aria-label="Search employees and pages"
            />
            {searchTerm && (
              <button type="button" className="topbar-search-clear" aria-label="Clear search" onClick={() => setSearchTerm('')}>
                ×
              </button>
            )}
          </form>

          <div className="topbar-user" ref={menuRef}>
            <button className="avatar-btn" onClick={() => setMenuOpen((v) => !v)}>
              <span className="avatar-circle">
                {user?.profilePic ? <img src={user.profilePic} alt={user?.name} /> : initials(user?.name)}
              </span>
              <span className="avatar-name">{user?.name}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {menuOpen && (
              <div className="avatar-dropdown">
                <button onClick={() => { setMenuOpen(false); navigate('/profile'); }}>My Profile</button>
                <button onClick={() => { setMenuOpen(false); navigate('/settings'); }}>Settings</button>
                <div className="dropdown-divider" />
                <button className="danger" onClick={() => { logout(); navigate('/signin'); }}>Log Out</button>
              </div>
            )}
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
        <ChatBot />
      </div>
    </div>
  );
}
