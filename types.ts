
export enum UserRole {
  ADMIN = 'Administrador',
  COORDINATOR = 'Coordenador',
  SUPERVISOR = 'Supervisor',
  DRIVER = 'Motorista',
  VAN = 'Van'
}

export enum MoveStatus {
  PENDING = 'Pendente',
  APPROVED = 'Aprovado',
  IN_PROGRESS = 'Em Rota',
  COMPLETED = 'Concluído'
}

export type AssignmentStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  status?: 'Ativo' | 'Férias' | 'Inativo';
  admissionDate?: string;
}

export interface Helper {
  id: string;
  name: string;
  pixKey?: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  helperId: string;
  isPresent: boolean;
  recordedByUserId: string;
  recordedByName: string;
}

export interface Resident {
  id: string;
  name: string;
  seal?: string;
  phone: string;

  originStreet: string;
  originNumber: string;
  originNeighborhood: string;
  originCity: string;

  destinationStreet: string;
  destinationNumber: string;
  destinationNeighborhood: string;
  destinationCity: string;

  notes?: string;
  totalMoves: number;
  lastMoveDate: string;
  createdAt?: string; // New field for sorting
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
}

export interface MoveRequest {
  id: string;
  residentId?: string;
  residentName: string;
  originAddress: string;
  destinationAddress: string;
  date: string;
  time: string;
  status: MoveStatus;
  itemsVolume: number;
  estimatedCost: number;
  notes?: string;
  createdAt: string;
  distance?: string;

  coordinatorId?: string;
  supervisorId?: string;
  driverId?: string;
  vanId?: string; // New Optional Field for Van role

  // Confirmation Status
  driverConfirmation?: AssignmentStatus;
  vanConfirmation?: AssignmentStatus;

  // New field for Volume Validation
  volumeValidationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  contestedVolume?: number;
  contestationNotes?: string;
}

export interface RouteOptimization {
  distance: string;
  duration: string;
  pathDescription: string;
  fuelEstimate: string;
  optimizedOrder?: string[];
}

export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category: string;
  status: 'Pago' | 'Pendente';
}

// --- NEW FINANCIAL TYPES ---

export interface FinancialSettings {
  truckFirstTrip: number;    // V_C1
  truckAdditionalTrip: number; // V_CA
  helperBase: number;        // V_AB
  helperAdditionalTrip: number; // V_AA
  supervisorDaily: number;   // V_SD
  lunchUnitCost: number;     // V_UA
  vanDaily: number;          // V_VD
  vanLunch: number;          // V_VL
}

export interface DailyOperationalRecord {
  id: string;
  date: string;
  supervisorId: string;
  driverId: string;
  totalTrips: number;
  totalLunches: number;
  helperNames: string[];

  // Calculated Costs Snapshot
  costTruck: number;
  costHelpers: number;
  costSupervisor: number;
  costLunch: number;
  totalCost: number;
}