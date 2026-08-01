import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, useSession } from '../lib/auth';
import { LogOut, HeartPulse } from 'lucide-react';

export default function Dashboard() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (isPending) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      <header style={{ backgroundColor: 'var(--surface)', padding: '1rem 2rem', boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.25rem' }}>
          <HeartPulse size={24} />
          PowerNutri
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Olá, {session?.user?.name || 'Nutricionista'}</span>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontWeight: '500' }}
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </header>
      <main className="container" style={{ padding: '2rem' }}>
        <h1>Painel</h1>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          Bem-vindo ao PowerNutri! Seu painel de controle será implementado aqui.
        </p>
      </main>
    </div>
  );
}
