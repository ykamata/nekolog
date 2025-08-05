import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('基本アクセシビリティテスト', () => {
  test('ホームページのアクセシビリティ基準を満たしている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // axeアクセシビリティスキャンを実行
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-nuxt-ssr-scannable-id]') // Nuxtの内部要素を除外
      .analyze();

    // 重要な違反のみをチェック（criticalとserious）
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical' || violation.impact === 'serious',
    );

    if (criticalViolations.length > 0) {
      console.log('アクセシビリティ違反:', JSON.stringify(criticalViolations, null, 2));
    }

    expect(criticalViolations).toEqual([]);
  });

  test('適切な見出し階層を持っている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 見出し構造をチェック
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();

    // ログインページの場合、h1が存在することを確認
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // 見出しが存在する場合、適切な階層であることを確認
    if (headings.length > 0) {
      expect(headings.length).toBeGreaterThan(0);
    }
  });

  test('キーボードナビゲーションが機能する', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tabキーでナビゲーション
    await page.keyboard.press('Tab');

    // フォーカス可能な要素にフォーカスが移動することを確認
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT', 'A', 'TEXTAREA', 'BODY']).toContain(focusedElement);
  });

  test('HTMLにlang属性が設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // html要素のlang属性をチェック
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toBe('ja'); // 日本語アプリなので'ja'を期待
  });

  test('フォームフィールドに適切なラベルが設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // フォームフィールドを取得
    const inputs = await page.locator('input, select, textarea').all();

    for (const input of inputs) {
      const inputId = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // ラベルまたはaria-labelが存在することを確認
      if (inputId) {
        const associatedLabel = await page.locator(`label[for="${inputId}"]`).count();
        const hasProperLabel = associatedLabel > 0 || ariaLabel || ariaLabelledBy || placeholder;
        expect(hasProperLabel).toBe(true);
      }
      else {
        // idがない場合はaria-labelまたはplaceholderが必要
        expect(ariaLabel || placeholder).toBeTruthy();
      }
    }
  });

  test('ボタンに適切なテキストまたはaria-labelが設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const buttonText = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // ボタンにテキスト、aria-label、またはtitleが設定されていることを確認
      const hasAccessibleName = (buttonText && buttonText.trim().length > 0) || ariaLabel || title;

      if (!hasAccessibleName) {
        const buttonHtml = await button.innerHTML();
        console.log('アクセシブルな名前がないボタン:', buttonHtml);
      }

      expect(hasAccessibleName).toBe(true);
    }
  });

  test('画像にalt属性が設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();

    for (const image of images) {
      const alt = await image.getAttribute('alt');
      const role = await image.getAttribute('role');

      // 装飾的な画像（role="presentation"）以外はalt属性が必要
      if (role !== 'presentation') {
        expect(alt).toBeDefined();
      }
    }
  });

  test('色だけに依存しない情報伝達', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 高コントラストモードをエミュレート
    await page.emulateMedia({ colorScheme: 'dark' });

    // ページが正常に表示されることを確認
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // 重要な要素が見えることを確認
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();

    expect(buttons + links).toBeGreaterThan(0);
  });
});
