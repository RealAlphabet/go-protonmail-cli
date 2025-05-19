<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700">Username</label>
      <input
        v-model="form.username"
        type="text"
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1 px-2"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Password</label>
      <input
        v-model="form.password"
        type="password"
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1 px-2"
      />
    </div>

    <div v-if="authStore.captchaUrl">
      <label class="block text-sm font-medium text-gray-700">CAPTCHA Token</label>
      <input
        v-model="form.captchaToken"
        type="text"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1 px-2"
      />
      <a
        :href="authStore.captchaUrl"
        target="_blank"
        class="text-indigo-600 hover:text-indigo-500 text-sm"
      >
        Open CAPTCHA
      </a>
    </div>

    <div v-if="authStore.requiresTotp">
      <label class="block text-sm font-medium text-gray-700">TOTP Code</label>
      <input
        v-model="form.totpCode"
        type="text"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1 px-2"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">TOTP Secret</label>
      <input
        v-model="form.totpSecret"
        type="text"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1 px-2"
      />
    </div>

    <div v-if="authStore.error" class="text-red-600 text-sm">
      {{ authStore.error }}
    </div>

    <button
      type="submit"
      :disabled="loading"
      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {{ loading ? 'Loading...' : 'Login' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { LoginRequest } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)

const form = reactive<LoginRequest>({
  username: '',
  password: '',
  captchaToken: '',
  totpCode: '',
  totpSecret: ''
})

async function handleSubmit() {
  loading.value = true
  try {
    await authStore.login(form)
  } finally {
    loading.value = false
  }
}
</script>
