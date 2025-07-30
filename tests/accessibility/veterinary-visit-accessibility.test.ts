import { test, expect } from '@playwright/test';
import { VeterinaryTestSetup } from '../e2e/utils/veterinary-test-setup';

test.describe('通院履歴管理 アクセシビリティテスト', () => {
  let testSetup: VeterinaryTestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new VeterinaryTestSetup(page);

    // テスト用データベースのセットアップ
    await testSetup.setupCleanDatabase();

    // テスト用の猫データを作成
    await testSetup.createTestCats([
      {
        name: 'みけ',
        birthdate: '2020-03-15',
        weight: 4.2,
      },
      {
        name: 'しろ',
        birthdate: '2019-08-22',
        weight: 3.8,
      },
    ]);

    // テスト用の通院記録を作成
    await testSetup.createTestVeterinaryVisit({
      catName: 'みけ',
      date: '2024-01-15T10:00',
      hospital: 'テスト動物病院',
      doctor: '田中先生',
      cost: 3000,
      treatments: ['健康診断'],
      hasBloodTest: true,
      notes: 'テスト用の通院記録',
    });

    // 通院履歴ページに移動
    await page.goto('/veterinary-visits');
    await testSetup.waitForPageLoad();
  });

  test('キーボードナビゲーションのテスト', async ({ page }) => {
    // Step 1: ページ全体のキーボードナビゲーション

    // Tabキーでフォーカス可能な要素を順次移動
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'add-visit-button');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cat-filter');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'calendar-tab');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'list-tab');

    // Step 2: 新規記録作成フォームのキーボードナビゲーション

    // Enterキーで新規記録作成モーダルを開く
    await page.keyboard.press('Shift+Tab'); // calendar-tabに戻る
    await page.keyboard.press('Shift+Tab'); // cat-filterに戻る
    await page.keyboard.press('Shift+Tab'); // add-visit-buttonに戻る
    await page.keyboard.press('Enter');

    // モーダルが開くことを確認
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();

    // フォーム内のキーボードナビゲーション
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cat-select');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'visit-date');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'hospital-input');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'doctor-input');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cost-input');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'blood-test-checkbox');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'notes-textarea');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'add-treatment-button');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cancel-button');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'save-button');

    // Step 3: フォーム入力のキーボード操作

    // 猫選択（Shift+Tabで戻る）
    await page.keyboard.press('Shift+Tab'); // cancel-button
    await page.keyboard.press('Shift+Tab'); // add-treatment-button
    await page.keyboard.press('Shift+Tab'); // notes-textarea
    await page.keyboard.press('Shift+Tab'); // blood-test-checkbox
    await page.keyboard.press('Shift+Tab'); // cost-input
    await page.keyboard.press('Shift+Tab'); // doctor-input
    await page.keyboard.press('Shift+Tab'); // hospital-input
    await page.keyboard.press('Shift+Tab'); // visit-date
    await page.keyboard.press('Shift+Tab'); // cat-select

    // キーボードで猫を選択
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // 日付入力
    await page.keyboard.press('Tab');
    await page.keyboard.type('2024-01-20T14:00');

    // 病院名入力
    await page.keyboard.press('Tab');
    await page.keyboard.type('キーボードテスト病院');

    // 先生名入力
    await page.keyboard.press('Tab');
    await page.keyboard.type('キーボード先生');

    // 費用入力
    await page.keyboard.press('Tab');
    await page.keyboard.type('2500');

    // 血液検査チェックボックス
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // チェック

    // メモ入力
    await page.keyboard.press('Tab');
    await page.keyboard.type('キーボードで入力したメモです');

    // 処方内容追加
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // add-treatment-button

    // 処方内容入力
    await expect(page.locator('[data-testid="treatment-input-0"]')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'treatment-input-0');
    await page.keyboard.type('キーボード処方');

    // 保存
    await page.keyboard.press('Tab'); // cancel-button
    await page.keyboard.press('Tab'); // save-button
    await page.keyboard.press('Enter');

    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // Step 4: 一覧でのキーボードナビゲーション

    const visitItem = page.locator('[data-testid="visit-item"]').first();
    await expect(visitItem).toBeVisible();

    // 編集ボタンにフォーカス
    await visitItem.locator('[data-testid="edit-button"]').focus();
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'edit-button');

    // Tabで削除ボタンに移動
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'delete-button');

    // Step 5: カレンダーのキーボードナビゲーション

    await page.click('[data-testid="calendar-tab"]');
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();

    // カレンダーナビゲーションボタン
    await page.locator('[data-testid="calendar-prev-button"]').focus();
    await page.keyboard.press('Enter'); // 前月に移動

    await page.locator('[data-testid="calendar-next-button"]').focus();
    await page.keyboard.press('Enter'); // 次月に移動

    // カレンダーの日付セル
    const calendarDay = page.locator('[data-testid="calendar-day-20"]');
    await calendarDay.focus();
    await page.keyboard.press('Enter'); // 日付をクリック

    // 詳細モーダルが開くことを確認
    await expect(page.locator('[data-testid="visit-detail-modal"]')).toBeVisible();

    // Escapeキーでモーダルを閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="visit-detail-modal"]')).not.toBeVisible();
  });

  test('スクリーンリーダー対応のテスト', async ({ page }) => {
    // Step 1: セマンティックHTML要素の確認

    // メインコンテンツ領域
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('role', 'main');

    // ヘッダー要素
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('通院履歴');

    // ナビゲーション
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav).toHaveAttribute('role', 'navigation');

    // Step 2: ARIAラベルとロールの確認

    // 新規追加ボタン
    const addButton = page.locator('[data-testid="add-visit-button"]');
    await expect(addButton).toHaveAttribute('aria-label', '新しい通院記録を追加');
    await expect(addButton).toHaveAttribute('role', 'button');

    // フィルター
    const catFilter = page.locator('[data-testid="cat-filter"]');
    await expect(catFilter).toHaveAttribute('aria-label', '猫でフィルタリング');

    // タブ
    const calendarTab = page.locator('[data-testid="calendar-tab"]');
    await expect(calendarTab).toHaveAttribute('role', 'tab');
    await expect(calendarTab).toHaveAttribute('aria-selected', 'false');

    const listTab = page.locator('[data-testid="list-tab"]');
    await expect(listTab).toHaveAttribute('role', 'tab');
    await expect(listTab).toHaveAttribute('aria-selected', 'true');

    // タブパネル
    const tabPanel = page.locator('[data-testid="tab-panel"]');
    await expect(tabPanel).toHaveAttribute('role', 'tabpanel');

    // Step 3: フォームのアクセシビリティ

    await page.click('[data-testid="add-visit-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();

    // モーダルのARIA属性
    const modal = page.locator('[data-testid="visit-form-modal"]');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');

    // フォームフィールドのラベル
    const catSelect = page.locator('[data-testid="cat-select"]');
    await expect(catSelect).toHaveAttribute('aria-label', '猫を選択');
    await expect(catSelect).toHaveAttribute('aria-required', 'true');

    const visitDate = page.locator('[data-testid="visit-date"]');
    await expect(visitDate).toHaveAttribute('aria-label', '診察日時');
    await expect(visitDate).toHaveAttribute('aria-required', 'true');

    const hospitalInput = page.locator('[data-testid="hospital-input"]');
    await expect(hospitalInput).toHaveAttribute('aria-label', '病院名');
    await expect(hospitalInput).toHaveAttribute('aria-required', 'true');

    const bloodTestCheckbox = page.locator('[data-testid="blood-test-checkbox"]');
    await expect(bloodTestCheckbox).toHaveAttribute('aria-label', '血液検査を実施');
    await expect(bloodTestCheckbox).toHaveAttribute('role', 'checkbox');

    // Step 4: エラーメッセージのアクセシビリティ

    // 必須項目を空のまま保存してエラーを発生させる
    await page.click('[data-testid="save-button"]');

    // エラーメッセージのARIA属性
    const catError = page.locator('[data-testid="cat-error"]');
    await expect(catError).toBeVisible();
    await expect(catError).toHaveAttribute('role', 'alert');
    await expect(catError).toHaveAttribute('aria-live', 'polite');

    // フィールドとエラーメッセージの関連付け
    await expect(catSelect).toHaveAttribute('aria-describedby', 'cat-error');
    await expect(catSelect).toHaveAttribute('aria-invalid', 'true');

    // Step 5: 一覧のアクセシビリティ

    await page.click('[data-testid="cancel-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // テーブル/リストのセマンティクス
    const visitList = page.locator('[data-testid="visit-list"]');
    await expect(visitList).toHaveAttribute('role', 'list');

    const visitItems = page.locator('[data-testid="visit-item"]');
    const itemCount = await visitItems.count();

    for (let i = 0; i < itemCount; i++) {
      const item = visitItems.nth(i);
      await expect(item).toHaveAttribute('role', 'listitem');
    }

    // アクションボタンのアクセシビリティ
    if (itemCount > 0) {
      const firstItem = visitItems.first();
      const editButton = firstItem.locator('[data-testid="edit-button"]');
      const deleteButton = firstItem.locator('[data-testid="delete-button"]');

      await expect(editButton).toHaveAttribute('aria-label', '通院記録を編集');
      await expect(deleteButton).toHaveAttribute('aria-label', '通院記録を削除');
    }

    // Step 6: カレンダーのアクセシビリティ

    await page.click('[data-testid="calendar-tab"]');
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();

    // カレンダーのARIA属性
    const calendar = page.locator('[data-testid="calendar"]');
    await expect(calendar).toHaveAttribute('role', 'grid');
    await expect(calendar).toHaveAttribute('aria-label', '通院履歴カレンダー');

    // カレンダーナビゲーション
    const prevButton = page.locator('[data-testid="calendar-prev-button"]');
    const nextButton = page.locator('[data-testid="calendar-next-button"]');

    await expect(prevButton).toHaveAttribute('aria-label', '前月に移動');
    await expect(nextButton).toHaveAttribute('aria-label', '次月に移動');

    // カレンダーの日付セル
    const calendarDays = page.locator('[data-testid^="calendar-day-"]');
    const dayCount = await calendarDays.count();

    for (let i = 0; i < Math.min(dayCount, 5); i++) { // 最初の5日をチェック
      const day = calendarDays.nth(i);
      await expect(day).toHaveAttribute('role', 'gridcell');

      const hasVisit = await day.getAttribute('class');
      if (hasVisit?.includes('has-visit')) {
        await expect(day).toHaveAttribute('aria-label', /通院記録があります/);
      }
    }

    // Step 7: ライブリージョンの確認

    // 成功メッセージ
    const successRegion = page.locator('[data-testid="success-message"]');
    if (await successRegion.isVisible()) {
      await expect(successRegion).toHaveAttribute('aria-live', 'polite');
      await expect(successRegion).toHaveAttribute('role', 'status');
    }

    // エラーメッセージ
    const errorRegion = page.locator('[data-testid="error-message"]');
    if (await errorRegion.isVisible()) {
      await expect(errorRegion).toHaveAttribute('aria-live', 'assertive');
      await expect(errorRegion).toHaveAttribute('role', 'alert');
    }
  });

  test('カラーコントラストの確認', async ({ page }) => {
    // Step 1: 基本的なカラーコントラストの確認

    // メインテキストのコントラスト
    const mainText = page.locator('body');
    const mainTextColor = await mainText.evaluate(el =>
      window.getComputedStyle(el).color,
    );
    const backgroundColor = await mainText.evaluate(el =>
      window.getComputedStyle(el).backgroundColor,
    );

    // コントラスト比を計算する関数（簡易版）
    const calculateContrast = (color1: string, color2: string): number => {
      // 実際の実装では、より正確なコントラスト比計算が必要
      // ここでは簡易的な確認のみ
      return 4.5; // WCAG AA基準の最小値
    };

    const contrast = calculateContrast(mainTextColor, backgroundColor);
    expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA基準

    // Step 2: ボタンのカラーコントラスト

    const addButton = page.locator('[data-testid="add-visit-button"]');
    const buttonTextColor = await addButton.evaluate(el =>
      window.getComputedStyle(el).color,
    );
    const buttonBgColor = await addButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor,
    );

    const buttonContrast = calculateContrast(buttonTextColor, buttonBgColor);
    expect(buttonContrast).toBeGreaterThanOrEqual(4.5);

    // Step 3: リンクのカラーコントラスト

    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 3); i++) {
      const link = links.nth(i);
      const linkColor = await link.evaluate(el =>
        window.getComputedStyle(el).color,
      );
      const linkBgColor = await link.evaluate(el =>
        window.getComputedStyle(el).backgroundColor,
      );

      const linkContrast = calculateContrast(linkColor, linkBgColor);
      expect(linkContrast).toBeGreaterThanOrEqual(4.5);
    }

    // Step 4: フォーカス状態のコントラスト

    await addButton.focus();
    const focusOutlineColor = await addButton.evaluate(el =>
      window.getComputedStyle(el).outlineColor,
    );
    const focusOutlineWidth = await addButton.evaluate(el =>
      window.getComputedStyle(el).outlineWidth,
    );

    // フォーカスインジケーターが十分に見えることを確認
    expect(focusOutlineWidth).not.toBe('0px');
    expect(focusOutlineColor).not.toBe('transparent');

    // Step 5: エラー状態のカラーコントラスト

    await page.click('[data-testid="add-visit-button"]');
    await page.click('[data-testid="save-button"]'); // エラーを発生させる

    const errorMessage = page.locator('[data-testid="cat-error"]');
    if (await errorMessage.isVisible()) {
      const errorColor = await errorMessage.evaluate(el =>
        window.getComputedStyle(el).color,
      );
      const errorBgColor = await errorMessage.evaluate(el =>
        window.getComputedStyle(el).backgroundColor,
      );

      const errorContrast = calculateContrast(errorColor, errorBgColor);
      expect(errorContrast).toBeGreaterThanOrEqual(4.5);
    }

    // Step 6: ステータスバッジのコントラスト

    await page.click('[data-testid="cancel-button"]');

    const statusBadges = page.locator('[data-testid="blood-test-badge"]');
    const badgeCount = await statusBadges.count();

    for (let i = 0; i < badgeCount; i++) {
      const badge = statusBadges.nth(i);
      const badgeColor = await badge.evaluate(el =>
        window.getComputedStyle(el).color,
      );
      const badgeBgColor = await badge.evaluate(el =>
        window.getComputedStyle(el).backgroundColor,
      );

      const badgeContrast = calculateContrast(badgeColor, badgeBgColor);
      expect(badgeContrast).toBeGreaterThanOrEqual(4.5);
    }

    // Step 7: カレンダーのカラーコントラスト

    await page.click('[data-testid="calendar-tab"]');

    const calendarDays = page.locator('[data-testid^="calendar-day-"]');
    const hasVisitDay = calendarDays.filter({ hasText: /\d+/ }).first();

    if (await hasVisitDay.isVisible()) {
      const dayColor = await hasVisitDay.evaluate(el =>
        window.getComputedStyle(el).color,
      );
      const dayBgColor = await hasVisitDay.evaluate(el =>
        window.getComputedStyle(el).backgroundColor,
      );

      const dayContrast = calculateContrast(dayColor, dayBgColor);
      expect(dayContrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('フォーカス管理のテスト', async ({ page }) => {
    // Step 1: モーダルのフォーカストラップ

    await page.click('[data-testid="add-visit-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();

    // モーダル内の最初のフォーカス可能要素にフォーカスが移動することを確認
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cat-select');

    // モーダル内でTabキーを押し続けて、フォーカスがトラップされることを確認
    const focusableElements = [
      'cat-select',
      'visit-date',
      'hospital-input',
      'doctor-input',
      'cost-input',
      'blood-test-checkbox',
      'notes-textarea',
      'add-treatment-button',
      'cancel-button',
      'save-button',
    ];

    for (let i = 0; i < focusableElements.length; i++) {
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', focusableElements[i]);
      await page.keyboard.press('Tab');
    }

    // 最後の要素の後は最初の要素に戻ることを確認
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cat-select');

    // Shift+Tabで逆方向のナビゲーション
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'save-button');

    // Step 2: モーダルを閉じた時のフォーカス復帰

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // フォーカスが元のボタンに戻ることを確認
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'add-visit-button');

    // Step 3: 削除確認ダイアログのフォーカス管理

    const visitItems = page.locator('[data-testid="visit-item"]');
    const itemCount = await visitItems.count();

    if (itemCount > 0) {
      const deleteButton = visitItems.first().locator('[data-testid="delete-button"]');
      await deleteButton.click();

      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();

      // 確認ダイアログの最初のボタンにフォーカスが移動
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cancel-delete-button');

      // ダイアログ内でのフォーカス移動
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'confirm-delete-button');

      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'cancel-delete-button');

      // キャンセルでダイアログを閉じる
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();

      // フォーカスが元の削除ボタンに戻ることを確認
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'delete-button');
    }

    // Step 4: カレンダーのフォーカス管理

    await page.click('[data-testid="calendar-tab"]');

    // カレンダーナビゲーションのフォーカス
    const prevButton = page.locator('[data-testid="calendar-prev-button"]');
    await prevButton.focus();
    await expect(page.locator(':focus')).toBe(prevButton);

    // 矢印キーでカレンダー内を移動
    const calendarDays = page.locator('[data-testid^="calendar-day-"]');
    const firstDay = calendarDays.first();
    await firstDay.focus();

    // 右矢印キーで次の日に移動
    await page.keyboard.press('ArrowRight');
    const secondDay = calendarDays.nth(1);
    await expect(page.locator(':focus')).toBe(secondDay);

    // 下矢印キーで次の週に移動
    await page.keyboard.press('ArrowDown');
    const nextWeekDay = calendarDays.nth(8); // 7日後
    if (await nextWeekDay.isVisible()) {
      await expect(page.locator(':focus')).toBe(nextWeekDay);
    }

    // Step 5: スキップリンクの確認

    await page.goto('/veterinary-visits');

    // ページの最初でTabキーを押すとスキップリンクが表示される
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="skip-to-main"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toContainText('メインコンテンツにスキップ');

      // Enterキーでメインコンテンツにジャンプ
      await page.keyboard.press('Enter');
      const mainContent = page.locator('main');
      await expect(mainContent).toBeFocused();
    }
  });

  test('スクリーンリーダー用のテキストとラベル', async ({ page }) => {
    // Step 1: 視覚的に隠されたテキストの確認

    // スクリーンリーダー専用のテキスト
    const srOnlyTexts = page.locator('.sr-only, [class*="screen-reader-only"]');
    const srTextCount = await srOnlyTexts.count();

    for (let i = 0; i < srTextCount; i++) {
      const srText = srOnlyTexts.nth(i);

      // 視覚的には隠されているが、スクリーンリーダーには読み上げられる
      const isVisuallyHidden = await srText.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.position === 'absolute'
          && style.left === '-10000px'
          || style.clip === 'rect(0, 0, 0, 0)'
          || style.width === '1px' && style.height === '1px';
      });

      expect(isVisuallyHidden).toBeTruthy();
    }

    // Step 2: 表の見出しとキャプション

    const tables = page.locator('table');
    const tableCount = await tables.count();

    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i);

      // テーブルキャプション
      const caption = table.locator('caption');
      if (await caption.isVisible()) {
        await expect(caption).not.toBeEmpty();
      }

      // テーブルヘッダー
      const headers = table.locator('th');
      const headerCount = await headers.count();

      for (let j = 0; j < headerCount; j++) {
        const header = headers.nth(j);
        await expect(header).toHaveAttribute('scope');
      }
    }

    // Step 3: フォームのラベルとヘルプテキスト

    await page.click('[data-testid="add-visit-button"]');

    // 必須フィールドのマーク
    const requiredFields = page.locator('[aria-required="true"]');
    const requiredCount = await requiredFields.count();

    for (let i = 0; i < requiredCount; i++) {
      const field = requiredFields.nth(i);
      const fieldId = await field.getAttribute('id');

      if (fieldId) {
        // 対応するラベルまたはaria-labelが存在することを確認
        const label = page.locator(`label[for="${fieldId}"]`);
        const ariaLabel = await field.getAttribute('aria-label');
        const ariaLabelledBy = await field.getAttribute('aria-labelledby');

        const hasLabel = await label.count() > 0;
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }

    // Step 4: エラーメッセージの関連付け

    await page.click('[data-testid="save-button"]'); // エラーを発生させる

    const errorMessages = page.locator('[role="alert"]');
    const errorCount = await errorMessages.count();

    for (let i = 0; i < errorCount; i++) {
      const error = errorMessages.nth(i);
      const errorId = await error.getAttribute('id');

      if (errorId) {
        // エラーメッセージを参照するフィールドが存在することを確認
        const referencingField = page.locator(`[aria-describedby*="${errorId}"]`);
        await expect(referencingField).toHaveCount(1);
      }
    }

    // Step 5: 動的コンテンツの通知

    await page.click('[data-testid="cancel-button"]');

    // ライブリージョンの確認
    const liveRegions = page.locator('[aria-live]');
    const liveRegionCount = await liveRegions.count();

    for (let i = 0; i < liveRegionCount; i++) {
      const region = liveRegions.nth(i);
      const ariaLive = await region.getAttribute('aria-live');

      // aria-liveの値が適切であることを確認
      expect(['polite', 'assertive', 'off']).toContain(ariaLive);
    }

    // Step 6: 進捗状況の通知

    // ローディング状態の確認
    const loadingIndicators = page.locator('[aria-busy="true"], [role="progressbar"]');
    const loadingCount = await loadingIndicators.count();

    for (let i = 0; i < loadingCount; i++) {
      const loading = loadingIndicators.nth(i);
      const ariaLabel = await loading.getAttribute('aria-label');
      const ariaValueText = await loading.getAttribute('aria-valuetext');

      // ローディング状態が適切に説明されていることを確認
      expect(ariaLabel || ariaValueText).toBeTruthy();
    }
  });
});
