// src/pages/StatsPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "../services/transactionService";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function StatsPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", selectedDate],
    queryFn: () => getTransactions(selectedDate, selectedDate),
  });

  const totalSales = transactions?.reduce((sum, tx) => sum + tx.quantity, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Estadísticas de Ventas</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border px-3 py-1 rounded"
        />
      </div>

      <div className="bg-white p-6 rounded shadow flex items-center justify-between">
        <h3 className="text-lg font-semibold">Total de ventas del día</h3>
        <span className="text-xl font-bold text-green-600">${totalSales}</span>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Gráfico de ventas</h3>
        {isLoading ? (
          <p>Cargando...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={transactions}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Lista de transacciones del día</h3>
        <ul className="divide-y">
          {transactions?.map((tx) => (
            <li key={tx.id} className="py-2 flex justify-between">
              <span>#{tx.id}</span>
              <span>{new Date(tx.date).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
