import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '前台看板', end: true },
  { to: '/register', label: '访客登记' },
  { to: '/visitors', label: '访客记录' },
  { to: '/policy', label: '制度说明' },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              访
            </span>
            <span className="brand__text">
              <strong>公司访客管理</strong>
              <span>前台工作台</span>
            </span>
          </div>

          <nav className="nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="page">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>公司访客管理系统</span>
          <span>依据《公司访客管理制度》执行 · 内部使用</span>
        </div>
      </footer>
    </div>
  );
}
