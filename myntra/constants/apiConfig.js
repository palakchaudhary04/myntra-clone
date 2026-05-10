import axios from 'axios';

// Ensure this IP matches your CURRENT laptop IP from 'ipc
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://myntra-clone-pcca.vercel.app";
const api = axios.create({
  baseURL: API_URL,
});

export default api;
