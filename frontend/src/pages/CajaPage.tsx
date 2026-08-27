import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  TruckIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  abrirCaja,
  cerrarCaja,
  crearMovimientoCaja,
  editarMovimientoCaja,
  eliminarMovimientoCaja,
  forzarCerrarCaja,
  getCajaActual,
  getCajaSesiones,
} from "../services/cajaService";
import type { CajaMovimiento, CajaSession, CategoriaMovimientoCaja, TipoMovimientoCaja } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";
import AdminPasswordModal from "../components/AdminPasswordModal";
import FlowActionButton from "../components/FlowActionButton";
import TouchSelectField from "../components/TouchSelectField";
import { getStoredUser } from "../services/authService";

const money = (value: number) => `$${value.toLocaleString()}`;
const time = (value: string | null) =>
  value
    ? new Date(value).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const sessionDuration = (openedAt: string, closedAt: string | null) => {
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${minutes} min`;
};

const movimientoCategorias: Array<{ value: CategoriaMovimientoCaja; label: string }> = [
  { value: "PAGO_PROVEEDOR", label: "Pago proveedor" },
  { value: "COMPRA_MENOR", label: "Compra menor" },
  { value: "RETIRO_PROPIETARIO", label: "Retiro propietario" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "REPOSICION", label: "Reposición" },
  { value: "OTRO", label: "Otro" },
];

const categoriaLabel = (value: CategoriaMovimientoCaja) =>
  movimientoCategorias.find((category) => category.value === value)?.label ?? value;

type CajaToastTone = "success" | "warning" | "error";

interface CajaToast {
  readonly title: string;
  readonly description: string;
  readonly tone: CajaToastTone;
}

const buildCloseToast = (session: CajaSession): CajaToast => {
  const mail = session.notificacion_correos;

  if (!mail) {
    return {
      title: "Caja cerrada correctamente",
      description: "El cierre quedó guardado. No se recibió el estado del envío de correos.",
      tone: "warning",
    };
  }

  if (mail.sistema_enviado && mail.proveedores_fallidos === 0 && mail.proveedores_omitidos === 0) {
    const providerText = mail.proveedores_enviados === 0
      ? "No había proveedores con ventas en consignación por notificar."
      : `Se enviaron ${mail.proveedores_enviados} correo${mail.proveedores_enviados === 1 ? "" : "s"} a proveedor${mail.proveedores_enviados === 1 ? "" : "es"}.`;

    return {
      title: "Caja cerrada y correos enviados",
      description: `El cierre quedó guardado y el correo del sistema fue enviado. ${providerText}`,
      tone: "success",
    };
  }

  return {
    title: "Caja cerrada correctamente",
    description: `El cierre quedó guardado. Correos: sistema ${mail.sistema_enviado ? "enviado" : "no enviado"}, proveedores enviados ${mail.proveedores_enviados}, omitidos ${mail.proveedores_omitidos}, fallidos ${mail.proveedores_fallidos}.`,
    tone: mail.proveedores_fallidos > 0 || !mail.sistema_enviado ? "warning" : "success",
  };
};

export default function CajaPage() {
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();
  const isOwner = currentUser?.rol === "OWNER";
  const [monto, setMonto] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<CajaToast | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closeFinalConfirmOpen, setCloseFinalConfirmOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [cashMatches, setCashMatches] = useState(false);
  const [debitMatches, setDebitMatches] = useState(false);
  const [debitReal, setDebitReal] = useState("");
  const [consignationSeparated, setConsignationSeparated] = useState(false);
  const [movementPasswordOpen, setMovementPasswordOpen] = useState(false);
  const [movementToEdit, setMovementToEdit] = useState<CajaMovimiento | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<CajaMovimiento | null>(null);
  const [editMovementPasswordOpen, setEditMovementPasswordOpen] = useState(false);
  const [forceCloseAmount, setForceCloseAmount] = useState("");
  const [forceClosePasswordOpen, setForceClosePasswordOpen] = useState(false);
  const [editMovimientoForm, setEditMovimientoForm] = useState({
    tipo: "EGRESO" as TipoMovimientoCaja,
    categoria: "PAGO_PROVEEDOR" as CategoriaMovimientoCaja,
    monto: "",
    descripcion: "",
  });
  const [movimientoForm, setMovimientoForm] = useState({
    tipo: "EGRESO" as TipoMovimientoCaja,
    categoria: "PAGO_PROVEEDOR" as CategoriaMovimientoCaja,
    monto: "",
    descripcion: "",
  });

  const { data: actual, isLoading, error: cajaActualError } = useQuery({ queryKey: ["caja-actual"], queryFn: getCajaActual });
  const { data: sesiones } = useQuery({
    queryKey: ["caja-sesiones", currentUser?.id, currentUser?.rol],
    queryFn: () => getCajaSesiones(),
  });

  const invalidateCaja = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["caja-actual"] }),
      queryClient.invalidateQueries({ queryKey: ["caja-sesiones"] }),
    ]);
  };

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const abrir = useMutation({
    mutationFn: () => abrirCaja(monto === "" ? 0 : Number(monto)),
    onSuccess: async () => {
      setMessage("Caja abierta correctamente.");
      setMonto("");
      await invalidateCaja();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo abrir caja"),
  });

  const cerrar = useMutation({
    mutationFn: (efectivoContadoFinal: number) => cerrarCaja(efectivoContadoFinal),
    onSuccess: async (session) => {
      setMessage("");
      setToast(buildCloseToast(session));
      await invalidateCaja();
      await queryClient.refetchQueries({ queryKey: ["caja-sesiones"] });
      setCloseConfirmOpen(false);
      setCloseFinalConfirmOpen(false);
      setEfectivoContado("");
      setDebitMatches(false);
      setDebitReal("");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo cerrar caja"),
  });

  const crearMovimiento = useMutation({
    mutationFn: (masterPassword?: string) =>
      crearMovimientoCaja({
        tipo: movimientoForm.tipo,
        categoria: movimientoForm.categoria,
        monto: Number(movimientoForm.monto),
        descripcion: movimientoForm.descripcion || null,
        ...(masterPassword ? { master_password: masterPassword } : {}),
      }),
    onSuccess: async () => {
      setMessage("Movimiento registrado.");
      setMovementPasswordOpen(false);
      setMovementModalOpen(false);
      setMovimientoForm((prev) => ({ ...prev, monto: "", descripcion: "" }));
      await invalidateCaja();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo registrar el movimiento"),
  });

  const editarMovimiento = useMutation({
    mutationFn: ({ id, masterPassword }: { id: number; masterPassword: string }) =>
      editarMovimientoCaja(id, {
        tipo: editMovimientoForm.tipo,
        categoria: editMovimientoForm.categoria,
        monto: Number(editMovimientoForm.monto),
        descripcion: editMovimientoForm.descripcion || null,
        master_password: masterPassword,
      }),
    onSuccess: async () => {
      setMessage("Movimiento actualizado.");
      setMovementToEdit(null);
      setEditMovementPasswordOpen(false);
      await invalidateCaja();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo editar el movimiento"),
  });

  const eliminarMovimiento = useMutation({
    mutationFn: ({ id, masterPassword }: { id: number; masterPassword: string }) =>
      eliminarMovimientoCaja(id, masterPassword),
    onSuccess: async () => {
      setMessage("Movimiento eliminado.");
      setMovementToDelete(null);
      await invalidateCaja();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo eliminar el movimiento"),
  });

  const forceClose = useMutation({
    mutationFn: (masterPassword: string) => forzarCerrarCaja(Number(forceCloseAmount || 0), masterPassword),
    onSuccess: async (session) => {
      setMessage("");
      setToast({
        ...buildCloseToast(session),
        title: "Caja cerrada forzadamente",
      });
      setForceCloseAmount("");
      setForceClosePasswordOpen(false);
      await invalidateCaja();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo forzar el cierre de caja"),
  });

  const diferenciaCierre =
    actual && efectivoContado !== ""
      ? Number(efectivoContado) - actual.resumen.monto_esperado_cierre
      : 0;
  const hasCashSales = Boolean(actual && actual.resumen.efectivo > 0);
  const hasDebitSales = Boolean(actual && actual.resumen.tarjeta > 0);
  const hasConsignationSales = Boolean(actual && actual.resumen.ventas_consignacion > 0);
  const canCloseCaja =
    Boolean(actual) &&
    (!hasCashSales || cashMatches || efectivoContado !== "") &&
    (!hasDebitSales || debitMatches || debitReal !== "") &&
    (!hasConsignationSales || consignationSeparated);
  const cajaActualErrorMessage = cajaActualError instanceof Error
    ? cajaActualError.message
    : "No se pudo revisar el estado de la caja.";

  const handleOpenCloseModal = () => {
    if (!actual) return;
    setEfectivoContado("");
    setCashMatches(false);
    setDebitMatches(false);
    setDebitReal("");
    setConsignationSeparated(false);
    setCloseConfirmOpen(true);
  };

  const handleDismissCloseModal = () => {
    setCloseConfirmOpen(false);
    setCloseFinalConfirmOpen(false);
    setEfectivoContado("");
    setCashMatches(false);
    setDebitMatches(false);
    setDebitReal("");
    setConsignationSeparated(false);
  };

  const handleRequestCloseConfirmation = () => {
    if (!actual) return;

    if (!canCloseCaja) {
      setMessage("Completa la revisión de efectivo, débito y consignación antes de cerrar la caja.");
      return;
    }

    setCloseFinalConfirmOpen(true);
  };

  const handleCloseWithChecklist = () => {
    if (!actual) return;

    cerrar.mutate(hasCashSales && !cashMatches ? Number(efectivoContado) : actual.resumen.monto_esperado_cierre);
  };

  const openEditMovementModal = (movimiento: CajaMovimiento) => {
    setMovementToEdit(movimiento);
    setEditMovimientoForm({
      tipo: movimiento.tipo,
      categoria: movimiento.categoria,
      monto: String(movimiento.monto),
      descripcion: movimiento.descripcion ?? "",
    });
    setMessage("");
  };

  const handleConfirmEditMovement = (masterPassword: string) => {
    if (!movementToEdit) return;

    if (Number(editMovimientoForm.monto) <= 0) {
      setMessage("Ingresa un monto mayor a 0.");
      return;
    }

    editarMovimiento.mutate({ id: movementToEdit.id, masterPassword });
  };

  const handleRegisterMovement = () => {
    if (isOwner) {
      setMovementPasswordOpen(true);
      return;
    }

    crearMovimiento.mutate(undefined);
  };

  if (isLoading) return <p>Cargando caja...</p>;

  return (
    <div className="admin-page space-y-6">
      {toast && (
        <div className={`cash-close-toast ${toast.tone}`} role="status" aria-live="polite">
          <CheckCircleIcon className="h-7 w-7" />
          <div>
            <h2>{toast.title}</h2>
            <p>{toast.description}</p>
          </div>
        </div>
      )}
      <h1 className="admin-page-title">Caja</h1>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <ModuleCard contentClassName="p-5">
            <div className="space-y-4">
              {cajaActualError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  <p>{cajaActualErrorMessage}</p>
                  {isOwner && (
                    <div className="mt-4 grid gap-3">
                      <FormField label="Efectivo contado para cierre">
                        <input
                          type="number"
                          min={0}
                          value={forceCloseAmount}
                          onChange={(event) => setForceCloseAmount(event.target.value)}
                          className={inputClassName}
                          placeholder="Monto real en caja"
                        />
                      </FormField>
                      <Button
                        onClick={() => setForceClosePasswordOpen(true)}
                        disabled={forceClose.isPending || forceCloseAmount === ""}
                        fullWidth
                      >
                        {forceClose.isPending ? "Cerrando..." : "Forzar cierre de caja"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!actual?.abierta && !cajaActualError && (
                <div className="grid gap-3">
                  <FormField label="Monto apertura">
                    <input
                      type="number"
                      min={0}
                      value={monto}
                      onChange={(event) => setMonto(event.target.value)}
                      className={inputClassName}
                      placeholder="Fondo inicial"
                    />
                  </FormField>
                  <FlowActionButton
                    onClick={() => abrir.mutate()}
                    size="cash"
                    disabled={abrir.isPending}
                  >
                    {abrir.isPending ? "Abriendo..." : "Abrir caja"}
                  </FlowActionButton>
                </div>
              )}
              {actual?.abierta && (
                <div className="grid gap-3">
                  <button
                    onClick={handleOpenCloseModal}
                    className="w-full rounded-xl bg-red-600 p-6 text-center text-lg font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg"
                  >
                    Cerrar caja
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementModalOpen(true)}
                    className="cash-movement-open-button"
                  >
                    <ArrowUpTrayIcon className="h-6 w-6" />
                    Registrar movimiento
                  </button>
                </div>
              )}
            </div>
            {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
          </ModuleCard>
        </div>

        <div className="space-y-6">
          {actual?.abierta && (
            <ListPanel
              title="Movimientos registrados"
              icon={WalletIcon}
              emptyMessage="Sin movimientos registrados."
              items={actual.movimientos.map((movimiento) => ({
                id: movimiento.id,
                icon: movimiento.tipo === "INGRESO" ? ArrowDownTrayIcon : ArrowUpTrayIcon,
                title: movimiento.tipo === "INGRESO" ? "Ingreso" : "Egreso",
                description: movimiento.descripcion ?? "Sin descripción",
                meta: [
                  new Date(movimiento.creado_en).toLocaleString(),
                  movimiento.usuario_nombre,
                  categoriaLabel(movimiento.categoria),
                ],
                amount: `${movimiento.tipo === "INGRESO" ? "+" : "-"}${money(movimiento.monto)}`,
                amountClassName: movimiento.tipo === "INGRESO" ? "text-green-700" : "text-red-700",
                action: isOwner ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditMovementModal(movimiento)}
                      className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#7652ed] hover:bg-[#faf9ff]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMovementToDelete(movimiento);
                        setMessage("");
                      }}
                      className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : undefined,
              }))}
            />
          )}

          <ListPanel
            title={isOwner ? "Sesiones recientes" : "Mis sesiones recientes"}
            icon={ClockIcon}
            emptyMessage="Sin sesiones registradas."
            items={(sesiones?.items ?? []).map((session) => ({
              id: session.id,
              icon: WalletIcon,
              title: `Caja #${session.id}`,
              description: session.usuario_nombre,
              meta: [
                `Inicio ${time(session.abierta_en)}`,
                session.cerrada_en ? `Cierre ${time(session.cerrada_en)}` : "Cierre en curso",
                `Duración ${sessionDuration(session.abierta_en, session.cerrada_en)}`,
                `Apertura ${money(session.monto_apertura)}`,
                `Esperado ${money(session.monto_esperado ?? session.resumen.monto_esperado_cierre)}`,
                `Contado ${session.monto_cierre === null ? "-" : money(session.monto_cierre)}`,
                session.abierta ? "Abierta" : "Cerrada",
              ],
              amount: session.diferencia_cierre === null ? "-" : money(session.diferencia_cierre),
              amountClassName: (session.diferencia_cierre ?? 0) < 0 ? "text-red-700" : "text-green-700",
            }))}
          />
        </div>
      </div>

      {movementModalOpen && actual?.abierta && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMovementModalOpen(false);
            }
          }}
        >
          <div className="flow-modal cash-movement-modal" role="dialog" aria-modal="true">
            <div className="cash-movement-modal-head">
              <div>
                <p>Movimiento de caja</p>
                <h2>Registrar movimiento</h2>
              </div>
              <button
                type="button"
                onClick={() => setMovementModalOpen(false)}
                className="cash-close-x"
                aria-label="Cerrar modal"
                title="Cerrar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="cash-movement-form">
              <TouchSelectField
                label="Tipo"
                value={movimientoForm.tipo}
                options={[
                  { value: "INGRESO", label: "Ingreso" },
                  { value: "EGRESO", label: "Egreso" },
                ]}
                onChange={(value) => setMovimientoForm((prev) => ({ ...prev, tipo: value as TipoMovimientoCaja }))}
              />
              <TouchSelectField
                label="Categoría"
                value={movimientoForm.categoria}
                options={movimientoCategorias}
                onChange={(value) => setMovimientoForm((prev) => ({ ...prev, categoria: value as CategoriaMovimientoCaja }))}
              />
              <FormField label="Monto">
                <input
                  type="number"
                  min={1}
                  value={movimientoForm.monto}
                  onChange={(event) => setMovimientoForm((prev) => ({ ...prev, monto: event.target.value }))}
                  className={`${inputClassName} text-lg`}
                  placeholder="Monto"
                />
              </FormField>
              <FormField label="Descripción">
                <input
                  value={movimientoForm.descripcion}
                  onChange={(event) => setMovimientoForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                  className={`${inputClassName} text-lg`}
                  placeholder="Descripción"
                />
              </FormField>
              <Button
                onClick={handleRegisterMovement}
                disabled={crearMovimiento.isPending || movimientoForm.monto === ""}
                className="min-h-[56px] text-base"
                fullWidth
              >
                Registrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {closeConfirmOpen && actual && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleDismissCloseModal();
            }
          }}
        >
          <div className="cash-close-modal">
            <div className="cash-close-head">
              <div>
                <p>Cierre de caja</p>
                <h2>Caja #{actual.id}</h2>
              </div>
              <div className="cash-close-head-actions">
                <span className="cash-close-status">
                  <ClockIcon className="h-5 w-5" />
                  {sessionDuration(actual.abierta_en, null)}
                </span>
                <button
                  type="button"
                  onClick={handleRequestCloseConfirmation}
                  disabled={cerrar.isPending || !canCloseCaja}
                  className="cash-close-submit"
                >
                  {cerrar.isPending ? "Cerrando..." : "Cerrar caja"}
                </button>
                <button
                  type="button"
                  onClick={handleDismissCloseModal}
                  className="cash-close-x"
                  aria-label="Cerrar modal"
                  title="Cerrar"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="cash-close-grid">
              <section className="cash-close-card highlight">
                <div className="cash-close-card-title">
                  <BanknotesIcon className="h-6 w-6" />
                  <span>Pagos esperados</span>
                </div>
                <strong>{money(actual.resumen.monto_esperado_cierre)}</strong>
                <div className="cash-close-lines">
                  <span><b>Fondo inicial</b>{money(actual.monto_apertura)}</span>
                  <span><b>Ventas efectivo</b>{money(actual.resumen.efectivo)}</span>
                  <span><b>Ingresos</b>{money(actual.resumen.ingresos)}</span>
                  <span><b>Egresos</b>-{money(actual.resumen.egresos)}</span>
                </div>
                <div className="cash-close-card-subtitle">
                  <CreditCardIcon className="h-5 w-5" />
                  <span>Pagos electrónicos</span>
                </div>
                <div className="cash-close-split compact">
                  <span>
                    <small>Débito / tarjeta</small>
                    {money(actual.resumen.tarjeta)}
                  </span>
                  <span>
                    <small>Transferencia</small>
                    {money(actual.resumen.transferencia)}
                  </span>
                  <span>
                    <small>Mixto</small>
                    {money(actual.resumen.mixto)}
                  </span>
                </div>
              </section>

              <section className="cash-close-card">
                <div className="cash-close-card-title">
                  <TruckIcon className="h-6 w-6" />
                  <span>Ventas por tipo</span>
                </div>
                <div className="cash-close-split">
                  <span>
                    <small>Propias</small>
                    {money(actual.resumen.ventas_propias)}
                  </span>
                  <span>
                    <small>Consignación</small>
                    {money(actual.resumen.ventas_consignacion)}
                  </span>
                  <span>
                    <small>Total ventas</small>
                    {money(actual.resumen.total_ventas)}
                  </span>
                </div>
                <div className="cash-close-provider-list">
                  {actual.resumen.consignacion_proveedores.length > 0 ? (
                    actual.resumen.consignacion_proveedores.map((provider) => (
                      <div key={provider.proveedor_id ?? provider.proveedor_nombre}>
                        <span>{provider.proveedor_nombre}</span>
                        <strong>{money(provider.total)}</strong>
                      </div>
                    ))
                  ) : (
                    <p>Sin ventas de consignación en esta caja.</p>
                  )}
                </div>
              </section>

              <section className="cash-close-card checklist">
                <div className="cash-close-card-title">
                  <CheckCircleIcon className="h-6 w-6" />
                  <span>Checklist</span>
                </div>

                <div className="cash-close-audit">
                  <label className={`cash-close-check ${hasCashSales ? "" : "disabled"}`}>
                    <input
                      type="checkbox"
                      checked={hasCashSales ? cashMatches : false}
                      disabled={!hasCashSales}
                      onChange={(event) => {
                        setCashMatches(event.target.checked);
                        if (event.target.checked) setEfectivoContado("");
                      }}
                    />
                    <span>
                      El efectivo calza con el monto esperado
                      {!hasCashSales && <small>Sin ventas en efectivo</small>}
                    </span>
                  </label>
                  {hasCashSales && !cashMatches && (
                    <div className="cash-close-count">
                      <FormField label="Efectivo real contado">
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          value={efectivoContado}
                          onChange={(event) => setEfectivoContado(event.target.value)}
                          className={`${inputClassName} text-lg`}
                        />
                      </FormField>
                      <div className={`cash-close-difference ${diferenciaCierre < 0 ? "negative" : ""}`}>
                        <span>Diferencia</span>
                        <strong>{money(diferenciaCierre)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="cash-close-audit">
                  <label className={`cash-close-check ${hasDebitSales ? "" : "disabled"}`}>
                    <input
                      type="checkbox"
                      checked={hasDebitSales ? debitMatches : false}
                      disabled={!hasDebitSales}
                      onChange={(event) => {
                        setDebitMatches(event.target.checked);
                        if (event.target.checked) setDebitReal("");
                      }}
                    />
                    <span>
                      Las ventas con débito/tarjeta fueron registradas
                      {!hasDebitSales && <small>Sin ventas con tarjeta</small>}
                    </span>
                  </label>
                  {hasDebitSales && !debitMatches && (
                    <div className="cash-close-count">
                      <FormField label="Total real en débito/tarjeta">
                        <input
                          type="number"
                          min={0}
                          value={debitReal}
                          onChange={(event) => setDebitReal(event.target.value)}
                          className={`${inputClassName} text-lg`}
                        />
                      </FormField>
                      <div className={`cash-close-difference ${Number(debitReal || 0) - actual.resumen.tarjeta < 0 ? "negative" : ""}`}>
                        <span>Diferencia</span>
                        <strong>{money(Number(debitReal || 0) - actual.resumen.tarjeta)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="cash-close-audit">
                  <label className={`cash-close-check ${hasConsignationSales ? "" : "disabled"}`}>
                    <input
                      type="checkbox"
                      checked={hasConsignationSales ? consignationSeparated : false}
                      disabled={!hasConsignationSales}
                      onChange={(event) => setConsignationSeparated(event.target.checked)}
                    />
                    <span>
                      Se separó la plata que entró por consignación
                      {!hasConsignationSales && <small>Sin ventas de consignación</small>}
                    </span>
                  </label>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {closeFinalConfirmOpen && actual && (
        <div
          className="flow-modal-backdrop cash-final-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCloseFinalConfirmOpen(false);
            }
          }}
        >
          <div className="flow-modal cash-final-confirm" role="dialog" aria-modal="true">
            <div className="cash-final-confirm-head">
              <span className="cash-final-confirm-icon">
                <CheckCircleIcon className="h-7 w-7" />
              </span>
              <div>
                <p>Confirmar cierre</p>
                <h2>¿Cerrar caja #{actual.id}?</h2>
              </div>
            </div>

            <div className="cash-final-confirm-summary">
              <span>
                <small>Efectivo a registrar</small>
                {money(hasCashSales && !cashMatches ? Number(efectivoContado) : actual.resumen.monto_esperado_cierre)}
              </span>
              <span>
                <small>Diferencia efectivo</small>
                {money(hasCashSales && !cashMatches ? diferenciaCierre : 0)}
              </span>
            </div>

            <p className="cash-final-confirm-copy">
              Esta acción cerrará la caja actual y ya no podrás registrar nuevas ventas en esta sesión.
            </p>

            <div className="cash-final-confirm-actions">
              <button
                type="button"
                className="cash-final-cancel"
                onClick={() => setCloseFinalConfirmOpen(false)}
                disabled={cerrar.isPending}
              >
                Volver
              </button>
              <button
                type="button"
                className="cash-final-submit"
                onClick={handleCloseWithChecklist}
                disabled={cerrar.isPending}
              >
                {cerrar.isPending ? "Cerrando..." : "Sí, cerrar caja"}
              </button>
            </div>
          </div>
        </div>
      )}

      {movementPasswordOpen && (
        <AdminPasswordModal
          title="Registrar movimiento"
          description="Ingresa la contraseña de administrador para guardar este movimiento."
          isPending={crearMovimiento.isPending}
          onClose={() => setMovementPasswordOpen(false)}
          onConfirm={(password) => crearMovimiento.mutate(password)}
        />
      )}

      {forceClosePasswordOpen && (
        <AdminPasswordModal
          title="Forzar cierre de caja"
          description="Ingresa la contraseña de administrador para cerrar la caja abierta en este equipo."
          isPending={forceClose.isPending}
          onClose={() => setForceClosePasswordOpen(false)}
          onConfirm={(password) => forceClose.mutate(password)}
        />
      )}

      {movementToEdit && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMovementToEdit(null);
          }}
        >
          <div className="flow-modal cash-movement-modal" role="dialog" aria-modal="true">
            <div className="cash-movement-modal-head">
              <div>
                <p>Movimiento de caja</p>
                <h2>Editar movimiento</h2>
              </div>
              <button
                type="button"
                onClick={() => setMovementToEdit(null)}
                className="cash-close-x"
                aria-label="Cerrar modal"
                title="Cerrar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="cash-movement-form">
              <TouchSelectField
                label="Tipo"
                value={editMovimientoForm.tipo}
                options={[
                  { value: "INGRESO", label: "Ingreso" },
                  { value: "EGRESO", label: "Egreso" },
                ]}
                onChange={(value) => setEditMovimientoForm((prev) => ({ ...prev, tipo: value as TipoMovimientoCaja }))}
              />
              <TouchSelectField
                label="Categoría"
                value={editMovimientoForm.categoria}
                options={movimientoCategorias}
                onChange={(value) => setEditMovimientoForm((prev) => ({ ...prev, categoria: value as CategoriaMovimientoCaja }))}
              />
              <FormField label="Monto">
                <input
                  type="number"
                  min={1}
                  value={editMovimientoForm.monto}
                  onChange={(event) => setEditMovimientoForm((prev) => ({ ...prev, monto: event.target.value }))}
                  className={`${inputClassName} text-lg`}
                  placeholder="Monto"
                />
              </FormField>
              <FormField label="Descripción">
                <input
                  value={editMovimientoForm.descripcion}
                  onChange={(event) => setEditMovimientoForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                  className={`${inputClassName} text-lg`}
                  placeholder="Descripción"
                />
              </FormField>
              <Button
                onClick={() => setEditMovementPasswordOpen(true)}
                disabled={editarMovimiento.isPending || editMovimientoForm.monto === ""}
                className="min-h-[56px] text-base"
                fullWidth
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {editMovementPasswordOpen && movementToEdit && (
        <AdminPasswordModal
          title={`Editar movimiento #${movementToEdit.id}`}
          description="Confirma los cambios con la contraseña de administrador."
          isPending={editarMovimiento.isPending}
          onClose={() => {
            setEditMovementPasswordOpen(false);
          }}
          onConfirm={handleConfirmEditMovement}
        />
      )}

      {movementToDelete && (
        <AdminPasswordModal
          title={`Eliminar movimiento #${movementToDelete.id}`}
          description="Confirma con la contraseña de administrador. El movimiento se quitará de la caja."
          isPending={eliminarMovimiento.isPending}
          onClose={() => setMovementToDelete(null)}
          onConfirm={(password) => eliminarMovimiento.mutate({ id: movementToDelete.id, masterPassword: password })}
        />
      )}

    </div>
  );
}
