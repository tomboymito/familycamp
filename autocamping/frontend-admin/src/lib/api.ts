import { auth } from './auth';

const BASE = (import.meta.env.VITE_API_URL as string ?? '/api/v1').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = auth.getAccess();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    auth.clear();
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

export interface ChessSlot {
  date: string;
  state: 'free' | 'booked' | 'awaiting_payment' | 'blocked' | 'hold';
  bookingId?: string;
  bookingStart?: string;
  bookingEnd?: string;
  checkInTime?: string;
  checkOutTime?: string;
  guestName?: string;
  source?: string;
  paymentStatus?: string;
  reason?: string;
}

export type HousekeepingStatus = 'clean' | 'ready' | 'dirty' | 'maintenance' | 'unknown';

export interface ChessPlace {
  id: string;
  name: string;
  code: string;
  type: string;
  typeId: string;
  housekeepingStatus: HousekeepingStatus;
  slots: ChessSlot[];
}

export interface ChessBoardData {
  period: { from: string; to: string };
  places: ChessPlace[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  carNumber?: string | null;
  notes?: string | null;
  tags: string[];
  createdAt?: string;
  totalSpend?: number;
  bookingsCount?: number;
}

export interface CustomerBooking {
  id: string;
  status: string;
  payment_status: string;
  check_in: string;
  check_out: string;
  total_price: string | null;
  place_code: string;
  place_name: string;
}

export interface CustomerDetail extends Customer {
  bookings: CustomerBooking[];
}

export interface CustomerListResult {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface NotificationLog {
  id: string;
  bookingId: string | null;
  customerId: string | null;
  channel: string;
  template: string;
  recipient: string;
  status: string;
  error: string | null;
  payload: Record<string, string> | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  status: 'draft' | 'awaiting_payment' | 'confirmed' | 'cancelled' | 'expired';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  guestsCount: number;
  totalPrice: string | null;
  source: string;
  adminNote?: string;
  comment?: string;
  createdAt: string;
  place?: { id: string; name: string; code: string };
  customer?: Customer;
}

export interface BookingListResult {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
}

export interface Blocking {
  id: string;
  placeId: string;
  dateFrom: string;
  dateTo: string;
  reason?: string;
  createdAt: string;
  place?: { id: string; name: string; code: string };
}

export interface Place {
  id: string;
  name: string;
  code: string;
  capacity: number;
  hasElectricity: boolean;
  hasWater: boolean;
  isActive?: boolean;
  typeId: string;
  sortOrder: number;
  accommodationType?: { id: string; name: string; slug: string };
}

export interface PricingRule {
  id: string;
  typeId: string;
  seasonLabel: string;
  validFrom: string;
  validTo: string;
  pricePerNight: string;
  minGuests?: number;
  maxGuests?: number | null;
  isActive: boolean;
  accommodationType?: { id: string; name: string; slug: string };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const api = {
  login: (email: string, password: string): Promise<LoginResult> =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  chessBoard: (from: string, to: string, typeId?: string): Promise<ChessBoardData> => {
    const p = new URLSearchParams({ from, to });
    if (typeId) p.set('type_id', typeId);
    return request(`/admin/chess-board?${p}`);
  },

  bookings: (params: {
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<BookingListResult> => {
    const p = new URLSearchParams();
    if (params.page) p.set('page', String(params.page));
    if (params.limit) p.set('limit', String(params.limit));
    if (params.status) p.set('status', params.status);
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    if (params.search) p.set('search', params.search);
    return request(`/admin/bookings?${p}`);
  },

  booking: (id: string): Promise<Booking> => request(`/admin/bookings/${id}`),

  updateBookingStatus: (id: string, status: string): Promise<Booking> =>
    request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateBookingNote: (id: string, adminNote: string): Promise<Booking> =>
    request(`/admin/bookings/${id}/note`, { method: 'PATCH', body: JSON.stringify({ adminNote }) }),

  blockings: (): Promise<Blocking[]> => request('/admin/blockings'),

  createBlocking: (data: { placeId: string; dateFrom: string; dateTo: string; reason?: string }): Promise<Blocking> =>
    request('/admin/blockings', { method: 'POST', body: JSON.stringify(data) }),

  deleteBlocking: (id: string): Promise<void> =>
    request(`/admin/blockings/${id}`, { method: 'DELETE' }),

  places: (): Promise<Place[]> => request('/places'),

  pricingRules: (): Promise<PricingRule[]> => request('/admin/pricing'),

  createPricingRule: (data: Omit<PricingRule, 'id'>): Promise<PricingRule> =>
    request('/admin/pricing', { method: 'POST', body: JSON.stringify(data) }),

  deletePricingRule: (id: string): Promise<void> =>
    request(`/admin/pricing/${id}`, { method: 'DELETE' }),

  accommodationTypes: (): Promise<{ id: string; name: string; slug: string }[]> =>
    request('/accommodation-types'),

  setHousekeeping: (placeId: string, status: string): Promise<Place> =>
    request(`/admin/places/${placeId}/housekeeping`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateBookingTimes: (id: string, checkInTime: string, checkOutTime: string): Promise<Booking> =>
    request(`/admin/bookings/${id}/times`, { method: 'PATCH', body: JSON.stringify({ checkInTime, checkOutTime }) }),

  updateBooking: (id: string, data: {
    checkIn?: string; checkOut?: string; guestsCount?: number;
    totalPrice?: string; paymentStatus?: string; status?: string;
  }): Promise<Booking> =>
    request(`/admin/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  createAdminBooking: (data: {
    placeId: string; checkIn: string; checkOut: string;
    checkInTime?: string; checkOutTime?: string;
    guestsCount: number; source?: string; adminNote?: string;
    customer: { name: string; phone: string; email?: string; carNumber?: string };
    paymentStatus?: string;
  }): Promise<Booking> =>
    request('/admin/bookings', { method: 'POST', body: JSON.stringify(data) }),

  adminPlaces: (): Promise<Place[]> => request('/admin/places'),

  dashboard: (): Promise<DashboardData> => request('/admin/dashboard'),

  searchCustomers: (q: string): Promise<Customer[]> =>
    request(`/admin/customers?q=${encodeURIComponent(q)}`),

  pricingCalculate: (data: {
    placeId: string; checkIn: string; checkOut: string; guestsCount: number;
  }): Promise<{ nights: number; pricePerNight: number; total: number; seasonLabel: string }> =>
    request('/pricing/calculate', { method: 'POST', body: JSON.stringify(data) }),

  // Pricing admin
  pricingRulesAdmin: (): Promise<PricingRule[]> => request('/admin/pricing'),
  createPricingRuleAdmin: (data: Omit<PricingRule, 'id' | 'accommodationType'>): Promise<PricingRule> =>
    request('/admin/pricing', { method: 'POST', body: JSON.stringify(data) }),
  updatePricingRule: (id: string, data: Partial<PricingRule>): Promise<PricingRule> =>
    request(`/admin/pricing/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePricingRuleAdmin: (id: string): Promise<void> =>
    request(`/admin/pricing/${id}`, { method: 'DELETE' }),

  // Places admin
  createPlace: (data: Omit<Place, 'id' | 'sortOrder' | 'accommodationType' | 'isActive'>): Promise<Place> =>
    request('/admin/places', { method: 'POST', body: JSON.stringify(data) }),
  updatePlace: (id: string, data: Partial<Place>): Promise<Place> =>
    request(`/admin/places/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  togglePlace: (id: string): Promise<Place> =>
    request(`/admin/places/${id}/toggle`, { method: 'PATCH' }),

  // Accommodation types
  accommodationTypesAdmin: (): Promise<{ id: string; name: string; slug: string; defaultCapacity: number; description: string | null; isActive: boolean }[]> =>
    request('/admin/accommodation-types'),
  createAccommodationType: (data: { name: string; slug: string; defaultCapacity: number; description?: string }): Promise<{ id: string; name: string; slug: string }> =>
    request('/admin/accommodation-types', { method: 'POST', body: JSON.stringify(data) }),
  updateAccommodationType: (id: string, data: { name?: string; defaultCapacity?: number; description?: string; isActive?: boolean }): Promise<{ id: string; name: string; slug: string }> =>
    request(`/admin/accommodation-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Settings
  settings: (): Promise<Record<string, string>> => request('/admin/settings'),
  updateSettings: (data: Record<string, string>): Promise<Record<string, string>> =>
    request('/admin/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  // Admin users
  adminUsers: (): Promise<AdminUser[]> => request('/admin/users'),
  createAdminUser: (data: { email: string; name: string; password: string }): Promise<AdminUser> =>
    request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (id: string, data: { name?: string; isActive?: boolean; password?: string }): Promise<AdminUser> =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Reports
  reportsRevenue: (months?: number): Promise<{ month: string; revenue: number; bookings: number }[]> => {
    const p = new URLSearchParams();
    if (months) p.set('months', String(months));
    return request(`/admin/reports/revenue?${p}`);
  },
  reportsOccupancy: (from: string, to: string): Promise<{ id: string; code: string; name: string; days_occupied: number; total_days: number; pct: number }[]> =>
    request(`/admin/reports/occupancy?from=${from}&to=${to}`),
  reportsSources: (from?: string, to?: string): Promise<{ source: string; bookings: number; revenue: number }[]> => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return request(`/admin/reports/sources?${p}`);
  },
  reportsSummary: (from?: string, to?: string): Promise<{
    total_bookings: number; total_revenue: number; avg_check: number;
    avg_nights: number; unique_guests: number; places_used: number; repeat_guests: number;
  }> => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return request(`/admin/reports/summary?${p}`);
  },
  reportsCsvUrl: (from: string, to: string): string =>
    `${(import.meta.env.VITE_API_URL as string ?? '/api/v1').replace(/\/$/, '')}/admin/reports/export/csv?from=${from}&to=${to}`,

  // PDF
  bookingPdfUrl: (id: string, type: 'confirmation' | 'invoice'): string =>
    `${(import.meta.env.VITE_API_URL as string ?? '/api/v1').replace(/\/$/, '')}/admin/bookings/${id}/pdf/${type}`,

  // Webhooks
  webhookLogs: (page?: number): Promise<{ items: WebhookLog[]; total: number; page: number; pages: number }> => {
    const p = new URLSearchParams();
    if (page) p.set('page', String(page));
    return request(`/admin/webhooks/logs?${p}`);
  },
  webhookGenericUrl: (): string =>
    `${window.location.origin}/api/v1/webhook/generic`,
  webhookBookingComUrl: (): string =>
    `${window.location.origin}/api/v1/webhook/booking-com`,
  webhookAvitoUrl: (): string =>
    `${window.location.origin}/api/v1/webhook/avito`,

  // iCal
  icalFeedUrl: (placeId: string): string =>
    `${window.location.origin}/api/v1/ical/${placeId}.ics`,
  icalImport: (placeId: string, url: string): Promise<{ created: number; skipped: number }> =>
    request('/admin/ical/import', { method: 'POST', body: JSON.stringify({ placeId, url }) }),

  // Customers CRM
  customers: (params: { q?: string; tag?: string; page?: number; limit?: number }): Promise<CustomerListResult> => {
    const p = new URLSearchParams();
    if (params.q) p.set('q', params.q);
    if (params.tag) p.set('tag', params.tag);
    if (params.page) p.set('page', String(params.page));
    if (params.limit) p.set('limit', String(params.limit));
    return request(`/admin/customers?${p}`);
  },
  customer: (id: string): Promise<CustomerDetail> => request(`/admin/customers/${id}`),
  updateCustomer: (id: string, data: { name?: string; phone?: string; email?: string; carNumber?: string; notes?: string; tags?: string[] }): Promise<CustomerDetail> =>
    request(`/admin/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Notifications
  sendNotification: (data: {
    bookingId?: string;
    customerId?: string;
    channel: 'email' | 'sms';
    template: 'confirm' | 'reminder' | 'cancel' | 'custom';
    recipient: string;
    vars: Record<string, string>;
    customText?: string;
  }): Promise<NotificationLog> =>
    request('/admin/notifications/send', { method: 'POST', body: JSON.stringify(data) }),
  notificationLogs: (page?: number): Promise<{ items: NotificationLog[]; total: number; page: number; pages: number }> => {
    const p = new URLSearchParams();
    if (page) p.set('page', String(page));
    return request(`/admin/notifications?${p}`);
  },
};

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardBookingRow {
  id: string;
  guestName: string;
  guestPhone: string;
  placeName: string;
  placeCode: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  guestsCount: number;
  paymentStatus: string;
  totalPrice: string | null;
  source: string;
}

export interface DashboardData {
  today: string;
  tomorrow: string;
  occupancy: { active: number; total: number; pct: number };
  revenue: { month: number; week: number };
  attention: {
    unpaidConfirmed: number;
    dirtyPlaces: { id: string; code: string; name: string }[];
    conflicts: { id: string; placeCode: string; guestName: string; checkIn: string; checkOut: string }[];
  };
  checkInsToday: DashboardBookingRow[];
  checkOutsToday: DashboardBookingRow[];
  checkInsTomorrow: DashboardBookingRow[];
  checkOutsTomorrow: DashboardBookingRow[];
}

export interface WebhookLog {
  id: string;
  source: string;
  eventType: string;
  status: string;
  rawPayload: string | null;
  bookingId: string | null;
  error: string | null;
  createdAt: string;
}
