import type { FastifyBaseLogger } from 'fastify';
import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import type { CajaConsignacionProveedorVentas, CajaSessionDetalle } from '../modules/caja/caja.types.js';

interface MailConfig {
  readonly user: string | undefined;
  readonly appPassword: string | undefined;
  readonly to: string | undefined;
}

interface SendHtmlMailInput {
  readonly subject: string;
  readonly html: string;
  readonly to?: string;
}

interface MailCredentials {
  readonly user: string;
  readonly appPassword: string;
  readonly to: string;
}

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

const moneyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Santiago',
});

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export class MailService {
  private readonly config: MailConfig;
  private transporter?: MailTransporter;

  constructor(private readonly logger: FastifyBaseLogger, config: Partial<MailConfig> = {}) {
    this.config = {
      user: config.user ?? env.mailUser,
      appPassword: config.appPassword ?? env.mailAppPassword,
      to: config.to ?? env.mailTo,
    };
  }

  async sendHtml(input: SendHtmlMailInput): Promise<boolean> {
    const credentials = this.getCredentials();

    if (!credentials) {
      this.logger.warn('Mail service is not configured. Skipping email send.');
      return false;
    }

    await this.getTransporter().sendMail({
      from: credentials.user,
      to: input.to ?? credentials.to,
      subject: input.subject,
      html: input.html,
    });

    return true;
  }

  async sendCashCloseEmail(session: CajaSessionDetalle): Promise<boolean> {
    return this.sendHtml({
      subject: `Cierre de caja #${session.id} - ${this.formatDate(session.cerrada_en ?? new Date().toISOString())}`,
      html: this.buildCashCloseHtml(session),
    });
  }

  async sendConsignmentProviderCashCloseEmail(
    to: string,
    session: CajaSessionDetalle,
    providerSales: CajaConsignacionProveedorVentas,
  ): Promise<boolean> {
    return this.sendHtml({
      to,
      subject: `Ventas en consignación - Cierre de caja #${session.id}`,
      html: this.buildConsignmentProviderHtml(session, providerSales),
    });
  }

  isValidEmail(value: string): boolean {
    return isEmail(value.trim());
  }

  private getCredentials(): MailCredentials | null {
    if (!this.config.user || !this.config.appPassword || !this.config.to) {
      return null;
    }

    return {
      user: this.config.user,
      appPassword: this.config.appPassword,
      to: this.config.to,
    };
  }

  private getTransporter(): MailTransporter {
    if (!this.transporter) {
      const credentials = this.getCredentials();

      if (!credentials) {
        throw new Error('Mail service is not configured');
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        auth: {
          user: credentials.user,
          pass: credentials.appPassword,
        },
      });
    }

    return this.transporter;
  }

  private buildCashCloseHtml(session: CajaSessionDetalle): string {
    const closedAt = session.cerrada_en ?? new Date().toISOString();
    const rows = [
      ['Efectivo', session.resumen.efectivo],
      ['Tarjeta', session.resumen.tarjeta],
      ['Transferencia', session.resumen.transferencia],
      ['Mixto', session.resumen.mixto],
    ];

    return `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.45;">
        <h1 style="margin: 0 0 8px; font-size: 24px;">Cierre de caja #${session.id}</h1>
        <p style="margin: 0 0 20px; color: #6b7280;">
          ${escapeHtml(this.formatDate(closedAt))} · ${escapeHtml(session.usuario_nombre)}
        </p>

        <table style="border-collapse: collapse; width: 100%; max-width: 560px; margin-bottom: 20px;">
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">Total vendido</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${this.formatMoney(session.resumen.total_ventas)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">Cantidad de ventas</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${session.resumen.cantidad_ventas}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">Ventas productos propios</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${this.formatMoney(session.resumen.ventas_propias)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">Ventas en consignación</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${this.formatMoney(session.resumen.ventas_consignacion)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">Efectivo contado</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${this.formatMoney(session.monto_cierre ?? 0)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">Diferencia de cierre</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${this.formatMoney(session.diferencia_cierre ?? 0)}
              </td>
            </tr>
          </tbody>
        </table>

        <h2 style="margin: 0 0 10px; font-size: 18px;">Desglose por medio de pago del cierre completo</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
          <tbody>
            ${rows
              .map(
                ([label, amount]) => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${label}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                      ${this.formatMoney(Number(amount))}
                    </td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private buildConsignmentProviderHtml(
    session: CajaSessionDetalle,
    providerSales: CajaConsignacionProveedorVentas,
  ): string {
    const closedAt = session.cerrada_en ?? new Date().toISOString();

    return `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.45;">
        <h1 style="margin: 0 0 8px; font-size: 24px;">Ventas en consignación</h1>
        <p style="margin: 0 0 8px; color: #6b7280;">
          Cierre de caja #${session.id} · ${escapeHtml(this.formatDate(closedAt))}
        </p>
        <p style="margin: 0 0 20px; color: #6b7280;">
          Proveedor: <strong>${escapeHtml(providerSales.proveedor_nombre)}</strong>
        </p>

        <table style="border-collapse: collapse; width: 100%; max-width: 760px; margin-bottom: 18px;">
          <thead>
            <tr>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Producto</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Cantidad</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Precio venta</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Subtotal</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${providerSales.items
              .map(
                (item) => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">
                      ${escapeHtml(item.producto_nombre)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">
                      ${this.formatQuantity(item.cantidad, item.producto_unidad_venta)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">
                      ${this.formatMoney(item.precio_unitario)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">
                      ${this.formatMoney(item.subtotal)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                      ${this.formatMoney(item.total_final)}
                    </td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                Total correspondiente
              </td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${this.formatMoney(providerSales.total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p style="margin: 0; color: #6b7280; font-size: 13px;">
          Este correo incluye solamente productos en consignación asociados a este proveedor.
        </p>
      </div>
    `;
  }

  private formatMoney(value: number): string {
    return moneyFormatter.format(value);
  }

  private formatDate(value: string): string {
    return dateFormatter.format(new Date(value));
  }

  private formatQuantity(value: number, unit: 'UNIDAD' | 'PESO'): string {
    const formatted = new Intl.NumberFormat('es-CL', {
      maximumFractionDigits: unit === 'PESO' ? 3 : 0,
    }).format(value);

    return unit === 'PESO' ? `${formatted} kg` : `${formatted} un.`;
  }
}
