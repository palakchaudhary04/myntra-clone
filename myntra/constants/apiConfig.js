import axios from 'axios';

// Ensure this IP matches your CURRENT laptop IP from 'ipconfig'
const BASE_URL = "process.env.https://myntra-clone-pcca-eldz8m06d-palakchaudhary04s-projects.vercel.app"; 

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;
