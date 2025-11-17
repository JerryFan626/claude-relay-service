#!/usr/bin/env node

/**
 * 初始化轮转测试环境
 * 恢复到初始状态：清除所有使用数据、冷却状态，将 API Key 设置到第一个分组
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const redis = require('../src/models/redis')
const accountGroupService = require('../src/services/accountGroupService')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
}

async function main() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║         初始化轮转测试环境                            ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`)

  try {
    await redis.connect()

    // 1. 清除所有使用数据
    console.log('清除使用数据...')
    const usageKeys = await redis.client.keys('group_rotation_usage:*')
    if (usageKeys.length > 0) {
      await redis.client.del(...usageKeys)
      console.log(`${colors.green}✓${colors.reset} 已删除 ${usageKeys.length} 个使用统计`)
    }

    // 2. 清除所有冷却状态
    const cooldownKeys = await redis.client.keys('group_cooldown:*')
    if (cooldownKeys.length > 0) {
      await redis.client.del(...cooldownKeys)
      console.log(`${colors.green}✓${colors.reset} 已删除 ${cooldownKeys.length} 个冷却状态`)
    }

    // 3. 重置所有 API Key 的 currentIndex 为 0
    console.log('\n重置 API Keys...')
    const keyIds = await redis.client.smembers('api_keys')
    let resetCount = 0

    for (const keyId of keyIds) {
      const keyData = await redis.client.hgetall(`apikey:${keyId}`)
      if (keyData.groupRotation) {
        const groupRotation = JSON.parse(keyData.groupRotation)
        if (groupRotation.currentIndex !== 0) {
          groupRotation.currentIndex = 0
          await redis.client.hset(`apikey:${keyId}`, 'groupRotation', JSON.stringify(groupRotation))
          console.log(
            `${colors.green}✓${colors.reset} 重置 API Key: ${keyData.name} → Group ${groupRotation.groups[0].name}`
          )
          resetCount++
        }
      }
    }

    if (resetCount === 0) {
      console.log('所有 API Key 已经在第一个分组')
    }

    // 4. 显示当前状态
    console.log(`\n${colors.cyan}当前状态:${colors.reset}`)
    const groups = await accountGroupService.getAllGroups('claude')
    const testGroups = groups
      .filter((g) => g.name && g.name.startsWith('Group '))
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const group of testGroups) {
      const maxCost = parseFloat(group.rotationQuotaMaxCost || 0)
      const maxHours = parseFloat(group.rotationMaxHours || 0) * 60 // 转换为分钟
      const cooldownHours = parseFloat(group.rotationCooldownHours || 0) * 60 // 转换为分钟

      console.log(`\n  ${colors.green}${group.name}${colors.reset}`)
      console.log(`    剩余费用: $${maxCost.toFixed(2)} / $${maxCost.toFixed(2)}`)
      console.log(`    剩余时间: ${maxHours.toFixed(1)} 分钟 / ${maxHours.toFixed(1)} 分钟`)
      console.log(`    冷却时间: ${cooldownHours.toFixed(1)} 分钟`)
      console.log(`    状态: ${colors.green}可用 ✓${colors.reset}`)
    }

    console.log(`\n${colors.green}✓ 初始化完成！所有分组已恢复到初始状态${colors.reset}\n`)

    await redis.disconnect()
  } catch (error) {
    console.error('初始化失败:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }
