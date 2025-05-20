<template>
  <div class="min-h-screen flex flex-col bg-gray-100">
    <nav class="bg-white shadow">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold">ProtonMail Client</h1>
          </div>
        </div>
      </div>
    </nav>

    <div class="container m-auto px-4">
      <template v-if="currentView === 'timer'">
        <Timer />
      </template>
      
      <template v-else>
        <template v-if="!authStore.sessionId">
          <div class="max-w-md mx-auto">
            <h2 class="text-2xl font-bold text-center mb-8">Connexion</h2>
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
      </template>
    </div>

    <div class="bg-white shadow flex">
      <button 
        @click="currentView = 'timer'"
        class="px-3 py-2 flex flex-col flex-1 items-center justify-center text-sm font-medium"
        :class="currentView === 'timer' ? 'bg-[var(--primary)] text-white' : 'text-gray-700 hover:bg-gray-100'"
      >
        <span class="material-icons">timer</span>
        Timer
      </button>
      <button 
        v-if="authStore.sessionId"
        @click="currentView = 'mail'"
        class="px-3 py-2 flex flex-col flex-1 items-center justify-center text-sm font-medium"
        :class="currentView === 'mail' ? 'bg-[var(--primary)] text-white' : 'text-gray-700 hover:bg-gray-100'"
      >
        <span class="material-icons">email</span>
        Emails
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from './stores/auth'
import LoginForm from './components/LoginForm.vue'
import EmailList from './components/EmailList.vue'
import EmailView from './components/EmailView.vue'
import Timer from './components/Timer.vue'

const authStore = useAuthStore()
const selectedEmailId = ref<string | null>(null)
const currentView = ref<'timer' | 'mail'>('mail')
</script>
