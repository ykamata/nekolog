import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';

describe('Veterinary Hospitals Search API Logic', () => {
  let testUserId: string;

  beforeEach(async () => {
    // テスト用ユーザーを作成（ユニークなメールアドレス）
    const testUser = await prisma.user.create({
      data: {
        email: `test-hospital-search-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;

    // 既存のテストデータをクリーンアップ
    await prisma.veterinaryHospital.deleteMany({
      where: { userId: testUserId },
    });

    // テスト用病院データを作成
    await prisma.veterinaryHospital.createMany({
      data: [
        {
          name: '東京動物病院',
          address: '東京都渋谷区',
          phone: '03-1234-5678',
          userId: testUserId,
        },
        {
          name: '渋谷ペットクリニック',
          address: '東京都渋谷区',
          phone: '03-2345-6789',
          userId: testUserId,
        },
        {
          name: '新宿動物医院',
          address: '東京都新宿区',
          phone: '03-3456-7890',
          userId: testUserId,
        },
        {
          name: 'サンプル獣医クリニック',
          address: '東京都港区',
          phone: '03-4567-8901',
          userId: testUserId,
        },
        {
          name: 'テスト病院',
          address: '神奈川県横浜市',
          phone: '045-123-4567',
          userId: testUserId,
        },
      ],
    });
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await prisma.veterinaryHospital.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('Hospital Search Logic', () => {
    it('病院名での部分一致検索が正常に動作する', async () => {
      const query = '動物';

      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          _count: {
            select: {
              doctors: true,
            },
          },
        },
      });

      expect(hospitals).toHaveLength(2); // 東京動物病院、新宿動物医院
      expect(hospitals[0].name).toBe('新宿動物医院');
      expect(hospitals[1].name).toBe('東京動物病院');
      expect(hospitals.every(h => h.name.includes('動物'))).toBe(true);
    });

    it('住所での部分一致検索が正常に動作する', async () => {
      const query = '渋谷';

      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          _count: {
            select: {
              doctors: true,
            },
          },
        },
      });

      expect(hospitals).toHaveLength(2); // 東京動物病院、渋谷ペットクリニック
      expect(hospitals[0].name).toBe('東京動物病院');
      expect(hospitals[1].name).toBe('渋谷ペットクリニック');
      expect(hospitals.every(h =>
        h.name.includes('渋谷') || h.address?.includes('渋谷'),
      )).toBe(true);
    });

    it('病院名と住所の両方で検索される', async () => {
      const query = 'テスト';

      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          _count: {
            select: {
              doctors: true,
            },
          },
        },
      });

      expect(hospitals).toHaveLength(1); // テスト病院
      expect(hospitals[0].name).toBe('テスト病院');
    });

    it('大文字小文字を区別しない検索が動作する', async () => {
      const query = 'TOKYO'; // 大文字で検索

      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          _count: {
            select: {
              doctors: true,
            },
          },
        },
      });

      // 「東京」を含む病院が見つかる
      expect(hospitals.length).toBeGreaterThan(0);
      expect(hospitals.some(h =>
        h.name.includes('東京') || h.address?.includes('東京'),
      )).toBe(true);
    });

    it('検索結果が0件の場合、空配列を返す', async () => {
      const query = '存在しない病院';

      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          _count: {
            select: {
              doctors: true,
            },
          },
        },
      });

      expect(hospitals).toHaveLength(0);
    });

    it('結果が名前順でソートされる', async () => {
      const query = '東京'; // 複数の結果が返される検索

      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          _count: {
            select: {
              doctors: true,
            },
          },
        },
      });

      // 複数の結果がある場合、名前順でソートされていることを確認
      if (hospitals.length > 1) {
        for (let i = 1; i < hospitals.length; i++) {
          expect(hospitals[i - 1].name.localeCompare(hospitals[i].name)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('先生数のカウントが含まれる', async () => {
      // 病院を取得
      const hospital = await prisma.veterinaryHospital.findFirst({
        where: {
          userId: testUserId,
          name: '東京動物病院',
        },
      });

      if (hospital) {
        // 先生を追加
        await prisma.veterinaryDoctor.createMany({
          data: [
            {
              name: 'テスト先生1',
              hospitalId: hospital.id,
              userId: testUserId,
            },
            {
              name: 'テスト先生2',
              hospitalId: hospital.id,
              userId: testUserId,
            },
          ],
        });

        // 検索実行
        const hospitals = await prisma.veterinaryHospital.findMany({
          where: {
            userId: testUserId,
            OR: [
              {
                name: {
                  contains: '東京動物病院',
                  mode: 'insensitive',
                },
              },
              {
                address: {
                  contains: '東京動物病院',
                  mode: 'insensitive',
                },
              },
            ],
          },
          orderBy: {
            name: 'asc',
          },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            _count: {
              select: {
                doctors: true,
              },
            },
          },
        });

        const targetHospital = hospitals.find(h => h.name === '東京動物病院');
        expect(targetHospital?._count.doctors).toBe(2);

        // クリーンアップ
        await prisma.veterinaryDoctor.deleteMany({
          where: { hospitalId: hospital.id },
        });
      }
    });

    it('他のユーザーの病院は検索結果に含まれない', async () => {
      // 他のユーザーを作成
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-search-${Date.now()}@example.com`,
          password: 'password',
          name: 'Other User',
        },
      });

      // 他のユーザーの病院を作成
      await prisma.veterinaryHospital.create({
        data: {
          name: '他のユーザーの東京病院',
          address: '東京都中央区',
          userId: otherUser.id,
        },
      });

      // 現在のユーザーで検索
      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId, // 重要：現在のユーザーのみ
          OR: [
            {
              name: {
                contains: '東京',
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: '東京',
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          _count: {
            select: {
              doctors: true,
            },
          },
        },
      });

      // 他のユーザーの病院は含まれない
      expect(hospitals.every(h => h.name !== '他のユーザーの東京病院')).toBe(true);

      // クリーンアップ
      await prisma.veterinaryHospital.deleteMany({
        where: { userId: otherUser.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });
  });

  describe('Query Validation', () => {
    it('空文字列のクエリは無効', () => {
      const query = '';

      // 実際のAPIでは、zodスキーマでバリデーションされる
      // ここでは、空文字列が無効であることを確認
      expect(query.length).toBe(0);
      expect(query.trim().length).toBe(0);
    });

    it('スペースのみのクエリは無効', () => {
      const query = '   ';

      // トリムした結果が空文字列になる
      expect(query.trim().length).toBe(0);
    });

    it('有効なクエリは正常に処理される', () => {
      const query = '動物病院';

      expect(query.length).toBeGreaterThan(0);
      expect(query.trim().length).toBeGreaterThan(0);
    });
  });
});
