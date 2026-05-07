import axios from 'axios';

// Ensure this IP matches your CURRENT laptop IP from 'ipconfig'
const BASE_URL = "http://172.28.192.1:5000"; 

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;