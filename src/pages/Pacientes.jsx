import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '../lib/auth';
import { sql, runQueriesWithRLS } from '../lib/db';
import {
  Users, Plus, X, Save, Loader2, AlertCircle,
  Search, User, Phone, Mail, Calendar, ChevronRight
} from 'lucide-react';

// ─── Formulário de Cadastro ───────────────────────────────────────────────────
function FormCadastroPaciente({ onSalvar, onCancelar, loading }) {
  const [form, setForm] = useState({
    nome: '',
    data_nascimento: '',
    sexo: '',
    whatsapp: '',
    email: '',
    peso_inicial: '',
    altura: '',
    objetivo_texto: '',
    nivel_atividade: '',
    observacoes: '',
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSalvar(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">Novo Paciente</h2>
          <button className="btn-icon" onClick={onCancelar} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section-title">Dados Pessoais</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome completo *</label>
              <input className="form-input" type="text" value={form.nome} onChange={set('nome')} required placeholder="Ex: Maria Silva" />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Nascimento</label>
              <input className="form-input" type="date" value={form.data_nascimento} onChange={set('data_nascimento')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sexo</label>
              <select className="form-input" value={form.sexo} onChange={set('sexo')}>
                <option value="">Selecione</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" type="text" value={form.whatsapp} onChange={set('whatsapp')} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="paciente@email.com" />
          </div>

          <div className="form-section-title">Medidas e Objetivos</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Peso inicial (kg)</label>
              <input className="form-input" type="number" step="0.1" value={form.peso_inicial} onChange={set('peso_inicial')} placeholder="Ex: 72.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Altura (m)</label>
              <input className="form-input" type="number" step="0.01" value={form.altura} onChange={set('altura')} placeholder="Ex: 1.68" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nível de atividade física</label>
            <select className="form-input" value={form.nivel_atividade} onChange={set('nivel_atividade')}>
              <option value="">Selecione</option>
              <option value="Sedentário">Sedentário</option>
              <option value="Levemente ativo">Levemente ativo</option>
              <option value="Moderadamente ativo">Moderadamente ativo</option>
              <option value="Muito ativo">Muito ativo</option>
              <option value="Extremamente ativo">Extremamente ativo</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Objetivo</label>
            <input className="form-input" type="text" value={form.objetivo_texto} onChange={set('objetivo_texto')} placeholder="Ex: Perda de peso, ganho de massa..." />
          </div>

          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-input form-textarea" value={form.observacoes} onChange={set('observacoes')} placeholder="Informações adicionais relevantes..." rows={3} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancelar} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar Paciente</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página de Pacientes ──────────────────────────────────────────────────────
export default function Pacientes() {
  const { data: session } = useSession();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState('');

  const userId = session?.user?.id;

  // Carrega a lista de pacientes
  const carregarPacientes = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setErro(null);
      const [rows] = await runQueriesWithRLS(userId, [
        sql`SELECT id, nome, data_nascimento, sexo, whatsapp, email, peso_inicial, altura, objetivo_texto, created_at
            FROM public.pacientes
            ORDER BY created_at DESC;`
      ]);
      setPacientes(rows || []);
    } catch (err) {
      setErro('Erro ao carregar a lista de pacientes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    carregarPacientes();
  }, [carregarPacientes]);

  // Salva novo paciente
  const handleSalvar = async (form) => {
    if (!userId) return;
    try {
      setSalvando(true);
      setErro(null);

      const peso = form.peso_inicial ? parseFloat(form.peso_inicial) : null;
      const altura = form.altura ? parseFloat(form.altura) : null;
      const dataNasc = form.data_nascimento || null;

      await runQueriesWithRLS(userId, [
        sql`INSERT INTO public.pacientes
            (nutricionista_id, nome, data_nascimento, sexo, whatsapp, email,
             peso_inicial, altura, objetivo_texto, nivel_atividade, observacoes)
            VALUES (${userId}, ${form.nome}, ${dataNasc}, ${form.sexo || null},
                    ${form.whatsapp || null}, ${form.email || null},
                    ${peso}, ${altura},
                    ${form.objetivo_texto || null}, ${form.nivel_atividade || null},
                    ${form.observacoes || null})`
      ]);

      setSucesso('Paciente cadastrado com sucesso!');
      setShowForm(false);
      await carregarPacientes();
      setTimeout(() => setSucesso(null), 3000);
    } catch (err) {
      setErro('Erro ao salvar paciente. Tente novamente.');
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  // Filtra pacientes pelo campo de busca
  const pacientesFiltrados = pacientes.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.email?.toLowerCase().includes(busca.toLowerCase())
  );

  // Calcula idade
  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return null;
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  return (
    <div>
      {/* Cabeçalho da página */}
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Pacientes</h1>
          <p className="page-subtitle">
            {loading ? 'Carregando...' : `${pacientes.length} paciente${pacientes.length !== 1 ? 's' : ''} cadastrado${pacientes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          Novo Paciente
        </button>
      </div>

      {/* Alertas */}
      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} /> {erro}
        </div>
      )}
      {sucesso && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          {sucesso}
        </div>
      )}

      {/* Barra de busca */}
      {!loading && pacientes.length > 0 && (
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nome ou email..."
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
            {busca ? 'Tente outro termo de busca.' : 'Clique em "Novo Paciente" para começar.'}
          </p>
        </div>
      ) : (
        <div className="pacientes-list">
          {pacientesFiltrados.map(p => {
            const idade = calcularIdade(p.data_nascimento);
            return (
              <div key={p.id} className="paciente-card">
                <div className="paciente-avatar">
                  <User size={24} />
                </div>
                <div className="paciente-info">
                  <h3 className="paciente-nome">{p.nome}</h3>
                  <div className="paciente-detalhes">
                    {idade !== null && <span>{idade} anos</span>}
                    {p.sexo && <span>{p.sexo}</span>}
                    {p.objetivo_texto && <span className="paciente-objetivo">{p.objetivo_texto}</span>}
                  </div>
                  <div className="paciente-contatos">
                    {p.whatsapp && (
                      <span className="paciente-contato"><Phone size={13} /> {p.whatsapp}</span>
                    )}
                    {p.email && (
                      <span className="paciente-contato"><Mail size={13} /> {p.email}</span>
                    )}
                    {p.peso_inicial && (
                      <span className="paciente-contato">{p.peso_inicial} kg</span>
                    )}
                  </div>
                </div>
                <div className="paciente-arrow">
                  <ChevronRight size={20} color="var(--text-muted)" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de cadastro */}
      {showForm && (
        <FormCadastroPaciente
          onSalvar={handleSalvar}
          onCancelar={() => setShowForm(false)}
          loading={salvando}
        />
      )}
    </div>
  );
}
