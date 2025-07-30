import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * 通院履歴管理機能専用のテストセットアップユーティリティ
 */

export interface TestCat {
  name: string;
  birthdate?: string;
  weight?: number;
  photoUrl?: string;
}

export class VeterinaryTestSetup {
  constructor(private page: Page) {}

  /**
   * テストデータベースのクリーンアップ
   */
  async setupCleanDatabase(): Promise<void> {
    // 通院履歴関連のデータをクリア
    await this.clearAllVeterinaryVisits();
    await this.clearAllVeterinaryAppointments();
    await this.clearAllVeterinaryMasters();
    await this.clearAllCats();
  }

  /**
   * テスト用の猫データを作成
   */
  async createTestCats(cats: TestCat[]): Promise<void> {
    for (const cat of cats) {
      await this.page.request.post('/api/cats', {
        data: cat,
      });
    }
  }

  /**
   * 通院記録をすべてクリア
   */
  async clearAllVeterinaryVisits(): Promise<void> {
    try {
      const response = await this.page.request.get('/api/veterinary-visits');
      if (response.ok()) {
        const data = await response.json();
        const visits = Array.isArray(data) ? data : data.visits || [];

        for (const visit of visits) {
          await this.page.request.delete(`/api/veterinary-visits/${visit.id}`);
        }
      }
    }
    catch (error) {
      // エラーは無視（データが存在しない場合など）
      console.warn('Failed to clear veterinary visits:', error);
    }
  }

  /**
   * 予約をすべてクリア
   */
  async clearAllVeterinaryAppointments(): Promise<void> {
    try {
      const response = await this.page.request.get('/api/veterinary-appointments');
      if (response.ok()) {
        const data = await response.json();
        const appointments = Array.isArray(data) ? data : data.appointments || [];

        for (const appointment of appointments) {
          await this.page.request.delete(`/api/veterinary-appointments/${appointment.id}`);
        }
      }
    }
    catch (error) {
      console.warn('Failed to clear veterinary appointments:', error);
    }
  }

  /**
   * マスタデータをすべてクリア
   */
  async clearAllVeterinaryMasters(): Promise<void> {
    // 病院マスタをクリア
    try {
      const hospitalsResponse = await this.page.request.get('/api/veterinary-hospitals');
      if (hospitalsResponse.ok()) {
        const hospitals = await hospitalsResponse.json();
        const hospitalList = Array.isArray(hospitals) ? hospitals : hospitals.hospitals || [];

        for (const hospital of hospitalList) {
          await this.page.request.delete(`/api/veterinary-hospitals/${hospital.id}`);
        }
      }
    }
    catch (error) {
      console.warn('Failed to clear veterinary hospitals:', error);
    }

    // 先生マスタをクリア
    try {
      const doctorsResponse = await this.page.request.get('/api/veterinary-doctors');
      if (doctorsResponse.ok()) {
        const doctors = await doctorsResponse.json();
        const doctorList = Array.isArray(doctors) ? doctors : doctors.doctors || [];

        for (const doctor of doctorList) {
          await this.page.request.delete(`/api/veterinary-doctors/${doctor.id}`);
        }
      }
    }
    catch (error) {
      console.warn('Failed to clear veterinary doctors:', error);
    }

    // 処方内容マスタをクリア
    try {
      const treatmentsResponse = await this.page.request.get('/api/veterinary-treatments');
      if (treatmentsResponse.ok()) {
        const treatments = await treatmentsResponse.json();
        const treatmentList = Array.isArray(treatments) ? treatments : treatments.treatments || [];

        for (const treatment of treatmentList) {
          await this.page.request.delete(`/api/veterinary-treatments/${treatment.id}`);
        }
      }
    }
    catch (error) {
      console.warn('Failed to clear veterinary treatments:', error);
    }
  }

  /**
   * 猫データをすべてクリア
   */
  async clearAllCats(): Promise<void> {
    try {
      const response = await this.page.request.get('/api/cats');
      if (response.ok()) {
        const cats = await response.json();
        const catList = Array.isArray(cats) ? cats : cats.cats || [];

        for (const cat of catList) {
          await this.page.request.delete(`/api/cats/${cat.id}`);
        }
      }
    }
    catch (error) {
      console.warn('Failed to clear cats:', error);
    }
  }

  /**
   * ページの完全な読み込みを待機
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('body', { state: 'visible' });
  }

  /**
   * APIリクエストの完了を待機
   */
  async waitForApiRequest(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(urlPattern);
  }

  /**
   * オフラインモードをシミュレート
   */
  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true);
  }

  /**
   * オンラインモードに復帰
   */
  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false);
  }

  /**
   * ビューポートサイズを設定
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * デバッグ用スクリーンショット
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * 要素が表示され、有効であることを確認
   */
  async isElementReady(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      await expect(element).toBeVisible();
      await expect(element).toBeEnabled();
      return true;
    }
    catch {
      return false;
    }
  }

  /**
   * フォームフィールドに値を入力（バリデーション付き）
   */
  async fillFormField(selector: string, value: string): Promise<void> {
    const field = this.page.locator(selector);
    await expect(field).toBeVisible();
    await expect(field).toBeEnabled();
    await field.fill(value);

    // 値が正しく設定されたことを確認
    await expect(field).toHaveValue(value);
  }

  /**
   * ドロップダウンから選択肢を選択
   */
  async selectOption(selector: string, value: string): Promise<void> {
    const select = this.page.locator(selector);
    await expect(select).toBeVisible();
    await expect(select).toBeEnabled();
    await select.selectOption(value);
  }

  /**
   * ボタンをクリックし、ローディング状態を処理
   */
  async clickButtonAndWait(
    selector: string,
    waitForResponse?: string | RegExp,
  ): Promise<void> {
    const button = this.page.locator(selector);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    if (waitForResponse) {
      const [response] = await Promise.all([
        this.page.waitForResponse(waitForResponse),
        button.click(),
      ]);
      expect(response.ok()).toBeTruthy();
    }
    else {
      await button.click();
    }
  }

  /**
   * 成功メッセージの表示を待機
   */
  async waitForSuccessMessage(message?: string): Promise<void> {
    const successSelector = '.success-banner, .success-message, [class*="success"]';
    await expect(this.page.locator(successSelector)).toBeVisible();

    if (message) {
      await expect(this.page.locator(successSelector)).toContainText(message);
    }
  }

  /**
   * エラーメッセージの表示を待機
   */
  async waitForErrorMessage(message?: string): Promise<void> {
    const errorSelector = '.error-container, .error-message, [class*="error"]';
    await expect(this.page.locator(errorSelector)).toBeVisible();

    if (message) {
      await expect(this.page.locator(errorSelector)).toContainText(message);
    }
  }

  /**
   * レスポンシブデザイン要素の確認
   */
  async checkResponsiveElements(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) return;

    if (viewport.width <= 768) {
      // モバイル表示の確認
      const mobileElements = this.page.locator('.mobile-nav, [class*="mobile"]');
      if (await mobileElements.count() > 0) {
        await expect(mobileElements.first()).toBeVisible();
      }
    }
    else {
      // デスクトップ表示の確認
      const desktopElements = this.page.locator('.desktop-nav, [class*="desktop"]');
      if (await desktopElements.count() > 0) {
        await expect(desktopElements.first()).toBeVisible();
      }
    }
  }

  /**
   * アクセシビリティの基本チェック
   */
  async checkAccessibility(): Promise<void> {
    // 見出し構造の確認
    const h1 = this.page.locator('h1');
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible();
    }

    // 画像のalt属性確認
    const images = this.page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < Math.min(imageCount, 5); i++) { // 最初の5つの画像をチェック
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      if (alt === null) {
        console.warn(`Image ${i} is missing alt attribute`);
      }
    }

    // フォームラベルの確認
    const inputs = this.page.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 5); i++) { // 最初の5つの入力要素をチェック
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        const label = this.page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0;
        if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
          console.warn(`Input ${i} is missing proper labeling`);
        }
      }
    }
  }

  /**
   * テスト用の通院記録を作成
   */
  async createTestVeterinaryVisit(data: {
    catName: string;
    date: string;
    hospital: string;
    doctor?: string;
    cost: number;
    treatments: string[];
    hasBloodTest?: boolean;
    notes?: string;
  }): Promise<void> {
    // 猫IDを取得
    const catsResponse = await this.page.request.get('/api/cats');
    const cats = await catsResponse.json();
    const catList = Array.isArray(cats) ? cats : cats.cats || [];
    const cat = catList.find((c: any) => c.name === data.catName);

    if (!cat) {
      throw new Error(`Cat with name "${data.catName}" not found`);
    }

    // 通院記録を作成
    await this.page.request.post('/api/veterinary-visits', {
      data: {
        catId: cat.id,
        visitDate: data.date,
        hospitalName: data.hospital,
        doctorName: data.doctor,
        treatments: data.treatments,
        cost: data.cost,
        hasBloodTest: data.hasBloodTest || false,
        notes: data.notes,
      },
    });
  }

  /**
   * テスト用の予約を作成
   */
  async createTestVeterinaryAppointment(data: {
    catName: string;
    date: string;
    hospital: string;
    doctor?: string;
    plannedTreatments?: string;
    notes?: string;
  }): Promise<void> {
    // 猫IDを取得
    const catsResponse = await this.page.request.get('/api/cats');
    const cats = await catsResponse.json();
    const catList = Array.isArray(cats) ? cats : cats.cats || [];
    const cat = catList.find((c: any) => c.name === data.catName);

    if (!cat) {
      throw new Error(`Cat with name "${data.catName}" not found`);
    }

    // 予約を作成
    await this.page.request.post('/api/veterinary-appointments', {
      data: {
        catId: cat.id,
        appointmentDate: data.date,
        hospitalName: data.hospital,
        doctorName: data.doctor,
        plannedTreatments: data.plannedTreatments,
        notes: data.notes,
      },
    });
  }
}
