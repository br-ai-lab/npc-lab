import { expect, test } from '@playwright/test';
import { createConfirmedVisitor, createVisitor } from '../../fixtures/helpers.js';

test.describe('Visitor records page', () => {
  test('filters by keyword and opens the detail dialog', async ({ page, request }) => {
    const visitor = await createConfirmedVisitor(request);

    await page.goto('/visitors');
    await expect(page.getByRole('heading', { name: '访客记录' })).toBeVisible();

    await page.getByLabel('关键词').fill(visitor.name);
    await page.getByRole('button', { name: '查询' }).click();

    const row = page.locator('table.data-table tbody tr').filter({ hasText: visitor.name });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(visitor.phone);
    await expect(row).toContainText('已确认');

    await row.getByRole('button', { name: '详情' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(`访客详情 · ${visitor.name}`);
    await expect(dialog).toContainText(`#${visitor.id}`);
    await expect(dialog).toContainText(visitor.hostName);
    await expect(dialog).toContainText('已确认');
    await expect(dialog).toContainText(visitor.badgeNo);
    await expect(dialog).toContainText('行政部 测试员工');

    await dialog.getByRole('button', { name: '关闭' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('filters by status', async ({ page, request }) => {
    const visitor = await createVisitor(request);

    await page.goto('/visitors');
    await page.getByLabel('状态').selectOption('PENDING');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.locator('table.data-table tbody tr').first()).toBeVisible();
    for (const badge of await page.locator('table.data-table tbody .status-badge').all()) {
      await expect(badge).toHaveText('待确认');
    }

    await page.getByLabel('关键词').fill(visitor.name);
    await page.getByRole('button', { name: '查询' }).click();
    await expect(
      page.locator('table.data-table tbody tr').filter({ hasText: visitor.name }),
    ).toHaveCount(1);
  });

  test('registers checkout from the records table', async ({ page, request }) => {
    const visitor = await createConfirmedVisitor(request);

    await page.goto('/visitors');
    await page.getByLabel('关键词').fill(visitor.name);
    await page.getByRole('button', { name: '查询' }).click();

    const row = page.locator('table.data-table tbody tr').filter({ hasText: visitor.name });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: '离场', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('登记访客离场');
    await expect(dialog).toContainText(visitor.badgeNo);
    await dialog.getByRole('button', { name: '确认离场' }).click();

    await expect(page.getByRole('alert')).toContainText(`已登记 ${visitor.name} 离场`);
    await expect(
      page.locator('table.data-table tbody tr').filter({ hasText: visitor.name }),
    ).toContainText('已离场');
  });

  test('shows an empty state when filters match nothing', async ({ page }) => {
    await page.goto('/visitors');
    await page.getByLabel('关键词').fill('不存在的访客关键词-zzz');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('没有符合条件的访客记录')).toBeVisible();
  });
});
