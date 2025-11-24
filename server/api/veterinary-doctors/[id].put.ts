import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { requireAuth } from "~/lib/auth-middleware";
import { veterinaryDoctorSchema } from "~/lib/validations/veterinary-master";
import {
  validateParams,
  validateBody,
  createApiErrorHandler,
} from "~/server/utils/error-handler";

// バリデーションスキーマを定義
const veterinaryIdSchema = z.object({ id: z.coerce.number().positive() });
const veterinaryDoctorUpdateSchema = z.object({
  name: z.string().optional(),
  hospitalId: z.coerce.number().positive().optional(),
  specialty: z.string().optional(),
  memo: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const errorHandler = createApiErrorHandler({
    endpoint: "veterinary-doctors",
    method: "PUT",
  });

  try {
    // 認証チェック
    const user = await requireAuth(event);

    // パラメータとボディを検証
    const params = getRouterParams(event);
    const { id } = validateParams(veterinaryIdSchema, params);
    const requestBody = await readBody(event);
    const body = validateBody(veterinaryDoctorUpdateSchema, requestBody);

    // 先生が存在し、ユーザーが所有者であることを確認
    const existingDoctor = await prisma.veterinaryDoctor.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!existingDoctor) {
      throw createError({
        statusCode: 404,
        statusMessage: "指定された先生が見つかりません",
        data: {
          code: "NOT_FOUND",
          resource: "doctor",
          id,
        },
      });
    }

    // 名前が変更される場合、重複チェック
    if (body.name && body.name !== existingDoctor.name) {
      const duplicateDoctor = await prisma.veterinaryDoctor.findFirst({
        where: {
          name: body.name,
          userId: user.userId,
          id: { not: id },
        },
      });

      if (duplicateDoctor) {
        throw createError({
          statusCode: 409,
          statusMessage: "この先生名は既に登録されています",
          data: {
            code: "DUPLICATE_NAME",
            field: "name",
            value: body.name,
          },
        });
      }
    }

    // 病院IDが指定されている場合、病院の存在確認
    if (body.hospitalId) {
      const hospital = await prisma.veterinaryHospital.findFirst({
        where: {
          id: body.hospitalId,
          userId: user.userId,
        },
      });

      if (!hospital) {
        throw createError({
          statusCode: 400,
          statusMessage: "指定された病院が存在しません",
          data: {
            code: "INVALID_HOSPITAL",
            field: "hospitalId",
            value: body.hospitalId,
          },
        });
      }
    }

    // 先生情報を更新
    const updatedDoctor = await prisma.veterinaryDoctor.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.hospitalId !== undefined && {
          hospitalId: body.hospitalId || null,
        }),
        ...(body.specialty !== undefined && {
          specialty: body.specialty || null,
        }),
        ...(body.memo !== undefined && { memo: body.memo || null }),
      },
      include: {
        hospital: true,
      },
    });

    return updatedDoctor;
  } catch (error) {
    throw errorHandler(error);
  }
});
