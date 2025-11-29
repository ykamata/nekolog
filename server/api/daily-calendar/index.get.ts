import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { calendarDataQuerySchema } from '~/lib/validations/daily-calendar';
import type { DailyCalendarData, MonthlyCalendarData } from '~/types/daily-calendar';

/**
 * Get monthly calendar data with aggregated information
 * GET /api/daily-calendar?year=2024&month=1&catId=1
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'GET');

    const query = getQuery(event);
    const validated = calendarDataQuerySchema.parse(query);

    const { year, month, catId } = validated;

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all daily notes for the month
    const dailyNotes = await prisma.dailyNote.findMany({
      where: {
        ...(catId ? { catId } : {}),
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get health signals for the month
    const healthSignals = await prisma.catHealthSignal.findMany({
      where: {
        ...(catId ? { catId } : {}),
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get meal counts per day
    const mealCounts = await prisma.mealRecord.groupBy({
      by: ['catId'],
      where: {
        ...(catId ? { catId } : {}),
        mealTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get meal records with calories
    const mealRecords = await prisma.mealRecord.findMany({
      where: {
        ...(catId ? { catId } : {}),
        mealTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        catId: true,
        mealTime: true,
        calories: true,
      },
    });

    // Get excretion counts per day
    const excretionRecords = await prisma.excretionRecord.findMany({
      where: {
        ...(catId ? { catId } : {}),
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        catId: true,
        type: true,
        recordedAt: true,
      },
    });

    // Build calendar data for each day
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: DailyCalendarData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Find daily note for this date
      const dailyNote = dailyNotes.find((note: { date: Date }) => {
        const noteDate = new Date(note.date);
        return noteDate.toISOString().split('T')[0] === dateStr;
      });

      // Find health signal for this date
      const healthSignal = healthSignals.find((signal: { date: Date, catId: number }) => {
        const signalDate = new Date(signal.date);
        return signalDate.toISOString().split('T')[0] === dateStr &&
               (!catId || signal.catId === catId);
      });

      // Get meals for this day
      const dayMeals = mealRecords.filter((meal) => {
        const mealDate = new Date(meal.mealTime);
        return mealDate.toISOString().split('T')[0] === dateStr &&
               (!catId || meal.catId === catId);
      });

      // Calculate total calories
      const totalCalories = dayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

      // Get excretions for this day
      const dayExcretions = excretionRecords.filter((excretion) => {
        const excretionDate = new Date(excretion.recordedAt);
        return excretionDate.toISOString().split('T')[0] === dateStr &&
               (!catId || excretion.catId === catId);
      });

      // Get excretion times (extract time portion from datetime string)
      const urineTimes = dayExcretions
        .filter(e => e.type === 'URINE')
        .map(e => {
          // Extract HH:mm from datetime string (YYYY-MM-DDTHH:mm:ss or ISO string)
          const timeStr = e.recordedAt instanceof Date
            ? e.recordedAt.toISOString()
            : String(e.recordedAt);
          const timePart = timeStr.split('T')[1]?.substring(0, 5) || '00:00';
          return timePart;
        });

      const fecesTimes = dayExcretions
        .filter(e => e.type === 'FECES')
        .map(e => {
          // Extract HH:mm from datetime string (YYYY-MM-DDTHH:mm:ss or ISO string)
          const timeStr = e.recordedAt instanceof Date
            ? e.recordedAt.toISOString()
            : String(e.recordedAt);
          const timePart = timeStr.split('T')[1]?.substring(0, 5) || '00:00';
          return timePart;
        });

      days.push({
        date: dateStr || '',
        catId: catId || 0,
        dailyNote: dailyNote || null,
        mealCount: dayMeals.length,
        totalCalories: Math.round(totalCalories),
        excretionCount: {
          urine: urineTimes.length,
          feces: fecesTimes.length,
          total: urineTimes.length + fecesTimes.length,
        },
        excretionTimes: {
          urine: urineTimes,
          feces: fecesTimes,
        },
        hasEmergencyMedication: dailyNote?.emergencyMedication || false,
        hasMemo: Boolean(dailyNote?.memo),
        signalColor: healthSignal?.color || null,
        signalNote: healthSignal?.note || null,
      });
    }

    const response: MonthlyCalendarData = {
      year,
      month,
      catId,
      days,
    };

    return response;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request parameters',
        data: error.errors,
      });
    }

    console.error('❌ カレンダーデータ取得エラー:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
