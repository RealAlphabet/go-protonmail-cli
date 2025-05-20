<!-- TimerHistory.vue -->
<template>
  <div class="history-entries">
    <div class="history-controls">
      <button 
        @click="timerStore.undo()" 
        :disabled="!timerStore.canUndo" 
        title="Annuler"
      >
        <span class="material-icons">undo</span>
      </button>
      <button 
        @click="timerStore.redo()" 
        :disabled="!timerStore.canRedo" 
        title="Rétablir"
      >
        <span class="material-icons">redo</span>
      </button>
    </div>
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
      <div class="entry-action">
        <span class="material-icons">{{ getActionIcon(entry.action.type) }}</span>
        {{ formatActionType(entry.action.type) }}
      </div>
    </div>

    <div class="history-info">
      Position : {{ timerStore.getCurrentIndex() + 1 }} / {{ timerStore.getHistory().length }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { formatExactTime } from '../utils/timeFormat'
import type { TimerHistoryStore } from '../stores/timerHistory'

const timerStore = inject<TimerHistoryStore>('timerStore')!

function getActionIcon(type: string) {
  switch (type) {
    case 'START_TIMER': return 'play_arrow'
    case 'STOP_TIMER': return 'pause'
    case 'ADD_CHECKPOINT': return 'flag'
    case 'DELETE_CHECKPOINT': return 'delete'
    case 'RESET_TIMER': return 'restart_alt'
    default: return 'history'
  }
}

function formatActionType(type: string) {
  switch (type) {
    case 'START_TIMER': return 'Démarrage'
    case 'STOP_TIMER': return 'Arrêt'
    case 'ADD_CHECKPOINT': return 'Checkpoint'
    case 'DELETE_CHECKPOINT': return 'Suppression'
    case 'RESET_TIMER': return 'Réinitialisation'
    default: return type
  }
}
</script>

<style scoped>
.history-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}

.history-controls button {
  background: none;
  border: none;
  padding: 0.5rem;
  color: var(--primary);
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.history-controls button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

.history-controls button:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.history-entry {
  display: flex;
  gap: 1rem;
  padding: .75rem 1rem;
  border-bottom: 1px solid #ddd;
  transition: background-color 0.2s;
}

.current-entry {
  background-color: color-mix(in srgb, var(--primary) 15%, 85% white);
  border-left: 4px solid var(--primary);
  font-weight: 500;
}

.entry-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
}

.current-entry .entry-action {
  color: var(--primary);
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
  margin-bottom: 1rem;
  padding: .75rem 1rem;
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
