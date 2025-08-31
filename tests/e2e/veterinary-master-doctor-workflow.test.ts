import { test, expect } from '@playwright/test';
import { AuthTestSetup } from './utils/auth-test-setup';
import { VeterinaryTestSetup } from './utils/veterinary-test-setup';

test.describe('先生管理ワークフロー E2E テスト', () => {
  let authSetup: AuthTestSetup;
  let veterinarySetup: VeterinaryTestSetup;

  test.beforeEach(async ({ page, context }) => {
    authSetup = new AuthTestSetup(page, context);
    veterinarySetup = new VeterinaryTestSetup(page);

    // テストデータベースのクリーンアップ
    await veterinarySetup.setupCleanDatabase();

    // ログイン
    await authSetup.loginAsTestUser();

    // 先生管理ページに移動
    await page.goto('/veterinary-doctors');
    await veterinarySetup.waitForPageLoad();
  });

  test('先生の完全なCRUDワークフロー', async ({ page }) => {
    // 事前に病院を作成
    await page.request.post('/api/veterinary-hospitals', {
      data: {
        name: 'テスト動物病院',
        address: '東京都渋谷区1-1-1',
        phone: '03-1234-5678',
      },
    });

    // ページをリロードして病院データを反映
    await page.reload();
    await veterinarySetup.waitForPageLoad();

    // 1. 先生一覧の初期状態確認
    await expect(page.locator('h1')).toContainText('先生管理');
    await expect(page.locator('button:has-text("先生を追加")')).toBeVisible();

    // 2. 新規先生登録
    await page.click('button:has-text("先生を追加")');
    await expect(page.locator('text=先生登録')).toBeVisible();

    // フォーム入力
    await veterinarySetup.fillFormField('input[name="name"]', 'テスト先生');
    await veterinarySetup.selectOption('select[name="hospitalId"]', 'テスト動物病院');
    await veterinarySetup.fillFormField('input[name="specialty"]', '内科・外科');
    await veterinarySetup.fillFormField('textarea[name="memo"]', 'E2Eテスト用の先生です');

    // 登録実行
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-doctors',
    );

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('先生を登録しました');

    // 一覧に表示されることを確認
    await expect(page.locator('text=テスト先生')).toBeVisible();
    await expect(page.locator('text=テスト動物病院')).toBeVisible();
    await expect(page.locator('text=内科・外科')).toBeVisible();

    // 3. 先生情報編集
    await page.locator('button:has-text("編集")').first().click();
    await expect(page.locator('text=先生情報編集')).toBeVisible();

    // 既存値が入っていることを確認
    await expect(page.locator('input[name="name"]')).toHaveValue('テスト先生');

    // 値を変更
    await veterinarySetup.fillFormField('input[name="name"]', '編集済みテスト先生');
    await veterinarySetup.fillFormField('input[name="specialty"]', '内科・外科・皮膚科');
    await veterinarySetup.fillFormField('textarea[name="memo"]', '編集されたメモです');

    // 更新実行
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("更新")',
      '/api/veterinary-doctors/*',
    );

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('先生情報を更新しました');

    // 更新された内容が表示されることを確認
    await expect(page.locator('text=編集済みテスト先生')).toBeVisible();
    await expect(page.locator('text=内科・外科・皮膚科')).toBeVisible();

    // 4. 先生削除
    await page.locator('button:has-text("削除")').first().click();
    await expect(page.locator('text=先生を削除')).toBeVisible();
    await expect(page.locator('text=編集済みテスト先生')).toBeVisible();

    // 削除確認
    await page.locator('button:has-text("削除")').last().click();
    await page.waitForResponse('/api/veterinary-doctors/*');

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('先生を削除しました');

    // 一覧から削除されることを確認
    await expect(page.locator('text=編集済みテスト先生')).not.toBeVisible();
  });

  test('先生検索・フィルタリング機能のワークフロー', async ({ page }) => {
    // テスト用病院を複数作成
    const hospitals = [
      { name: '渋谷動物病院', address: '東京都渋谷区1-1-1' },
      { name: '新宿ペットクリニック', address: '東京都新宿区2-2-2' },
      { name: '港区動物医療センター', address: '東京都港区3-3-3' },
    ];

    for (const hospital of hospitals) {
      await page.request.post('/api/veterinary-hospitals', { data: hospital });
    }

    // テスト用先生を複数作成
    const doctors = [
      { name: '田中先生', hospitalName: '渋谷動物病院', specialty: '内科' },
      { name: '佐藤先生', hospitalName: '渋谷動物病院', specialty: '外科' },
      { name: '鈴木先生', hospitalName: '新宿ペットクリニック', specialty: '皮膚科' },
      { name: '高橋先生', hospitalName: '港区動物医療センター', specialty: '眼科' },
      { name: '田村先生', hospitalName: null, specialty: '内科・外科' }, // 所属病院なし
    ];

    // 病院IDを取得
    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitalList = await hospitalsResponse.json();

    for (const doctor of doctors) {
      const hospital = doctor.hospitalName
        ? hospitalList.find((h: any) => h.name === doctor.hospitalName)
        : null;

      await page.request.post('/api/veterinary-doctors', {
        data: {
          name: doctor.name,
          hospitalId: hospital?.id || null,
          specialty: doctor.specialty,
        },
      });
    }

    // ページをリロードしてデータを反映
    await page.reload();
    await veterinarySetup.waitForPageLoad();

    // 先生名での検索
    await veterinarySetup.fillFormField('input[placeholder*="検索"]', '田中');
    await page.waitForTimeout(1000); // デバウンス待ち

    // 検索結果確認
    await expect(page.locator('text=田中先生')).toBeVisible();
    await expect(page.locator('text=佐藤先生')).not.toBeVisible();
    await expect(page.locator('text=鈴木先生')).not.toBeVisible();

    // 専門分野での検索
    await veterinarySetup.fillFormField('input[placeholder*="検索"]', '内科');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=田中先生')).toBeVisible();
    await expect(page.locator('text=田村先生')).toBeVisible();
    await expect(page.locator('text=佐藤先生')).not.toBeVisible();

    // 検索をクリア
    await page.click('button[aria-label="検索をクリア"]');
    await page.waitForTimeout(500);

    // 病院フィルタリング
    await veterinarySetup.selectOption('select[name="hospitalFilter"]', '渋谷動物病院');
    await page.waitForTimeout(500);

    // フィルタ結果確認
    await expect(page.locator('text=田中先生')).toBeVisible();
    await expect(page.locator('text=佐藤先生')).toBeVisible();
    await expect(page.locator('text=鈴木先生')).not.toBeVisible();
    await expect(page.locator('text=高橋先生')).not.toBeVisible();

    // 「所属病院なし」フィルタ
    await veterinarySetup.selectOption('select[name="hospitalFilter"]', '所属病院なし');
    await page.waitForTimeout(500);

    await expect(page.locator('text=田村先生')).toBeVisible();
    await expect(page.locator('text=田中先生')).not.toBeVisible();

    // フィルタをクリア
    await veterinarySetup.selectOption('select[name="hospitalFilter"]', '全ての病院');
    await page.waitForTimeout(500);

    // 全ての先生が再表示されることを確認
    for (const doctor of doctors) {
      await expect(page.locator(`text=${doctor.name}`)).toBeVisible();
    }
  });

  test('先生と病院の関連管理ワークフロー', async ({ page }) => {
    // 複数の病院を作成
    const hospitals = [
      { name: 'A病院', address: '東京都A区1-1-1' },
      { name: 'B病院', address: '東京都B区2-2-2' },
    ];

    for (const hospital of hospitals) {
      await page.request.post('/api/veterinary-hospitals', { data: hospital });
    }

    // 病院IDを取得
    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitalList = await hospitalsResponse.json();
    const hospitalA = hospitalList.find((h: any) => h.name === 'A病院');
    const hospitalB = hospitalList.find((h: any) => h.name === 'B病院');

    // ページをリロード
    await page.reload();
    await veterinarySetup.waitForPageLoad();

    // 1. A病院所属の先生を作成
    await page.click('button:has-text("先生を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', '関連テスト先生');
    await veterinarySetup.selectOption('select[name="hospitalId"]', 'A病院');
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-doctors',
    );

    // A病院に所属していることを確認
    await expect(page.locator('text=関連テスト先生')).toBeVisible();
    await expect(page.locator('text=A病院')).toBeVisible();

    // 2. 先生の所属病院を変更
    await page.locator('button:has-text("編集")').first().click();
    await veterinarySetup.selectOption('select[name="hospitalId"]', 'B病院');
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("更新")',
      '/api/veterinary-doctors/*',
    );

    // B病院に所属が変更されたことを確認
    await expect(page.locator('text=関連テスト先生')).toBeVisible();
    await expect(page.locator('text=B病院')).toBeVisible();

    // 3. 所属病院を未設定に変更
    await page.locator('button:has-text("編集")').first().click();
    await veterinarySetup.selectOption('select[name="hospitalId"]', '所属病院なし');
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("更新")',
      '/api/veterinary-doctors/*',
    );

    // 所属病院が未設定になったことを確認
    await expect(page.locator('text=関連テスト先生')).toBeVisible();
    await expect(page.locator('text=所属病院なし')).toBeVisible();

    // 4. 病院を削除した場合の先生の所属病院リセット確認
    // B病院に再度所属させる
    await page.locator('button:has-text("編集")').first().click();
    await veterinarySetup.selectOption('select[name="hospitalId"]', 'B病院');
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("更新")',
      '/api/veterinary-doctors/*',
    );

    // B病院を削除
    await page.request.delete(`/api/veterinary-hospitals/${hospitalB.id}`);

    // ページをリロードして変更を反映
    await page.reload();
    await veterinarySetup.waitForPageLoad();

    // 先生の所属病院が自動的にリセットされたことを確認
    await expect(page.locator('text=関連テスト先生')).toBeVisible();
    await expect(page.locator('text=所属病院なし')).toBeVisible();
  });

  test('先生フォームバリデーションワークフロー', async ({ page }) => {
    // 新規登録フォームを開く
    await page.click('button:has-text("先生を追加")');

    // 必須項目未入力での登録試行
    await expect(page.locator('button[type="submit"]:has-text("登録")')).toBeDisabled();

    // 先生名のみ入力
    await veterinarySetup.fillFormField('input[name="name"]', 'バリデーションテスト先生');
    await expect(page.locator('button[type="submit"]:has-text("登録")')).toBeEnabled();

    // 文字数制限テスト（先生名）
    const longName = 'あ'.repeat(51); // 50文字制限を超える
    await veterinarySetup.fillFormField('input[name="name"]', longName);

    // バリデーションエラーが表示されることを確認
    const nameInput = page.locator('input[name="name"]');
    const nameIsInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(nameIsInvalid).toBeTruthy();

    // 正しい長さに修正
    await veterinarySetup.fillFormField('input[name="name"]', 'バリデーションテスト先生');

    // 専門分野の文字数制限テスト
    const longSpecialty = 'あ'.repeat(101); // 100文字制限を超える
    await veterinarySetup.fillFormField('input[name="specialty"]', longSpecialty);

    const specialtyInput = page.locator('input[name="specialty"]');
    const specialtyIsInvalid = await specialtyInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(specialtyIsInvalid).toBeTruthy();

    // 正しい長さに修正
    await veterinarySetup.fillFormField('input[name="specialty"]', '内科・外科');

    // 正常な登録
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-doctors',
    );
    await veterinarySetup.waitForSuccessMessage();

    // 重複名チェック
    await page.click('button:has-text("先生を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', 'バリデーションテスト先生');
    await page.click('button[type="submit"]:has-text("登録")');

    // 重複エラーメッセージ確認
    await veterinarySetup.waitForErrorMessage('同じ名前の先生が既に登録されています');
  });

  test('先生削除時の関連データチェック', async ({ page }) => {
    // テスト用病院と先生を作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: '関連データテスト病院', address: '東京都テスト区1-1-1' },
    });

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals.find((h: any) => h.name === '関連データテスト病院');

    await page.request.post('/api/veterinary-doctors', {
      data: {
        name: '関連データテスト先生',
        hospitalId: hospital.id,
        specialty: 'テスト専門',
      },
    });

    // テスト用猫を作成
    await page.request.post('/api/cats', {
      data: { name: 'テスト猫', birthdate: '2020-01-01' },
    });

    const catsResponse = await page.request.get('/api/cats');
    const cats = await catsResponse.json();
    const cat = cats[0];

    // 通院記録を作成
    await page.request.post('/api/veterinary-visits', {
      data: {
        catId: cat.id,
        visitDate: '2024-01-01',
        hospitalName: '関連データテスト病院',
        doctorName: '関連データテスト先生',
        cost: 5000,
        treatments: ['診察'],
      },
    });

    // ページをリロードして最新データを取得
    await page.reload();
    await veterinarySetup.waitForPageLoad();

    // 先生削除を試行
    await page.locator('button:has-text("削除")').first().click();
    await expect(page.locator('text=先生を削除')).toBeVisible();

    // 関連データ存在の警告が表示されることを確認
    await expect(page.locator('text=この先生には関連する通院記録があります')).toBeVisible();

    // 削除ボタンが無効になっていることを確認
    await expect(page.locator('button:has-text("削除")').last()).toBeDisabled();

    // キャンセルして削除を中止
    await page.click('button:has-text("キャンセル")');
    await expect(page.locator('text=関連データテスト先生')).toBeVisible();
  });

  test('先生管理のキーボードショートカット', async ({ page }) => {
    // Ctrl+N で新規追加モーダルが開く
    await page.keyboard.press('Control+n');
    await expect(page.locator('text=先生登録')).toBeVisible();

    // Escape でモーダルが閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('text=先生登録')).not.toBeVisible();

    // 先生を作成してから編集のショートカットをテスト
    await page.click('button:has-text("先生を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', 'ショートカットテスト先生');
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("登録")',
      '/api/veterinary-doctors',
    );

    // 一覧で最初の先生を選択状態にしてからEnterで編集
    await page.click('tr:has-text("ショートカットテスト先生")');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=先生情報編集')).toBeVisible();

    // Escape で編集モーダルを閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('text=先生情報編集')).not.toBeVisible();
  });

  test('先生管理のページネーション', async ({ page }) => {
    // テスト用病院を作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: 'ページネーションテスト病院', address: '東京都テスト区1-1-1' },
    });

    // 15人の先生を作成（ページネーションをテストするため）
    for (let i = 1; i <= 15; i++) {
      await page.click('button:has-text("先生を追加")');
      await veterinarySetup.fillFormField('input[name="name"]', `先生${i.toString().padStart(2, '0')}`);
      await veterinarySetup.fillFormField('input[name="specialty"]', `専門分野${i}`);
      await veterinarySetup.clickButtonAndWait(
        'button[type="submit"]:has-text("登録")',
        '/api/veterinary-doctors',
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
    await expect(page.locator('text=先生11')).toBeVisible();
    await expect(page.locator('text=先生15')).toBeVisible();
    await expect(page.locator('text=先生01')).not.toBeVisible();

    // 前のページに戻る
    await page.click('button:has-text("前へ")');
    await expect(page.locator('text=1から10件目を表示')).toBeVisible();

    // 1ページ目の内容確認
    await expect(page.locator('text=先生01')).toBeVisible();
    await expect(page.locator('text=先生10')).toBeVisible();
    await expect(page.locator('text=先生11')).not.toBeVisible();
  });

  test('先生管理のエラーハンドリング', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('/api/veterinary-doctors', (route) => {
      route.abort('failed');
    });

    // 先生一覧の読み込みエラー
    await page.reload();
    await veterinarySetup.waitForErrorMessage('先生一覧の読み込みに失敗しました');

    // ネットワークエラーを解除
    await page.unroute('/api/veterinary-doctors');

    // リトライボタンで再読み込み
    await page.click('button:has-text("再試行")');
    await veterinarySetup.waitForPageLoad();

    // 登録時のエラーをシミュレート
    await page.route('/api/veterinary-doctors', (route) => {
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

    // 先生登録を試行
    await page.click('button:has-text("先生を追加")');
    await veterinarySetup.fillFormField('input[name="name"]', 'エラーテスト先生');
    await page.click('button[type="submit"]:has-text("登録")');

    // エラーメッセージ確認
    await veterinarySetup.waitForErrorMessage('サーバーエラーが発生しました');

    // エラー状態でもフォームが開いたままであることを確認
    await expect(page.locator('text=先生登録')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue('エラーテスト先生');
  });

  test('先生管理の所属病院連携', async ({ page }) => {
    // 複数の病院を作成
    const hospitals = [
      { name: 'A動物病院', address: '東京都A区1-1-1' },
      { name: 'B動物病院', address: '東京都B区2-2-2' },
    ];

    for (const hospital of hospitals) {
      await page.request.post('/api/veterinary-hospitals', { data: hospital });
    }

    // 各病院に先生を作成
    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitalList = await hospitalsResponse.json();

    for (const hospital of hospitalList) {
      await page.request.post('/api/veterinary-doctors', {
        data: {
          name: `${hospital.name}の先生`,
          hospitalId: hospital.id,
          specialty: '内科',
        },
      });
    }

    // ページをリロード
    await page.reload();
    await veterinarySetup.waitForPageLoad();

    // 病院フィルタで各病院の先生が正しく表示されることを確認
    await veterinarySetup.selectOption('select[name="hospitalFilter"]', 'A動物病院');
    await page.waitForTimeout(500);

    await expect(page.locator('text=A動物病院の先生')).toBeVisible();
    await expect(page.locator('text=B動物病院の先生')).not.toBeVisible();

    await veterinarySetup.selectOption('select[name="hospitalFilter"]', 'B動物病院');
    await page.waitForTimeout(500);

    await expect(page.locator('text=B動物病院の先生')).toBeVisible();
    await expect(page.locator('text=A動物病院の先生')).not.toBeVisible();

    // 病院詳細ページで所属先生が表示されることを確認
    await page.goto('/veterinary-hospitals');
    await page.locator('button:has-text("詳細")').first().click();

    await expect(page.locator('text=所属先生')).toBeVisible();
    await expect(page.locator('text=A動物病院の先生')).toBeVisible();
  });
});
