import { useAuth } from '../context/AuthContext';

export function NotAuthorizedPage() {
  const { signOut, profile } = useAuth();

  return (
    <div className="centered-page">
      <div className="login-card">
        <h1>権限がありません</h1>
        <p className="muted">
          {profile?.display_name ?? 'このアカウント'} は管理者権限（role = admin）を持っていません。
          <br />
          Supabase の SQL Editor で <code>profiles.role</code> を <code>'admin'</code> に変更してもらってください。
        </p>
        <button onClick={() => signOut()}>ログアウト</button>
      </div>
    </div>
  );
}
