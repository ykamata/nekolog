import { z } from "zod";
import { prisma } from "~/lib/prisma";

// カレンダー表示用に最適化されたクエリパラメータ
const calendarQuerySchema = z.object({
  catId: z.coerce.number().positive().optional(),
  year: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(2020).max(2030))
    .optional(),
  month: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(12))
    .optional(),
  includeAppointments: z
    .string()
    .optional()
    .transform((val) => val === "true")
    .default("false"),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, "GET");

    // Parse and validate query parameters
    const query = getQuery(event);
    const { catId, year, month, includeAppointments } =
      calendarQuerySchema.parse(query);

    // デフォルトで現在の年月を使用
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    // 月の開始日と終了日を計算
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // 通院記録のクエリ条件
    const visitWhere: Record<string, any> = {
      visitDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (catId) {
      visitWhere.catId = catId;
    }

    // カレンダー表示用に最適化されたクエリ（必要最小限のデータのみ取得）
    const visitsPromise = prisma.veterinaryVisit.findMany({
      where: visitWhere,
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
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { visitDate: "asc" },
    });

    // 予約データも含める場合
    let appointmentsPromise: Promise<any[]> = Promise.resolve([]);
    if (includeAppointments) {
      const appointmentWhere: Record<string, any> = {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
        status: "SCHEDULED",
      };

      if (catId) {
        appointmentWhere.catId = catId;
      }

      appointmentsPromise = prisma.veterinaryAppointment.findMany({
        where: appointmentWhere,
        select: {
          id: true,
          appointmentDate: true,
          catId: true,
          status: true,
          plannedTreatments: true,
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
          doctor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { appointmentDate: "asc" },
      });
    }

    const [visits, appointments] = await Promise.all([
      visitsPromise,
      appointmentsPromise,
    ]);

    // 日付ごとにグループ化してカレンダー表示用に最適化
    const calendarData: Record<string, any> = {};

    // 通院記録を日付ごとにグループ化
    visits.forEach((visit) => {
      console.log(visit);
      const dateKey = visit.visitDate.toISOString().split("T")[0];
      if (dateKey && !calendarData[dateKey]) {
        calendarData[dateKey] = {
          date: dateKey,
          visits: [],
          appointments: [],
          hasBloodTest: false,
          totalCost: 0,
          catCount: new Set(),
        };
      }

      if (dateKey) {
        calendarData[dateKey].visits.push(visit);
        calendarData[dateKey].hasBloodTest =
          calendarData[dateKey].hasBloodTest || visit.hasBloodTest;
        calendarData[dateKey].totalCost += visit.cost;
        calendarData[dateKey].catCount.add(visit.catId);
      }
    });

    // 予約を日付ごとにグループ化
    appointments.forEach((appointment) => {
      const dateKey = appointment.appointmentDate.toISOString().split("T")[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = {
          date: dateKey,
          visits: [],
          appointments: [],
          hasBloodTest: false,
          totalCost: 0,
          catCount: new Set(),
        };
      }

      calendarData[dateKey].appointments.push(appointment);
      calendarData[dateKey].catCount.add(appointment.catId);
    });

    // Set を配列に変換し、統計情報を追加
    const processedCalendarData = Object.values(calendarData).map(
      (dayData) => ({
        ...dayData,
        catCount: dayData.catCount.size,
        totalEvents: dayData.visits.length + dayData.appointments.length,
      })
    );

    // 統計情報を計算
    const stats = {
      totalVisits: visits.length,
      totalAppointments: appointments.length,
      totalCost: visits.reduce((sum, visit) => sum + visit.cost, 0),
      bloodTestCount: visits.filter((visit) => visit.hasBloodTest).length,
      uniqueCats: new Set([
        ...visits.map((v) => v.catId),
        ...appointments.map((a) => a.catId),
      ]).size,
      daysWithEvents: processedCalendarData.length,
    };

    // 効率的なキャッシュ設定（月データは比較的安定）
    const cacheMaxAge =
      targetMonth === currentDate.getMonth() + 1 &&
      targetYear === currentDate.getFullYear()
        ? 300 // 現在月は5分
        : 3600; // 過去月は1時間

    setHeader(
      event,
      "Cache-Control",
      `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge * 2}`
    );
    setHeader(
      event,
      "ETag",
      `"calendar-${targetYear}-${targetMonth}-${
        catId || "all"
      }-${includeAppointments}"`
    );

    // パフォーマンス情報をヘッダーに追加
    setHeader(event, "X-Query-Count", "2"); // visits + appointments
    setHeader(event, "X-Result-Count", processedCalendarData.length.toString());

    return {
      year: targetYear,
      month: targetMonth,
      calendarData: processedCalendarData,
      stats,
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeAppointments,
        catId: catId || null,
      },
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "クエリパラメータが無効です",
        data: error.errors,
      });
    }

    // Handle unexpected errors
    console.error("Error fetching calendar data:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "カレンダーデータの取得に失敗しました",
    });
  }
});
