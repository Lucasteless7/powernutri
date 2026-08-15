import React from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useSession, signOut } from '../lib/auth';
import { HeartPulse, LayoutDashboard, Users, LogOut } from 'lucide-react';

export default function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/pacientes', name: 'Pacientes', icon: Users },
  ];

  return (
    <div className="app-layout">
      {/* Menu Lateral Fixo */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <HeartPulse size={28} />
          <span>PowerNutri</span>
        </div>
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <Link to={item.path}>
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Área Principal */}
      <div className="main-content">
        <header className="app-header">
          <div className="header-user">
            <span className="user-name">Olá, {session?.user?.name || 'Nutricionista'}</span>
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </header>
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
