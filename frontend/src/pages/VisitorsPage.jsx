import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { visitorApi } from '../api/client';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, Loading } from '../components/States';
import { STATUS_OPTIONS } from '../constants/status';
import { formatDateTime } from '../utils/format';

const EMPTY_FILTERS = { status: '', date: '', keyword: '' };

function DetailFields({ visitor }) {
  return (
    <dl className="detail-grid">
      <dt>登记编号</dt>
      <dd>#{visitor.id}</dd>
      <dt>姓名</dt>
      <dd>{visitor.name}</dd>
      <dt>联系电话</dt>
      <dd>{visitor.phone}</dd>
      <dt>所属单位</dt>
      <dd>{visitor.organization || '—'}</dd>
      <dt>被访人</dt>
      <dd>{visitor.hostName}</dd>
      <dt>来访事由</dt>
      <dd>{visitor.purpose}</dd>
      <dt>进入时间</dt>
      <dd>{formatDateTime(visitor.entryTime)}</dd>
      <dt>状态</dt>
      <dd>
        <StatusBadge status={visitor.status} />
      </dd>
      <dt>离开时间</dt>
      <dd>{formatDateTime(visitor.leaveTime)}</dd>
      <dt>访客证号</dt>
      <dd>{visitor.badgeNo || '—'}</dd>
      <dt>访客证归还</dt>
      <dd>{visitor.badgeReturned ? '已归还' : '未归还'}</dd>
      <dt>陪同员工</dt>
      <dd>{visitor.companion || '—'}</dd>
      <dt>备注</dt>
      <dd>{visitor.note || '—'}</dd>
      <dt>创建时间</dt>
      <dd>{formatDateTime(visitor.createdAt)}</dd>
      <dt>更新时间</dt>
      <dd>{formatDateTime(visitor.updatedAt)}</dd>
    </dl>
  );
}

export default function VisitorsPage() {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState(EMPTY_FILTERS);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [detail, setDetail] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [badgeReturned, setBadgeReturned] = useState(true);
  const [dialogError, setDialogError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await visitorApi.list(query);
      setVisitors(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (field) => (event) => {
    const { value } = event.target;
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setQuery({ ...draft });
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setQuery(EMPTY_FILTERS);
  };

  const openDetail = async (visitor) => {
    setDetail({ preview: visitor, visitor: null, loading: true, error: '' });
    try {
      const data = await visitorApi.get(visitor.id);
      setDetail({ preview: visitor, visitor: data, loading: false, error: '' });
    } catch (requestError) {
      setDetail({ preview: visitor, visitor: null, loading: false, error: requestError.message });
    }
  };

  const openCheckout = (visitor) => {
    setCheckoutTarget(visitor);
    setBadgeReturned(true);
    setDialogError('');
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    if (!checkoutTarget) return;

    setSubmitting(true);
    setDialogError('');
    try {
      await visitorApi.checkout(checkoutTarget.id, badgeReturned);
      setNotice(`已登记 ${checkoutTarget.name} 离场。`);
      setCheckoutTarget(null);
      await load();
    } catch (requestError) {
      setDialogError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeCheckout = () => {
    if (submitting) return;
    setCheckoutTarget(null);
    setDialogError('');
  };

  return (
    <>
      <PageHeader
        title="访客记录"
        description="按状态、日期或关键词查询访客记录，并办理离场登记。"
        actions={
          <Link className="btn btn-primary" to="/register">
            登记新访客
          </Link>
        }
      />

      {notice ? (
        <Alert tone="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      ) : null}

      <section className="panel" aria-labelledby="filters-heading">
        <div className="panel__head">
          <h2 id="filters-heading">筛选条件</h2>
        </div>
        <div className="panel__body">
          <form className="filters" onSubmit={applyFilters}>
            <div className="field">
              <label htmlFor="filter-status">状态</label>
              <select id="filter-status" className="select" value={draft.status} onChange={updateDraft('status')}>
                <option value="">全部状态</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="filter-date">进入日期</label>
              <input
                id="filter-date"
                type="date"
                className="input"
                value={draft.date}
                onChange={updateDraft('date')}
              />
            </div>

            <div className="field">
              <label htmlFor="filter-keyword">关键词</label>
              <input
                id="filter-keyword"
                type="search"
                className="input"
                value={draft.keyword}
                onChange={updateDraft('keyword')}
                placeholder="姓名 / 电话 / 单位 / 被访人"
              />
            </div>

            <div className="filters__actions">
              <button type="submit" className="btn btn-primary">
                查询
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetFilters}>
                重置
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel" aria-labelledby="records-heading">
        <div className="panel__head">
          <h2 id="records-heading">查询结果</h2>
          <span className="count-pill">{visitors.length} 条</span>
        </div>

        {error ? (
          <div className="panel__body">
            <Alert
              tone="error"
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                  重试
                </button>
              }
            >
              记录加载失败：{error}
            </Alert>
          </div>
        ) : loading ? (
          <Loading label="正在加载访客记录…" />
        ) : visitors.length === 0 ? (
          <EmptyState
            icon="○"
            title="没有符合条件的访客记录"
            description="尝试调整筛选条件，或先登记一位访客。"
            action={
              <Link className="btn btn-secondary btn-sm" to="/register">
                去登记访客
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">访客</th>
                  <th scope="col">联系电话</th>
                  <th scope="col">所属单位</th>
                  <th scope="col">被访人</th>
                  <th scope="col">来访事由</th>
                  <th scope="col">进入时间</th>
                  <th scope="col">状态</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => (
                  <tr key={visitor.id}>
                    <td data-label="访客">
                      <span className="cell-strong">{visitor.name}</span>
                      <span className="cell-sub">#{visitor.id}</span>
                    </td>
                    <td data-label="联系电话">{visitor.phone}</td>
                    <td data-label="所属单位">{visitor.organization || '—'}</td>
                    <td data-label="被访人">{visitor.hostName}</td>
                    <td data-label="来访事由" className="cell-purpose">
                      {visitor.purpose}
                    </td>
                    <td data-label="进入时间" className="cell-nowrap">
                      {formatDateTime(visitor.entryTime)}
                    </td>
                    <td data-label="状态">
                      <StatusBadge status={visitor.status} />
                    </td>
                    <td data-label="操作">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openDetail(visitor)}
                        >
                          详情
                        </button>
                        {visitor.status === 'CONFIRMED' ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openCheckout(visitor)}
                          >
                            离场
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail ? (
        <Modal
          title={`访客详情 · ${detail.preview?.name ?? ''}`}
          subtitle={detail.preview ? `登记编号 #${detail.preview.id}` : undefined}
          onClose={() => setDetail(null)}
        >
          <div className="modal__body">
            {detail.loading ? (
              <Loading label="正在加载详情…" />
            ) : detail.error ? (
              <Alert tone="error">详情加载失败：{detail.error}</Alert>
            ) : detail.visitor ? (
              <DetailFields visitor={detail.visitor} />
            ) : null}
          </div>
          <div className="modal__foot">
            <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>
              关闭
            </button>
          </div>
        </Modal>
      ) : null}

      {checkoutTarget ? (
        <Modal
          title="登记访客离场"
          subtitle={`${checkoutTarget.name} · 访客证 ${checkoutTarget.badgeNo ?? '—'}`}
          onClose={closeCheckout}
        >
          <form onSubmit={handleCheckout}>
            <div className="modal__body">
              {dialogError ? <Alert tone="error">{dialogError}</Alert> : null}
              <div className="field">
                <span className="field-label">访客证归还</span>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={badgeReturned}
                    onChange={(event) => setBadgeReturned(event.target.checked)}
                  />
                  <span>已归还临时访客证</span>
                </label>
                <p className="field-hint">离场将记录离开时间，并把状态更新为已离场。</p>
              </div>

              <dl className="detail-grid detail-grid--compact">
                <dt>被访人</dt>
                <dd>{checkoutTarget.hostName}</dd>
                <dt>进入时间</dt>
                <dd>{formatDateTime(checkoutTarget.entryTime)}</dd>
              </dl>
            </div>

            <div className="modal__foot">
              <button type="button" className="btn btn-secondary" onClick={closeCheckout} disabled={submitting}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? '提交中…' : '确认离场'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
