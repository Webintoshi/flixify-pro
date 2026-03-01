import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      token: null,
      user: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (code) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/api/v1/auth/login', { code })
          const { token, user } = response.data.data
          
          // Set default auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({ 
            token, 
            user,
            isLoading: false,
            error: null 
          })
          
          return { success: true }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Giriş başarısız'
          })
          return { success: false, error: error.response?.data?.message }
        }
      },

      logout: async () => {
        try {
          await api.post('/api/v1/auth/logout')
        } catch (error) {
          // Ignore logout errors
        }
        
        // Clear auth header
        delete api.defaults.headers.common['Authorization']
        
        set({ 
          token: null, 
          user: null, 
          error: null 
        })
      },

      fetchUser: async () => {
        const token = get().token
        if (!token) return

        try {
          const response = await api.get('/api/v1/auth/me')
          set({ user: response.data.data })
        } catch (error) {
          // Token might be expired
          if (error.response?.status === 401) {
            get().logout()
          }
        }
      },

      clearError: () => set({ error: null }),

      // Hydration flag
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state })
    }),
    {
      name: 'iptv-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
        state?.setHasHydrated(true)
      }
    }
  )
)
