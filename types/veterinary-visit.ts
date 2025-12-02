import type {
  VeterinaryVisit as PrismaVeterinaryVisit,
  VeterinaryAppointment as PrismaVeterinaryAppointment,
  VeterinaryHospital as PrismaVeterinaryHospital,
  VeterinaryDoctor as PrismaVeterinaryDoctor,
  VeterinaryTreatment as PrismaVeterinaryTreatment,
  VeterinaryVisitTreatment as PrismaVeterinaryVisitTreatment,
  AppointmentStatus,
  Cat,
} from '@prisma/client';

// Base types from Prisma
export type VeterinaryVisit = PrismaVeterinaryVisit;
export type VeterinaryAppointment = PrismaVeterinaryAppointment;
export type VeterinaryHospital = PrismaVeterinaryHospital;
export type VeterinaryDoctor = PrismaVeterinaryDoctor;
export type VeterinaryTreatment = PrismaVeterinaryTreatment;
export type VeterinaryVisitTreatment = PrismaVeterinaryVisitTreatment;

// Extended types with relations
export type VeterinaryVisitWithRelations = VeterinaryVisit & {
  cat: Cat;
  hospital: VeterinaryHospital;
  doctor?: VeterinaryDoctor | null;
  treatments: (VeterinaryVisitTreatment & {
    treatment: VeterinaryTreatment;
  })[];
};

export type VeterinaryAppointmentWithRelations = VeterinaryAppointment & {
  cat: Cat;
  hospital: VeterinaryHospital;
  doctor?: VeterinaryDoctor | null;
};

export type VeterinaryHospitalWithRelations = VeterinaryHospital & {
  visits?: VeterinaryVisit[];
  appointments?: VeterinaryAppointment[];
  doctors?: VeterinaryDoctor[];
};

export type VeterinaryDoctorWithRelations = VeterinaryDoctor & {
  hospital?: VeterinaryHospital | null;
  visits?: VeterinaryVisit[];
  appointments?: VeterinaryAppointment[];
};

export type VeterinaryTreatmentWithRelations = VeterinaryTreatment & {
  visitTreatments?: (VeterinaryVisitTreatment & {
    visit: VeterinaryVisit;
  })[];
};

// Form input types
export interface CreateVeterinaryVisitInput {
  catId: number;
  visitDate: Date;
  hospitalName: string;
  doctorName?: string;
  treatments: string[];
  cost: number;
  notes?: string;
  hasBloodTest: boolean;
}

export interface UpdateVeterinaryVisitInput extends Partial<CreateVeterinaryVisitInput> {
  id: number;
}

export interface CreateVeterinaryAppointmentInput {
  catId: number;
  appointmentDate: Date;
  hospitalName: string;
  doctorName?: string;
  plannedTreatments?: string;
  notes?: string;
}

export interface UpdateVeterinaryAppointmentInput extends Partial<CreateVeterinaryAppointmentInput> {
  id: number;
  status?: AppointmentStatus;
}

export interface ConvertAppointmentToVisitInput {
  appointmentId: number;
  actualVisitDate?: Date;
  actualCost?: number;
  actualTreatments?: string[];
  actualNotes?: string;
  hasBloodTest?: boolean;
}

// API response types
export interface GetVeterinaryVisitsResponse {
  visits: VeterinaryVisitWithRelations[];
  total: number;
  hasMore: boolean;
}

export interface GetVeterinaryAppointmentsResponse {
  appointments: VeterinaryAppointmentWithRelations[];
  total: number;
}

// Query parameter types
export interface GetVeterinaryVisitsParams {
  catId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetVeterinaryAppointmentsParams {
  catId?: number;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Master data types
export interface CreateVeterinaryHospitalInput {
  name: string;
  address?: string;
  phone?: string;
}

export interface CreateVeterinaryDoctorInput {
  name: string;
  hospitalId?: number;
  specialization?: string;
}

export interface CreateVeterinaryTreatmentInput {
  name: string;
  category?: string;
  description?: string;
}

// Calendar display types
export interface CalendarVisitData {
  id: number;
  catId: number;
  catName: string;
  visitDate: Date;
  hospitalName: string;
  doctorName?: string;
  hasBloodTest: boolean;
  notes?: string;
  type: 'visit';
  fullData?: VeterinaryVisitWithRelations; // 詳細表示用の完全なデータ
}

export interface CalendarAppointmentData {
  id: number;
  catId: number;
  catName: string;
  appointmentDate: Date;
  hospitalName: string;
  doctorName?: string;
  status: AppointmentStatus;
  notes?: string;
  type: 'appointment';
}

export type CalendarEventData = CalendarVisitData | CalendarAppointmentData;

// Export the AppointmentStatus enum
export type { AppointmentStatus };
