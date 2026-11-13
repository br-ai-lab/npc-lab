export const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api';

let sequence = 0;

/**
 * Build a payload with unique values so tests never collide with data that
 * already exists in the shared SQLite database (the workflow starts the backend
 * with its default database).
 */
export function uniqueVisitor(overrides = {}) {
  sequence += 1;
  const stamp = `${Date.now().toString(36)}${sequence}`;
  return {
    name: `E2E访客${stamp}`,
    phone: `139${String(Date.now()).slice(-8)}`,
    organization: `测试单位-${stamp}`,
    hostName: '测试被访人',
    purpose: '端到端测试',
    ...overrides,
  };
}

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

/** Create a visitor through the real backend and return the response body. */
export async function createVisitor(request, overrides = {}) {
  const payload = uniqueVisitor(overrides);
  const response = await request.post(apiUrl('/visitors'), { data: payload });
  if (response.status() !== 201) {
    throw new Error(
      `Failed to create visitor: HTTP ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}

/** Create a visitor and confirm it so it becomes CONFIRMED (on site). */
export async function createConfirmedVisitor(request, overrides = {}) {
  const created = await createVisitor(request, overrides);
  const response = await request.post(apiUrl(`/visitors/${created.id}/confirm`), {
    data: { companion: '行政部 测试员工' },
  });
  if (response.status() !== 200) {
    throw new Error(
      `Failed to confirm visitor ${created.id}: HTTP ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}
