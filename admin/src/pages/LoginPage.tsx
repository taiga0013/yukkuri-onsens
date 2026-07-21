import { useState } from 'react';

import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    }
  };

  return (
    <div className="centered-page">
      <div className="login-card">
        <h1>湯っくり 管理者ダッシュボード</h1>
        <p className="muted">管理者権限を持つGoogleアカウントでログインしてください。</p>
        <button onClick={onClick}>Googleでログイン</button>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
