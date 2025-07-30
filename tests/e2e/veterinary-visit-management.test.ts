import { test, expect } from '@playwright/test';
import { VeterinaryTestSetup } from './utils/veterinary-test-setup';

test.describe('通院履歴管理 E2E テスト', () => {
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

    // 通院履歴ページに移動
    await page.goto('/veterinary-visits');
    await testSetup.waitForPageLoad();
  });

  test('通院記録の作成から表示までの完全なフロー', async ({ page }) => {
    // Step 1: 新規通院記録の作成
    await page.click('[data-testid="add-visit-button"]');

    // モーダルが表示されることを確認
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('通院記録を追加');

    // フォームに入力
    await page.selectOption('[data-testid="cat-select"]', { label: 'みけ' });
    await page.fill('[data-testid="visit-date"]', '2024-01-15T10:30');
    await page.fill('[data-testid="hospital-input"]', 'テスト動物病院');
    await page.fill('[data-testid="doctor-input"]', '田中先生');
    await page.fill('[data-testid="cost-input"]', '5000');
    await page.check('[data-testid="blood-test-checkbox"]');
    await page.fill('[data-testid="notes-textarea"]', 'E2Eテスト用の通院記録です');

    // 処方内容を追加
    await page.click('[data-testid="add-treatment-button"]');
    await page.fill('[data-testid="treatment-input-0"]', '健康診断');
    await page.click('[data-testid="add-treatment-button"]');
    await page.fill('[data-testid="treatment-input-1"]', '血液検査');

    // 保存
    await page.click('[data-testid="save-button"]');

    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // Step 2: 一覧表示での確認
    await expect(page.locator('[data-testid="visit-list"]')).toBeVisible();
    const visitItem = page.locator('[data-testid="visit-item"]').first();

    await expect(visitItem).toContainText('みけ');
    await expect(visitItem).toContainText('テスト動物病院');
    await expect(visitItem).toContainText('田中先生');
    await expect(visitItem).toContainText('5,000円');
    await expect(visitItem.locator('[data-testid="blood-test-badge"]')).toBeVisible();

    // Step 3: カレンダー表示での確認
    await page.click('[data-testid="calendar-tab"]');
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();

    // 2024年1月に移動
    await page.click('[data-testid="calendar-prev-button"]');
    await expect(page.locator('[data-testid="calendar-title"]')).toContainText('2024年1月');

    // 15日にマークが表示されることを確認
    const day15 = page.locator('[data-testid="calendar-day-15"]');
    await expect(day15).toHaveClass(/has-visit/);
    await expect(day15.locator('[data-testid="blood-test-indicator"]')).toBeVisible();

    // Step 4: 詳細表示
    await day15.click();
    await expect(page.locator('[data-testid="visit-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('テスト動物病院');
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('田中先生');
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('健康診断');
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('血液検査');
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('E2Eテスト用の通院記録です');

    // 詳細モーダルを閉じる
    await page.click('[data-testid="close-detail-button"]');
    await expect(page.locator('[data-testid="visit-detail-modal"]')).not.toBeVisible();

    // Step 5: 記録の編集
    await page.click('[data-testid="list-tab"]');
    const editButton = visitItem.locator('[data-testid="edit-button"]');
    await editButton.click();

    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('通院記録を編集');

    // 費用を変更
    await page.fill('[data-testid="cost-input"]', '6000');
    await page.fill('[data-testid="notes-textarea"]', '編集されたメモです');
    await page.click('[data-testid="save-button"]');

    // 変更が反映されることを確認
    await expect(visitItem).toContainText('6,000円');

    // Step 6: 記録の削除
    const deleteButton = visitItem.locator('[data-testid="delete-button"]');
    await deleteButton.click();

    // 確認ダイアログが表示される
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-message"]')).toContainText('本当に削除しますか？');

    // 削除を実行
    await page.click('[data-testid="confirm-delete-button"]');

    // 記録が削除されることを確認
    await expect(page.locator('[data-testid="visit-item"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });

  test('カレンダー表示・操作のテスト', async ({ page }) => {
    // テスト用の通院記録を複数作成
    const visits = [
      {
        catName: 'みけ',
        date: '2024-01-15T10:00',
        hospital: 'A動物病院',
        doctor: '佐藤先生',
        cost: 3000,
        hasBloodTest: true,
      },
      {
        catName: 'しろ',
        date: '2024-01-15T14:00',
        hospital: 'B動物病院',
        doctor: '鈴木先生',
        cost: 4000,
        hasBloodTest: false,
      },
      {
        catName: 'みけ',
        date: '2024-01-20T11:00',
        hospital: 'A動物病院',
        doctor: '佐藤先生',
        cost: 2500,
        hasBloodTest: false,
      },
    ];

    // API経由で通院記録を作成
    for (const visit of visits) {
      await testSetup.createTestVeterinaryVisit({
        catName: visit.catName,
        date: visit.date,
        hospital: visit.hospital,
        doctor: visit.doctor,
        cost: visit.cost,
        treatments: ['健康診断'],
        hasBloodTest: visit.hasBloodTest,
      });
    }

    // ページをリロードしてデータを反映
    await page.reload();
    await testSetup.waitForPageLoad();

    // カレンダータブに切り替え
    await page.click('[data-testid="calendar-tab"]');
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();

    // 2024年1月に移動
    await page.click('[data-testid="calendar-prev-button"]');
    await expect(page.locator('[data-testid="calendar-title"]')).toContainText('2024年1月');

    // 15日に複数の記録があることを確認
    const day15 = page.locator('[data-testid="calendar-day-15"]');
    await expect(day15).toHaveClass(/has-visit/);
    await expect(day15).toHaveClass(/multiple-visits/);
    await expect(day15.locator('[data-testid="visit-count"]')).toContainText('2');

    // 20日に1つの記録があることを確認
    const day20 = page.locator('[data-testid="calendar-day-20"]');
    await expect(day20).toHaveClass(/has-visit/);
    await expect(day20.locator('[data-testid="visit-count"]')).toContainText('1');

    // 猫別フィルタリングのテスト
    await page.selectOption('[data-testid="cat-filter"]', { label: 'みけ' });

    // みけの記録のみ表示されることを確認
    await expect(day15.locator('[data-testid="visit-count"]')).toContainText('1');
    await expect(day20).toHaveClass(/has-visit/);

    // しろでフィルタリング
    await page.selectOption('[data-testid="cat-filter"]', { label: 'しろ' });

    // しろの記録のみ表示されることを確認
    await expect(day15.locator('[data-testid="visit-count"]')).toContainText('1');
    await expect(day20).not.toHaveClass(/has-visit/);

    // フィルタをリセット
    await page.selectOption('[data-testid="cat-filter"]', '');
    await expect(day15.locator('[data-testid="visit-count"]')).toContainText('2');

    // 月の切り替えテスト
    await page.click('[data-testid="calendar-next-button"]');
    await expect(page.locator('[data-testid="calendar-title"]')).toContainText('2024年2月');

    // 2月には記録がないことを確認
    await expect(page.locator('[class*="has-visit"]')).toHaveCount(0);

    // 1月に戻る
    await page.click('[data-testid="calendar-prev-button"]');
    await expect(page.locator('[data-testid="calendar-title"]')).toContainText('2024年1月');

    // 血液検査マークの表示確認
    await expect(day15.locator('[data-testid="blood-test-indicator"]')).toBeVisible();
    await expect(day20.locator('[data-testid="blood-test-indicator"]')).not.toBeVisible();
  });

  test('予約から通院記録への変換フロー', async ({ page }) => {
    // Step 1: 予約管理ページに移動
    await page.goto('/veterinary-appointments');
    await testSetup.waitForPageLoad();

    // Step 2: 新規予約の作成
    await page.click('[data-testid="add-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-form-modal"]')).toBeVisible();

    // 予約フォームに入力
    await page.selectOption('[data-testid="cat-select"]', { label: 'みけ' });
    await page.fill('[data-testid="appointment-date"]', '2024-02-01T14:00');
    await page.fill('[data-testid="hospital-input"]', 'テスト動物病院');
    await page.fill('[data-testid="doctor-input"]', '山田先生');
    await page.fill('[data-testid="planned-treatments"]', '定期健診の予定');
    await page.fill('[data-testid="notes-textarea"]', '予約のメモです');

    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="appointment-form-modal"]')).not.toBeVisible();

    // 予約が作成されることを確認
    const appointmentItem = page.locator('[data-testid="appointment-item"]').first();
    await expect(appointmentItem).toContainText('みけ');
    await expect(appointmentItem).toContainText('テスト動物病院');
    await expect(appointmentItem).toContainText('山田先生');
    await expect(appointmentItem.locator('[data-testid="status-badge"]')).toContainText('予定');

    // Step 3: 予約を通院記録に変換
    await appointmentItem.locator('[data-testid="convert-button"]').click();
    await expect(page.locator('[data-testid="convert-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="convert-title"]')).toContainText('予約を通院記録に変換');

    // 実際の通院情報を入力
    await page.fill('[data-testid="actual-visit-date"]', '2024-02-01T14:30');
    await page.fill('[data-testid="actual-cost"]', '4500');
    await page.check('[data-testid="actual-blood-test"]');
    await page.fill('[data-testid="actual-notes"]', '実際の通院記録です');

    // 実際の処方内容を追加
    await page.click('[data-testid="add-actual-treatment-button"]');
    await page.fill('[data-testid="actual-treatment-input-0"]', '健康診断');
    await page.click('[data-testid="add-actual-treatment-button"]');
    await page.fill('[data-testid="actual-treatment-input-1"]', '血液検査');

    // 変換を実行
    await page.click('[data-testid="confirm-convert-button"]');
    await expect(page.locator('[data-testid="convert-dialog"]')).not.toBeVisible();

    // 予約のステータスが「完了」に変更されることを確認
    await expect(appointmentItem.locator('[data-testid="status-badge"]')).toContainText('完了');

    // Step 4: 通院履歴ページで記録を確認
    await page.goto('/veterinary-visits');
    await testSetup.waitForPageLoad();

    // 変換された通院記録が表示されることを確認
    const visitItem = page.locator('[data-testid="visit-item"]').first();
    await expect(visitItem).toContainText('みけ');
    await expect(visitItem).toContainText('テスト動物病院');
    await expect(visitItem).toContainText('山田先生');
    await expect(visitItem).toContainText('4,500円');
    await expect(visitItem.locator('[data-testid="blood-test-badge"]')).toBeVisible();

    // カレンダーでも確認
    await page.click('[data-testid="calendar-tab"]');
    await page.click('[data-testid="calendar-next-button"]'); // 2月に移動
    await expect(page.locator('[data-testid="calendar-title"]')).toContainText('2024年2月');

    const day1 = page.locator('[data-testid="calendar-day-1"]');
    await expect(day1).toHaveClass(/has-visit/);
    await expect(day1.locator('[data-testid="blood-test-indicator"]')).toBeVisible();

    // 詳細を確認
    await day1.click();
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('健康診断');
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('血液検査');
    await expect(page.locator('[data-testid="visit-detail"]')).toContainText('実際の通院記録です');
  });

  test('マスタデータ動的追加のテスト', async ({ page }) => {
    // Step 1: 新規通院記録作成で新しい病院を追加
    await page.click('[data-testid="add-visit-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();

    await page.selectOption('[data-testid="cat-select"]', { label: 'みけ' });
    await page.fill('[data-testid="visit-date"]', '2024-01-10T09:00');

    // 新しい病院名を入力
    await page.fill('[data-testid="hospital-input"]', '新規動物病院');
    await page.fill('[data-testid="doctor-input"]', '新規先生');
    await page.fill('[data-testid="cost-input"]', '3000');

    // 新しい処方内容を追加
    await page.click('[data-testid="add-treatment-button"]');
    await page.fill('[data-testid="treatment-input-0"]', '新しい処方内容');

    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // Step 2: 2回目の記録作成で、追加されたマスタデータが選択肢に表示されることを確認
    await page.click('[data-testid="add-visit-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();

    // 病院の選択肢に新規動物病院が含まれることを確認
    await page.click('[data-testid="hospital-dropdown-button"]');
    await expect(page.locator('[data-testid="hospital-option"]')).toContainText('新規動物病院');

    // 先生の選択肢に新規先生が含まれることを確認
    await page.click('[data-testid="doctor-dropdown-button"]');
    await expect(page.locator('[data-testid="doctor-option"]')).toContainText('新規先生');

    // 処方内容の選択肢に新しい処方内容が含まれることを確認
    await page.click('[data-testid="add-treatment-button"]');
    await page.click('[data-testid="treatment-dropdown-button-0"]');
    await expect(page.locator('[data-testid="treatment-option"]')).toContainText('新しい処方内容');

    // 既存のマスタデータを選択して記録を作成
    await page.selectOption('[data-testid="cat-select"]', { label: 'しろ' });
    await page.fill('[data-testid="visit-date"]', '2024-01-12T15:00');
    await page.selectOption('[data-testid="hospital-select"]', { label: '新規動物病院' });
    await page.selectOption('[data-testid="doctor-select"]', { label: '新規先生' });
    await page.fill('[data-testid="cost-input"]', '2800');
    await page.selectOption('[data-testid="treatment-select-0"]', { label: '新しい処方内容' });

    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // Step 3: 作成された記録を確認
    const visitItems = page.locator('[data-testid="visit-item"]');
    await expect(visitItems).toHaveCount(2);

    // 1つ目の記録（みけ）
    const firstVisit = visitItems.first();
    await expect(firstVisit).toContainText('みけ');
    await expect(firstVisit).toContainText('新規動物病院');
    await expect(firstVisit).toContainText('新規先生');

    // 2つ目の記録（しろ）
    const secondVisit = visitItems.nth(1);
    await expect(secondVisit).toContainText('しろ');
    await expect(secondVisit).toContainText('新規動物病院');
    await expect(secondVisit).toContainText('新規先生');

    // Step 4: マスタデータAPIで確認
    const hospitalsResponse = await page.request.get('/api/veterinary-hospitals');
    const hospitals = await hospitalsResponse.json();
    expect(hospitals.some((h: any) => h.name === '新規動物病院')).toBeTruthy();

    const doctorsResponse = await page.request.get('/api/veterinary-doctors');
    const doctors = await doctorsResponse.json();
    expect(doctors.some((d: any) => d.name === '新規先生')).toBeTruthy();

    const treatmentsResponse = await page.request.get('/api/veterinary-treatments');
    const treatments = await treatmentsResponse.json();
    expect(treatments.some((t: unknown) => t.name === '新しい処方内容')).toBeTruthy();
  });

  test('複数猫の同日通院対応テスト', async ({ page }) => {
    // 同じ日に複数の猫の通院記録を作成
    const visits = [
      {
        catName: 'みけ',
        date: '2024-01-25T10:00',
        hospital: 'ファミリー動物病院',
        doctor: '田中先生',
        cost: 3500,
        treatments: ['健康診断'],
        notes: 'みけの定期健診',
      },
      {
        catName: 'しろ',
        date: '2024-01-25T10:30',
        hospital: 'ファミリー動物病院',
        doctor: '田中先生',
        cost: 4200,
        treatments: ['ワクチン接種'],
        notes: 'しろのワクチン',
      },
    ];

    // API経由で通院記録を作成
    for (const visit of visits) {
      await testSetup.createTestVeterinaryVisit({
        catName: visit.catName,
        date: visit.date,
        hospital: visit.hospital,
        doctor: visit.doctor,
        cost: visit.cost,
        treatments: visit.treatments,
        notes: visit.notes,
      });
    }

    await page.reload();
    await testSetup.waitForPageLoad();

    // カレンダー表示で確認
    await page.click('[data-testid="calendar-tab"]');
    await page.click('[data-testid="calendar-prev-button"]'); // 1月に移動

    const day25 = page.locator('[data-testid="calendar-day-25"]');
    await expect(day25).toHaveClass(/has-visit/);
    await expect(day25).toHaveClass(/multiple-visits/);
    await expect(day25.locator('[data-testid="visit-count"]')).toContainText('2');

    // 日付をクリックして詳細表示
    await day25.click();
    await expect(page.locator('[data-testid="visit-detail-modal"]')).toBeVisible();

    // 複数の記録が表示されることを確認
    const visitDetails = page.locator('[data-testid="visit-detail-item"]');
    await expect(visitDetails).toHaveCount(2);

    // みけの記録
    const mikeVisit = visitDetails.filter({ hasText: 'みけ' });
    await expect(mikeVisit).toContainText('健康診断');
    await expect(mikeVisit).toContainText('みけの定期健診');
    await expect(mikeVisit).toContainText('3,500円');

    // しろの記録
    const shiroVisit = visitDetails.filter({ hasText: 'しろ' });
    await expect(shiroVisit).toContainText('ワクチン接種');
    await expect(shiroVisit).toContainText('しろのワクチン');
    await expect(shiroVisit).toContainText('4,200円');

    // 猫別フィルタリングのテスト
    await page.click('[data-testid="close-detail-button"]');
    await page.selectOption('[data-testid="cat-filter"]', { label: 'みけ' });

    await expect(day25.locator('[data-testid="visit-count"]')).toContainText('1');

    await day25.click();
    await expect(page.locator('[data-testid="visit-detail-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="visit-detail-item"]')).toContainText('みけ');
  });

  test('エラーハンドリングのテスト', async ({ page }) => {
    // Step 1: バリデーションエラーのテスト
    await page.click('[data-testid="add-visit-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();

    // 必須項目を入力せずに保存
    await page.click('[data-testid="save-button"]');

    // バリデーションエラーが表示されることを確認
    await expect(page.locator('[data-testid="cat-error"]')).toContainText('猫を選択してください');
    await expect(page.locator('[data-testid="date-error"]')).toContainText('診察日時を入力してください');
    await expect(page.locator('[data-testid="hospital-error"]')).toContainText('病院名を入力してください');

    // モーダルが開いたままであることを確認
    await expect(page.locator('[data-testid="visit-form-modal"]')).toBeVisible();

    // Step 2: 不正な日付のテスト
    await page.selectOption('[data-testid="cat-select"]', { label: 'みけ' });
    await page.fill('[data-testid="visit-date"]', '2025-12-31T10:00'); // 未来の日付
    await page.fill('[data-testid="hospital-input"]', 'テスト病院');
    await page.fill('[data-testid="cost-input"]', '-1000'); // 負の値

    await page.click('[data-testid="save-button"]');

    await expect(page.locator('[data-testid="date-error"]')).toContainText('診察日時は過去の日時を選択してください');
    await expect(page.locator('[data-testid="cost-error"]')).toContainText('費用は0以上で入力してください');

    // Step 3: 正しいデータで保存
    await page.fill('[data-testid="visit-date"]', '2024-01-15T10:00');
    await page.fill('[data-testid="cost-input"]', '3000');
    await page.click('[data-testid="add-treatment-button"]');
    await page.fill('[data-testid="treatment-input-0"]', '健康診断');

    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // Step 4: ネットワークエラーのシミュレーション
    await page.route('**/api/veterinary-visits', route => route.abort());

    await page.click('[data-testid="add-visit-button"]');
    await page.selectOption('[data-testid="cat-select"]', { label: 'しろ' });
    await page.fill('[data-testid="visit-date"]', '2024-01-16T11:00');
    await page.fill('[data-testid="hospital-input"]', 'テスト病院2');
    await page.fill('[data-testid="cost-input"]', '2500');
    await page.click('[data-testid="add-treatment-button"]');
    await page.fill('[data-testid="treatment-input-0"]', '診察');

    await page.click('[data-testid="save-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('通院記録の保存に失敗しました');

    // ネットワークを復旧
    await page.unroute('**/api/veterinary-visits');

    // 再度保存を試行
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="visit-form-modal"]')).not.toBeVisible();

    // Step 5: 削除確認のテスト
    const visitItem = page.locator('[data-testid="visit-item"]').first();
    await visitItem.locator('[data-testid="delete-button"]').click();

    // 確認ダイアログが表示される
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-message"]')).toContainText('本当に削除しますか？');

    // キャンセル
    await page.click('[data-testid="cancel-delete-button"]');
    await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();
    await expect(visitItem).toBeVisible(); // まだ存在する

    // 削除を実行
    await visitItem.locator('[data-testid="delete-button"]').click();
    await page.click('[data-testid="confirm-delete-button"]');
    await expect(visitItem).not.toBeVisible();
  });
});
