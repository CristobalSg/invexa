import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const deviceToken = localStorage.getItem("device_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (deviceToken) {
    config.headers["X-Device-Token"] = deviceToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || "Error de conexion";
    const details = error.response?.data?.details;

    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      const hasDeviceToken = Boolean(localStorage.getItem("device_token"));
      const nextPath = hasDeviceToken ? "/perfiles" : "/login";

      if (window.location.pathname !== nextPath) {
        window.location.href = nextPath;
      }
    }

    const wrappedError = new Error(status === 403 ? "No tienes permisos para esta accion" : message);
    (wrappedError as Error & { status?: number; details?: unknown }).status = status;
    (wrappedError as Error & { status?: number; details?: unknown }).details = details;
    return Promise.reject(wrappedError);
  },
);

export default api;
