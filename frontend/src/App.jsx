import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout     from './components/Layout/Layout';
import LoginPage  from './pages/LoginPage';
import Dashboard  from './pages/Dashboard';
import MedicationsPage from './pages/MedicationsPage';
import StockPage  from './pages/StockPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage  from './pages/UsersPage';
import AIPage     from './pages/AIPage';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="medications" element={<MedicationsPage />} />

        <Route path="stock"   element={
          <PrivateRoute roles={['admin','pharmacien','responsable_stock']}>
            <StockPage />
          </PrivateRoute>
        } />

        <Route path="alerts"  element={
          <PrivateRoute roles={['admin','pharmacien','responsable_stock']}>
            <AlertsPage />
          </PrivateRoute>
        } />

        <Route path="reports" element={
          <PrivateRoute roles={['admin','pharmacien','responsable_stock']}>
            <ReportsPage />
          </PrivateRoute>
        } />

        <Route path="users"   element={
          <PrivateRoute roles={['admin']}>
            <UsersPage />
          </PrivateRoute>
        } />

        <Route path="ai"      element={
          <PrivateRoute roles={['admin','pharmacien','responsable_stock']}>
            <AIPage />
          </PrivateRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
