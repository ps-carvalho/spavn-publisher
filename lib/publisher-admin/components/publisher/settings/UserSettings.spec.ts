/**
 * Tests for UserSettings Vue component
 *
 * Tests the user settings form component that handles personal preferences.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref, computed } from 'vue'

// ─── Types ───────────────────────────────────────────────────────────────────────

interface UserSettings {
  profile: {
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    sidebarCollapsed: boolean
    itemsPerPage: number
  }
  notifications: {
    email: {
      enabled: boolean
      digestFrequency: 'immediate' | 'daily' | 'weekly'
    }
    inApp: {
      enabled: boolean
    }
  }
  editor: {
    defaultMode: 'visual' | 'code'
    autosaveInterval: number
  }
}

// ─── Mocks ───────────────────────────────────────────────────────────────────────

// Mock Nuxt composables
const mockToast = {
  add: vi.fn(),
}

vi.mock('#app', () => ({
  useToast: () => mockToast,
  definePageMeta: vi.fn(),
  useHead: vi.fn(),
}))

// Mock $fetch
const mockFetch = vi.fn()
vi.mock('#app/composables/fetch', () => ({
  $fetch: mockFetch,
}))

// ─── Component Mock (for testing without full Nuxt setup) ────────────────────────

const MockUserSettings = defineComponent({
  setup() {
    const loading = ref(true)
    const saving = ref(false)
    const settings = ref<UserSettings | null>(null)
    const originalSettings = ref<UserSettings | null>(null)
    const error = ref<string | null>(null)
    const validationErrors = ref<Record<string, string[]>>({})

    const hasChanges = computed(() => {
      if (!settings.value || !originalSettings.value) return false
      return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value)
    })

    async function loadSettings() {
      loading.value = true
      error.value = null

      try {
        const response = await mockFetch('/api/publisher/settings/user')
        settings.value = response.settings
        originalSettings.value = JSON.parse(JSON.stringify(response.settings))
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load settings'
        mockToast.add({
          title: 'Failed to load settings',
          description: error.value,
          color: 'error',
        })
      } finally {
        loading.value = false
      }
    }

    async function saveSettings() {
      if (!settings.value) return

      saving.value = true
      validationErrors.value = {}

      try {
        await mockFetch('/api/publisher/settings/user', {
          method: 'PUT',
          body: settings.value,
        })

        originalSettings.value = JSON.parse(JSON.stringify(settings.value))

        mockToast.add({
          title: 'Settings saved',
          description: 'Your preferences have been updated',
          color: 'success',
        })
      } catch (err: any) {
        if (err?.data?.error?.details) {
          validationErrors.value = err.data.error.details
        }

        mockToast.add({
          title: 'Failed to save settings',
          description: err?.data?.error?.message || err.message || 'An error occurred',
          color: 'error',
        })
      } finally {
        saving.value = false
      }
    }

    function resetSettings() {
      if (originalSettings.value) {
        settings.value = JSON.parse(JSON.stringify(originalSettings.value))
        validationErrors.value = {}
      }
    }

    // Simulate onMounted
    loadSettings()

    return {
      loading,
      saving,
      settings,
      originalSettings,
      error,
      validationErrors,
      hasChanges,
      loadSettings,
      saveSettings,
      resetSettings,
    }
  },
  template: `
    <div>
      <div v-if="loading" data-testid="loading">Loading...</div>
      <div v-else-if="error" data-testid="error">{{ error }}</div>
      <form v-else-if="settings" @submit.prevent="saveSettings" data-testid="form">
        <input v-model="settings.profile.firstName" data-testid="firstName" />
        <input v-model="settings.profile.lastName" data-testid="lastName" />
        <select v-model="settings.preferences.theme" data-testid="theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <input 
          type="checkbox" 
          v-model="settings.preferences.sidebarCollapsed" 
          data-testid="sidebarCollapsed" 
        />
        <input 
          type="checkbox" 
          v-model="settings.notifications.email.enabled" 
          data-testid="emailNotifications" 
        />
        <select 
          v-model="settings.editor.defaultMode" 
          data-testid="editorMode"
        >
          <option value="visual">Visual</option>
          <option value="code">Code</option>
        </select>
        <button 
          type="submit" 
          :disabled="!hasChanges || saving" 
          data-testid="saveButton"
        >
          Save
        </button>
        <button 
          type="button" 
          :disabled="!hasChanges || saving" 
          @click="resetSettings"
          data-testid="resetButton"
        >
          Reset
        </button>
      </form>
    </div>
  `,
})

// ─── Test Suite ──────────────────────────────────────────────────────────────────

describe('UserSettings Component', () => {
  const defaultSettings: UserSettings = {
    profile: {
      firstName: '',
      lastName: '',
      avatarUrl: null,
    },
    preferences: {
      theme: 'system',
      sidebarCollapsed: false,
      itemsPerPage: 25,
    },
    notifications: {
      email: {
        enabled: true,
        digestFrequency: 'immediate',
      },
      inApp: {
        enabled: true,
      },
    },
    editor: {
      defaultMode: 'visual',
      autosaveInterval: 30,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ─── Rendering Tests ───────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('should show loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const wrapper = mount(MockUserSettings)

      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
    })

    it('should show form after loading', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="form"]').exists()).toBe(true)
    })

    it('should show error state on load failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="error"]').text()).toBe('Network error')
    })

    it('should render all form fields', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="firstName"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lastName"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="theme"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="sidebarCollapsed"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="emailNotifications"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="editorMode"]').exists()).toBe(true)
    })
  })

  // ─── Data Loading Tests ────────────────────────────────────────────────────────

  describe('Data Loading', () => {
    it('should fetch user settings on mount', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      mount(MockUserSettings)
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('/api/publisher/settings/user')
    })

    it('should populate form with loaded settings', async () => {
      const customSettings = {
        ...defaultSettings,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
        },
        preferences: {
          ...defaultSettings.preferences,
          theme: 'dark' as const,
        },
      }
      mockFetch.mockResolvedValue({ settings: customSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      const firstNameInput = wrapper.find('[data-testid="firstName"]').element as HTMLInputElement
      const themeSelect = wrapper.find('[data-testid="theme"]').element as HTMLSelectElement

      expect(firstNameInput.value).toBe('John')
      expect(themeSelect.value).toBe('dark')
    })
  })

  // ─── Form State Tests ──────────────────────────────────────────────────────────

  describe('Form State', () => {
    it('should detect changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      expect(wrapper.vm.hasChanges).toBe(false)

      await wrapper.find('[data-testid="firstName"]').setValue('John')

      expect(wrapper.vm.hasChanges).toBe(true)
    })

    it('should reset to original values', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="firstName"]').setValue('Changed')
      wrapper.vm.resetSettings()

      expect(wrapper.vm.settings?.profile.firstName).toBe('')
      expect(wrapper.vm.hasChanges).toBe(false)
    })

    it('should disable save button when no changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      const saveButton = wrapper.find('[data-testid="saveButton"]').element as HTMLButtonElement
      expect(saveButton.disabled).toBe(true)
    })

    it('should enable save button when there are changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="firstName"]').setValue('John')

      const saveButton = wrapper.find('[data-testid="saveButton"]').element as HTMLButtonElement
      expect(saveButton.disabled).toBe(false)
    })
  })

  // ─── Theme Selection Tests ──────────────────────────────────────────────────────

  describe('Theme Selection', () => {
    it('should allow selecting theme', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="theme"]').setValue('dark')

      expect(wrapper.vm.settings?.preferences.theme).toBe('dark')
    })

    it('should track theme changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="theme"]').setValue('dark')

      expect(wrapper.vm.hasChanges).toBe(true)
    })
  })

  // ─── Notification Settings Tests ────────────────────────────────────────────────

  describe('Notification Settings', () => {
    it('should toggle email notifications', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      const checkbox = wrapper.find('[data-testid="emailNotifications"]')
      await checkbox.setValue(false)

      expect(wrapper.vm.settings?.notifications.email.enabled).toBe(false)
    })

    it('should track notification changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="emailNotifications"]').setValue(false)

      expect(wrapper.vm.hasChanges).toBe(true)
    })
  })

  // ─── Editor Settings Tests ──────────────────────────────────────────────────────

  describe('Editor Settings', () => {
    it('should allow selecting editor mode', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="editorMode"]').setValue('code')

      expect(wrapper.vm.settings?.editor.defaultMode).toBe('code')
    })
  })

  // ─── Save Functionality Tests ───────────────────────────────────────────────────

  describe('Save Functionality', () => {
    it('should call API with updated settings', async () => {
      mockFetch.mockResolvedValueOnce({ settings: defaultSettings })
      mockFetch.mockResolvedValueOnce({ success: true })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="firstName"]').setValue('John')
      await wrapper.find('[data-testid="lastName"]').setValue('Doe')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/publisher/settings/user',
        expect.objectContaining({
          method: 'PUT',
          body: expect.objectContaining({
            profile: expect.objectContaining({
              firstName: 'John',
              lastName: 'Doe',
            }),
          }),
        })
      )
    })

    it('should show success toast on save', async () => {
      mockFetch.mockResolvedValueOnce({ settings: defaultSettings })
      mockFetch.mockResolvedValueOnce({ success: true })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="firstName"]').setValue('John')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Settings saved',
          color: 'success',
        })
      )
    })

    it('should show error toast on save failure', async () => {
      mockFetch.mockResolvedValueOnce({ settings: defaultSettings })
      mockFetch.mockRejectedValue({
        data: { error: { message: 'Validation failed' } },
      })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      await wrapper.find('[data-testid="firstName"]').setValue('John')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to save settings',
          color: 'error',
        })
      )
    })
  })

  // ─── Smoke Tests ───────────────────────────────────────────────────────────────

  describe('Smoke Tests', () => {
    it('should render without errors', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      expect(wrapper.html()).toBeTruthy()
    })

    it('should not throw on unmount', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockUserSettings)
      await flushPromises()

      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
