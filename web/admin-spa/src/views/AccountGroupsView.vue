<template>
  <div class="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
    <div class="mx-auto max-w-7xl">
      <!-- 页面头部 -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">账户组管理</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            管理账户分组、配置轮转策略和监控使用情况
          </p>
        </div>
        <button
          class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          @click="showCreateModal = true"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 4v16m8-8H4"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          创建分组
        </button>
      </div>

      <!-- 平台筛选 -->
      <div class="mb-6">
        <div class="flex gap-2">
          <button
            v-for="platform in platforms"
            :key="platform.value"
            :class="[
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              selectedPlatform === platform.value
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            ]"
            @click="selectedPlatform = platform.value"
          >
            {{ platform.label }}
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
        ></div>
      </div>

      <!-- 分组列表 -->
      <div v-else-if="filteredGroups.length > 0" class="space-y-4">
        <div
          v-for="(group, index) in filteredGroups"
          :key="group.id"
          class="overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md dark:bg-gray-800"
        >
          <div class="p-6">
            <!-- 分组头部 -->
            <div class="mb-4 flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <!-- 排序序号 -->
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {{ index + 1 }}
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ group.name }}
                  </h3>
                  <span
                    :class="[
                      'rounded-full px-3 py-1 text-xs font-medium',
                      getPlatformColor(group.platform)
                    ]"
                  >
                    {{ getPlatformLabel(group.platform) }}
                  </span>
                  <span
                    v-if="group.status"
                    :class="[
                      'rounded-full px-3 py-1 text-xs font-medium',
                      getStatusColor(group.status)
                    ]"
                  >
                    {{ getStatusLabel(group.status) }}
                  </span>
                </div>
                <p v-if="group.description" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {{ group.description }}
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  class="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  title="编辑"
                  @click="editGroup(group)"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  title="删除"
                  @click="deleteGroup(group)"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- 状态卡片网格 -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <!-- 成员数 -->
              <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div class="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  成员账户
                </div>
                <div class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {{ group.memberCount || 0 }}
                </div>
              </div>

              <!-- 剩余费用 -->
              <div
                :class="[
                  'rounded-lg p-4',
                  getCostStatus(group).status === 'danger'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : getCostStatus(group).status === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-gray-50 dark:bg-gray-700/50'
                ]"
              >
                <div class="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  剩余费用
                </div>
                <div
                  :class="[
                    'text-2xl font-semibold',
                    getCostStatus(group).status === 'danger'
                      ? 'text-red-600 dark:text-red-400'
                      : getCostStatus(group).status === 'warning'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-900 dark:text-white'
                  ]"
                >
                  ${{ formatCost(getCostStatus(group).remaining) }}
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  配额: ${{ formatCost(group.rotationQuota?.maxCost || 0) }}
                </div>
              </div>

              <!-- 剩余时间 -->
              <div
                :class="[
                  'rounded-lg p-4',
                  getTimeStatus(group).status === 'danger'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : getTimeStatus(group).status === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-gray-50 dark:bg-gray-700/50'
                ]"
              >
                <div class="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  剩余时间
                </div>
                <div
                  :class="[
                    'text-2xl font-semibold',
                    getTimeStatus(group).status === 'danger'
                      ? 'text-red-600 dark:text-red-400'
                      : getTimeStatus(group).status === 'warning'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-900 dark:text-white'
                  ]"
                >
                  {{ getTimeStatus(group).display }}
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  配额: {{ group.rotationConfig?.maxHours || 0 }}h
                </div>
              </div>

              <!-- 冷却状态 -->
              <div
                :class="[
                  'rounded-lg p-4',
                  getCooldownStatus(group).inCooldown
                    ? 'bg-orange-50 dark:bg-orange-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                ]"
              >
                <div class="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M11 19a8 8 0 100-16m0 16a8 8 0 010-16m0 16v-3.5m0-12.5v3.5M16 12h-5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  冷却状态
                </div>
                <div
                  :class="[
                    'text-2xl font-semibold',
                    getCooldownStatus(group).inCooldown
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-900 dark:text-white'
                  ]"
                >
                  {{ getCooldownStatus(group).display }}
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  配置: {{ group.rotationConfig?.cooldownHours || 0 }}h
                </div>
              </div>

              <!-- 优先级 -->
              <div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div class="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  优先级
                </div>
                <div class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {{ group.priority || 0 }}
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  排序: #{{ index + 1 }}
                </div>
              </div>
            </div>

            <!-- 使用进度条 -->
            <div v-if="group.rotationQuota?.maxCost > 0" class="mt-4">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-gray-600 dark:text-gray-400">费用使用进度</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ getCostPercent(group) }}%
                </span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  :class="[
                    'h-full transition-all duration-300',
                    getCostPercent(group) >= 90
                      ? 'bg-red-500'
                      : getCostPercent(group) >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  ]"
                  :style="{ width: getCostPercent(group) + '%' }"
                ></div>
              </div>
            </div>

            <!-- 查看成员按钮 -->
            <div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button
                class="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700"
                @click="toggleGroupMembers(group.id)"
              >
                <div class="flex items-center gap-2">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  <span>查看成员 ({{ group.memberCount || 0 }})</span>
                </div>
                <svg
                  :class="[
                    'h-5 w-5 transition-transform duration-200',
                    expandedGroups.has(group.id) ? 'rotate-90' : ''
                  ]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <!-- 成员列表（展开区域） -->
              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="expandedGroups.has(group.id)" class="mt-4">
                  <!-- 加载状态 -->
                  <div
                    v-if="loadingMembers.has(group.id)"
                    class="flex items-center justify-center py-8"
                  >
                    <div
                      class="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                    ></div>
                    <span class="ml-3 text-sm text-gray-600 dark:text-gray-400">加载成员中...</span>
                  </div>

                  <!-- 成员列表 -->
                  <div
                    v-else-if="groupMembers[group.id] && groupMembers[group.id].length > 0"
                    class="grid gap-3 sm:grid-cols-2"
                  >
                    <div
                      v-for="(member, memberIndex) in groupMembers[group.id]"
                      :key="member.id"
                      class="animate-fade-in rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
                      :style="{ animationDelay: `${memberIndex * 50}ms` }"
                    >
                      <div class="flex items-start justify-between">
                        <!-- 左侧：基本信息 -->
                        <div class="flex-1">
                          <div class="mb-2 flex items-center gap-2">
                            <!-- 平台图标和标签 -->
                            <span
                              :class="[
                                'rounded-full px-2 py-1 text-xs font-medium',
                                getAccountPlatformColor(member.platform)
                              ]"
                            >
                              {{ getAccountPlatformLabel(member.platform) }}
                            </span>
                            <!-- 状态徽章 -->
                            <span
                              v-if="member.status"
                              :class="[
                                'rounded-full px-2 py-1 text-xs font-medium',
                                getAccountStatusColor(member.status)
                              ]"
                            >
                              {{ getAccountStatusLabel(member.status) }}
                            </span>
                          </div>

                          <!-- 账户名称 -->
                          <h4
                            class="mb-1 text-sm font-semibold text-gray-900 dark:text-white"
                            :title="member.name"
                          >
                            {{ truncateText(member.name, 30) }}
                          </h4>

                          <!-- 账户描述 -->
                          <p
                            v-if="member.description"
                            class="text-xs text-gray-500 dark:text-gray-400"
                            :title="member.description"
                          >
                            {{ truncateText(member.description, 40) }}
                          </p>
                        </div>
                      </div>

                      <!-- 使用统计 -->
                      <div
                        class="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 dark:border-gray-700"
                      >
                        <!-- 总请求次数 -->
                        <div class="text-center">
                          <div
                            class="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                          >
                            <svg
                              class="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                              />
                            </svg>
                            请求
                          </div>
                          <div class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {{ formatNumber(member.usage?.totalRequests || 0) }}
                          </div>
                        </div>

                        <!-- 总费用 -->
                        <div class="text-center">
                          <div
                            class="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                          >
                            <svg
                              class="h-3 w-3"
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
                            费用
                          </div>
                          <div class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            ${{ formatCost(member.usage?.totalCost || 0) }}
                          </div>
                        </div>
                      </div>

                      <!-- 最后使用时间 -->
                      <div
                        v-if="member.lastUsedAt"
                        class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400"
                      >
                        最后使用: {{ formatRelativeTime(member.lastUsedAt) }}
                      </div>
                    </div>
                  </div>

                  <!-- 空状态 -->
                  <div
                    v-else
                    class="flex flex-col items-center justify-center rounded-lg bg-gray-50 py-8 dark:bg-gray-800/30"
                  >
                    <svg
                      class="h-12 w-12 text-gray-400 dark:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      />
                    </svg>
                    <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">暂无成员账户</p>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else
        class="flex flex-col items-center justify-center rounded-lg bg-white py-12 dark:bg-gray-800"
      >
        <svg
          class="h-16 w-16 text-gray-400 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        <p class="mt-4 text-gray-600 dark:text-gray-400">
          暂无 {{ getPlatformLabel(selectedPlatform) }} 分组
        </p>
        <button
          class="mt-4 text-sm text-blue-600 hover:underline dark:text-blue-400"
          @click="showCreateModal = true"
        >
          创建第一个分组
        </button>
      </div>
    </div>

    <!-- 创建/编辑分组模态框 -->
    <GroupModal
      v-if="showCreateModal || showEditModal"
      :group="editingGroup"
      :platform="selectedPlatform"
      @close="closeModals"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { showToast } from '@/utils/toast'
import GroupModal from '@/components/accountgroups/GroupModal.vue'
import { apiClient as api } from '@/config/api'

// 状态
const loading = ref(false)
const groups = ref([])
const selectedPlatform = ref('claude')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingGroup = ref(null)

// 成员列表相关状态
const expandedGroups = ref(new Set())
const groupMembers = ref({})
const loadingMembers = ref(new Set())

// 平台配置
const platforms = [
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'bedrock', label: 'Bedrock' },
  { value: 'azure', label: 'Azure' },
  { value: 'droid', label: 'Droid' }
]

// 计算属性
const filteredGroups = computed(() => {
  return groups.value
    .filter((g) => g.platform === selectedPlatform.value)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0)) // 按优先级降序排序
})

// 方法
const loadGroups = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/account-groups', {
      params: { platform: selectedPlatform.value }
    })
    // 后端返回 { success: true, data: [...] }
    // api.get 已经解析了 JSON，所以 response 就是 { success, data }
    groups.value = response.data || []
  } catch (error) {
    console.error('加载分组失败:', error)
    showToast('加载分组失败: ' + (error.response?.data?.error || error.message), 'error')
  } finally {
    loading.value = false
  }
}

const editGroup = (group) => {
  editingGroup.value = { ...group }
  showEditModal.value = true
}

const deleteGroup = async (group) => {
  if (!confirm(`确定要删除分组 "${group.name}" 吗？此操作不可恢复。`)) {
    return
  }

  try {
    await api.delete(`/admin/account-groups/${group.id}`)
    showToast('分组删除成功', 'success')
    await loadGroups()
  } catch (error) {
    console.error('删除分组失败:', error)
    showToast('删除分组失败: ' + (error.response?.data?.message || error.message), 'error')
  }
}

const closeModals = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingGroup.value = null
}

const handleSuccess = () => {
  closeModals()
  loadGroups()
}

// 成员列表相关方法
const toggleGroupMembers = async (groupId) => {
  if (expandedGroups.value.has(groupId)) {
    // 收起
    expandedGroups.value.delete(groupId)
  } else {
    // 展开并加载成员
    expandedGroups.value.add(groupId)
    if (!groupMembers.value[groupId]) {
      await loadGroupMembers(groupId)
    }
  }
}

const loadGroupMembers = async (groupId) => {
  loadingMembers.value.add(groupId)
  try {
    const response = await api.get(`/admin/account-groups/${groupId}/members`)
    groupMembers.value[groupId] = response.data || []
  } catch (error) {
    console.error('加载分组成员失败:', error)
    showToast('加载分组成员失败: ' + (error.response?.data?.error || error.message), 'error')
    groupMembers.value[groupId] = []
  } finally {
    loadingMembers.value.delete(groupId)
  }
}

// 工具函数
const getPlatformLabel = (platform) => {
  return platforms.find((p) => p.value === platform)?.label || platform
}

const getPlatformColor = (platform) => {
  const colors = {
    claude: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    gemini: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    openai: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    bedrock: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    azure: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    droid: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
  }
  return colors[platform] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cooldown: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    exhausted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const getStatusLabel = (status) => {
  const labels = {
    active: '活跃',
    cooldown: '冷却中',
    exhausted: '已耗尽'
  }
  return labels[status] || status
}

const formatCost = (cost) => {
  return typeof cost === 'number' ? cost.toFixed(2) : '0.00'
}

const getCostPercent = (group) => {
  if (!group.usage?.totalCost || !group.rotationQuota?.maxCost) return 0
  return Math.min(100, Math.round((group.usage.totalCost / group.rotationQuota.maxCost) * 100))
}

// 获取费用状态
const getCostStatus = (group) => {
  const maxCost = group.rotationQuota?.maxCost || 0
  const usedCost = group.usage?.totalCost || 0
  const remaining = Math.max(0, maxCost - usedCost)
  const percent = maxCost > 0 ? (usedCost / maxCost) * 100 : 0

  let status = 'normal'
  if (percent >= 90) status = 'danger'
  else if (percent >= 70) status = 'warning'

  return {
    remaining,
    used: usedCost,
    max: maxCost,
    percent: Math.round(percent),
    status
  }
}

// 获取时间状态
const getTimeStatus = (group) => {
  const maxHours = group.rotationConfig?.maxHours || 0
  const startTime = group.rotationStartedAt ? new Date(group.rotationStartedAt) : null
  const now = new Date()

  if (!startTime || maxHours === 0) {
    return {
      display: '无限制',
      remaining: Infinity,
      status: 'normal'
    }
  }

  const elapsedMs = now - startTime
  const elapsedHours = elapsedMs / (1000 * 60 * 60)
  const remainingHours = Math.max(0, maxHours - elapsedHours)
  const percent = (elapsedHours / maxHours) * 100

  let status = 'normal'
  if (percent >= 90) status = 'danger'
  else if (percent >= 70) status = 'warning'

  // 格式化显示
  let display
  if (remainingHours >= 1) {
    display = `${remainingHours.toFixed(1)}h`
  } else {
    const remainingMinutes = Math.round(remainingHours * 60)
    display = `${remainingMinutes}m`
  }

  return {
    display,
    remaining: remainingHours,
    elapsed: elapsedHours,
    max: maxHours,
    percent: Math.round(percent),
    status
  }
}

// 获取冷却状态
const getCooldownStatus = (group) => {
  const cooldownUntil = group.cooldownUntil ? new Date(group.cooldownUntil) : null
  const now = new Date()

  if (!cooldownUntil || cooldownUntil <= now) {
    return {
      inCooldown: false,
      display: '就绪',
      remaining: 0
    }
  }

  const remainingMs = cooldownUntil - now
  const remainingHours = remainingMs / (1000 * 60 * 60)

  // 格式化显示
  let display
  if (remainingHours >= 1) {
    display = `${remainingHours.toFixed(1)}h`
  } else {
    const remainingMinutes = Math.round(remainingHours * 60)
    display = `${remainingMinutes}m`
  }

  return {
    inCooldown: true,
    display,
    remaining: remainingHours,
    until: cooldownUntil
  }
}

// 账户相关工具函数
const getAccountPlatformLabel = (platform) => {
  const labels = {
    'claude-oauth': 'Claude OAuth',
    'claude-console': 'Claude Console',
    gemini: 'Gemini',
    openai: 'OpenAI',
    'openai-responses': 'OpenAI Responses',
    droid: 'Droid',
    bedrock: 'Bedrock',
    'azure-openai': 'Azure OpenAI',
    ccr: 'CCR'
  }
  return labels[platform] || platform
}

const getAccountPlatformColor = (platform) => {
  const colors = {
    'claude-oauth': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'claude-console': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    gemini: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    openai: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'openai-responses': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    droid: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    bedrock: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'azure-openai': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    ccr: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  }
  return colors[platform] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const getAccountStatusLabel = (status) => {
  const labels = {
    active: '活跃',
    inactive: '未激活',
    error: '错误',
    unauthorized: '未授权',
    disabled: '已禁用',
    overloaded: '过载'
  }
  return labels[status] || status
}

const getAccountStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    unauthorized: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    disabled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    overloaded: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  }
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'N/A'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

// 生命周期
onMounted(() => {
  loadGroups()
})

// 监听平台切换
watch(selectedPlatform, () => {
  loadGroups()
})
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
  opacity: 0;
}
</style>
