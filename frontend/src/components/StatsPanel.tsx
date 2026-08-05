interface StatsPanelProps {
  total: number;
  onFinish: () => void;
  disabled?: boolean;
}

export default function StatsPanel({ total, onFinish, disabled }: StatsPanelProps) {
  return (
    <button
      type="button"
      onClick={onFinish}
      disabled={disabled}
      className="w-full rounded-xl bg-blue-600 p-6 text-center text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
    >
      <span className="block text-sm font-medium text-blue-100">Finalizar venta</span>
      <span className="mt-2 block text-3xl font-bold">${total.toLocaleString()}</span>
    </button>
  );
}
