interface StatsPanelProps {
  total: number;
  onFinish: () => void;
}

export default function StatsPanel({ total, onFinish }: StatsPanelProps) {
  return (
    <div className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center">
      <div className="text-center mb-6">
        <p className="text-gray-600">Total de venta:</p>
        <p className="text-3xl font-bold text-green-600">${total.toFixed(2)}</p>
      </div>

      <button
        onClick={onFinish}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
      >
        Finalizar venta
      </button>
    </div>
  );
}

