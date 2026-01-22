<template>
    <div class="app-toolbar">
        <div class="toolbar-group">
            <button @click="newFile" class="toolbar-button" title="Nuevo archivo">
                <span class="icon">📄</span>
                Nuevo
            </button>

            <button @click="openFile" class="toolbar-button" title="Abrir archivo">
                <span class="icon">📂</span>
                Abrir
            </button>

            <button @click="saveFile" class="toolbar-button" title="Guardar archivo">
                <span class="icon">💾</span>
                Guardar
            </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
            <button @click="exportSQL" class="toolbar-button" title="Exportar SQL">
                <span class="icon">🗃️</span>
                SQL
            </button>

            <button @click="exportImage" class="toolbar-button" title="Exportar imagen">
                <span class="icon">🖼️</span>
                PNG
            </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
            <select v-model="selectedDbType" class="db-select" title="Tipo de base de datos">
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
                <option value="mssql">SQL Server</option>
            </select>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
            <button @click="toggleTheme" class="toolbar-button theme-button"
                :title="`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`">
                <span class="icon">{{ isDark ? '☀️' : '🌙' }}</span>
                {{ isDark ? 'Claro' : 'Oscuro' }}
            </button>
        </div>

        <div class="toolbar-spacer"></div>

        <div class="toolbar-group">
            <span class="file-name">{{ fileName }}</span>
            <span v-if="isModified" class="modified-indicator" title="Archivo modificado">●</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFileStore } from '../stores/file'
import { useDbmlStore } from '../stores/dbml'
import { useThemeStore } from '../stores/theme'
// import { exporter } from '@dbml/core' // Temporalmente comentado

const fileStore = useFileStore()
const dbmlStore = useDbmlStore()
const themeStore = useThemeStore()

const selectedDbType = ref('postgresql')

const fileName = computed(() => fileStore.currentFileName)
const isModified = computed(() => fileStore.isModified)
const isDark = computed(() => themeStore.isDark)

const toggleTheme = () => {
    themeStore.toggleTheme()
}

const newFile = () => {
    if (isModified.value && !confirm('¿Descartar cambios actuales?')) {
        return
    }

    dbmlStore.updateDbmlContent(`TableGroup E_Commerce {
  Table users {
    id integer [primary key]
    username varchar(255) [not null, unique]
    email varchar(255) [not null, unique]
    created_at timestamp [default: \`now()\`]
  }

  Table products {
    id integer [primary key]
    name varchar(255) [not null]
    price decimal(10,2)
    created_at timestamp [default: \`now()\`]
  }
}`)

    fileStore.setFileName('untitled.dbml')
    fileStore.setModified(false)
}

const openFile = async () => {
    if (isModified.value && !confirm('¿Descartar cambios actuales?')) {
        return
    }

    try {
        const content = await fileStore.loadFile()
        dbmlStore.updateDbmlContent(content)
    } catch (error) {
        console.error('Error abriendo archivo:', error)
        alert('Error al abrir el archivo')
    }
}

const saveFile = () => {
    fileStore.saveFile(dbmlStore.dbmlContent)
}

const exportSQL = () => {
    try {
        const database = dbmlStore.parsedDiagram
        if (!database.tables.length) {
            alert('No hay tablas para exportar')
            return
        }

        // Generar SQL básico manualmente (temporal)
        let sqlContent = '-- Generado desde el editor DBML\\n\\n'

        database.tables.forEach(table => {
            sqlContent += `CREATE TABLE ${table.name} (\\n`
            table.columns.forEach((column, index) => {
                let columnDef = `  ${column.name} ${column.type}`
                if (column.pk) columnDef += ' PRIMARY KEY'
                if (column.notNull && !column.pk) columnDef += ' NOT NULL'
                if (column.unique) columnDef += ' UNIQUE'
                if (column.defaultValue) columnDef += ` DEFAULT ${column.defaultValue}`
                if (index < table.columns.length - 1) columnDef += ','
                sqlContent += columnDef + '\\n'
            })
            sqlContent += ');\\n\\n'
        })

        fileStore.exportSQL(sqlContent, selectedDbType.value)
    } catch (error) {
        console.error('Error exportando SQL:', error)
        alert('Error al exportar SQL: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
}

const exportImage = async () => {
    try {
        await fileStore.exportImage('diagram-container')
    } catch (error) {
        console.error('Error exportando imagen:', error)
        alert('Error al exportar imagen')
    }
}
</script>

<style scoped>
.app-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    min-height: 60px;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.toolbar-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s ease;
}

.toolbar-button:hover {
    background: var(--color-surface-secondary);
    border-color: var(--color-accent);
}

.toolbar-button:active {
    background: var(--color-border);
}

.toolbar-button .icon {
    font-size: 14px;
}

.toolbar-separator {
    width: 1px;
    height: 24px;
    background: var(--color-border);
    margin: 0 8px;
    transition: background-color 0.3s ease;
}

.toolbar-spacer {
    flex: 1;
}

.db-select {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

.db-select:focus {
    outline: none;
    border-color: var(--color-accent);
}

.file-name {
    font-size: 13px;
    color: var(--color-text-secondary);
    font-weight: 500;
    transition: color 0.3s ease;
}

.modified-indicator {
    color: var(--color-warning);
    font-size: 18px;
    margin-left: 4px;
    transition: color 0.3s ease;
}

.theme-button {
    background: transparent !important;
    border: 1px solid var(--color-border) !important;
    transition: all 0.3s ease;
}

.theme-button:hover {
    border-color: var(--color-accent) !important;
    background: var(--color-surface-secondary) !important;
}
</style>
