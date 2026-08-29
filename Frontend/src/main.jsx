// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { OrderProvider } from './Component/User/SubmitOrder/OrderContext'
import App from './App'
import axios from 'axios'

axios.defaults.baseURL = '/';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
createRoot(document.getElementById('root')).render(
<OrderProvider>

    <App />
</OrderProvider>
  
)
