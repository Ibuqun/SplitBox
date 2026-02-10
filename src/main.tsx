import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: '12px',
          letterSpacing: '0.03em',
          background: '#131B25',
          border: '1px solid #1E2A3A',
          color: '#D4DBE8',
        },
      }}
    />
  </StrictMode>,
)
