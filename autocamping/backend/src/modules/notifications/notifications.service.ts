import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { NotificationLog } from '../../database/entities/notification-log.entity';
import { SettingsService } from '../settings/settings.service';

export interface SendNotificationInput {
  bookingId?: string;
  customerId?: string;
  channel: 'email' | 'sms';
  template: 'confirm' | 'reminder' | 'cancel' | 'custom';
  recipient: string; // email or phone
  vars: Record<string, string>; // { name, booking_id, place, check_in, check_out, total_price, ... }
  customText?: string; // used when template === 'custom'
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    private readonly settingsService: SettingsService,
  ) {}

  async send(input: SendNotificationInput): Promise<NotificationLog> {
    const settings = await this.settingsService.getAll();

    const tplKey = `tpl_${input.template}_${input.channel}`;
    const rawTpl = input.template === 'custom' && input.customText
      ? input.customText
      : (settings[tplKey] ?? '');

    const text = this.renderTemplate(rawTpl, input.vars);

    const log = this.logRepo.create({
      bookingId: input.bookingId ?? null,
      customerId: input.customerId ?? null,
      channel: input.channel,
      template: input.template,
      recipient: input.recipient,
      status: 'pending',
      payload: { text, ...input.vars },
    });

    try {
      if (input.channel === 'email') {
        await this.sendEmail(settings, input.recipient, input.vars['booking_id'] ?? 'Уведомление', text);
      } else {
        await this.sendSms(settings, input.recipient, text);
      }
      log.status = 'sent';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.status = 'failed';
      log.error = message;
      this.logger.error(`Notification failed: ${message}`);
    }

    return this.logRepo.save(log);
  }

  async list(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private renderTemplate(tpl: string, vars: Record<string, string>): string {
    return tpl.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
  }

  private async sendEmail(
    settings: Record<string, string>,
    to: string,
    subject: string,
    text: string,
  ) {
    const host = settings['smtp_host'];
    const port = parseInt(settings['smtp_port'] ?? '587', 10);
    const user = settings['smtp_user'];
    const pass = settings['smtp_pass'];
    const from = settings['smtp_from'] || user;

    if (!host || !user) {
      const log = this.logRepo.create({ status: 'no_provider' });
      void log; // will be set by caller
      throw new Error('SMTP not configured');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({ from, to, subject, text });
  }

  private async sendSms(
    settings: Record<string, string>,
    to: string,
    text: string,
  ) {
    const provider = settings['sms_provider'];
    const apiKey = settings['sms_api_key'];
    const sender = settings['sms_sender'];

    if (!provider || !apiKey) {
      throw new Error('SMS provider not configured');
    }

    // Generic HTTP SMS gateway — supports most Russian providers (smsru, smsc.ru, etc.)
    if (provider === 'smsru') {
      const url = `https://sms.ru/sms/send?api_id=${apiKey}&to=${encodeURIComponent(to)}&msg=${encodeURIComponent(text)}&from=${encodeURIComponent(sender)}&json=1`;
      const resp = await fetch(url);
      const data = await resp.json() as { status: string; status_code?: number };
      if (data.status !== 'OK') {
        throw new Error(`sms.ru error: status_code=${data.status_code}`);
      }
    } else if (provider === 'smsc') {
      const params = new URLSearchParams({
        login: sender,
        psw: apiKey,
        phones: to,
        mes: text,
        fmt: '3',
      });
      const resp = await fetch(`https://smsc.ru/sys/send.php?${params.toString()}`);
      const data = await resp.json() as { error_code?: number; error?: string };
      if (data.error_code) {
        throw new Error(`smsc.ru error: ${data.error}`);
      }
    } else {
      throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }
}
