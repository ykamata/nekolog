import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('有効なIDを指定してください'),
});

// マスタデータの検索または作成を行うヘルパー関数
async function findOrCreateTreatments(treatmentNames: string[]) {
  const treatments = [];

  for (const name of treatmentNames) {
    let treatment = await prisma.veterinaryTreatment.findFirst({
      where: { name },
    });

    if (!treatment) {
      treatment = await prisma.veterinaryTreatment.create({
        data: { name },
      });
    }

    treatments.push(treatment);
  }

  return treatments;
}

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // 予約情報の取得（ステータスチェックなし - フロントエンドで既に完了に更新済み）
    const appointment = await prisma.veterinaryAppointment.findUnique({
      where: { id },
      include: {
        cat: true,
        hospital: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された予約が見つかりません',
      });
    }

    // 治療内容の準備
    let treatments: any[] = [];
    if (appointment.plannedTreatments) {
      // plannedTreatmentsは文字列なので、配列に変換してから処理
      treatments = await findOrCreateTreatments([appointment.plannedTreatments]);
    }

    // JSTの現在時刻を計算（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // 通院記録の作成
    const visit = await prisma.veterinaryVisit.create({
      data: {
        catId: appointment.catId,
        visitDate: appointment.appointmentDate,
        hospitalId: appointment.hospitalId,
        doctorId: appointment.doctorId,
        cost: 0, // 費用は0円固定
        notes: appointment.notes || null,
        hasBloodTest: false, // デフォルトはfalse
        createdAt: nowJST,
        updatedAt: nowJST,
        treatments: {
          create: treatments.map(treatment => ({
            treatmentId: treatment.id,
          })),
        },
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
    });

    // レスポンスの整形（日付をローカルISO文字列に変換、treatmentsをフラット化）
    const transformedVisit = {
      ...visit,
      visitDate: toLocalISOString(visit.visitDate),
      createdAt: toLocalISOString(visit.createdAt),
      updatedAt: toLocalISOString(visit.updatedAt),
      treatments: visit.treatments.map(vt => vt.treatment),
    };

    return {
      visit: transformedVisit,
      message: '通院記録が作成されました',
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '入力データが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('❌ Error creating visit from appointment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '通院記録の作成に失敗しました',
    });
  }
});
