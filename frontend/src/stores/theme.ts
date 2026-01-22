import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')

  const initTheme = () => {
    const savedTheme = localStorage.getItem('architect-db-theme') as Theme
    if (savedTheme) {
      theme.value = savedTheme
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme()
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('architect-db-theme', theme.value)
    applyTheme()
  }

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    localStorage.setItem('architect-db-theme', theme.value)
    applyTheme()
  }

  const applyTheme = () => {
    if (theme.value === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }

  const isDark = computed(() => theme.value === 'dark')
  const isLight = computed(() => theme.value === 'light')

  const colors = computed(() => {
    if (theme.value === 'dark') {
      return {
        background: '#1a1a1a',
        surface: '#2d2d2d',
        surfaceSecondary: '#3d3d3d',
        border: '#404040',
        text: '#ffffff',
        textSecondary: '#b3b3b3',
        textMuted: '#808080',
        accent: '#4f9eff',
        accentHover: '#6baeff',
        error: '#ff5555',
        success: '#50fa7b',
        warning: '#ffb86c',
        // Diagram specific
        diagramBackground: '#1a1a1a',
        tableBackground: '#2d2d2d',
        tableHeaderBackground: '#3d3d3d',
        tableBorder: '#404040',
        relationshipLine: '#808080',
      }
    } else {
      return {
        background: '#ffffff',
        surface: '#f8f9fa',
        surfaceSecondary: '#e9ecef',
        border: '#dee2e6',
        text: '#212529',
        textSecondary: '#6c757d',
        textMuted: '#adb5bd',
        accent: '#0d6efd',
        accentHover: '#0b5ed7',
        error: '#dc3545',
        success: '#198754',
        warning: '#fd7e14',
        // Diagram specific
        diagramBackground: '#fafafa',
        tableBackground: '#ffffff',
        tableHeaderBackground: '#f8f9fa',
        tableBorder: '#e1e1e1',
        relationshipLine: '#666666',
      }
    }
  })

  return {
    theme,
    isDark,
    isLight,
    colors,
    initTheme,
    toggleTheme,
    setTheme,
  }
})
