<template>
  <div class="timer-panel" :class="{ 'timer-panel-open': show }">
    <div class="panel-header">
      <button class="close-button" @click="$emit('close')">
        <span class="material-icons">close</span>
      </button>
      <div class="tab-buttons">
        <button 
          :class="{ active: currentTab === 'checkpoints' }"
          @click="currentTab = 'checkpoints'"
        >
          <span class="material-icons">flag</span>
          Checkpoints
        </button>
        <button 
          :class="{ active: currentTab === 'history' }"
          @click="currentTab = 'history'"
        >
          <span class="material-icons">history</span>
          Historique
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="currentTab === 'checkpoints'" class="checkpoints-list">
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
          <div class="checkpoint-content">
            <input 
              v-model="checkpoint.description" 
              :placeholder="'Checkpoint ' + (index + 1)"
              class="checkpoint-description"
              @change="$emit('save')"
            />
            <button 
              @click="$emit('delete-checkpoint', index)" 
              class="delete-checkpoint"
              title="Supprimer ce checkpoint"
            >
              <span class="material-icons">delete</span>
            </button>
          </div>
        </div>
      </div>

      <TimerHistory v-else/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Checkpoint } from '../types/timerActions'
import { getTimeMainPart, getTimeMilliseconds } from '../utils/timeFormat'
import { formatExactTime } from '../utils/timeFormat'
import TimerHistory from './TimerHistory.vue'

defineProps<{
  show: boolean
  checkpoints: Checkpoint[]
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'delete-checkpoint', index: number): void
}>()

const currentTab = ref('checkpoints')
</script>

<style scoped>
.timer-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
}

.timer-panel-open {
  transform: translateX(0);
}

.panel-header {
  background: white;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.close-button {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
}

.tab-buttons {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.tab-buttons button {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.tab-buttons button.active {
  color: var(--primary);
  font-weight: 500;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.checkpoint-item {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  gap: 0.5rem;
  background: white;
}

.checkpoint-info {
  display: flex;
  justify-content: space-between;
  font-family: monospace;
  color: #666;
}

.checkpoint-content {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.checkpoint-description {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #eee;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.checkpoint-description:focus {
  outline: none;
  border-color: var(--primary);
}

.delete-checkpoint {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
}

.delete-checkpoint:hover {
  color: #dc2626;
}

.milliseconds {
  color: #666;
  font-size: 0.8em;
}
</style>
