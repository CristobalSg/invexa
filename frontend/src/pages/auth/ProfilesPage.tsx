import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOnRectangleIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  UserCircleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { abrirCaja } from "../../services/cajaService";
import {
  clearDeviceAuthorization,
  getProfiles,
  getStoredDevice,
  loginProfile,
  logout,
} from "../../services/authService";
import type { DeviceProfile, ProfileLoginResult } from "../../types/api";
import { Button, FormActions, FormField, inputClassName } from "../../components/FormControls";

const roleLabel = {
  OWNER: "Administrador",
  CASHIER: "Caja",
} as const;

const profileColors = [
  "from-blue-600 to-cyan-500",
  "from-emerald-600 to-lime-500",
  "from-rose-600 to-orange-500",
  "from-violet-600 to-fuchsia-500",
  "from-slate-700 to-slate-500",
];

type ApiError = Error & {
  details?: {
    turno_abierto?: {
      id: number;
      usuario_id: number;
      usuario_nombre: string;
    };
  };
};

export default function ProfilesPage() {
  const navigate = useNavigate();
  const device = getStoredDevice();
  const [selectedProfile, setSelectedProfile] = useState<DeviceProfile | null>(null);
  const [password, setPassword] = useState("");
  const [openingTurnFor, setOpeningTurnFor] = useState<ProfileLoginResult | null>(null);
  const [openingAmount, setOpeningAmount] = useState("");
  const [message, setMessage] = useState("");
  const profiles = useQuery({ queryKey: ["device-profiles"], queryFn: getProfiles });

  const sortedProfiles = useMemo(() => profiles.data ?? [], [profiles.data]);

  const login = useMutation({
    mutationFn: () => {
      if (!selectedProfile) throw new Error("Selecciona un perfil");
      return loginProfile(selectedProfile.id, password);
    },
    onSuccess: (result) => {
      setMessage("");
      setPassword("");

      if (result.requiere_apertura_turno) {
        setOpeningTurnFor(result);
        setOpeningAmount("");
        return;
      }

      navigate("/");
    },
    onError: (error) => {
      const apiError = error as ApiError;
      const openTurn = apiError.details?.turno_abierto;

      if (openTurn) {
        setMessage(`Antes de cambiar de usuario, ${openTurn.usuario_nombre} debe cerrar su turno de caja.`);
        return;
      }

      setMessage(error instanceof Error ? error.message : "No se pudo iniciar turno");
    },
  });

  const openTurn = useMutation({
    mutationFn: () => abrirCaja(Number(openingAmount || 0)),
    onSuccess: () => {
      setOpeningTurnFor(null);
      navigate("/");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo abrir el turno"),
  });

  const handleSelectProfile = (profile: DeviceProfile) => {
    logout();
    setSelectedProfile(profile);
    setPassword("");
    setMessage("");
  };

  const handleForgetDevice = () => {
    clearDeviceAuthorization();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">Invexa POS</p>
            <h1 className="mt-2 text-3xl font-bold">¿Quién inicia turno?</h1>
            {device && (
              <p className="mt-2 flex items-center gap-2 text-sm text-neutral-400">
                <ComputerDesktopIcon className="h-4 w-4" />
                {device.nombre}
              </p>
            )}
          </div>
          <Button variant="ghost" onClick={handleForgetDevice} className="text-neutral-200 hover:bg-white/10">
            <ArrowLeftOnRectangleIcon className="mr-2 h-5 w-5" />
            Desautorizar PC
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          {profiles.isLoading && <p className="text-neutral-400">Cargando perfiles...</p>}
          {profiles.isError && <p className="text-red-300">No se pudieron cargar los perfiles.</p>}

          {!profiles.isLoading && !profiles.isError && (
            <div className="grid w-full grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {sortedProfiles.map((profile, index) => {
                const isAdmin = profile.rol === "OWNER";
                const gradient = profileColors[index % profileColors.length];

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelectProfile(profile)}
                    className="group flex min-w-0 flex-col items-center gap-4 rounded-lg p-3 text-center transition hover:bg-white/5"
                  >
                    <div
                      className={`flex aspect-square w-full max-w-44 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-xl ring-2 ring-transparent transition group-hover:ring-white`}
                    >
                      <UserCircleIcon className="h-20 w-20 text-white/90" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-neutral-100">{profile.nombre}</p>
                      <p className={isAdmin ? "text-sm font-semibold text-blue-300" : "text-sm text-neutral-400"}>
                        {roleLabel[profile.rol]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedProfile && !openingTurnFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-neutral-900 text-white shadow-2xl">
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-950 p-6 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-blue-600 shadow-xl">
                <UserCircleIcon className="h-16 w-16 text-white/90" />
              </div>
              <h2 className="mt-4 truncate text-2xl font-bold">{selectedProfile.nombre}</h2>
              <p className="mt-1 text-sm text-neutral-400">{roleLabel[selectedProfile.rol]}</p>
            </div>
            <div className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-300">
              <LockClosedIcon className="h-5 w-5" />
              Acceso personal
            </div>
            <p className="mt-2 text-sm text-neutral-400">Ingresa tu PIN o contraseña para continuar.</p>
            <FormField label="PIN / contraseña" className="mt-5">
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && password) login.mutate();
                  if (event.key === "Escape") setSelectedProfile(null);
                }}
                className={`${inputClassName} border-neutral-700 bg-neutral-950 text-lg text-white placeholder:text-neutral-500 focus:border-blue-400 focus:ring-blue-950`}
              />
            </FormField>
            {message && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
            <FormActions className="pt-5">
              <Button variant="ghost" onClick={() => setSelectedProfile(null)} className="text-neutral-200 hover:bg-white/10">
                Cancelar
              </Button>
              <Button onClick={() => login.mutate()} disabled={!password || login.isPending}>
                {login.isPending ? "Validando..." : "Entrar"}
              </Button>
            </FormActions>
            </div>
          </div>
        </div>
      )}

      {openingTurnFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white text-gray-900 shadow-2xl">
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <WalletIcon className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Turno de caja</p>
                  <h2 className="mt-1 text-2xl font-bold">Abrir turno</h2>
                  <p className="mt-1 text-sm text-emerald-800">
                    {openingTurnFor.usuario.nombre} no tiene turno abierto en este equipo.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <BanknotesIcon className="h-6 w-6 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Fondo inicial</p>
                  <p className="text-xs text-gray-500">Este monto queda registrado como apertura del turno.</p>
                </div>
              </div>
            </div>
            <FormField label="Monto inicial" className="mt-5">
              <input
                autoFocus
                type="number"
                min={0}
                value={openingAmount}
                onChange={(event) => setOpeningAmount(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openTurn.mutate();
                  if (event.key === "Escape") setOpeningTurnFor(null);
                }}
                className={`${inputClassName} text-2xl font-bold`}
                placeholder="Fondo inicial"
              />
            </FormField>
            {message && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}
            <FormActions className="pt-5">
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                  setOpeningTurnFor(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => openTurn.mutate()} disabled={openTurn.isPending}>
                {openTurn.isPending ? "Abriendo..." : "Abrir turno"}
              </Button>
            </FormActions>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
