const logger = require('../utils/logger')
const redis = require('../models/redis')
const accountGroupService = require('./accountGroupService')

/**
 * 分组轮转服务
 * 管理API Key的分组轮转策略，通过费用配额和冷却期控制分组使用
 */
class GroupRotationService {
  /**
   * 检查分组是否可用
   * @param {string} groupId - 分组ID
   * @returns {Promise<{available: boolean, reason: string|null, usage?: Object}>}
   */
  async checkGroupAvailability(groupId) {
    try {
      // 1. 检查是否在冷却期
      const inCooldown = await redis.isGroupInCooldown(groupId)
      if (inCooldown) {
        const cooldownUntil = await redis.getGroupCooldownUntil(groupId)
        return {
          available: false,
          reason: 'cooldown',
          cooldownUntil
        }
      }

      // 2. 获取分组配置
      const group = await accountGroupService.getGroup(groupId)
      if (!group) {
        return { available: false, reason: 'group_not_found' }
      }

      // 如果没有配置轮转配额，直接返回可用
      if (!group.rotationQuota || !group.rotationQuota.maxCost) {
        return { available: true }
      }

      // 3. 获取当前轮次使用统计
      const usage = await redis.getGroupRotationUsage(groupId)

      // 4. 检查时间限制（如果有startTime）
      const config = group.rotationConfig
      if (config && config.maxHours > 0 && usage.startTime) {
        const startTime = new Date(usage.startTime)
        const now = new Date()
        const elapsedHours = (now - startTime) / (1000 * 3600)

        if (elapsedHours >= config.maxHours) {
          return {
            available: false,
            reason: 'time_exhausted',
            usage,
            quota: group.rotationQuota,
            elapsedHours,
            maxHours: config.maxHours
          }
        }
      }

      // 5. 检查费用限制
      const quota = group.rotationQuota

      if (quota.maxCost > 0 && usage.totalCost >= quota.maxCost) {
        return {
          available: false,
          reason: 'cost_exhausted',
          usage,
          quota
        }
      }

      return {
        available: true,
        usage,
        quota
      }
    } catch (error) {
      logger.error(`检查分组 ${groupId} 可用性失败:`, error)
      return { available: false, reason: 'check_error', error: error.message }
    }
  }

  /**
   * 记录使用并检查是否需要轮转
   * @param {string} groupId - 分组ID
   * @param {Object} usageData - 使用数据
   * @param {number} usageData.cost - 费用（美元）
   * @param {number} usageData.tokens - Tokens数
   * @returns {Promise<{shouldRotate: boolean, reason?: string}>}
   */
  async trackUsageAndCheckRotation(groupId, usageData) {
    try {
      // 1. 累加使用量
      await redis.incrementGroupRotationUsage(groupId, {
        cost: usageData.cost || 0,
        tokens: usageData.tokens || 0
      })

      // 2. 重新检查配额和时间限制
      const checkResult = await this.checkGroupAvailability(groupId)
      const { available, reason, usage, quota, elapsedHours, maxHours } = checkResult

      if (!available && (reason === 'cost_exhausted' || reason === 'time_exhausted')) {
        // 标记为已耗尽
        await redis.markGroupExhausted(groupId, reason)

        // 获取冷却时长配置
        const group = await accountGroupService.getGroup(groupId)
        const cooldownHours = group.rotationConfig?.cooldownHours || 12 // 默认12小时

        // 进入冷却期
        await redis.setGroupCooldown(groupId, cooldownHours)

        const cooldownUntil = new Date(Date.now() + cooldownHours * 3600 * 1000)

        if (reason === 'cost_exhausted') {
          logger.warn(
            `🔄 分组 ${groupId} 费用配额已耗尽 (${usage.totalCost.toFixed(2)}/${quota.maxCost} USD)，进入冷却期 ${cooldownHours}小时，至 ${cooldownUntil.toISOString()}`
          )
        } else if (reason === 'time_exhausted') {
          logger.warn(
            `🔄 分组 ${groupId} 使用时长已达上限 (${elapsedHours.toFixed(2)}/${maxHours} 小时)，进入冷却期 ${cooldownHours}小时，至 ${cooldownUntil.toISOString()}`
          )
        }

        return { shouldRotate: true, reason }
      }

      return { shouldRotate: false }
    } catch (error) {
      logger.error(`记录分组 ${groupId} 使用并检查轮转失败:`, error)
      // 出错时不轮转，避免影响正常使用
      return { shouldRotate: false, error: error.message }
    }
  }

  /**
   * 轮转到下一个可用分组
   * @param {string} apiKeyId - API Key ID
   * @param {Object} apiKeyData - API Key数据
   * @returns {Promise<{success: boolean, groupId?: string, index?: number, reason?: string}>}
   */
  async rotateToNextGroup(apiKeyId, apiKeyData) {
    try {
      const { groupRotation } = apiKeyData

      if (!groupRotation || !groupRotation.enabled) {
        return { success: false, reason: 'rotation_not_enabled' }
      }

      const totalGroups = groupRotation.groups.length
      let currentIndex = groupRotation.currentIndex || 0
      let attempts = 0

      // 尝试找到下一个可用分组
      while (attempts < totalGroups) {
        currentIndex = (currentIndex + 1) % totalGroups
        const nextGroup = groupRotation.groups[currentIndex]

        const { available, reason } = await this.checkGroupAvailability(nextGroup.groupId)

        if (available) {
          // 更新 API Key 的当前分组索引
          const client = redis.getClientSafe()
          const keyData = await client.hgetall(`apikey:${apiKeyId}`)

          if (keyData && keyData.groupRotation) {
            const rotation = JSON.parse(keyData.groupRotation)
            rotation.currentIndex = currentIndex
            await client.hset(`apikey:${apiKeyId}`, 'groupRotation', JSON.stringify(rotation))
          }

          logger.info(
            `🔄 API Key ${apiKeyId} (${apiKeyData.name}) 轮转到分组 ${nextGroup.groupId} (索引 ${currentIndex})`
          )

          return {
            success: true,
            groupId: nextGroup.groupId,
            index: currentIndex,
            groupName: nextGroup.name || nextGroup.groupId
          }
        }

        logger.debug(`分组 ${nextGroup.groupId} 不可用 (${reason})，尝试下一个`)
        attempts++
      }

      // 所有分组都不可用
      logger.warn(`⚠️ API Key ${apiKeyId} (${apiKeyData.name}) 的所有分组都已冷却，服务停止`)

      return { success: false, reason: 'all_groups_exhausted' }
    } catch (error) {
      logger.error(`API Key ${apiKeyId} 轮转分组失败:`, error)
      return { success: false, reason: 'rotation_error', error: error.message }
    }
  }

  /**
   * 获取当前应该使用的分组
   * @param {Object} apiKeyData - API Key数据
   * @returns {Promise<Object|null>} 当前分组信息，如果无可用分组则返回null
   */
  async getCurrentGroup(apiKeyData) {
    try {
      const { groupRotation } = apiKeyData

      if (!groupRotation || !groupRotation.enabled) {
        return null
      }

      const currentIndex = groupRotation.currentIndex || 0
      const currentGroup = groupRotation.groups[currentIndex]

      if (!currentGroup) {
        logger.error(
          `API Key ${apiKeyData.id} 的分组轮转配置异常：当前索引 ${currentIndex} 超出范围`
        )
        return null
      }

      // 检查当前分组是否可用
      const { available, reason } = await this.checkGroupAvailability(currentGroup.groupId)

      if (!available) {
        logger.info(
          `API Key ${apiKeyData.id} 的当前分组 ${currentGroup.groupId} 不可用 (${reason})，尝试轮转`
        )

        // 尝试轮转到下一个可用分组
        const rotationResult = await this.rotateToNextGroup(apiKeyData.id, apiKeyData)

        if (!rotationResult.success) {
          logger.warn(
            `API Key ${apiKeyData.id} 无法找到可用分组: ${rotationResult.reason || 'unknown'}`
          )
          return null // 无可用分组
        }

        // 返回轮转后的新分组
        return {
          ...groupRotation.groups[rotationResult.index],
          _rotated: true,
          _previousIndex: currentIndex
        }
      }

      // 当前分组可用
      return currentGroup
    } catch (error) {
      logger.error(`获取 API Key ${apiKeyData.id} 当前分组失败:`, error)
      return null
    }
  }

  /**
   * 获取分组的使用情况和状态
   * @param {string} groupId - 分组ID
   * @returns {Promise<Object>} 分组状态信息
   */
  async getGroupStatus(groupId) {
    try {
      const group = await accountGroupService.getGroup(groupId)
      if (!group) {
        return { error: 'group_not_found' }
      }

      const usage = await redis.getGroupRotationUsage(groupId)
      const inCooldown = await redis.isGroupInCooldown(groupId)
      const cooldownUntil = inCooldown ? await redis.getGroupCooldownUntil(groupId) : null

      const { available, reason } = await this.checkGroupAvailability(groupId)

      return {
        groupId,
        name: group.name,
        platform: group.platform,
        memberCount: group.memberCount,
        usage,
        quota: group.rotationQuota || null,
        available,
        unavailableReason: reason || null,
        inCooldown,
        cooldownUntil,
        rotationConfig: group.rotationConfig
      }
    } catch (error) {
      logger.error(`获取分组 ${groupId} 状态失败:`, error)
      return { error: 'status_fetch_error', message: error.message }
    }
  }

  /**
   * 手动重置分组（管理员操作）
   * @param {string} groupId - 分组ID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async manualResetGroup(groupId) {
    try {
      // 清除冷却状态和使用统计
      await redis.clearGroupCooldown(groupId)

      logger.success(`✅ 手动重置分组 ${groupId} 成功`)

      return { success: true, message: '分组已重置' }
    } catch (error) {
      logger.error(`手动重置分组 ${groupId} 失败:`, error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 获取API Key的当前组和下一个组信息
   * @param {string} apiKeyId - API Key ID
   * @returns {Promise<{current: Object, next: Object, allGroups: Array}>}
   */
  async getApiKeyRotationStatus(apiKeyId) {
    try {
      const client = redis.getClientSafe()
      const keyData = await client.hgetall(`api_key:${apiKeyId}`)

      if (!keyData) {
        throw new Error('API Key not found')
      }

      const groupRotation = keyData.groupRotation ? JSON.parse(keyData.groupRotation) : null

      if (!groupRotation || !groupRotation.enabled) {
        return {
          enabled: false,
          message: '未启用分组轮转'
        }
      }

      const totalGroups = groupRotation.groups.length
      const currentIndex = groupRotation.currentIndex || 0
      const nextIndex = (currentIndex + 1) % totalGroups

      const currentGroupConfig = groupRotation.groups[currentIndex]
      const nextGroupConfig = groupRotation.groups[nextIndex]

      // 获取当前组的详细状态
      const currentGroupStatus = currentGroupConfig
        ? await this.getGroupStatus(currentGroupConfig.groupId)
        : null

      // 获取下一个组的详细状态
      const nextGroupStatus = nextGroupConfig
        ? await this.getGroupStatus(nextGroupConfig.groupId)
        : null

      // 获取所有组的状态
      const allGroupsStatus = await Promise.all(
        groupRotation.groups.map(async (groupConfig, index) => {
          const status = await this.getGroupStatus(groupConfig.groupId)
          return {
            index,
            isCurrent: index === currentIndex,
            isNext: index === nextIndex,
            ...status
          }
        })
      )

      return {
        enabled: true,
        totalGroups,
        currentIndex,
        nextIndex,
        current: {
          index: currentIndex,
          config: currentGroupConfig,
          status: currentGroupStatus
        },
        next: {
          index: nextIndex,
          config: nextGroupConfig,
          status: nextGroupStatus
        },
        allGroups: allGroupsStatus
      }
    } catch (error) {
      logger.error(`获取 API Key ${apiKeyId} 轮转状态失败:`, error)
      throw error
    }
  }
}

module.exports = new GroupRotationService()
