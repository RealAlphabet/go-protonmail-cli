import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LoginRequest, LoginResponse } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const sessionId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const captchaUrl = ref<string | null>(null)
  const requiresTotp = ref(false)

  async function login(credentials: LoginRequest): Promise<boolean> {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data: LoginResponse = await response.json()

      if (!response.ok) {
        if (data.error?.type === 'CAPTCHA_REQUIRED') {
          captchaUrl.value = data.error.captcha_url || null
        } else if (data.error?.type === 'TOTP_REQUIRED') {
          requiresTotp.value = true
        }
        error.value = data.error?.message || 'Login failed'
        return false
      }

      sessionId.value = data.session_id
      error.value = null
      captchaUrl.value = null
      requiresTotp.value = false
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return false
    }
  }

  async function logout(): Promise<void> {
    if (!sessionId.value) return

    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: sessionId.value }),
      })
    } finally {
      sessionId.value = null
    }
  }

  return {
    sessionId,
    error,
    captchaUrl,
    requiresTotp,
    login,
    logout,
  }
})
