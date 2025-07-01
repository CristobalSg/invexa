// src/lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api', // ajusta según tu backend
  withCredentials: true, // si estás usando cookies/sesiones
});

export default api;
