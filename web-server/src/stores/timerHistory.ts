import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimerState, TimerAction, HistoryEntry } from '../types/timerActions'
import { applyAction, undoAction } from '../utils/timerActionHandler'
import { createAction } from '../types/timerActions'
import { createStorageAdapter } from '../services/timerStorage'

export const useTimerHistoryStore = defineStore('timerHistory', () => {
  // L'ID du timer actuel
  const timerId = ref('')

  // Créer l'adaptateur de stockage
  const storage = computed(() => createStorageAdapter({
    useLocalStorage: false,
    serverUrl: `/api/timer/${timerId.value}` // URL dynamique avec l'ID
  }))

  // L'historique complet des actions, jamais modifié
  const actionLog = ref<HistoryEntry[]>([])
  
  // L'état actuel du timer
  const currentState = ref<TimerState>({
    startTime: 0,
    lastCheckpoint: 0,
    isRunning: false,
    checkpoints: []
  })

  // Index de la dernière action appliquée
  const currentActionIndex = ref(-1)

  // Vérifier si une action peut être appliquée
  function canApplyAction(action: TimerAction): boolean {
    switch (action.type) {
      case 'START_TIMER':
        return !currentState.value.isRunning
      case 'STOP_TIMER':
        return currentState.value.isRunning
      case 'ADD_CHECKPOINT':
        return currentState.value.isRunning
      case 'DELETE_CHECKPOINT':
        return currentState.value.checkpoints.length > 0
      case 'EDIT_CHECKPOINT_DESCRIPTION':
        return action.index < currentState.value.checkpoints.length
      case 'RESET_TIMER':
        return true
      default:
        return false
    }
  }

  // Ajouter une nouvelle action à l'historique
  async function addAction(action: TimerAction) {
    // Vérifier si l'action peut être appliquée
    if (!canApplyAction(action)) {
      console.warn(`Action ${action.type} non applicable dans l'état actuel`)
      return
    }

    const entry: HistoryEntry = {
      action,
      isUndo: false,
      appliedAt: Date.now()
    }
    
    // Si on est au milieu de l'historique, supprimer les actions futures
    if (currentActionIndex.value < actionLog.value.length - 1) {
      actionLog.value = actionLog.value.slice(0, currentActionIndex.value + 1)
    }
    
    actionLog.value.push(entry)
    currentState.value = applyAction(currentState.value, action)
    currentActionIndex.value = actionLog.value.length - 1
    await saveToStorage()
  }

  // Annuler la dernière action
  async function undo() {
    if (currentActionIndex.value >= 0) {
      const actionToUndo = actionLog.value[currentActionIndex.value].action
      currentState.value = undoAction(currentState.value, actionToUndo)
      currentActionIndex.value--
      await saveToStorage()
    }
  }

  // Refaire la dernière action annulée
  async function redo() {
    if (currentActionIndex.value < actionLog.value.length - 1) {
      currentActionIndex.value++
      const actionToRedo = actionLog.value[currentActionIndex.value].action
      currentState.value = applyAction(currentState.value, actionToRedo)
      await saveToStorage()
    }
  }

  // Vérifier si on peut annuler/refaire
  const canUndo = computed(() => currentActionIndex.value >= 0)
  const canRedo = computed(() => currentActionIndex.value < actionLog.value.length - 1)

  // Exposer l'historique pour l'interface
  function getHistory() {
    return actionLog.value
  }

  // Exposer l'index actuel pour l'interface
  function getCurrentIndex() {
    return currentActionIndex.value
  }

  // Obtenir l'état actuel
  function getCurrentState() {
    return currentState.value
  }

  // Persistance
  async function saveToStorage() {
    try {
      await storage.value.save({
        actionLog: actionLog.value,
        currentState: currentState.value,
        currentActionIndex: currentActionIndex.value
      })
    } catch (error) {
      console.error('Failed to save timer history:', error)
    }
  }

  // Charger les données depuis le stockage
  async function loadFromStorage() {
    if (!timerId.value) return

    try {
      const data = await storage.value.load()
      if (data) {
        actionLog.value = data.actionLog
        currentState.value = data.currentState
        currentActionIndex.value = data.currentActionIndex
      }
    } catch (error) {
      console.error('Error loading timer data:', error)
    }
  }

  // Initialiser un timer avec un ID
  async function initTimer(id: string) {
    timerId.value = id
    await loadFromStorage()
  }

  // Charger l'historique au démarrage
  loadFromStorage()

  // Helpers pour créer des actions
  const actionCreators = {
    startTimer: (startTime: number) => 
      addAction(createAction('START_TIMER', { startTime })),
    
    stopTimer: () => 
      addAction(createAction('STOP_TIMER', {})),
    
    addCheckpoint: (checkpoint: Checkpoint) => 
      addAction(createAction('ADD_CHECKPOINT', { checkpoint })),
    
    deleteCheckpoint: (index: number, deletedCheckpoint: Checkpoint) => 
      addAction(createAction('DELETE_CHECKPOINT', { index, deletedCheckpoint })),
    
    resetTimer: (previousState: TimerState) => 
      addAction(createAction('RESET_TIMER', { previousState })),
    
    editCheckpointDescription: (index: number, previousDescription: string, newDescription: string) => 
      addAction(createAction('EDIT_CHECKPOINT_DESCRIPTION', { index, previousDescription, newDescription }))
  }

  return {
    getCurrentIndex,
    getCurrentState,
    getHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    actions: actionCreators,
    initTimer,
    timerId: computed(() => timerId.value)
  }
})
