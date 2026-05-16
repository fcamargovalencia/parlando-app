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
  | 'BANCOLOMBIA'
  | 'BRE_B'
  | 'PSE'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH';

export type PaymentStatus = 'COMPLETED';

export interface PaymentResponse {
  bookingId: string;
  tripId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  confirmedAt: string;
}

export interface BoardBookingRequest {
  verificationCode: string;
  paymentMethod: PaymentMethod;
}

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

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmergencyContactResponse {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notifyOnTrip: boolean;
}

export interface CreateEmergencyContactRequest {
  name: string;
  phone: string;
  relationship: string;
  notifyOnTrip: boolean;
}

export interface UpdateEmergencyContactRequest {
  name?: string;
  phone?: string;
  relationship?: string;
  notifyOnTrip?: boolean;
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

export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

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
  waypoints?: WaypointRequest[];
  routePolyline?: CoordinatePoint[];
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
  routePolyline?: CoordinatePoint[];
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
  routineTripId?: string | null;
  waypoints?: RouteWaypoint[];
  routePolyline?: CoordinatePoint[];
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
  minSeats?: number;
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
  driverRatingId?: string | null;
  passengerRatingId?: string | null;
  trip?: {
    tripType: TripType;
    status?: TripStatus;
    departureAt: string;
    estimatedArrivalAt?: string | null;
    originName: string;
    originSubtitle?: string | null;
    destinationName: string;
    destinationSubtitle?: string | null;
    allowsLuggage: boolean;
    pricePerSeat: number;
    currency: string;
    driverId?: string;
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

// ── Fase 4: Viajes Rutinarios ──

export type RoutineTripStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type SubscriptionStatus = 'PENDING' | 'ACCEPTED' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type PickupType = 'WAYPOINT' | 'SUGGESTED' | 'ACCEPTED_CUSTOM' | 'ORIGIN';

export type StudentVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type RecurrenceDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

// ── RoutineTrip ──

export interface CreateRoutineTripRequest {
  vehicleId: string;
  originName: string;
  originSubtitle?: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationSubtitle?: string;
  destinationLatitude: number;
  destinationLongitude: number;
  universityId?: string;
  studentsOnly: boolean;
  departureTime: string;
  requiredArrivalTime: string;
  recurrenceDays: RecurrenceDay[];
  validFrom: string;
  validUntil?: string;
  availableSeats: number;
  pricePerSeat: number;
  currency?: string;
  allowsLuggage: boolean;
  allowsCustomPickup: boolean;
  maxPickupDeviationMeters?: number;
  maxTimeOverheadSeconds?: number;
  autoApproveBookings: boolean;
  routePolyline?: CoordinatePoint[];
}

export interface UpdateRoutineTripRequest extends Partial<CreateRoutineTripRequest> { }

export interface RoutineTripResponse {
  id: string;
  driverId: string;
  vehicleId: string;
  originName: string;
  originSubtitle?: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationSubtitle?: string;
  destinationLatitude: number;
  destinationLongitude: number;
  universityId?: string;
  studentsOnly: boolean;
  departureTime: string;
  requiredArrivalTime: string;
  recurrenceDays: RecurrenceDay[];
  validFrom: string;
  validUntil?: string;
  availableSeats: number;
  pricePerSeat: number;
  currency: string;
  allowsLuggage: boolean;
  allowsCustomPickup: boolean;
  maxPickupDeviationMeters: number;
  maxTimeOverheadSeconds: number;
  autoApproveBookings: boolean;
  status: RoutineTripStatus;
  createdAt: string;
  updatedAt: string;
  routeLine?: [number, number][];
}

// ── RoutineTripWaypoint ──

export interface CreateRoutineWaypointRequest {
  orderIndex: number;
  latitude: number;
  longitude: number;
  name: string;
  subtitle?: string;
  isPickupPoint: boolean;
  estimatedMinutesOffset: number;
}

export interface ReorderRoutineWaypointsRequest {
  orderedIds: string[];
  day?: RecurrenceDay;
}

export interface RoutineWaypointResponse {
  id: string;
  routineTripId: string;
  orderIndex: number;
  latitude: number;
  longitude: number;
  name: string;
  subtitle?: string;
  isPickupPoint: boolean;
  estimatedMinutesOffset: number;
  estimatedPickupTime: string;  // "HH:mm" calculated by backend
  applicableDays: RecurrenceDay[];  // empty = applies to all recurrence days
  dayOrderOverrides?: Record<string, number>;  // day → orderIndex overrides
}

// ── Búsqueda de RoutineTrip ──

export interface SearchRoutineTripsParams {
  universityId?: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationRadiusMeters?: number;
  days: RecurrenceDay[];
  requiredArrivalBefore: string;
  passengerLat?: number;
  passengerLng?: number;
  maxWalkDistanceMeters?: number;
  page?: number;
  size?: number;
}

export interface RoutineTripSearchResult {
  id: string;
  driverName: string;
  driverId: string;
  originName: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  studentsOnly: boolean;
  departureTime: string;
  requiredArrivalTime: string;
  recurrenceDays: RecurrenceDay[];
  availableSeats: number;
  pricePerSeat: number;
  currency: string;
  allowsLuggage: boolean;
  allowsCustomPickup: boolean;
  requiresStudentVerification: boolean;
  /** Coordinate pairs [latitude, longitude] describing the route polyline. Backend format — NOT standard GeoJSON order. */
  routeLine?: [number, number][];
}

// ── RoutineSubscription ──

export interface CreateRoutineSubscriptionRequest {
  routineTripId: string;
  subscribedDays: RecurrenceDay[];
  startDate: string;
  endDate?: string;
  seatsRequired?: number;
  specialRequirements?: string;
  pickupType?: PickupType;
  pickupWaypointId?: string;
  customPickupLatitude?: number;
  customPickupLongitude?: number;
  customPickupName?: string;
  dropoffWaypointId?: string;
}

export interface AcceptSubscriptionRequest {
  notes?: string;
}

export interface RejectSubscriptionRequest {
  reason?: string;
}

export interface PauseSubscriptionRequest {
  fromDate: string;
  toDate?: string;
  reason?: string;
}

export interface PickupOverrideRequest {
  latitude: number;
  longitude: number;
  name: string;
}

// ── RoutineBooking (occurrence booking) ──

export type RoutineBookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'BOARDED'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface RoutineBookingResponse {
  id: string;
  tripId: string;            // ID of the TripOccurrence
  subscriptionId: string;
  passengerId: string;
  pickupWaypointId?: string;
  dropoffWaypointId?: string;
  seatsBooked: number;
  status: RoutineBookingStatus;
  boardedAt?: string;
  occurrenceDate: string;    // ISO date "YYYY-MM-DD" (derived from trip.departureAt)
  createdAt: string;
  updatedAt: string;
  passenger?: {
    id: string;
    name: string;
    rating: number;
    verified: boolean;
  };
}

// ── DayStop — Layer B (Day Variant Preview, template-level) ──

export type DayStop =
  | { kind: 'origin'; lat: number; lng: number; name: string; }
  | { kind: 'waypoint'; data: RoutineWaypointResponse; routeIdx: number; }
  | { kind: 'subscriber'; sub: RoutineSubscriptionResponse; routeIdx: number; }
  | { kind: 'destination'; lat: number; lng: number; name: string; };

export interface RoutineSubscriptionResponse {
  id: string;
  routineTripId: string;
  passengerId: string;
  subscribedDays: RecurrenceDay[];
  startDate: string;
  endDate?: string;
  seatsRequired: number;
  specialRequirements?: string;
  pickupWaypointId?: string;
  customPickupLatitude?: number;
  customPickupLongitude?: number;
  customPickupName?: string;
  routeDeviationMeters?: number;
  timeOverheadSeconds?: number;
  pickupType: PickupType;
  dropoffWaypointId?: string;
  status: SubscriptionStatus;
  consecutiveNoShows: number;
  createdAt: string;
  updatedAt: string;
  routineTrip?: RoutineTripResponse;
  passenger?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string | null;
    trustScore: number;
    verified: boolean;
  };
}

// ── University ──

export interface UniversityResponse {
  id: string;
  name: string;
  shortName: string;
  city: string;
  department: string;
  address: string;
  latitude: number;
  longitude: number;
  domainEmail: string;
  typicalArrivalWindows: { label: string; time: string; }[];
  logoUrl?: string;
  isActive: boolean;
}

export interface SearchUniversitiesParams {
  q?: string;
  city?: string;
  page?: number;
  size?: number;
}

// ── StudentVerification ──

export interface CreateStudentVerificationRequest {
  universityId: string;
  universityEmail: string;
  studentIdNumber: string;
  studentCardUrl: string;
}

export interface StudentVerificationResponse {
  id: string;
  universityId: string;
  universityName: string;
  universityEmail: string;
  studentIdNumber: string;
  status: StudentVerificationStatus;
  expiresAt?: string;
  reviewerNote?: string;
  createdAt: string;
}

// ── Chat ──

export type MessageType = 'TEXT';

export interface SendMessageRequest {
  content: string;
  recipientId: string;
  tripId?: string;
  routineTripId?: string;
  messageType: MessageType;
}

export interface ChatMessageResponse {
  id: string;
  tripId: string | null;
  routineTripId?: string | null;
  senderId: string;
  recipientId: string;
  content: string;
  messageType: MessageType;
  sentAt: string;
  readAt: string | null;
}

export interface ConversationResponse {
  tripId: string | null;
  routineTripId?: string | null;
  counterpartId: string;
  counterpartFirstName: string;
  counterpartLastName: string;
  counterpartPhotoUrl: string | null;
  tripStatus?: TripStatus;
  bookingStatus?: BookingStatus | null;
  availableSeats?: number;
  tripType?: TripType;
  originSubtitle?: string;
  destinationSubtitle?: string;
  departureAt?: string;
  lastMessage: ChatMessageResponse;
  unreadCount: number;
}

// ── WebSocket ──

export type WsFrameType = 'SUBSCRIBE' | 'SEND' | 'PING' | 'MESSAGE' | 'ERROR' | 'PONG';

export interface WsInboundFrame {
  type: WsFrameType;
  // MESSAGE
  id?: string;
  tripId?: string;
  routineTripId?: string;
  senderId?: string;
  content?: string;
  messageType?: MessageType;
  sentAt?: string;
  // ERROR
  message?: string;
}

export interface WsOutboundFrame {
  type: WsFrameType;
  // SUBSCRIBE
  userId?: string;
  // SEND
  tripId?: string;
  routineTripId?: string;
  recipientId?: string;
  content?: string;
  messageType?: MessageType;
}

// ── Notifications ──

export interface NotificationPreferences {
  pushEnabled: boolean;
  bookings: boolean;
  chat: boolean;
  trips: boolean;
  subscriptions: boolean;
  verifications: boolean;
  marketing: boolean;
}

export interface DeviceToken {
  id: string;
  token: string;
  platform: 'android' | 'ios';
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Ratings ──

export interface CreateRatingRequest {
  revieweeId: string;
  score: number;
  tripId: string;
  comment?: string;
  tags?: string[];
}

export interface RatingResponse {
  id: string;
  tripId: string;
  reviewerId: string;
  revieweeId: string;
  score: number;
  comment?: string;
  tags?: string[];
  createdAt: string;
}
