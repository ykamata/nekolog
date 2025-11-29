/**
 * Health Signal data models for cat care management
 */

import type { HealthSignalColor } from '@prisma/client';

// Core entity interfaces
export interface CatHealthSignal {
  id: number;
  catId: number;
  date: Date;
  color: HealthSignalColor;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Input/Form interfaces
export interface CatHealthSignalInput {
  catId: number;
  date: Date;
  color: HealthSignalColor;
  note?: string | null;
}

// Update types
export type CatHealthSignalUpdate = Partial<Omit<CatHealthSignalInput, 'catId' | 'date'>>;

// Filter interfaces
export interface CatHealthSignalFilter {
  catId?: number;
  startDate?: Date;
  endDate?: Date;
  color?: HealthSignalColor;
}

// Export the enum type for convenience
export type { HealthSignalColor };
