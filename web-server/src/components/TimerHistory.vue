<!-- TimerHistory.vue -->
<template>
  <div class="timer-history">
    <div class="history-log" v-if="showHistory">
      <h3>Journal des actions</h3>
      <div class="history-entries">
        <div 
          v-for="(entry, index) in timerStore.getHistory()" 
          :key="entry.id"
          class="history-entry"
          :class="{ 
            'current-entry': index === timerStore.getCurrentIndex(),
            'future-entry': index > timerStore.getCurrentIndex()
          }"
        >
          <div class="entry-time">{{ formatExactTime(entry.appliedAt) }}</div>
          <div class="entry-action">{{ entry.action.type }}</div>
        </div>
      </div>
      <div class="history-info">
        Position : {{ timerStore.getCurrentIndex() + 1 }} / {{ timerStore.getHistory().length }}
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
  margin-bottom: 1rem;
}

.history-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
  transition: background-color 0.2s;
}

.current-entry {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  font-weight: 500;
}

.future-entry {
  opacity: 0.5;
  background-color: #f8f8f8;
}

.entry-time {
  color: #666;
  font-size: 0.9em;
  min-width: 80px;
}

.entry-action {
  flex: 1;
}

.history-info {
  text-align: right;
  color: #666;
  font-size: 0.9em;
  margin-bottom: 1rem;
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
