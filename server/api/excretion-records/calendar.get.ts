import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { ExcretionCalendarQuerySchema } from '~/lib/validations/excretion';
import { performanceMonitor } from '~/utils/performance-monitor';

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { catId, year, month } = ExcretionCalendarQuerySchema.parse(query);

    // デフォルトで現在の年月を使用
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    // 月の開始日と終了日を計算
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // 排泄記録のクエリ条件
    const where: Record<string, any> = {
      recordedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (catId) {
      where.catId = catId;
    }

    // カレンダー表示用に最適化されたクエリ（必要最小限のデータのみ取得）
    const excretionRecords = await performanceMonitor.measure(
      'excretion-calendar-query',
      () => prisma.excretionRecord.findMany({
        where,
        select: {
          id: true,
          type: true,
          recordedAt: true,
          notes: true,
          catId: true,
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { recordedAt: 'asc' },
      }),
      {
        year: targetYear,
        month: targetMonth,
        catId: catId || 'all',
      },
    );

    // 日付ごとにグループ化してカレンダー表示用に最適化
    const calendarData: Record<string, any> = {};

    excretionRecords.forEach((record) => {
      const dateKey = record.recordedAt.toISOString().split('T')[0];
      if (!dateKey) return; // dateKeyがundefinedの場合はスキップ

      if (!calendarData[dateKey]) {
        calendarData[dateKey] = {
          date: dateKey,
          records: [],
          hasNotes: false,
          urineCount: 0,
          fecesCount: 0,
          catCount: new Set(),
        };
      }

      // カレンダー表示用の記録データを作成
      const calendarRecord = {
        id: record.id,
        type: record.type,
        time: record.recordedAt.toTimeString().slice(0, 5), // HH:MM形式
        hasNotes: !!record.notes,
        catName: record.cat.name,
      };

      calendarData[dateKey].records.push(calendarRecord);
      calendarData[dateKey].hasNotes = calendarData[dateKey].hasNotes || !!record.notes;
      calendarData[dateKey].catCount.add(record.catId);

      // タイプ別カウント
      if (record.type === 'URINE') {
        calendarData[dateKey].urineCount++;
      }
      else if (record.type === 'FECES') {
        calendarData[dateKey].fecesCount++;
      }
    });

    // Set を配列に変換し、統計情報を追加
    const processedCalendarData = Object.values(calendarData).map(dayData => ({
      ...dayData,
      catCount: dayData.catCount.size,
      totalRecords: dayData.records.length,
    }));

    // 統計情報を計算
    const stats = {
      totalRecords: excretionRecords.length,
      urineRecords: excretionRecords.filter(r => r.type === 'URINE').length,
      fecesRecords: excretionRecords.filter(r => r.type === 'FECES').length,
      recordsWithNotes: excretionRecords.filter(r => r.notes).length,
      uniqueCats: new Set(excretionRecords.map(r => r.catId)).size,
      daysWithRecords: processedCalendarData.length,
    };

    // 効率的なキャッシュ設定（月データは比較的安定）
    const cacheMaxAge = targetMonth === currentDate.getMonth() + 1 && targetYear === currentDate.getFullYear()
      ? 300 // 現在月は5分
      : 3600; // 過去月は1時間

    setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge * 2}`);
    setHeader(event, 'ETag', `"excretion-calendar-${targetYear}-${targetMonth}-${catId || 'all'}"`);

    // パフォーマンス情報をヘッダーに追加
    setHeader(event, 'X-Query-Count', '1');
    setHeader(event, 'X-Result-Count', processedCalendarData.length.toString());

    return {
      year: targetYear,
      month: targetMonth,
      records: processedCalendarData,
      stats,
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        catId: catId || null,
      },
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'クエリパラメータが無効です',
        data: error.errors,
      });
    }

    // Handle unexpected errors
    console.error('Error fetching excretion calendar data:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '排泄記録カレンダーデータの取得に失敗しました',
    });
  }
});
