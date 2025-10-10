import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' 
import './index.css'
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
/* 
we have wrapped the app in the authprovider module, and the browserRouter, 
the authprovider module allows for we to keep track of if a particular user is verified or not,
it also allows for all the other modules to have access to this information
*/
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)