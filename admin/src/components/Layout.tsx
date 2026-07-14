import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">湯めぐり新潟 {isAdmin ? '管理者ダッシュボード' : 'オーナーダッシュボード'}</div>
        <nav className="main-nav">
          {isAdmin ? (
            <>
              <NavLink to="/onsens" className={({ isActive }) => (isActive ? 'active' : '')}>
                温泉地管理
              </NavLink>
              <NavLink to="/reviews" className={({ isActive }) => (isActive ? 'active' : '')}>
                レビュー管理
              </NavLink>
              <NavLink to="/owner-applications" className={({ isActive }) => (isActive ? 'active' : '')}>
                オーナー申請
              </NavLink>
              <NavLink to="/edit-suggestions" className={({ isActive }) => (isActive ? 'active' : '')}>
                情報修正提案
              </NavLink>
            </>
          ) : (
            <NavLink to="/my-onsens" className={({ isActive }) => (isActive ? 'active' : '')}>
              自分の施設
            </NavLink>
          )}
        </nav>
        <div className="header-right">
          <span className="muted">{profile?.display_name}</span>
          <button className="link-button" onClick={() => signOut()}>
            ログアウト
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
