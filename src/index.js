import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { Provider } from 'react-redux';
import { store } from './app/store'; // Adjust path if needed
document.title = process.env.REACT_APP_TITLE || "Gumastha";

console.warn('MK frontend boot:', {
  nodeEnv: process.env.NODE_ENV,
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
  href: window.location.href,
});

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    })
    .catch(() => {});
}

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
