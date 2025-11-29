/**
 * Daily Calendar data models for cat care management
 */

import type { HealthSignalColor } from '@prisma/client';

// Core entity interfaces
export interface DailyNote {
  id: number;
  catId: number;
  date: Date;
  medicationId?: number | null;
  emergencyMedication: boolean;
  memo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Input/Form interfaces
export interface DailyNoteInput {
  catId: number;
  date: Date;
  medicationId?: number | null;
  emergencyMedication?: boolean;
  memo?: string | null;
}

// Update types
export type DailyNoteUpdate = Partial<Omit<DailyNoteInput, 'catId' | 'date'>>;

// Calendar data aggregation
export interface DailyCalendarData {
  date: string; // YYYY-MM-DD形式
  catId: number;

  // Daily note data
  dailyNote?: DailyNote | null;

  // Meal data
  mealCount: number;
  totalCalories: number;

  // Excretion data
  excretionCount: {
    urine: number;
    feces: number;
    total: number;
  };
  excretionTimes: {
    urine: string[]; // HH:MM format
    feces: string[]; // HH:MM format
  };

  // Flags
  hasEmergencyMedication: boolean;
  hasMemo: boolean;

  // Health signal
  signalColor?: HealthSignalColor | null;
  signalNote?: string | null;
}

// Calendar month data
export interface MonthlyCalendarData {
  year: number;
  month: number;
  catId?: number; // undefined means all cats
  days: DailyCalendarData[];
}

// Filter interfaces
export interface DailyNoteFilter {
  catId?: number;
  startDate?: Date;
  endDate?: Date;
  hasEmergencyMedication?: boolean;
  hasMemo?: boolean;
}

// Calendar event for UI
export interface CalendarEvent {
  date: string;
  type: 'meal' | 'excretion' | 'medication' | 'memo';
  count?: number;
  description?: string;
}
