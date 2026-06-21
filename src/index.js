import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import store from './store';
import { logout } from './store/authSlice';
import reportWebVitals from './reportWebVitals';

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall = /\/auth\/(login|register|forgot-password|reset-password)/.test(url);
    if (status === 401 && localStorage.getItem('token') && !isAuthCall) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
