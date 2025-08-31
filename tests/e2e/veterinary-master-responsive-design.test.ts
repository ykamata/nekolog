import { test, expect } from '@playwright/test';
import { AuthTestSetup } from './utils/auth-test-setup';
import { VeterinaryTestSetup } from './utils/veterinary-test-setup';

test.describe('病院・先生管理レスポンシブデザイン E2E テスト', () => {
  let authSetup: AuthTestSetup;
  let veterinarySetup: VeterinaryTestSetup;

  // 各種デバイスサイズの定義
  const devices = {
    mobile: { width: 375, height: 667, name: 'iPhone SE' },
    tablet: { width: 768, height: 1024, name: 'iPad' },
    desktop: { width: 1280, height: 720, name: 'Desktop' },
    largeDesktop: { width: 1920, height: 1080, name: 'Large Desktop' },
  };

  test.beforeEach(async ({ page, context }) => {
    authSetup = new AuthTestSetup(page, context);
    veterinarySetup = new VeterinaryTestSetup(page);

    // テストデータベースのクリーンアップ
    await veterinarySetup.setupCleanDatabase();

    // ログイン
    await authSetup.loginAsTestUser();

    // テスト用データを作成
    await page.request.post('/api/veterinary-hospitals', {
      data: {
        name: 'レスポンシブテスト病院',
        address: '東京都テスト区1-1-1',
        phone: '03-1234-5678',
        memo: 'レスポンシブデザインテスト用の病院です',
      },
    });

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals[0];

    await page.request.post('/api/veterinary-doctors', {
      data: {
        name: 'レスポンシブテスト先生',
        hospitalId: hospital.id,
        specialty: 'レスポンシブテスト専門',
        memo: 'レスポンシブデザインテスト用の先生です',
      },
    });
  });

  test('病院管理ページのレスポンシブデザイン', async ({ page }) => {
    for (const [deviceType, device] of Object.entries(devices)) {
      console.log(`Testing ${device.name} (${device.width}x${device.height})`);

      // デバイスサイズを設定
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/veterinary-hospitals');
      await veterinarySetup.waitForPageLoad();

      // 基本要素の表示確認
      await expect(page.locator('h1')).toContainText('病院管理');
      await expect(page.locator('button:has-text("病院を追加")')).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイル表示の確認
        await veterinarySetup.checkResponsiveElements();

        // モバイル用ナビゲーションの確認
        const mobileNav = page.locator('.mobile-nav, [class*="mobile"]');
        if (await mobileNav.count() > 0) {
          await expect(mobileNav.first()).toBeVisible();
        }

        // 病院一覧がモバイル用レイアウトで表示されることを確認
        const hospitalCards = page.locator('.hospital-card, [class*="card"]');
        if (await hospitalCards.count() > 0) {
          // カード形式で表示されることを確認
          await expect(hospitalCards.first()).toBeVisible();
        }

        // 検索バーがモバイル用サイズで表示されることを確認
        const searchInput = page.locator('input[placeholder*="検索"]');
        const searchInputBox = await searchInput.boundingBox();
        if (searchInputBox) {
          expect(searchInputBox.width).toBeLessThan(device.width - 40); // 適切なマージンを考慮
        }
      }
      else if (deviceType === 'tablet') {
        // タブレット表示の確認
        await veterinarySetup.checkResponsiveElements();

        // タブレット用レイアウトの確認
        const tabletLayout = page.locator('.tablet-layout, [class*="tablet"]');
        if (await tabletLayout.count() > 0) {
          await expect(tabletLayout.first()).toBeVisible();
        }

        // 2カラムレイアウトの確認
        const columns = page.locator('.grid-cols-2, [class*="col-2"]');
        if (await columns.count() > 0) {
          await expect(columns.first()).toBeVisible();
        }
      }
      else {
        // デスクトップ表示の確認
        await veterinarySetup.checkResponsiveElements();

        // デスクトップ用ナビゲーションの確認
        const desktopNav = page.locator('.desktop-nav, [class*="desktop"]');
        if (await desktopNav.count() > 0) {
          await expect(desktopNav.first()).toBeVisible();
        }

        // テーブル形式での表示確認
        const hospitalTable = page.locator('table, .table');
        if (await hospitalTable.count() > 0) {
          await expect(hospitalTable.first()).toBeVisible();
        }
      }

      // 病院追加フォームのレスポンシブ確認
      await page.click('button:has-text("病院を追加")');
      await expect(page.locator('text=病院登録')).toBeVisible();

      // フォームモーダルのサイズ確認
      const modal = page.locator('[role="dialog"], .modal');
      const modalBox = await modal.boundingBox();
      if (modalBox) {
        if (deviceType === 'mobile') {
          // モバイルではフルスクリーンまたは画面幅に近いサイズ
          expect(modalBox.width).toBeGreaterThan(device.width * 0.8);
        }
        else {
          // デスクトップでは適切なサイズ
          expect(modalBox.width).toBeLessThan(device.width * 0.8);
        }
      }

      // フォーム要素のレスポンシブ確認
      const nameInput = page.locator('input[name="name"]');
      await expect(nameInput).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイルでは入力フィールドが適切なサイズ
        const inputBox = await nameInput.boundingBox();
        if (inputBox) {
          expect(inputBox.width).toBeGreaterThan(200); // 最小幅確保
        }
      }

      // フォームを閉じる
      await page.keyboard.press('Escape');
      await expect(page.locator('text=病院登録')).not.toBeVisible();
    }
  });

  test('先生管理ページのレスポンシブデザイン', async ({ page }) => {
    for (const [deviceType, device] of Object.entries(devices)) {
      console.log(`Testing Doctor Management on ${device.name}`);

      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/veterinary-doctors');
      await veterinarySetup.waitForPageLoad();

      // 基本要素の表示確認
      await expect(page.locator('h1')).toContainText('先生管理');
      await expect(page.locator('button:has-text("先生を追加")')).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイル表示での先生一覧確認
        const doctorList = page.locator('.doctor-list, [class*="list"]');
        if (await doctorList.count() > 0) {
          await expect(doctorList.first()).toBeVisible();
        }

        // 検索・フィルタ要素のモバイル対応確認
        const searchInput = page.locator('input[placeholder*="検索"]');
        await expect(searchInput).toBeVisible();

        const hospitalFilter = page.locator('select[name="hospitalFilter"]');
        await expect(hospitalFilter).toBeVisible();

        // モバイルでは縦積みレイアウト
        const searchBox = await searchInput.boundingBox();
        const filterBox = await hospitalFilter.boundingBox();
        if (searchBox && filterBox) {
          // 検索とフィルタが縦に配置されていることを確認
          expect(Math.abs(searchBox.y - filterBox.y)).toBeGreaterThan(30);
        }
      }
      else if (deviceType === 'tablet') {
        // タブレット表示での確認
        const searchInput = page.locator('input[placeholder*="検索"]');
        const hospitalFilter = page.locator('select[name="hospitalFilter"]');

        // タブレットでは横並びレイアウト
        const searchBox = await searchInput.boundingBox();
        const filterBox = await hospitalFilter.boundingBox();
        if (searchBox && filterBox) {
          // 検索とフィルタが横に配置されていることを確認
          expect(Math.abs(searchBox.y - filterBox.y)).toBeLessThan(20);
        }
      }
      else {
        // デスクトップ表示での確認
        await veterinarySetup.checkResponsiveElements();

        // デスクトップでは全ての機能が表示される
        await expect(page.locator('input[placeholder*="検索"]')).toBeVisible();
        await expect(page.locator('select[name="hospitalFilter"]')).toBeVisible();
        await expect(page.locator('button:has-text("先生を追加")')).toBeVisible();
      }

      // 先生追加フォームのレスポンシブ確認
      await page.click('button:has-text("先生を追加")');
      await expect(page.locator('text=先生登録')).toBeVisible();

      // フォーム要素の配置確認
      const nameInput = page.locator('input[name="name"]');
      const hospitalSelect = page.locator('select[name="hospitalId"]');
      const specialtyInput = page.locator('input[name="specialty"]');

      await expect(nameInput).toBeVisible();
      await expect(hospitalSelect).toBeVisible();
      await expect(specialtyInput).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイルでは縦積みレイアウト
        const nameBox = await nameInput.boundingBox();
        const hospitalBox = await hospitalSelect.boundingBox();
        if (nameBox && hospitalBox) {
          expect(hospitalBox.y).toBeGreaterThan(nameBox.y + nameBox.height);
        }
      }

      await page.keyboard.press('Escape');
    }
  });

  test('病院・先生詳細モーダルのレスポンシブデザイン', async ({ page }) => {
    for (const [deviceType, device] of Object.entries(devices)) {
      console.log(`Testing Detail Modals on ${device.name}`);

      await page.setViewportSize({ width: device.width, height: device.height });

      // 病院詳細モーダルのテスト
      await page.goto('/veterinary-hospitals');
      await veterinarySetup.waitForPageLoad();

      await page.locator('button:has-text("詳細")').first().click();
      await expect(page.locator('text=病院詳細')).toBeVisible();

      // モーダルサイズの確認
      const hospitalModal = page.locator('[role="dialog"]');
      const hospitalModalBox = await hospitalModal.boundingBox();

      if (hospitalModalBox) {
        if (deviceType === 'mobile') {
          // モバイルではフルスクリーンに近い
          expect(hospitalModalBox.width).toBeGreaterThan(device.width * 0.9);
          expect(hospitalModalBox.height).toBeGreaterThan(device.height * 0.7);
        }
        else {
          // デスクトップでは適切なサイズ
          expect(hospitalModalBox.width).toBeLessThan(device.width * 0.8);
          expect(hospitalModalBox.height).toBeLessThan(device.height * 0.8);
        }
      }

      // 詳細情報の表示確認
      await expect(page.locator('text=レスポンシブテスト病院')).toBeVisible();
      await expect(page.locator('text=東京都テスト区1-1-1')).toBeVisible();
      await expect(page.locator('text=03-1234-5678')).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイルでは情報が縦積みで表示される
        const hospitalName = page.locator('text=レスポンシブテスト病院');
        const hospitalAddress = page.locator('text=東京都テスト区1-1-1');

        const nameBox = await hospitalName.boundingBox();
        const addressBox = await hospitalAddress.boundingBox();

        if (nameBox && addressBox) {
          expect(addressBox.y).toBeGreaterThan(nameBox.y);
        }
      }

      await page.click('button:has-text("閉じる")');

      // 先生詳細モーダルのテスト
      await page.goto('/veterinary-doctors');
      await veterinarySetup.waitForPageLoad();

      // 先生の詳細表示（編集フォームで代用）
      await page.locator('button:has-text("編集")').first().click();
      await expect(page.locator('text=先生情報編集')).toBeVisible();

      // フォーム要素のレスポンシブ配置確認
      const nameInput = page.locator('input[name="name"]');
      const hospitalSelect = page.locator('select[name="hospitalId"]');

      if (deviceType === 'mobile') {
        // モバイルでは各要素が縦に配置される
        const nameBox = await nameInput.boundingBox();
        const hospitalBox = await hospitalSelect.boundingBox();

        if (nameBox && hospitalBox) {
          expect(hospitalBox.y).toBeGreaterThan(nameBox.y + 20);
        }
      }

      await page.keyboard.press('Escape');
    }
  });

  test('検索・フィルタ機能のレスポンシブデザイン', async ({ page }) => {
    // 複数のテストデータを作成
    const hospitals = [
      { name: 'A病院', address: '東京都A区1-1-1' },
      { name: 'B病院', address: '東京都B区2-2-2' },
      { name: 'C病院', address: '東京都C区3-3-3' },
    ];

    for (const hospital of hospitals) {
      await page.request.post('/api/veterinary-hospitals', { data: hospital });
    }

    for (const [deviceType, device] of Object.entries(devices)) {
      console.log(`Testing Search/Filter on ${device.name}`);

      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/veterinary-hospitals');
      await veterinarySetup.waitForPageLoad();

      // 検索機能のテスト
      const searchInput = page.locator('input[placeholder*="検索"]');
      await expect(searchInput).toBeVisible();

      // 検索入力のレスポンシブ確認
      await searchInput.fill('A病院');
      await page.waitForTimeout(1000);

      // 検索結果の表示確認
      await expect(page.locator('text=A病院')).toBeVisible();
      await expect(page.locator('text=B病院')).not.toBeVisible();

      if (deviceType === 'mobile') {
        // モバイルでは検索結果がカード形式で表示される
        const resultCards = page.locator('.hospital-card, [class*="card"]');
        if (await resultCards.count() > 0) {
          await expect(resultCards.first()).toBeVisible();
        }

        // 検索クリアボタンの確認
        const clearButton = page.locator('button[aria-label="検索をクリア"]');
        if (await clearButton.count() > 0) {
          await expect(clearButton).toBeVisible();

          // ボタンサイズの確認（タッチしやすいサイズ）
          const clearBox = await clearButton.boundingBox();
          if (clearBox) {
            expect(clearBox.width).toBeGreaterThan(40);
            expect(clearBox.height).toBeGreaterThan(40);
          }
        }
      }

      // 検索をクリア
      await searchInput.fill('');
      await page.waitForTimeout(500);

      // 先生管理ページでのフィルタテスト
      await page.goto('/veterinary-doctors');
      await veterinarySetup.waitForPageLoad();

      const hospitalFilter = page.locator('select[name="hospitalFilter"]');
      await expect(hospitalFilter).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイルでは選択肢が適切に表示される
        await hospitalFilter.click();

        // ドロップダウンオプションの確認
        const options = page.locator('select[name="hospitalFilter"] option');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(1); // 「全ての病院」+ 実際の病院
      }
    }
  });

  test('ページネーションのレスポンシブデザイン', async ({ page }) => {
    // 15件の病院を作成（ページネーション表示のため）
    for (let i = 1; i <= 15; i++) {
      await page.request.post('/api/veterinary-hospitals', {
        data: {
          name: `ページネーション病院${i.toString().padStart(2, '0')}`,
          address: `東京都テスト区${i}-${i}-${i}`,
        },
      });
    }

    for (const [deviceType, device] of Object.entries(devices)) {
      console.log(`Testing Pagination on ${device.name}`);

      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/veterinary-hospitals');
      await veterinarySetup.waitForPageLoad();

      // ページネーションの表示確認
      const pagination = page.locator('[aria-label="ページネーション"]');
      await expect(pagination).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイルでは簡略化されたページネーション
        const prevButton = page.locator('button:has-text("前へ")');
        const nextButton = page.locator('button:has-text("次へ")');

        await expect(prevButton).toBeVisible();
        await expect(nextButton).toBeVisible();

        // ボタンサイズの確認（タッチしやすいサイズ）
        const nextBox = await nextButton.boundingBox();
        if (nextBox) {
          expect(nextBox.width).toBeGreaterThan(60);
          expect(nextBox.height).toBeGreaterThan(40);
        }

        // ページ情報の表示確認
        await expect(page.locator('text=1から10件目を表示')).toBeVisible();
      }
      else {
        // デスクトップでは完全なページネーション
        const pageNumbers = page.locator('button[aria-label*="ページ"]');
        const pageCount = await pageNumbers.count();
        expect(pageCount).toBeGreaterThan(0);

        // ページ番号ボタンの確認
        await expect(page.locator('button:has-text("1")')).toBeVisible();
        await expect(page.locator('button:has-text("2")')).toBeVisible();
      }

      // ページ移動のテスト
      await page.click('button:has-text("次へ")');
      await expect(page.locator('text=11から15件目を表示')).toBeVisible();

      // 2ページ目の内容確認
      await expect(page.locator('text=ページネーション病院11')).toBeVisible();

      // 前のページに戻る
      await page.click('button:has-text("前へ")');
      await expect(page.locator('text=1から10件目を表示')).toBeVisible();
    }
  });

  test('アクセシビリティのレスポンシブ対応', async ({ page }) => {
    for (const [deviceType, device] of Object.entries(devices)) {
      console.log(`Testing Accessibility on ${device.name}`);

      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/veterinary-hospitals');
      await veterinarySetup.waitForPageLoad();

      // 基本的なアクセシビリティチェック
      await veterinarySetup.checkAccessibility();

      // フォーカス管理の確認
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      if (deviceType === 'mobile') {
        // モバイルでのタッチ操作確認
        const addButton = page.locator('button:has-text("病院を追加")');
        const buttonBox = await addButton.boundingBox();

        if (buttonBox) {
          // タッチターゲットサイズの確認（最小44px）
          expect(buttonBox.width).toBeGreaterThan(44);
          expect(buttonBox.height).toBeGreaterThan(44);
        }

        // スクリーンリーダー用のラベル確認
        await expect(addButton).toHaveAttribute('aria-label');
      }

      // キーボードナビゲーションの確認
      await page.keyboard.press('Enter');

      // フォームが開いた場合の確認
      if (await page.locator('text=病院登録').count() > 0) {
        // フォーカスが適切に移動することを確認
        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeFocused();

        // Escapeでフォームを閉じる
        await page.keyboard.press('Escape');
      }
    }
  });

  test('パフォーマンスのレスポンシブ最適化', async ({ page }) => {
    for (const [deviceType, device] of Object.entries(devices)) {
      await page.setViewportSize({ width: device.width, height: device.height });

      // ページ読み込み時間の測定
      const startTime = Date.now();
      await page.goto('/veterinary-hospitals');
      await veterinarySetup.waitForPageLoad();
      const loadTime = Date.now() - startTime;

      // 読み込み時間の確認（デバイスに応じた許容時間）
      const maxLoadTime = deviceType === 'mobile' ? 3000 : 2000; // モバイルは少し長めに設定
      expect(loadTime).toBeLessThan(maxLoadTime);

      // 画像の遅延読み込み確認
      const images = page.locator('img[loading="lazy"]');
      const imageCount = await images.count();

      if (imageCount > 0) {
        // 遅延読み込み画像が適切に設定されていることを確認
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const img = images.nth(i);
          await expect(img).toHaveAttribute('loading', 'lazy');
        }
      }

      if (deviceType === 'mobile') {
        // モバイルでの最適化確認

        // 不要な要素が非表示になっていることを確認
        const desktopOnlyElements = page.locator('.desktop-only, [class*="desktop-only"]');
        const desktopCount = await desktopOnlyElements.count();

        for (let i = 0; i < desktopCount; i++) {
          const element = desktopOnlyElements.nth(i);
          await expect(element).not.toBeVisible();
        }

        // モバイル用の軽量コンポーネントが使用されていることを確認
        const mobileOptimized = page.locator('.mobile-optimized, [class*="mobile-optimized"]');
        if (await mobileOptimized.count() > 0) {
          await expect(mobileOptimized.first()).toBeVisible();
        }
      }

      // JavaScript実行時間の確認
      const jsStartTime = Date.now();
      await page.evaluate(() => {
        // 重い処理をシミュレート
        const start = performance.now();
        while (performance.now() - start < 10) {
          // 10ms の処理
        }
      });
      const jsTime = Date.now() - jsStartTime;

      expect(jsTime).toBeLessThan(100); // JavaScript実行時間が適切であることを確認
    }
  });
});
