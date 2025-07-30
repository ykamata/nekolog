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
  catId: string;
  visitDate: Date;
  hospitalName: string;
  doctorName?: string;
  treatments: string[];
  cost: number;
  notes?: string;
  hasBloodTest: boolean;
}

export interface UpdateVeterinaryVisitInput extends Partial<CreateVeterinaryVisitInput> {
  id: string;
}

export interface CreateVeterinaryAppointmentInput {
  catId: string;
  appointmentDate: Date;
  hospitalName: string;
  doctorName?: string;
  plannedTreatments?: string;
  notes?: string;
}

export interface UpdateVeterinaryAppointmentInput extends Partial<CreateVeterinaryAppointmentInput> {
  id: string;
  status?: AppointmentStatus;
}

export interface ConvertAppointmentToVisitInput {
  appointmentId: string;
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
  catId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetVeterinaryAppointmentsParams {
  catId?: string;
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
  hospitalId?: string;
  specialization?: string;
}

export interface CreateVeterinaryTreatmentInput {
  name: string;
  category?: string;
  description?: string;
}

// Calendar display types
export interface CalendarVisitData {
  id: string;
  catId: string;
  catName: string;
  visitDate: Date;
  hospitalName: string;
  doctorName?: string;
  hasBloodTest: boolean;
  notes?: string;
  type: 'visit';
}

export interface CalendarAppointmentData {
  id: string;
  catId: string;
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
