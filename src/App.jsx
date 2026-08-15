import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSession } from './lib/auth';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import NovoPaciente from './pages/NovoPaciente';
import PerfilPaciente from './pages/PerfilPaciente';
import Layout from './components/Layout';

// Componente para proteger rotas (Dashboard)
const ProtectedRoute = () => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Componente para rotas públicas (Login/Cadastro)
const PublicRoute = () => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        Carregando...
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/pacientes/novo" element={<NovoPaciente />} />
            <Route path="/pacientes/:id" element={<PerfilPaciente />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
