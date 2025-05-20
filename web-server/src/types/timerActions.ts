export type TimerState = {
  startTime: number
  lastCheckpoint: number
  isRunning: boolean
  checkpoints: Checkpoint[]
}

export type Checkpoint = {
  timestamp: number
  duration: number
  description: string
}

export type ActionType = 
  | 'START_TIMER'
  | 'STOP_TIMER'
  | 'ADD_CHECKPOINT'
  | 'DELETE_CHECKPOINT'
  | 'RESET_TIMER'
  | 'EDIT_CHECKPOINT_DESCRIPTION'

export interface BaseAction {
  type: ActionType
  timestamp: number
  id: string
}

export interface StartTimerAction extends BaseAction {
  type: 'START_TIMER'
  startTime: number
}

export interface StopTimerAction extends BaseAction {
  type: 'STOP_TIMER'
}

export interface AddCheckpointAction extends BaseAction {
  type: 'ADD_CHECKPOINT'
  checkpoint: Checkpoint
}

export interface DeleteCheckpointAction extends BaseAction {
  type: 'DELETE_CHECKPOINT'
  index: number
  deletedCheckpoint: Checkpoint
}

export interface ResetTimerAction extends BaseAction {
  type: 'RESET_TIMER'
  previousState: TimerState
}

export interface EditCheckpointDescriptionAction extends BaseAction {
  type: 'EDIT_CHECKPOINT_DESCRIPTION'
  index: number
  previousDescription: string
  newDescription: string
}

export type TimerAction = 
  | StartTimerAction
  | StopTimerAction
  | AddCheckpointAction
  | DeleteCheckpointAction
  | ResetTimerAction
  | EditCheckpointDescriptionAction

export interface HistoryEntry {
  action: TimerAction
  isUndo: boolean
  appliedAt: number
}

export const createAction = (type: ActionType, data: any): TimerAction => ({
  type,
  timestamp: Date.now(),
  id: crypto.randomUUID(),
  ...data
})
