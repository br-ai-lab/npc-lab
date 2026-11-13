import { expect, test } from '@playwright/test';
import { apiUrl, createConfirmedVisitor, createVisitor, uniqueVisitor } from '../../fixtures/helpers.js';

test.describe('Visitor API contract', () => {
  test('GET /api/health reports ok', async ({ request }) => {
    const response = await request.get(apiUrl('/health'));

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('POST /api/visitors creates a PENDING visitor (201)', async ({ request }) => {
    const payload = uniqueVisitor();
    const response = await request.post(apiUrl('/visitors'), { data: payload });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeGreaterThan(0);
    expect(body.status).toBe('PENDING');
    expect(body.name).toBe(payload.name);
    expect(body.phone).toBe(payload.phone);
    expect(body.organization).toBe(payload.organization);
    expect(body.hostName).toBe(payload.hostName);
    expect(body.purpose).toBe(payload.purpose);
    expect(body.entryTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(body.leaveTime).toBeNull();
    expect(body.badgeNo).toBeNull();
    expect(body.badgeReturned).toBe(false);
    expect(body.createdAt).toBeTruthy();
    expect(body.updatedAt).toBeTruthy();
  });

  test('POST /api/visitors rejects missing required fields with fieldErrors (400)', async ({ request }) => {
    const response = await request.post(apiUrl('/visitors'), { data: {} });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.status).toBe(400);
    expect(body.message).toBeTruthy();
    expect(body.fieldErrors).toBeTruthy();
    for (const field of ['name', 'phone', 'hostName', 'purpose']) {
      expect(body.fieldErrors).toHaveProperty(field);
    }
  });

  test('POST /api/visitors rejects an invalid phone with fieldErrors (400)', async ({ request }) => {
    const response = await request.post(apiUrl('/visitors'), {
      data: uniqueVisitor({ phone: 'abc' }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.fieldErrors).toHaveProperty('phone');
  });

  test('confirm → checkout happy path sets badge, LEFT, leaveTime and badgeReturned', async ({ request }) => {
    const created = await createVisitor(request);
    expect(created.status).toBe('PENDING');

    const confirmResponse = await request.post(apiUrl(`/visitors/${created.id}/confirm`), {
      data: { companion: '行政部 王芳' },
    });
    expect(confirmResponse.status()).toBe(200);
    const confirmed = await confirmResponse.json();
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.badgeNo).toMatch(/^V\d{8}-\d{3}$/);
    expect(confirmed.companion).toBe('行政部 王芳');

    const checkoutResponse = await request.post(apiUrl(`/visitors/${created.id}/checkout`), {
      data: { badgeReturned: true },
    });
    expect(checkoutResponse.status()).toBe(200);
    const checkedOut = await checkoutResponse.json();
    expect(checkedOut.status).toBe('LEFT');
    expect(checkedOut.leaveTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(checkedOut.badgeReturned).toBe(true);
    expect(checkedOut.badgeNo).toMatch(/^V\d{8}-\d{3}$/);
  });

  test('checkout can record an unreturned badge', async ({ request }) => {
    const confirmed = await createConfirmedVisitor(request);

    const response = await request.post(apiUrl(`/visitors/${confirmed.id}/checkout`), {
      data: { badgeReturned: false },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('LEFT');
    expect(body.badgeReturned).toBe(false);
  });

  test('reject flow marks the visitor REJECTED with a reason', async ({ request }) => {
    const created = await createVisitor(request);

    const response = await request.post(apiUrl(`/visitors/${created.id}/reject`), {
      data: { reason: '被访人不在公司' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('REJECTED');
    expect(body.note).toBe('被访人不在公司');
    expect(body.badgeNo).toBeNull();
  });

  test('confirming a rejected visitor conflicts (409)', async ({ request }) => {
    const created = await createVisitor(request);
    await request.post(apiUrl(`/visitors/${created.id}/reject`), { data: {} });

    const response = await request.post(apiUrl(`/visitors/${created.id}/confirm`), { data: {} });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.status).toBe(409);
    expect(body.message).toContain('PENDING');
  });

  test('repeated checkout conflicts (409)', async ({ request }) => {
    const confirmed = await createConfirmedVisitor(request);
    const first = await request.post(apiUrl(`/visitors/${confirmed.id}/checkout`), {
      data: { badgeReturned: true },
    });
    expect(first.status()).toBe(200);

    const second = await request.post(apiUrl(`/visitors/${confirmed.id}/checkout`), {
      data: { badgeReturned: true },
    });

    expect(second.status()).toBe(409);
    expect((await second.json()).status).toBe(409);
  });

  test('checking out a PENDING visitor conflicts (409)', async ({ request }) => {
    const created = await createVisitor(request);

    const response = await request.post(apiUrl(`/visitors/${created.id}/checkout`), {
      data: { badgeReturned: true },
    });

    expect(response.status()).toBe(409);
  });

  test('force-leave requires a reason (400) and succeeds when provided', async ({ request }) => {
    const confirmed = await createConfirmedVisitor(request);

    const missingReason = await request.post(apiUrl(`/visitors/${confirmed.id}/force-leave`), {
      data: {},
    });
    expect(missingReason.status()).toBe(400);
    const errorBody = await missingReason.json();
    expect(errorBody.fieldErrors).toHaveProperty('reason');

    const response = await request.post(apiUrl(`/visitors/${confirmed.id}/force-leave`), {
      data: { reason: '拍摄内部资料' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('FORCED_OUT');
    expect(body.note).toBe('拍摄内部资料');
    expect(body.leaveTime).toBeTruthy();
  });

  test('force-leaving a PENDING visitor conflicts (409)', async ({ request }) => {
    const created = await createVisitor(request);

    const response = await request.post(apiUrl(`/visitors/${created.id}/force-leave`), {
      data: { reason: '异常行为' },
    });

    expect(response.status()).toBe(409);
  });

  test('unknown visitor id returns 404 for detail and actions', async ({ request }) => {
    const missingId = 999_999_999;

    const detail = await request.get(apiUrl(`/visitors/${missingId}`));
    expect(detail.status()).toBe(404);
    const body = await detail.json();
    expect(body.status).toBe(404);
    expect(body.message).toContain(String(missingId));

    const confirm = await request.post(apiUrl(`/visitors/${missingId}/confirm`), { data: {} });
    expect(confirm.status()).toBe(404);
  });

  test('list filters by status, keyword and date', async ({ request }) => {
    const created = await createVisitor(request);

    const byStatus = await request.get(apiUrl('/visitors?status=PENDING'));
    expect(byStatus.status()).toBe(200);
    const pendingList = await byStatus.json();
    expect(Array.isArray(pendingList)).toBe(true);
    expect(pendingList.length).toBeGreaterThan(0);
    for (const visitor of pendingList) {
      expect(visitor.status).toBe('PENDING');
    }
    expect(pendingList.some((visitor) => visitor.id === created.id)).toBe(true);

    const byKeyword = await request.get(apiUrl(`/visitors?keyword=${encodeURIComponent(created.name)}`));
    expect(byKeyword.status()).toBe(200);
    const keywordList = await byKeyword.json();
    expect(keywordList.map((visitor) => visitor.id)).toEqual([created.id]);

    const today = new Date();
    const date = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    const byDate = await request.get(apiUrl(`/visitors?date=${date}`));
    expect(byDate.status()).toBe(200);
    const dateList = await byDate.json();
    expect(dateList.some((visitor) => visitor.id === created.id)).toBe(true);
    for (const visitor of dateList) {
      expect(visitor.entryTime.startsWith(date)).toBe(true);
    }
  });

  test('list rejects an invalid status or date filter (400)', async ({ request }) => {
    const badStatus = await request.get(apiUrl('/visitors?status=UNKNOWN'));
    expect(badStatus.status()).toBe(400);

    const badDate = await request.get(apiUrl('/visitors?date=2026-13-40'));
    expect(badDate.status()).toBe(400);
  });

  test('GET /api/stats/today returns every documented field', async ({ request }) => {
    const response = await request.get(apiUrl('/stats/today'));

    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const field of [
      'date',
      'total',
      'pending',
      'confirmed',
      'onSite',
      'left',
      'rejected',
      'forcedOut',
      'badgeOutstanding',
    ]) {
      expect(body).toHaveProperty(field);
    }
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const field of [
      'total',
      'pending',
      'confirmed',
      'onSite',
      'left',
      'rejected',
      'forcedOut',
      'badgeOutstanding',
    ]) {
      expect(typeof body[field]).toBe('number');
      expect(body[field]).toBeGreaterThanOrEqual(0);
    }
    expect(body.total).toBe(body.pending + body.confirmed + body.left + body.rejected + body.forcedOut);
  });
});
