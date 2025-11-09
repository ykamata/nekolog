/**
 * Core data models for medication management
 */

// Enums
// Import Cat interface from existing types
import type { Cat } from './cat-meal';

export enum MedicationType {
  MEDICINE = 'MEDICINE',
  SUPPLEMENT = 'SUPPLEMENT',
  VITAMIN = 'VITAMIN',
}

export enum MedicationStatus {
  PENDING = 'PENDING',
  ADMINISTERED = 'ADMINISTERED',
  SKIPPED = 'SKIPPED',
  MISSED = 'MISSED',
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  SNOOZED = 'SNOOZED',
  DISMISSED = 'DISMISSED',
}

// Core entity interfaces
export interface Medication {
  id: number;
  name: string;
  type: MedicationType;
  description?: string;
  dosage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicationRecord {
  id: number;
  catId: number;
  medicationId: number;
  quantity: number;
  administeredAt: Date;
  status: MedicationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  cat?: Cat;
  medication?: Medication;
}

export interface MedicationSchedule {
  id: number;
  catId: number;
  medicationId: number;
  frequency: string;
  times: string[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  cat?: Cat;
  medication?: Medication;
}

export interface MedicationReminder {
  id: number;
  scheduleId: number;
  catId: number;
  medicationId: number;
  scheduledAt: Date;
  status: ReminderStatus;
  createdAt: Date;
  updatedAt: Date;
  schedule?: MedicationSchedule;
  cat?: Cat;
  medication?: Medication;
}

// Input/Form interfaces
export interface MedicationInput {
  name: string;
  type: MedicationType;
  description?: string;
  dosage?: string;
}

export interface MedicationRecordInput {
  catId: number;
  medicationId: number;
  quantity: number;
  administeredAt: Date;
  status?: MedicationStatus;
  notes?: string;
}

export interface MedicationScheduleInput {
  catId: number;
  medicationId: number;
  frequency: string;
  times: string[];
  startDate: Date;
  endDate?: Date;
}

export interface MedicationReminderInput {
  scheduleId: number;
  catId: number;
  medicationId: number;
  scheduledAt: Date;
}

// Update types
export type MedicationUpdate = Partial<MedicationInput>;
export type MedicationRecordUpdate = Partial<MedicationRecordInput>;
export type MedicationScheduleUpdate = Partial<MedicationScheduleInput>;

// Filter interfaces
export interface MedicationFilter {
  name?: string;
  type?: MedicationType;
  limit?: number;
  offset?: number;
}

export interface MedicationRecordFilter {
  catId?: number;
  medicationId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: MedicationStatus;
  limit?: number;
  offset?: number;
}

export interface MedicationScheduleFilter {
  catId?: number;
  medicationId?: number;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface MedicationReminderFilter {
  catId?: number;
  medicationId?: number;
  scheduleId?: number;
  status?: ReminderStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Analytics interfaces
export interface MedicationAnalytics {
  totalMedications: number;
  totalRecords: number;
  adherenceRate: number;
  upcomingReminders: number;
  missedDoses: number;
}

export interface MedicationAdherenceData {
  date: string;
  administered: number;
  missed: number;
  skipped: number;
}

// Calendar interfaces
export interface MedicationCalendarDay {
  date: string;
  records: MedicationRecord[];
  reminders: MedicationReminder[];
  hasAdministered: boolean;
  hasPending: boolean;
  hasMissed: boolean;
}

export interface MedicationCalendarData {
  year: number;
  month: number;
  days: MedicationCalendarDay[];
}
