import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

// UUID generator for browsers without crypto.randomUUID
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add correlation ID for tracing
    config.headers['X-Request-ID'] = generateUUID()
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('iptv-auth-storage')
      window.location.href = '/'
    }

    if (error.response?.status === 429) {
      alert('Çok fazla istek. Lütfen biraz bekleyin.')
    }

    return Promise.reject(error)
  }
)

export default api
