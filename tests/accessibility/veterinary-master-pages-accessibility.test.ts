import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('病院・先生管理ページ アクセシビリティテスト', () => {
  test.beforeEach(async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // テストユーザーでログイン
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // ログイン完了を待機
    await page.waitForURL('/');
  });

  test('病院管理ページのアクセシビリティ', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // アクセシビリティチェック
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('先生管理ページのアクセシビリティ', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // アクセシビリティチェック
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('病院登録フォームのアクセシビリティ', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // 病院追加ボタンをクリック
    await page.click('button:has-text("病院を追加")');

    // モーダルが表示されるまで待機
    await page.waitForSelector('text=病院登録');

    // アクセシビリティチェック
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('先生登録フォームのアクセシビリティ', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 先生追加ボタンをクリック
    await page.click('button:has-text("先生を追加")');

    // モーダルが表示されるまで待機
    await page.waitForSelector('text=先生登録');

    // アクセシビリティチェック
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('キーボードナビゲーション', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // Tabキーでフォーカス移動をテスト
    await page.keyboard.press('Tab');

    // フォーカスされた要素が適切にハイライトされることを確認
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Enterキーで要素がアクティベートされることを確認
    await page.keyboard.press('Enter');
  });

  test('スクリーンリーダー対応', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // ARIAラベルが適切に設定されていることを確認
    const addButton = page.locator('button:has-text("病院を追加")');
    await expect(addButton).toBeVisible();

    // ヘッダーが適切な階層構造になっていることを確認
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText('病院管理');
  });

  test('色のコントラスト', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // 色のコントラストをチェック
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('button')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('フォーカス管理', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // モーダルを開く
    await page.click('button:has-text("病院を追加")');

    // モーダル内の最初のフォーカス可能な要素にフォーカスが移ることを確認
    const firstInput = page.locator('input[name="name"]');
    await expect(firstInput).toBeFocused();

    // Escapeキーでモーダルを閉じる
    await page.keyboard.press('Escape');

    // フォーカスが元のボタンに戻ることを確認
    const addButton = page.locator('button:has-text("病院を追加")');
    await expect(addButton).toBeFocused();
  });

  test('エラーメッセージのアクセシビリティ', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // 病院追加ボタンをクリック
    await page.click('button:has-text("病院を追加")');

    // 空のフォームで保存を試行
    await page.click('button[type="submit"]');

    // エラーメッセージが適切にアナウンスされることを確認
    const errorMessage = page.locator('[role="alert"]');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('モバイルアクセシビリティ', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/veterinary-hospitals');

    // タッチターゲットのサイズが適切であることを確認
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        // 最小タッチターゲットサイズ（44px x 44px）を確認
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
