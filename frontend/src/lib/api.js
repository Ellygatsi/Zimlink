import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API_BASE = `${BACKEND_URL.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export const ACCENTS = {
  wallet: "#16A34A",
  calling: "#22C55E",
  marketplace: "#4ADE80",
  community: "#0A0A0A",
  alert: "#15803D",
};
