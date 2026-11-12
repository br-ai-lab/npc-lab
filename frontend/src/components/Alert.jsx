const ICONS = {
  error: '!',
  success: '✓',
  info: 'i',
};

export default function Alert({ tone = 'info', children, onDismiss, action }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="alert__icon" aria-hidden="true">
        {ICONS[tone] ?? ICONS.info}
      </span>
      <div className="alert__content">{children}</div>
      {action ? <div className="alert__action">{action}</div> : null}
      {onDismiss ? (
        <button type="button" className="icon-btn icon-btn--small" onClick={onDismiss} aria-label="关闭提示">
          ×
        </button>
      ) : null}
    </div>
  );
}
