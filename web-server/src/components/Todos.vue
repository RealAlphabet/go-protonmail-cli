<template>
  <div class="todos-container">
    <div class="todos-header">
      <h1>Liste de tâches</h1>
      <button class="new-todo" @click="createTodo">
        <span class="material-icons">add</span>
        Nouvelle tâche
      </button>
    </div>

    <div class="todo-list">
      <div class="todo-group" v-for="group in todoGroups" :key="group.date">
        <h2 class="group-title">{{ group.date }}</h2>
        <div 
          v-for="todo in group.todos" 
          :key="todo.id"
          class="todo-item"
          :class="{ 'is-done': todo.done }"
        >
          <label class="todo-checkbox">
            <input 
              type="checkbox" 
              v-model="todo.done"
              @change="saveTodo(todo)"
            >
            <span class="checkmark"></span>
          </label>
          
          <div class="todo-content">
            <input
              v-if="todo.editing"
              v-model="todo.title"
              class="todo-input"
              @blur="finishEditing(todo)"
              @keyup.enter="finishEditing(todo)"
              ref="todoInput"
            >
            <div 
              v-else 
              class="todo-title"
              @dblclick="startEditing(todo)"
            >
              {{ todo.title }}
            </div>
            <div class="todo-date">{{ formatTime(todo.createdAt) }}</div>
          </div>

          <button 
            class="delete-todo" 
            @click="deleteTodo(todo)"
            title="Supprimer"
          >
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Todo {
  id: string
  title: string
  done: boolean
  createdAt: number
  editing?: boolean
}

const todos = ref<Todo[]>([])
const todoInput = ref<HTMLInputElement | null>(null)

const todoGroups = computed(() => {
  const groups: { date: string; todos: Todo[] }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  todos.value.forEach(todo => {
    const date = new Date(todo.createdAt)
    date.setHours(0, 0, 0, 0)

    let dateStr = ''
    if (date.getTime() === today.getTime()) {
      dateStr = "Aujourd'hui"
    } else if (date.getTime() === yesterday.getTime()) {
      dateStr = 'Hier'
    } else {
      dateStr = date.toLocaleDateString()
    }

    let group = groups.find(g => g.date === dateStr)
    if (!group) {
      group = { date: dateStr, todos: [] }
      groups.push(group)
    }
    group.todos.push(todo)
  })

  return groups
})

async function loadTodos() {
  try {
    const response = await fetch('/api/todos')
    todos.value = await response.json()
  } catch (error) {
    console.error('Error loading todos:', error)
  }
}

async function createTodo() {
  const id = Date.now().toString()
  const todo: Todo = {
    id,
    title: '',
    done: false,
    createdAt: Date.now(),
    editing: true
  }
  
  todos.value.unshift(todo)
  await nextTick()
  if (todoInput.value) {
    todoInput.value.focus()
  }
}

async function saveTodo(todo: Todo) {
  try {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: todo.title,
        done: todo.done,
        createdAt: todo.createdAt
      })
    })
  } catch (error) {
    console.error('Error saving todo:', error)
  }
}

async function deleteTodo(todo: Todo) {
  try {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'DELETE'
    })
    todos.value = todos.value.filter(t => t.id !== todo.id)
  } catch (error) {
    console.error('Error deleting todo:', error)
  }
}

function startEditing(todo: Todo) {
  todo.editing = true
  nextTick(() => {
    if (todoInput.value) {
      todoInput.value.focus()
    }
  })
}

function finishEditing(todo: Todo) {
  if (!todo.title.trim()) {
    deleteTodo(todo)
  } else {
    todo.editing = false
    saveTodo(todo)
  }
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Charger les todos au démarrage
loadTodos()
</script>

<style scoped>
.todos-container {
  max-width: 100%;
  margin: auto;
  padding: 1rem;
  width: 800px;
}

.todos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.todos-header h1 {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
}

.new-todo {
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

.new-todo:hover {
  background: color-mix(in srgb, var(--primary) 80%, black 20%);
}

.todo-group {
  margin-bottom: 2rem;
}

.group-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #eee;
}

.todo-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.todo-item.is-done .todo-title {
  text-decoration: line-through;
  color: #999;
}

.todo-checkbox {
  position: relative;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.todo-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #fff;
  border: 2px solid #ddd;
  border-radius: 4px;
  transition: all 0.2s;
}

.todo-checkbox:hover .checkmark {
  border-color: var(--primary);
}

.todo-checkbox input:checked ~ .checkmark {
  background-color: var(--primary);
  border-color: var(--primary);
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.todo-checkbox input:checked ~ .checkmark:after {
  display: block;
  left: 6px;
  top: 2px;
  width: 4px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  margin-bottom: 0.25rem;
  word-break: break-word;
}

.todo-date {
  font-size: 0.8rem;
  color: #999;
}

.todo-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--primary);
  border-radius: 4px;
  font-size: 1rem;
}

.todo-input:focus {
  outline: none;
}

.delete-todo {
  opacity: 0;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.todo-item:hover .delete-todo {
  opacity: 1;
}

.delete-todo:hover {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
}

@media (max-width: 480px) {
  .delete-todo {
    opacity: 1;
  }
}
</style>
