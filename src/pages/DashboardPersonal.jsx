import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { sql, runQueriesWithRLS } from '../lib/db';
import { useSession } from '../lib/auth';
import { Users, Loader2, AlertCircle, ChevronRight, CheckCircle } from 'lucide-react';

export default function DashboardPersonal() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { selectedNutriId, setSelectedNutriId } = useOutletContext();
  
  const [nutricionistas, setNutricionistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchNutricionistas = async () => {
      try {
        setLoading(true);
        // By bypassing RLS with a generic user or just trusting the query here
        // Note: For simplicity in MVP, we just fetch all nutricionistas using the Personal's own ID 
        // to bypass RLS, assuming usuarios_perfis doesn't have strict RLS restricting read access.
        const [rows] = await runQueriesWithRLS(session.user.id, [
          sql`SELECT id, nome FROM public.usuarios_perfis WHERE role = 'nutricionista' ORDER BY nome ASC`
        ]);
        setNutricionistas(rows || []);
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar lista de nutricionistas.');
      } finally {
        setLoading(false);
      }
    };

    fetchNutricionistas();
  }, [session?.user?.id]);

  const handleSelect = (nutriId) => {
    setSelectedNutriId(nutriId);
  };

  return (
    <div>
      <h1 className="dashboard-title">Dashboard do Personal</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Selecione o Nutricionista parceiro para gerenciar a rotina de treino dos seus pacientes.
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {selectedNutriId && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} /> 
            Você está gerenciando os pacientes do(a) nutricionista selecionado(a).
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/pacientes')}>
            Ver Pacientes
          </button>
        </div>
      )}

      <div className="cards-grid">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header-inner">
            <span className="card-title-inner">Nutricionistas Disponíveis</span>
            <div className="card-icon-wrapper">
              <Users size={20} />
            </div>
          </div>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin" size={24} color="var(--primary)" />
            </div>
          ) : nutricionistas.length === 0 ? (
            <p className="empty-message">Nenhum nutricionista cadastrado no sistema.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {nutricionistas.map(nutri => (
                <div 
                  key={nutri.id} 
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem', borderRadius: '8px',
                    border: selectedNutriId === nutri.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedNutriId === nutri.id ? 'var(--primary-light)' : 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onClick={() => handleSelect(nutri.id)}
                >
                  <span style={{ fontWeight: selectedNutriId === nutri.id ? 'bold' : 'normal', color: 'var(--text-dark)' }}>
                    {nutri.nome || 'Nutricionista sem nome'}
                  </span>
                  {selectedNutriId === nutri.id ? (
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>Selecionado</span>
                  ) : (
                    <ChevronRight size={18} color="var(--text-muted)" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
