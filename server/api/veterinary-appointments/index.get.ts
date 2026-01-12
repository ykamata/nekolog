import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryAppointmentFilterSchema } from '~/lib/validations/veterinary-visit';
import { parseLocalDateString, parseLocalDateStringEndOfDay, toLocalISOString } from '~/utils/cat-meal';

// クエリパラメータのスキーマ（文字列から適切な型に変換）
const querySchema = z.object({
  catId: z.coerce.number().positive().optional(),
  hospitalId: z.coerce.number().positive().optional(),
  doctorId: z.coerce.number().positive().optional(),
  status: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .transform(val => (val ? parseLocalDateString(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform(val => (val ? parseLocalDateStringEndOfDay(val) : undefined)),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional()
    .default('20'),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(0))
    .optional()
    .default('0'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const parsedQuery = querySchema.parse(query);

    // Validate with the main filter schema
    const {
      catId,
      hospitalId,
      doctorId,
      status,
      startDate,
      endDate,
      limit,
      offset,
    } = VeterinaryAppointmentFilterSchema.parse(parsedQuery);

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

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) {
        where.appointmentDate.gte = startDate;
      }
      if (endDate) {
        where.appointmentDate.lte = endDate;
      }
    }

    // Get veterinary appointments with related data
    const [appointments, total] = await Promise.all([
      prisma.veterinaryAppointment.findMany({
        where,
        orderBy: { appointmentDate: 'asc' },
        take: limit,
        skip: offset,
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
        },
      }),
      prisma.veterinaryAppointment.count({ where }),
    ]);

    // Add optimized caching headers based on data freshness
    const cacheMaxAge = status === 'SCHEDULED' ? 60 : 300; // 1min for scheduled, 5min for others
    setHeader(
      event,
      'Cache-Control',
      `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge * 2}`,
    );
    setHeader(event, 'ETag', `"appointments-${total}-${offset}-${limit}"`);

    // Add performance headers
    setHeader(event, 'X-Total-Count', total.toString());
    setHeader(event, 'X-Page-Size', limit.toString());
    setHeader(event, 'X-Current-Offset', offset.toString());

    return {
      appointments: appointments.map(appointment => ({
        ...appointment,
        appointmentDate: toLocalISOString(appointment.appointmentDate),
        createdAt: toLocalISOString(appointment.createdAt),
        updatedAt: toLocalISOString(appointment.updatedAt),
        // cat, hospital, doctor are already selected with specific fields only
        // No date transformation needed as they don't include date fields in the select
      })),
      total,
      hasMore: offset + limit < total,
      pagination: {
        limit,
        offset,
        total,
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
    console.error('Error fetching veterinary appointments:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '予約の取得に失敗しました',
    });
  }
});
