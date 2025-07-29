import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationInputSchema } from '~/lib/validations/medication';
import { withErrorContext, validateBody } from '~/server/utils/error-handler';

export default defineEventHandler(withErrorContext('/api/medications [POST]')(async (event) => {
  // Only allow POST method
  assertMethod(event, 'POST');

  // Parse and validate request body
  const body = await readBody(event);
  const medicationData = validateBody(MedicationInputSchema, body);

  // Check if medication with same name already exists
  const existingMedication = await prisma.medication.findFirst({
    where: {
      name: medicationData.name,
    },
  });

  if (existingMedication) {
    throw createError({
      statusCode: 409,
      statusMessage: '同じ名前の薬が既に登録されています',
    });
  }

  // Create new medication
  const medication = await prisma.medication.create({
    data: medicationData,
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      dosage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    medication,
    message: '薬が正常に登録されました',
  };
}));
