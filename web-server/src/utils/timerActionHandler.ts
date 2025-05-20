import type {
  TimerAction,
  TimerState,
  Checkpoint,
  StartTimerAction,
  StopTimerAction,
  AddCheckpointAction,
  DeleteCheckpointAction,
  ResetTimerAction,
  EditCheckpointDescriptionAction
} from '../types/timerActions'

export interface ActionHandler {
  apply: (state: TimerState, action: TimerAction) => TimerState
  undo: (state: TimerState, action: TimerAction) => TimerState
}

const handlers: Record<TimerAction['type'], ActionHandler> = {
  START_TIMER: {
    apply: (state, action) => ({
      ...state,
      startTime: (action as StartTimerAction).startTime,
      lastCheckpoint: (action as StartTimerAction).startTime,
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
      lastCheckpoint: (action as AddCheckpointAction).checkpoint.timestamp,
      checkpoints: [...state.checkpoints, (action as AddCheckpointAction).checkpoint]
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
      newCheckpoints.splice((action as DeleteCheckpointAction).index, 1)
      
      // Recalculer les durées après la suppression
      for (let i = (action as DeleteCheckpointAction).index; i < newCheckpoints.length; i++) {
        const prevTimestamp = i > 0 ? newCheckpoints[i - 1].timestamp : state.startTime
        newCheckpoints[i] = {
          ...newCheckpoints[i],
          duration: newCheckpoints[i].timestamp - prevTimestamp
        }
      }

      return {
        ...state,
        lastCheckpoint: (action as import('../types/timerActions').DeleteCheckpointAction).index === state.checkpoints.length - 1
          ? ((action as import('../types/timerActions').DeleteCheckpointAction).index > 0 ? newCheckpoints[(action as import('../types/timerActions').DeleteCheckpointAction).index - 1].timestamp : state.startTime)
          : state.lastCheckpoint,
        checkpoints: newCheckpoints
      }
    },
    undo: (state, action) => {
      const newCheckpoints = [...state.checkpoints]
      newCheckpoints.splice((action as DeleteCheckpointAction).index, 0, (action as DeleteCheckpointAction).deletedCheckpoint)
      
      // Recalculer les durées après la restauration
      for (let i = (action as DeleteCheckpointAction).index; i < newCheckpoints.length; i++) {
        const prevTimestamp = i > 0 ? newCheckpoints[i - 1].timestamp : state.startTime
        newCheckpoints[i] = {
          ...newCheckpoints[i],
          duration: newCheckpoints[i].timestamp - prevTimestamp
        }
      }

      return {
        ...state,
        lastCheckpoint: (action as DeleteCheckpointAction).index === newCheckpoints.length - 1
          ? (action as DeleteCheckpointAction).deletedCheckpoint.timestamp
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
      ...(action as ResetTimerAction).previousState
    })
  },

  EDIT_CHECKPOINT_DESCRIPTION: {
    apply: (state, action) => ({
      ...state,
      checkpoints: state.checkpoints.map((checkpoint, index) =>
        index === (action as EditCheckpointDescriptionAction).index
          ? { ...checkpoint, description: (action as EditCheckpointDescriptionAction).newDescription }
          : checkpoint
      )
    }),
    undo: (state, action) => ({
      ...state,
      checkpoints: state.checkpoints.map((checkpoint, index) =>
        index === (action as EditCheckpointDescriptionAction).index
          ? { ...checkpoint, description: (action as EditCheckpointDescriptionAction).previousDescription }
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
