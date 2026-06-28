import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
  withCredentials: true,
});

export default api;

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
