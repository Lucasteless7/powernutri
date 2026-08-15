import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, AlertCircle, Loader2 } from 'lucide-react';
import { signUp } from '../lib/auth';

export default function Cadastro() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCadastro = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp.email({
        email,
        password,
        name,
      });

      if (authError) {
        console.error('SignUp error:', authError);
        const errorMsg = (authError.message || JSON.stringify(authError)).toLowerCase();
        if (
          errorMsg.includes('already exists') ||
          errorMsg.includes('already registered') ||
          errorMsg.includes('user_already_exists') ||
          errorMsg.includes('duplicate') ||
          authError.status === 422
        ) {
          setError('Este email já está cadastrado. Faça login ou utilize outro email.');
        } else {
          setError(authError.message || 'Erro ao criar conta. Verifique os dados fornecidos.');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('SignUp exception:', err);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
        setError('Este email já está cadastrado. Faça login ou utilize outro email.');
      } else {
        setError(msg || 'Ocorreu um erro ao tentar criar a conta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <HeartPulse color="var(--primary)" size={32} />
            PowerNutri
          </div>
          <h1 className="auth-title">Crie sua conta</h1>
          <p className="auth-subtitle">Junte-se à plataforma completa para nutricionistas.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleCadastro}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nome completo</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Ex: Dra. Maria Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirmar Senha</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Criar conta'}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Faça login</Link>
        </div>
      </div>
    </div>
  );
}
