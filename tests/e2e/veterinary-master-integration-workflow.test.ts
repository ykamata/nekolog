import { test, expect } from '@playwright/test';
import { AuthTestSetup } from './utils/auth-test-setup';
import { VeterinaryTestSetup } from './utils/veterinary-test-setup';

test.describe('病院・先生マスタと既存機能の連携 E2E テスト', () => {
  let authSetup: AuthTestSetup;
  let veterinarySetup: VeterinaryTestSetup;

  test.beforeEach(async ({ page, context }) => {
    authSetup = new AuthTestSetup(page, context);
    veterinarySetup = new VeterinaryTestSetup(page);

    // テストデータベースのクリーンアップ
    await veterinarySetup.setupCleanDatabase();

    // ログイン
    await authSetup.loginAsTestUser();

    // テスト用の猫を作成
    await veterinarySetup.createTestCats([
      { name: 'テスト猫1', birthdate: '2020-01-01', weight: 4.5 },
      { name: 'テスト猫2', birthdate: '2021-06-15', weight: 3.2 },
    ]);
  });

  test('VeterinaryMasterSelectorの自由入力と曖昧検索機能', async ({ page }) => {
    // マスタデータを事前に作成
    const hospitals = [
      { name: '渋谷動物病院', address: '東京都渋谷区1-1-1', phone: '03-1111-1111' },
      { name: '新宿ペットクリニック', address: '東京都新宿区2-2-2', phone: '03-2222-2222' },
      { name: '港区動物医療センター', address: '東京都港区3-3-3', phone: '03-3333-3333' },
    ];

    for (const hospital of hospitals) {
      await page.request.post('/api/veterinary-hospitals', { data: hospital });
    }

    const doctors = [
      { name: '田中先生', hospitalName: '渋谷動物病院', specialty: '内科' },
      { name: '佐藤先生', hospitalName: '新宿ペットクリニック', specialty: '外科' },
      { name: '鈴木先生', hospitalName: '港区動物医療センター', specialty: '皮膚科' },
    ];

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitalList = await hospitalsResponse.json();

    for (const doctor of doctors) {
      const hospital = hospitalList.find((h: any) => h.name === doctor.hospitalName);
      await page.request.post('/api/veterinary-doctors', {
        data: {
          name: doctor.name,
          hospitalId: hospital.id,
          specialty: doctor.specialty,
        },
      });
    }

    // 通院記録作成ページに移動
    await page.goto('/veterinary-visits');
    await page.click('button:has-text("通院記録を追加")');

    // 1. 病院選択での曖昧検索テスト
    const hospitalSelector = page.locator('input[name="hospitalName"]');

    // 部分一致検索
    await hospitalSelector.fill('渋谷');
    await page.waitForTimeout(500); // デバウンス待ち

    // 検索結果が表示されることを確認
    await expect(page.locator('text=渋谷動物病院')).toBeVisible();
    await expect(page.locator('text=新宿ペットクリニック')).not.toBeVisible();

    // 検索結果から選択
    await page.click('text=渋谷動物病院');
    await expect(hospitalSelector).toHaveValue('渋谷動物病院');

    // 2. 先生選択での病院フィルタリング
    const doctorSelector = page.locator('input[name="doctorName"]');

    // 病院を選択した状態で先生を検索
    await doctorSelector.fill('田');
    await page.waitForTimeout(500);

    // 選択した病院の先生のみ表示されることを確認
    await expect(page.locator('text=田中先生')).toBeVisible();
    await expect(page.locator('text=佐藤先生')).not.toBeVisible(); // 他の病院の先生は表示されない

    // 先生を選択
    await page.click('text=田中先生');
    await expect(doctorSelector).toHaveValue('田中先生');

    // 3. 新しい病院名の自由入力とマスタ追加確認
    await hospitalSelector.fill('新規テスト動物病院');
    await page.waitForTimeout(500);

    // マスタ追加確認ダイアログが表示されることを確認
    await expect(page.locator('text=新しい病院をマスタに追加しますか？')).toBeVisible();
    await expect(page.locator('text=新規テスト動物病院')).toBeVisible();

    // マスタに追加を選択
    await page.click('button:has-text("追加する")');

    // 病院がマスタに追加されたことを確認
    const newHospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const newHospitalList = await newHospitalsResponse.json();
    const addedHospital = newHospitalList.find((h: any) => h.name === '新規テスト動物病院');
    expect(addedHospital).toBeTruthy();

    // 4. 新しい先生名の自由入力とマスタ追加確認
    await doctorSelector.fill('新規テスト先生');
    await page.waitForTimeout(500);

    // マスタ追加確認ダイアログが表示されることを確認
    await expect(page.locator('text=新しい先生をマスタに追加しますか？')).toBeVisible();
    await expect(page.locator('text=新規テスト先生')).toBeVisible();

    // マスタに追加を選択
    await page.click('button:has-text("追加する")');

    // 先生がマスタに追加されたことを確認
    const newDoctorsResponse = await page.request.get('/api/veterinary-doctors');
    const newDoctorList = await newDoctorsResponse.json();
    const addedDoctor = newDoctorList.find((d: unknown) => d.name === '新規テスト先生');
    expect(addedDoctor).toBeTruthy();
    expect(addedDoctor.hospitalId).toBe(addedHospital.id); // 選択した病院に自動関連付け
  });

  test('通院記録作成での病院・先生マスタ連携', async ({ page }) => {
    // マスタデータを作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: '連携テスト病院', address: '東京都テスト区1-1-1', phone: '03-1234-5678' },
    });

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals[0];

    await page.request.post('/api/veterinary-doctors', {
      data: {
        name: '連携テスト先生',
        hospitalId: hospital.id,
        specialty: '内科・外科',
      },
    });

    // 通院記録作成ページに移動
    await page.goto('/veterinary-visits');
    await page.click('button:has-text("通院記録を追加")');

    // 猫を選択
    await veterinarySetup.selectOption('select[name="catId"]', 'テスト猫1');

    // 病院を選択（マスタから）
    await page.locator('input[name="hospitalName"]').fill('連携');
    await page.waitForTimeout(500);
    await page.click('text=連携テスト病院');

    // 先生を選択（病院に関連付けられた先生のみ表示）
    await page.locator('input[name="doctorName"]').fill('連携');
    await page.waitForTimeout(500);
    await page.click('text=連携テスト先生');

    // その他の必須項目を入力
    await veterinarySetup.fillFormField('input[name="visitDate"]', '2024-01-15');
    await veterinarySetup.fillFormField('input[name="cost"]', '5000');
    await veterinarySetup.fillFormField('textarea[name="treatments"]', '健康診断');

    // 通院記録を保存
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("保存")',
      '/api/veterinary-visits',
    );

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('通院記録を保存しました');

    // 作成された通院記録を確認
    const visitsResponse = await page.request.get('/api/veterinary-visits');
    const visits = await visitsResponse.json();
    const createdVisit = visits[0];

    expect(createdVisit.hospitalName).toBe('連携テスト病院');
    expect(createdVisit.doctorName).toBe('連携テスト先生');
    expect(createdVisit.cost).toBe(5000);
  });

  test('予約作成での病院・先生マスタ連携', async ({ page }) => {
    // マスタデータを作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: '予約テスト病院', address: '東京都テスト区2-2-2', phone: '03-2345-6789' },
    });

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals[0];

    await page.request.post('/api/veterinary-doctors', {
      data: {
        name: '予約テスト先生',
        hospitalId: hospital.id,
        specialty: '皮膚科',
      },
    });

    // 予約作成ページに移動
    await page.goto('/veterinary-appointments');
    await page.click('button:has-text("予約を追加")');

    // 猫を選択
    await veterinarySetup.selectOption('select[name="catId"]', 'テスト猫2');

    // 病院を選択
    await page.locator('input[name="hospitalName"]').fill('予約テスト病院');
    await page.waitForTimeout(500);
    await page.click('text=予約テスト病院');

    // 先生を選択
    await page.locator('input[name="doctorName"]').fill('予約テスト先生');
    await page.waitForTimeout(500);
    await page.click('text=予約テスト先生');

    // 予約日時を入力
    await veterinarySetup.fillFormField('input[name="appointmentDate"]', '2024-02-01');
    await veterinarySetup.fillFormField('input[name="appointmentTime"]', '14:00');
    await veterinarySetup.fillFormField('textarea[name="plannedTreatments"]', '皮膚検査');

    // 予約を保存
    await veterinarySetup.clickButtonAndWait(
      'button[type="submit"]:has-text("保存")',
      '/api/veterinary-appointments',
    );

    // 成功メッセージ確認
    await veterinarySetup.waitForSuccessMessage('予約を保存しました');

    // 作成された予約を確認
    const appointmentsResponse = await page.request.get('/api/veterinary-appointments');
    const appointments = await appointmentsResponse.json();
    const createdAppointment = appointments[0];

    expect(createdAppointment.hospitalName).toBe('予約テスト病院');
    expect(createdAppointment.doctorName).toBe('予約テスト先生');
  });

  test('病院削除時の関連データ保護', async ({ page }) => {
    // マスタデータを作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: '削除保護テスト病院', address: '東京都テスト区3-3-3' },
    });

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals[0];

    // 通院記録を作成
    await veterinarySetup.createTestVeterinaryVisit({
      catName: 'テスト猫1',
      date: '2024-01-01',
      hospital: '削除保護テスト病院',
      cost: 3000,
      treatments: ['診察'],
    });

    // 病院管理ページで削除を試行
    await page.goto('/veterinary-hospitals');
    await page.locator('button:has-text("削除")').first().click();

    // 関連データ存在の警告が表示されることを確認
    await expect(page.locator('text=この病院には関連する通院記録があります')).toBeVisible();
    await expect(page.locator('text=削除する前に関連データを確認してください')).toBeVisible();

    // 削除ボタンが無効になっていることを確認
    await expect(page.locator('button:has-text("削除")').last()).toBeDisabled();

    // 関連データ確認リンクをクリック
    await page.click('a:has-text("関連する通院記録を確認")');

    // 通院記録一覧ページに移動し、該当の記録が表示されることを確認
    await expect(page.url()).toContain('/veterinary-visits');
    await expect(page.locator('text=削除保護テスト病院')).toBeVisible();
  });

  test('先生削除時の関連データ保護', async ({ page }) => {
    // マスタデータを作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: '先生削除テスト病院', address: '東京都テスト区4-4-4' },
    });

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals[0];

    await page.request.post('/api/veterinary-doctors', {
      data: {
        name: '削除保護テスト先生',
        hospitalId: hospital.id,
        specialty: '内科',
      },
    });

    // 予約を作成
    await veterinarySetup.createTestVeterinaryAppointment({
      catName: 'テスト猫2',
      date: '2024-03-01',
      hospital: '先生削除テスト病院',
      doctor: '削除保護テスト先生',
      plannedTreatments: '定期検診',
    });

    // 先生管理ページで削除を試行
    await page.goto('/veterinary-doctors');
    await page.locator('button:has-text("削除")').first().click();

    // 関連データ存在の警告が表示されることを確認
    await expect(page.locator('text=この先生には関連する予約があります')).toBeVisible();
    await expect(page.locator('text=削除する前に関連データを確認してください')).toBeVisible();

    // 削除ボタンが無効になっていることを確認
    await expect(page.locator('button:has-text("削除")').last()).toBeDisabled();

    // 関連データ確認リンクをクリック
    await page.click('a:has-text("関連する予約を確認")');

    // 予約一覧ページに移動し、該当の予約が表示されることを確認
    await expect(page.url()).toContain('/veterinary-appointments');
    await expect(page.locator('text=削除保護テスト先生')).toBeVisible();
  });

  test('マスタデータの一括インポート機能', async ({ page }) => {
    // 病院管理ページに移動
    await page.goto('/veterinary-hospitals');

    // CSVインポートボタンをクリック（実装されている場合）
    const importButton = page.locator('button:has-text("CSVインポート")');
    if (await importButton.count() > 0) {
      await importButton.click();

      // ファイル選択ダイアログが表示されることを確認
      await expect(page.locator('text=CSVファイルを選択')).toBeVisible();

      // サンプルCSVファイルをアップロード
      const csvContent = `name,address,phone,memo
インポートテスト病院1,東京都テスト区1-1-1,03-1111-1111,インポートテスト用
インポートテスト病院2,東京都テスト区2-2-2,03-2222-2222,インポートテスト用`;

      // ファイルアップロード（実装に応じて調整）
      await page.setInputFiles('input[type="file"]', {
        name: 'hospitals.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      });

      // インポート実行
      await veterinarySetup.clickButtonAndWait(
        'button:has-text("インポート")',
        '/api/veterinary-hospitals/import',
      );

      // 成功メッセージ確認
      await veterinarySetup.waitForSuccessMessage('2件の病院をインポートしました');

      // インポートされた病院が一覧に表示されることを確認
      await expect(page.locator('text=インポートテスト病院1')).toBeVisible();
      await expect(page.locator('text=インポートテスト病院2')).toBeVisible();
    }
  });

  test('マスタデータの一括エクスポート機能', async ({ page }) => {
    // テスト用病院を作成
    const hospitals = [
      { name: 'エクスポートテスト病院1', address: '東京都テスト区1-1-1', phone: '03-1111-1111' },
      { name: 'エクスポートテスト病院2', address: '東京都テスト区2-2-2', phone: '03-2222-2222' },
    ];

    for (const hospital of hospitals) {
      await page.request.post('/api/veterinary-hospitals', { data: hospital });
    }

    // 病院管理ページに移動
    await page.goto('/veterinary-hospitals');

    // CSVエクスポートボタンをクリック（実装されている場合）
    const exportButton = page.locator('button:has-text("CSVエクスポート")');
    if (await exportButton.count() > 0) {
      // ダウンロード開始を監視
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      // ダウンロードファイル名を確認
      expect(download.suggestedFilename()).toMatch(/hospitals.*\.csv$/);

      // ダウンロードファイルの内容を確認
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const content = fs.readFileSync(path, 'utf8');
        expect(content).toContain('エクスポートテスト病院1');
        expect(content).toContain('エクスポートテスト病院2');
      }
    }
  });

  test('通院履歴カレンダーでの病院・先生情報表示', async ({ page }) => {
    // マスタデータと通院記録を作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: 'カレンダーテスト病院', address: '東京都テスト区5-5-5' },
    });

    await veterinarySetup.createTestVeterinaryVisit({
      catName: 'テスト猫1',
      date: '2024-01-15',
      hospital: 'カレンダーテスト病院',
      doctor: 'カレンダーテスト先生',
      cost: 4000,
      treatments: ['ワクチン接種'],
    });

    // 通院履歴カレンダーページに移動
    await page.goto('/veterinary-visits');
    await page.click('button:has-text("カレンダー表示")');

    // カレンダーで該当日をクリック
    await page.click('[data-date="2024-01-15"]');

    // 詳細モーダルが表示されることを確認
    await expect(page.locator('text=通院記録詳細')).toBeVisible();
    await expect(page.locator('text=カレンダーテスト病院')).toBeVisible();
    await expect(page.locator('text=カレンダーテスト先生')).toBeVisible();
    await expect(page.locator('text=ワクチン接種')).toBeVisible();

    // 病院名をクリックして病院詳細に移動
    await page.click('a:has-text("カレンダーテスト病院")');
    await expect(page.url()).toContain('/veterinary-hospitals');
    await expect(page.locator('text=病院詳細')).toBeVisible();
  });

  test('検索機能での横断検索', async ({ page }) => {
    // マスタデータを作成
    await page.request.post('/api/veterinary-hospitals', {
      data: { name: '横断検索テスト病院', address: '東京都テスト区6-6-6' },
    });

    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    const hospital = hospitals[0];

    await page.request.post('/api/veterinary-doctors', {
      data: {
        name: '横断検索テスト先生',
        hospitalId: hospital.id,
        specialty: '横断検索テスト専門',
      },
    });

    // 通院記録と予約を作成
    await veterinarySetup.createTestVeterinaryVisit({
      catName: 'テスト猫1',
      date: '2024-01-20',
      hospital: '横断検索テスト病院',
      doctor: '横断検索テスト先生',
      cost: 6000,
      treatments: ['横断検索テスト治療'],
    });

    await veterinarySetup.createTestVeterinaryAppointment({
      catName: 'テスト猫2',
      date: '2024-02-20',
      hospital: '横断検索テスト病院',
      doctor: '横断検索テスト先生',
      plannedTreatments: '横断検索テスト予定',
    });

    // グローバル検索ページに移動（実装されている場合）
    await page.goto('/search');

    // 横断検索を実行
    await veterinarySetup.fillFormField('input[name="globalSearch"]', '横断検索テスト');
    await page.click('button:has-text("検索")');

    // 検索結果に病院、先生、通院記録、予約が表示されることを確認
    await expect(page.locator('text=横断検索テスト病院')).toBeVisible();
    await expect(page.locator('text=横断検索テスト先生')).toBeVisible();
    await expect(page.locator('text=横断検索テスト治療')).toBeVisible();
    await expect(page.locator('text=横断検索テスト予定')).toBeVisible();

    // 検索結果の分類表示を確認
    await expect(page.locator('text=病院 (1件)')).toBeVisible();
    await expect(page.locator('text=先生 (1件)')).toBeVisible();
    await expect(page.locator('text=通院記録 (1件)')).toBeVisible();
    await expect(page.locator('text=予約 (1件)')).toBeVisible();
  });
});
