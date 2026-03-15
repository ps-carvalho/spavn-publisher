<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@spavn/ui'

definePageMeta({ layout: 'admin', middleware: 'publisher-admin' })

const {
  page, pageSize, activeFolderId, folderBreadcrumb, folders, media, pagination,
  storageMeta, status, foldersStatus, selectFolder, breadcrumbItems, refresh, refreshFolders,
} = useMediaLibrary()

const { selectedIds, isSelectionMode, selectedCount, toggleSelection, toggleSelectAll, clearSelection, isSelected } = useMediaSelection()

const {
  isUploading, fileInput, triggerUpload, handleUpload, selectedMedia, showDetail, altText,
  selectMedia, deleteMedia, copyUrl, showMoveModal, openMoveModal, handleMoveMedia,
  showCreateFolderModal, newFolderName, handleCreateFolder, handleRenameFolder, handleMoveFolder, handleDeleteFolder,
  showBulkMoveModal, showBulkDeleteConfirm, isBulkOperating, bulkOperationProgress, handleBulkMove, handleBulkDelete,
} = useMediaOperations()

const allSelected = computed(() => media.value.length > 0 && selectedIds.value.size === media.value.length)

const onUpload = (e: Event) => handleUpload(e, activeFolderId, refresh, refreshFolders)
const onDeleteMedia = () => deleteMedia(refresh, refreshFolders)
const onMoveMedia = (id: number | null) => handleMoveMedia(id, refresh, refreshFolders)
const onCreateFolder = (parentId: number | null, name: string) => handleCreateFolder(parentId, name, refreshFolders)
const onRenameFolder = (id: number, name: string) => handleRenameFolder(id, name, refreshFolders)
const onMoveFolder = (id: number, parentId: number | null) => handleMoveFolder(id, parentId, refreshFolders)
const onDeleteFolder = (id: number, mode: 'recursive' | 'move') => handleDeleteFolder(id, mode, activeFolderId, folderBreadcrumb, refresh, refreshFolders)
const onBulkMove = (id: number | null) => handleBulkMove(id, selectedIds.value, clearSelection, refresh, refreshFolders)
const onBulkDelete = () => handleBulkDelete(selectedIds.value, clearSelection, page, media.value, refresh, refreshFolders)
</script>

<template>
  <div class="flex gap-6">
    <aside class="w-64 flex-shrink-0">
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <PublisherFolderTree :folders="folders" :active-folder-id="activeFolderId" :loading="foldersStatus === 'pending'" root-name="Media Library"
          @select="selectFolder" @create="onCreateFolder" @rename="onRenameFolder" @move="onMoveFolder" @delete="onDeleteFolder" />
      </div>
    </aside>

    <div class="flex-1 min-w-0">
      <PublisherMediaHeader :storage-meta="storageMeta" :is-uploading="isUploading" @create-folder="showCreateFolderModal = true" @upload="triggerUpload">
        <input ref="fileInput" type="file" multiple class="hidden" @change="onUpload" />
      </PublisherMediaHeader>

      <PublisherMediaBreadcrumb :items="breadcrumbItems" />

      <PublisherMediaGrid :media="media" :is-selection-mode="isSelectionMode" :active-folder-id="activeFolderId" :status="status"
        :all-selected="allSelected" :total-files="pagination.total" :is-selected="isSelected"
        @select="selectMedia" @toggle-selection="toggleSelection" @toggle-select-all="toggleSelectAll(media)" @upload="triggerUpload" />

      <div v-if="pagination.pageCount > 1" class="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious :disabled="page <= 1" @click="page = Math.max(1, page - 1)" />
            </PaginationItem>
            <PaginationItem>
              <span class="text-sm text-[hsl(var(--muted-foreground))] px-3">Page {{ page }} of {{ pagination.pageCount }}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext :disabled="page >= pagination.pageCount" @click="page = Math.min(pagination.pageCount, page + 1)" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <PublisherMediaBulkActionBar :selected-count="selectedCount" :is-bulk-operating="isBulkOperating"
        @move="showBulkMoveModal = true" @delete="showBulkDeleteConfirm = true" @cancel="clearSelection" />

      <PublisherMediaBulkOperationProgress :is-operating="isBulkOperating" :progress="bulkOperationProgress" />
    </div>

    <PublisherMediaDetailSlideover :media="selectedMedia" :open="showDetail" :alt-text="altText"
      @update:open="showDetail = $event" @update:alt-text="altText = $event"
      @delete="onDeleteMedia" @copy-url="copyUrl" @move="openMoveModal" />

    <PublisherMediaCreateFolderDialog v-model:open="showCreateFolderModal" v-model:new-folder-name="newFolderName"
      :active-folder-id="activeFolderId" :folder-breadcrumb="folderBreadcrumb" @create="onCreateFolder" />

    <PublisherMoveFileToFolderDialog v-model:open="showMoveModal" :folders="folders"
      :current-folder-id="selectedMedia?.folderId" :file-name="selectedMedia?.originalName" @move="onMoveMedia" />

    <PublisherMoveFileToFolderDialog v-model:open="showBulkMoveModal" :folders="folders"
      :current-folder-id="activeFolderId" :file-name="`${selectedCount} files`" @move="onBulkMove" />

    <PublisherMediaBulkDeleteConfirmDialog v-model:open="showBulkDeleteConfirm"
      :selected-count="selectedCount" :is-bulk-operating="isBulkOperating" @confirm="onBulkDelete" />
  </div>
</template>
