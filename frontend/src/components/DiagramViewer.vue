<template>
  <div class="diagram-viewer">
    <div id="diagram-container" class="diagram-container" ref="containerRef">
      <svg ref="svgRef" :width="svgWidth" :height="svgHeight" @wheel.prevent="handleZoom" @mousedown="handlePanStart"
        @mousemove="handlePanMove" @mouseup="handlePanEnd" @mouseleave="handlePanEnd">
        <defs>
          <!-- One side marker (circle) -->
          <marker id="one" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" stroke-width="1.5" />
          </marker>

          <!-- Many side marker (filled square) -->
          <marker id="many" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <rect x="2" y="2" width="6" height="6" fill="currentColor" />
          </marker>

          <!-- One-to-one marker (double line) -->
          <marker id="one-line" markerWidth="10" markerHeight="12" refX="8" refY="6" orient="auto">
            <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M 2 2 L 2 10" />
              <path d="M 5 2 L 5 10" />
            </g>
          </marker>
        </defs>

        <g :transform="`translate(${pan.x}, ${pan.y}) scale(${zoom})`">
          <!-- Table Groups (behind everything) -->
          <g class="table-groups">
            <g v-for="group in tableGroups" :key="group.id" class="table-group">
              <rect v-if="getTableGroupBounds(group)" :x="getTableGroupBounds(group)!.x"
                :y="getTableGroupBounds(group)!.y" :width="getTableGroupBounds(group)!.width"
                :height="getTableGroupBounds(group)!.height" :fill="group.color || '#f0f0f0'" :fill-opacity="0.1"
                :stroke="group.color || '#ddd'" :stroke-width="2" :stroke-dasharray="'5,5'" rx="12" />
              <text v-if="getTableGroupBounds(group)" :x="getTableGroupBounds(group)!.x + 10"
                :y="getTableGroupBounds(group)!.y + 15" class="group-name" :fill="group.color || '#666'">
                {{ group.name }}
              </text>
            </g>
          </g>

          <!-- Tables -->
          <g class="tables">
            <g v-for="table in tables" :key="table.id" class="table"
              :transform="`translate(${table.x || 0}, ${table.y || 0})`"
              @mousedown="handleTableMouseDown($event, table)">
              <!-- Table container -->
              <rect :width="getTableWidth(table)" :height="getTableHeight(table)" :fill="table.color || '#ffffff'"
                stroke="#ddd" stroke-width="1" rx="6" />

              <!-- Table header -->
              <rect :width="getTableWidth(table)" :height="headerHeight" :fill="getHeaderColor(table)" stroke="#ddd"
                stroke-width="1" rx="6" ry="6" />
              <!-- Header bottom part to remove bottom radius -->
              <rect :width="getTableWidth(table)" :height="headerHeight / 2" :fill="getHeaderColor(table)" stroke="none"
                :y="headerHeight / 2" />

              <!-- Table name -->
              <text :x="getTableWidth(table) / 2" :y="headerHeight / 2" class="table-name" text-anchor="middle"
                dominant-baseline="middle">
                {{ table.schema && table.schema !== 'public' ? `${table.schema}.${table.name}` :
                  table.name }}
              </text>

              <!-- Columns -->
              <g class="columns">
                <g v-for="(column, index) in table.columns" :key="column.name" class="column"
                  :transform="`translate(0, ${headerHeight + index * rowHeight})`">
                  <!-- Column background -->
                  <rect :width="getTableWidth(table)" :height="rowHeight" fill="white"
                    :stroke="index < table.columns.length - 1 ? '#f0f0f0' : 'none'" stroke-width="1" />

                  <!-- Primary key icon -->
                  <text v-if="column.pk" x="8" :y="rowHeight / 2" class="column-icon pk" dominant-baseline="middle">
                    🔑
                  </text>

                  <!-- Unique icon -->
                  <text v-else-if="column.unique" x="8" :y="rowHeight / 2" class="column-icon unique"
                    dominant-baseline="middle">
                    ⭐
                  </text>

                  <!-- Column name -->
                  <text :x="column.pk || column.unique ? 30 : 12" :y="rowHeight / 2" class="column-name"
                    :class="{ pk: column.pk, 'not-null': column.notNull }" dominant-baseline="middle">
                    {{ column.name }}
                  </text>

                  <!-- Column type -->
                  <text :x="getTableWidth(table) - 12" :y="rowHeight / 2" class="column-type" text-anchor="end"
                    dominant-baseline="middle">
                    {{ column.type }}
                  </text>
                </g>
              </g>

              <!-- Table note -->
              <text v-if="table.note" :x="getTableWidth(table) / 2" :y="getTableHeight(table) + 20" class="table-note"
                text-anchor="middle" dominant-baseline="hanging">
                {{ table.note }}
              </text>
            </g>
          </g>

          <!-- Relationships (on top of tables) -->
          <g class="relationships">
            <g v-for="rel in relationships" :key="rel.id" class="relationship">
              <path :d="getRelationshipPath(rel)" :stroke="rel.color || 'var(--color-relationship-line)'"
                stroke-width="2" fill="none" :marker-start="getStartMarker(rel.type)"
                :marker-end="getEndMarker(rel.type)" />
              <text v-if="rel.name" :x="getRelationshipLabelPosition(rel).x" :y="getRelationshipLabelPosition(rel).y"
                class="relationship-label" text-anchor="middle" dominant-baseline="middle">
                {{ rel.name }}
              </text>
            </g>
          </g>
        </g>
      </svg>
    </div>

    <!-- Zoom controls -->
    <div class="zoom-controls">
      <button @click="zoomIn" class="zoom-button">+</button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomOut" class="zoom-button">−</button>
      <button @click="resetZoom" class="zoom-button reset">⌂</button>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-icon pk">🔑</span>
        <span>Primary Key</span>
      </div>
      <div class="legend-item">
        <span class="legend-icon unique">⭐</span>
        <span>Unique</span>
      </div>
      <div v-if="tableGroupCount > 0" class="legend-item">
        <span class="legend-icon group">📦</span>
        <span>{{ tableGroupCount }} Table Group{{ tableGroupCount > 1 ? 's' : '' }}</span>
      </div>
      <div v-if="relationships.length > 0" class="legend-section">
        <div class="legend-title">Relationships</div>
        <div class="legend-item">
          <span class="legend-icon relation">○——█</span>
          <span>One-to-Many (1:N)</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon relation">█——○</span>
          <span>Many-to-One (N:1)</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon relation">█——█</span>
          <span>Many-to-Many (N:N)</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon relation">○——○</span>
          <span>One-to-One (1:1)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDbmlStore, type Table, type Relationship } from '../stores/dbml'

const dbmlStore = useDbmlStore()

const containerRef = ref<HTMLDivElement>()
const svgRef = ref<SVGSVGElement>()

const svgWidth = ref(1200)
const svgHeight = ref(800)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })

const headerHeight = 40
const rowHeight = 24
const minTableWidth = 200

// Computed properties
const tables = computed(() => dbmlStore.parsedDiagram.tables)
const relationships = computed(() => dbmlStore.parsedDiagram.relationships)
const tableGroups = computed(() => dbmlStore.parsedDiagram.tableGroups)

// Pan and zoom state
let isPanning = false
let lastPanPoint = { x: 0, y: 0 }
let isDragging = false
let draggedTable: Table | null = null
const dragOffset = { x: 0, y: 0 }

// Table calculations
const getTableWidth = (table: Table) => {
  const maxNameLength = Math.max(
    table.name.length,
    ...table.columns.map(col => col.name.length + col.type.length + 5)
  )
  return Math.max(minTableWidth, Math.min(350, maxNameLength * 8 + 40))
}

const getTableHeight = (table: Table) => {
  return headerHeight + table.columns.length * rowHeight
}

const getHeaderColor = (table: Table) => {
  return table.color || 'var(--color-table-header-background)'
}

const getTableGroupBounds = (group: any) => {
  const groupTables = tables.value.filter(t =>
    group.tables.includes(t.schema ? `${t.schema}.${t.name}` : t.name)
  )

  if (groupTables.length === 0) return null

  const padding = 20
  const minX = Math.min(...groupTables.map(t => (t.x || 0) - padding))
  const minY = Math.min(...groupTables.map(t => (t.y || 0) - padding))
  const maxX = Math.max(...groupTables.map(t => (t.x || 0) + getTableWidth(t) + padding))
  const maxY = Math.max(...groupTables.map(t => (t.y || 0) + getTableHeight(t) + padding))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

const tableGroupCount = computed(() => dbmlStore.parsedDiagram.tableGroups.length)

// Relationship calculations
const getTableCenter = (tableId: string) => {
  const table = tables.value.find(t => t.id === tableId)
  if (!table) return { x: 0, y: 0 }

  return {
    x: (table.x || 0) + getTableWidth(table) / 2,
    y: (table.y || 0) + getTableHeight(table) / 2
  }
}

const getColumnPosition = (tableId: string, columnName: string) => {
  const table = tables.value.find(t => t.id === tableId)
  if (!table) return { x: 0, y: 0 }

  const columnIndex = table.columns.findIndex(col => col.name === columnName)
  if (columnIndex === -1) return getTableCenter(tableId)

  const tableWidth = getTableWidth(table)
  const tableX = table.x || 0
  const tableY = table.y || 0
  const columnY = tableY + headerHeight + columnIndex * rowHeight + rowHeight / 2

  // Return right edge by default (will be adjusted in getRelationshipPath)
  return {
    x: tableX + tableWidth,
    y: columnY
  }
}

const getConnectionPoint = (table: Table, columnName: string, direction: 'left' | 'right' | 'top' | 'bottom') => {
  const columnIndex = table.columns.findIndex(col => col.name === columnName)
  const tableWidth = getTableWidth(table)
  const tableHeight = getTableHeight(table)
  const tableX = table.x || 0
  const tableY = table.y || 0
  const columnY = tableY + headerHeight + (columnIndex >= 0 ? columnIndex * rowHeight + rowHeight / 2 : tableHeight / 2)

  switch (direction) {
    case 'left':
      return { x: tableX, y: columnY }
    case 'right':
      return { x: tableX + tableWidth, y: columnY }
    case 'top':
      return { x: tableX + tableWidth / 2, y: tableY }
    case 'bottom':
      return { x: tableX + tableWidth / 2, y: tableY + tableHeight }
    default:
      return { x: tableX + tableWidth, y: columnY }
  }
}

const getRelationshipPath = (rel: Relationship) => {
  const fromTable = tables.value.find(t => t.id === rel.fromTable)
  const toTable = tables.value.find(t => t.id === rel.toTable)

  if (!fromTable || !toTable) {
    const fromPos = getColumnPosition(rel.fromTable, rel.fromColumn)
    const toPos = getColumnPosition(rel.toTable, rel.toColumn)
    return `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`
  }

  const fromTableBounds = {
    left: fromTable.x || 0,
    right: (fromTable.x || 0) + getTableWidth(fromTable),
    top: fromTable.y || 0,
    bottom: (fromTable.y || 0) + getTableHeight(fromTable),
    centerX: (fromTable.x || 0) + getTableWidth(fromTable) / 2,
    centerY: (fromTable.y || 0) + getTableHeight(fromTable) / 2
  }

  const toTableBounds = {
    left: toTable.x || 0,
    right: (toTable.x || 0) + getTableWidth(toTable),
    top: toTable.y || 0,
    bottom: (toTable.y || 0) + getTableHeight(toTable),
    centerX: (toTable.x || 0) + getTableWidth(toTable) / 2,
    centerY: (toTable.y || 0) + getTableHeight(toTable) / 2
  }

  // Determine the best connection sides
  let fromDirection: 'left' | 'right' | 'top' | 'bottom' = 'right'
  let toDirection: 'left' | 'right' | 'top' | 'bottom' = 'left'

  // Calculate distances to determine best connection points
  const horizontalGap = Math.max(toTableBounds.left - fromTableBounds.right, fromTableBounds.left - toTableBounds.right)
  const verticalGap = Math.max(toTableBounds.top - fromTableBounds.bottom, fromTableBounds.top - toTableBounds.bottom)

  if (horizontalGap > 0) {
    // Tables don't overlap horizontally
    if (fromTableBounds.right < toTableBounds.left) {
      fromDirection = 'right'
      toDirection = 'left'
    } else {
      fromDirection = 'left'
      toDirection = 'right'
    }
  } else if (verticalGap > 0) {
    // Tables don't overlap vertically
    if (fromTableBounds.bottom < toTableBounds.top) {
      fromDirection = 'bottom'
      toDirection = 'top'
    } else {
      fromDirection = 'top'
      toDirection = 'bottom'
    }
  } else {
    // Tables overlap, use default right-to-left
    fromDirection = 'right'
    toDirection = 'left'
  }

  const fromPos = getConnectionPoint(fromTable, rel.fromColumn, fromDirection)
  const toPos = getConnectionPoint(toTable, rel.toColumn, toDirection)

  // Create path with right angles and spacing
  const spacing = 20

  if (fromDirection === 'right' && toDirection === 'left') {
    const midX = fromPos.x + spacing + (toPos.x - spacing - fromPos.x - spacing) / 2
    return `M ${fromPos.x} ${fromPos.y} L ${fromPos.x + spacing} ${fromPos.y} L ${fromPos.x + spacing} ${fromPos.y} L ${midX} ${fromPos.y} L ${midX} ${toPos.y} L ${toPos.x - spacing} ${toPos.y} L ${toPos.x} ${toPos.y}`
  } else if (fromDirection === 'left' && toDirection === 'right') {
    const midX = fromPos.x - spacing + (toPos.x + spacing - fromPos.x + spacing) / 2
    return `M ${fromPos.x} ${fromPos.y} L ${fromPos.x - spacing} ${fromPos.y} L ${midX} ${fromPos.y} L ${midX} ${toPos.y} L ${toPos.x + spacing} ${toPos.y} L ${toPos.x} ${toPos.y}`
  } else if (fromDirection === 'bottom' && toDirection === 'top') {
    const midY = fromPos.y + spacing + (toPos.y - spacing - fromPos.y - spacing) / 2
    return `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${fromPos.y + spacing} L ${fromPos.x} ${midY} L ${toPos.x} ${midY} L ${toPos.x} ${toPos.y - spacing} L ${toPos.x} ${toPos.y}`
  } else if (fromDirection === 'top' && toDirection === 'bottom') {
    const midY = fromPos.y - spacing + (toPos.y + spacing - fromPos.y + spacing) / 2
    return `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${fromPos.y - spacing} L ${fromPos.x} ${midY} L ${toPos.x} ${midY} L ${toPos.x} ${toPos.y + spacing} L ${toPos.x} ${toPos.y}`
  } else {
    // Mixed directions - create L-shaped path
    if (fromDirection === 'right' || fromDirection === 'left') {
      const extendX = fromDirection === 'right' ? fromPos.x + spacing : fromPos.x - spacing
      return `M ${fromPos.x} ${fromPos.y} L ${extendX} ${fromPos.y} L ${extendX} ${toPos.y} L ${toPos.x} ${toPos.y}`
    } else {
      const extendY = fromDirection === 'bottom' ? fromPos.y + spacing : fromPos.y - spacing
      return `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${extendY} L ${toPos.x} ${extendY} L ${toPos.x} ${toPos.y}`
    }
  }
}

const getRelationshipLabelPosition = (rel: Relationship) => {
  const fromPos = getColumnPosition(rel.fromTable, rel.fromColumn)
  const toPos = getColumnPosition(rel.toTable, rel.toColumn)

  return {
    x: (fromPos.x + toPos.x) / 2,
    y: (fromPos.y + toPos.y) / 2 - 10
  }
}

const getStartMarker = (type: string) => {
  switch (type) {
    case '<':     // many-to-one: many side (crow's foot) at start
    case '<>':    // many-to-many: many side at start
      return 'url(#many)'
    case '>':     // one-to-many: one side (circle) at start
      return 'url(#one)'
    case '-':     // one-to-one: line at start
      return 'url(#one-line)'
    default:
      return ''
  }
}

const getEndMarker = (type: string) => {
  switch (type) {
    case '>':     // one-to-many: many side (crow's foot) at end
    case '<>':    // many-to-many: many side at end
      return 'url(#many)'
    case '<':     // many-to-one: one side (circle) at end
      return 'url(#one)'
    case '-':     // one-to-one: line at end
      return 'url(#one-line)'
    default:
      return ''
  }
}

// Event handlers
const handleZoom = (event: WheelEvent) => {
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(3, zoom.value * delta))

  const rect = svgRef.value?.getBoundingClientRect()
  if (rect) {
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    pan.value.x += (mouseX - pan.value.x) * (1 - delta)
    pan.value.y += (mouseY - pan.value.y) * (1 - delta)
  }

  zoom.value = newZoom
}

const handlePanStart = (event: MouseEvent) => {
  if (event.target === svgRef.value) {
    isPanning = true
    lastPanPoint = { x: event.clientX, y: event.clientY }
  }
}

const handlePanMove = (event: MouseEvent) => {
  if (isPanning) {
    const deltaX = event.clientX - lastPanPoint.x
    const deltaY = event.clientY - lastPanPoint.y

    pan.value.x += deltaX
    pan.value.y += deltaY

    lastPanPoint = { x: event.clientX, y: event.clientY }
  } else if (isDragging && draggedTable) {
    const rect = svgRef.value?.getBoundingClientRect()
    if (rect) {
      const x = (event.clientX - rect.left - pan.value.x) / zoom.value - dragOffset.x
      const y = (event.clientY - rect.top - pan.value.y) / zoom.value - dragOffset.y

      dbmlStore.updateTablePosition(draggedTable.id, x, y)
    }
  }
}

const handlePanEnd = () => {
  isPanning = false
  isDragging = false
  draggedTable = null
}

const handleTableMouseDown = (event: MouseEvent, table: Table) => {
  event.stopPropagation()
  isDragging = true
  draggedTable = table

  const rect = svgRef.value?.getBoundingClientRect()
  if (rect) {
    const x = (event.clientX - rect.left - pan.value.x) / zoom.value
    const y = (event.clientY - rect.top - pan.value.y) / zoom.value

    dragOffset.x = x - (table.x || 0)
    dragOffset.y = y - (table.y || 0)
  }
}

// Zoom controls
const zoomIn = () => {
  zoom.value = Math.min(3, zoom.value * 1.2)
}

const zoomOut = () => {
  zoom.value = Math.max(0.1, zoom.value / 1.2)
}

const resetZoom = () => {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

// Handle resize
const handleResize = () => {
  if (containerRef.value) {
    svgWidth.value = containerRef.value.clientWidth
    svgHeight.value = containerRef.value.clientHeight
  }
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.diagram-viewer {
  position: relative;
  height: 100%;
  background: var(--color-diagram-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.diagram-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.diagram-container:active {
  cursor: grabbing;
}

svg {
  width: 100%;
  height: 100%;
}

.table {
  cursor: move;
}

.table-name {
  font-size: 14px;
  font-weight: 600;
  fill: var(--color-text);
  user-select: none;
}

.column-name {
  font-size: 12px;
  fill: var(--color-text-secondary);
  user-select: none;
}

.column-name.pk {
  font-weight: 600;
  fill: var(--color-text);
}

.column-name.not-null {
  font-weight: 500;
}

.column-type {
  font-size: 11px;
  fill: var(--color-text-muted);
  user-select: none;
}

.column-icon {
  font-size: 10px;
  user-select: none;
}

.table-note {
  font-size: 11px;
  fill: var(--color-text-muted);
  font-style: italic;
  user-select: none;
}

.group-name {
  font-size: 12px;
  font-weight: 600;
  user-select: none;
}

.relationship-label {
  font-size: 10px;
  fill: var(--color-text-muted);
  font-weight: 500;
  user-select: none;
}

.relationships path {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.zoom-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.zoom-button {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.zoom-button:hover {
  background: var(--color-surface-secondary);
}

.zoom-button.reset {
  font-size: 14px;
}

.zoom-level {
  font-size: 12px;
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: center;
}

.legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-icon {
  font-size: 10px;
  width: 16px;
  text-align: center;
}

.legend-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.legend-icon.relation {
  font-family: monospace;
  font-size: 8px;
  letter-spacing: -1px;
}
</style>
