// ── Enums ──

export type Role = 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'MODERATOR';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';

export type VerificationLevel = 'NONE' | 'BASIC' | 'IDENTITY' | 'FULL' | 'PREMIUM';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export type DocumentType =
  | 'CEDULA_CIUDADANIA'
  | 'CEDULA_EXTRANJERIA'
  | 'PASAPORTE'
  | 'LICENCIA_CONDUCCION'
  | 'CARNET_UNIVERSITARIO'
  | 'SOAT'
  | 'TECNICOMECANICA'
  | 'TARJETA_PROPIEDAD';

export type TripType = 'INTERCITY' | 'URBAN' | 'ROUTINE';

export type TripStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'BOARDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentMethod =
  | 'NEQUI'
  | 'DAVIPLATA'
  | 'PSE'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH';

export type VehicleStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION' | 'REJECTED';

// ── API Envelope ──

export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data: T | null;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ── Auth ──

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyPhoneRequest {
  otp: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse | null;
}

// ── User ──

export interface UserResponse {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  verificationLevel: VerificationLevel;
  trustScore: number;
  role: Role;
  status: UserStatus;
  phoneVerified: boolean;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
}

// ── Vehicle ──

export interface VehicleResponse {
  id: string;
  ownerId: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  capacity: number;
  photoUrls: string[];
  soatDocumentUrl: string;
  soatExpiry: string;
  transitCardUrl: string;
  techReviewExpiry: string | null;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclePublicResponse {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  capacity: number;
  photoUrls: string[];
  status: VehicleStatus;
}

export interface CreateVehicleRequest {
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  capacity: number;
  photoUrls?: string[];
  soatDocumentUrl: string;
  soatExpiry: string;
  transitCardUrl: string;
  driverLicense?: {
    documentFrontUrl: string;
    documentBackUrl: string;
    licenseNumber: string;
  };
}

export interface UpdateVehicleRequest {
  color?: string;
  capacity?: number;
  photoUrls?: string[];
  soatDocumentUrl?: string;
  soatExpiry?: string;
  transitCardUrl?: string;
}

// ── Identity Verification ──

export interface IdentityVerificationResponse {
  id: string;
  userId: string;
  documentType: DocumentType;
  documentNumber: string;
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl: string | null;
  faceMatchScore: number | null;
  faceMatchConfirmed?: boolean | null;
  status: VerificationStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
  reviewerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitVerificationRequest {
  documentType: DocumentType;
  documentNumber: string;
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl?: string;
}

// ── Trip ──

export interface WaypointRequest {
  latitude: number;
  longitude: number;
  orderIndex: number;
  name: string;
  subtitle?: string;
  isPickupPoint: boolean;
  estimatedArrival?: string;
}

export interface RouteWaypointResponse {
  id: string;
  tripId: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
  name: string;
  subtitle?: string;
  isPickupPoint: boolean;
  estimatedArrival?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripRequest {
  tripType: TripType;
  originName: string;
  originSubtitle?: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationSubtitle?: string;
  destinationLatitude: number;
  destinationLongitude: number;
  departureAt: string;
  arrivedAt?: string;
  availableSeats: number;
  pricePerSeat: number;
  currency: string;
  vehicleId: string;
  allowsLuggage: boolean;
  studentsOnly: boolean;
  universityId?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  waypoints?: WaypointRequest[]; // Array de puntos intermedios de la ruta
}

export interface UpdateTripRequest {
  tripType?: TripType;
  originName?: string;
  originSubtitle?: string;
  originLatitude?: number;
  originLongitude?: number;
  destinationName?: string;
  destinationSubtitle?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  departureAt?: string;
  availableSeats?: number;
  pricePerSeat?: number;
  allowsLuggage?: boolean;
  studentsOnly?: boolean;
  universityId?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  waypoints?: WaypointRequest[];
}

export interface RouteWaypoint {
  id?: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
  name: string;
  subtitle?: string;
  isPickupPoint: boolean;
  estimatedArrival?: string;
}

export interface TripResponse {
  id: string;
  driverId: string;
  vehicleId: string;
  tripType: TripType;
  status: TripStatus;
  originName: string;
  originSubtitle?: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationSubtitle?: string;
  destinationLatitude: number;
  destinationLongitude: number;
  departureAt: string;
  arrivedAt?: string;
  availableSeats: number;
  pricePerSeat: number;
  currency: string;
  allowsLuggage: boolean;
  studentsOnly: boolean;
  universityId?: string | null;
  isRecurring: boolean;
  recurrencePattern?: string | null;
  waypoints?: RouteWaypoint[];
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    trustScore: number;
    verificationLevel: VerificationLevel;
  };
}

// ── Search ──

export interface SearchTripsParams {
  tripType?: TripType;
  departureFrom?: string;
  departureTo?: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  radiusKm?: number;
  studentsOnly?: boolean;
  page?: number;
  size?: number;
}

// ── Bookings ──

export interface CreateBookingRequest {
  seatsBooked: number;
  tripId: string;
  pickupWaypointId?: string;
  dropoffWaypointId?: string;
}

export interface BookingResponse {
  id: string;
  tripId: string;
  passengerId: string;
  seatsBooked: number;
  verificationCode?: string;
  status: BookingStatus;
  pickupWaypointId?: string | null;
  dropoffWaypointId?: string | null;
  boardedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  trip?: {
    tripType: TripType;
    departureAt: string;
    estimatedArrivalAt?: string | null;
    originName: string;
    originSubtitle?: string | null;
    destinationName: string;
    destinationSubtitle?: string | null;
    allowsLuggage: boolean;
    pricePerSeat: number;
    currency: string;
  };
  passenger?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    trustScore: number;
    verificationLevel: VerificationLevel;
  };
}
