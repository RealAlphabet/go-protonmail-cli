import type { TimerAction, TimerState, Checkpoint } from '../types/timerActions'

export interface ActionHandler {
  apply: (state: TimerState, action: TimerAction) => TimerState
  undo: (state: TimerState, action: TimerAction) => TimerState
}

const handlers: Record<TimerAction['type'], ActionHandler> = {
  START_TIMER: {
    apply: (state, action) => ({
      ...state,
      startTime: action.startTime,
      lastCheckpoint: action.startTime,
      isRunning: true
    }),
    undo: (state) => ({
      ...state,
      startTime: 0,
      lastCheckpoint: 0,
      isRunning: false
    })
  },

  STOP_TIMER: {
    apply: (state) => ({
      ...state,
      isRunning: false
    }),
    undo: (state) => ({
      ...state,
      isRunning: true
    })
  },

  ADD_CHECKPOINT: {
    apply: (state, action) => ({
      ...state,
      lastCheckpoint: action.checkpoint.timestamp,
      checkpoints: [...state.checkpoints, action.checkpoint]
    }),
    undo: (state) => ({
      ...state,
      lastCheckpoint: state.checkpoints.length > 1 
        ? state.checkpoints[state.checkpoints.length - 2].timestamp 
        : state.startTime,
      checkpoints: state.checkpoints.slice(0, -1)
    })
  },

  DELETE_CHECKPOINT: {
    apply: (state, action) => {
      const newCheckpoints = [...state.checkpoints]
      newCheckpoints.splice(action.index, 1)
      
      // Recalculer les durées après la suppression
      for (let i = action.index; i < newCheckpoints.length; i++) {
        const prevTimestamp = i > 0 ? newCheckpoints[i - 1].timestamp : state.startTime
        newCheckpoints[i] = {
          ...newCheckpoints[i],
          duration: newCheckpoints[i].timestamp - prevTimestamp
        }
      }

      return {
        ...state,
        lastCheckpoint: action.index === state.checkpoints.length - 1
          ? (action.index > 0 ? newCheckpoints[action.index - 1].timestamp : state.startTime)
          : state.lastCheckpoint,
        checkpoints: newCheckpoints
      }
    },
    undo: (state, action) => {
      const newCheckpoints = [...state.checkpoints]
      newCheckpoints.splice(action.index, 0, action.deletedCheckpoint)
      
      // Recalculer les durées après la restauration
      for (let i = action.index; i < newCheckpoints.length; i++) {
        const prevTimestamp = i > 0 ? newCheckpoints[i - 1].timestamp : state.startTime
        newCheckpoints[i] = {
          ...newCheckpoints[i],
          duration: newCheckpoints[i].timestamp - prevTimestamp
        }
      }

      return {
        ...state,
        lastCheckpoint: action.index === newCheckpoints.length - 1
          ? action.deletedCheckpoint.timestamp
          : state.lastCheckpoint,
        checkpoints: newCheckpoints
      }
    }
  },

  RESET_TIMER: {
    apply: () => ({
      startTime: 0,
      lastCheckpoint: 0,
      isRunning: false,
      checkpoints: []
    }),
    undo: (state, action) => ({
      ...action.previousState
    })
  },

  EDIT_CHECKPOINT_DESCRIPTION: {
    apply: (state, action) => ({
      ...state,
      checkpoints: state.checkpoints.map((checkpoint, index) =>
        index === action.index
          ? { ...checkpoint, description: action.newDescription }
          : checkpoint
      )
    }),
    undo: (state, action) => ({
      ...state,
      checkpoints: state.checkpoints.map((checkpoint, index) =>
        index === action.index
          ? { ...checkpoint, description: action.previousDescription }
          : checkpoint
      )
    })
  }
}

export const applyAction = (state: TimerState, action: TimerAction): TimerState => {
  const handler = handlers[action.type]
  if (!handler) {
    throw new Error(`No handler found for action type: ${action.type}`)
  }
  return handler.apply(state, action)
}

export const undoAction = (state: TimerState, action: TimerAction): TimerState => {
  const handler = handlers[action.type]
  if (!handler) {
    throw new Error(`No handler found for action type: ${action.type}`)
  }
  return handler.undo(state, action)
}
