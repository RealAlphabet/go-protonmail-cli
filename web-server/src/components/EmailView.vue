<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <button
      @click="$emit('back')"
      class="mb-4 text-indigo-600 hover:text-indigo-500"
    >
      ← Back to list
    </button>

    <div v-if="emailStore.loading" class="text-center py-4">
      Loading...
    </div>

    <div v-else-if="emailStore.error" class="text-red-600">
      {{ emailStore.error }}
    </div>

    <template v-else-if="emailStore.currentEmail">
      <h3 class="text-xl font-bold mb-2">{{ emailStore.currentEmail.subject }}</h3>
      <div class="text-sm text-gray-600 mb-4">
        From: {{ emailStore.currentEmail.sender }}
        <br />
        Date: {{ new Date(emailStore.currentEmail.timestamp * 1000).toLocaleString() }}
      </div>
      <iframe
        ref="emailIframe"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        class="w-full min-h-[400px] border-0 bg-white"
        :srcdoc="iframeDoc"
        title="Email content"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import DOMPurify from 'dompurify'
import { useEmailStore } from '@/stores/emails'

const props = defineProps<{ emailId: string }>()
const emit = defineEmits<{
  (e: 'back'): void
}>()

const emailStore = useEmailStore()
const emailIframe = ref<HTMLIFrameElement>()
const iframeDoc = ref<string>('')

// Génère le HTML sécurisé pour l'iframe
function buildSrcDoc(content: string) {
  const clean = DOMPurify.sanitize(content, {
    WHOLE_DOCUMENT: true,
    FORCE_BODY: true,
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
    FORBID_TAGS: ['script','iframe','frame','object','embed','form'],
    FORBID_ATTR: ['onerror','onload','onclick','onmouseover'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  })
  console.log(DOMPurify, content);
  return clean;
}

// 1️⃣ Watch de `emailId` : fetch initial + à chaque changement
watch(
  () => props.emailId,
  id => {
    if (id) emailStore.fetchEmailById(id)
  },
  { immediate: true }
)

// 2️⃣ Watch du contenu d'email : met à jour `iframeDoc`
watch(
  () => emailStore.currentEmail,
  email => {
    if (email?.content) {
      iframeDoc.value = buildSrcDoc(email.content)
    }
  },
  { immediate: true }
)

// 3️⃣ Watch de `iframeDoc` pour ajuster la hauteur après chargement
watch(
  () => iframeDoc.value,
  async () => {
    await nextTick()
    const iframe = emailIframe.value
    if (!iframe) return

    const onLoad = () => {
      const docBody = iframe.contentDocument?.body
      if (docBody) {
        iframe.style.height = docBody.scrollHeight + 'px'
        const ro = new ResizeObserver(() => {
          iframe.style.height = docBody.scrollHeight + 'px'
        })
        ro.observe(docBody)
      }
    }

    // Garantir que l'événement load soit déclenché
    iframe.addEventListener('load', onLoad, { once: true })
  },
  { immediate: true }
)
</script>
