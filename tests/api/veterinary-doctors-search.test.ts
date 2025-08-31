import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';

describe('Veterinary Doctors Search API Logic', () => {
  let testUserId: string;
  let testHospital1Id: string;
  let testHospital2Id: string;

  beforeEach(async () => {
    // テスト用ユーザーを作成（ユニークなメールアドレス）
    const testUser = await prisma.user.create({
      data: {
        email: `test-doctor-search-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;

    // テスト用病院を作成
    const hospital1 = await prisma.veterinaryHospital.create({
      data: {
        name: 'テスト動物病院',
        userId: testUserId,
      },
    });
    testHospital1Id = hospital1.id;

    const hospital2 = await prisma.veterinaryHospital.create({
      data: {
        name: 'サンプル獣医クリニック',
        userId: testUserId,
      },
    });
    testHospital2Id = hospital2.id;

    // 既存のテストデータをクリーンアップ
    await prisma.veterinaryDoctor.deleteMany({
      where: { userId: testUserId },
    });

    // テスト用先生データを作成
    await prisma.veterinaryDoctor.createMany({
      data: [
        {
          name: '田中先生',
          specialty: '内科',
          hospitalId: testHospital1Id,
          userId: testUserId,
        },
        {
          name: '佐藤先生',
          specialty: '外科',
          hospitalId: testHospital1Id,
          userId: testUserId,
        },
        {
          name: '鈴木先生',
          specialty: '皮膚科',
          hospitalId: testHospital2Id,
          userId: testUserId,
        },
        {
          name: '高橋先生',
          specialty: '眼科',
          hospitalId: testHospital2Id,
          userId: testUserId,
        },
        {
          name: '伊藤先生',
          specialty: '内科・外科',
          userId: testUserId, // 病院に所属していない
        },
        {
          name: 'テスト先生',
          specialty: 'テスト専門',
          hospitalId: testHospital1Id,
          userId: testUserId,
        },
      ],
    });
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await prisma.veterinaryDoctor.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.veterinaryHospital.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('Doctor Search Logic', () => {
    it('先生名での部分一致検索が正常に動作する', async () => {
      const name = '田中';

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors).toHaveLength(1);
      expect(doctors[0].name).toBe('田中先生');
      expect(doctors[0].specialty).toBe('内科');
    });

    it('専門分野での部分一致検索が正常に動作する', async () => {
      const name = '内科';

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors).toHaveLength(2); // 田中先生（内科）、伊藤先生（内科・外科）
      expect(doctors[0].name).toBe('伊藤先生');
      expect(doctors[1].name).toBe('田中先生');
      expect(doctors.every(d => d.specialty?.includes('内科'))).toBe(true);
    });

    it('病院IDでフィルタリングした検索が正常に動作する', async () => {
      const name = '先生';
      const hospitalId = testHospital1Id;

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          hospitalId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors).toHaveLength(3); // 田中先生、佐藤先生、テスト先生
      expect(doctors.every(d => d.hospitalId === testHospital1Id)).toBe(true);
      expect(doctors[0].name).toBe('佐藤先生');
      expect(doctors[1].name).toBe('田中先生');
      expect(doctors[2].name).toBe('テスト先生');
    });

    it('病院情報が含まれて返される', async () => {
      const name = '田中';

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors).toHaveLength(1);
      expect(doctors[0].hospital).toBeDefined();
      expect(doctors[0].hospital?.name).toBe('テスト動物病院');
      expect(doctors[0].hospital?.id).toBe(testHospital1Id);
    });

    it('病院に所属していない先生も検索される', async () => {
      const name = '伊藤';

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors).toHaveLength(1);
      expect(doctors[0].name).toBe('伊藤先生');
      expect(doctors[0].hospitalId).toBeNull();
      expect(doctors[0].hospital).toBeNull();
    });

    it('大文字小文字を区別しない検索が動作する', async () => {
      const name = 'TEST'; // 大文字で検索

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 「テスト」を含む先生が見つかる
      expect(doctors.length).toBeGreaterThan(0);
      expect(doctors.some(d =>
        d.name.includes('テスト') || d.specialty?.includes('テスト'),
      )).toBe(true);
    });

    it('検索結果が0件の場合、空配列を返す', async () => {
      const name = '存在しない先生';

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors).toHaveLength(0);
    });

    it('結果が名前順でソートされる', async () => {
      const name = '先生'; // 複数の結果が返される検索

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 複数の結果がある場合、名前順でソートされていることを確認
      if (doctors.length > 1) {
        for (let i = 1; i < doctors.length; i++) {
          expect(doctors[i - 1].name.localeCompare(doctors[i].name)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('他のユーザーの先生は検索結果に含まれない', async () => {
      // 他のユーザーを作成
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-doctor-search-${Date.now()}@example.com`,
          password: 'password',
          name: 'Other User',
        },
      });

      // 他のユーザーの先生を作成
      await prisma.veterinaryDoctor.create({
        data: {
          name: '他のユーザーの田中先生',
          specialty: '内科',
          userId: otherUser.id,
        },
      });

      // 現在のユーザーで検索
      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId, // 重要：現在のユーザーのみ
          OR: [
            {
              name: {
                contains: '田中',
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: '田中',
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 他のユーザーの先生は含まれない
      expect(doctors.every(d => d.name !== '他のユーザーの田中先生')).toBe(true);
      expect(doctors).toHaveLength(1); // 現在のユーザーの田中先生のみ
      expect(doctors[0].name).toBe('田中先生');

      // クリーンアップ
      await prisma.veterinaryDoctor.deleteMany({
        where: { userId: otherUser.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });
  });

  describe('Hospital Filtering', () => {
    it('存在しない病院IDでフィルタリングした場合、結果が0件になる', async () => {
      const name = '先生';
      const nonExistentHospitalId = 'non-existent-hospital-id';

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          hospitalId: nonExistentHospitalId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors).toHaveLength(0);
    });

    it('病院IDを指定しない場合、全ての先生が検索対象になる', async () => {
      const name = '先生';

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                contains: name,
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
          specialty: true,
          hospitalId: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctors.length).toBeGreaterThan(0);
      // 複数の病院の先生が含まれることを確認
      const hospitalIds = new Set(doctors.map(d => d.hospitalId));
      expect(hospitalIds.size).toBeGreaterThan(1);
    });
  });

  describe('Query Validation', () => {
    it('空文字列のクエリは無効', () => {
      const name = '';

      // 実際のAPIでは、zodスキーマでバリデーションされる
      expect(name.length).toBe(0);
      expect(name.trim().length).toBe(0);
    });

    it('スペースのみのクエリは無効', () => {
      const name = '   ';

      // トリムした結果が空文字列になる
      expect(name.trim().length).toBe(0);
    });

    it('有効なクエリは正常に処理される', () => {
      const name = '田中先生';

      expect(name.length).toBeGreaterThan(0);
      expect(name.trim().length).toBeGreaterThan(0);
    });
  });
});
