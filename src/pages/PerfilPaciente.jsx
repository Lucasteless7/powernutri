import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/auth';
import { sql, runQueriesWithRLS } from '../lib/db';
import {
  ArrowLeft, User, AlertCircle, Loader2, CheckCircle,
  Trash2, TriangleAlert
} from 'lucide-react';

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function InfoItem({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="profile-section">
      <h3 className="profile-section-title">{title}</h3>
      <div className="info-grid">{children}</div>
    </div>
  );
}

// ─── Modal de Confirmação de Exclusão ─────────────────────────────────────────

function ModalExclusao({ nomePaciente, onConfirmar, onCancelar, loading }) {
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('');
  const confirmacaoCorreta = confirmacaoTexto.trim().toLowerCase() === 'excluir';

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-danger">
        <div className="modal-header">
          <div className="modal-danger-icon">
            <TriangleAlert size={22} />
          </div>
          <h2 className="modal-title">Excluir paciente</h2>
          <button className="btn-icon" onClick={onCancelar} disabled={loading}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-danger-text">
            Você está prestes a excluir permanentemente o paciente{' '}
            <strong>{nomePaciente}</strong>. Esta ação{' '}
            <strong>não pode ser desfeita</strong> e todos os dados do paciente
            serão perdidos.
          </p>

          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label className="form-label">
              Para confirmar, digite <strong>excluir</strong> abaixo:
            </label>
            <input
              className="form-input"
              type="text"
              value={confirmacaoTexto}
              onChange={e => setConfirmacaoTexto(e.target.value)}
              placeholder="excluir"
              autoFocus
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onCancelar}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={onConfirmar}
            disabled={!confirmacaoCorreta || loading}
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Excluindo...</>
              : <><Trash2 size={16} /> Excluir permanentemente</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function PerfilPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [showSucesso] = useState(searchParams.get('novo') === '1');
  const [showModalExclusao, setShowModalExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const userId = session?.user?.id;

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return null;
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 0 ? `${idade} anos` : null;
  };

  const formatDate = (d) => {
    if (!d) return null;
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('pt-BR');
  };

  const calcularIMC = (peso, altura) => {
    const p = parseFloat(peso);
    const a = parseFloat(altura) / 100;
    if (!p || !a) return null;
    return (p / (a * a)).toFixed(1);
  };

  const carregarPaciente = useCallback(async () => {
    if (!userId || !id) return;
    try {
      setLoading(true);
      setErro(null);
      const [rows] = await runQueriesWithRLS(userId, [
        sql`SELECT * FROM public.pacientes WHERE id = ${id} LIMIT 1`
      ]);
      if (rows && rows.length > 0) setPaciente(rows[0]);
      else setErro('Paciente não encontrado.');
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar os dados do paciente.');
    } finally {
      setLoading(false);
    }
  }, [userId, id]);

  useEffect(() => { carregarPaciente(); }, [carregarPaciente]);

  const handleExcluir = async () => {
    if (!userId || !id) return;
    try {
      setExcluindo(true);
      await runQueriesWithRLS(userId, [
        sql`DELETE FROM public.pacientes WHERE id = ${id} AND nutricionista_id = ${userId}`
      ]);
      navigate('/pacientes?excluido=1');
    } catch (err) {
      console.error(err);
      setErro('Erro ao excluir o paciente. Tente novamente.');
      setShowModalExclusao(false);
    } finally {
      setExcluindo(false);
    }
  };

  if (loading) return (
    <div className="loading-center">
      <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      <span>Carregando...</span>
    </div>
  );

  if (erro && !paciente) return (
    <div>
      <button className="btn-back" onClick={() => navigate('/pacientes')}>
        <ArrowLeft size={18} /> Pacientes
      </button>
      <div className="alert alert-error" style={{ marginTop: '1rem' }}>
        <AlertCircle size={18} /> {erro}
      </div>
    </div>
  );

  const imc = calcularIMC(paciente.peso_inicial, paciente.altura);

  const getArr = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string') return val.replace(/[{}"]/g, '').split(',').filter(Boolean);
    return [];
  };

  return (
    <div>
      {/* Sucesso ao cadastrar */}
      {showSucesso && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={18} /> Paciente cadastrado com sucesso!
        </div>
      )}

      {/* Erro inline (ex: após falha na exclusão) */}
      {erro && paciente && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} /> {erro}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/pacientes')}>
            <ArrowLeft size={18} /> Pacientes
          </button>
          <h1 className="dashboard-title" style={{ marginTop: '0.5rem' }}>
            {paciente.nome}
          </h1>
        </div>

        {/* Botão excluir */}
        <button
          className="btn btn-danger btn-sm"
          onClick={() => setShowModalExclusao(true)}
        >
          <Trash2 size={16} /> Excluir Paciente
        </button>
      </div>

      {/* Card de perfil */}
      <div className="profile-hero">
        <div className="profile-avatar-lg">
          <User size={40} />
        </div>
        <div>
          <h2 className="profile-name">{paciente.nome}</h2>
          <div className="profile-badges">
            {calcularIdade(paciente.data_nascimento) && <span className="badge">{calcularIdade(paciente.data_nascimento)}</span>}
            {paciente.sexo && <span className="badge">{paciente.sexo}</span>}
            {imc && <span className="badge">IMC {imc}</span>}
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Dados pessoais */}
        <Section title="Dados Pessoais">
          <InfoItem label="Data de nascimento" value={formatDate(paciente.data_nascimento)} />
          <InfoItem label="Sexo" value={paciente.sexo} />
          <InfoItem label="Telefone" value={paciente.telefone} />
          <InfoItem label="WhatsApp" value={paciente.whatsapp} />
          <InfoItem label="Email" value={paciente.email} />
        </Section>

        {/* Medidas */}
        <Section title="Medidas Clínicas">
          <InfoItem label="Peso inicial" value={paciente.peso_inicial ? `${paciente.peso_inicial} kg` : null} />
          <InfoItem label="Altura" value={paciente.altura ? `${paciente.altura} cm` : null} />
          <InfoItem label="IMC" value={imc ? `${imc} kg/m²` : null} />
          <InfoItem label="Nível de atividade" value={paciente.nivel_atividade} />
        </Section>

        {/* Objetivos */}
        {(getArr(paciente.objetivos).length > 0 || paciente.objetivo_texto) && (
          <Section title="Objetivos">
            {getArr(paciente.objetivos).map(ob => (
              <span key={ob} className="badge badge-primary">{ob}</span>
            ))}
            {paciente.objetivo_texto && <InfoItem label="Objetivo" value={paciente.objetivo_texto} />}
          </Section>
        )}

        {/* Saúde */}
        {(getArr(paciente.patologias).length > 0 || getArr(paciente.restricoes_alimentares).length > 0 || getArr(paciente.alergias).length > 0) && (
          <Section title="Saúde e Restrições">
            {getArr(paciente.patologias).length > 0 && (
              <div className="info-item full-width">
                <span className="info-label">Patologias</span>
                <div className="badges-row">{getArr(paciente.patologias).map(p => <span key={p} className="badge badge-warn">{p}</span>)}</div>
              </div>
            )}
            {getArr(paciente.restricoes_alimentares).length > 0 && (
              <div className="info-item full-width">
                <span className="info-label">Restrições alimentares</span>
                <div className="badges-row">{getArr(paciente.restricoes_alimentares).map(r => <span key={r} className="badge badge-warn">{r}</span>)}</div>
              </div>
            )}
            {getArr(paciente.alergias).length > 0 && (
              <div className="info-item full-width">
                <span className="info-label">Alergias</span>
                <div className="badges-row">{getArr(paciente.alergias).map(a => <span key={a} className="badge badge-error">{a}</span>)}</div>
              </div>
            )}
          </Section>
        )}

        {/* Medicamentos */}
        {(paciente.medicamentos || paciente.suplementos) && (
          <Section title="Medicamentos e Suplementos">
            <InfoItem label="Medicamentos contínuos" value={paciente.medicamentos} />
            <InfoItem label="Suplementos" value={paciente.suplementos} />
          </Section>
        )}

        {/* Hábitos */}
        <Section title="Hábitos">
          <InfoItem label="Refeições/dia" value={paciente.refeicoes_por_dia} />
          <InfoItem label="Água/dia" value={paciente.litros_agua ? `${paciente.litros_agua} litros` : null} />
          <InfoItem label="Acorda às" value={paciente.horario_acorda} />
          <InfoItem label="Dorme às" value={paciente.horario_dorme} />
          <InfoItem label="Atividade física"
            value={paciente.atividade_fisica === true || paciente.atividade_fisica === 'true' ? 'Sim' : 'Não'} />
          <InfoItem label="Qual atividade" value={paciente.atividade_fisica_descricao} />
          <InfoItem label="Observações" value={paciente.observacoes} />
        </Section>
      </div>

      {/* Modal de exclusão */}
      {showModalExclusao && (
        <ModalExclusao
          nomePaciente={paciente.nome}
          onConfirmar={handleExcluir}
          onCancelar={() => setShowModalExclusao(false)}
          loading={excluindo}
        />
      )}
    </div>
  );
}
