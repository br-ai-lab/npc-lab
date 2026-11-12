export const STATUS_OPTIONS = [
  { value: 'PENDING', label: '待确认' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'LEFT', label: '已离场' },
  { value: 'FORCED_OUT', label: '强制离场' },
];

export const STATUS_META = {
  PENDING: { label: '待确认', tone: 'warning' },
  CONFIRMED: { label: '已确认', tone: 'good' },
  REJECTED: { label: '已拒绝', tone: 'serious' },
  LEFT: { label: '已离场', tone: 'neutral' },
  FORCED_OUT: { label: '强制离场', tone: 'critical' },
};

export function statusLabel(status) {
  return STATUS_META[status]?.label ?? status ?? '—';
}
