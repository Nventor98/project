import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '../offline-fintech-app.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
