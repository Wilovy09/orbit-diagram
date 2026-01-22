// Parser básico para DBML mientras resolvemos los problemas con @dbml/core
export interface ParsedTable {
  name: string
  schema?: string
  columns: ParsedColumn[]
  note?: string
  groupId?: string
  color?: string
}

export interface ParsedColumn {
  name: string
  type: string
  pk: boolean
  unique: boolean
  notNull: boolean
  defaultValue?: string
  note?: string
  ref?: string
}

export interface ParsedTableGroup {
  id: string
  name: string
  note?: string
  color?: string
  tables: string[]
}

export interface ParsedRelationship {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  type: string
}

export interface ParsedDatabase {
  tables: ParsedTable[]
  relationships: ParsedRelationship[]
  tableGroups: ParsedTableGroup[]
}

export class SimpleDbmlParser {
  static parse(dbmlContent: string): ParsedDatabase {
    const tables: ParsedTable[] = []
    const relationships: ParsedRelationship[] = []
    const tableGroups: ParsedTableGroup[] = []

    // Parse TableGroups first
    const tableGroupRegex = /TableGroup\s+(\w+)\s*(?:\[([^\]]+)\])?\s*\{([\s\S]*?)\n\s*\}/g
    let tableGroupMatch

    while ((tableGroupMatch = tableGroupRegex.exec(dbmlContent)) !== null) {
      const [, groupName, groupSettings, groupContent] = tableGroupMatch
      if (!groupName || !groupContent) continue

      // Parse group settings
      const colorMatch =
        groupSettings?.match(/color:\s*['"]?#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3}|\w+)['"]?/) ||
        groupSettings?.match(/color:\s*([^',\]\s]+)/)
      const noteMatch =
        groupSettings?.match(/note:\s*['"]([^'"]+)['"]/) ||
        groupContent.match(/Note:\s*['"]([^'"]+)['"]/) ||
        groupContent.match(/Note:\s*'''([^''']+)'''/)

      const groupId = `group_${groupName.toLowerCase()}`
      const groupColor = colorMatch?.[1]
        ? colorMatch[1].startsWith('#')
          ? colorMatch[1]
          : `#${colorMatch[1]}`
        : this.generateGroupColor(groupName)

      const tablesInGroup: string[] = []

      // Parse tables within the group - handle nested braces properly
      let braceLevel = 0
      let currentTable = ''
      let inTable = false
      const lines = groupContent.split('\n')

      for (const line of lines) {
        const trimmedLine = line.trim()

        if (trimmedLine.startsWith('Table ')) {
          inTable = true
          currentTable = line
          braceLevel = 0
        } else if (inTable) {
          currentTable += '\n' + line

          // Count braces to know when table definition ends
          for (const char of line) {
            if (char === '{') braceLevel++
            if (char === '}') braceLevel--
          }

          // When braces are balanced, we've found a complete table
          if (braceLevel <= 0) {
            const tableMatch = currentTable.match(
              /Table\s+(\w+(?:\.\w+)?)\s*(?:\[([^\]]+)\])?\s*\{([\s\S]*)\}/,
            )
            if (tableMatch) {
              const [, fullTableName, tableSettings, tableContent] = tableMatch
              if (fullTableName && tableContent) {
                const [schema, tableName] = fullTableName.includes('.')
                  ? fullTableName.split('.')
                  : [undefined, fullTableName]
                const tableId = schema ? `${schema}.${tableName}` : fullTableName

                tablesInGroup.push(tableId)

                // Parse table content
                const parsedTable = this.parseTable(
                  fullTableName,
                  tableContent,
                  tableSettings,
                  groupId,
                  groupColor,
                  relationships,
                )
                if (parsedTable) {
                  tables.push(parsedTable)
                }
              }
            }

            inTable = false
            currentTable = ''
          }
        }
      }

      tableGroups.push({
        id: groupId,
        name: groupName,
        note: noteMatch?.[1],
        color: groupColor,
        tables: tablesInGroup,
      })
    }

    // Parse standalone tables (outside of groups) - simple approach
    const allTablesRegex = /Table\s+(\w+(?:\.\w+)?)\s*(?:\[([^\]]+)\])?\s*\{([^}]+)\}/g
    let allTableMatch

    while ((allTableMatch = allTablesRegex.exec(dbmlContent)) !== null) {
      const [, fullTableName, tableSettings, tableContent] = allTableMatch
      if (!fullTableName || !tableContent) continue

      // Check if this table is already parsed as part of a group
      const [schema, tableName] = fullTableName.includes('.')
        ? fullTableName.split('.')
        : [undefined, fullTableName]
      const tableId = schema ? `${schema}.${tableName}` : fullTableName

      const alreadyInGroup = tables.some(
        (t) => (t.schema ? `${t.schema}.${t.name}` : t.name) === tableId,
      )

      if (!alreadyInGroup) {
        const parsedTable = this.parseTable(
          fullTableName,
          tableContent,
          tableSettings,
          undefined,
          undefined,
          relationships,
        )
        if (parsedTable) {
          tables.push(parsedTable)
        }
      }
    }

    // Parse standalone relationships
    const refRegex = /Ref(?:\s+\w+)?:\s*(\w+(?:\.\w+)?\.?\w+)\s*([><-]+)\s*(\w+(?:\.\w+)?\.?\w+)/g
    let refMatch

    while ((refMatch = refRegex.exec(dbmlContent)) !== null) {
      const [, fromRef, relationType, toRef] = refMatch
      if (!fromRef || !relationType || !toRef) continue

      const fromParts = fromRef.split('.')
      const [fromTable, fromColumn] =
        fromParts.length > 1
          ? [fromParts.slice(0, -1).join('.'), fromParts[fromParts.length - 1]]
          : ['unknown', fromRef]

      const toParts = toRef.split('.')
      const [toTable, toColumn] =
        toParts.length > 1
          ? [toParts.slice(0, -1).join('.'), toParts[toParts.length - 1]]
          : ['unknown', toRef]

      relationships.push({
        fromTable,
        fromColumn: fromColumn || '',
        toTable,
        toColumn: toColumn || '',
        type: relationType,
      })
    }

    return { tables, relationships, tableGroups }
  }

  private static parseTable(
    fullTableName: string,
    tableContent: string,
    tableSettings?: string,
    groupId?: string,
    groupColor?: string,
    relationships: ParsedRelationship[] = [],
  ): ParsedTable | null {
    const [schema, tableName] = fullTableName.includes('.')
      ? fullTableName.split('.')
      : [undefined, fullTableName]
    if (!tableName) return null

    // Parse table settings for color
    const tableColorMatch =
      tableSettings?.match(
        /headercolor:\s*['"]*#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3}|[a-zA-Z]+)['"]*/,
      ) ||
      tableSettings?.match(/color:\s*['"]*#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3}|[a-zA-Z]+)['"]*/) ||
      tableSettings?.match(/headercolor:\s*([^',\]\s]+)/) ||
      tableSettings?.match(/color:\s*([^',\]\s]+)/)

    const tableColor = tableColorMatch?.[1]
      ? tableColorMatch[1].startsWith('#')
        ? tableColorMatch[1]
        : `#${tableColorMatch[1]}`
      : groupColor

    const columns: ParsedColumn[] = []

    // Parse columns
    const lines = tableContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('Note:')) continue

      const columnMatch = trimmedLine.match(/^(\w+)\s+([^\s[]+)(?:\s*\[([^\]]+)\])?/)
      if (columnMatch) {
        const [, columnName, columnType, columnSettings] = columnMatch
        if (!columnName || !columnType) continue

        const column: ParsedColumn = {
          name: columnName,
          type: columnType,
          pk: columnSettings?.includes('primary key') || columnSettings?.includes('pk') || false,
          unique: columnSettings?.includes('unique') || false,
          notNull: columnSettings?.includes('not null') || false,
        }

        // Parse default value
        const defaultMatch = columnSettings?.match(/default:\s*['`]?([^'`,\]]+)['`]?/)
        if (defaultMatch) {
          column.defaultValue = defaultMatch[1]
        }

        // Parse note
        const noteMatch = columnSettings?.match(/note:\s*'([^']+)'/)
        if (noteMatch) {
          column.note = noteMatch[1]
        }

        // Parse reference
        const refMatch = columnSettings?.match(/ref:\s*([><-]+)\s*(\w+(?:\.\w+)?\.\w+)/)
        if (refMatch) {
          const [, relationType, refTarget] = refMatch
          if (!relationType || !refTarget) continue

          column.ref = refTarget

          // Create relationship
          const refParts = refTarget.split('.')
          const [refSchema, refTable, refColumn] =
            refParts.length === 3 ? refParts : ['public', refParts[0] || '', refParts[1] || '']

          relationships.push({
            fromTable: fullTableName,
            fromColumn: columnName,
            toTable:
              refSchema && refSchema !== 'public' ? `${refSchema}.${refTable}` : refTable || '',
            toColumn: refColumn || '',
            type: relationType,
          })
        }

        columns.push(column)
      }
    }

    // Parse table note
    const noteMatch = tableContent.match(/Note:\s*'([^']+)'/)
    const note = noteMatch?.[1]

    return {
      name: tableName,
      schema: schema,
      columns,
      note,
      groupId,
      color: tableColor,
    }
  }

  private static generateGroupColor(groupName: string): string {
    // Generate a consistent color based on group name
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#F4A460',
      '#87CEEB',
      '#DEB887',
      '#F0E68C',
    ]

    let hash = 0
    for (let i = 0; i < groupName.length; i++) {
      hash = groupName.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
  }
}
