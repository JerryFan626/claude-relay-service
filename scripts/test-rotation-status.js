#!/usr/bin/env node

/**
 * 查看所有分组的详细状态
 * 包括剩余费用、剩余时间、冷却状态
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const redis = require('../src/models/redis')
const accountGroupService = require('../src/services/accountGroupService')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
}

async function main() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║         账户组轮转状态查看                            ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`)

  try {
    await redis.connect()

    const groups = await accountGroupService.getAllGroups('claude')
    const testGroups = groups
      .filter((g) => g.name && g.name.startsWith('Group '))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (testGroups.length === 0) {
      console.log(`${colors.yellow}未找到测试账户组${colors.reset}`)
      await redis.disconnect()
      return
    }

    console.log(`${colors.cyan}所有分组状态:${colors.reset}`)

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

    await redis.disconnect()
  } catch (error) {
    console.error(`${colors.red}✗ 查看失败:${colors.reset}`, error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }
