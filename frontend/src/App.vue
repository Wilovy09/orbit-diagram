<template>
  <div class="app">
    <AppToolbar />

    <div class="main-container">
      <div class="sidebar">
        <DbmlEditor />
      </div>

      <div class="diagram-panel">
        <DiagramViewer />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppToolbar from './components/AppToolbar.vue'
import DbmlEditor from './components/DbmlEditor.vue'
import DiagramViewer from './components/DiagramViewer.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--color-background);
  transition: background-color 0.3s ease;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  color: var(--color-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.main-container {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sidebar {
  width: 450px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-header {
  padding: 16px;
  background: var(--color-surface-secondary);
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  transition: color 0.3s ease;
}

.diagram-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  transition: background-color 0.3s ease;
}

.diagram-header {
  padding: 16px;
  background: var(--color-surface-secondary);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.diagram-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  transition: color 0.3s ease;
}

.diagram-info {
  display: flex;
  gap: 16px;
}

.info-item {
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: color 0.3s ease;
}
</style>
