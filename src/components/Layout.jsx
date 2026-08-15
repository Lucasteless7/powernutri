import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useSession, signOut } from '../lib/auth';
import { sql, runQueriesWithRLS } from '../lib/db';
import { HeartPulse, LayoutDashboard, Users, LogOut, Loader2 } from 'lucide-react';

export default function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState(null);
  const [selectedNutriId, setSelectedNutriId] = useState(localStorage.getItem('selectedNutriId') || null);
  const [loadingRole, setLoadingRole] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const [rows] = await runQueriesWithRLS(session.user.id, [
        sql`SELECT role FROM public.usuarios_perfis WHERE id = ${session.user.id} LIMIT 1`
      ]);
      if (rows && rows.length > 0) {
        setRole(rows[0].role);
      } else {
        setRole('nutricionista'); // fallback
      }
    } catch (err) {
      console.error('Erro ao buscar papel do usuário:', err);
      setRole('nutricionista');
    } finally {
      setLoadingRole(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { fetchRole(); }, [fetchRole]);

  useEffect(() => {
    if (selectedNutriId) {
      localStorage.setItem('selectedNutriId', selectedNutriId);
    } else {
      localStorage.removeItem('selectedNutriId');
    }
  }, [selectedNutriId]);

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('selectedNutriId');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loadingRole) {
    return (
      <div className="loading-center">
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
        <span>Carregando seu perfil...</span>
      </div>
    );
  }

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
          <span>PowerNutri {role === 'personal' && <small style={{fontSize: '10px', display: 'block'}}>Personal</small>}</span>
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
            <span className="user-name">Olá, {session?.user?.name || (role === 'personal' ? 'Personal' : 'Nutricionista')}</span>
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </header>
        <main className="page-container">
          <Outlet context={{ role, selectedNutriId, setSelectedNutriId }} />
        </main>
      </div>
    </div>
  );
}
