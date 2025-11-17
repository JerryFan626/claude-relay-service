#!/usr/bin/env node

/**
 * 测试分组轮转状态查询功能
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// 从 init.json 读取管理员凭据
const initDataPath = path.join(__dirname, '../data/init.json')
let adminCredentials = null

if (fs.existsSync(initDataPath)) {
  const initData = JSON.parse(fs.readFileSync(initDataPath, 'utf8'))
  adminCredentials = initData
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_KEY_ID = process.argv[2]

async function login() {
  if (!adminCredentials) {
    console.error('❌ 无法读取管理员凭据，请确保 data/init.json 存在')
    process.exit(1)
  }

  console.log('🔐 登录管理后台...')
  const response = await axios.post(`${BASE_URL}/auth/admin/login`, {
    username: adminCredentials.username,
    password: adminCredentials.password
  })

  return response.data.token
}

async function testRotationStatus(token, apiKeyId) {
  console.log(`\n📊 查询 API Key ${apiKeyId} 的轮转状态...\n`)

  try {
    const response = await axios.get(`${BASE_URL}/admin/api-keys/${apiKeyId}/rotation-status`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const data = response.data.data

    if (!data.enabled) {
      console.log('ℹ️  该 API Key 未启用分组轮转')
      return
    }

    console.log('✅ 分组轮转已启用\n')
    console.log(`📈 总分组数: ${data.totalGroups}`)
    console.log(`📍 当前索引: ${data.currentIndex}`)
    console.log(`➡️  下一个索引: ${data.nextIndex}\n`)

    // 显示当前组信息
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 当前分组:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    displayGroupStatus(data.current)

    // 显示下一个组信息
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⏭️  下一个分组:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    displayGroupStatus(data.next)

    // 显示所有组的概览
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 所有分组概览:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    data.allGroups.forEach((group, idx) => {
      const marker = group.isCurrent ? '🎯 ' : group.isNext ? '⏭️  ' : '   '
      const status = group.available ? '✅' : '❌'
      const cooldown = group.inCooldown ? '🧊' : ''
      console.log(
        `${marker}[${idx}] ${status} ${cooldown} ${group.name} (${group.platform}) - 成员: ${group.memberCount}`
      )

      if (group.usage) {
        console.log(
          `      费用: $${group.usage.totalCost.toFixed(4)} / $${group.quota?.maxCost || 0}`
        )
      }

      if (!group.available && group.unavailableReason) {
        const reasonMap = {
          cooldown: '冷却中',
          cost_exhausted: '费用配额耗尽',
          time_exhausted: '时长配额耗尽',
          group_not_found: '分组不存在'
        }
        console.log(`      原因: ${reasonMap[group.unavailableReason] || group.unavailableReason}`)
      }

      if (group.cooldownUntil) {
        console.log(`      冷却至: ${new Date(group.cooldownUntil).toLocaleString('zh-CN')}`)
      }

      console.log('')
    })
  } catch (error) {
    if (error.response) {
      console.error('❌ API 请求失败:', error.response.data)
    } else {
      console.error('❌ 错误:', error.message)
    }
    throw error
  }
}

function displayGroupStatus(groupInfo) {
  if (!groupInfo || !groupInfo.status) {
    console.log('  ⚠️  无可用数据')
    return
  }

  const { config, status } = groupInfo

  console.log(`  📝 名称: ${status.name}`)
  console.log(`  🔖 ID: ${status.groupId}`)
  console.log(`  🌐 平台: ${status.platform}`)
  console.log(`  👥 成员数: ${status.memberCount}`)

  if (status.usage) {
    const { totalCost, totalTokens, requestCount, startTime } = status.usage
    console.log(`\n  📊 使用情况:`)
    console.log(`    💰 总费用: $${totalCost.toFixed(6)}`)
    console.log(`    🎫 总Token: ${totalTokens.toLocaleString()}`)
    console.log(`    📞 请求次数: ${requestCount}`)
    if (startTime) {
      console.log(`    🕐 开始时间: ${new Date(startTime).toLocaleString('zh-CN')}`)
    }
  }

  if (status.quota) {
    console.log(`\n  🎯 配额限制:`)
    console.log(`    💵 最大费用: $${status.quota.maxCost}`)
    if (status.usage) {
      const percent = ((status.usage.totalCost / status.quota.maxCost) * 100).toFixed(2)
      console.log(`    📈 使用率: ${percent}%`)
    }
  }

  if (status.rotationConfig) {
    console.log(`\n  ⚙️  轮转配置:`)
    console.log(`    ⏱️  最大使用时长: ${status.rotationConfig.maxHours} 小时`)
    console.log(`    🧊 冷却时长: ${status.rotationConfig.cooldownHours} 小时`)
  }

  console.log(`\n  🚦 状态: ${status.available ? '✅ 可用' : '❌ 不可用'}`)

  if (!status.available && status.unavailableReason) {
    const reasonMap = {
      cooldown: '冷却中',
      cost_exhausted: '费用配额耗尽',
      time_exhausted: '时长配额耗尽',
      group_not_found: '分组不存在'
    }
    console.log(`  ⚠️  原因: ${reasonMap[status.unavailableReason] || status.unavailableReason}`)
  }

  if (status.inCooldown && status.cooldownUntil) {
    console.log(`  🧊 冷却至: ${new Date(status.cooldownUntil).toLocaleString('zh-CN')}`)
  }
}

async function main() {
  if (!API_KEY_ID) {
    console.error('❌ 请提供 API Key ID')
    console.log('用法: node scripts/test-rotation-status.js <API_KEY_ID>')
    process.exit(1)
  }

  try {
    const token = await login()
    await testRotationStatus(token, API_KEY_ID)
    console.log('\n✅ 测试完成！')
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    process.exit(1)
  }
}

main()
