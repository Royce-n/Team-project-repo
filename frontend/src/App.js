import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserForm from './pages/UserForm';
import Roles from './pages/Roles';
import Profile from './pages/Profile';
import PetitionsList from './pages/PetitionsList';
import NewPetition from './pages/NewPetition';
import PetitionDetail from './pages/PetitionDetail';
import ApprovalQueue from './pages/ApprovalQueue';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/new" element={<UserForm />} />
        <Route path="/users/:id/edit" element={<UserForm />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/petitions" element={<PetitionsList />} />
        <Route path="/petitions/new" element={<NewPetition />} />
        <Route path="/petitions/:id" element={<PetitionDetail />} />
        <Route path="/approvals" element={<ApprovalQueue />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
