import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Email } from '@/types'
import { useAuthStore } from './auth'

export const useEmailStore = defineStore('emails', () => {
  const emails = ref<Email[]>([])
  const currentPage = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentEmail = ref<Email | null>(null)

  const authStore = useAuthStore()

  async function fetchEmails(page: number = 0): Promise<void> {
    if (!authStore.sessionId) return

    loading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/emails?sessionId=${authStore.sessionId}&page=${page}`)
      if (!response.ok) throw new Error('Failed to fetch emails')

      const data = await response.json()
      emails.value = data.mails
      currentPage.value = page
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function fetchEmailById(id: string): Promise<void> {
    if (!authStore.sessionId) return

    loading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/emails/${id}?sessionId=${authStore.sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch email')

      currentEmail.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return {
    emails,
    currentPage,
    loading,
    error,
    currentEmail,
    fetchEmails,
    fetchEmailById,
  }
})
