import { expect, test } from '@playwright/test';
import { uniqueVisitor } from '../../fixtures/helpers.js';

test.describe('Visitor registration page', () => {
  test('submits a new visitor against the real backend', async ({ page }) => {
    const visitor = uniqueVisitor();

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: '访客登记' })).toBeVisible();

    await page.getByLabel(/^姓名/).fill(visitor.name);
    await page.getByLabel(/^联系电话/).fill(visitor.phone);
    await page.getByLabel('所属单位').fill(visitor.organization);
    await page.getByLabel(/^被访人/).fill(visitor.hostName);
    await page.getByLabel(/^来访事由/).fill(visitor.purpose);
    await page.getByRole('button', { name: '提交登记' }).click();

    await expect(page.getByRole('heading', { name: '登记成功' })).toBeVisible();
    const result = page.locator('.result-panel');
    await expect(result).toContainText(visitor.name);
    await expect(result).toContainText(visitor.phone);
    await expect(result).toContainText(visitor.organization);
    await expect(result).toContainText(visitor.hostName);
    await expect(result).toContainText(visitor.purpose);
    await expect(result).toContainText('确认后生成');
    await expect(result.locator('.status-badge')).toHaveText('待确认');
    await expect(result).toContainText(/#\d+/);
  });

  test('shows client-side validation for an empty form', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: '提交登记' }).click();

    await expect(page.getByText('请填写姓名')).toBeVisible();
    await expect(page.getByText('请填写联系电话')).toBeVisible();
    await expect(page.getByText('请填写被访人')).toBeVisible();
    await expect(page.getByText('请填写来访事由')).toBeVisible();
    await expect(page.getByRole('heading', { name: '登记成功' })).toHaveCount(0);
  });

  test('rejects an invalid phone number before submitting', async ({ page }) => {
    const visitor = uniqueVisitor({ phone: 'abc' });

    await page.goto('/register');
    await page.getByLabel(/^姓名/).fill(visitor.name);
    await page.getByLabel(/^联系电话/).fill(visitor.phone);
    await page.getByLabel(/^被访人/).fill(visitor.hostName);
    await page.getByLabel(/^来访事由/).fill(visitor.purpose);
    await page.getByRole('button', { name: '提交登记' }).click();

    await expect(page.getByText('联系电话格式不正确（可含数字、+、-、括号与空格）')).toBeVisible();
    await expect(page.getByRole('heading', { name: '登记成功' })).toHaveCount(0);
  });
});
