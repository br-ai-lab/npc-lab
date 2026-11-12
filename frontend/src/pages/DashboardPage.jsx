import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { visitorApi } from '../api/client';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { EmptyState, Loading } from '../components/States';
import { formatDateTime, initialOf } from '../utils/format';

function StatTile({ label, value, hero = false, hint }) {
  return (
    <div className={`stat-tile${hero ? ' stat-tile--hero' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  );
}

function VisitorSummary({ visitor }) {
  return (
    <div className="visitor-identity">
      <span className="avatar" aria-hidden="true">
        {initialOf(visitor.name)}
      </span>
      <div className="visitor-identity__text">
        <span className="visitor-name">{visitor.name}</span>
        <span className="visitor-sub">
          {visitor.phone}
          {visitor.organization ? ` · ${visitor.organization}` : ''}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [onSite, setOnSite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [companion, setCompanion] = useState('');
  const [reason, setReason] = useState('');
  const [badgeReturned, setBadgeReturned] = useState(true);
  const [dialogError, setDialogError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [statsData, pendingData, onSiteData] = await Promise.all([
        visitorApi.todayStats(),
        visitorApi.list({ status: 'PENDING' }),
        visitorApi.list({ status: 'CONFIRMED' }),
      ]);
      setStats(statsData);
      setPending(Array.isArray(pendingData) ? pendingData : []);
      setOnSite(Array.isArray(onSiteData) ? onSiteData : []);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (kind, visitor) => {
    setDialog({ kind, visitor });
    setCompanion('');
    setReason('');
    setBadgeReturned(true);
    setDialogError('');
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
    setDialogError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!dialog) return;

    if (dialog.kind === 'force' && !reason.trim()) {
      setDialogError('请填写强制离场原因。');
      return;
    }

    setSubmitting(true);
    setDialogError('');
    setNotice('');

    try {
      const { kind, visitor } = dialog;
      if (kind === 'confirm') {
        const updated = await visitorApi.confirm(visitor.id, companion.trim() || null);
        setNotice(`已确认 ${updated.name} 进入，访客证号 ${updated.badgeNo ?? '待生成'}。`);
      } else if (kind === 'reject') {
        await visitorApi.reject(visitor.id, reason.trim() || null);
        setNotice(`已拒绝 ${visitor.name} 进入。`);
      } else if (kind === 'checkout') {
        await visitorApi.checkout(visitor.id, badgeReturned);
        setNotice(`已登记 ${visitor.name} 离场。`);
      } else if (kind === 'force') {
        await visitorApi.forceLeave(visitor.id, reason.trim());
        setNotice(`已登记 ${visitor.name} 强制离场。`);
      }
      setDialog(null);
      await load();
    } catch (error) {
      setDialogError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const dialogTitles = {
    confirm: '确认访客进入',
    reject: '拒绝访客进入',
    checkout: '登记访客离场',
    force: '登记强制离场',
  };

  const submitLabels = {
    confirm: '确认进入',
    reject: '确认拒绝',
    checkout: '确认离场',
    force: '确认强制离场',
  };

  return (
    <>
      <PageHeader
        title="前台看板"
        description="今日访客概况，以及待确认与当前在访的访客。"
        actions={
          <div className="page-header__actions">
            <Link className="btn btn-primary" to="/register">
              登记新访客
            </Link>
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
              {loading ? '刷新中…' : '刷新'}
            </button>
          </div>
        }
      />

      {notice ? (
        <Alert tone="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      ) : null}

      {loadError ? (
        <Alert
          tone="error"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              重试
            </button>
          }
        >
          数据加载失败：{loadError}
        </Alert>
      ) : null}

      {loading && !stats ? (
        <Loading label="正在加载今日数据…" />
      ) : (
        <>
          <section className="stat-grid" aria-label="今日统计">
            <StatTile
              hero
              label="今日登记访客"
              value={stats ? stats.total : '—'}
              hint={stats?.date ? `统计日期 ${stats.date}` : undefined}
            />
            <StatTile label="待确认" value={stats ? stats.pending : '—'} hint="等待前台联系被访人" />
            <StatTile label="当前在访" value={stats ? stats.onSite : '—'} hint="已确认且未离场" />
            <StatTile label="今日已离场" value={stats ? stats.left : '—'} hint="已登记离开时间" />
            <StatTile label="今日已确认" value={stats ? stats.confirmed : '—'} hint="今日登记且已确认" />
            <StatTile label="今日已拒绝" value={stats ? stats.rejected : '—'} hint="未允许进入" />
            <StatTile label="今日强制离场" value={stats ? stats.forcedOut : '—'} hint="异常行为处理" />
            <StatTile
              label="访客证未归还"
              value={stats ? stats.badgeOutstanding : '—'}
              hint="含强制离场未归还"
            />
          </section>

          <section className="panel" aria-labelledby="pending-heading">
            <div className="panel__head">
              <div>
                <h2 id="pending-heading">待确认访客</h2>
                <p className="panel__hint">请先联系被访员工确认，再放行进入。</p>
              </div>
              <span className="count-pill">{pending.length}</span>
            </div>
            <div className="panel__body">
              {pending.length === 0 ? (
                <EmptyState
                  icon="✓"
                  title="暂无待确认访客"
                  description="所有登记访客均已处理。"
                />
              ) : (
                <ul className="visitor-list">
                  {pending.map((visitor) => (
                    <li className="visitor-row" key={visitor.id}>
                      <VisitorSummary visitor={visitor} />
                      <div className="visitor-meta">
                        <span>被访人：{visitor.hostName}</span>
                        <span>事由：{visitor.purpose}</span>
                      </div>
                      <div className="visitor-time">
                        <span className="visitor-time__label">进入时间</span>
                        <span>{formatDateTime(visitor.entryTime)}</span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openDialog('confirm', visitor)}
                        >
                          确认
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => openDialog('reject', visitor)}
                        >
                          拒绝
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="onsite-heading">
            <div className="panel__head">
              <div>
                <h2 id="onsite-heading">当前在访</h2>
                <p className="panel__hint">离场时请登记离开时间并核对访客证归还情况。</p>
              </div>
              <span className="count-pill">{onSite.length}</span>
            </div>
            <div className="panel__body">
              {onSite.length === 0 ? (
                <EmptyState icon="○" title="当前没有在访访客" description="确认访客进入后会显示在这里。" />
              ) : (
                <ul className="visitor-list">
                  {onSite.map((visitor) => (
                    <li className="visitor-row" key={visitor.id}>
                      <VisitorSummary visitor={visitor} />
                      <div className="visitor-meta">
                        <span>被访人：{visitor.hostName}</span>
                        <span>访客证：{visitor.badgeNo ?? '—'}</span>
                      </div>
                      <div className="visitor-time">
                        <span className="visitor-time__label">进入时间</span>
                        <span>{formatDateTime(visitor.entryTime)}</span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openDialog('checkout', visitor)}
                        >
                          离场
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => openDialog('force', visitor)}
                        >
                          强制离场
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {dialog ? (
        <Modal
          title={dialogTitles[dialog.kind]}
          subtitle={`${dialog.visitor.name} · ${dialog.visitor.phone}`}
          onClose={closeDialog}
        >
          <form onSubmit={handleSubmit}>
            <div className="modal__body">
              {dialogError ? <Alert tone="error">{dialogError}</Alert> : null}

              {dialog.kind === 'confirm' ? (
                <div className="field">
                  <label htmlFor="companion">陪同员工（选填）</label>
                  <input
                    id="companion"
                    className="input"
                    value={companion}
                    onChange={(event) => setCompanion(event.target.value)}
                    placeholder="如：行政部 王芳"
                    maxLength={100}
                    autoFocus
                  />
                  <p className="field-hint">确认后系统将生成临时访客证号。</p>
                </div>
              ) : null}

              {dialog.kind === 'reject' ? (
                <div className="field">
                  <label htmlFor="reject-reason">拒绝原因（选填）</label>
                  <textarea
                    id="reject-reason"
                    className="textarea"
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="如：被访人不在公司"
                    maxLength={500}
                    autoFocus
                  />
                </div>
              ) : null}

              {dialog.kind === 'checkout' ? (
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
                  <p className="field-hint">如未归还，请在备注中向被访人跟进。</p>
                </div>
              ) : null}

              {dialog.kind === 'force' ? (
                <div className="field">
                  <label htmlFor="force-reason">
                    强制离场原因 <span className="required">*</span>
                  </label>
                  <textarea
                    id="force-reason"
                    className="textarea"
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="如：拍摄内部资料"
                    maxLength={500}
                    required
                    autoFocus
                  />
                  <p className="field-hint">强制离场适用于访客存在异常行为的情形。</p>
                </div>
              ) : null}

              <dl className="detail-grid detail-grid--compact">
                <dt>被访人</dt>
                <dd>{dialog.visitor.hostName}</dd>
                <dt>来访事由</dt>
                <dd>{dialog.visitor.purpose}</dd>
                <dt>进入时间</dt>
                <dd>{formatDateTime(dialog.visitor.entryTime)}</dd>
              </dl>
            </div>

            <div className="modal__foot">
              <button type="button" className="btn btn-secondary" onClick={closeDialog} disabled={submitting}>
                取消
              </button>
              <button
                type="submit"
                className={`btn ${dialog.kind === 'reject' || dialog.kind === 'force' ? 'btn-danger-solid' : 'btn-primary'}`}
                disabled={submitting}
              >
                {submitting ? '提交中…' : submitLabels[dialog.kind]}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
