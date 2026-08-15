import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth';
import { sql, runQueriesWithRLS } from '../lib/db';
import {
  ArrowLeft, Save, Loader2, AlertCircle, Plus, Trash2, Dumbbell, Activity
} from 'lucide-react';

const DIAS_SEMANA = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
];

export default function RotinaTreino() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [paciente, setPaciente] = useState(null);
  const [rotina, setRotina] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState(null);
  const userId = session?.user?.id;

  const carregarDados = useCallback(async () => {
    if (!userId || !id) return;
    try {
      setLoading(true);
      const [rows] = await runQueriesWithRLS(userId, [
        sql`SELECT id, nome, rotina_treino FROM public.pacientes WHERE id = ${id} LIMIT 1`
      ]);
      if (rows && rows.length > 0) {
        setPaciente(rows[0]);
        setRotina(rows[0].rotina_treino || {});
      } else {
        setErro('Paciente não encontrado.');
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar dados do paciente.');
    } finally {
      setLoading(false);
    }
  }, [userId, id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSalvar = async () => {
    if (!userId || !id) return;
    setSaving(true);
    setErro(null);
    try {
      await runQueriesWithRLS(userId, [
        sql`UPDATE public.pacientes SET rotina_treino = ${JSON.stringify(rotina)} WHERE id = ${id}`
      ]);
      navigate(`/pacientes/${id}`);
    } catch (err) {
      console.error(err);
      setErro('Erro ao salvar rotina. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (dia, tipo) => {
    setRotina(prev => {
      const diaData = prev[dia] || [];
      return {
        ...prev,
        [dia]: [...diaData, tipo === 'exercicio'
          ? { id: Date.now(), tipo: 'exercicio', aparelho: '', series: '', repeticoes: '' }
          : { id: Date.now(), tipo: 'esporte', modalidade: '', duracao: '' }
        ]
      };
    });
  };

  const removeItem = (dia, itemId) => {
    setRotina(prev => {
      const diaData = prev[dia] || [];
      return { ...prev, [dia]: diaData.filter(i => i.id !== itemId) };
    });
  };

  const updateItem = (dia, itemId, campo, valor) => {
    setRotina(prev => {
      const diaData = prev[dia] || [];
      return {
        ...prev,
        [dia]: diaData.map(i => i.id === itemId ? { ...i, [campo]: valor } : i)
      };
    });
  };

  if (loading) return (
    <div className="loading-center">
      <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      <span>Carregando...</span>
    </div>
  );

  if (erro && !paciente) return (
    <div>
      <button className="btn-back" onClick={() => navigate(`/pacientes/${id}`)}>
        <ArrowLeft size={18} /> Voltar
      </button>
      <div className="alert alert-error" style={{ marginTop: '1rem' }}><AlertCircle size={18} /> {erro}</div>
    </div>
  );

  return (
    <div>
      {/* Cabeçalho */}
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div>
          <button className="btn-back" onClick={() => navigate(`/pacientes/${id}`)}>
            <ArrowLeft size={18} /> Voltar ao Perfil
          </button>
          <h1 className="dashboard-title" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            Rotina de Treino - {paciente.nome}
          </h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSalvar} disabled={saving}>
          {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar Rotina</>}
        </button>
      </div>

      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} /> {erro}
        </div>
      )}

      <div className="dias-treino-grid">
        {DIAS_SEMANA.map(dia => {
          const itens = rotina[dia] || [];
          return (
            <div key={dia} className="dia-card">
              <div className="dia-header">
                <h3 className="dia-title">{dia}</h3>
                <div className="dia-actions">
                  <button className="btn-icon btn-add-icon" title="Adicionar Exercício" onClick={() => addItem(dia, 'exercicio')}>
                    <Dumbbell size={16} />
                  </button>
                  <button className="btn-icon btn-add-icon" title="Adicionar Esporte/Cardio" onClick={() => addItem(dia, 'esporte')}>
                    <Activity size={16} />
                  </button>
                </div>
              </div>

              <div className="dia-content">
                {itens.length === 0 ? (
                  <div className="empty-message">Nenhuma atividade programada (Descanso)</div>
                ) : (
                  <div className="dia-itens-list">
                    {itens.map((item, idx) => (
                      <div key={item.id} className="treino-item">
                        <div className="treino-item-header">
                          <span className="treino-item-badge">
                            {item.tipo === 'exercicio' ? <><Dumbbell size={12}/> Exercício</> : <><Activity size={12}/> Esporte</>}
                          </span>
                          <button className="btn-icon btn-icon-danger" onClick={() => removeItem(dia, item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        {item.tipo === 'exercicio' ? (
                          <div className="treino-item-fields">
                            <input className="form-input form-input-sm" type="text" placeholder="Aparelho / Exercício..." value={item.aparelho} onChange={e => updateItem(dia, item.id, 'aparelho', e.target.value)} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input className="form-input form-input-sm" type="text" placeholder="Séries" value={item.series} onChange={e => updateItem(dia, item.id, 'series', e.target.value)} />
                              <input className="form-input form-input-sm" type="text" placeholder="Reps" value={item.repeticoes} onChange={e => updateItem(dia, item.id, 'repeticoes', e.target.value)} />
                            </div>
                          </div>
                        ) : (
                          <div className="treino-item-fields">
                            <input className="form-input form-input-sm" type="text" placeholder="Esporte / Cardio..." value={item.modalidade} onChange={e => updateItem(dia, item.id, 'modalidade', e.target.value)} />
                            <input className="form-input form-input-sm" type="text" placeholder="Duração (ex: 45 min)" value={item.duracao} onChange={e => updateItem(dia, item.id, 'duracao', e.target.value)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
