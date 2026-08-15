import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { useSession } from '../lib/auth';
import { sql, runQueriesWithRLS } from '../lib/db';
import {
  Users, Plus, Search, User, Calendar, AlertCircle, Loader2, ChevronRight, CheckCircle
} from 'lucide-react';

export default function Pacientes() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [showExcluido] = useState(searchParams.get('excluido') === '1');
  const { role, selectedNutriId } = useOutletContext();
  const activeUserId = role === 'personal' ? selectedNutriId : session?.user?.id;

  const carregarPacientes = useCallback(async () => {
    if (!activeUserId) return;
    try {
      setLoading(true);
      setErro(null);
      const [rows] = await runQueriesWithRLS(activeUserId, [
        sql`SELECT
              p.id,
              p.nome,
              p.objetivo_texto,
              p.objetivos,
              MAX(c.data_consulta)::text AS ultima_consulta
            FROM public.pacientes p
            LEFT JOIN public.consultas c ON c.paciente_id = p.id
            WHERE p.nutricionista_id = ${activeUserId}
            GROUP BY p.id, p.nome, p.objetivo_texto, p.objetivos, p.created_at
            ORDER BY p.created_at DESC;`
      ]);
      setPacientes(rows || []);
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar pacientes. Verifique a conexão com o banco.');
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => { carregarPacientes(); }, [carregarPacientes]);

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getObjetivo = (p) => {
    if (p.objetivo_texto) return p.objetivo_texto;
    const arr = Array.isArray(p.objetivos) ? p.objetivos : [];
    return arr.length > 0 ? arr[0] : null;
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Pacientes</h1>
          <p className="page-subtitle">
            {loading ? 'Carregando...' : `${pacientes.length} paciente${pacientes.length !== 1 ? 's' : ''} cadastrado${pacientes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        
        {role !== 'personal' && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/pacientes/novo')}>
            <Plus size={16} /> Novo Paciente
          </button>
        )}
      </div>

      {/* Alerta de exclusão */}
      {showExcluido && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={18} /> Paciente excluído com sucesso.
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} /> {erro}
        </div>
      )}

      {/* Busca */}
      {!loading && pacientes.length > 0 && (
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      )}

      {/* Estado de carregamento */}
      {loading ? (
        <div className="loading-center">
          <Loader2 className="animate-spin" size={32} color="var(--primary)" />
          <span>Carregando pacientes...</span>
        </div>
      ) : pacientesFiltrados.length === 0 ? (
        <div className="empty-state">
          <Users size={48} color="var(--border)" />
          <p className="empty-state-title">
            {busca ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}
          </p>
          <p className="empty-state-subtitle">
            {busca
              ? 'Tente outro termo de busca.'
              : 'Clique em "Novo Paciente" para começar a cadastrar seus pacientes.'}
          </p>
          {!busca && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/pacientes/novo')}>
              <Plus size={18} /> Cadastrar primeiro paciente
            </button>
          )}
        </div>
      ) : (
        <div className="pacientes-list">
          {pacientesFiltrados.map(p => (
            <Link key={p.id} to={`/pacientes/${p.id}`} className="paciente-card-link">
              <div className="paciente-card">
                <div className="paciente-avatar">
                  <User size={24} />
                </div>
                <div className="paciente-info">
                  <h3 className="paciente-nome">{p.nome}</h3>
                  <div className="paciente-detalhes">
                    {getObjetivo(p) && <span className="paciente-objetivo">{getObjetivo(p)}</span>}
                  </div>
                  <div className="paciente-contatos">
                    {p.ultima_consulta ? (
                      <span className="paciente-contato">
                        <Calendar size={13} /> Última consulta: {formatDate(p.ultima_consulta)}
                      </span>
                    ) : (
                      <span className="paciente-contato" style={{ fontStyle: 'italic' }}>Sem consultas registradas</span>
                    )}
                  </div>
                </div>
                <div className="paciente-arrow">
                  <ChevronRight size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
