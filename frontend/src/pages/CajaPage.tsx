import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
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

const money = (value: number) => `$${value.toLocaleString()}`;

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
  const [movimientoForm, setMovimientoForm] = useState({
    tipo: "EGRESO" as TipoMovimientoCaja,
    categoria: "PAGO_PROVEEDOR" as CategoriaMovimientoCaja,
    monto: "",
    descripcion: "",
    master_password: "",
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
    mutationFn: () =>
      crearMovimientoCaja({
        tipo: movimientoForm.tipo,
        categoria: movimientoForm.categoria,
        monto: Number(movimientoForm.monto),
        descripcion: movimientoForm.descripcion || null,
        master_password: movimientoForm.master_password,
      }),
    onSuccess: async () => {
      setMessage("Movimiento registrado.");
      setMovimientoForm((prev) => ({ ...prev, monto: "", descripcion: "", master_password: "" }));
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
    setCloseConfirmOpen(true);
  };

  const handleCloseWithExactCash = () => {
    if (!actual) return;
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
                  <button
                    onClick={() => abrir.mutate()}
                    className="w-full rounded-xl bg-blue-600 p-6 text-center text-lg font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                  >
                    Abrir
                  </button>
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
                <FormField label="Clave admin">
                <input
                  type="password"
                  value={movimientoForm.master_password}
                  onChange={(event) => setMovimientoForm((prev) => ({ ...prev, master_password: event.target.value }))}
                  className={inputClassName}
                  placeholder="Clave admin"
                />
                </FormField>
                <Button
                  onClick={() => crearMovimiento.mutate()}
                  disabled={crearMovimiento.isPending || movimientoForm.monto === "" || movimientoForm.master_password === ""}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Confirmar cierre de caja</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                <div className="flex justify-between"><span>Caja</span><span>#{actual.id}</span></div>
                <div className="flex justify-between"><span>Fondo inicial</span><span>{money(actual.monto_apertura)}</span></div>
                <div className="flex justify-between"><span>Ingresos</span><span>{money(actual.resumen.ingresos)}</span></div>
                <div className="flex justify-between"><span>Ventas efectivo</span><span>{money(actual.resumen.efectivo)}</span></div>
                <div className="flex justify-between"><span>Egresos</span><span>{money(actual.resumen.egresos)}</span></div>
                <div className="flex justify-between border-t pt-2 font-semibold text-gray-900">
                  <span>Efectivo esperado</span>
                  <span>{money(actual.resumen.monto_esperado_cierre)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">¿El efectivo está justo?</p>
                <button
                  type="button"
                  onClick={handleCloseWithExactCash}
                  disabled={cerrar.isPending}
                  className="w-full rounded-lg border border-green-600 bg-green-50 px-4 py-3 text-left text-sm font-semibold text-green-800 hover:bg-green-100 disabled:opacity-60"
                >
                  Sí, cerrar con efectivo justo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEfectivoContado("");
                    setShowCashCountInput(true);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  No, ingresar efectivo real
                </button>

                {showCashCountInput && (
                  <div className="pt-2">
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
                    <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                      Diferencia:{" "}
                      <span className={diferenciaCierre < 0 ? "font-semibold text-red-700" : "font-semibold text-green-700"}>
                        {money(diferenciaCierre)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <FormActions className="mt-1">
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

    </div>
  );
}
