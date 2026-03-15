<script setup lang="ts">
import type { FolderTreeNode as BaseFolderTreeNode } from '#server/utils/publisher/folders'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-vue-next'

// Extended type with optional mediaCount for UI display
interface FolderTreeNode extends BaseFolderTreeNode {
  mediaCount?: number
}

// ─── Props & Emits ───────────────────────────────────────────────────────────

interface Props {
  folder: FolderTreeNode
  activeFolderId?: number | null
  expandedFolders: Set<number>
  draggedFolderId?: number | null
  dragOverFolderId?: number | null
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  activeFolderId: null,
  draggedFolderId: null,
  dragOverFolderId: null,
  depth: 0,
})

const emit = defineEmits<{
  toggleExpand: [folderId: number]
  select: [folderId: number]
  contextmenu: [event: MouseEvent, folder: FolderTreeNode]
  dragStart: [event: DragEvent, folder: FolderTreeNode]
  dragEnd: []
  dragOver: [event: DragEvent, folderId: number]
  dragLeave: []
  drop: [event: DragEvent, folderId: number]
}>()

// ─── Computed ────────────────────────────────────────────────────────────────

const isExpanded = computed(() => props.expandedFolders.has(props.folder.id))
const isActive = computed(() => props.activeFolderId === props.folder.id)
const hasChildren = computed(() => props.folder.children.length > 0)
const isDragging = computed(() => props.draggedFolderId === props.folder.id)
const isDragOver = computed(() => props.dragOverFolderId === props.folder.id)

const paddingLeft = computed(() => `${12 + props.depth * 16}px`)

// ─── Handlers ────────────────────────────────────────────────────────────────

function toggleExpand() {
  emit('toggleExpand', props.folder.id)
}

function select() {
  emit('select', props.folder.id)
}

function onContextMenu(event: MouseEvent) {
  emit('contextmenu', event, props.folder)
}

function onDragStart(event: DragEvent) {
  emit('dragStart', event, props.folder)
}

function onDragEnd() {
  emit('dragEnd')
}

function onDragOver(event: DragEvent) {
  emit('dragOver', event, props.folder.id)
}

function onDragLeave() {
  emit('dragLeave')
}

function onDrop(event: DragEvent) {
  emit('drop', event, props.folder.id)
}

// Pass through events for children
function handleChildToggleExpand(folderId: number) {
  emit('toggleExpand', folderId)
}

function handleChildSelect(folderId: number) {
  emit('select', folderId)
}

function handleChildContextmenu(event: MouseEvent, folder: FolderTreeNode) {
  emit('contextmenu', event, folder)
}

function handleChildDragStart(event: DragEvent, folder: FolderTreeNode) {
  emit('dragStart', event, folder)
}

function handleChildDragEnd() {
  emit('dragEnd')
}

function handleChildDragOver(event: DragEvent, folderId: number) {
  emit('dragOver', event, folderId)
}

function handleChildDragLeave() {
  emit('dragLeave')
}

function handleChildDrop(event: DragEvent, folderId: number) {
  emit('drop', event, folderId)
}
</script>

<template>
  <div class="folder-item-wrapper">
    <!-- Folder row -->
    <div
      class="folder-item group flex items-center gap-1 py-1.5 rounded-lg cursor-pointer transition-colors"
      :class="[
        isActive
          ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))] font-medium'
          : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]',
        isDragOver ? 'ring-2 ring-[hsl(var(--primary))] ring-inset' : '',
        isDragging ? 'opacity-50' : '',
      ]"
      :style="{ paddingLeft }"
      draggable="true"
      @click="select"
      @contextmenu="onContextMenu"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Expand/collapse toggle -->
      <button
        v-if="hasChildren"
        class="p-0.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
        @click.stop="toggleExpand"
      >
        <ChevronDown
          v-if="isExpanded"
          class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
        />
        <ChevronRight
          v-else
          class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
        />
      </button>
      <span v-else class="w-5" />

      <!-- Folder icon -->
      <FolderOpen
        v-if="isExpanded"
        class="w-5 h-5 flex-shrink-0 text-[hsl(var(--primary))]"
      />
      <Folder
        v-else
        class="w-5 h-5 flex-shrink-0 text-[hsl(var(--primary))]"
      />

      <!-- Folder name -->
      <span class="flex-1 truncate text-sm">{{ folder.name }}</span>

      <!-- Media count badge (optional) -->
      <span
        v-if="folder.mediaCount !== undefined && folder.mediaCount > 0"
        class="text-xs text-[hsl(var(--muted-foreground))] mr-2"
      >
        {{ folder.mediaCount }}
      </span>
    </div>

    <!-- Children -->
    <div v-if="isExpanded && hasChildren" class="children">
      <PublisherFolderTreeItem
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :active-folder-id="activeFolderId"
        :expanded-folders="expandedFolders"
        :dragged-folder-id="draggedFolderId"
        :drag-over-folder-id="dragOverFolderId"
        :depth="depth + 1"
        @toggle-expand="handleChildToggleExpand"
        @select="handleChildSelect"
        @contextmenu="handleChildContextmenu"
        @drag-start="handleChildDragStart"
        @drag-end="handleChildDragEnd"
        @drag-over="handleChildDragOver"
        @drag-leave="handleChildDragLeave"
        @drop="handleChildDrop"
      />
    </div>
  </div>
</template>
