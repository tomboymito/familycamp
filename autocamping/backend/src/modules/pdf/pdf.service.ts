import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { Booking } from '../../database/entities/booking.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    private readonly settingsService: SettingsService,
  ) {}

  private async getBooking(id: string) {
    const b = await this.bookingRepo.findOne({
      where: { id },
      relations: ['place', 'place.accommodationType', 'customer'],
    });
    if (!b) throw new NotFoundException(`Booking ${id} not found`);
    return b;
  }

  /** Booking confirmation PDF */
  async confirmation(id: string): Promise<Buffer> {
    const b = await this.getBooking(id);
    const s = await this.settingsService.getAll();

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Подтверждение брони #${id.slice(0,8)}` } });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const campName = s['camp_name'] || 'Кемпинг';
      const campPhone = s['camp_phone'] || '';
      const campEmail = s['camp_email'] || '';

      // ── Header ───────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(20).text(campName, { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text(`${campPhone}  •  ${campEmail}`, { align: 'center' });
      doc.moveDown(0.5);

      // Horizontal rule
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.5);

      // Title
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#111')
        .text('ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ', { align: 'center' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor('#666')
        .text(`№ ${id.slice(0, 8).toUpperCase()}  •  от ${new Date().toLocaleDateString('ru-RU')}`, { align: 'center' });
      doc.moveDown(1);

      // ── Guest info ───────────────────────────────────────────────
      this.sectionHeader(doc, 'Гость');
      this.row(doc, 'Имя',        b.customer?.name || '—');
      this.row(doc, 'Телефон',    b.customer?.phone || '—');
      this.row(doc, 'Email',      b.customer?.email || '—');
      this.row(doc, 'Автомобиль', b.customer?.carNumber || '—');
      doc.moveDown(0.8);

      // ── Booking details ──────────────────────────────────────────
      this.sectionHeader(doc, 'Детали бронирования');
      this.row(doc, 'Место',       `${b.place?.code || '—'}${b.place?.name ? ' — ' + b.place.name : ''}`);
      this.row(doc, 'Тип',         b.place?.accommodationType?.name || '—');
      this.row(doc, 'Заезд',       `${b.checkIn}  в  ${b.checkInTime || '12:00'}`);
      this.row(doc, 'Выезд',       `${b.checkOut}  в  ${b.checkOutTime || '14:00'}`);
      this.row(doc, 'Ночей',       String(this.nights(b.checkIn, b.checkOut)));
      this.row(doc, 'Гостей',      String(b.guestsCount));
      this.row(doc, 'Источник',    b.source || '—');
      doc.moveDown(0.8);

      // ── Payment ──────────────────────────────────────────────────
      this.sectionHeader(doc, 'Оплата');
      const price = b.totalPrice ? `${Number(b.totalPrice).toLocaleString('ru-RU')} ₽` : '—';
      this.row(doc, 'Сумма',           price);
      this.row(doc, 'Статус оплаты',   this.payLabel(b.paymentStatus));
      doc.moveDown(1);

      // ── Footer note ──────────────────────────────────────────────
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).fillColor('#999')
        .text(
          `Документ сформирован ${new Date().toLocaleString('ru-RU')}. ` +
          `Данное подтверждение является официальным документом о бронировании.`,
          { align: 'center' },
        );

      doc.end();
    });
  }

  /** Invoice PDF */
  async invoice(id: string): Promise<Buffer> {
    const b = await this.getBooking(id);
    const s = await this.settingsService.getAll();

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Счёт #${id.slice(0,8)}` } });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const campName  = s['camp_name']     || 'Кемпинг';
      const inn       = s['inn']           || '—';
      const bankName  = s['bank_name']     || '—';
      const bankAcct  = s['bank_account']  || '—';
      const bankBik   = s['bank_bik']      || '—';
      const campPhone = s['camp_phone']    || '';
      const campEmail = s['camp_email']    || '';
      const addr      = s['camp_address']  || '';

      const price  = b.totalPrice ? Number(b.totalPrice) : 0;
      const nights = this.nights(b.checkIn, b.checkOut);

      // ── Header ───────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#111').text('СЧЁТ НА ОПЛАТУ', { align: 'right' });
      doc.font('Helvetica').fontSize(10).fillColor('#666')
        .text(`№ ${id.slice(0,8).toUpperCase()} от ${new Date().toLocaleDateString('ru-RU')}`, { align: 'right' });
      doc.moveDown(1);

      // ── Supplier block ───────────────────────────────────────────
      this.sectionHeader(doc, 'Поставщик услуг');
      this.row(doc, 'Организация', campName);
      this.row(doc, 'ИНН',         inn);
      this.row(doc, 'Адрес',       addr || '—');
      this.row(doc, 'Телефон',     campPhone || '—');
      this.row(doc, 'Email',       campEmail || '—');
      doc.moveDown(0.8);

      // ── Bank ─────────────────────────────────────────────────────
      this.sectionHeader(doc, 'Банковские реквизиты');
      this.row(doc, 'Банк',  bankName);
      this.row(doc, 'Р/с',   bankAcct);
      this.row(doc, 'БИК',   bankBik);
      doc.moveDown(0.8);

      // ── Buyer ────────────────────────────────────────────────────
      this.sectionHeader(doc, 'Плательщик');
      this.row(doc, 'Имя',     b.customer?.name  || '—');
      this.row(doc, 'Телефон', b.customer?.phone || '—');
      this.row(doc, 'Email',   b.customer?.email || '—');
      doc.moveDown(0.8);

      // ── Services table ───────────────────────────────────────────
      this.sectionHeader(doc, 'Услуги');
      doc.moveDown(0.3);

      // Table header
      const col = { name: 50, qty: 360, price: 420, total: 480 };
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff');
      doc.rect(50, doc.y, 495, 18).fill('#374151');
      const tY = doc.y - 14;
      doc.fillColor('#fff')
        .text('Наименование', col.name, tY)
        .text('Кол-во',       col.qty,  tY)
        .text('Цена',         col.price, tY)
        .text('Сумма',        col.total, tY);
      doc.moveDown(0.2);

      // Table row
      const ppn = nights > 0 ? price / nights : price;
      doc.font('Helvetica').fontSize(9).fillColor('#111');
      doc.rect(50, doc.y, 495, 18).fill('#f9fafb');
      const rY = doc.y - 14;
      const placeDesc = `Проживание: место ${b.place?.code || '—'}, ${b.checkIn} – ${b.checkOut}`;
      doc.fillColor('#111')
        .text(placeDesc,                                col.name,  rY, { width: 300 })
        .text(`${nights} ноч.`,                         col.qty,   rY)
        .text(`${Math.round(ppn).toLocaleString('ru-RU')} ₽`, col.price, rY)
        .text(`${price.toLocaleString('ru-RU')} ₽`,    col.total, rY);
      doc.moveDown(0.2);

      // Bottom border
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.5);

      // Total
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#111')
        .text(`ИТОГО К ОПЛАТЕ: ${price.toLocaleString('ru-RU')} ₽`, { align: 'right' });
      doc.moveDown(1.5);

      // ── Footer ───────────────────────────────────────────────────
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).fillColor('#999')
        .text(`Документ сформирован ${new Date().toLocaleString('ru-RU')}.`, { align: 'center' });

      doc.end();
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private sectionHeader(doc: PDFKit.PDFDocument, title: string) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#16a34a').text(title);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#16a34a').lineWidth(0.5).stroke();
    doc.moveDown(0.4);
  }

  private row(doc: PDFKit.PDFDocument, label: string, value: string) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#555').text(label, 50, y, { width: 150 });
    doc.font('Helvetica').fontSize(9).fillColor('#111').text(value, 210, y, { width: 335 });
    doc.moveDown(0.35);
  }

  private nights(checkIn: string, checkOut: string): number {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  }

  private payLabel(status: string): string {
    return {
      paid: 'Оплачено',
      not_paid: 'Не оплачено',
      unpaid: 'Не оплачено',
      refunded: 'Возврат',
      payment_failed: 'Ошибка оплаты',
    }[status] ?? status;
  }
}
