import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { NotAuthorizedPage } from './pages/NotAuthorizedPage';
import { OnsenFormPage } from './pages/OnsenFormPage';
import { OnsensPage } from './pages/OnsensPage';
import { ReviewsPage } from './pages/ReviewsPage';

export default function App() {
  const { loading, session, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="centered-page">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (!session) return <LoginPage />;
  if (!isAdmin) return <NotAuthorizedPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/onsens" replace />} />
        <Route path="/onsens" element={<OnsensPage />} />
        <Route path="/onsens/:id" element={<OnsenFormPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="*" element={<Navigate to="/onsens" replace />} />
      </Route>
    </Routes>
  );
}
