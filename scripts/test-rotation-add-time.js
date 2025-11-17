#!/usr/bin/env node

/**
 * 增加当前分组的使用时间
 * 用法: node scripts/test-rotation-add-time.js [秒数]
 * 例如: node scripts/test-rotation-add-time.js 30  (增加 30 秒)
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const redis = require('../src/models/redis')
const accountGroupService = require('../src/services/accountGroupService')
const groupRotationService = require('../src/services/groupRotationService')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
}

async function displayAllGroupsStatus() {
  const groups = await accountGroupService.getAllGroups('claude')
  const testGroups = groups
    .filter((g) => g.name && g.name.startsWith('Group '))
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log(`\n${colors.cyan}所有分组状态:${colors.reset}`)

  for (const group of testGroups) {
    const maxCost = parseFloat(group.rotationQuotaMaxCost || 0)
    const maxHours = parseFloat(group.rotationMaxHours || 0)
    const cooldownHours = parseFloat(group.rotationCooldownHours || 0)

    // 获取使用统计
    const usage = await redis.client.hgetall(`group_rotation_usage:${group.id}`)
    const currentCost = parseFloat(usage.totalCost || 0)
    const remainingCost = maxCost - currentCost

    // 计算已使用时间
    let usedMinutes = 0
    let remainingMinutes = maxHours * 60
    if (usage.startTime) {
      const elapsed = Date.now() - new Date(usage.startTime).getTime()
      usedMinutes = elapsed / 60000
      remainingMinutes = maxHours * 60 - usedMinutes
    }

    // 检查冷却状态
    const inCooldown = await redis.client.exists(`group_cooldown:${group.id}`)
    let cooldownInfo = ''
    if (inCooldown) {
      const ttl = await redis.client.ttl(`group_cooldown:${group.id}`)
      cooldownInfo = `${colors.red}冷却中 ❄️ (剩余 ${Math.floor(ttl / 60)} 分钟)${colors.reset}`
    } else if (usage.status === 'exhausted') {
      cooldownInfo = `${colors.yellow}已耗尽${colors.reset}`
    } else if (remainingCost <= 0 || remainingMinutes <= 0) {
      cooldownInfo = `${colors.yellow}已达上限${colors.reset}`
    } else {
      cooldownInfo = `${colors.green}可用 ✓${colors.reset}`
    }

    console.log(`\n  ${colors.magenta}${group.name}${colors.reset}`)
    console.log(
      `    剩余费用: ${remainingCost >= 0 ? colors.green : colors.red}$${remainingCost.toFixed(2)}${colors.reset} / $${maxCost.toFixed(2)}`
    )
    console.log(
      `    剩余时间: ${remainingMinutes >= 0 ? colors.green : colors.red}${Math.max(0, remainingMinutes).toFixed(1)}${colors.reset} 分钟 / ${(maxHours * 60).toFixed(1)} 分钟`
    )
    console.log(`    冷却时间: ${(cooldownHours * 60).toFixed(1)} 分钟`)
    console.log(`    状态: ${cooldownInfo}`)
  }

  // 显示当前使用的分组
  const keyIds = await redis.client.smembers('api_keys')
  if (keyIds.length > 0) {
    const keyId = keyIds[0]
    const keyData = await redis.client.hgetall(`apikey:${keyId}`)
    if (keyData.groupRotation) {
      const gr = JSON.parse(keyData.groupRotation)
      const currentGroup = gr.groups[gr.currentIndex]
      console.log(
        `\n  ${colors.cyan}当前 API Key 使用:${colors.reset} ${colors.yellow}${currentGroup.name}${colors.reset} (索引 ${gr.currentIndex})`
      )
    }
  }

  console.log()
}

async function main() {
  const secondsToAdd = parseInt(process.argv[2] || '30')

  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║         增加当前分组时间: ${secondsToAdd} 秒${' '.repeat(Math.max(0, 23 - secondsToAdd.toString().length))}║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`)

  try {
    await redis.connect()

    // 获取当前使用的分组
    const keyIds = await redis.client.smembers('api_keys')
    if (keyIds.length === 0) {
      console.log(`${colors.red}✗ 未找到 API Key${colors.reset}`)
      process.exit(1)
    }

    const keyId = keyIds[0]
    const keyData = await redis.client.hgetall(`apikey:${keyId}`)

    if (!keyData.groupRotation) {
      console.log(`${colors.red}✗ API Key 未配置 groupRotation${colors.reset}`)
      process.exit(1)
    }

    const groupRotation = JSON.parse(keyData.groupRotation)
    const currentGroup = groupRotation.groups[groupRotation.currentIndex]
    const currentGroupId = currentGroup.groupId

    console.log(`当前分组: ${colors.yellow}${currentGroup.name}${colors.reset}`)
    console.log(
      `增加时间: ${colors.green}${secondsToAdd} 秒 (${(secondsToAdd / 60).toFixed(2)} 分钟)${colors.reset}`
    )

    // 获取或创建 usage 记录
    let usage = await redis.client.hgetall(`group_rotation_usage:${currentGroupId}`)

    if (!usage.startTime) {
      // 如果没有 startTime，设置一个新的
      const now = new Date()
      await redis.client.hset(`group_rotation_usage:${currentGroupId}`, {
        startTime: now.toISOString(),
        totalCost: '0',
        totalTokens: '0',
        status: 'active'
      })
      usage = await redis.client.hgetall(`group_rotation_usage:${currentGroupId}`)
      console.log(`${colors.yellow}ℹ 创建新的使用记录${colors.reset}`)
    }

    // 将 startTime 向前移动指定的秒数
    const currentStartTime = new Date(usage.startTime)
    const newStartTime = new Date(currentStartTime.getTime() - secondsToAdd * 1000)

    await redis.client.hset(
      `group_rotation_usage:${currentGroupId}`,
      'startTime',
      newStartTime.toISOString()
    )

    console.log(`\n${colors.green}✓ 时间已增加${colors.reset}`)
    console.log(`  新的开始时间: ${newStartTime.toLocaleString('zh-CN')}`)

    // 检查是否触发轮转
    const { available, reason } = await groupRotationService.checkGroupAvailability(currentGroupId)

    if (!available && reason === 'time_exhausted') {
      console.log(`${colors.yellow}⚠ 触发轮转: 时间已耗尽${colors.reset}`)

      // 标记为已耗尽并进入冷却
      await redis.client.hset(`group_rotation_usage:${currentGroupId}`, 'status', 'exhausted')
      await redis.client.hset(
        `group_rotation_usage:${currentGroupId}`,
        'exhaustedAt',
        new Date().toISOString()
      )
      await redis.client.hset(
        `group_rotation_usage:${currentGroupId}`,
        'exhaustedReason',
        'time_exhausted'
      )

      // 设置冷却期
      const group = await accountGroupService.getGroup(currentGroupId)
      const cooldownHours = parseFloat(group.rotationCooldownHours || 0)
      if (cooldownHours > 0) {
        await redis.setGroupCooldown(currentGroupId, cooldownHours)
      }

      // 执行轮转
      const result = await groupRotationService.rotateToNextGroup(keyId, {
        id: keyId,
        name: keyData.name,
        groupRotation
      })

      if (result.success) {
        const newGroup = groupRotation.groups[result.index]
        console.log(
          `${colors.green}✓ 已轮转到: ${newGroup.name} (索引 ${result.index})${colors.reset}`
        )
      } else {
        console.log(`${colors.red}✗ 轮转失败: ${result.reason}${colors.reset}`)
      }
    }

    // 显示所有分组状态
    await displayAllGroupsStatus()

    await redis.disconnect()
  } catch (error) {
    console.error(`${colors.red}✗ 操作失败:${colors.reset}`, error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }
