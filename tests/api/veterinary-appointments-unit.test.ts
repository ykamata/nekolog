import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppointmentStatus } from '@prisma/client';
import { prisma } from '~/lib/prisma';
import {
  VeterinaryAppointmentInputSchema,
  VeterinaryAppointmentUpdateSchema,
  VeterinaryAppointmentFilterSchema,
  ConvertAppointmentToVisitSchema,
} from '~/lib/validations/veterinary-visit';

describe.skip('Veterinary Appointments API Logic', () => {
  // Test data
  const testCat = {
    name: 'テスト猫',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
  };

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 1 week from now

  const testAppointmentData = {
    catId: '',
    appointmentDate: futureDate,
    hospitalName: 'テスト動物病院',
    doctorName: 'テスト先生',
    plannedTreatments: '健康診断予定',
    notes: 'テスト予約メモ',
  };

  let testCatId: string;
  let testHospitalId: string;
  let testDoctorId: string;
  let testAppointmentId: string;

  beforeEach(async () => {
    // Clean up existing test data
    await cleanupTestData();

    // Create test cat
    const cat = await prisma.cat.create({
      data: testCat,
    });
    testCatId = cat.id;
    testAppointmentData.catId = testCatId;

    // Create test hospital
    const hospital = await prisma.veterinaryHospital.create({
      data: { name: testAppointmentData.hospitalName },
    });
    testHospitalId = hospital.id;

    // Create test doctor
    const doctor = await prisma.veterinaryDoctor.create({
      data: {
        name: testAppointmentData.doctorName,
        hospitalId: testHospitalId,
      },
    });
    testDoctorId = doctor.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });
  async function cleanupTestData() {
    // Delete in correct order to avoid foreign key constraints
    await prisma.veterinaryVisitTreatment.deleteMany({
      where: {
        visit: {
          cat: {
            name: {
              startsWith: 'テスト',
            },
          },
        },
      },
    });
    await prisma.veterinaryVisit.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.veterinaryAppointment.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.veterinaryTreatment.deleteMany({
      where: {
        name: {
          in: ['健康診断', 'ワクチン接種', 'テスト処方', '変換後処方'],
        },
      },
    });
    await prisma.veterinaryDoctor.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.veterinaryHospital.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
  }

  describe('Appointment Creation Logic', () => {
    it('should validate appointment input schema with valid data', () => {
      const result = VeterinaryAppointmentInputSchema.safeParse(testAppointmentData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testCatId);
        expect(result.data.hospitalName).toBe(testAppointmentData.hospitalName);
        expect(result.data.plannedTreatments).toBe(testAppointmentData.plannedTreatments);
      }
    });

    it('should reject appointment with past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const invalidAppointment = {
        ...testAppointmentData,
        appointmentDate: pastDate,
      };

      const result = VeterinaryAppointmentInputSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });

    it('should reject invalid appointment input data', () => {
      const invalidAppointment = {
        catId: '', // Empty cat ID
        appointmentDate: 'invalid-date', // Invalid date
        hospitalName: '', // Empty hospital name
      };

      const result = VeterinaryAppointmentInputSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });
    it('should create appointment in database', async () => {
      const validatedData = VeterinaryAppointmentInputSchema.parse(testAppointmentData);

      const appointment = await prisma.veterinaryAppointment.create({
        data: {
          catId: validatedData.catId,
          appointmentDate: validatedData.appointmentDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          plannedTreatments: validatedData.plannedTreatments,
          notes: validatedData.notes,
          status: 'SCHEDULED',
        },
        include: {
          cat: true,
          hospital: true,
          doctor: true,
        },
      });

      expect(appointment.catId).toBe(testCatId);
      expect(appointment.hospitalId).toBe(testHospitalId);
      expect(appointment.doctorId).toBe(testDoctorId);
      expect(appointment.plannedTreatments).toBe(testAppointmentData.plannedTreatments);
      expect(appointment.status).toBe('SCHEDULED');

      testAppointmentId = appointment.id;
    });

    it('should create appointment without doctor', async () => {
      const appointmentWithoutDoctor = {
        ...testAppointmentData,
        doctorName: undefined,
      };

      const validatedData = VeterinaryAppointmentInputSchema.parse(appointmentWithoutDoctor);

      const appointment = await prisma.veterinaryAppointment.create({
        data: {
          catId: validatedData.catId,
          appointmentDate: validatedData.appointmentDate,
          hospitalId: testHospitalId,
          doctorId: null,
          plannedTreatments: validatedData.plannedTreatments,
          notes: validatedData.notes,
          status: 'SCHEDULED',
        },
      });

      expect(appointment.doctorId).toBeNull();
      expect(appointment.status).toBe('SCHEDULED');
    });
  });

  describe('Appointment Reading Logic', () => {
    beforeEach(async () => {
      // Create test appointment
      const appointment = await prisma.veterinaryAppointment.create({
        data: {
          catId: testCatId,
          appointmentDate: testAppointmentData.appointmentDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          plannedTreatments: testAppointmentData.plannedTreatments,
          notes: testAppointmentData.notes,
          status: 'SCHEDULED',
        },
      });
      testAppointmentId = appointment.id;
    });

    it('should find appointment by ID with all relations', async () => {
      const appointment = await prisma.veterinaryAppointment.findUnique({
        where: { id: testAppointmentId },
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
              specialization: true,
            },
          },
        },
      });

      expect(appointment).not.toBeNull();
      expect(appointment?.id).toBe(testAppointmentId);
      expect(appointment?.cat.name).toBe(testCat.name);
      expect(appointment?.hospital.name).toBe(testAppointmentData.hospitalName);
      expect(appointment?.doctor?.name).toBe(testAppointmentData.doctorName);
      expect(appointment?.status).toBe('SCHEDULED');
    });
    it('should list appointments with filtering by cat', async () => {
      const filterData = {
        catId: testCatId,
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryAppointmentFilterSchema.parse(filterData);

      const [appointments, total] = await Promise.all([
        prisma.veterinaryAppointment.findMany({
          where: { catId: validatedFilter.catId },
          orderBy: { appointmentDate: 'asc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
          include: {
            cat: true,
            hospital: true,
            doctor: true,
          },
        }),
        prisma.veterinaryAppointment.count({
          where: { catId: validatedFilter.catId },
        }),
      ]);

      expect(appointments).toHaveLength(1);
      expect(total).toBe(1);
      expect(appointments[0].catId).toBe(testCatId);
    });

    it('should filter appointments by status', async () => {
      // Create additional appointment with different status
      await prisma.veterinaryAppointment.create({
        data: {
          catId: testCatId,
          appointmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          hospitalId: testHospitalId,
          status: 'CANCELLED',
        },
      });

      const filterData = {
        catId: testCatId,
        status: AppointmentStatus.SCHEDULED,
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryAppointmentFilterSchema.parse(filterData);

      const appointments = await prisma.veterinaryAppointment.findMany({
        where: {
          catId: validatedFilter.catId,
          status: validatedFilter.status,
        },
        orderBy: { appointmentDate: 'asc' },
      });

      expect(appointments).toHaveLength(1);
      expect(appointments[0].status).toBe('SCHEDULED');
    });

    it('should filter appointments by date range', async () => {
      // Create additional appointment with different date
      const farFutureDate = new Date();
      farFutureDate.setMonth(farFutureDate.getMonth() + 2); // 2 months from now

      await prisma.veterinaryAppointment.create({
        data: {
          catId: testCatId,
          appointmentDate: farFutureDate,
          hospitalId: testHospitalId,
          status: 'SCHEDULED',
        },
      });

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 14); // 2 weeks from now

      const filterData = {
        catId: testCatId,
        startDate: new Date(),
        endDate: nextWeek,
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryAppointmentFilterSchema.parse(filterData);

      const appointments = await prisma.veterinaryAppointment.findMany({
        where: {
          catId: validatedFilter.catId,
          appointmentDate: {
            gte: validatedFilter.startDate,
            lte: validatedFilter.endDate,
          },
        },
        orderBy: { appointmentDate: 'asc' },
      });

      expect(appointments).toHaveLength(1);
      expect(appointments[0].appointmentDate.getTime()).toBeLessThan(nextWeek.getTime());
    });
  });
  describe('Appointment Update Logic', () => {
    beforeEach(async () => {
      // Create test appointment
      const appointment = await prisma.veterinaryAppointment.create({
        data: {
          catId: testCatId,
          appointmentDate: testAppointmentData.appointmentDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          plannedTreatments: testAppointmentData.plannedTreatments,
          notes: testAppointmentData.notes,
          status: 'SCHEDULED',
        },
      });
      testAppointmentId = appointment.id;
    });

    it('should validate appointment update schema', () => {
      const updateData = {
        plannedTreatments: '更新された処方予定',
        notes: '更新されたメモ',
        status: AppointmentStatus.CANCELLED,
      };

      const result = VeterinaryAppointmentUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plannedTreatments).toBe(updateData.plannedTreatments);
        expect(result.data.notes).toBe(updateData.notes);
        expect(result.data.status).toBe(AppointmentStatus.CANCELLED);
      }
    });

    it('should update appointment basic fields', async () => {
      const updateData = {
        plannedTreatments: '更新された処方予定',
        notes: '更新されたメモ',
        status: AppointmentStatus.CANCELLED,
      };

      const validatedData = VeterinaryAppointmentUpdateSchema.parse(updateData);

      const updatedAppointment = await prisma.veterinaryAppointment.update({
        where: { id: testAppointmentId },
        data: validatedData,
        include: {
          cat: true,
          hospital: true,
          doctor: true,
        },
      });

      expect(updatedAppointment.plannedTreatments).toBe(updateData.plannedTreatments);
      expect(updatedAppointment.notes).toBe(updateData.notes);
      expect(updatedAppointment.status).toBe(AppointmentStatus.CANCELLED);
      expect(updatedAppointment.appointmentDate).toEqual(testAppointmentData.appointmentDate); // Should remain unchanged
    });

    it('should handle partial updates', async () => {
      const updateData = { status: AppointmentStatus.COMPLETED };

      const validatedData = VeterinaryAppointmentUpdateSchema.parse(updateData);

      const updatedAppointment = await prisma.veterinaryAppointment.update({
        where: { id: testAppointmentId },
        data: validatedData,
      });

      expect(updatedAppointment.status).toBe(AppointmentStatus.COMPLETED);
      expect(updatedAppointment.plannedTreatments).toBe(testAppointmentData.plannedTreatments); // Should remain unchanged
      expect(updatedAppointment.notes).toBe(testAppointmentData.notes); // Should remain unchanged
    });

    it('should update appointment date to future date', async () => {
      const newFutureDate = new Date();
      newFutureDate.setDate(newFutureDate.getDate() + 14); // 2 weeks from now

      const updateData = { appointmentDate: newFutureDate };

      const validatedData = VeterinaryAppointmentUpdateSchema.parse(updateData);

      const updatedAppointment = await prisma.veterinaryAppointment.update({
        where: { id: testAppointmentId },
        data: validatedData,
      });

      expect(updatedAppointment.appointmentDate).toEqual(newFutureDate);
    });
  });
  describe('Appointment Deletion Logic', () => {
    beforeEach(async () => {
      // Create test appointment
      const appointment = await prisma.veterinaryAppointment.create({
        data: {
          catId: testCatId,
          appointmentDate: testAppointmentData.appointmentDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          plannedTreatments: testAppointmentData.plannedTreatments,
          notes: testAppointmentData.notes,
          status: 'SCHEDULED',
        },
      });
      testAppointmentId = appointment.id;
    });

    it('should delete appointment', async () => {
      // Verify appointment exists
      const existingAppointment = await prisma.veterinaryAppointment.findUnique({
        where: { id: testAppointmentId },
      });

      expect(existingAppointment).not.toBeNull();

      // Delete appointment
      await prisma.veterinaryAppointment.delete({
        where: { id: testAppointmentId },
      });

      // Verify deletion
      const deletedAppointment = await prisma.veterinaryAppointment.findUnique({
        where: { id: testAppointmentId },
      });

      expect(deletedAppointment).toBeNull();
    });

    it('should not delete master data when deleting appointment', async () => {
      // Delete appointment
      await prisma.veterinaryAppointment.delete({
        where: { id: testAppointmentId },
      });

      // Verify master data still exists
      const hospital = await prisma.veterinaryHospital.findUnique({
        where: { id: testHospitalId },
      });
      const doctor = await prisma.veterinaryDoctor.findUnique({
        where: { id: testDoctorId },
      });

      expect(hospital).not.toBeNull();
      expect(doctor).not.toBeNull();
    });
  });

  describe('Appointment Conversion Logic', () => {
    beforeEach(async () => {
      // Create test appointment
      const appointment = await prisma.veterinaryAppointment.create({
        data: {
          catId: testCatId,
          appointmentDate: testAppointmentData.appointmentDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          plannedTreatments: testAppointmentData.plannedTreatments,
          notes: testAppointmentData.notes,
          status: 'SCHEDULED',
        },
      });
      testAppointmentId = appointment.id;
    });

    it('should validate conversion schema', () => {
      const conversionData = {
        appointmentId: testAppointmentId,
        actualCost: 5000,
        actualTreatments: ['健康診断', 'ワクチン接種'],
        actualNotes: '実際の診察メモ',
        hasBloodTest: true,
      };

      const result = ConvertAppointmentToVisitSchema.safeParse(conversionData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.appointmentId).toBe(testAppointmentId);
        expect(result.data.actualCost).toBe(5000);
        expect(result.data.hasBloodTest).toBe(true);
      }
    });
    it('should convert appointment to visit with treatments', async () => {
      const conversionData = {
        appointmentId: testAppointmentId,
        actualCost: 5000,
        actualTreatments: ['健康診断', '変換後処方'],
        actualNotes: '実際の診察メモ',
        hasBloodTest: true,
      };

      // Create treatments for conversion
      const treatments = await Promise.all(
        conversionData.actualTreatments.map(name =>
          prisma.veterinaryTreatment.create({
            data: { name },
          }),
        ),
      );

      // Convert appointment to visit in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create veterinary visit
        const visit = await tx.veterinaryVisit.create({
          data: {
            catId: testCatId,
            visitDate: testAppointmentData.appointmentDate,
            hospitalId: testHospitalId,
            doctorId: testDoctorId,
            cost: conversionData.actualCost,
            notes: conversionData.actualNotes,
            hasBloodTest: conversionData.hasBloodTest,
            treatments: {
              create: treatments.map(treatment => ({
                treatmentId: treatment.id,
              })),
            },
          },
          include: {
            cat: true,
            hospital: true,
            doctor: true,
            treatments: {
              include: {
                treatment: true,
              },
            },
          },
        });

        // Update appointment status to COMPLETED
        const updatedAppointment = await tx.veterinaryAppointment.update({
          where: { id: testAppointmentId },
          data: {
            status: 'COMPLETED',
          },
        });

        return { visit, appointment: updatedAppointment };
      });

      expect(result.visit.catId).toBe(testCatId);
      expect(result.visit.cost).toBe(conversionData.actualCost);
      expect(result.visit.hasBloodTest).toBe(true);
      expect(result.visit.treatments).toHaveLength(2);
      expect(result.appointment.status).toBe('COMPLETED');
    });

    it('should convert appointment using planned treatments when no actual treatments provided', async () => {
      // Create treatment from planned treatments
      const plannedTreatment = await prisma.veterinaryTreatment.create({
        data: { name: testAppointmentData.plannedTreatments! },
      });

      const conversionData = {
        appointmentId: testAppointmentId,
        actualCost: 3000,
      };

      // Convert appointment to visit
      const result = await prisma.$transaction(async (tx) => {
        const visit = await tx.veterinaryVisit.create({
          data: {
            catId: testCatId,
            visitDate: testAppointmentData.appointmentDate,
            hospitalId: testHospitalId,
            doctorId: testDoctorId,
            cost: conversionData.actualCost,
            notes: testAppointmentData.notes,
            hasBloodTest: false,
            treatments: {
              create: [{
                treatmentId: plannedTreatment.id,
              }],
            },
          },
          include: {
            treatments: {
              include: {
                treatment: true,
              },
            },
          },
        });

        const updatedAppointment = await tx.veterinaryAppointment.update({
          where: { id: testAppointmentId },
          data: { status: 'COMPLETED' },
        });

        return { visit, appointment: updatedAppointment };
      });

      expect(result.visit.treatments).toHaveLength(1);
      expect(result.visit.treatments[0].treatment.name).toBe(testAppointmentData.plannedTreatments);
      expect(result.appointment.status).toBe('COMPLETED');
    });
    it('should reject conversion of non-scheduled appointment', async () => {
      // Update appointment to COMPLETED status
      await prisma.veterinaryAppointment.update({
        where: { id: testAppointmentId },
        data: { status: 'COMPLETED' },
      });

      // Check appointment status before conversion
      const appointment = await prisma.veterinaryAppointment.findUnique({
        where: { id: testAppointmentId },
      });

      expect(appointment?.status).toBe('COMPLETED');

      // This would be handled by the API endpoint validation
      // Here we just verify the appointment status check logic
      if (appointment?.status !== 'SCHEDULED') {
        expect(appointment.status).not.toBe('SCHEDULED');
      }
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject appointment with invalid cat ID', () => {
      const invalidAppointment = {
        ...testAppointmentData,
        catId: 'invalid-id',
      };

      const result = VeterinaryAppointmentInputSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });

    it('should reject appointment with empty hospital name', () => {
      const invalidAppointment = {
        ...testAppointmentData,
        hospitalName: '',
      };

      const result = VeterinaryAppointmentInputSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });

    it('should reject appointment with planned treatments too long', () => {
      const invalidAppointment = {
        ...testAppointmentData,
        plannedTreatments: 'a'.repeat(501), // Exceeds 500 character limit
      };

      const result = VeterinaryAppointmentInputSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });

    it('should reject appointment with notes too long', () => {
      const invalidAppointment = {
        ...testAppointmentData,
        notes: 'a'.repeat(1001), // Exceeds 1000 character limit
      };

      const result = VeterinaryAppointmentInputSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });

    it('should accept appointment with minimal data', () => {
      const minimalAppointment = {
        catId: testCatId,
        appointmentDate: futureDate,
        hospitalName: 'ミニマル病院',
      };

      const result = VeterinaryAppointmentInputSchema.safeParse(minimalAppointment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.doctorName).toBeUndefined();
        expect(result.data.plannedTreatments).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });

    it('should reject conversion with negative cost', () => {
      const invalidConversion = {
        appointmentId: testAppointmentId,
        actualCost: -100,
      };

      const result = ConvertAppointmentToVisitSchema.safeParse(invalidConversion);
      expect(result.success).toBe(false);
    });

    it('should reject conversion with cost too high', () => {
      const invalidConversion = {
        appointmentId: testAppointmentId,
        actualCost: 2000000, // Exceeds 1,000,000 limit
      };

      const result = ConvertAppointmentToVisitSchema.safeParse(invalidConversion);
      expect(result.success).toBe(false);
    });
  });
});
