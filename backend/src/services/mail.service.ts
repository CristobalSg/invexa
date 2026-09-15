import type { FastifyBaseLogger } from 'fastify';
import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import type {
  CajaCierreVenta,
  CajaConsignacionProveedorVentas,
  CajaSessionDetalle,
  CategoriaMovimientoCaja,
} from '../modules/caja/caja.types.js';

interface MailConfig {
  readonly user: string | undefined;
  readonly appPassword: string | undefined;
  readonly to: string | undefined;
}

interface SendHtmlMailInput {
  readonly subject: string;
  readonly html: string;
  readonly to?: string;
  readonly attachments?: ReadonlyArray<MailAttachment>;
}

interface MailAttachment {
  readonly filename: string;
  readonly content: string;
  readonly contentType: string;
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

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export class MailService {
  private readonly config: MailConfig;
  private transporter?: MailTransporter;

  constructor(
    private readonly logger: FastifyBaseLogger,
    config: Partial<MailConfig> = {},
  ) {
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
      ...(input.attachments ? { attachments: input.attachments } : {}),
    });

    return true;
  }

  async sendCashCloseEmail(
    session: CajaSessionDetalle,
    ventas: CajaCierreVenta[] = [],
    includeTransactions = false,
  ): Promise<boolean> {
    return this.sendHtml({
      subject: `${includeTransactions ? 'Detalle completo - ' : ''}Cierre de caja #${session.id} - ${this.formatDate(session.cerrada_en ?? new Date().toISOString())}`,
      html: this.buildCashCloseHtml(session, ventas, includeTransactions),
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
      attachments: this.buildConsignmentProviderAttachments(session, providerSales),
    });
  }

  async sendConsignmentProviderCsvEmail(
    to: string,
    session: CajaSessionDetalle,
    providerSales: CajaConsignacionProveedorVentas,
  ): Promise<boolean> {
    const closedAt = session.cerrada_en ?? new Date().toISOString();

    return this.sendHtml({
      to,
      subject: `Archivos CSV de consignación - Cierre de caja #${session.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.45;">
          <h1 style="margin: 0 0 8px; font-size: 24px;">Archivos CSV de consignación</h1>
          <p style="margin: 0 0 8px; color: #6b7280;">
            Cierre de caja #${session.id} · ${escapeHtml(this.formatDate(closedAt))}
          </p>
          <p style="margin: 0 0 18px; color: #6b7280;">
            Proveedor: <strong>${escapeHtml(providerSales.proveedor_nombre)}</strong>
          </p>
          <p style="margin: 0;">
            Se adjuntan los CSV con las cantidades vendidas y el stock activo actual por código de barras.
          </p>
        </div>
      `,
      attachments: this.buildConsignmentProviderAttachments(session, providerSales),
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

  private buildCashCloseHtml(
    session: CajaSessionDetalle,
    ventas: CajaCierreVenta[],
    includeTransactions: boolean,
  ): string {
    const closedAt = session.cerrada_en ?? new Date().toISOString();
    const diferencia = session.diferencia_cierre ?? 0;
    const cierreCuadra = Math.abs(diferencia) < 0.01;
    const movimientos = session.movimientos ?? [];
    const ventasCompletadas = ventas.filter((venta) => venta.estado === 'COMPLETADA');
    const ventasAnuladas = ventas.filter((venta) => venta.estado === 'ANULADA');
    const totalRedondeo = ventasCompletadas.reduce((total, venta) => total + venta.redondeo, 0);
    const mixedSales = ventasCompletadas.filter((venta) => venta.metodo_pago === 'MIXTO');

    return `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.45;">
        <h1 style="margin: 0 0 8px; font-size: 24px;">Cierre de caja #${session.id}</h1>
        <p style="margin: 0 0 20px; color: #6b7280;">
          ${escapeHtml(this.formatDate(closedAt))} · ${escapeHtml(session.usuario_nombre)}
        </p>

        <div style="max-width: 760px; box-sizing: border-box; margin: 0 0 20px; padding: 14px 16px; border: 1px solid ${cierreCuadra ? '#86efac' : '#fca5a5'}; border-radius: 8px; background: ${cierreCuadra ? '#f0fdf4' : '#fef2f2'};">
          <strong style="color: ${cierreCuadra ? '#166534' : '#991b1b'};">
            ${cierreCuadra ? 'Cierre cuadrado' : diferencia < 0 ? 'Faltante de efectivo' : 'Sobrante de efectivo'}:
            ${this.formatMoney(Math.abs(diferencia))}
          </strong>
          <div style="margin-top: 4px; color: #4b5563; font-size: 13px;">
            Diferencia = efectivo contado menos efectivo esperado.
          </div>
        </div>

        <h2 style="margin: 0 0 10px; font-size: 18px;">Cuadratura de efectivo</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 760px; margin-bottom: 22px;">
          <tbody>
            <tr>
              <td style="padding: 9px; border: 1px solid #e5e7eb;">Fondo inicial</td>
              <td style="padding: 9px; border: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(session.monto_apertura)}</td>
            </tr>
            <tr>
              <td style="padding: 9px; border: 1px solid #e5e7eb;">+ Ventas cobradas en efectivo</td>
              <td style="padding: 9px; border: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(session.resumen.efectivo)}</td>
            </tr>
            <tr>
              <td style="padding: 9px; border: 1px solid #e5e7eb;">+ Otros ingresos de caja</td>
              <td style="padding: 9px; border: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(session.resumen.ingresos)}</td>
            </tr>
            <tr>
              <td style="padding: 9px; border: 1px solid #e5e7eb;">− Egresos de caja</td>
              <td style="padding: 9px; border: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(session.resumen.egresos)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700;">= Efectivo esperado</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${this.formatMoney(session.monto_esperado ?? session.resumen.monto_esperado_cierre)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700;">Efectivo contado</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${this.formatMoney(session.monto_cierre ?? 0)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700; color: ${cierreCuadra ? '#166534' : '#991b1b'};">Diferencia</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: ${cierreCuadra ? '#166534' : '#991b1b'};">${this.formatSignedMoney(diferencia)}</td>
            </tr>
          </tbody>
        </table>

        <h2 style="margin: 0 0 10px; font-size: 18px;">Resumen de ventas</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 760px; margin-bottom: 22px;">
          <tbody>
            ${this.summaryRow('Ventas completadas', String(session.resumen.cantidad_ventas))}
            ${this.summaryRow('Subtotal antes de descuentos', this.formatMoney(session.resumen.subtotal))}
            ${this.summaryRow('Descuentos', this.formatMoney(session.resumen.descuento))}
            ${this.summaryRow('Redondeo', this.formatSignedMoney(totalRedondeo))}
            ${this.summaryRow('Total vendido', this.formatMoney(session.resumen.total_ventas), true)}
            ${this.summaryRow('Productos propios', this.formatMoney(session.resumen.ventas_propias))}
            ${this.summaryRow('Productos en consignación', this.formatMoney(session.resumen.ventas_consignacion))}
            ${this.summaryRow('Ventas anuladas (no suman al cierre)', String(ventasAnuladas.length))}
          </tbody>
        </table>

        <h2 style="margin: 0 0 10px; font-size: 18px;">Dinero recibido por medio de pago</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 760px; margin-bottom: 8px;">
          <tbody>
            ${this.summaryRow('Efectivo', this.formatMoney(session.resumen.efectivo), true)}
            ${this.summaryRow('Tarjeta / débito', this.formatMoney(session.resumen.tarjeta), true)}
            ${this.summaryRow('Transferencia', this.formatMoney(session.resumen.transferencia), true)}
          </tbody>
        </table>
        <p style="max-width: 760px; margin: 0 0 22px; color: #6b7280; font-size: 13px;">
          ${mixedSales.length} venta(s) mixta(s) por ${this.formatMoney(session.resumen.mixto)}. Ese monto ya está repartido entre los medios de pago anteriores y no se suma nuevamente.
          ${session.resumen.cantidad_ventas_sin_desglose > 0 ? `<br><strong style="color: #991b1b;">Atención:</strong> ${session.resumen.cantidad_ventas_sin_desglose} venta(s) por ${this.formatMoney(session.resumen.monto_ventas_sin_desglose)} no tienen desglose histórico de pagos.` : ''}
        </p>

        <h2 style="margin: 0 0 10px; font-size: 18px;">Movimientos de caja</h2>
        ${this.buildMovementsTable(movimientos)}

        ${
          includeTransactions
            ? `
              <h2 style="margin: 22px 0 10px; font-size: 18px;">Detalle de transacciones</h2>
              <p style="max-width: 900px; margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                Se detalla cada venta para facilitar la revisión del cierre. No se incluye el catálogo ni el stock de productos propios.
              </p>
              ${this.buildSalesTable(ventas)}
            `
            : ''
        }
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
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Vendido</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Precio venta</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Descuento</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Total</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Stock restante</th>
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
                      ${this.formatMoney(item.descuento)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                      ${this.formatMoney(item.total_final)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                      ${this.formatQuantity(item.stock_actual, item.producto_unidad_venta)}
                    </td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                Total vendido
              </td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">
                ${this.formatMoney(providerSales.total)}
              </td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"></td>
            </tr>
          </tfoot>
        </table>

        <h2 style="margin: 0 0 10px; font-size: 18px;">Stock actual de tus productos</h2>
        ${
          providerSales.inventario.length > 0
            ? `
          <table style="border-collapse: collapse; width: 100%; max-width: 760px; margin-bottom: 18px;">
            <thead>
              <tr>
                <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Producto</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Stock restante</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${providerSales.inventario
                .map(
                  (item) => `
                <tr${item.activo ? '' : ' style="color: #6b7280; background: #f9fafb;"'}>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(item.producto_nombre)}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${this.formatQuantity(item.stock_actual, item.producto_unidad_venta)}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.activo ? 'Activo' : 'Inactivo'}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `
            : '<p style="margin: 0 0 18px; color: #6b7280;">No hay productos asociados para mostrar.</p>'
        }

        <p style="margin: 0; color: #6b7280; font-size: 13px;">
          Este correo incluye solamente productos en consignación asociados a este proveedor. El stock mostrado es el disponible al momento de emitir este correo. Se adjuntan archivos CSV con las cantidades vendidas y el stock actual por código de barras.
        </p>
      </div>
    `;
  }

  private buildConsignmentProviderAttachments(
    session: CajaSessionDetalle,
    providerSales: CajaConsignacionProveedorVentas,
  ): MailAttachment[] {
    const soldByProduct = new Map<number, { barcode: string | null; quantity: number }>();

    for (const item of providerSales.items) {
      const current = soldByProduct.get(item.producto_id);
      soldByProduct.set(item.producto_id, {
        barcode: item.producto_codigo_barras,
        quantity: (current?.quantity ?? 0) + item.cantidad,
      });
    }

    const soldCsv = this.buildCsv(
      ['codigo_barra', 'cantidad_vendida'],
      Array.from(soldByProduct.values()).map((item) => [
        item.barcode ?? '',
        this.formatCsvNumber(item.quantity),
      ]),
    );
    const stockCsv = this.buildCsv(
      ['codigo_barra', 'cantidad_stock'],
      providerSales.inventario.map((item) => [
        item.producto_codigo_barras ?? '',
        this.formatCsvNumber(item.stock_actual),
      ]),
    );

    return [
      {
        filename: `ventas_cierre_${session.id}.csv`,
        content: soldCsv,
        contentType: 'text/csv; charset=utf-8',
      },
      {
        filename: `stock_cierre_${session.id}.csv`,
        content: stockCsv,
        contentType: 'text/csv; charset=utf-8',
      },
    ];
  }

  private buildCsv(headers: string[], rows: string[][]): string {
    const lines = [headers, ...rows].map((row) =>
      row.map((value) => this.escapeCsv(value)).join(','),
    );
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  }

  private escapeCsv(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }

  private formatCsvNumber(value: number): string {
    if (Number.isInteger(value)) {
      return String(value);
    }

    const factor = 1_000;
    return String(Math.round((value + Number.EPSILON) * factor) / factor);
  }

  private formatMoney(value: number): string {
    return moneyFormatter.format(value);
  }

  private formatSignedMoney(value: number): string {
    if (Math.abs(value) < 0.01) {
      return this.formatMoney(0);
    }

    return `${value > 0 ? '+' : '−'}${this.formatMoney(Math.abs(value))}`;
  }

  private formatDate(value: string): string {
    return dateFormatter.format(new Date(value));
  }

  private formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Santiago',
    }).format(new Date(value));
  }

  private formatQuantity(value: number, unit: 'UNIDAD' | 'PESO'): string {
    const formatted = new Intl.NumberFormat('es-CL', {
      maximumFractionDigits: unit === 'PESO' ? 3 : 0,
    }).format(value);

    return unit === 'PESO' ? `${formatted} kg` : `${formatted} un.`;
  }

  private summaryRow(label: string, value: string, strong = false): string {
    return `
      <tr>
        <td style="padding: 9px; border: 1px solid #e5e7eb;${strong ? ' font-weight: 700;' : ''}">${escapeHtml(label)}</td>
        <td style="padding: 9px; border: 1px solid #e5e7eb; text-align: right;${strong ? ' font-weight: 700;' : ''}">${escapeHtml(value)}</td>
      </tr>
    `;
  }

  private buildMovementsTable(movimientos: NonNullable<CajaSessionDetalle['movimientos']>): string {
    if (movimientos.length === 0) {
      return '<p style="max-width: 760px; margin: 0 0 20px; color: #6b7280;">No se registraron ingresos ni egresos adicionales.</p>';
    }

    return `
      <table style="border-collapse: collapse; width: 100%; max-width: 760px; margin-bottom: 20px;">
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Hora</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Tipo</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Categoría / detalle</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${movimientos
            .map(
              (movimiento) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(this.formatTime(movimiento.creado_en))}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${movimiento.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">
                ${escapeHtml(this.movementCategoryLabel(movimiento.categoria))}${movimiento.descripcion ? `<br><span style="color: #6b7280;">${escapeHtml(movimiento.descripcion)}</span>` : ''}
              </td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${movimiento.tipo === 'INGRESO' ? '+' : '−'}${this.formatMoney(movimiento.monto)}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  private buildSalesTable(ventas: CajaCierreVenta[]): string {
    if (ventas.length === 0) {
      return '<p style="margin: 0; color: #6b7280;">No hubo transacciones en esta caja.</p>';
    }

    return `
      <table style="border-collapse: collapse; width: 100%; max-width: 980px; font-size: 13px;">
        <thead>
          <tr>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: left;">Venta</th>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: left;">Hora / estado</th>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">Propio</th>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">Consig.</th>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">Desc.</th>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">Total</th>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: left;">Pagos registrados</th>
            <th style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">Recibido / vuelto</th>
          </tr>
        </thead>
        <tbody>
          ${ventas
            .map((venta) => {
              const anulada = venta.estado === 'ANULADA';
              return `
              <tr style="${anulada ? 'color: #6b7280; background: #f9fafb;' : ''}">
                <td style="padding: 7px; border: 1px solid #e5e7eb; font-weight: 700;">#${venta.id}</td>
                <td style="padding: 7px; border: 1px solid #e5e7eb;">
                  ${escapeHtml(this.formatTime(venta.creado_en))}<br>
                  <span style="color: ${anulada ? '#991b1b' : '#166534'};">${anulada ? 'Anulada' : this.saleModeLabel(venta.modalidad)}</span>
                </td>
                <td style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(venta.ventas_propias)}</td>
                <td style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(venta.ventas_consignacion)}</td>
                <td style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(venta.descuento)}</td>
                <td style="padding: 7px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${this.formatMoney(venta.total)}</td>
                <td style="padding: 7px; border: 1px solid #e5e7eb;">${this.paymentBreakdown(venta)}</td>
                <td style="padding: 7px; border: 1px solid #e5e7eb; text-align: right;">${venta.monto_recibido === null ? '—' : `${this.formatMoney(venta.monto_recibido)} / ${this.formatMoney(venta.vuelto ?? 0)}`}</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  private paymentBreakdown(venta: CajaCierreVenta): string {
    if (!venta.pagos_desglosados) {
      return `<strong style="color: #991b1b;">Sin desglose histórico</strong><br>${escapeHtml(this.paymentMethodLabel(venta.metodo_pago))}`;
    }

    const payments = [
      ['Efectivo', venta.efectivo],
      ['Tarjeta', venta.tarjeta],
      ['Transferencia', venta.transferencia],
    ].filter(([, amount]) => Number(amount) > 0);

    return payments.length > 0
      ? payments
          .map(([label, amount]) => `${label}: ${this.formatMoney(Number(amount))}`)
          .join('<br>')
      : 'Sin pagos registrados';
  }

  private paymentMethodLabel(value: CajaCierreVenta['metodo_pago']): string {
    const labels: Record<CajaCierreVenta['metodo_pago'], string> = {
      EFECTIVO: 'Efectivo',
      TARJETA: 'Tarjeta / débito',
      TRANSFERENCIA: 'Transferencia',
      MIXTO: 'Mixto',
    };
    return labels[value];
  }

  private saleModeLabel(value: CajaCierreVenta['modalidad']): string {
    const labels: Record<CajaCierreVenta['modalidad'], string> = {
      NORMAL: 'Completada',
      PRECIO_COSTO: 'Completada · precio costo',
      RETIRO_DUENO: 'Retiro de dueño',
    };
    return labels[value];
  }

  private movementCategoryLabel(value: CategoriaMovimientoCaja): string {
    const labels: Record<CategoriaMovimientoCaja, string> = {
      PAGO_PROVEEDOR: 'Pago a proveedor',
      COMPRA_MENOR: 'Compra menor',
      RETIRO_PROPIETARIO: 'Retiro de propietario',
      DEPOSITO: 'Depósito',
      REPOSICION: 'Reposición',
      OTRO: 'Otro',
    };
    return labels[value];
  }
}
