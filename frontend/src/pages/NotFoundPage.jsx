import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1>页面不存在</h1>
      <p>你访问的地址没有对应的页面，可能链接已失效。</p>
      <Link className="btn btn-primary" to="/">
        返回前台看板
      </Link>
    </div>
  );
}
