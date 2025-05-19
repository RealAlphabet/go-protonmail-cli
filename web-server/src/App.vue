<template>
  <div class="min-h-screen bg-gray-100">
    <div class="container mx-auto px-4 py-8">
      <template v-if="!authStore.sessionId">
        <div class="max-w-md mx-auto">
          <h1 class="text-3xl font-bold text-center mb-8">ProtonMail Client</h1>
          <LoginForm />
        </div>
      </template>
      
      <template v-else>
        <template v-if="!selectedEmailId">
          <EmailList @select-email="selectedEmailId = $event" />
        </template>
        <template v-else>
          <EmailView
            :email-id="selectedEmailId"
            @back="selectedEmailId = null"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from './stores/auth'
import LoginForm from './components/LoginForm.vue'
import EmailList from './components/EmailList.vue'
import EmailView from './components/EmailView.vue'

const authStore = useAuthStore()
const selectedEmailId = ref<string | null>(null)
</script>
