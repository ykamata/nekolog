// This file is used to test TypeScript compilation and error reporting

// Define some TypeScript interfaces
export interface TestInterface {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Define a type alias
export type TestStatus = 'pending' | 'active' | 'completed' | 'failed';

// Define a function with TypeScript types
export function testFunction(input: string): TestInterface {
  return {
    id: 1,
    name: input,
    isActive: true,
    createdAt: new Date(),
  };
}

// Define a generic function
export function createGeneric<T>(value: T): { data: T; timestamp: Date } {
  return {
    data: value,
    timestamp: new Date(),
  };
}

// Define a class with TypeScript
export class TestClass {
  private _value: number;

  constructor(initialValue: number) {
    this._value = initialValue;
  }

  get value(): number {
    return this._value;
  }

  set value(newValue: number) {
    this._value = newValue;
  }

  increment(): void {
    this._value += 1;
  }

  toString(): string {
    return `TestClass: ${this._value}`;
  }
}

// Test conditional types
export type IsString<T> = T extends string ? true : false;

// Test utility types
export type ReadonlyTest = Readonly<TestInterface>;
export type PartialTest = Partial<TestInterface>;
export type RequiredTest = Required<TestInterface>;
export type PickTest = Pick<TestInterface, 'id' | 'name'>;
export type OmitTest = Omit<TestInterface, 'metadata'>;

// Test mapped types
export type Nullable<T> = { [K in keyof T]: T[K] | null };

// Uncomment to test TypeScript error detection
// const errorTest1: number = "This should cause a type error";
// const errorTest2: TestInterface = { id: 1 }; // Missing required properties
// const errorTest3: TestStatus = "invalid"; // Not a valid status
