<template>
  <div class="timer-container">
    <TimerSelector v-if="!historyStore.timerId" @select="initTimer" />

    <template v-else>
      <div class="main-timer">
        <div class="time-display">
          <h1>
            <template v-if="getTimeMainPart(checkpointDiff)">
              {{ getTimeMainPart(checkpointDiff) }}
            </template>
            <span class="milliseconds">.{{ getTimeMilliseconds(checkpointDiff) }}</span>
          </h1>
          <p>Depuis le dernier checkpoint</p>
        </div>

        <div class="total-time">
          <h2>
            <template v-if="getTimeMainPart(totalTime)">
              {{ getTimeMainPart(totalTime) }}
            </template>
            <span class="milliseconds">.{{ getTimeMilliseconds(totalTime) }}</span>
          </h2>
          <p>Temps total</p>
        </div>
      </div>

      <div class="controls">
        <div class="main-controls">
          <button @click="startTimer" :disabled="isRunning">Démarrer</button>
          <button @click="stopTimer" :disabled="!isRunning">Arrêter</button>
          <button @click="addCheckpoint" :disabled="!isRunning">Checkpoint</button>
          <button @click="reset" :disabled="isRunning">Reset</button>
        </div>

        <div class="history-controls">
          <button @click="undoAction" :disabled="!canUndo" title="Annuler">
            ↶
          </button>
          <button @click="redoAction" :disabled="!canRedo" title="Rétablir">
            ↷
          </button>
        </div>
      </div>

      <TimerHistory />

      <div class="checkpoints-list" v-if="checkpoints.length">
        <h3>Checkpoints</h3>
        <div v-for="(checkpoint, index) in checkpoints" :key="index" class="checkpoint-item">
          <div class="checkpoint-info">
            <div class="checkpoint-time">
              <template v-if="getTimeMainPart(checkpoint.duration)">
                {{ getTimeMainPart(checkpoint.duration) }}
              </template>
              <span class="milliseconds">.{{ getTimeMilliseconds(checkpoint.duration) }}</span>
            </div>
            <div class="checkpoint-exact-time">{{ formatExactTime(checkpoint.timestamp) }}</div>
          </div>
          <input 
            v-model="checkpoint.description" 
            :placeholder="'Checkpoint ' + (index + 1)"
            class="checkpoint-description"
            @change="saveTimerData"
          />
          <button 
            @click="deleteCheckpoint(index)" 
            class="delete-checkpoint"
            title="Supprimer ce checkpoint"
          >
            x
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, computed, provide } from 'vue'
import { useTimerHistoryStore } from '../stores/timerHistory'
import type { Checkpoint } from '../types'
import { getTimeMainPart, getTimeMilliseconds } from '../utils/timeFormat'
import TimerHistory from './TimerHistory.vue'
import TimerSelector from './TimerSelector.vue'

interface Checkpoint {
  timestamp: number
  duration: number
  description: string
}

const isRunning = ref(false)
const startTime = ref(0)
const totalTime = ref(0)
const checkpointDiff = ref(0)
const lastCheckpoint = ref(0)
const checkpoints = ref<Checkpoint[]>([])
let timerInterval: number | null = null

const historyStore = useTimerHistoryStore()
const showHistory = ref(false)

// Computed properties pour l'historique
const canUndo = computed(() => historyStore.canUndo)
const canRedo = computed(() => historyStore.canRedo)

// Surveiller les changements d'état du store
watch(
  () => historyStore.getCurrentState(),
  (newState) => {
    startTime.value = newState.startTime
    lastCheckpoint.value = newState.lastCheckpoint
    isRunning.value = newState.isRunning
    checkpoints.value = newState.checkpoints

    if (newState.isRunning && !timerInterval) {
      updateTimer()
    } else if (!newState.isRunning && timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  },
  { deep: true }
)

const startTimer = () => {
  const now = Date.now()
  historyStore.actions.startTimer(now)
}

const stopTimer = () => {
  historyStore.actions.stopTimer()
}

const updateTimer = () => {
  timerInterval = setInterval(() => {
    const now = Date.now()
    totalTime.value = now - startTime.value
    checkpointDiff.value = now - lastCheckpoint.value
  }, 10)
}

const addCheckpoint = () => {
  const now = Date.now()
  const checkpoint: Checkpoint = {
    timestamp: now,
    duration: now - lastCheckpoint.value,
    description: ''
  }
  historyStore.actions.addCheckpoint(checkpoint)
}

const reset = () => {
  const previousState = historyStore.getCurrentState()
  historyStore.actions.resetTimer(previousState)
  totalTime.value = 0
  checkpointDiff.value = 0
}

const undoAction = () => {
  historyStore.undo()
}

const redoAction = () => {
  historyStore.redo()
}

provide('timerStore', historyStore)

async function initTimer(id: string) {
  await historyStore.initTimer(id)
}

const formatExactTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const updateCheckpointDescription = (index: number, description: string) => {
  const previousDescription = checkpoints.value[index].description
  historyStore.actions.editCheckpointDescription(index, previousDescription, description)
}

const deleteCheckpoint = (index: number) => {
  const deletedCheckpoint = checkpoints.value[index]
  historyStore.actions.deleteCheckpoint(index, deletedCheckpoint)
}

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.main-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.history-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.history-controls button {
  width: 40px;
  font-size: 1.5rem;
  padding: 0;
  line-height: 1;
}

.history-log {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.history-entries {
  max-height: 300px;
  overflow-y: auto;
  margin: 1rem 0;
}

.history-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.history-entry.undo-point {
  background-color: #e9ecef;
  font-style: italic;
}

.entry-time {
  color: #666;
  font-family: monospace;
}

.toggle-history {
  width: 100%;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
}

.toggle-history:hover {
  background-color: #e9ecef;
}
.timer-container {
  max-width: 600px;
  width: 100%;
  margin: 1rem auto;
  padding: 0.5rem;
}

.main-timer {
  text-align: center;
  margin-bottom: 2rem;
}

.time-display {
  margin-bottom: 1rem;
}

.time-display h1 {
  font-size: clamp(2rem, 8vw, 4rem);
  margin: 0;
  font-family: monospace;
}

.total-time h2 {
  font-size: clamp(1.2rem, 4vw, 2rem);
  margin: 0;
  font-family: monospace;
  color: #666;
}

.controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.controls button {
  transition: background-color 0.2s;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: var(--primary);
  color: white;
  cursor: pointer;
  min-width: 100px;
  flex: 1;
  max-width: 150px;
}

.controls button:hover {
  background: color-mix(in srgb, var(--primary) 80%, 20% black);
}

.controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.checkpoints-list {
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.checkpoint-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .checkpoint-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }

  .checkpoint-info {
    flex-direction: row;
    justify-content: space-between;
    min-width: 100%;
  }

  .checkpoint-description {
    margin: 0.25rem 0;
  }

  .delete-checkpoint {
    align-self: center;
    margin: 0;
  }
}

.checkpoint-info {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.checkpoint-time {
  font-family: monospace;
  font-size: 1.1em;
}

.milliseconds {
  color: #666;
  font-size: 0.85em;
}

.time-display .milliseconds {
  color: inherit;
  font-size: 0.7em;
}

.total-time .milliseconds {
  color: #666;
  font-size: 0.7em;
}

.checkpoint-exact-time {
  font-family: monospace;
  font-size: 0.8em;
  color: #666;
}

.checkpoint-description {
  flex: 1;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.delete-checkpoint {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #f44;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  margin-left: 8px;
  padding: 0;
  font-family: monospace;
  line-height: .05;
}

.delete-checkpoint:hover {
  background-color: #cc0000;
}
</style>
