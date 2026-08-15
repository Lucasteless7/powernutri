import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useSession } from '../lib/auth';
import { sql, runQueriesWithRLS } from '../lib/db';
import { Users, Calendar, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import DashboardPersonal from './DashboardPersonal';

function DashboardNutricionista() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalPacientes: 0,
    consultasSemana: 0,
    pacientesSemRetorno: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const queries = [
          sql`SELECT COUNT(*)::integer as count FROM public.pacientes;`,
          sql`
            SELECT COUNT(*)::integer as count 
            FROM public.consultas 
            WHERE data_consulta >= date_trunc('week', current_date)::date 
              AND data_consulta <= (date_trunc('week', current_date) + interval '6 days')::date;
          `,
          sql`
            SELECT p.id, p.nome 
            FROM public.pacientes p
            JOIN public.consultas c ON c.paciente_id = p.id
            GROUP BY p.id, p.nome
            HAVING MAX(c.data_consulta) < CURRENT_DATE - 30
               AND NOT EXISTS (
                 SELECT 1 FROM public.consultas c2 
                 WHERE c2.paciente_id = p.id 
                   AND c2.proximo_retorno >= CURRENT_DATE
               );
          `
        ];

        const [resTotal, resConsultas, resSemRetorno] = await runQueriesWithRLS(
          session.user.id,
          queries
        );

        setStats({
          totalPacientes: resTotal[0]?.count || 0,
          consultasSemana: resConsultas[0]?.count || 0,
          pacientesSemRetorno: resSemRetorno || [],
        });
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
        if (err?.message?.includes('CONFIG_ERROR')) {
          setError('A variável de ambiente VITE_NEON_DATABASE_URL não está configurada no painel do Vercel.');
        } else {
          setError('Ocorreu um erro ao carregar os dados do painel. Verifique a conexão com o banco de dados.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session?.user?.id]);

  return (
    <div>
      <h1 className="dashboard-title">Dashboard do Nutricionista</h1>
      
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary)" />
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>Carregando estatísticas...</span>
        </div>
      ) : (
        <div className="cards-grid">
          {/* Card 1 — Total de pacientes ativos */}
          <div className="card">
            <div className="card-header-inner">
              <span className="card-title-inner">Total de Pacientes Ativos</span>
              <div className="card-icon-wrapper">
                <Users size={20} />
              </div>
            </div>
            <span className="card-value">{stats.totalPacientes}</span>
          </div>

          {/* Card 2 — Consultas da semana */}
          <div className="card">
            <div className="card-header-inner">
              <span className="card-title-inner">Consultas da Semana</span>
              <div className="card-icon-wrapper" style={{ backgroundColor: '#e8f5e9', color: 'var(--success)' }}>
                <Calendar size={20} />
              </div>
            </div>
            <span className="card-value">{stats.consultasSemana}</span>
          </div>

          {/* Card 3 — Pacientes sem retorno */}
          <div className="card">
            <div className="card-header-inner">
              <span className="card-title-inner">Pacientes Sem Retorno (30d+)</span>
              <div className="card-icon-wrapper" style={{ backgroundColor: '#fff3e0', color: '#ffb300' }}>
                <AlertTriangle size={20} />
              </div>
            </div>
            
            {stats.pacientesSemRetorno.length > 0 ? (
              <ul className="card-list">
                {stats.pacientesSemRetorno.map((paciente) => (
                  <li key={paciente.id} className="card-list-item">
                    <Link to={`/pacientes/${paciente.id}`}>
                      {paciente.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-message">Nenhum paciente sem retorno no momento</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { role } = useOutletContext();
  
  if (role === 'personal') {
    return <DashboardPersonal />;
  }

  return <DashboardNutricionista />;
}
