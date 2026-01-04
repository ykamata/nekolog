import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { VeterinaryVisitFilterSchema } from "~/lib/validations/veterinary-visit";
import { parseLocalDateString, parseLocalDateStringEndOfDay } from "~/utils/cat-meal";

// クエリパラメータのスキーマ（文字列から適切な型に変換）
const querySchema = z.object({
  catId: z.coerce.number().positive().optional(),
  hospitalId: z.coerce.number().positive().optional(),
  doctorId: z.coerce.number().positive().optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? parseLocalDateString(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? parseLocalDateStringEndOfDay(val) : undefined)),
  hasBloodTest: z
    .string()
    .optional()
    .transform((val) =>
      val === "true" ? true : val === "false" ? false : undefined
    ),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional()
    .default("20"),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(0))
    .optional()
    .default("0"),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, "GET");

    // Parse and validate query parameters
    const query = getQuery(event);
    const parsedQuery = querySchema.parse(query);

    // Validate with the main filter schema
    const {
      catId,
      hospitalId,
      doctorId,
      startDate,
      endDate,
      hasBloodTest,
      limit,
      offset,
    } = VeterinaryVisitFilterSchema.parse(parsedQuery);

    // Build where clause
    const where: Record<string, any> = {};

    if (catId) {
      where.catId = catId;
    }

    if (hospitalId) {
      where.hospitalId = hospitalId;
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) {
        where.visitDate.gte = startDate;
      }
      if (endDate) {
        where.visitDate.lte = endDate;
      }
    }

    if (hasBloodTest !== undefined) {
      where.hasBloodTest = hasBloodTest;
    }

    // デバッグログ
    console.log("🔍 GET /api/veterinary-visits クエリ条件:", {
      parsedQuery,
      where,
      limit,
      offset,
    });

    // Get veterinary visits with related data
    const [visits, total] = await Promise.all([
      prisma.veterinaryVisit.findMany({
        where,
        orderBy: { visitDate: "desc" },
        take: limit,
        skip: offset,
        include: {
          cat: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
            },
          },
          treatments: {
            include: {
              treatment: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  description: true,
                },
              },
            },
          },
        },
      }),
      prisma.veterinaryVisit.count({ where }),
    ]);

    // Transform the data (保持: visit.treatments[].treatment に名前が入る構造を維持)
    const transformedVisits = visits.map((visit) => ({
      ...visit,
      treatments: visit.treatments.map((vt) => ({
        ...vt,
        treatment: vt.treatment,
      })),
    }));

    // Add optimized caching headers based on data freshness
    const cacheMaxAge =
      hasBloodTest !== undefined || startDate || endDate ? 30 : 300; // 30s for filtered, 5min for general
    setHeader(
      event,
      "Cache-Control",
      `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge * 2}`
    );
    setHeader(event, "ETag", `"visits-${total}-${offset}-${limit}"`);

    // Add performance headers
    setHeader(event, "X-Total-Count", total.toString());
    setHeader(event, "X-Page-Size", limit.toString());
    setHeader(event, "X-Current-Offset", offset.toString());

    return {
      visits: transformedVisits,
      total,
      hasMore: offset + limit < total,
      pagination: {
        limit,
        offset,
        total,
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
    console.error("Error fetching veterinary visits:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "通院記録の取得に失敗しました",
    });
  }
});
