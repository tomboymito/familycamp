import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../../database/entities/payment.entity';
import { Booking } from '../../database/entities/booking.entity';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    private readonly config: ConfigService,
  ) {}

  async initiatePayment(bookingId: string): Promise<{ paymentId: string; redirectUrl: string }> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        bookingId,
        provider: this.config.get<string>('PAYMENT_PROVIDER', 'mock'),
        amount: booking.totalPrice ?? '0',
        currency: 'RUB',
        status: 'pending',
      }),
    );

    // Mock redirect URL — real integration would call payment provider API
    const redirectUrl = `${this.config.get('PUBLIC_SITE_URL', 'http://localhost')}/payment/mock?payment_id=${payment.id}&booking_id=${bookingId}`;

    return { paymentId: payment.id, redirectUrl };
  }

  async getStatus(paymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    return payment;
  }

  async handleWebhook(rawBody: Buffer, signature: string, payload: Record<string, unknown>): Promise<void> {
    this.verifyWebhookSignature(rawBody, signature);

    const event = payload['event'] as string;
    const paymentId = payload['payment_id'] as string;

    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    if (event === 'payment.succeeded') {
      await this.paymentRepo.update(payment.id, { status: 'succeeded', providerResponse: payload as unknown as null });
      await this.bookingRepo.update(payment.bookingId, {
        status: 'confirmed',
        paymentStatus: 'paid',
        crmSyncStatus: 'pending',
      });
    } else if (event === 'payment.cancelled') {
      await this.paymentRepo.update(payment.id, { status: 'cancelled', providerResponse: payload as unknown as null });
      await this.bookingRepo.update(payment.bookingId, {
        paymentStatus: 'payment_failed',
      });
    }
  }

  private verifyWebhookSignature(rawBody: Buffer, signature: string): void {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET', '');
    if (!secret) return; // Skip in dev/mock mode

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }
}
