import { test, expect } from '@playwright/test';
import { AuthTestSetup } from './utils/auth-test-setup';
import { VeterinaryTestSetup } from './utils/veterinary-test-setup';

test.describe('病院管理ワークフロー E2E テスト', () => {
  let authSetup: AuthTestSetup;
  let veterinarySetup: VeterinaryTestSetup;

  test.beforeEach(async ({ page, context }) => {
    authSetup = new AuthTestSetup(page, context);
    veterinarySetup = new VeterinaryTestSetup(page);

    // テストデータベースのクリーンアップ
    await veterinarySetup.setupCleanDatabase();

    // ログイン
    await authSetup.loginAsTestUser();

    // 病院管理ページに移動
    await page.goto('/veterinary-hospitals');
    await veterinarySetup.waitForPageLoad();
  });

  test('病院の完全なCRUDワークフロー', async ({ page }) => {
    // 1. 病院一覧の初期状態確認
    await expect(page.locator('h1')).toContainText('病院管理');
    await expect(page.locator('button:has-text("病院を追加")')).toBeVisible();

    // 2. 新規病院登録
    await page.click('button:has-text("病院を追加")');
    await expect(page.locator('text=病院登録')).toBeVisible();

    // フォーム入力
    await veterinarySetup.fillFormField('input[name="name"]', 'テスト動物病院');
    await veterinarySetup.fillFormField('input[name="address"]', '東京都渋谷区テスト1-1-1');
    await veterinarySetup.fillFormField('input[name="phone"]', '03-1234-5678');
    await veterinarySetup.fillFormField('textarea[name="memo"]', 'E2Eテスト用の病院です');

    // 登録実行
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-hospitals',
    );

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('病院を登録しました');

    // 一覧に表示されることを確認
    await expect(page.locator('text=テスト動物病院')).toBeVisible();
    await expect(page.locator('text=東京都渋谷区テスト1-1-1')).toBeVisible();
    await expect(page.locator('text=03-1234-5678')).toBeVisible();

    // 3. 病院詳細表示
    await page.locator('button:has-text("詳細")').first().click();
    await expect(page.locator('text=病院詳細')).toBeVisible();
    await expect(page.locator('text=テスト動物病院')).toBeVisible();
    await expect(page.locator('text=E2Eテスト用の病院です')).toBeVisible();

    // 詳細画面を閉じる
    await page.click('button:has-text("閉じる")');

    // 4. 病院情報編集
    await page.locator('button:has-text("編集")').first().click();
    await expect(page.locator('text=病院情報編集')).toBeVisible();

    // 既存値が入っていることを確認
    await expect(page.locator('input[name="name"]')).toHaveValue('テスト動物病院');

    // 値を変更
    await veterinarySetup.fillFormField('input[name="name"]', '編集済みテスト病院');
    await veterinarySetup.fillFormField('input[name="phone"]', '03-9876-5432');
    await veterinarySetup.fillFormField('textarea[name="memo"]', '編集されたメモです');

    // 更新実行
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("更新")',
      '/api/veterinary-hospitals/*',
    );

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('病院情報を更新しました');

    // 更新された内容が表示されることを確認
    await expect(page.locator('text=編集済みテスト病院')).toBeVisible();
    await expect(page.locator('text=03-9876-5432')).toBeVisible();

    // 5. 病院削除
    await page.locator('button:has-text("削除")').first().click();
    await expect(page.locator('text=病院を削除')).toBeVisible();
    await expect(page.locator('text=編集済みテスト病院')).toBeVisible();

    // 削除確認
    await page.locator('button:has-text("削除")').last().click();
    await page.waitForResponse('/api/veterinary-hospitals/*');

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('病院を削除しました');

    // 一覧から削除されることを確認
    await expect(page.locator('text=編集済みテスト病院')).not.toBeVisible();
  });

  test('病院検索機能のワークフロー', async ({ page }) => {
    // テスト用病院を複数作成
    const hospitals = [
      { name: '渋谷動物病院', address: '東京都渋谷区1-1-1', phone: '03-1111-1111' },
      { name: '新宿ペットクリニック', address: '東京都新宿区2-2-2', phone: '03-2222-2222' },
      { name: '港区動物医療センター', address: '東京都港区3-3-3', phone: '03-3333-3333' },
      { name: '品川動物病院', address: '東京都品川区4-4-4', phone: '03-4444-4444' },
    ];

    for (const hospital of hospitals) {
      await page.click('button:has-text("病院を追加")');
      await veterinarySetup.fillFormField('input[name="name"]', hospital.name);
      await veterinarySetup.fillFormField('input[name="address"]', hospital.address);
      await veterinarySetup.fillFormField('input[name="phone"]', hospital.phone);
      await veterinarySetup.clickButtonAndWait(
        'button[type="submit"]:has-text("登録")',
        '/api/veterinary-hospitals',
      );
      await page.waitForTimeout(500); // 連続登録の間隔
    }

    // 病院名での検索
    await veterinarySetup.fillFormField('input[placeholder*="検索"]', '渋谷');
    await page.waitForTimeout(1000); // デバウンス待ち

    // 検索結果確認
    await expect(page.locator('text=渋谷動物病院')).toBeVisible();
    await expect(page.locator('text=新宿ペットクリニック')).not.toBeVisible();
    await expect(page.locator('text=港区動物医療センター')).not.toBeVisible();

    // 住所での検索
    await veterinarySetup.fillFormField('input[placeholder*="検索"]', '新宿区');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=新宿ペットクリニック')).toBeVisible();
    await expect(page.locator('text=渋谷動物病院')).not.toBeVisible();

    // 部分一致検索
    await veterinarySetup.fillFormField('input[placeholder*="検索"]', '動物');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=渋谷動物病院')).toBeVisible();
    await expect(page.locator('text=港区動物医療センター')).toBeVisible();
    await expect(page.locator('text=品川動物病院')).toBeVisible();
    await expect(page.locator('text=新宿ペットクリニック')).not.toBeVisible();

    // 検索クリア
    await page.click('button[aria-label="検索をクリア"]');
    await page.waitForTimeout(500);

    // 全ての病院が再表示されることを確認
    for (const hospital of hospitals) {
      await expect(page.locator(`text=${hospital.name}`)).toBeVisible();
    }
  });

  test('病院フォームバリデーションワークフロー', async ({ page }) => {
    // 新規登録フォームを開く
    await page.click('button:has-text("病院を追加")');

    // 必須項目未入力での登録試行
    await expect(page.locator('button[type="submit"]:has-text("登録")')).toBeDisabled();

    // 病院名のみ入力
    await veterinarySetup.fillFormField('input[name="name"]', 'バリデーションテスト病院');
    await expect(page.locator('button[type="submit"]:has-text("登録")')).toBeEnabled();

    // 不正な電話番号入力
    await veterinarySetup.fillFormField('input[name="phone"]', 'invalid-phone-123abc');
    await page.click('input[name="name"]'); // フォーカス移動でバリデーション発火

    // エラーメッセージ確認（実装に応じて調整）
    const phoneInput = page.locator('input[name="phone"]');
    const isInvalid = await phoneInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();

    // 正しい電話番号に修正
    await veterinarySetup.fillFormField('input[name="phone"]', '03-1234-5678');

    // 文字数制限テスト（病院名）
    const longName = 'あ'.repeat(101); // 100文字制限を超える
    await veterinarySetup.fillFormField('input[name="name"]', longName);

    // バリデーションエラーが表示されることを確認
    const nameInput = page.locator('input[name="name"]');
    const nameIsInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(nameIsInvalid).toBeTruthy();

    // 正しい長さに修正
    await veterinarySetup.fillFormField('input[name="name"]', 'バリデーションテスト病院');

    // 重複名チェック
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-hospitals',
    );
    await veterinarySetup.waitForSuccessMessage();

    // 同じ名前で再度登録を試行
    await page.click('button:has-text("病院を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', 'バリデーションテスト病院');
    await page.click('button[type="submit"]:has-text("登録")');

    // 重複エラーメッセージ確認
    await veterinarySetup.waitForErrorMessage('同じ名前の病院が既に登録されています');
  });

  test('病院削除時の関連データチェック', async ({ page }) => {
    // テスト用病院を作成
    await page.click('button:has-text("病院を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', '関連データテスト病院');
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-hospitals',
    );

    // 病院に所属する先生を作成（APIを直接呼び出し）
    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals.find((h: unknown) => h.name === '関連データテスト病院');

    await page.request.post('/api/veterinary-doctors', {
      data: {
        name: 'テスト先生',
        hospitalId: hospital.id,
        specialty: 'テスト専門',
      },
    });

    // 通院記録を作成（テスト用猫が必要）
    await page.request.post('/api/cats', {
      data: { name: 'テスト猫', birthdate: '2020-01-01' },
    });

    const catsResponse = await page.request.get('/api/cats');
    const cats = await catsResponse.json();
    const cat = cats[0];

    await page.request.post('/api/veterinary-visits', {
      data: {
        catId: cat.id,
        visitDate: '2024-01-01',
        hospitalName: '関連データテスト病院',
        doctorName: 'テスト先生',
        cost: 5000,
        treatments: ['診察'],
      },
    });

    // ページをリロードして最新データを取得
    await page.reload();
    await veterinarySetup.waitForPageLoad();

    // 病院削除を試行
    await page.locator('button:has-text("削除")').first().click();
    await expect(page.locator('text=病院を削除')).toBeVisible();

    // 関連データ存在の警告が表示されることを確認
    await expect(page.locator('text=この病院には関連する通院記録があります')).toBeVisible();

    // 削除ボタンが無効になっていることを確認
    await expect(page.locator('button:has-text("削除")').last()).toBeDisabled();

    // キャンセルして削除を中止
    await page.click('button:has-text("キャンセル")');
    await expect(page.locator('text=関連データテスト病院')).toBeVisible();
  });

  test('病院管理のキーボードショートカット', async ({ page }) => {
    // Ctrl+N で新規追加モーダルが開く
    await page.keyboard.press('Control+n');
    await expect(page.locator('text=病院登録')).toBeVisible();

    // Escape でモーダルが閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('text=病院登録')).not.toBeVisible();

    // 病院を作成してから編集のショートカットをテスト
    await page.click('button:has-text("病院を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', 'ショートカットテスト病院');
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-hospitals',
    );

    // 一覧で最初の病院を選択状態にしてからEnterで編集
    await page.click('tr:has-text("ショートカットテスト病院")');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=病院情報編集')).toBeVisible();

    // Escape で編集モーダルを閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('text=病院情報編集')).not.toBeVisible();
  });

  test('病院管理のページネーション', async ({ page }) => {
    // 15件の病院を作成（ページネーションをテストするため）
    for (let i = 1; i <= 15; i++) {
      await page.click('button:has-text("病院を追加")');
      await veterinarySetup.fillFormField('input[name="name"]', `病院${i.toString().padStart(2, '0')}`);
      await veterinarySetup.fillFormField('input[name="address"]', `東京都テスト区${i}-${i}-${i}`);
      await veterinarySetup.clickButtonAndWait(
        'button[type="submit"]:has-text("登録")',
        '/api/veterinary-hospitals',
      );
      await page.waitForTimeout(200); // 連続登録の間隔
    }

    // ページネーションが表示されることを確認
    await expect(page.locator('[aria-label="ページネーション"]')).toBeVisible();

    // ページ情報の確認
    await expect(page.locator('text=1から10件目を表示')).toBeVisible();

    // 次のページに移動
    await page.click('button:has-text("次へ")');
    await expect(page.locator('text=11から15件目を表示')).toBeVisible();

    // 2ページ目の内容確認
    await expect(page.locator('text=病院11')).toBeVisible();
    await expect(page.locator('text=病院15')).toBeVisible();
    await expect(page.locator('text=病院01')).not.toBeVisible();

    // 前のページに戻る
    await page.click('button:has-text("前へ")');
    await expect(page.locator('text=1から10件目を表示')).toBeVisible();

    // 1ページ目の内容確認
    await expect(page.locator('text=病院01')).toBeVisible();
    await expect(page.locator('text=病院10')).toBeVisible();
    await expect(page.locator('text=病院11')).not.toBeVisible();

    // 特定のページ番号をクリック
    await page.click('button:has-text("2")');
    await expect(page.locator('text=11から15件目を表示')).toBeVisible();
  });

  test('病院管理のエラーハンドリング', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('/api/veterinary-hospitals', (route) => {
      route.abort('failed');
    });

    // 病院一覧の読み込みエラー
    await page.reload();
    await veterinarySetup.waitForErrorMessage('病院一覧の読み込みに失敗しました');

    // ネットワークエラーを解除
    await page.unroute('/api/veterinary-hospitals');

    // リトライボタンで再読み込み
    await page.click('button:has-text("再試行")');
    await veterinarySetup.waitForPageLoad();

    // 登録時のエラーをシミュレート
    await page.route('/api/veterinary-hospitals', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'サーバーエラーが発生しました' } }),
        });
      }
      else {
        route.continue();
      }
    });

    // 病院登録を試行
    await page.click('button:has-text("病院を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', 'エラーテスト病院');
    await page.click('button[type="submit"]:has-text("登録")');

    // エラーメッセージ確認
    await veterinarySetup.waitForErrorMessage('サーバーエラーが発生しました');

    // エラー状態でもフォームが開いたままであることを確認
    await expect(page.locator('text=病院登録')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue('エラーテスト病院');
  });
});
