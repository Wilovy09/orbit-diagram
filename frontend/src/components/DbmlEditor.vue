<template>
  <div class="dbml-editor">
    <div class="editor-container">
      <MonacoEditor v-model:value="localContent" :options="editorOptions" language="sql" theme="vs-light" class="editor"
        @update:value="handleContentChange" />
    </div>
    <div v-if="parseError" class="error-panel">
      <h4>Error de Sintaxis</h4>
      <pre>{{ parseError }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import MonacoEditor from 'monaco-editor-vue3'
import { useDbmlStore } from '../stores/dbml'
import { useFileStore } from '../stores/file'
import { useThemeStore } from '../stores/theme'

const dbmlStore = useDbmlStore()
const fileStore = useFileStore()
const themeStore = useThemeStore()

const localContent = ref(dbmlStore.dbmlContent)

const editorOptions = computed(() => ({
  automaticLayout: true,
  fontSize: 14,
  lineNumbers: 'on',
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: false,
  theme: themeStore.isDark ? 'vs-dark' : 'vs',
  minimap: {
    enabled: true
  },
  wordWrap: 'on',
  folding: true,
  lineDecorationsWidth: 20,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'line'
}))

const parseError = computed(() => dbmlStore.parseError)

let contentChangeTimer: ReturnType<typeof setTimeout> | null = null

const handleContentChange = (value: string) => {
  fileStore.setModified(true)

  // Debounce para evitar parseo excesivo
  if (contentChangeTimer) {
    clearTimeout(contentChangeTimer)
  }

  contentChangeTimer = setTimeout(() => {
    dbmlStore.updateDbmlContent(value)
  }, 500)
}

// Watch para sincronizar cambios externos
watch(() => dbmlStore.dbmlContent, (newContent) => {
  if (newContent !== localContent.value) {
    localContent.value = newContent
  }
})
</script>

<style scoped>
.dbml-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.editor-container {
  flex: 1;
  border: 1px solid #e1e1e1;
  border-radius: 6px;
  overflow: hidden;
}

.editor {
  height: 100%;
  min-height: 400px;
}

.error-panel {
  background: var(--color-error);
  opacity: 0.1;
  border: 1px solid var(--color-error);
  border-radius: 6px;
  padding: 16px;
  margin-top: 8px;
  color: var(--color-error);
  transition: all 0.3s ease;
}

.error-panel h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.error-panel pre {
  margin: 0;
  font-size: 12px;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Consolas', monospace;
}

.editor-footer {
  padding: 12px 16px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-radius: 0 0 6px 6px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.status {
  display: flex;
  gap: 24px;
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: color 0.3s ease;
}

.status-item .icon {
  font-size: 12px;
}

.status-item.valid {
  color: var(--color-success);
}

.status-item.invalid {
  color: var(--color-error);
}
</style>
