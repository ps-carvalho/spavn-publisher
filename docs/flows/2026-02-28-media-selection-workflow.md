---
title: "Media Selection Workflow"
type: flow
date: 2026-02-28T21:09:29.462Z
tags: ["media", "workflow", "user-interaction", "content-editing"]
related_files: ["components/media/MediaPicker.vue", "components/media/FileBrowser.vue", "components/media/SelectionBar.vue"]
---

# Flow: Media Selection Workflow

## Overview

This flow documents the user interaction pattern for selecting media through the MediaPicker. It covers the complete journey from initiating a selection to confirming and applying media to content blocks.

## Flow Diagram

```mermaid
sequenceDiagram
    participant Editor as Content Editor
    participant BS as BlockSettings
    participant FR as FieldRenderer
    participant MP as MediaPicker
    participant FB as FileBrowser
    participant API as Media API
    participant Block as Content Block

    Editor->>BS: Click image field
    BS->>FR: Trigger field interaction
    FR->>MP: Open picker modal
    
    MP->>API: Fetch folders
    API-->>MP: Folder tree data
    MP->>API: Fetch root media
    API-->>MP: Media list
    
    MP->>FB: Render FileBrowser
    FB->>Editor: Display folders & files
    
    loop Browse & Select
        Editor->>FB: Click folder
        FB->>API: Fetch folder contents
        API-->>FB: Folder media
        FB->>Editor: Update display
        
        Editor->>FB: Click file(s)
        FB->>FB: Toggle selection state
        FB->>Editor: Visual feedback
    end
    
    Editor->>MP: Click Confirm
    MP->>FR: Emit selection
    FR->>BS: Update field value
    BS->>Block: Apply media ID(s)
    Block->>Editor: Render preview
    
    alt Cancel Selection
        Editor->>MP: Click Cancel
        MP->>FR: Close without changes
    end
```

## Steps

1. **Initiate Selection** — Editor clicks on an image field in the BlockSettings panel, triggering the FieldRenderer to open the MediaPicker modal.

2. **Load Initial Data** — MediaPicker fetches the folder tree structure and root-level media files from the API in parallel.

3. **Browse Content** — Editor navigates through the folder hierarchy using the FolderTree sidebar or by clicking FolderCard components in the main grid.

4. **Select Media** — Editor clicks on FileCard components to select/deselect files. In single-select mode, clicking a new file replaces the current selection. In multi-select mode (galleries), multiple files can be selected.

5. **Confirm Selection** — Editor clicks the Confirm button in the SelectionBar. The selected media IDs are emitted back to the FieldRenderer.

6. **Apply to Block** — The FieldRenderer updates the field value, which propagates to the content block and renders a preview of the selected media.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| API fetch fails | Display error message, retry button available |
| No media in folder | Show empty state with upload prompt |
| Invalid file type | Gray out non-image files, show tooltip on hover |
| Network timeout | Retry automatically up to 3 times, then show error |
| Selection limit exceeded | Show warning toast, prevent additional selections |

## Edge Cases

- **Empty Media Library**: When no media exists, the FileBrowser shows an empty state with a prompt to upload files via the main File Manager.

- **Deep Folder Nesting**: The FolderTree collapses deeply nested folders by default, expanding on click. Breadcrumb navigation is available.

- **Large File Counts**: Pagination is applied automatically (50 items per page) with infinite scroll in the FileGrid.

- **Concurrent Edits**: If another user modifies the media library, the picker does not auto-refresh. Editor must manually refresh or re-open the picker.

- **Pre-existing Selection**: When opening the picker with an existing value, the corresponding file is pre-selected and scrolled into view.


## Related Files

- `components/media/MediaPicker.vue`
- `components/media/FileBrowser.vue`
- `components/media/SelectionBar.vue`
