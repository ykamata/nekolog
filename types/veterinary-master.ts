// 病院・先生管理の型定義

// Base types from Prisma
export interface VeterinaryHospital {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  memo?: string | null;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  doctors?: VeterinaryDoctor[];
  _count?: {
    doctors: number;
    visits: number;
    appointments: number;
  };
}

export interface VeterinaryDoctor {
  id: number;
  name: string;
  hospitalId?: number | null;
  specialty?: string | null;
  memo?: string | null;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  hospital?: VeterinaryHospital | null;
  _count?: {
    visits: number;
    appointments: number;
  };
}

// Input types for forms
export interface VeterinaryHospitalInput {
  name: string;
  address?: string;
  phone?: string;
  memo?: string;
}

export interface VeterinaryDoctorInput {
  name: string;
  hospitalId?: number;
  specialty?: string;
  memo?: string;
}

// Update types (with ID)
export interface VeterinaryHospitalUpdate extends VeterinaryHospitalInput {
  id: number;
}

export interface VeterinaryDoctorUpdate extends VeterinaryDoctorInput {
  id: number;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Search and filter types
export interface VeterinarySearchParams extends PaginationParams {
  query?: string;
  hospitalId?: number;
}

export interface VeterinarySearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface VeterinaryPaginatedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

// API response types
export interface VeterinaryHospitalResponse {
  success: boolean;
  data?: VeterinaryHospital;
  error?: string;
}

export interface VeterinaryDoctorResponse {
  success: boolean;
  data?: VeterinaryDoctor;
  error?: string;
}

export interface VeterinaryHospitalListResponse {
  hospitals: VeterinaryHospital[];
  pagination: PaginationInfo;
}

export interface VeterinaryDoctorListResponse {
  doctors: VeterinaryDoctor[];
  pagination: PaginationInfo;
}

// Form component props
export interface VeterinaryHospitalFormProps {
  hospital?: VeterinaryHospital;
  mode: 'create' | 'edit';
}

export interface VeterinaryDoctorFormProps {
  doctor?: VeterinaryDoctor;
  mode: 'create' | 'edit';
  preselectedHospitalId?: number;
}

// List component props
export interface VeterinaryHospitalListProps {
  searchQuery?: string;
  showDoctorCount?: boolean;
}

export interface VeterinaryDoctorListProps {
  searchQuery?: string;
  hospitalFilter?: string;
  showHospitalName?: boolean;
}

// Selector component props
export interface VeterinaryMasterSelectorProps {
  type: 'hospital' | 'doctor';
  selectedHospitalId?: number; // 先生選択時の病院フィルタ用
  allowFreeInput: boolean;
  placeholder?: string;
  modelValue?: number;
}

// Error types
export interface VeterinaryMasterError {
  code: 'DUPLICATE_NAME' | 'HOSPITAL_HAS_DOCTORS' | 'DOCTOR_HAS_VISITS' | 'NOT_FOUND' | 'VALIDATION_ERROR';
  message: string;
  details?: Record<string, unknown>;
}

// Composable return types
export interface UseVeterinaryHospitalsReturn {
  hospitals: Readonly<Ref<VeterinaryHospital[]>>;
  loading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<string | null>>;
  pagination: Readonly<Ref<PaginationInfo | null>>;
  fetchHospitals: (searchQuery?: string, page?: number, limit?: number) => Promise<void>;
  createHospital: (hospital: VeterinaryHospitalInput) => Promise<VeterinaryHospital>;
  updateHospital: (id: number, hospital: VeterinaryHospitalInput) => Promise<VeterinaryHospital>;
  deleteHospital: (id: number) => Promise<void>;
  searchHospitals: (query: string) => Promise<VeterinaryHospital[]>;
  getHospitalById: (id: number) => VeterinaryHospital | undefined;
  checkDuplicateName: (name: string, excludeId?: number) => boolean;
  refreshHospitals: () => Promise<void>;
  clearError: () => void;
  checkHospitalRelatedData: (id: number) => Promise<{ hasDoctors: boolean; hasVisits: boolean; hasAppointments: boolean }>;
}

export interface UseVeterinaryDoctorsReturn {
  doctors: Readonly<Ref<VeterinaryDoctor[]>>;
  loading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<string | null>>;
  pagination: Readonly<Ref<PaginationInfo | null>>;
  fetchDoctors: (hospitalId?: number, searchQuery?: string, page?: number, limit?: number) => Promise<void>;
  createDoctor: (doctor: VeterinaryDoctorInput) => Promise<VeterinaryDoctor>;
  updateDoctor: (id: number, doctor: VeterinaryDoctorInput) => Promise<VeterinaryDoctor>;
  deleteDoctor: (id: number) => Promise<void>;
  searchDoctors: (query: string, hospitalId?: number) => Promise<VeterinaryDoctor[]>;
  getDoctorById: (id: number) => VeterinaryDoctor | undefined;
  checkDuplicateName: (name: string, excludeId?: number) => boolean;
  getDoctorsByHospitalId: (hospitalId: number) => VeterinaryDoctor[];
  refreshDoctors: () => Promise<void>;
  clearError: () => void;
  checkDoctorRelatedData: (id: number) => Promise<{ hasVisits: boolean; hasAppointments: boolean }>;
}
