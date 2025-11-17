#!/usr/bin/env node
/**
 * 测试账户组轮转降级功能
 * 用途：当所有分组都冷却时，验证系统是否能降级到无分组模式
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const redis = require('../src/models/redis')
const unifiedClaudeScheduler = require('../src/services/unifiedClaudeScheduler')
const accountGroupService = require('../src/services/accountGroupService')

async function testFallback() {
  console.log('\x1b[36m')
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║         账户组轮转降级测试                            ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('\x1b[0m\n')

  // 连接 Redis
  await redis.connect()

  try {
    // 1. 获取测试用的账户组（以 "Group " 开头的分组）
    const groups = await accountGroupService.getAllGroups('claude')
    const testGroups = groups
      .filter((g) => g.name && g.name.startsWith('Group '))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (testGroups.length === 0) {
      console.log('\x1b[31m❌ 未找到测试账户组（以 "Group " 开头）\x1b[0m')
      process.exit(1)
    }

    console.log(`\x1b[36m找到 ${testGroups.length} 个测试分组:\x1b[0m`)
    testGroups.forEach((group) => {
      console.log(`  - ${group.name} (ID: ${group.id})`)
    })
    console.log()

    // 2. 检查所有分组状态
    console.log('\x1b[36m检查分组状态:\x1b[0m')
    let allInCooldown = true

    for (const group of testGroups) {
      const inCooldown = await redis.isGroupInCooldown(group.id)
      const status = inCooldown ? '\x1b[31m冷却中 ❄️\x1b[0m' : '\x1b[32m可用 ✅\x1b[0m'
      console.log(`  ${group.name}: ${status}`)

      if (!inCooldown) {
        allInCooldown = false
      }
    }

    if (!allInCooldown) {
      console.log('\n\x1b[33m⚠️ 并非所有分组都在冷却中，无法测试降级功能\x1b[0m')
      console.log(
        '\x1b[33m请运行以下命令确保所有分组都耗尽：\x1b[0m node scripts/test-rotation-add-cost.js'
      )
      process.exit(1)
    }

    console.log('\n\x1b[32m✅ 所有分组都在冷却中，满足测试条件\x1b[0m\n')

    // 3. 构造模拟的 API Key 对象（带有分组轮转配置）
    const mockApiKey = {
      id: 'test-fallback-key',
      name: 'Test Fallback Key',
      groupRotation: {
        enabled: true,
        currentIndex: 0,
        groups: testGroups.map((g) => ({
          groupId: g.id,
          platform: 'claude'
        }))
      }
    }

    console.log('\x1b[36m模拟 API Key 配置:\x1b[0m')
    console.log(`  Name: ${mockApiKey.name}`)
    console.log(`  Groups: ${testGroups.map((g) => g.name).join(', ')}`)
    console.log()

    // 4. 尝试选择账户（应该触发降级）
    console.log('\x1b[36m尝试选择账户（应触发降级）:\x1b[0m')

    try {
      const selection = await unifiedClaudeScheduler.selectAccountForApiKey(
        mockApiKey,
        null, // sessionHash
        'claude-3-5-sonnet-20241022' // requestedModel
      )

      console.log('\n\x1b[32m✅ 账户选择成功！\x1b[0m')
      console.log(`  账户ID: ${selection.accountId}`)
      console.log(`  账户类型: ${selection.accountType}`)
      console.log(
        `  降级模式: ${selection.fallbackMode ? '\x1b[33m是 ✅\x1b[0m' : '\x1b[31m否 ❌\x1b[0m'}`
      )

      if (selection.fallbackMode) {
        console.log('\n\x1b[32m🎉 降级功能测试通过！\x1b[0m')
        console.log('\x1b[32m系统在所有分组冷却时自动降级到无分组模式\x1b[0m')
      } else {
        console.log('\n\x1b[31m❌ 降级功能未生效\x1b[0m')
        console.log('\x1b[31m期望 fallbackMode=true，但实际为 false\x1b[0m')
        process.exit(1)
      }
    } catch (error) {
      console.log('\n\x1b[31m❌ 账户选择失败！\x1b[0m')
      console.log(`错误代码: ${error.code || 'N/A'}`)
      console.log(`错误消息: ${error.message}`)

      if (error.code === 'ALL_GROUPS_EXHAUSTED') {
        console.log('\n\x1b[31m降级功能未生效，系统仍然抛出 ALL_GROUPS_EXHAUSTED 错误\x1b[0m')
      }

      process.exit(1)
    }
  } catch (error) {
    console.error('\n\x1b[31m❌ 测试脚本执行失败:\x1b[0m', error)
    process.exit(1)
  } finally {
    await redis.disconnect()
  }
}

// 运行测试
testFallback()
