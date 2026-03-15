<script setup lang="ts">
import type { FolderTreeNode as BaseFolderTreeNode } from '#server/utils/publisher/folders'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { Image, FolderOpen, FolderPlus, Pencil, Maximize, Trash2, Folder } from 'lucide-vue-next'

// Extended type with optional mediaCount for UI display
interface FolderTreeNode extends BaseFolderTreeNode {
  mediaCount?: number
}

// ─── Props & Emits ───────────────────────────────────────────────────────────

interface Props {
  folders: FolderTreeNode[]
  activeFolderId?: number | null
  rootName?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeFolderId: null,
  rootName: 'Media Library',
  loading: false,
})

const emit = defineEmits<{
  select: [folderId: number | null]
  create: [parentId: number | null, name: string]
  rename: [folderId: number, name: string]
  move: [folderId: number, newParentId: number | null]
  delete: [folderId: number, mode: 'recursive' | 'move']
}>()

// ─── State ───────────────────────────────────────────────────────────────────

const { toast } = useToast()

// Track expanded folders by ID
const expandedFolders = ref<Set<number>>(new Set())

// Context menu state
const contextMenuOpen = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuFolder = ref<FolderTreeNode | null>(null)

// Dialog states
const createDialogOpen = ref(false)
const renameDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const moveDialogOpen = ref(false)

// Form inputs
const newFolderName = ref('')
const renameFolderName = ref('')
const deleteMode = ref<'recursive' | 'move'>('move')
const moveTargetId = ref<number | null>(null)

// Drag state
const draggedFolderId = ref<number | null>(null)
const dragOverFolderId = ref<number | null>(null)

// ─── Computed ────────────────────────────────────────────────────────────────

const isRootActive = computed(() => props.activeFolderId === null)

// ─── Tree Operations ─────────────────────────────────────────────────────────

function toggleExpand(folderId: number) {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  }
  else {
    expandedFolders.value.add(folderId)
  }
}

function selectFolder(folderId: number | null) {
  emit('select', folderId)
}

// ─── Context Menu ────────────────────────────────────────────────────────────

function onContextMenu(event: MouseEvent, folder: FolderTreeNode | null) {
  event.preventDefault()
  contextMenuFolder.value = folder
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuOpen.value = true
}

const contextMenuItems = computed(() => {
  const items: Array<{ label: string; iconComponent: any; click?: () => void }> = [
    {
      label: 'New Folder',
      iconComponent: FolderPlus,
      click: () => openCreateDialog(),
    },
  ]

  if (contextMenuFolder.value) {
    items.push(
      {
        label: 'Rename',
        iconComponent: Pencil,
        click: () => openRenameDialog(),
      },
      {
        label: 'Move',
        iconComponent: Maximize,
        click: () => openMoveDialog(),
      },
      {
        label: 'Delete',
        iconComponent: Trash2,
        click: () => openDeleteDialog(),
      },
    )
  }

  return [items]
})

function closeContextMenu() {
  contextMenuOpen.value = false
}

// ─── Create Dialog ───────────────────────────────────────────────────────────

function openCreateDialog() {
  closeContextMenu()
  newFolderName.value = ''
  createDialogOpen.value = true
}

function handleCreate() {
  const name = newFolderName.value.trim()
  if (!name) {
    toast({ title: 'Folder name is required', variant: 'destructive' })
    return
  }

  const parentId = contextMenuFolder.value?.id ?? null
  emit('create', parentId, name)
  createDialogOpen.value = false
  newFolderName.value = ''
}

// ─── Rename Dialog ───────────────────────────────────────────────────────────

function openRenameDialog() {
  if (!contextMenuFolder.value) return
  renameFolderName.value = contextMenuFolder.value.name
  renameDialogOpen.value = true
  closeContextMenu()
}

function handleRename() {
  const name = renameFolderName.value.trim()
  if (!name) {
    toast({ title: 'Folder name is required', variant: 'destructive' })
    return
  }

  if (!contextMenuFolder.value) return
  emit('rename', contextMenuFolder.value.id, name)
  renameDialogOpen.value = false
  renameFolderName.value = ''
}

// ─── Delete Dialog ───────────────────────────────────────────────────────────

function openDeleteDialog() {
  if (!contextMenuFolder.value) return
  deleteMode.value = 'move'
  deleteDialogOpen.value = true
  closeContextMenu()
}

function handleDelete() {
  if (!contextMenuFolder.value) return
  emit('delete', contextMenuFolder.value.id, deleteMode.value)
  deleteDialogOpen.value = false
}

// ─── Move Dialog ─────────────────────────────────────────────────────────────

function openMoveDialog() {
  if (!contextMenuFolder.value) return
  moveTargetId.value = null
  moveDialogOpen.value = true
  closeContextMenu()
}

// Get flat list of folders excluding the one being moved and its descendants
function getMoveTargetFolders(): FolderTreeNode[] {
  if (!contextMenuFolder.value) return props.folders

  const excludeIds = new Set<number>()
  const collectDescendants = (folder: FolderTreeNode) => {
    excludeIds.add(folder.id)
    folder.children.forEach(collectDescendants)
  }
  collectDescendants(contextMenuFolder.value)

  const flatten = (folders: FolderTreeNode[]): FolderTreeNode[] => {
    return folders.flatMap(f => [f, ...flatten(f.children)])
  }

  return flatten(props.folders).filter(f => !excludeIds.has(f.id))
}

function handleMove() {
  if (!contextMenuFolder.value) return
  emit('move', contextMenuFolder.value.id, moveTargetId.value)
  moveDialogOpen.value = false
}

// ─── Drag and Drop ───────────────────────────────────────────────────────────

function onDragStart(event: DragEvent, folder: FolderTreeNode) {
  draggedFolderId.value = folder.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(folder.id))
  }
}

function onDragEnd() {
  draggedFolderId.value = null
  dragOverFolderId.value = null
}

function onDragOver(event: DragEvent, folderId: number | null) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverFolderId.value = folderId
}

function onDragLeave() {
  dragOverFolderId.value = null
}

function onDrop(event: DragEvent, targetFolderId: number | null) {
  event.preventDefault()
  dragOverFolderId.value = null

  if (!draggedFolderId.value) return

  // Prevent dropping on self
  if (draggedFolderId.value === targetFolderId) return

  // Prevent dropping into own descendants (would create circular reference)
  const draggedFolder = findFolderById(props.folders, draggedFolderId.value)
  if (draggedFolder && targetFolderId !== null && isDescendant(draggedFolder, targetFolderId)) return

  emit('move', draggedFolderId.value, targetFolderId)
  draggedFolderId.value = null
}

function findFolderById(folders: FolderTreeNode[], id: number): FolderTreeNode | null {
  for (const folder of folders) {
    if (folder.id === id) return folder
    const found = findFolderById(folder.children, id)
    if (found) return found
  }
  return null
}

function isDescendant(folder: FolderTreeNode, targetId: number): boolean {
  for (const child of folder.children) {
    if (child.id === targetId) return true
    if (isDescendant(child, targetId)) return true
  }
  return false
}
</script>

<template>
  <div class="folder-tree">
    <!-- Loading state -->
    <div v-if="loading" class="p-4 space-y-2">
      <div class="animate-pulse h-8 bg-[hsl(var(--muted))] rounded" />
      <div class="animate-pulse h-8 bg-[hsl(var(--muted))] rounded w-3/4" />
      <div class="animate-pulse h-8 bg-[hsl(var(--muted))] rounded w-1/2" />
    </div>

    <!-- Tree content -->
    <template v-else>
      <!-- Root / Media Library item -->
      <div
        class="folder-item root-item group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
        :class="[
          isRootActive
            ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))] font-medium'
            : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]',
          dragOverFolderId === 0 ? 'ring-2 ring-[hsl(var(--primary))] ring-inset' : '',
        ]"
        @click="selectFolder(null)"
        @contextmenu="onContextMenu($event, null)"
        @dragover="onDragOver($event, 0)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, null)"
      >
        <Image class="w-5 h-5 flex-shrink-0" />
        <span class="flex-1 truncate text-sm">{{ rootName }}</span>
      </div>

      <!-- Folder list -->
      <div v-if="folders.length > 0" class="mt-1">
        <PublisherFolderTreeItem
          v-for="folder in folders"
          :key="folder.id"
          :folder="folder"
          :active-folder-id="activeFolderId"
          :expanded-folders="expandedFolders"
          :dragged-folder-id="draggedFolderId"
          :drag-over-folder-id="dragOverFolderId"
          @toggle-expand="toggleExpand"
          @select="selectFolder"
          @contextmenu="onContextMenu"
          @drag-start="onDragStart"
          @drag-end="onDragEnd"
          @drag-over="onDragOver"
          @drag-leave="onDragLeave"
          @drop="onDrop"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="mt-4 text-center py-6">
        <FolderOpen class="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
        <p class="text-sm text-[hsl(var(--muted-foreground))]">No folders yet</p>
        <Button
          variant="ghost"
          size="sm"
          class="mt-2"
          @click="contextMenuFolder = null; openCreateDialog()"
        >
          Create folder
        </Button>
      </div>
    </template>

    <!-- Context Menu (teleported to body for proper positioning) -->
    <Teleport to="body">
      <div
        v-if="contextMenuOpen"
        class="fixed z-50 min-w-48 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg"
        :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
      >
        <template v-for="(group, groupIndex) in contextMenuItems" :key="groupIndex">
          <hr v-if="groupIndex > 0" class="my-1 border-[hsl(var(--border))]">
          <button
            v-for="(item, itemIndex) in group"
            :key="itemIndex"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
            @click="item.click"
          >
            <component :is="item.iconComponent" class="w-4 h-4" />
            {{ item.label }}
          </button>
        </template>
      </div>
      <!-- Backdrop to close context menu -->
      <div
        v-if="contextMenuOpen"
        class="fixed inset-0 z-40"
        @click="closeContextMenu"
        @contextmenu.prevent="closeContextMenu"
      />
    </Teleport>

    <!-- Create Folder Dialog -->
    <Dialog v-model:open="createDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <p v-if="contextMenuFolder" class="text-sm text-[hsl(var(--muted-foreground))]">
          Inside: {{ contextMenuFolder.name }}
        </p>
        <div class="space-y-2">
          <Label>Folder Name</Label>
          <Input
            v-model="newFolderName"
            placeholder="Enter folder name"
            autofocus
            @keyup.enter="handleCreate"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" @click="createDialogOpen = false">
            Cancel
          </Button>
          <Button @click="handleCreate">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Rename Folder Dialog -->
    <Dialog v-model:open="renameDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <Label>Folder Name</Label>
          <Input
            v-model="renameFolderName"
            placeholder="Enter new name"
            autofocus
            @keyup.enter="handleRename"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" @click="renameDialogOpen = false">
            Cancel
          </Button>
          <Button @click="handleRename">
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Folder Dialog -->
    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Folder</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete "{{ contextMenuFolder?.name }}"?
        </p>

        <div class="bg-[hsl(var(--muted))] rounded-lg p-4">
          <p class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">
            What should happen to items inside?
          </p>
          <div class="space-y-2">
            <label class="flex items-start gap-3 cursor-pointer">
              <input v-model="deleteMode" type="radio" value="move" name="deleteMode" class="mt-1" />
              <div>
                <span class="text-sm font-medium text-[hsl(var(--foreground))]">Move to root</span>
                <span class="block text-xs text-[hsl(var(--muted-foreground))]">
                  Move all items to the root folder
                </span>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input v-model="deleteMode" type="radio" value="recursive" name="deleteMode" class="mt-1" />
              <div>
                <span class="text-sm font-medium text-[hsl(var(--foreground))]">Delete all</span>
                <span class="block text-xs text-[hsl(var(--destructive))]">
                  Permanently delete folder and all contents
                </span>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" @click="deleteDialogOpen = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="handleDelete">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Move Folder Dialog -->
    <Dialog v-model:open="moveDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Folder</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Select a new parent folder for "{{ contextMenuFolder?.name }}"
        </p>

        <div class="border border-[hsl(var(--border))] rounded-lg max-h-64 overflow-y-auto">
          <!-- Root option -->
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] transition-colors"
            :class="moveTargetId === null ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'"
            @click="moveTargetId = null"
          >
            <Image class="w-5 h-5" />
            <span>Media Library (root)</span>
          </button>

          <!-- Folder options -->
          <button
            v-for="folder in getMoveTargetFolders()"
            :key="folder.id"
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] transition-colors"
            :class="moveTargetId === folder.id ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'"
            @click="moveTargetId = folder.id"
          >
            <Folder class="w-5 h-5" />
            <span>{{ folder.path }}</span>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" @click="moveDialogOpen = false">
            Cancel
          </Button>
          <Button @click="handleMove">
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
