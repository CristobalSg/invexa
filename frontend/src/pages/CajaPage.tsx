import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import {
  abrirCaja,
  cerrarCaja,
  crearMovimientoCaja,
  getCajaActual,
  getCajaSesiones,
} from "../services/cajaService";
import type { CategoriaMovimientoCaja, TipoMovimientoCaja } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";
import AdminPasswordModal from "../components/AdminPasswordModal";
import FlowActionButton from "../components/FlowActionButton";

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

export default function CajaPage() {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState("");
  const [message, setMessage] = useState("");
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [showCashCountInput, setShowCashCountInput] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [cashMatches, setCashMatches] = useState(false);
  const [consignationSeparated, setConsignationSeparated] = useState(false);
  const [movementPasswordOpen, setMovementPasswordOpen] = useState(false);
  const [movimientoForm, setMovimientoForm] = useState({
    tipo: "EGRESO" as TipoMovimientoCaja,
    categoria: "PAGO_PROVEEDOR" as CategoriaMovimientoCaja,
    monto: "",
    descripcion: "",
  });

  const { data: actual, isLoading } = useQuery({ queryKey: ["caja-actual"], queryFn: getCajaActual });
  const { data: sesiones } = useQuery({ queryKey: ["caja-sesiones"], queryFn: () => getCajaSesiones() });

  const invalidateCaja = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["caja-actual"] }),
      queryClient.invalidateQueries({ queryKey: ["caja-sesiones"] }),
    ]);
  };

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
    onSuccess: async () => {
      setMessage("Caja cerrada correctamente.");
      await invalidateCaja();
      await queryClient.refetchQueries({ queryKey: ["caja-sesiones"] });
      setCloseConfirmOpen(false);
      setShowCashCountInput(false);
      setEfectivoContado("");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo cerrar caja"),
  });

  const crearMovimiento = useMutation({
    mutationFn: (masterPassword: string) =>
      crearMovimientoCaja({
        tipo: movimientoForm.tipo,
        categoria: movimientoForm.categoria,
        monto: Number(movimientoForm.monto),
        descripcion: movimientoForm.descripcion || null,
        master_password: masterPassword,
      }),
    onSuccess: async () => {
      setMessage("Movimiento registrado.");
      setMovementPasswordOpen(false);
      setMovimientoForm((prev) => ({ ...prev, monto: "", descripcion: "" }));
      await invalidateCaja();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo registrar el movimiento"),
  });

  const diferenciaCierre =
    actual && efectivoContado !== ""
      ? Number(efectivoContado) - actual.resumen.monto_esperado_cierre
      : 0;

  const handleOpenCloseModal = () => {
    if (!actual) return;
    setShowCashCountInput(false);
    setEfectivoContado("");
    setCashMatches(false);
    setConsignationSeparated(false);
    setCloseConfirmOpen(true);
  };

  const handleCloseWithExactCash = () => {
    if (!actual) return;
    setCashMatches(true);
    cerrar.mutate(actual.resumen.monto_esperado_cierre);
  };

  const handleCloseWithCountedCash = () => {
    cerrar.mutate(Number(efectivoContado));
  };

  if (isLoading) return <p>Cargando caja...</p>;

  return (
    <div className="admin-page space-y-6">
      <h1 className="admin-page-title">Caja</h1>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <ModuleCard title="Caja actual" icon={WalletIcon} contentClassName="p-5">
            <div className="space-y-4">
              <div>
                {actual ? (
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    <p>Sesión #{actual.id} · {actual.abierta ? "Abierta" : "Cerrada"}</p>
                    <p>Apertura: {money(actual.monto_apertura)}</p>
                    <p>Ventas efectivo: {money(actual.resumen.efectivo)}</p>
                    <p>Ingresos: {money(actual.resumen.ingresos)} · Egresos: {money(actual.resumen.egresos)}</p>
                    <p className="font-semibold">Efectivo esperado: {money(actual.resumen.monto_esperado_cierre)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No hay caja abierta.</p>
                )}
              </div>

              {!actual?.abierta && (
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
                <button
                  onClick={handleOpenCloseModal}
                  className="w-full rounded-xl bg-red-600 p-6 text-center text-lg font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg"
                >
                  Cerrar caja
                </button>
              )}
            </div>
            {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
          </ModuleCard>

          {actual?.abierta && (
            <ModuleCard title="Registrar movimiento" icon={ArrowUpTrayIcon} contentClassName="p-5">
              <div className="mt-4 grid gap-3">
                <FormField label="Tipo">
                <select
                  value={movimientoForm.tipo}
                  onChange={(event) => setMovimientoForm((prev) => ({ ...prev, tipo: event.target.value as TipoMovimientoCaja }))}
                  className={inputClassName}
                >
                  <option value="INGRESO">Ingreso</option>
                  <option value="EGRESO">Egreso</option>
                </select>
                </FormField>
                <FormField label="Categoría">
                <select
                  value={movimientoForm.categoria}
                  onChange={(event) => setMovimientoForm((prev) => ({ ...prev, categoria: event.target.value as CategoriaMovimientoCaja }))}
                  className={inputClassName}
                >
                  {movimientoCategorias.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
                </FormField>
                <FormField label="Monto">
                <input
                  type="number"
                  min={1}
                  value={movimientoForm.monto}
                  onChange={(event) => setMovimientoForm((prev) => ({ ...prev, monto: event.target.value }))}
                  className={inputClassName}
                  placeholder="Monto"
                />
                </FormField>
                <FormField label="Descripción">
                <input
                  value={movimientoForm.descripcion}
                  onChange={(event) => setMovimientoForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                  className={inputClassName}
                  placeholder="Descripción"
                />
                </FormField>
                <Button
                  onClick={() => setMovementPasswordOpen(true)}
                  disabled={crearMovimiento.isPending || movimientoForm.monto === ""}
                >
                  Registrar
                </Button>
              </div>
            </ModuleCard>
          )}
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
              }))}
            />
          )}

          <ListPanel
            title="Sesiones recientes"
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

      {closeConfirmOpen && actual && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCloseConfirmOpen(false);
              setShowCashCountInput(false);
            }
          }}
        >
          <div className="cash-close-modal">
            <div className="cash-close-head">
              <div>
                <p>Cierre de caja</p>
                <h2>Caja #{actual.id}</h2>
              </div>
              <span className="cash-close-status">
                <ClockIcon className="h-5 w-5" />
                {sessionDuration(actual.abierta_en, null)}
              </span>
            </div>

            <div className="cash-close-grid">
              <section className="cash-close-card highlight">
                <div className="cash-close-card-title">
                  <BanknotesIcon className="h-6 w-6" />
                  <span>Efectivo esperado</span>
                </div>
                <strong>{money(actual.resumen.monto_esperado_cierre)}</strong>
                <div className="cash-close-lines">
                  <span><b>Fondo inicial</b>{money(actual.monto_apertura)}</span>
                  <span><b>Ventas efectivo</b>{money(actual.resumen.efectivo)}</span>
                  <span><b>Ingresos</b>{money(actual.resumen.ingresos)}</span>
                  <span><b>Egresos</b>-{money(actual.resumen.egresos)}</span>
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
                <label className="cash-close-check">
                  <input
                    type="checkbox"
                    checked={cashMatches}
                    onChange={(event) => setCashMatches(event.target.checked)}
                  />
                  <span>El efectivo calza con el monto esperado</span>
                </label>
                <label className="cash-close-check">
                  <input
                    type="checkbox"
                    checked={consignationSeparated}
                    onChange={(event) => setConsignationSeparated(event.target.checked)}
                  />
                  <span>Se separó la plata que entró por consignación</span>
                </label>
              </section>

              <section className="cash-close-card actions">
                <p className="cash-close-question">¿Cómo quieres cerrar?</p>
                <button
                  type="button"
                  onClick={handleCloseWithExactCash}
                  disabled={cerrar.isPending}
                  className="cash-close-option primary"
                >
                  Cerrar con efectivo justo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEfectivoContado("");
                    setShowCashCountInput(true);
                    setCashMatches(false);
                  }}
                  className="cash-close-option"
                >
                  Ingresar efectivo real
                </button>

                {showCashCountInput && (
                  <div className="cash-close-count">
                    <FormField label="Efectivo real contado">
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        value={efectivoContado}
                        onChange={(event) => {
                          setEfectivoContado(event.target.value);
                          setCashMatches(Number(event.target.value) === actual.resumen.monto_esperado_cierre);
                        }}
                        className={`${inputClassName} text-lg`}
                      />
                    </FormField>
                    <div className={`cash-close-difference ${diferenciaCierre < 0 ? "negative" : ""}`}>
                      <span>Diferencia</span>
                      <strong>{money(diferenciaCierre)}</strong>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <FormActions className="cash-close-footer">
              <Button
                variant="ghost"
                onClick={() => {
                  setCloseConfirmOpen(false);
                  setShowCashCountInput(false);
                }}
              >
                Cancelar
              </Button>
              {showCashCountInput && (
                <Button
                  variant="danger"
                  onClick={handleCloseWithCountedCash}
                  disabled={cerrar.isPending || efectivoContado === ""}
                >
                  {cerrar.isPending ? "Cerrando..." : "Cerrar con efectivo real"}
                </Button>
              )}
            </FormActions>
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

    </div>
  );
}
