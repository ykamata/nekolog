import { performance } from 'perf_hooks';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Cat, VeterinaryHospital, VeterinaryDoctor, VeterinaryTreatment } from '@prisma/client';
import { prisma } from '~/lib/prisma';

/**
 * 通院履歴管理機能のパフォーマンステスト
 * 大量データでのレスポンス時間、カレンダー表示パフォーマンス、メモリ使用量を測定
 */

interface PerformanceTestResult {
  operation: string;
  duration: number;
  dataSize: number;
  memoryBefore?: number;
  memoryAfter?: number;
  success: boolean;
}

describe('通院履歴管理 パフォーマンステスト', () => {
  let testCats: Cat[] = [];
  let testHospitals: VeterinaryHospital[] = [];
  let testDoctors: VeterinaryDoctor[] = [];
  let testTreatments: VeterinaryTreatment[] = [];
  let performanceResults: PerformanceTestResult[] = [];

  // パフォーマンス測定ヘルパー
  const measurePerformance = async <T>(
    operation: string,
    fn: () => Promise<T>,
    dataSize: number = 0,
  ): Promise<{ result: T; metrics: PerformanceTestResult }> => {
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    try {
      const result = await fn();
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage().heapUsed;

      const metrics: PerformanceTestResult = {
        operation,
        duration: endTime - startTime,
        dataSize,
        memoryBefore,
        memoryAfter,
        success: true,
      };

      performanceResults.push(metrics);
      return { result, metrics };
    }
    catch (error) {
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage().heapUsed;

      const metrics: PerformanceTestResult = {
        operation,
        duration: endTime - startTime,
        dataSize,
        memoryBefore,
        memoryAfter,
        success: false,
      };

      performanceResults.push(metrics);
      throw error;
    }
  };

  beforeEach(async () => {
    // テスト用の猫を作成
    testCats = await Promise.all([
      prisma.cat.create({
        data: {
          name: 'パフォーマンステスト猫1',
          birthdate: new Date('2020-01-01'),
          weight: 4.5,
        },
      }),
      prisma.cat.create({
        data: {
          name: 'パフォーマンステスト猫2',
          birthdate: new Date('2021-01-01'),
          weight: 3.8,
        },
      }),
    ]);

    // テスト用の病院を作成
    testHospitals = await Promise.all([
      prisma.veterinaryHospital.create({
        data: {
          name: 'パフォーマンステスト動物病院1',
          address: 'テスト住所1',
          phone: '000-0000-0001',
        },
      }),
      prisma.veterinaryHospital.create({
        data: {
          name: 'パフォーマンステスト動物病院2',
          address: 'テスト住所2',
          phone: '000-0000-0002',
        },
      }),
    ]);

    // テスト用の先生を作成
    testDoctors = await Promise.all([
      prisma.veterinaryDoctor.create({
        data: {
          name: 'テスト先生1',
          hospitalId: testHospitals[0].id,
          specialization: '内科',
        },
      }),
      prisma.veterinaryDoctor.create({
        data: {
          name: 'テスト先生2',
          hospitalId: testHospitals[1].id,
          specialization: '外科',
        },
      }),
    ]);

    // テスト用の処方内容を作成
    testTreatments = await Promise.all([
      prisma.veterinaryTreatment.create({
        data: {
          name: '健康診断',
          category: '検査',
          description: 'テスト用健康診断',
        },
      }),
      prisma.veterinaryTreatment.create({
        data: {
          name: '予防接種',
          category: '予防',
          description: 'テスト用予防接種',
        },
      }),
    ]);

    performanceResults = [];
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await prisma.veterinaryVisitTreatment.deleteMany({});
    await prisma.veterinaryVisit.deleteMany({});
    await prisma.veterinaryAppointment.deleteMany({});
    await prisma.veterinaryTreatment.deleteMany({});
    await prisma.veterinaryDoctor.deleteMany({});
    await prisma.veterinaryHospital.deleteMany({});
    await prisma.cat.deleteMany({});

    // パフォーマンス結果を出力
    console.log('\n=== パフォーマンステスト結果 ===');
    performanceResults.forEach((result) => {
      const memoryDiff = result.memoryAfter && result.memoryBefore
        ? (result.memoryAfter - result.memoryBefore) / 1024 / 1024
        : 0;
    });
  });

  describe('大量データでのレスポンス時間測定', () => {
    it('1000件の通院記録作成が10秒以内に完了する', async () => {
      const recordCount = 1000;
      const batchSize = 100;

      const { metrics } = await measurePerformance(
        '大量通院記録作成',
        async () => {
          const promises = [];

          for (let i = 0; i < recordCount; i += batchSize) {
            const batch = [];
            for (let j = 0; j < batchSize && i + j < recordCount; j++) {
              const visitDate = new Date();
              visitDate.setDate(visitDate.getDate() - (i + j));

              batch.push({
                catId: testCats[j % testCats.length].id,
                visitDate,
                hospitalId: testHospitals[j % testHospitals.length].id,
                doctorId: testDoctors[j % testDoctors.length].id,
                cost: Math.floor(Math.random() * 10000) + 1000,
                notes: `パフォーマンステスト記録 ${i + j}`,
                hasBloodTest: Math.random() > 0.7,
              });
            }

            promises.push(
              prisma.veterinaryVisit.createMany({
                data: batch,
              }),
            );
          }

          await Promise.all(promises);
        },
        recordCount,
      );

      expect(metrics.duration).toBeLessThan(10000); // 10秒以内
      expect(metrics.success).toBe(true);
    });

    it('1000件の通院記録取得が1秒以内に完了する', async () => {
      // 事前に1000件のデータを作成
      const recordCount = 1000;
      const visitData = [];

      for (let i = 0; i < recordCount; i++) {
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - i);

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `テスト記録 ${i}`,
          hasBloodTest: Math.random() > 0.7,
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { result, metrics } = await measurePerformance(
        '大量通院記録取得',
        async () => {
          return await prisma.veterinaryVisit.findMany({
            include: {
              cat: {
                select: {
                  id: true,
                  name: true,
                },
              },
              hospital: {
                select: {
                  id: true,
                  name: true,
                },
              },
              doctor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { visitDate: 'desc' },
          });
        },
        recordCount,
      );

      expect(metrics.duration).toBeLessThan(1000); // 1秒以内
      expect(result.length).toBe(recordCount);
      expect(metrics.success).toBe(true);
    });

    it('ページネーション付き取得が500ms以内に完了する', async () => {
      // 事前に500件のデータを作成
      const recordCount = 500;
      const visitData = [];

      for (let i = 0; i < recordCount; i++) {
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - i);

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `テスト記録 ${i}`,
          hasBloodTest: Math.random() > 0.7,
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { result, metrics } = await measurePerformance(
        'ページネーション取得',
        async () => {
          return await prisma.veterinaryVisit.findMany({
            take: 20,
            skip: 0,
            include: {
              cat: {
                select: {
                  id: true,
                  name: true,
                },
              },
              hospital: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { visitDate: 'desc' },
          });
        },
        20,
      );

      expect(metrics.duration).toBeLessThan(500); // 500ms以内
      expect(result.length).toBe(20);
      expect(metrics.success).toBe(true);
    });
  });

  describe('カレンダー表示パフォーマンステスト', () => {
    it('1年分のカレンダーデータ取得が1秒以内に完了する', async () => {
      // 1年分のデータを作成（365件）
      const visitData = [];
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      for (let i = 0; i < 365; i++) {
        const visitDate = new Date(startDate);
        visitDate.setDate(startDate.getDate() + i);

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `カレンダーテスト記録 ${i}`,
          hasBloodTest: Math.random() > 0.8,
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { result, metrics } = await measurePerformance(
        'カレンダー年間データ取得',
        async () => {
          const yearStart = new Date();
          yearStart.setFullYear(yearStart.getFullYear() - 1);
          yearStart.setMonth(0, 1);
          yearStart.setHours(0, 0, 0, 0);

          const yearEnd = new Date();
          yearEnd.setFullYear(yearEnd.getFullYear() - 1);
          yearEnd.setMonth(11, 31);
          yearEnd.setHours(23, 59, 59, 999);

          return await prisma.veterinaryVisit.findMany({
            where: {
              visitDate: {
                gte: yearStart,
                lte: yearEnd,
              },
            },
            select: {
              id: true,
              visitDate: true,
              catId: true,
              hasBloodTest: true,
              cost: true,
              cat: {
                select: {
                  id: true,
                  name: true,
                },
              },
              hospital: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { visitDate: 'asc' },
          });
        },
        365,
      );

      expect(metrics.duration).toBeLessThan(1000); // 1秒以内
      expect(result.length).toBeGreaterThan(0);
      expect(metrics.success).toBe(true);
    });

    it('月間カレンダーデータ取得が200ms以内に完了する', async () => {
      // 1ヶ月分のデータを作成（31件）
      const visitData = [];
      const currentDate = new Date();

      for (let i = 0; i < 31; i++) {
        const visitDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `月間テスト記録 ${i}`,
          hasBloodTest: Math.random() > 0.8,
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { result, metrics } = await measurePerformance(
        'カレンダー月間データ取得',
        async () => {
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

          return await prisma.veterinaryVisit.findMany({
            where: {
              visitDate: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
            select: {
              id: true,
              visitDate: true,
              catId: true,
              hasBloodTest: true,
              cost: true,
              notes: true,
              cat: {
                select: {
                  id: true,
                  name: true,
                },
              },
              hospital: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { visitDate: 'asc' },
          });
        },
        31,
      );

      expect(metrics.duration).toBeLessThan(200); // 200ms以内
      expect(result.length).toBeGreaterThan(0);
      expect(metrics.success).toBe(true);
    });
  });

  describe('メモリ使用量の監視', () => {
    it('大量データ処理時のメモリ使用量が100MB以下に収まる', async () => {
      const recordCount = 2000;

      const { metrics } = await measurePerformance(
        'メモリ使用量テスト',
        async () => {
          // 大量のデータを作成
          const visitData = [];
          for (let i = 0; i < recordCount; i++) {
            const visitDate = new Date();
            visitDate.setDate(visitDate.getDate() - i);

            visitData.push({
              catId: testCats[i % testCats.length].id,
              visitDate,
              hospitalId: testHospitals[i % testHospitals.length].id,
              doctorId: testDoctors[i % testDoctors.length].id,
              cost: Math.floor(Math.random() * 10000) + 1000,
              notes: `メモリテスト記録 ${i}`.repeat(10), // 長いメモを作成
              hasBloodTest: Math.random() > 0.7,
            });
          }

          await prisma.veterinaryVisit.createMany({
            data: visitData,
          });

          // データを取得して処理
          const visits = await prisma.veterinaryVisit.findMany({
            include: {
              cat: true,
              hospital: true,
              doctor: true,
            },
          });

          // データを加工（メモリを使用する処理）
          const processedData = visits.map(visit => ({
            ...visit,
            formattedDate: visit.visitDate.toLocaleDateString('ja-JP'),
            costFormatted: `¥${visit.cost.toLocaleString()}`,
            summary: `${visit.cat.name}が${visit.hospital.name}で診察を受けました`,
          }));

          return processedData;
        },
        recordCount,
      );

      const memoryUsed = metrics.memoryAfter! - metrics.memoryBefore!;
      const memoryUsedMB = memoryUsed / 1024 / 1024;

      expect(memoryUsedMB).toBeLessThan(100); // 100MB以下
      expect(metrics.success).toBe(true);
    });

    it('連続したAPI呼び出しでメモリリークが発生しない', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 事前にテストデータを作成
      const visitData = [];
      for (let i = 0; i < 100; i++) {
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - i);

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `リークテスト記録 ${i}`,
          hasBloodTest: Math.random() > 0.7,
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { metrics } = await measurePerformance(
        'メモリリークテスト',
        async () => {
          // 100回連続でデータを取得
          for (let i = 0; i < 100; i++) {
            const visits = await prisma.veterinaryVisit.findMany({
              take: 10,
              skip: i,
              include: {
                cat: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                hospital: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            });

            // データを処理（ガベージコレクションの対象にする）
            visits.forEach((visit) => {
              const temp = {
                id: visit.id,
                summary: `${visit.cat.name} - ${visit.hospital.name}`,
              };
              // tempは使用後に破棄される
            });
          }
        },
        100,
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      // メモリ増加が20MB以下であることを確認（メモリリークがないことの指標）
      expect(memoryIncrease).toBeLessThan(20);
      expect(metrics.success).toBe(true);
    });
  });

  describe('複合クエリのパフォーマンス', () => {
    it('複雑な検索条件での取得が1秒以内に完了する', async () => {
      // 複雑な検索用のテストデータを作成
      const recordCount = 500;
      const visitData = [];

      for (let i = 0; i < recordCount; i++) {
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - i);

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `複合検索テスト記録 ${i}`,
          hasBloodTest: i % 5 === 0, // 5件に1件血液検査あり
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { result, metrics } = await measurePerformance(
        '複合検索クエリ',
        async () => {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 100);
          const endDate = new Date();

          return await prisma.veterinaryVisit.findMany({
            where: {
              AND: [
                {
                  visitDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
                {
                  cost: {
                    gte: 3000,
                    lte: 8000,
                  },
                },
                {
                  hasBloodTest: true,
                },
                {
                  OR: [
                    {
                      hospitalId: testHospitals[0].id,
                    },
                    {
                      doctorId: testDoctors[0].id,
                    },
                  ],
                },
              ],
            },
            include: {
              cat: {
                select: {
                  id: true,
                  name: true,
                },
              },
              hospital: {
                select: {
                  id: true,
                  name: true,
                },
              },
              doctor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: [
              { visitDate: 'desc' },
              { cost: 'desc' },
            ],
          });
        },
        recordCount,
      );

      expect(metrics.duration).toBeLessThan(1000); // 1秒以内
      expect(result.length).toBeGreaterThan(0);
      expect(metrics.success).toBe(true);
    });
  });
});
