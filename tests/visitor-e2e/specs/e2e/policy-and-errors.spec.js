import { expect, test } from '@playwright/test';

const CHAPTER_TITLES = [
  '一、目的',
  '二、适用范围',
  '三、访客登记',
  '四、进入公司',
  '五、离开公司',
  '六、其他规定',
  '七、附则',
];

test.describe('Policy page and error handling', () => {
  test('renders all seven policy chapters', async ({ page }) => {
    await page.goto('/policy');

    await expect(page.getByRole('heading', { name: '公司访客管理制度' })).toBeVisible();
    await expect(page.locator('.policy-article h2')).toHaveCount(7);
    for (const title of CHAPTER_TITLES) {
      await expect(page.locator('.policy-article h2', { hasText: title })).toHaveCount(1);
    }

    await expect(page.locator('.policy-toc a')).toHaveCount(7);
    await expect(page.locator('#registration')).toContainText('姓名');
    await expect(page.locator('#registration')).toContainText('联系电话');
    await expect(page.locator('#registration')).toContainText('所属单位');
    await expect(page.locator('#registration')).toContainText('被访人');
    await expect(page.locator('#registration')).toContainText('来访事由');
    await expect(page.locator('#registration')).toContainText('进入时间');
  });

  test('shows the 404 page for an unknown route', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByText('404', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '页面不存在' })).toBeVisible();
    await page.getByRole('link', { name: '返回前台看板' }).click();
    await expect(page.getByRole('heading', { name: '前台看板' })).toBeVisible();
  });

  test('shows an error notice when the backend is unavailable', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('failed'));

    await page.goto('/');

    await expect(page.getByRole('alert')).toContainText('数据加载失败');
    await expect(page.getByRole('alert')).toContainText('无法连接后端服务');
    await expect(page.getByRole('button', { name: '重试' })).toBeVisible();
  });

  test('navigates between all pages from the main nav', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: '主导航' });

    await nav.getByRole('link', { name: '访客登记' }).click();
    await expect(page.getByRole('heading', { name: '访客登记' })).toBeVisible();

    await nav.getByRole('link', { name: '访客记录' }).click();
    await expect(page.getByRole('heading', { name: '访客记录' })).toBeVisible();

    await nav.getByRole('link', { name: '制度说明' }).click();
    await expect(page.getByRole('heading', { name: '公司访客管理制度' })).toBeVisible();

    await nav.getByRole('link', { name: '前台看板' }).click();
    await expect(page.getByRole('heading', { name: '前台看板' })).toBeVisible();
  });
});
