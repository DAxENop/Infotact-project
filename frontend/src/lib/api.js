import axios from "axios";
import { io } from "socket.io-client";

const api = axios.create({ baseURL: "" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const hadToken = !!localStorage.getItem("lg_token");
      localStorage.removeItem("lg_token");
      localStorage.removeItem("lg_user");
      if (hadToken && window.location.pathname !== "/") {
        window.location.replace("/");
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
};

export const ledgerAPI = {
  list: (page = 1, limit = 20) => api.get(`/ledger/entries?page=${page}&limit=${limit}`),
  create: (data) => api.post("/ledger/entries", data),
  stats: () => api.get("/ledger/stats"),
  updateStatus: (id, status) => api.patch(`/ledger/entries/${id}/status`, { status }),
};

export const socket = io({
  autoConnect: false,
});

export default api;
