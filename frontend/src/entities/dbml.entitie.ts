export interface Table {
  id: string
  name: string
  schema?: string
  columns: Column[]
  indexes: Index[]
  note?: string
  color?: string
  x?: number
  y?: number
}

export interface Column {
  name: string
  type: string
  pk: boolean
  unique: boolean
  notNull: boolean
  increment: boolean
  defaultValue?: string
  note?: string
}

export interface Index {
  columns: string[]
  unique: boolean
  name?: string
  type?: string
}

export interface TableGroup {
  id: string
  name: string
  note?: string
  color?: string
  tables: string[]
}

export interface Relationship {
  id: string
  name?: string
  type: '<' | '>' | '-' | '<>'
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  onDelete?: string
  onUpdate?: string
  color?: string
}

export interface ParsedDiagram {
  tables: Table[]
  relationships: Relationship[]
  tableGroups: TableGroup[]
  enums: unknown[]
  project?: {
    name: string
    note?: string
    database_type?: string
  }
}
