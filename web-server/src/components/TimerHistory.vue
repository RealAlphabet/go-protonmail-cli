<!-- TimerHistory.vue -->
<template>
  <div class="timer-history">
    <div class="history-log" v-if="showHistory">
      <h3>Journal des actions</h3>
      <div class="history-entries">
        <div 
          v-for="entry in timerStore.getHistory()" 
          :key="entry.id"
          class="history-entry"
          :class="{ 'undo-point': entry.undoPoint }"
        >
          <div class="entry-time">{{ formatExactTime(entry.appliedAt) }}</div>
          <div class="entry-action">{{ entry.action }}</div>
        </div>
      </div>
      <button class="toggle-history" @click="showHistory = false">Masquer l'historique</button>
    </div>
    <button v-else class="toggle-history" @click="showHistory = true">Afficher l'historique</button>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { formatExactTime } from '../utils/timeFormat'
import type { TimerHistoryStore } from '../stores/timerHistory'

const showHistory = ref(false)
const timerStore = inject<TimerHistoryStore>('timerStore')!
</script>

<style scoped>
.timer-history {
  margin-top: 1rem;
}

.history-log {
  margin-top: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.history-entries {
  max-height: 300px;
  overflow-y: auto;
}

.history-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
}

.entry-time {
  color: #666;
  font-size: 0.9em;
}

.toggle-history {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.toggle-history:hover {
  background: #e0e0e0;
}
</style>
