import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useSession } from '../lib/auth';
import { sql, runQueriesWithRLS } from '../lib/db';
import {
  User, Activity, Coffee, ArrowLeft, ArrowRight,
  Save, Loader2, AlertCircle, Check
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularIMC(peso, alturaCm) {
  const p = parseFloat(peso);
  const a = parseFloat(alturaCm) / 100;
  if (!p || !a || a <= 0) return null;
  const imc = p / (a * a);
  return imc.toFixed(1);
}

function classificarIMC(imc) {
  const v = parseFloat(imc);
  if (!v) return '';
  if (v < 18.5) return 'Abaixo do peso';
  if (v < 25) return 'Peso normal';
  if (v < 30) return 'Sobrepeso';
  if (v < 35) return 'Obesidade grau I';
  if (v < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

function converterHora(valor) {
  const num = parseInt(String(valor).replace(/\D/g, ''));
  if (isNaN(num) || valor === '') return '';
  if (num < 100) {
    const h = Math.min(num, 23);
    return `${String(h).padStart(2, '0')}:00`;
  }
  const h = Math.min(Math.floor(num / 100), 23);
  const m = Math.min(num % 100, 59);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calcularIdade(dataNasc) {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade >= 0 ? idade : null;
}

// ─── Componente de chips multi-seleção ───────────────────────────────────────

function ChipSelect({ opcoes, selecionados, onChange, temNenhum }) {
  const toggle = (opcao) => {
    if (opcao === 'Nenhum') {
      onChange(['Nenhum']);
      return;
    }
    const sem = selecionados.filter(s => s !== 'Nenhum');
    if (sem.includes(opcao)) onChange(sem.filter(s => s !== opcao));
    else onChange([...sem, opcao]);
  };

  return (
    <div className="chip-group">
      {temNenhum && (
        <button type="button"
          className={`chip ${selecionados.includes('Nenhum') ? 'chip-active' : ''}`}
          onClick={() => toggle('Nenhum')}>
          {selecionados.includes('Nenhum') && <Check size={12} />} Nenhum
        </button>
      )}
      {opcoes.map(op => (
        <button type="button" key={op}
          className={`chip ${selecionados.includes(op) ? 'chip-active' : ''}`}
          onClick={() => toggle(op)}>
          {selecionados.includes(op) && <Check size={12} />} {op}
        </button>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = ['Pessoal', 'Clínico', 'Hábitos'];
const TAB_ICONS = [User, Activity, Coffee];

const FORM_INICIAL = {
  // Pessoal
  nome: '', data_nascimento: '', sexo: '', telefone: '', whatsapp: '', email: '',
  // Clínico
  peso_inicial: '', altura: '', objetivo_texto: '', objetivos: [],
  nivel_atividade: '', patologias: [], restricoes_alimentares: [], alergias: [],
  medicamentos: '', suplementos: '',
  // Hábitos
  refeicoes_por_dia: '', horario_acorda: '', horario_dorme: '',
  litros_agua: '', atividade_fisica: false, atividade_fisica_descricao: '',
  observacoes: '',
};

export default function NovoPaciente() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [abaAtual, setAbaAtual] = useState(0);
  const [form, setForm] = useState(FORM_INICIAL);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState(null);

  const { role } = useOutletContext();

  if (role === 'personal') {
    return (
      <div className="alert alert-error">
        Acesso negado. Apenas nutricionistas podem criar pacientes.
      </div>
    );
  }

  const userId = session?.user?.id;
  const imc = calcularIMC(form.peso_inicial, form.altura);
  const idade = calcularIdade(form.data_nascimento);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
  };
  const setArr = (field) => (arr) => setForm(prev => ({ ...prev, [field]: arr }));

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro('O nome completo é obrigatório.'); setAbaAtual(0); return; }
    if (!userId) return;
    setSaving(true);
    setErro(null);

    try {
      const peso = form.peso_inicial ? parseFloat(form.peso_inicial) : null;
      const altura = form.altura ? parseFloat(form.altura) : null;
      const refeicoes = form.refeicoes_por_dia ? parseInt(form.refeicoes_por_dia) : null;
      const litros = form.litros_agua ? parseFloat(form.litros_agua) : null;
      const dataNasc = form.data_nascimento || null;

      const horaAcorda = form.horario_acorda ? converterHora(form.horario_acorda) : null;
      const horaDorme = form.horario_dorme ? converterHora(form.horario_dorme) : null;

      const objetivos = form.objetivos.filter(o => o !== 'Nenhum');
      const patologias = form.patologias.filter(o => o !== 'Nenhum');
      const restricoes = form.restricoes_alimentares.filter(o => o !== 'Nenhum');
      const alergias = form.alergias.filter(o => o !== 'Nenhum');

      const [rows] = await runQueriesWithRLS(userId, [
        sql`INSERT INTO public.pacientes
            (nutricionista_id, nome, data_nascimento, sexo, whatsapp, email,
             peso_inicial, altura, objetivos, objetivo_texto, nivel_atividade,
             patologias, restricoes_alimentares, alergias, medicamentos, suplementos,
             refeicoes_por_dia, horario_acorda, horario_dorme, litros_agua,
             atividade_fisica, atividade_fisica_descricao, observacoes)
            VALUES
            (${userId}, ${form.nome.trim()}, ${dataNasc}, ${form.sexo || null},
             ${form.whatsapp || null}, ${form.email || null},
             ${peso}, ${altura}, ${objetivos}, ${form.objetivo_texto || null},
             ${form.nivel_atividade || null}, ${patologias}, ${restricoes}, ${alergias},
             ${form.medicamentos || null}, ${form.suplementos || null},
             ${refeicoes}, ${horaAcorda}, ${horaDorme}, ${litros},
             ${form.atividade_fisica}, ${form.atividade_fisica_descricao || null},
             ${form.observacoes || null})
            RETURNING id`
      ]);

      const novoId = rows?.[0]?.id;
      if (novoId) navigate(`/pacientes/${novoId}?novo=1`);
      else navigate('/pacientes');
    } catch (err) {
      console.error(err);
      setErro('Erro ao salvar paciente. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/pacientes')}>
            <ArrowLeft size={18} /> Pacientes
          </button>
          <h1 className="dashboard-title" style={{ marginTop: '0.5rem' }}>Novo Paciente</h1>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} /> {erro}
        </div>
      )}

      <form onSubmit={handleSalvar}>
        <div className="form-card">
          {/* Abas de navegação */}
          <div className="tabs-nav">
            {TABS.map((tab, i) => {
              const Icon = TAB_ICONS[i];
              return (
                <button key={tab} type="button"
                  className={`tab-btn ${abaAtual === i ? 'tab-btn-active' : ''}`}
                  onClick={() => setAbaAtual(i)}>
                  <Icon size={16} />
                  <span>{tab}</span>
                  <span className={`tab-indicator ${abaAtual === i ? 'active' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* ── ABA 1: Pessoal ── */}
          {abaAtual === 0 && (
            <div className="tab-content">
              <div className="form-section-title">Identificação</div>
              <div className="form-group">
                <label className="form-label">Nome completo *</label>
                <input className="form-input" type="text" value={form.nome}
                  onChange={set('nome')} required placeholder="Ex: Maria Silva" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Data de nascimento
                    {idade !== null && <span className="field-badge">{idade} anos</span>}
                  </label>
                  <input className="form-input" type="date" value={form.data_nascimento}
                    onChange={set('data_nascimento')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sexo</label>
                  <div className="radio-group">
                    {['Feminino', 'Masculino', 'Outro'].map(op => (
                      <label key={op} className={`radio-btn ${form.sexo === op ? 'radio-active' : ''}`}>
                        <input type="radio" name="sexo" value={op}
                          checked={form.sexo === op} onChange={set('sexo')} hidden />
                        {op}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-section-title">Contato</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" type="text" value={form.telefone}
                    onChange={set('telefone')} placeholder="(11) 3333-4444" />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <input className="form-input" type="text" value={form.whatsapp}
                    onChange={set('whatsapp')} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email}
                  onChange={set('email')} placeholder="paciente@email.com" />
              </div>
            </div>
          )}

          {/* ── ABA 2: Clínico ── */}
          {abaAtual === 1 && (
            <div className="tab-content">
              <div className="form-section-title">Medidas</div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Peso atual</label>
                  <div className="input-suffix-wrap">
                    <input className="form-input" type="number" step="0.1" min="0"
                      value={form.peso_inicial} onChange={set('peso_inicial')} placeholder="72,5" />
                    <span className="input-suffix">kg</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Altura</label>
                  <div className="input-suffix-wrap">
                    <input className="form-input" type="number" step="1" min="0"
                      value={form.altura} onChange={set('altura')} placeholder="168" />
                    <span className="input-suffix">cm</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">IMC
                    {imc && <span className="field-badge">{classificarIMC(imc)}</span>}
                  </label>
                  <div className="input-suffix-wrap">
                    <input className="form-input imc-field" type="text" value={imc || '—'} readOnly />
                    {imc && <span className="input-suffix">kg/m²</span>}
                  </div>
                </div>
              </div>

              <div className="form-section-title">Objetivos</div>
              <ChipSelect
                opcoes={['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar']}
                selecionados={form.objetivos} onChange={setArr('objetivos')} />
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Objetivo em texto livre</label>
                <input className="form-input" type="text" value={form.objetivo_texto}
                  onChange={set('objetivo_texto')} placeholder="Descreva o objetivo do paciente..." />
              </div>

              <div className="form-section-title">Nível de Atividade Física</div>
              <div className="radio-group-vertical">
                {['Sedentário', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo', 'Extremamente ativo'].map(op => (
                  <label key={op} className={`radio-btn-h ${form.nivel_atividade === op ? 'radio-active' : ''}`}>
                    <input type="radio" name="nivel_atividade" value={op}
                      checked={form.nivel_atividade === op} onChange={set('nivel_atividade')} hidden />
                    {op}
                  </label>
                ))}
              </div>

              <div className="form-section-title">Patologias / Condições de Saúde</div>
              <ChipSelect temNenhum
                opcoes={['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto']}
                selecionados={form.patologias} onChange={setArr('patologias')} />

              <div className="form-section-title">Restrições Alimentares</div>
              <ChipSelect temNenhum
                opcoes={['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar']}
                selecionados={form.restricoes_alimentares} onChange={setArr('restricoes_alimentares')} />

              <div className="form-section-title">Alergias Alimentares</div>
              <ChipSelect temNenhum
                opcoes={['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar']}
                selecionados={form.alergias} onChange={setArr('alergias')} />

              <div className="form-section-title">Medicamentos e Suplementos</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Medicamentos contínuos</label>
                  <textarea className="form-input form-textarea" rows={2}
                    value={form.medicamentos} onChange={set('medicamentos')}
                    placeholder="Ex: Metformina, Levotiroxina..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Suplementos em uso</label>
                  <textarea className="form-input form-textarea" rows={2}
                    value={form.suplementos} onChange={set('suplementos')}
                    placeholder="Ex: Whey protein, Creatina..." />
                </div>
              </div>
            </div>
          )}

          {/* ── ABA 3: Hábitos ── */}
          {abaAtual === 2 && (
            <div className="tab-content">
              <div className="form-section-title">Alimentação</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Refeições por dia</label>
                  <input className="form-input" type="number" min="1" max="10"
                    value={form.refeicoes_por_dia} onChange={set('refeicoes_por_dia')}
                    placeholder="Ex: 5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Água por dia</label>
                  <div className="input-suffix-wrap">
                    <input className="form-input" type="number" step="0.1" min="0"
                      value={form.litros_agua} onChange={set('litros_agua')} placeholder="2,5" />
                    <span className="input-suffix">litros</span>
                  </div>
                </div>
              </div>

              <div className="form-section-title">Rotina de Sono</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Horário que acorda
                    {form.horario_acorda && <span className="field-badge">{converterHora(form.horario_acorda)}</span>}
                  </label>
                  <input className="form-input" type="text" inputMode="numeric"
                    value={form.horario_acorda} onChange={set('horario_acorda')}
                    placeholder="Ex: 6 → 06:00  ou  630 → 06:30" />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Horário que dorme
                    {form.horario_dorme && <span className="field-badge">{converterHora(form.horario_dorme)}</span>}
                  </label>
                  <input className="form-input" type="text" inputMode="numeric"
                    value={form.horario_dorme} onChange={set('horario_dorme')}
                    placeholder="Ex: 23 → 23:00  ou  2230 → 22:30" />
                </div>
              </div>

              <div className="form-section-title">Atividade Física</div>
              <label className="toggle-wrap">
                <div className={`toggle ${form.atividade_fisica ? 'toggle-on' : ''}`}
                  onClick={() => setForm(p => ({ ...p, atividade_fisica: !p.atividade_fisica }))}>
                  <div className="toggle-knob" />
                </div>
                <span className="toggle-label">
                  {form.atividade_fisica ? 'Sim, pratica atividade física' : 'Não pratica atividade física'}
                </span>
              </label>
              {form.atividade_fisica && (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Qual atividade e frequência semanal?</label>
                  <input className="form-input" type="text" value={form.atividade_fisica_descricao}
                    onChange={set('atividade_fisica_descricao')}
                    placeholder="Ex: Musculação 4x/semana + caminhada 3x/semana" />
                </div>
              )}

              <div className="form-section-title">Observações Gerais</div>
              <div className="form-group">
                <textarea className="form-input form-textarea" rows={4}
                  value={form.observacoes} onChange={set('observacoes')}
                  placeholder="Informações relevantes sobre o paciente..." />
              </div>
            </div>
          )}

          {/* Botões de navegação */}
          <div className="tabs-footer">
            <div>
              {abaAtual > 0 && (
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => setAbaAtual(a => a - 1)}>
                  <ArrowLeft size={16} /> Anterior
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className="tab-progress">{abaAtual + 1} / {TABS.length}</span>
              {abaAtual < TABS.length - 1 ? (
                <button type="button" className="btn btn-primary btn-sm"
                  onClick={() => setAbaAtual(a => a + 1)}>
                  Próximo <ArrowRight size={16} />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving
                    ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                    : <><Save size={16} /> Salvar Paciente</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
