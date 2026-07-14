import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">湯めぐり新潟 管理者ダッシュボード</div>
        <nav className="main-nav">
          <NavLink to="/onsens" className={({ isActive }) => (isActive ? 'active' : '')}>
            温泉地管理
          </NavLink>
          <NavLink to="/reviews" className={({ isActive }) => (isActive ? 'active' : '')}>
            レビュー管理
          </NavLink>
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
