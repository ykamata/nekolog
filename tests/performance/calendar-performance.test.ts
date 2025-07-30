import { performance } from 'perf_hooks';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Cat, VeterinaryHospital, VeterinaryDoctor } from '@prisma/client';
import { prisma } from '~/lib/prisma';

/**
 * カレンダー機能のパフォーマンステスト
 * 大量データでのデータ取得性能、メモリ使用量を測定
 */

interface CalendarPerformanceMetric {
  operation: string;
  duration: number;
  dataSize: number;
  memoryUsage?: number;
  success: boolean;
}

describe('カレンダー機能 パフォーマンステスト', () => {
  let testCats: Cat[] = [];
  let testHospitals: VeterinaryHospital[] = [];
  let testDoctors: VeterinaryDoctor[] = [];
  let performanceMetrics: CalendarPerformanceMetric[] = [];

  // パフォーマンス測定ヘルパー
  const measureCalendarPerformance = async <T>(
    operation: string,
    fn: () => Promise<T> | T,
    dataSize: number = 0,
  ): Promise<{ result: T; metrics: CalendarPerformanceMetric }> => {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage().heapUsed;

      const metrics: CalendarPerformanceMetric = {
        operation,
        duration: endTime - startTime,
        dataSize,
        memoryUsage: memoryAfter - memoryBefore,
        success: true,
      };

      performanceMetrics.push(metrics);
      return { result, metrics };
    }
    catch (error) {
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage().heapUsed;

      const metrics: CalendarPerformanceMetric = {
        operation,
        duration: endTime - startTime,
        dataSize,
        memoryUsage: memoryAfter - memoryBefore,
        success: false,
      };

      performanceMetrics.push(metrics);
      throw error;
    }
  };

  beforeEach(async () => {
    testCats = await Promise.all([
      prisma.cat.create({
        data: {
          name: 'カレンダーテスト猫1',
          birthdate: new Date('2020-01-01'),
          weight: 4.5,
        },
      }),
      prisma.cat.create({
        data: {
          name: 'カレンダーテスト猫2',
          birthdate: new Date('2021-01-01'),
          weight: 3.8,
        },
      }),
    ]);

    testHospitals = await Promise.all([
      prisma.veterinaryHospital.create({
        data: {
          name: 'カレンダーテスト動物病院1',
          address: 'テスト住所1',
          phone: '000-0000-0001',
        },
      }),
      prisma.veterinaryHospital.create({
        data: {
          name: 'カレンダーテスト動物病院2',
          address: 'テスト住所2',
          phone: '000-0000-0002',
        },
      }),
    ]);

    testDoctors = await Promise.all([
      prisma.veterinaryDoctor.create({
        data: {
          name: 'カレンダーテスト先生1',
          hospitalId: testHospitals[0].id,
          specialization: '内科',
        },
      }),
      prisma.veterinaryDoctor.create({
        data: {
          name: 'カレンダーテスト先生2',
          hospitalId: testHospitals[1].id,
          specialization: '外科',
        },
      }),
    ]);

    performanceMetrics = [];
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
    console.log('\n=== カレンダーパフォーマンステスト結果 ===');
    performanceMetrics.forEach((metric) => {
      const memoryMB = metric.memoryUsage ? (metric.memoryUsage / 1024 / 1024).toFixed(2) : 'N/A';
    });
  });

  describe('大量データでのカレンダーデータ取得性能', () => {
    it('365日分のデータ取得が2秒以内に完了する', async () => {
      // 1年分のテストデータを作成
      const visitData = [];
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), 0, 1); // 年初

      for (let i = 0; i < 365; i++) {
        const visitDate = new Date(startDate);
        visitDate.setDate(startDate.getDate() + i);

        // 週に2-3回程度の頻度で通院記録を作成
        if (i % 3 === 0 || i % 7 === 0) {
          visitData.push({
            catId: testCats[i % testCats.length].id,
            visitDate,
            hospitalId: testHospitals[i % testHospitals.length].id,
            doctorId: testDoctors[i % testDoctors.length].id,
            cost: Math.floor(Math.random() * 10000) + 1000,
            notes: `年間カレンダーテスト記録 ${i}`,
            hasBloodTest: Math.random() > 0.8,
          });
        }
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { result, metrics } = await measureCalendarPerformance(
        'カレンダー年間データ取得',
        async () => {
          const yearStart = new Date(currentDate.getFullYear(), 0, 1);
          const yearEnd = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);

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
        visitData.length,
      );

      expect(metrics.duration).toBeLessThan(2000); // 2秒以内
      expect(metrics.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('月間カレンダーデータ取得が500ms以内に完了する', async () => {
      // 1ヶ月分のテストデータを作成（密度高め）
      const visitData = [];
      const currentDate = new Date();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const visitDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        // 毎日1-3件の記録を作成
        const recordsPerDay = Math.floor(Math.random() * 3) + 1;
        for (let record = 0; record < recordsPerDay; record++) {
          visitData.push({
            catId: testCats[record % testCats.length].id,
            visitDate,
            hospitalId: testHospitals[record % testHospitals.length].id,
            doctorId: testDoctors[record % testDoctors.length].id,
            cost: Math.floor(Math.random() * 10000) + 1000,
            notes: `月間カレンダーテスト記録 ${day}-${record}`,
            hasBloodTest: Math.random() > 0.7,
          });
        }
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { result, metrics } = await measureCalendarPerformance(
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
        visitData.length,
      );

      expect(metrics.duration).toBeLessThan(500); // 500ms以内
      expect(metrics.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('カレンダーAPI最適化テスト', () => {
    it('カレンダー専用APIが通常APIより高速である', async () => {
      // テストデータを作成
      const visitData = [];
      const currentDate = new Date();

      for (let i = 0; i < 100; i++) {
        const visitDate = new Date(currentDate);
        visitDate.setDate(currentDate.getDate() - i);

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `API比較テスト記録 ${i}`,
          hasBloodTest: Math.random() > 0.8,
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      // 通常のAPI（全データ取得）
      const { metrics: normalApiMetrics } = await measureCalendarPerformance(
        '通常API全データ取得',
        async () => {
          return await prisma.veterinaryVisit.findMany({
            include: {
              cat: true,
              hospital: true,
              doctor: true,
              treatments: {
                include: {
                  treatment: true,
                },
              },
            },
            orderBy: { visitDate: 'desc' },
          });
        },
        visitData.length,
      );

      // カレンダー最適化API（必要最小限のデータのみ）
      const { metrics: optimizedApiMetrics } = await measureCalendarPerformance(
        'カレンダー最適化API',
        async () => {
          return await prisma.veterinaryVisit.findMany({
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
            orderBy: { visitDate: 'desc' },
          });
        },
        visitData.length,
      );

      // 最適化APIの方が高速であることを確認
      expect(optimizedApiMetrics.duration).toBeLessThan(normalApiMetrics.duration);
      expect(optimizedApiMetrics.success).toBe(true);
      expect(normalApiMetrics.success).toBe(true);
    });
  });

  describe('メモリ効率性テスト', () => {
    it('大量データ処理時のメモリ使用量が適切な範囲内に収まる', async () => {
      // 大量のテストデータを作成
      const visitData = [];
      const currentDate = new Date();

      for (let i = 0; i < 500; i++) {
        const visitDate = new Date(currentDate);
        visitDate.setDate(currentDate.getDate() - (i % 365)); // 1年分に分散

        visitData.push({
          catId: testCats[i % testCats.length].id,
          visitDate,
          hospitalId: testHospitals[i % testHospitals.length].id,
          doctorId: testDoctors[i % testDoctors.length].id,
          cost: Math.floor(Math.random() * 10000) + 1000,
          notes: `メモリテスト記録 ${i}`.repeat(5), // 長いメモでメモリ使用量を増やす
          hasBloodTest: Math.random() > 0.8,
        });
      }

      await prisma.veterinaryVisit.createMany({
        data: visitData,
      });

      const { metrics } = await measureCalendarPerformance(
        'カレンダー大量データメモリテスト',
        async () => {
          const visits = await prisma.veterinaryVisit.findMany({
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

          // データを加工（メモリを使用する処理）
          return visits.map(visit => ({
            ...visit,
            formattedDate: visit.visitDate.toLocaleDateString('ja-JP'),
            costFormatted: `¥${visit.cost.toLocaleString()}`,
            summary: `${visit.cat.name}が${visit.hospital.name}で診察を受けました`,
          }));
        },
        visitData.length,
      );

      const memoryUsedMB = metrics.memoryUsage! / 1024 / 1024;

      expect(memoryUsedMB).toBeLessThan(50); // 50MB以下
      expect(metrics.success).toBe(true);
    });
  });
});
