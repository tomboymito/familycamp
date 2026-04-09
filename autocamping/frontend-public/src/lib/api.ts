const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export interface AccommodationType {
  id: string;
  name: string;
  slug: string;
  defaultCapacity: number;
  description: string;
}

export interface Place {
  id: string;
  name: string;
  code: string;
  capacity: number;
  hasElectricity: boolean;
  hasWater: boolean;
  typeId: string;
  sortOrder: number;
}

export interface AvailablePlace extends Place {
  state: 'free' | 'hold';
  type: AccommodationType;
  pricePerNight: string | null;
}

export interface PriceCalculation {
  nights: number;
  pricePerNight: number;
  total: number;
  seasonLabel: string;
  breakdown: { date: string; price: number }[];
}

export interface Hold {
  id: string;
  sessionToken: string;
  placeId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  expiresAt: string;
}

export interface Booking {
  id: string;
  status: string;
  paymentStatus: string;
  totalPrice: string | null;
}

export interface Review {
  id: string;
  source: string;
  authorName: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
}

export interface PaymentInitResult {
  paymentId: string;
  redirectUrl: string;
}

export const api = {
  accommodationTypes: (): Promise<AccommodationType[]> =>
    request('/accommodation-types'),

  places: (typeId?: string): Promise<Place[]> =>
    request(`/places${typeId ? `?type_id=${typeId}` : ''}`),

  availability: (checkIn: string, checkOut: string, typeId?: string, guests?: number): Promise<AvailablePlace[]> => {
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
    if (typeId) params.set('type_id', typeId);
    if (guests) params.set('guests', String(guests));
    return request(`/availability?${params}`);
  },

  pricing: (placeId: string, checkIn: string, checkOut: string, guestsCount: number): Promise<PriceCalculation> =>
    request('/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ placeId, checkIn, checkOut, guestsCount }),
    }),

  createHold: (placeId: string, checkIn: string, checkOut: string, guestsCount: number): Promise<Hold> =>
    request('/holds', {
      method: 'POST',
      body: JSON.stringify({ placeId, checkIn, checkOut, guestsCount }),
    }),

  cancelHold: (token: string): Promise<void> =>
    request(`/holds/${token}`, { method: 'DELETE' }),

  createBooking: (
    holdToken: string,
    customer: { name: string; phone: string; email?: string; carNumber?: string },
    comment?: string,
  ): Promise<Booking> =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify({ holdToken, customer, comment }),
    }),

  initiatePayment: (bookingId: string): Promise<PaymentInitResult> =>
    request(`/payments/${bookingId}/initiate`, { method: 'POST' }),
};
