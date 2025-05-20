<template>
  <div class="timer-selector" v-if="!currentTimerId">
    <h2>Sélectionner un timer</h2>
    <form @submit.prevent="createTimer">
      <input 
        v-model="timerId" 
        type="text" 
        placeholder="Nom du timer"
        pattern="[a-zA-Z0-9\-]+"
        title="Lettres, chiffres et tirets uniquement"
        required
      >
      <button type="submit">Créer/Charger</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const timerId = ref('')
const currentTimerId = ref('')

function createTimer() {
  if (timerId.value) {
    emit('select', timerId.value.toLowerCase())
  }
}
</script>

<style scoped>
.timer-selector {
  max-width: 400px;
  margin: 2rem auto;
  text-align: center;
}

form {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: color-mix(in srgb, var(--primary) 80%, 20% black);
}
</style>
