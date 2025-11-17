#!/usr/bin/env node

/**
 * 验证降级模式选择的账户是否真的不在任何分组中
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const redis = require('../src/models/redis')
const accountGroupService = require('../src/services/accountGroupService')
const unifiedClaudeScheduler = require('../src/services/unifiedClaudeScheduler')

async function main() {
  console.log('\x1b[36m')
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║       验证降级模式账户来源                            ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('\x1b[0m\n')

  await redis.connect()

  try {
    // 1. 获取测试分组
    const groups = await accountGroupService.getAllGroups('claude')
    const testGroups = groups
      .filter((g) => g.name && g.name.startsWith('Group '))
      .sort((a, b) => a.name.localeCompare(b.name))

    console.log(`\x1b[36m测试分组列表:\x1b[0m`)
    for (const group of testGroups) {
      const members = await accountGroupService.getGroupMembers(group.id)
      console.log(`  ${group.name}: ${members.length} 个成员`)
      console.log(`    成员ID: ${members.join(', ')}`)
    }
    console.log()

    // 2. 构造模拟 API Key
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

    // 3. 选择账户
    console.log('\x1b[36m执行账户选择（降级模式）:\x1b[0m')
    const selection = await unifiedClaudeScheduler.selectAccountForApiKey(
      mockApiKey,
      null,
      'claude-3-5-sonnet-20241022'
    )

    console.log(`  选中账户ID: ${selection.accountId}`)
    console.log(`  账户类型: ${selection.accountType}`)
    console.log(`  降级模式: ${selection.fallbackMode ? '\x1b[32m是\x1b[0m' : '\x1b[31m否\x1b[0m'}`)
    console.log()

    // 4. 检查选中的账户是否属于任何测试分组
    console.log('\x1b[36m验证选中账户是否在分组中:\x1b[0m')
    let foundInGroup = false

    for (const group of testGroups) {
      const members = await accountGroupService.getGroupMembers(group.id)
      if (members.includes(selection.accountId)) {
        console.log(`  \x1b[31m❌ 账户 ${selection.accountId} 属于分组 ${group.name}\x1b[0m`)
        foundInGroup = true
      }
    }

    if (!foundInGroup) {
      console.log(`  \x1b[32m✅ 账户 ${selection.accountId} 不属于任何测试分组\x1b[0m`)
      console.log('\n\x1b[32m🎉 验证通过：降级模式确实从全账户池中选择，而非分组成员！\x1b[0m')
    } else {
      console.log('\n\x1b[31m❌ 验证失败：降级模式仍然选择了分组内的账户\x1b[0m')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n\x1b[31m❌ 测试失败:\x1b[0m', error.message)
    process.exit(1)
  } finally {
    await redis.disconnect()
  }
}

main()
