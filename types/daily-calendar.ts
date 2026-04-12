/**
 * Daily Calendar data models for cat care management
 */

import type { HealthSignalColor } from '@prisma/client';

// イベント種別定数: 1=病院, 2=包帯交換
export const DAILY_NOTE_EVENT_TYPES = {
  HOSPITAL: 1,
  BANDAGE_CHANGE: 2,
} as const;

export type DailyNoteEventType = typeof DAILY_NOTE_EVENT_TYPES[keyof typeof DAILY_NOTE_EVENT_TYPES];

export interface DailyNoteEventMeta {
  type: DailyNoteEventType;
  label: string;
  icon: string;
}

export const DAILY_NOTE_EVENT_META: Record<DailyNoteEventType, DailyNoteEventMeta> = {
  [DAILY_NOTE_EVENT_TYPES.HOSPITAL]: { type: DAILY_NOTE_EVENT_TYPES.HOSPITAL, label: '病院', icon: '🏥' },
  [DAILY_NOTE_EVENT_TYPES.BANDAGE_CHANGE]: { type: DAILY_NOTE_EVENT_TYPES.BANDAGE_CHANGE, label: '包帯交換', icon: '🩹' },
};

export interface DailyNoteEvent {
  id: number;
  dailyNoteId: number;
  eventType: DailyNoteEventType;
  createdAt: Date;
  updatedAt: Date;
}

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

  // Events
  events: DailyNoteEvent[];
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
