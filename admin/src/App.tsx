import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { EditSuggestionsPage } from './pages/EditSuggestionsPage';
import { LoginPage } from './pages/LoginPage';
import { NotAuthorizedPage } from './pages/NotAuthorizedPage';
import { OnsenFormPage } from './pages/OnsenFormPage';
import { OnsensPage } from './pages/OnsensPage';
import { OwnerApplicationsPage } from './pages/OwnerApplicationsPage';
import { OwnerLinksPage } from './pages/OwnerLinksPage';
import { OwnerOnsensPage } from './pages/OwnerOnsensPage';
import { ReviewsPage } from './pages/ReviewsPage';

export default function App() {
  const { loading, session, isAdmin, isOwner } = useAuth();

  if (loading) {
    return (
      <div className="centered-page">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (!session) return <LoginPage />;
  if (!isAdmin && !isOwner) return <NotAuthorizedPage />;

  if (isOwner && !isAdmin) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/my-onsens" replace />} />
          <Route path="/my-onsens" element={<OwnerOnsensPage />} />
          <Route path="*" element={<Navigate to="/my-onsens" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/onsens" replace />} />
        <Route path="/onsens" element={<OnsensPage />} />
        <Route path="/onsens/:id" element={<OnsenFormPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/owner-applications" element={<OwnerApplicationsPage />} />
        <Route path="/owner-links" element={<OwnerLinksPage />} />
        <Route path="/edit-suggestions" element={<EditSuggestionsPage />} />
        <Route path="*" element={<Navigate to="/onsens" replace />} />
      </Route>
    </Routes>
  );
}
