<template>
  <div class="notes-container">
    <div class="notes-header">
      <h1>Notes partagées</h1>
      <button class="new-note" @click="createNote">
        <span class="material-icons">add</span>
        Nouvelle note
      </button>
    </div>

    <div class="notes-list" v-if="!currentNote">
      <div 
        v-for="note in notes" 
        :key="note.id" 
        class="note-item"
        @click="openNote(note.id)"
      >
        <div class="note-title">{{ note.title }}</div>
        <div class="note-date">{{ formatDate(note.updatedAt) }}</div>
      </div>
    </div>

    <div v-else class="note-editor">
      <div class="editor-header">
        <button class="back-button" @click="closeNote">
          <span class="material-icons">arrow_back</span>
        </button>
        <input 
          v-model="currentNote.title" 
          class="title-input" 
          placeholder="Titre de la note"
        >
        <button 
          class="save-button" 
          :disabled="!hasChanges"
          @click="saveNote"
        >
          <span class="material-icons">save</span>
          Sauvegarder
        </button>
      </div>
      <textarea 
        v-model="currentNote.content" 
        class="content-input" 
        placeholder="Contenu de la note..."
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Note {
  id: string
  title: string
  content?: string
  updatedAt: number
}

const notes = ref<Note[]>([])
const currentNote = ref<Note | null>(null)
const originalNote = ref<string>('')

const hasChanges = computed(() => {
  if (!currentNote.value) return false
  const currentStr = JSON.stringify({
    title: currentNote.value.title,
    content: currentNote.value.content
  })
  return currentStr !== originalNote.value
})

async function loadNotes() {
  try {
    const response = await fetch('/api/notes')
    notes.value = await response.json()
  } catch (error) {
    console.error('Error loading notes:', error)
  }
}

async function createNote() {
  const id = Date.now().toString()
  currentNote.value = {
    id,
    title: '',
    content: '',
    updatedAt: Date.now()
  }
  originalNote.value = JSON.stringify({
    title: '',
    content: ''
  })
}

async function openNote(id: string) {
  try {
    const response = await fetch(`/api/notes/${id}`)
    currentNote.value = await response.json()
    originalNote.value = JSON.stringify({
      title: currentNote.value.title,
      content: currentNote.value.content
    })
  } catch (error) {
    console.error('Error loading note:', error)
  }
}

async function saveNote() {
  if (!currentNote.value) return

  try {
    await fetch(`/api/notes/${currentNote.value.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(currentNote.value)
    })
    originalNote.value = JSON.stringify({
      title: currentNote.value.title,
      content: currentNote.value.content
    })
    await loadNotes()
  } catch (error) {
    console.error('Error saving note:', error)
  }
}

function closeNote() {
  currentNote.value = null
  loadNotes()
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

// Charger les notes au démarrage
loadNotes()
</script>

<style scoped>
.notes-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.notes-header h1 {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
}

.new-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.new-note:hover {
  background: color-mix(in srgb, var(--primary) 80%, 20% black);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.note-item {
  padding: 1rem;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #eee;
}

.note-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.note-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.note-date {
  font-size: 0.9rem;
  color: #666;
}

.note-editor {
  background: white;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
}

.editor-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .editor-header {
    gap: 0.25rem;
  }

  .save-button {
    width: 100%;
    justify-content: center;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--primary);
    color: white;
  }

  .save-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary) 80%, black 20%);
  }

  .save-button:disabled {
    background: #eee;
  }
}

.back-button, .save-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  color: var(--primary);
  min-height: 40px;
}

.back-button:hover, .save-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

.save-button:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.title-input {
  flex: 1;
  width: 0; /* Pour forcer le flex-shrink */
  min-width: 150px;
  font-size: 1.1rem;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
}

.title-input:focus {
  outline: none;
  background: #f8f8f8;
}

.content-input {
  flex: 1;
  padding: 1rem;
  border: none;
  resize: none;
  font-size: 1rem;
  line-height: 1.5;
}

.content-input:focus {
  outline: none;
}
</style>
