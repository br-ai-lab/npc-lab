import { expect, test } from '@playwright/test';
import { createConfirmedVisitor, createVisitor } from '../../fixtures/helpers.js';

test.describe('Dashboard (front desk board)', () => {
  test('loads today stats and the pending / on-site panels', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '前台看板' })).toBeVisible();
    await expect(page.getByRole('region', { name: '今日统计' })).toBeVisible();
    await expect(page.locator('.stat-tile').first()).toBeVisible();
    await expect(page.locator('.stat-tile--hero .stat-value')).toHaveText(/^\d+$/);
    await expect(page.getByRole('heading', { name: '待确认访客' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '当前在访' })).toBeVisible();
  });

  test('confirms a pending visitor and issues a badge number', async ({ page, request }) => {
    const visitor = await createVisitor(request);

    await page.goto('/');
    const row = page
      .locator('section[aria-labelledby="pending-heading"] .visitor-row')
      .filter({ hasText: visitor.name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: '确认' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('确认访客进入');
    await dialog.getByLabel('陪同员工（选填）').fill('行政部 李雷');
    await dialog.getByRole('button', { name: '确认进入' }).click();

    await expect(page.getByRole('alert')).toContainText(`已确认 ${visitor.name} 进入`);
    await expect(page.getByRole('alert')).toContainText(/V\d{8}-\d{3}/);

    const onSiteRow = page
      .locator('section[aria-labelledby="onsite-heading"] .visitor-row')
      .filter({ hasText: visitor.name });
    await expect(onSiteRow).toBeVisible();
    await expect(onSiteRow).toContainText(/V\d{8}-\d{3}/);
  });

  test('registers checkout for an on-site visitor', async ({ page, request }) => {
    const visitor = await createConfirmedVisitor(request);

    await page.goto('/');
    const row = page
      .locator('section[aria-labelledby="onsite-heading"] .visitor-row')
      .filter({ hasText: visitor.name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: '离场', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('登记访客离场');
    await expect(dialog.getByRole('checkbox', { name: '已归还临时访客证' })).toBeChecked();
    await dialog.getByRole('button', { name: '确认离场' }).click();

    await expect(page.getByRole('alert')).toContainText(`已登记 ${visitor.name} 离场`);
    await expect(
      page.locator('section[aria-labelledby="onsite-heading"] .visitor-row').filter({ hasText: visitor.name }),
    ).toHaveCount(0);
  });

  test('rejects a pending visitor', async ({ page, request }) => {
    const visitor = await createVisitor(request);

    await page.goto('/');
    const row = page
      .locator('section[aria-labelledby="pending-heading"] .visitor-row')
      .filter({ hasText: visitor.name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: '拒绝' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('拒绝访客进入');
    await dialog.getByLabel('拒绝原因（选填）').fill('被访人外出');
    await dialog.getByRole('button', { name: '确认拒绝' }).click();

    await expect(page.getByRole('alert')).toContainText(`已拒绝 ${visitor.name} 进入`);
    await expect(
      page.locator('section[aria-labelledby="pending-heading"] .visitor-row').filter({ hasText: visitor.name }),
    ).toHaveCount(0);
  });

  test('forces an on-site visitor to leave with a required reason', async ({ page, request }) => {
    const visitor = await createConfirmedVisitor(request);

    await page.goto('/');
    const row = page
      .locator('section[aria-labelledby="onsite-heading"] .visitor-row')
      .filter({ hasText: visitor.name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: '强制离场' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('登记强制离场');
    await dialog.getByRole('button', { name: '确认强制离场' }).click();
    await expect(dialog).toContainText('请填写强制离场原因。');

    await dialog.getByLabel(/强制离场原因/).fill('拍摄内部资料');
    await dialog.getByRole('button', { name: '确认强制离场' }).click();

    await expect(page.getByRole('alert')).toContainText(`已登记 ${visitor.name} 强制离场`);
  });
});
