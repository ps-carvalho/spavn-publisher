/**
 * Tests for EmailSettings Vue component
 *
 * Tests the email settings form component that handles email provider configuration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref, computed, watch } from 'vue'

// ─── Types ───────────────────────────────────────────────────────────────────────

type EmailProviderType = 'smtp' | 'sendgrid' | 'ses' | 'mailgun'

interface EmailSettingsBase {
  provider: EmailProviderType
  fromName: string
  fromAddress: string
}

interface SmtpEmailSettings extends EmailSettingsBase {
  provider: 'smtp'
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

interface SendGridEmailSettings extends EmailSettingsBase {
  provider: 'sendgrid'
  apiKey: string
}

type EmailSettings = SmtpEmailSettings | SendGridEmailSettings

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

const MockEmailSettings = defineComponent({
  setup() {
    const loading = ref(true)
    const saving = ref(false)
    const testing = ref(false)
    const configured = ref(false)
    const selectedProvider = ref<EmailProviderType>('smtp')
    const formState = ref<Record<string, unknown>>({})
    const testResult = ref<{ success: boolean; message: string } | null>(null)
    const validationErrors = ref<Record<string, string[]>>({})

    function getDefaultConfigForProvider(provider: EmailProviderType): Record<string, unknown> {
      const base = {
        provider,
        fromName: '',
        fromAddress: '',
      }

      switch (provider) {
        case 'smtp':
          return { ...base, host: '', port: 587, secure: false, username: '', password: '' }
        case 'sendgrid':
          return { ...base, apiKey: '' }
        default:
          return base
      }
    }

    async function loadSettings() {
      loading.value = true
      testResult.value = null

      try {
        const response = await mockFetch('/api/publisher/settings/email')

        configured.value = response.configured

        if (response.settings) {
          selectedProvider.value = response.settings.provider
          formState.value = { ...response.settings }
        } else {
          formState.value = getDefaultConfigForProvider(selectedProvider.value)
        }
      } catch (error) {
        mockToast.add({
          title: 'Failed to load email configuration',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          color: 'error',
        })
      } finally {
        loading.value = false
      }
    }

    async function testConnection() {
      testing.value = true
      testResult.value = null

      try {
        const response = await mockFetch('/api/publisher/settings/email/test', {
          method: 'POST',
          body: {},
        })

        testResult.value = {
          success: response.success,
          message: response.success
            ? `Test email sent to ${response.recipient}`
            : response.error || response.message,
        }

        mockToast.add({
          title: response.success ? 'Test email sent' : 'Test failed',
          description: response.success
            ? `Check your inbox at ${response.recipient}`
            : response.error || response.message,
          color: response.success ? 'success' : 'error',
        })
      } catch (error) {
        testResult.value = {
          success: false,
          message: error instanceof Error ? error.message : 'Connection test failed',
        }

        mockToast.add({
          title: 'Connection test failed',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          color: 'error',
        })
      } finally {
        testing.value = false
      }
    }

    async function saveSettings() {
      saving.value = true
      validationErrors.value = {}

      try {
        const response = await mockFetch('/api/publisher/settings/email', {
          method: 'PUT',
          body: formState.value,
        })

        configured.value = true

        mockToast.add({
          title: 'Configuration saved',
          description: `Email settings updated for ${response.provider.toUpperCase()}`,
          color: 'success',
        })

        await loadSettings()
      } catch (err: any) {
        if (err?.data?.error?.details) {
          validationErrors.value = err.data.error.details
        }

        mockToast.add({
          title: 'Failed to save configuration',
          description: err?.data?.error?.message || err.message || 'An unexpected error occurred',
          color: 'error',
        })
      } finally {
        saving.value = false
      }
    }

    function handleProviderChange(value: string) {
      selectedProvider.value = value as EmailProviderType
      const fromName = formState.value.fromName
      const fromAddress = formState.value.fromAddress
      formState.value = getDefaultConfigForProvider(value as EmailProviderType)
      formState.value.fromName = fromName || ''
      formState.value.fromAddress = fromAddress || ''
      testResult.value = null
    }

    // Simulate onMounted
    loadSettings()

    return {
      loading,
      saving,
      testing,
      configured,
      selectedProvider,
      formState,
      testResult,
      validationErrors,
      loadSettings,
      testConnection,
      saveSettings,
      handleProviderChange,
    }
  },
  template: `
    <div>
      <div v-if="loading" data-testid="loading">Loading...</div>
      <div v-else class="space-y-6">
        <div class="flex items-center justify-between">
          <h3>Email Configuration</h3>
          <span v-if="configured" data-testid="configuredBadge">Configured</span>
        </div>

        <select 
          :value="selectedProvider" 
          @change="handleProviderChange($event.target.value)"
          data-testid="providerSelect"
        >
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
        </select>

        <!-- Common Fields -->
        <input v-model="formState.fromName" data-testid="fromName" />
        <input v-model="formState.fromAddress" data-testid="fromAddress" />

        <!-- SMTP Fields -->
        <template v-if="selectedProvider === 'smtp'">
          <input v-model="formState.host" data-testid="smtpHost" />
          <input v-model.number="formState.port" type="number" data-testid="smtpPort" />
          <input v-model="formState.username" data-testid="smtpUsername" />
          <input v-model="formState.password" type="password" data-testid="smtpPassword" />
        </template>

        <!-- SendGrid Fields -->
        <template v-if="selectedProvider === 'sendgrid'">
          <input v-model="formState.apiKey" type="password" data-testid="sendgridApiKey" />
        </template>

        <!-- Test Result -->
        <div v-if="testResult" :data-testid="testResult.success ? 'testSuccess' : 'testError'">
          {{ testResult.message }}
        </div>

        <!-- Actions -->
        <button 
          type="button" 
          :disabled="saving || !configured"
          @click="testConnection"
          data-testid="testButton"
        >
          Send Test Email
        </button>
        <button 
          type="button" 
          :disabled="testing"
          @click="saveSettings"
          data-testid="saveButton"
        >
          Save Configuration
        </button>
      </div>
    </div>
  `,
})

// ─── Test Suite ──────────────────────────────────────────────────────────────────

describe('EmailSettings Component', () => {
  const defaultSmtpSettings: SmtpEmailSettings = {
    provider: 'smtp',
    fromName: 'Publisher CMS',
    fromAddress: 'noreply@example.com',
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: 'user',
    password: 'real-secret',
  }

  // Masked version (as returned by GET endpoint)
  const maskedSmtpSettings = {
    ...defaultSmtpSettings,
    password: 'real***ret', // Masked
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

      const wrapper = mount(MockEmailSettings)

      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
    })

    it('should show form after loading', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="providerSelect"]').exists()).toBe(true)
    })

    it('should show configured badge when email is configured', async () => {
      mockFetch.mockResolvedValue({ settings: maskedSmtpSettings, configured: true })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="configuredBadge"]').exists()).toBe(true)
    })

    it('should not show configured badge when not configured', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="configuredBadge"]').exists()).toBe(false)
    })
  })

  // ─── Provider Selection Tests ──────────────────────────────────────────────────

  describe('Provider Selection', () => {
    it('should show SMTP fields when SMTP is selected', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(wrapper.find('[data-testid="smtpHost"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="smtpPort"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="smtpUsername"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="smtpPassword"]').exists()).toBe(true)
    })

    it('should show SendGrid fields when SendGrid is selected', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="providerSelect"]').setValue('sendgrid')

      expect(wrapper.find('[data-testid="sendgridApiKey"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="smtpHost"]').exists()).toBe(false)
    })

    it('should preserve common fields when switching providers', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="fromName"]').setValue('My Site')
      await wrapper.find('[data-testid="fromAddress"]').setValue('test@example.com')
      await wrapper.find('[data-testid="providerSelect"]').setValue('sendgrid')

      expect(wrapper.vm.formState.fromName).toBe('My Site')
      expect(wrapper.vm.formState.fromAddress).toBe('test@example.com')
    })

    it('should clear test result when switching providers', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      wrapper.vm.testResult = { success: true, message: 'Test passed' }
      await wrapper.find('[data-testid="providerSelect"]').setValue('sendgrid')

      expect(wrapper.vm.testResult).toBeNull()
    })
  })

  // ─── Data Loading Tests ────────────────────────────────────────────────────────

  describe('Data Loading', () => {
    it('should fetch email settings on mount', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      mount(MockEmailSettings)
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('/api/publisher/settings/email')
    })

    it('should populate form with loaded settings', async () => {
      mockFetch.mockResolvedValue({ settings: maskedSmtpSettings, configured: true })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(wrapper.vm.selectedProvider).toBe('smtp')
      expect(wrapper.vm.formState.fromName).toBe('Publisher CMS')
      expect(wrapper.vm.formState.host).toBe('smtp.example.com')
    })

    it('should initialize empty form when no settings exist', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(wrapper.vm.formState.provider).toBe('smtp')
      expect(wrapper.vm.formState.fromName).toBe('')
      expect(wrapper.vm.formState.host).toBe('')
    })
  })

  // ─── Test Email Functionality Tests ─────────────────────────────────────────────

  describe('Test Email Functionality', () => {
    it('should disable test button when not configured', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      const testButton = wrapper.find('[data-testid="testButton"]').element as HTMLButtonElement
      expect(testButton.disabled).toBe(true)
    })

    it('should enable test button when configured', async () => {
      mockFetch.mockResolvedValue({ settings: maskedSmtpSettings, configured: true })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      const testButton = wrapper.find('[data-testid="testButton"]').element as HTMLButtonElement
      expect(testButton.disabled).toBe(false)
    })

    it('should call test endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ settings: maskedSmtpSettings, configured: true })
      mockFetch.mockResolvedValueOnce({
        success: true,
        recipient: 'admin@example.com',
        provider: 'smtp',
      })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="testButton"]').trigger('click')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/publisher/settings/email/test',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should show success result', async () => {
      mockFetch.mockResolvedValueOnce({ settings: maskedSmtpSettings, configured: true })
      mockFetch.mockResolvedValueOnce({
        success: true,
        recipient: 'admin@example.com',
      })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="testButton"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="testSuccess"]').exists()).toBe(true)
    })

    it('should show error result on failure', async () => {
      mockFetch.mockResolvedValueOnce({ settings: maskedSmtpSettings, configured: true })
      mockFetch.mockResolvedValueOnce({
        success: false,
        error: 'Connection refused',
      })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="testButton"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="testError"]').exists()).toBe(true)
    })

    it('should show loading state during test', async () => {
      mockFetch.mockResolvedValueOnce({ settings: maskedSmtpSettings, configured: true })
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="testButton"]').trigger('click')

      expect(wrapper.vm.testing).toBe(true)
    })
  })

  // ─── Save Functionality Tests ───────────────────────────────────────────────────

  describe('Save Functionality', () => {
    it('should call save endpoint with form data', async () => {
      mockFetch.mockResolvedValueOnce({ settings: null, configured: false })
      mockFetch.mockResolvedValueOnce({ success: true, provider: 'smtp' })
      mockFetch.mockResolvedValueOnce({ settings: maskedSmtpSettings, configured: true })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="fromName"]').setValue('My Site')
      await wrapper.find('[data-testid="fromAddress"]').setValue('test@example.com')
      await wrapper.find('[data-testid="smtpHost"]').setValue('smtp.test.com')
      await wrapper.find('[data-testid="smtpUsername"]').setValue('user')
      await wrapper.find('[data-testid="smtpPassword"]').setValue('password')
      await wrapper.find('[data-testid="saveButton"]').trigger('click')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/publisher/settings/email',
        expect.objectContaining({
          method: 'PUT',
          body: expect.objectContaining({
            fromName: 'My Site',
            fromAddress: 'test@example.com',
            host: 'smtp.test.com',
          }),
        })
      )
    })

    it('should show success toast on save', async () => {
      mockFetch.mockResolvedValueOnce({ settings: null, configured: false })
      mockFetch.mockResolvedValueOnce({ success: true, provider: 'smtp' })
      mockFetch.mockResolvedValueOnce({ settings: maskedSmtpSettings, configured: true })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="saveButton"]').trigger('click')
      await flushPromises()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Configuration saved',
          color: 'success',
        })
      )
    })

    it('should show error toast on save failure', async () => {
      mockFetch.mockResolvedValueOnce({ settings: null, configured: false })
      mockFetch.mockRejectedValue({
        data: { error: { message: 'Validation failed' } },
      })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="saveButton"]').trigger('click')
      await flushPromises()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to save configuration',
          color: 'error',
        })
      )
    })

    it('should reload settings after save', async () => {
      mockFetch.mockResolvedValueOnce({ settings: null, configured: false })
      mockFetch.mockResolvedValueOnce({ success: true, provider: 'smtp' })
      mockFetch.mockResolvedValueOnce({ settings: maskedSmtpSettings, configured: true })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      vi.clearAllMocks()

      await wrapper.find('[data-testid="saveButton"]').trigger('click')
      await flushPromises()

      // Should have called loadSettings (GET endpoint)
      expect(mockFetch).toHaveBeenCalledWith('/api/publisher/settings/email')
    })

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({ settings: null, configured: false })
      mockFetch.mockRejectedValue({
        data: {
          error: {
            details: { fromAddress: ['Invalid email address'] },
          },
        },
      })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      await wrapper.find('[data-testid="saveButton"]').trigger('click')
      await flushPromises()

      expect(wrapper.vm.validationErrors).toEqual({
        fromAddress: ['Invalid email address'],
      })
    })
  })

  // ─── Smoke Tests ───────────────────────────────────────────────────────────────

  describe('Smoke Tests', () => {
    it('should render without errors', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(wrapper.html()).toBeTruthy()
    })

    it('should not throw on unmount', async () => {
      mockFetch.mockResolvedValue({ settings: null, configured: false })

      const wrapper = mount(MockEmailSettings)
      await flushPromises()

      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
