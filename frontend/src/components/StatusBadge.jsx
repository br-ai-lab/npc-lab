import { STATUS_META, statusLabel } from '../constants/status';

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { tone: 'neutral' };
  return (
    <span className={`status-badge status-badge--${meta.tone}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
