import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const ACCENTS = {
  wallet: "#FFCD00",       // Zimbabwe Gold
  calling: "#009639",      // Zimbabwe Green
  marketplace: "#DE2010",  // Zimbabwe Red
  community: "#0A0A0A",    // Zimbabwe Black
  alert: "#DE2010",        // flag red
};
