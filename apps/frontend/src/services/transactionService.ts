import api from "../lib/axios";
import type { Transaction } from "../types/transaction";

const ENDPOINT = "/transactions";

export async function getTransactions(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  
  const res  = await api.get<Transaction[]>(`${ENDPOINT}${params.toString()}`);
  return res.data;
}
