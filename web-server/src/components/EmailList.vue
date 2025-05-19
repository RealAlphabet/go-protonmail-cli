<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">Emails</h2>
      <button
        @click="authStore.logout"
        class="py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-red-600 hover:bg-red-700"
      >
        Logout
      </button>
    </div>

    <div v-if="emailStore.loading" class="text-center py-4">
      Loading...
    </div>

    <div v-else-if="emailStore.error" class="text-red-600">
      {{ emailStore.error }}
    </div>

    <div v-else class="bg-white shadow-sm overflow-hidden sm:rounded-md">
      <ul class="divide-y divide-gray-200">
        <li
          v-for="email in emailStore.emails"
          :key="email.id"
          @click="$emit('select-email', email.id)"
          class="px-4 py-4 hover:bg-gray-50 cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-indigo-600 truncate">
              {{ email.subject }}
            </p>
            <div class="ml-2 shrink-0 flex">
              <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                {{ new Date(email.timestamp * 1000).toLocaleString() }}
              </p>
            </div>
          </div>
          <div class="mt-2 sm:flex sm:justify-between">
            <div class="sm:flex">
              <p class="flex items-center text-sm text-gray-500">
                {{ email.sender }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div class="flex justify-between">
      <button
        @click="prevPage"
        :disabled="emailStore.currentPage === 0"
        class="py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
      >
        Previous
      </button>
      <button
        @click="nextPage"
        class="py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEmailStore } from '@/stores/emails'
import { useAuthStore } from '@/stores/auth'

const emailStore = useEmailStore()
const authStore = useAuthStore()

defineEmits<{
  (e: 'select-email', id: string): void
}>()

onMounted(() => {
  emailStore.fetchEmails()
})

function prevPage() {
  if (emailStore.currentPage > 0) {
    emailStore.fetchEmails(emailStore.currentPage - 1)
  }
}

function nextPage() {
  emailStore.fetchEmails(emailStore.currentPage + 1)
}
</script>
