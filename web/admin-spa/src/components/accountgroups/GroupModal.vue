<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="$emit('close')"
  >
    <div
      class="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800"
      @click.stop
    >
      <!-- 模态框头部 -->
      <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ isEditing ? '编辑分组' : '创建分组' }}
          </h3>
          <button
            class="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            @click="$emit('close')"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 模态框内容 -->
      <div class="max-h-[70vh] overflow-y-auto px-6 py-4">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- 基本信息 -->
          <div>
            <h4 class="mb-4 text-sm font-medium text-gray-900 dark:text-white">基本信息</h4>
            <div class="space-y-4">
              <!-- 分组名称 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  分组名称 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.name"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="例如: 高优先级账户组"
                  required
                  type="text"
                />
              </div>

              <!-- 平台 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  平台 <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.platform"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600"
                  :disabled="isEditing"
                  required
                >
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="bedrock">Bedrock</option>
                  <option value="azure">Azure</option>
                  <option value="droid">Droid</option>
                </select>
                <p v-if="isEditing" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  创建后不可更改平台
                </p>
              </div>

              <!-- 描述 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  描述
                </label>
                <textarea
                  v-model="formData.description"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="简要描述这个分组的用途..."
                  rows="2"
                ></textarea>
              </div>

              <!-- 优先级 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  优先级
                </label>
                <input
                  v-model.number="formData.priority"
                  class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  max="100"
                  min="0"
                  placeholder="0-100，数值越大优先级越高"
                  type="number"
                />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  数值越大优先级越高，默认为 0
                </p>
              </div>
            </div>
          </div>

          <!-- 轮转配置 -->
          <div>
            <div
              class="mb-4 flex items-center gap-2 rounded-lg bg-blue-50/50 p-3 dark:bg-blue-900/10"
            >
              <svg
                class="h-5 w-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">轮转配置（可选）</h4>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <!-- 时间窗口 (小时) -->
              <div
                class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
              >
                <div class="mb-3 flex items-center gap-2">
                  <svg
                    class="h-5 w-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    时间窗口（小时）
                  </label>
                </div>
                <input
                  v-model.number="formData.rotationConfig.maxHours"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-center text-lg font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  min="0"
                  placeholder="无限制"
                  step="0.01"
                  type="number"
                />
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">窗口内最大请求次数</p>
              </div>

              <!-- 费用限制 (美元) -->
              <div
                class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
              >
                <div class="mb-3 flex items-center gap-2">
                  <svg
                    class="h-5 w-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    费用限制（美元）
                  </label>
                </div>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-400"
                  >
                    $
                  </span>
                  <input
                    v-model.number="formData.rotationQuota.maxCost"
                    class="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-8 pr-3 text-center text-lg font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    min="0"
                    placeholder="无限制"
                    step="0.01"
                    type="number"
                  />
                </div>
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">窗口内最大费用</p>
              </div>

              <!-- 冷却时长 (小时) -->
              <div
                class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
              >
                <div class="mb-3 flex items-center gap-2">
                  <svg
                    class="h-5 w-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M11 19a8 8 0 100-16m0 16a8 8 0 010-16m0 16v-3.5m0-12.5v3.5M16 12h-5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    冷却时长（小时）
                  </label>
                </div>
                <input
                  v-model.number="formData.rotationConfig.cooldownHours"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-center text-lg font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  min="0"
                  placeholder="0"
                  step="0.01"
                  type="number"
                />
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">轮转后冷却时长</p>
              </div>
            </div>

            <!-- 配置说明 -->
            <div class="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/30">
              <div class="flex gap-2">
                <svg
                  class="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
                <div class="text-xs text-gray-600 dark:text-gray-400">
                  <p class="font-medium">使用示例</p>
                  <p class="mt-1">
                    <strong>示例1:</strong> 时间窗口=60，请求次数=1000 → 每60分钟最多1000次请求
                  </p>
                  <p class="mt-1">
                    <strong>示例2:</strong> 时间窗口=1，费用=0.1 → 每分钟最多$0.1费用
                  </p>
                  <p class="mt-1">
                    <strong>示例3:</strong> 窗口=30，请求=50，费用=5 → 每30分钟50次请求且不超$5费用
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- 模态框底部 -->
      <div class="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            type="button"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '保存中...' : isEditing ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { showToast } from '@/utils/toast'
import { apiClient as api } from '@/config/api'

const props = defineProps({
  group: {
    type: Object,
    default: null
  },
  platform: {
    type: String,
    default: 'claude'
  }
})

const emit = defineEmits(['close', 'success'])

// 状态
const submitting = ref(false)
const formData = ref({
  name: '',
  platform: props.platform,
  description: '',
  priority: 0,
  rotationQuota: {
    maxCost: 0
  },
  rotationConfig: {
    maxHours: 0,
    cooldownHours: 0
  }
})

// 计算属性
const isEditing = computed(() => !!props.group)

// 初始化表单数据
watch(
  () => props.group,
  (group) => {
    if (group) {
      formData.value = {
        name: group.name || '',
        platform: group.platform || props.platform,
        description: group.description || '',
        priority: group.priority || 0,
        rotationQuota: {
          maxCost: group.rotationQuota?.maxCost || 0
        },
        rotationConfig: {
          maxHours: group.rotationConfig?.maxHours || 0,
          cooldownHours: group.rotationConfig?.cooldownHours || 0
        }
      }
    } else {
      formData.value.platform = props.platform
    }
  },
  { immediate: true }
)

// 方法
const handleSubmit = async () => {
  // 验证必填字段
  if (!formData.value.name.trim()) {
    showToast('请输入分组名称', 'error')
    return
  }

  submitting.value = true
  try {
    // 准备提交数据（使用 weeklyQuota 字段名，后端会转换为 rotationQuota）
    const payload = {
      name: formData.value.name.trim(),
      platform: formData.value.platform,
      description: formData.value.description.trim(),
      priority: formData.value.priority || 0,
      weeklyQuota: {
        maxCost: formData.value.rotationQuota.maxCost || 0
      },
      rotationConfig: {
        maxHours: formData.value.rotationConfig.maxHours || 0,
        cooldownHours: formData.value.rotationConfig.cooldownHours || 0
      }
    }

    if (isEditing.value) {
      // 更新分组
      await api.put(`/admin/account-groups/${props.group.id}`, payload)
      showToast('分组更新成功', 'success')
    } else {
      // 创建分组
      await api.post('/admin/account-groups', payload)
      showToast('分组创建成功', 'success')
    }

    emit('success')
  } catch (error) {
    console.error('保存分组失败:', error)
    showToast('保存失败: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    submitting.value = false
  }
}
</script>
