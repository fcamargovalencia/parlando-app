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

export type PickupType = 'WAYPOINT' | 'SUGGESTED' | 'ACCEPTED_CUSTOM';

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
  routeLine?: string;
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
  waypointIds: string[];
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
  routineTripId: string;
  driver: {
    id: string;
    name: string;
    rating: number;
    reliabilityScore: number;
    verified: boolean;
  };
  vehicle: {
    plate: string;
    model: string;
    color: string;
  };
  origin: { name: string; lat: number; lng: number; };
  destination: { name: string; lat: number; lng: number; };
  departureTime: string;
  requiredArrivalTime: string;
  recurrenceDays: RecurrenceDay[];
  pricePerSeat: number;
  currency: string;
  availableSeatsForDays: Partial<Record<RecurrenceDay, number>>;
  studentsOnly: boolean;
  requiresStudentVerification: boolean;
  allowsCustomPickup: boolean;
  maxPickupDeviationMeters: number;
  nearestWaypointDistanceMeters?: number;
  nearestWaypoint?: {
    id: string;
    name: string;
    estimatedPickupTime: string;
  };
  predefinedWaypoints: RoutineWaypointResponse[];
}

// ── RoutineSubscription ──

export interface CreateRoutineSubscriptionRequest {
  routineTripId: string;
  subscribedDays: RecurrenceDay[];
  startDate: string;
  endDate?: string;
  seatsRequired?: number;
  specialRequirements?: string;
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
    name: string;
    rating: number;
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
  query?: string;
  city?: string;
  page?: number;
  size?: number;
}

// ── StudentVerification ──

export interface CreateStudentVerificationRequest {
  universityId: string;
  studentEmail: string;
  studentCardUrl: string;
}

export interface StudentVerificationResponse {
  id: string;
  userId: string;
  universityId: string;
  studentEmail: string;
  studentCardUrl: string;
  status: StudentVerificationStatus;
  expiresAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  university?: UniversityResponse;
}

// ── Chat ──

export type MessageType = 'TEXT';

export interface SendMessageRequest {
  content: string;
  recipientId: string;
  tripId: string;
  messageType: MessageType;
}

export interface ChatMessageResponse {
  id: string;
  tripId: string;
  senderId: string;
  recipientId: string;
  content: string;
  messageType: MessageType;
  sentAt: string;
  readAt: string | null;
}

export interface ConversationResponse {
  tripId: string;
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
  recipientId?: string;
  content?: string;
  messageType?: MessageType;
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
