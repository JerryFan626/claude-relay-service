#!/usr/bin/env node

/**
 * 强制所有测试分组进入冷却状态
 * 用途：测试降级功能
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const redis = require('../src/models/redis')
const accountGroupService = require('../src/services/accountGroupService')

async function main() {
  console.log('\x1b[36m强制所有分组进入冷却状态...\x1b[0m\n')

  try {
    await redis.connect()

    const groups = await accountGroupService.getAllGroups('claude')
    const testGroups = groups
      .filter((g) => g.name && g.name.startsWith('Group '))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (testGroups.length === 0) {
      console.log('\x1b[31m未找到测试账户组\x1b[0m')
      process.exit(1)
    }

    for (const group of testGroups) {
      const cooldownHours = parseFloat(group.rotationCooldownHours || 12)
      const cooldownSeconds = Math.floor(cooldownHours * 3600)

      // 设置冷却状态
      await redis.client.setex(
        `group_cooldown:${group.id}`,
        cooldownSeconds,
        new Date().toISOString()
      )

      // 标记为已耗尽
      await redis.client.hset(`group_rotation_usage:${group.id}`, 'status', 'exhausted')

      console.log(`\x1b[32m✅ ${group.name} 已进入冷却状态 (${cooldownHours} 小时)\x1b[0m`)
    }

    console.log(`\n\x1b[32m✅ 所有 ${testGroups.length} 个分组已进入冷却状态\x1b[0m`)
    console.log('\x1b[36m可以运行测试脚本：node scripts/test-rotation-fallback.js\x1b[0m\n')
  } catch (error) {
    console.error('\x1b[31m❌ 失败:\x1b[0m', error)
    process.exit(1)
  } finally {
    await redis.disconnect()
  }
}

main()
