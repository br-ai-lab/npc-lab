const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (text !== '') search.set(key, text);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  const options = {
    method,
    headers: { Accept: 'application/json' },
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError('无法连接后端服务，请确认后端已启动（默认 http://localhost:8080）。', {
      status: 0,
    });
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && data.message
        ? data.message
        : `请求失败（HTTP ${response.status}）`;
    throw new ApiError(message, {
      status: response.status,
      fieldErrors: (data && data.fieldErrors) || null,
    });
  }

  return data;
}

export const visitorApi = {
  todayStats: () => request('/stats/today'),
  health: () => request('/health'),
  list: (filters = {}) => request(`/visitors${buildQuery(filters)}`),
  get: (id) => request(`/visitors/${id}`),
  create: (payload) => request('/visitors', { method: 'POST', body: payload }),
  confirm: (id, companion) =>
    request(`/visitors/${id}/confirm`, {
      method: 'POST',
      body: companion ? { companion } : {},
    }),
  reject: (id, reason) =>
    request(`/visitors/${id}/reject`, {
      method: 'POST',
      body: reason ? { reason } : {},
    }),
  checkout: (id, badgeReturned) =>
    request(`/visitors/${id}/checkout`, {
      method: 'POST',
      body: { badgeReturned },
    }),
  forceLeave: (id, reason) =>
    request(`/visitors/${id}/force-leave`, {
      method: 'POST',
      body: { reason },
    }),
};
