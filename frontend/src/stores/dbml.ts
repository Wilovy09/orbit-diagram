import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SimpleDbmlParser } from '../utils/dbmlParser'
import type { ParsedDiagram, Table, Relationship, TableGroup } from '@/entities/dbml.entitie'

export const useDbmlStore = defineStore('dbml', () => {
  const dbmlContent = ref(`TableGroup E_Commerce {
  Table users {
    id integer [primary key]
    username varchar(255) [not null, unique]
    email varchar(255) [not null, unique]
    full_name varchar(255)
    created_at timestamp [default: \`now()\`]
    updated_at timestamp [default: \`now()\`]
  }

  Table posts {
    id integer [primary key]
    title varchar(255) [not null]
    body text
    user_id integer [ref: > users.id]
    created_at timestamp [default: \`now()\`]
    updated_at timestamp [default: \`now()\`]
  }

  Table comments {
    id integer [primary key]
    content text [not null]
    post_id integer [ref: > posts.id]
    user_id integer [ref: > users.id]
    created_at timestamp [default: \`now()\`]
  }
}

Table categories {
  id integer [primary key]
  name varchar(255) [not null]
  description text
  created_at timestamp [default: \`now()\`]
}`)

  const parsedDiagram = ref<ParsedDiagram>({
    tables: [],
    relationships: [],
    tableGroups: [],
    enums: [],
  })

  const parseError = ref<string | null>(null)

  const parseDbml = () => {
    try {
      parseError.value = null
      const parsed = SimpleDbmlParser.parse(dbmlContent.value)

      // Convertir las tablas
      const tables: Table[] = parsed.tables.map((table, index: number) => ({
        id: table.schema ? `${table.schema}.${table.name}` : table.name,
        name: table.name,
        schema: table.schema,
        columns: table.columns.map((field) => ({
          name: field.name,
          type: field.type,
          pk: field.pk,
          unique: field.unique,
          notNull: field.notNull,
          increment: false,
          defaultValue: field.defaultValue,
          note: field.note,
        })),
        indexes: [],
        note: table.note,
        // Posiciones iniciales distribuidas
        x: 100 + (index % 3) * 350,
        y: 100 + Math.floor(index / 3) * 300,
      }))

      // Convertir las relaciones
      const relationships: Relationship[] = parsed.relationships.map((ref, index: number) => ({
        id: `rel-${index}`,
        type: ref.type as '<' | '>' | '-' | '<>',
        fromTable: ref.fromTable,
        fromColumn: ref.fromColumn,
        toTable: ref.toTable,
        toColumn: ref.toColumn,
      }))

      // Convertir los tableGroups
      const tableGroups: TableGroup[] = parsed.tableGroups.map((group) => ({
        id: group.id,
        name: group.name,
        note: group.note,
        color: group.color,
        tables: group.tables,
      }))

      parsedDiagram.value = {
        tables,
        relationships,
        tableGroups,
        enums: [],
      }
    } catch (error) {
      console.error('Error parsing DBML:', error)
      parseError.value =
        error instanceof Error ? error.message : 'Error desconocido al parsear DBML'
    }
  }

  const updateDbmlContent = (content: string) => {
    dbmlContent.value = content
    parseDbml()
  }

  const updateTablePosition = (tableId: string, x: number, y: number) => {
    const table = parsedDiagram.value.tables.find((t) => t.id === tableId)
    if (table) {
      table.x = x
      table.y = y
    }
  }

  // Parse inicial
  parseDbml()

  const isValid = computed(() => parseError.value === null)
  const tableCount = computed(() => parsedDiagram.value.tables.length)
  const relationshipCount = computed(() => parsedDiagram.value.relationships.length)
  const tableGroupCount = computed(() => parsedDiagram.value.tableGroups.length)

  return {
    dbmlContent,
    parsedDiagram,
    parseError,
    isValid,
    tableCount,
    relationshipCount,
    tableGroupCount,
    updateDbmlContent,
    updateTablePosition,
    parseDbml,
  }
})
