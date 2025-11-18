<template>
  <div class="rotation-group-selector">
    <!-- 选择的分组列表 -->
    <div v-if="selectedGroups.length > 0" class="mb-4 space-y-2">
      <div
        v-for="(group, index) in selectedGroups"
        :key="group.id"
        class="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20"
      >
        <div class="flex flex-1 items-center gap-3">
          <!-- 排序序号 -->
          <div
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
          >
            {{ index + 1 }}
          </div>

          <!-- 分组信息 -->
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-800 dark:text-gray-100">{{ group.name }}</span>
              <span
                class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-800 dark:text-blue-200"
              >
                {{ group.platform }}
              </span>
            </div>
            <div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {{ group.memberCount || 0 }} 个账户
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-2">
          <!-- 上移 -->
          <button
            v-if="index > 0"
            class="rounded p-1 text-gray-500 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-800"
            type="button"
            @click="moveUp(index)"
          >
            <i class="fas fa-arrow-up text-sm" />
          </button>
          <!-- 下移 -->
          <button
            v-if="index < selectedGroups.length - 1"
            class="rounded p-1 text-gray-500 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-800"
            type="button"
            @click="moveDown(index)"
          >
            <i class="fas fa-arrow-down text-sm" />
          </button>
          <!-- 移除 -->
          <button
            class="rounded p-1 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
            type="button"
            @click="removeGroup(group.id)"
          >
            <i class="fas fa-times text-sm" />
          </button>
        </div>
      </div>
    </div>

    <!-- 可用分组列表 -->
    <div v-if="availableGroups.length > 0" class="space-y-2">
      <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">添加轮转分组：</div>
      <div
        class="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700"
      >
        <div
          v-for="group in availableGroups"
          :key="group.id"
          class="flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="addGroup(group)"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{
              group.name
            }}</span>
            <span
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            >
              {{ group.platform }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ group.memberCount || 0 }} 账户
            </span>
          </div>
          <i class="fas fa-plus text-sm text-gray-400" />
        </div>
      </div>
    </div>

    <!-- 没有可用分组提示 -->
    <div
      v-else-if="selectedGroups.length === 0"
      class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
    >
      <i class="fas fa-exclamation-triangle mr-1" />
      没有可用的分组。请先创建账户分组。
    </div>

    <!-- 验证提示 -->
    <div
      v-if="selectedGroups.length === 1"
      class="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs text-orange-700 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
    >
      <i class="fas fa-info-circle mr-1" />
      分组轮转至少需要选择 2 个分组
    </div>

    <div
      v-if="hasPlatformMismatch"
      class="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
    >
      <i class="fas fa-exclamation-circle mr-1" />
      所有分组必须是同一平台类型
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  groups: {
    type: Array,
    required: true
  },
  platform: {
    type: String,
    default: null // null表示不限制平台
  }
})

const emit = defineEmits(['update:modelValue'])

// 选中的分组ID列表
const selectedGroupIds = ref([...props.modelValue])

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    selectedGroupIds.value = [...newValue]
  }
)

// 监听内部值变化并同步到外部
watch(
  selectedGroupIds,
  (newValue) => {
    emit('update:modelValue', newValue)
  },
  { deep: true }
)

// 已选择的分组详情
const selectedGroups = computed(() => {
  return selectedGroupIds.value
    .map((id) => props.groups.find((g) => g.id === id))
    .filter((g) => g !== undefined)
})

// 可添加的分组（未选中且平台匹配）
const availableGroups = computed(() => {
  return props.groups.filter((group) => {
    // 排除已选中的
    if (selectedGroupIds.value.includes(group.id)) {
      return false
    }
    // 如果指定了平台，只显示该平台的分组
    if (props.platform && group.platform !== props.platform) {
      return false
    }
    // 如果已有选中的分组，只显示相同平台的
    if (selectedGroups.value.length > 0) {
      const firstPlatform = selectedGroups.value[0].platform
      return group.platform === firstPlatform
    }
    return true
  })
})

// 检查平台是否一致
const hasPlatformMismatch = computed(() => {
  if (selectedGroups.value.length <= 1) return false
  const platforms = new Set(selectedGroups.value.map((g) => g.platform))
  return platforms.size > 1
})

// 添加分组
const addGroup = (group) => {
  if (!selectedGroupIds.value.includes(group.id)) {
    selectedGroupIds.value.push(group.id)
  }
}

// 移除分组
const removeGroup = (groupId) => {
  const index = selectedGroupIds.value.indexOf(groupId)
  if (index > -1) {
    selectedGroupIds.value.splice(index, 1)
  }
}

// 上移
const moveUp = (index) => {
  if (index > 0) {
    const temp = selectedGroupIds.value[index]
    selectedGroupIds.value[index] = selectedGroupIds.value[index - 1]
    selectedGroupIds.value[index - 1] = temp
  }
}

// 下移
const moveDown = (index) => {
  if (index < selectedGroupIds.value.length - 1) {
    const temp = selectedGroupIds.value[index]
    selectedGroupIds.value[index] = selectedGroupIds.value[index + 1]
    selectedGroupIds.value[index + 1] = temp
  }
}
</script>

<style scoped>
.rotation-group-selector {
  @apply w-full;
}
</style>
