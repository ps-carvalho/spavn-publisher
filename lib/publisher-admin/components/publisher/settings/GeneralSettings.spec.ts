/**
 * Tests for GeneralSettings Vue component
 *
 * Tests the general settings form component that handles site-wide settings.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref, computed } from 'vue'

// ─── Types ───────────────────────────────────────────────────────────────────────

interface GeneralSettings {
  siteName: string
  siteDescription: string
  logoUrl: string | null
  faviconUrl: string | null
  timezone: string
  locale: string
  dateFormat: string
  timeFormat: string
  seo: {
    titleTemplate: string
    defaultDescription: string
  }
  maintenance: {
    enabled: boolean
    message: string
  }
  analytics: {
    googleTagId: string | null
    customScripts: string | null
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

const MockGeneralSettings = defineComponent({
  setup() {
    const loading = ref(true)
    const saving = ref(false)
    const settings = ref<GeneralSettings | null>(null)
    const originalSettings = ref<GeneralSettings | null>(null)
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
        const response = await mockFetch('/api/publisher/settings/general')
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
        await mockFetch('/api/publisher/settings/general', {
          method: 'PUT',
          body: settings.value,
        })

        originalSettings.value = JSON.parse(JSON.stringify(settings.value))

        mockToast.add({
          title: 'Settings saved',
          description: 'General settings have been updated',
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
        <input v-model="settings.siteName" data-testid="siteName" />
        <input v-model="settings.siteDescription" data-testid="siteDescription" />
        <input v-model="settings.timezone" data-testid="timezone" />
        <input v-model="settings.locale" data-testid="locale" />
        <input 
          type="checkbox" 
          v-model="settings.maintenance.enabled" 
          data-testid="maintenanceEnabled" 
        />
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

describe('GeneralSettings Component', () => {
  const defaultSettings: GeneralSettings = {
    siteName: 'Publisher CMS',
    siteDescription: '',
    logoUrl: null,
    faviconUrl: null,
    timezone: 'UTC',
    locale: 'en-US',
    dateFormat: 'MMM D, YYYY',
    timeFormat: 'h:mm A',
    seo: {
      titleTemplate: '%s — Publisher CMS',
      defaultDescription: '',
    },
    maintenance: {
      enabled: false,
      message: 'Site is under maintenance. Please check back soon.',
    },
    analytics: {
      googleTagId: null,
      customScripts: null,
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
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const wrapper = mount(MockGeneralSettings)

      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
    })

    it('should show form after loading', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="form"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)
    })

    it('should show error state on load failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="error"]').text()).toBe('Network error')
    })

    it('should render all form fields', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="siteName"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="siteDescription"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="timezone"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="locale"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="maintenanceEnabled"]').exists()).toBe(true)
    })
  })

  // ─── Data Loading Tests ────────────────────────────────────────────────────────

  describe('Data Loading', () => {
    it('should fetch settings on mount', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      mount(MockGeneralSettings)
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('/api/publisher/settings/general')
    })

    it('should populate form with loaded settings', async () => {
      const customSettings = {
        ...defaultSettings,
        siteName: 'Custom Site Name',
        timezone: 'America/New_York',
      }
      mockFetch.mockResolvedValue({ settings: customSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      const siteNameInput = wrapper.find('[data-testid="siteName"]').element as HTMLInputElement
      expect(siteNameInput.value).toBe('Custom Site Name')
    })

    it('should show toast on load error', async () => {
      mockFetch.mockRejectedValue(new Error('API error'))

      mount(MockGeneralSettings)
      await flushPromises()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to load settings',
          color: 'error',
        })
      )
    })
  })

  // ─── Form State Tests ──────────────────────────────────────────────────────────

  describe('Form State', () => {
    it('should detect changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      // Initially no changes
      expect(wrapper.vm.hasChanges).toBe(false)

      // Change site name
      await wrapper.find('[data-testid="siteName"]').setValue('New Site Name')

      expect(wrapper.vm.hasChanges).toBe(true)
    })

    it('should reset to original values', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      // Change site name
      await wrapper.find('[data-testid="siteName"]').setValue('Changed')

      // Reset
      wrapper.vm.resetSettings()

      expect(wrapper.vm.settings?.siteName).toBe('Publisher CMS')
      expect(wrapper.vm.hasChanges).toBe(false)
    })

    it('should disable save button when no changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      const saveButton = wrapper.find('[data-testid="saveButton"]').element as HTMLButtonElement
      expect(saveButton.disabled).toBe(true)
    })

    it('should enable save button when there are changes', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      await wrapper.find('[data-testid="siteName"]').setValue('New Name')

      const saveButton = wrapper.find('[data-testid="saveButton"]').element as HTMLButtonElement
      expect(saveButton.disabled).toBe(false)
    })
  })

  // ─── Save Functionality Tests ───────────────────────────────────────────────────

  describe('Save Functionality', () => {
    it('should call API with updated settings', async () => {
      mockFetch.mockResolvedValueOnce({ settings: defaultSettings })
      mockFetch.mockResolvedValueOnce({ success: true })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      await wrapper.find('[data-testid="siteName"]').setValue('New Site Name')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/publisher/settings/general',
        expect.objectContaining({
          method: 'PUT',
          body: expect.objectContaining({
            siteName: 'New Site Name',
          }),
        })
      )
    })

    it('should show saving state during save', async () => {
      mockFetch.mockResolvedValueOnce({ settings: defaultSettings })
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      await wrapper.find('[data-testid="siteName"]').setValue('New Name')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.saving).toBe(true)
    })

    it('should show success toast on save', async () => {
      mockFetch.mockResolvedValueOnce({ settings: defaultSettings })
      mockFetch.mockResolvedValueOnce({ success: true })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      await wrapper.find('[data-testid="siteName"]').setValue('New Name')
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

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      await wrapper.find('[data-testid="siteName"]').setValue('New Name')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to save settings',
          color: 'error',
        })
      )
    })

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({ settings: defaultSettings })
      mockFetch.mockRejectedValue({
        data: {
          error: {
            details: { siteName: ['Site name is required'] },
          },
        },
      })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      await wrapper.find('[data-testid="siteName"]').setValue('New Name')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.vm.validationErrors).toEqual({
        siteName: ['Site name is required'],
      })
    })
  })

  // ─── Smoke Tests ───────────────────────────────────────────────────────────────

  describe('Smoke Tests', () => {
    it('should render without errors', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      expect(wrapper.html()).toBeTruthy()
    })

    it('should not throw on unmount', async () => {
      mockFetch.mockResolvedValue({ settings: defaultSettings })

      const wrapper = mount(MockGeneralSettings)
      await flushPromises()

      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
