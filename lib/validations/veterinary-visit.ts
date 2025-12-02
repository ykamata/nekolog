/**
 * Zod validation schemas for veterinary visit management
 */

import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

// Enum schemas
export const AppointmentStatusSchema = z.nativeEnum(AppointmentStatus);

// Base validation schemas for master data
export const VeterinaryHospitalSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z
    .string()
    .min(1, '病院名は必須です')
    .max(100, '病院名は100文字以内で入力してください')
    .trim(),
  address: z
    .string()
    .max(200, '住所は200文字以内で入力してください')
    .trim()
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .regex(/^[\d\-\(\)\+\s]*$/, '有効な電話番号を入力してください')
    .trim()
    .optional()
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VeterinaryDoctorSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z
    .string()
    .min(1, '先生名は必須です')
    .max(50, '先生名は50文字以内で入力してください')
    .trim(),
  hospitalId: z.coerce.number().int().positive().optional().nullable(),
  specialty: z
    .string()
    .max(100, '専門分野は100文字以内で入力してください')
    .trim()
    .optional()
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VeterinaryTreatmentSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z
    .string()
    .min(1, '処方内容名は必須です')
    .max(100, '処方内容名は100文字以内で入力してください')
    .trim(),
  category: z
    .string()
    .max(50, 'カテゴリは50文字以内で入力してください')
    .trim()
    .optional()
    .nullable(),
  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .trim()
    .optional()
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Base validation schemas for main entities
export const VeterinaryVisitSchema = z.object({
  id: z.coerce.number().int().positive(),
  catId: z.coerce.number().int().positive(),
  visitDate: z.date({
    errorMap: () => ({ message: '有効な診察日時を入力してください' }),
  }),
  hospitalId: z.coerce.number().int().positive(),
  doctorId: z.coerce.number().int().positive().optional().nullable(),
  cost: z
    .number()
    .min(0, '費用は0以上で入力してください')
    .max(1000000, '費用は1,000,000円以下で入力してください'),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内で入力してください')
    .trim()
    .optional()
    .nullable(),
  hasBloodTest: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VeterinaryAppointmentSchema = z.object({
  id: z.coerce.number().int().positive(),
  catId: z.coerce.number().int().positive(),
  appointmentDate: z.date({
    errorMap: () => ({ message: '有効な予約日時を入力してください' }),
  }),
  hospitalId: z.coerce.number().int().positive(),
  doctorId: z.coerce.number().int().positive().optional().nullable(),
  plannedTreatments: z
    .string()
    .max(500, '予定処方内容は500文字以内で入力してください')
    .trim()
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内で入力してください')
    .trim()
    .optional()
    .nullable(),
  status: AppointmentStatusSchema.default(AppointmentStatus.SCHEDULED),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Input validation schemas for master data
export const VeterinaryHospitalInputSchema = z.object({
  name: z
    .string()
    .min(1, '病院名は必須です')
    .max(100, '病院名は100文字以内で入力してください')
    .trim(),
  address: z
    .string()
    .max(200, '住所は200文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .regex(/^[\d\-\(\)\+\s]*$/, '有効な電話番号を入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
});

export const VeterinaryDoctorInputSchema = z.object({
  name: z
    .string()
    .min(1, '先生名は必須です')
    .max(50, '先生名は50文字以内で入力してください')
    .trim(),
  hospitalId: z.coerce.number().int().positive().optional(),
  specialty: z
    .string()
    .max(100, '専門分野は100文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
  memo: z
    .string()
    .max(500, 'メモは500文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
});

export const VeterinaryTreatmentInputSchema = z.object({
  name: z
    .string()
    .min(1, '処方内容名は必須です')
    .max(100, '処方内容名は100文字以内で入力してください')
    .trim(),
  category: z
    .string()
    .max(50, 'カテゴリは50文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
});

// Input validation schemas for main entities
export const VeterinaryVisitInputSchema = z.object({
  catId: z.coerce.number().int().positive(),
  visitDate: z.coerce.date({
    errorMap: () => ({ message: '診察日時を入力してください' }),
  }),
  hospitalName: z
    .string()
    .min(1, '病院名を入力してください')
    .max(100, '病院名は100文字以内で入力してください')
    .trim(),
  doctorName: z
    .string()
    .max(50, '先生名は50文字以内で入力してください')
    .trim()
    .transform(val => val || undefined)
    .optional(),
  treatments: z
    .array(z.string().min(1, '処方内容を入力してください'))
    .max(20, '処方内容は20個まで選択できます')
    .optional()
    .default([]),
  cost: z
    .number()
    .min(0, '費用は0以上で入力してください')
    .max(1000000, '費用は1,000,000円以下で入力してください'),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内で入力してください')
    .trim()
    .transform(val => val || undefined)
    .optional(),
  hasBloodTest: z.boolean().default(false),
});

export const VeterinaryAppointmentInputSchema = z.object({
  catId: z.coerce.number().int().positive(),
  appointmentDate: z
    .coerce.date({
      errorMap: () => ({ message: '予約日時を入力してください' }),
    })
    .refine(date => date > new Date(), {
      message: '予約日時は未来の日時を選択してください',
    }),
  hospitalName: z
    .string()
    .min(1, '病院名を入力してください')
    .max(100, '病院名は100文字以内で入力してください')
    .trim(),
  doctorName: z
    .string()
    .max(50, '先生名は50文字以内で入力してください')
    .trim()
    .transform(val => val || undefined)
    .optional(),
  plannedTreatments: z
    .string()
    .max(500, '予定処方内容は500文字以内で入力してください')
    .trim()
    .transform(val => val || undefined)
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内で入力してください')
    .trim()
    .transform(val => val || undefined)
    .optional(),
});

// Update validation schemas
export const VeterinaryHospitalUpdateSchema
  = VeterinaryHospitalInputSchema.partial();
export const VeterinaryDoctorUpdateSchema
  = VeterinaryDoctorInputSchema.partial();
export const VeterinaryTreatmentUpdateSchema
  = VeterinaryTreatmentInputSchema.partial();
export const VeterinaryVisitUpdateSchema = VeterinaryVisitInputSchema.partial();
export const VeterinaryAppointmentUpdateSchema
  = VeterinaryAppointmentInputSchema.partial().extend({
    status: AppointmentStatusSchema.optional(),
  });

// Special validation schema for appointment conversion
export const ConvertAppointmentToVisitSchema = z.object({
  appointmentId: z.coerce.number().int().positive(),
  actualVisitDate: z.date().optional(),
  actualCost: z
    .number()
    .min(0, '費用は0以上で入力してください')
    .max(1000000, '費用は1,000,000円以下で入力してください')
    .optional(),
  actualTreatments: z
    .array(z.string().min(1, '処方内容を入力してください'))
    .max(20, '処方内容は20個まで選択できます')
    .optional(),
  actualNotes: z
    .string()
    .max(1000, 'メモは1000文字以内で入力してください')
    .trim()
    .optional()
    .or(z.literal('')),
  hasBloodTest: z.boolean().optional(),
});

// Filter validation schemas
export const VeterinaryVisitFilterSchema = z
  .object({
    catId: z.coerce.number().int().positive().optional(),
    hospitalId: z.coerce.number().int().positive().optional(),
    doctorId: z.coerce.number().int().positive().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    hasBloodTest: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
  })
  .refine(
    data =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: '終了日は開始日以降の日付を設定してください',
      path: ['endDate'],
    },
  );

export const VeterinaryAppointmentFilterSchema = z
  .object({
    catId: z.coerce.number().int().positive().optional(),
    hospitalId: z.coerce.number().int().positive().optional(),
    doctorId: z.coerce.number().int().positive().optional(),
    status: AppointmentStatusSchema.optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
  })
  .refine(
    data =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: '終了日は開始日以降の日付を設定してください',
      path: ['endDate'],
    },
  );

export const VeterinaryHospitalFilterSchema = z.object({
  name: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export const VeterinaryDoctorFilterSchema = z.object({
  name: z.string().optional(),
  hospitalId: z.coerce.number().int().positive().optional(),
  specialty: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export const VeterinaryTreatmentFilterSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// Special validation schemas for form handling
export const VeterinaryVisitFormSchema = z.object({
  catId: z.coerce.number().int().positive(),
  visitDate: z.date({
    errorMap: () => ({ message: '診察日時を入力してください' }),
  }),
  hospitalName: z
    .string()
    .min(1, '病院名を入力してください')
    .max(100, '病院名は100文字以内で入力してください')
    .trim(),
  doctorName: z
    .string()
    .max(50, '先生名は50文字以内で入力してください')
    .trim()
    .optional(),
  treatments: z
    .array(z.string().min(1, '処方内容を入力してください'))
    .max(20, '処方内容は20個まで選択できます')
    .optional()
    .default([]),
  cost: z
    .number()
    .min(0, '費用は0以上で入力してください')
    .max(1000000, '費用は1,000,000円以下で入力してください'),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内で入力してください')
    .optional(),
  hasBloodTest: z.boolean().default(false),
});

export const VeterinaryAppointmentFormSchema = z.object({
  catId: z.coerce.number().int().positive(),
  appointmentDate: z
    .date({
      errorMap: () => ({ message: '予約日時を入力してください' }),
    })
    .refine(date => date > new Date(), {
      message: '予約日時は未来の日時を選択してください',
    }),
  hospitalName: z
    .string()
    .min(1, '病院名を入力してください')
    .max(100, '病院名は100文字以内で入力してください')
    .trim(),
  doctorName: z
    .string()
    .max(50, '先生名は50文字以内で入力してください')
    .trim()
    .optional(),
  plannedTreatments: z
    .string()
    .max(500, '予定処方内容は500文字以内で入力してください')
    .optional(),
  notes: z
    .string()
    .max(1000, 'メモは1000文字以内で入力してください')
    .optional(),
});

// Date range validation
export const DateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine(data => data.startDate <= data.endDate, {
    message: '開始日は終了日より前の日付を選択してください',
    path: ['endDate'],
  });

// ID validation schema for route parameters
export const VeterinaryVisitIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const VeterinaryAppointmentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Utility validation functions
export function validateVeterinaryVisitInput(data: unknown) {
  return VeterinaryVisitInputSchema.parse(data);
}

export function validateVeterinaryAppointmentInput(data: unknown) {
  return VeterinaryAppointmentInputSchema.parse(data);
}

export function validateVeterinaryHospitalInput(data: unknown) {
  return VeterinaryHospitalInputSchema.parse(data);
}

export function validateVeterinaryDoctorInput(data: unknown) {
  return VeterinaryDoctorInputSchema.parse(data);
}

export function validateVeterinaryTreatmentInput(data: unknown) {
  return VeterinaryTreatmentInputSchema.parse(data);
}

export function validateConvertAppointmentToVisit(data: unknown) {
  return ConvertAppointmentToVisitSchema.parse(data);
}

// Type exports for use in other files
export type VeterinaryHospitalInput = z.infer<
  typeof VeterinaryHospitalInputSchema
>;
export type VeterinaryDoctorInput = z.infer<typeof VeterinaryDoctorInputSchema>;
export type VeterinaryTreatmentInput = z.infer<
  typeof VeterinaryTreatmentInputSchema
>;
export type VeterinaryVisitInput = z.infer<typeof VeterinaryVisitInputSchema>;
export type VeterinaryAppointmentInput = z.infer<
  typeof VeterinaryAppointmentInputSchema
>;

export type VeterinaryHospitalUpdate = z.infer<
  typeof VeterinaryHospitalUpdateSchema
>;
export type VeterinaryDoctorUpdate = z.infer<
  typeof VeterinaryDoctorUpdateSchema
>;
export type VeterinaryTreatmentUpdate = z.infer<
  typeof VeterinaryTreatmentUpdateSchema
>;
export type VeterinaryVisitUpdate = z.infer<typeof VeterinaryVisitUpdateSchema>;
export type VeterinaryAppointmentUpdate = z.infer<
  typeof VeterinaryAppointmentUpdateSchema
>;

export type ConvertAppointmentToVisit = z.infer<
  typeof ConvertAppointmentToVisitSchema
>;

export type VeterinaryVisitFilter = z.infer<typeof VeterinaryVisitFilterSchema>;
export type VeterinaryAppointmentFilter = z.infer<
  typeof VeterinaryAppointmentFilterSchema
>;
export type VeterinaryHospitalFilter = z.infer<
  typeof VeterinaryHospitalFilterSchema
>;
export type VeterinaryDoctorFilter = z.infer<
  typeof VeterinaryDoctorFilterSchema
>;
export type VeterinaryTreatmentFilter = z.infer<
  typeof VeterinaryTreatmentFilterSchema
>;

export type VeterinaryVisitForm = z.infer<typeof VeterinaryVisitFormSchema>;
export type VeterinaryAppointmentForm = z.infer<
  typeof VeterinaryAppointmentFormSchema
>;
export type DateRange = z.infer<typeof DateRangeSchema>;
