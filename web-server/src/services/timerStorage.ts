import type { TimerAction, TimerState } from '../types/timerActions'

export interface TimerStorageData {
  actionLog: { action: TimerAction; isUndo: boolean; appliedAt: number }[]
  currentState: TimerState
  currentActionIndex: number
}

export interface TimerStorageAdapter {
  save: (data: TimerStorageData) => Promise<void>
  load: () => Promise<TimerStorageData | null>
}

// Adaptateur pour le localStorage
export class LocalStorageAdapter implements TimerStorageAdapter {
  private readonly key: string

  constructor(key = 'timerHistory') {
    this.key = key
  }

  async save(data: TimerStorageData): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(data))
  }

  async load(): Promise<TimerStorageData | null> {
    const saved = localStorage.getItem(this.key)
    return saved ? JSON.parse(saved) : null
  }
}

// Adaptateur pour le serveur avec une seule URL
export class SimpleServerAdapter implements TimerStorageAdapter {
  constructor(
    private readonly url: string,
    private readonly options: {
      headers?: Record<string, string>
    } = {}
  ) {}

  async save(data: TimerStorageData): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to save timer data to server:', error)
      throw error
    }
  }

  async load(): Promise<TimerStorageData | null> {
    try {
      const response = await fetch(this.url, {
        headers: this.options.headers
      })
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to load timer data from server:', error)
      throw error
    }
  }
}

// Adaptateur composite qui sauvegarde à la fois en local et sur le serveur
export class CompositeStorageAdapter implements TimerStorageAdapter {
  constructor(
    private readonly adapters: TimerStorageAdapter[]
  ) {}

  async save(data: TimerStorageData): Promise<void> {
    const errors: Error[] = []
    
    // Tenter de sauvegarder avec tous les adaptateurs
    const savePromises = this.adapters.map(adapter =>
      adapter.save(data).catch(error => {
        errors.push(error)
        return Promise.reject(error)
      })
    )

    try {
      await Promise.all(savePromises)
    } catch (error) {
      // Si au moins un adaptateur a réussi, on continue
      if (errors.length < this.adapters.length) {
        console.warn('Some storage adapters failed:', errors)
      } else {
        throw new Error('All storage adapters failed')
      }
    }
  }

  async load(): Promise<TimerStorageData | null> {
    for (const adapter of this.adapters) {
      try {
        const data = await adapter.load()
        if (data) {
          // Synchroniser avec les autres adaptateurs
          this.adapters.forEach(otherAdapter => {
            if (otherAdapter !== adapter) {
              otherAdapter.save(data).catch(error => {
                console.warn('Failed to sync data to adapter:', error)
              })
            }
          })
          return data
        }
      } catch (error) {
        console.warn('Storage adapter failed to load:', error)
      }
    }
    return null
  }
}

// Factory pour créer l'adaptateur de stockage approprié
export function createStorageAdapter(options: {
  useLocalStorage?: boolean
  serverUrl?: string
  serverHeaders?: Record<string, string>
}): TimerStorageAdapter {
  const adapters: TimerStorageAdapter[] = []

  if (options.useLocalStorage) {
    adapters.push(new LocalStorageAdapter())
  }

  if (options.serverUrl) {
    adapters.push(new SimpleServerAdapter(options.serverUrl, {
      headers: options.serverHeaders
    }))
  }

  // Par défaut, utiliser le localStorage si aucune option n'est spécifiée
  if (adapters.length === 0) {
    adapters.push(new LocalStorageAdapter())
  }

  return new CompositeStorageAdapter(adapters)
}
