<template>
  <div class="timer-container">
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
      <button @click="startTimer" :disabled="isRunning">Démarrer</button>
      <button @click="stopTimer" :disabled="!isRunning">Arrêter</button>
      <button @click="addCheckpoint" :disabled="!isRunning">Checkpoint</button>
      <button @click="reset">Réinitialiser</button>
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

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

// Charger les données au démarrage
const loadTimerData = async () => {
  try {
    const response = await fetch('/api/timer')
    const data = await response.json()
    isRunning.value = data.isRunning
    startTime.value = data.startTime
    lastCheckpoint.value = data.lastCheckpoint
    checkpoints.value = data.checkpoints
    
    if (isRunning.value) {
      updateTimer()
    }
  } catch (error) {
    console.error('Error loading timer data:', error)
  }
}

// Sauvegarder les données
const saveTimerData = async () => {
  try {
    await fetch('/api/timer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isRunning: isRunning.value,
        startTime: startTime.value,
        lastCheckpoint: lastCheckpoint.value,
        checkpoints: checkpoints.value
      })
    })
  } catch (error) {
    console.error('Error saving timer data:', error)
  }
}

// Charger les données au montage du composant
loadTimerData()

const startTimer = async () => {
  startTime.value = Date.now()
  lastCheckpoint.value = startTime.value
  isRunning.value = true
  updateTimer()
  await saveTimerData()
}

const stopTimer = async () => {
  isRunning.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  await saveTimerData()
}

const updateTimer = () => {
  timerInterval = setInterval(() => {
    const now = Date.now()
    totalTime.value = now - startTime.value
    checkpointDiff.value = now - lastCheckpoint.value
  }, 10)
}

const addCheckpoint = async () => {
  const now = Date.now()
  checkpoints.value.push({
    timestamp: now,
    duration: now - lastCheckpoint.value,
    description: ''
  })
  lastCheckpoint.value = now
  await saveTimerData()
}

const reset = async () => {
  stopTimer()
  totalTime.value = 0
  checkpointDiff.value = 0
  checkpoints.value = []
  startTime.value = 0
  lastCheckpoint.value = 0
  await saveTimerData()
}

const getTimeMainPart = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  const timeArray = []
  if (hours > 0) {
    timeArray.push(hours.toString().padStart(2, '0'))
  }
  timeArray.push(minutes.toString().padStart(2, '0'))
  timeArray.push(seconds.toString().padStart(2, '0'))
  
  return timeArray.join(':')
}

const getTimeMilliseconds = (ms: number) => {
  return Math.floor((ms % 1000) / 10).toString().padStart(2, '0')
}

const formatExactTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const deleteCheckpoint = async (index: number) => {
  checkpoints.value.splice(index, 1)
  if (index === checkpoints.value.length) { // Si on supprime le dernier checkpoint
    lastCheckpoint.value = index > 0 ? checkpoints.value[index - 1].timestamp : startTime.value
  }
  // Recalculer la durée des checkpoints suivants si nécessaire
  for (let i = index; i < checkpoints.value.length; i++) {
    const prevTimestamp = i > 0 ? checkpoints.value[i - 1].timestamp : startTime.value
    checkpoints.value[i].duration = checkpoints.value[i].timestamp - prevTimestamp
  }
  await saveTimerData()
}

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
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
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  min-width: 100px;
  flex: 1;
  max-width: 150px;
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
