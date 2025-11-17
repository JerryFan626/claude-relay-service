#!/usr/bin/env node

/**
 * 账户组轮转测试 - 初始化脚本
 *
 * 功能：
 * 1. 创建 10 个 claude-console 测试账户
 * 2. 创建 5 个账户组（每组 2 个账户）
 * 3. 配置轮转规则（$10上限、1分钟使用时间、10分钟冷却）
 * 4. 查找并配置用户现有的 API Key
 */

const path = require('path')
const { v4: uuidv4 } = require('uuid')

// 加载配置
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const redis = require('../src/models/redis')
const accountGroupService = require('../src/services/accountGroupService')
const claudeConsoleAccountService = require('../src/services/claudeConsoleAccountService')

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
}

// 配置参数
const CONFIG = {
  accountCount: 10,
  groupCount: 5,
  accountsPerGroup: 2,
  rotationConfig: {
    maxCost: 10.0, // $10 上限
    maxHours: 0.0167, // 1 分钟 (1/60 小时)
    cooldownHours: 0.167 // 10 分钟 (10/60 小时)
  }
}

async function createTestAccounts() {
  log.section('创建测试账户')

  const accounts = []

  for (let i = 1; i <= CONFIG.accountCount; i++) {
    const accountData = {
      name: `测试账户 ${i}`,
      description: `账户组轮转测试账户 #${i}`,
      apiUrl: `https://api.claude.test/test-endpoint-${i}`, // 模拟的 API URL
      apiKey: `test_console_key_${uuidv4().replace(/-/g, '')}`, // 模拟的 API Key
      isActive: true,
      accountType: 'shared',
      schedulable: true,
      priority: 50
    }

    try {
      const account = await claudeConsoleAccountService.createAccount(accountData)
      accounts.push(account)
      log.success(`创建账户: ${account.name} (ID: ${account.id})`)
    } catch (error) {
      log.error(`创建账户 ${i} 失败: ${error.message}`)
    }
  }

  log.info(`成功创建 ${accounts.length}/${CONFIG.accountCount} 个测试账户`)
  return accounts
}

async function createTestGroups(accounts) {
  log.section('创建账户组')

  const groups = []
  const groupNames = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E']

  for (let i = 0; i < CONFIG.groupCount; i++) {
    const groupData = {
      name: groupNames[i],
      platform: 'claude',
      description: `测试账户组 ${groupNames[i]} - 用于轮转测试`,
      weeklyQuota: {
        maxCost: CONFIG.rotationConfig.maxCost
      },
      rotationConfig: {
        cooldownHours: CONFIG.rotationConfig.cooldownHours,
        maxHours: CONFIG.rotationConfig.maxHours
      }
    }

    try {
      const group = await accountGroupService.createGroup(groupData)
      groups.push(group)
      log.success(`创建账户组: ${group.name} (ID: ${group.id})`)
      log.info(
        `  配额: $${CONFIG.rotationConfig.maxCost}, 使用时长: ${CONFIG.rotationConfig.maxHours * 60}分钟, 冷却: ${CONFIG.rotationConfig.cooldownHours * 60}分钟`
      )

      // 添加账户到分组
      const startIdx = i * CONFIG.accountsPerGroup
      for (let j = 0; j < CONFIG.accountsPerGroup; j++) {
        const account = accounts[startIdx + j]
        if (account) {
          await accountGroupService.addAccountToGroup(account.id, group.id, 'claude-console')
          log.info(`  └─ 添加账户: ${account.name}`)
        }
      }
    } catch (error) {
      log.error(`创建账户组 ${groupNames[i]} 失败: ${error.message}`)
    }
  }

  log.info(`成功创建 ${groups.length}/${CONFIG.groupCount} 个账户组`)
  return groups
}

async function findAndConfigureApiKey(groups) {
  log.section('配置 API Key')

  try {
    // 获取所有 API Keys
    const keyIds = await redis.client.smembers('api_keys')

    if (keyIds.length === 0) {
      log.warning('未找到任何 API Key，请先创建一个 API Key')
      return null
    }

    // 使用第一个 API Key
    const keyId = keyIds[0]
    const keyData = await redis.client.hgetall(`apikey:${keyId}`)

    if (!keyData || !keyData.name) {
      log.error(`API Key ${keyId} 数据不完整`)
      return null
    }

    log.info(`找到 API Key: ${keyData.name} (ID: ${keyId})`)

    // 构造 groupRotation 配置
    const groupRotation = {
      enabled: true,
      currentIndex: 0,
      groups: groups.map((g) => ({
        groupId: g.id,
        name: g.name,
        platform: g.platform
      }))
    }

    // 更新 API Key
    await redis.client.hset(`apikey:${keyId}`, 'groupRotation', JSON.stringify(groupRotation))

    log.success('已配置 groupRotation 到 API Key')
    log.info(`当前分组索引: ${groupRotation.currentIndex} (${groups[0].name})`)
    log.info(`包含 ${groupRotation.groups.length} 个账户组`)

    return { keyId, keyData, groupRotation }
  } catch (error) {
    log.error(`配置 API Key 失败: ${error.message}`)
    return null
  }
}

async function printSummary(accounts, groups, apiKeyInfo) {
  log.section('测试环境摘要')

  console.log(`${colors.cyan}测试账户:${colors.reset}`)
  console.log(`  总数: ${accounts.length}`)
  console.log(`  类型: claude-console`)
  console.log(`  状态: active`)

  console.log(`\n${colors.cyan}账户组:${colors.reset}`)
  console.log(`  总数: ${groups.length}`)
  groups.forEach((g, idx) => {
    console.log(`  ${idx + 1}. ${g.name} (${g.id})`)
  })

  console.log(`\n${colors.cyan}轮转配置:${colors.reset}`)
  console.log(`  金额上限: $${CONFIG.rotationConfig.maxCost}`)
  console.log(`  使用时长: ${CONFIG.rotationConfig.maxHours * 60} 分钟`)
  console.log(`  冷却时间: ${CONFIG.rotationConfig.cooldownHours * 60} 分钟`)

  if (apiKeyInfo) {
    console.log(`\n${colors.cyan}API Key:${colors.reset}`)
    console.log(`  ID: ${apiKeyInfo.keyId}`)
    console.log(`  名称: ${apiKeyInfo.keyData.name}`)
    console.log(`  轮转状态: 已启用`)
    console.log(`  当前分组: ${apiKeyInfo.groupRotation.groups[0].name}`)
  }

  console.log(`\n${colors.green}下一步:${colors.reset}`)
  console.log(
    `  1. 运行 ${colors.yellow}node scripts/verify-rotation-status.js${colors.reset} 查看状态`
  )
  console.log(
    `  2. 运行 ${colors.yellow}node scripts/simulate-group-usage.js${colors.reset} 模拟消耗`
  )
  console.log(
    `  3. 访问 ${colors.yellow}http://localhost:3001/admin-next/${colors.reset} 查看 Web 界面`
  )
  console.log()
}

async function main() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║       账户组轮转测试 - 初始化脚本                    ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`)

  try {
    // 连接 Redis
    await redis.connect()
    log.success('已连接到 Redis')

    // 1. 创建测试账户
    const accounts = await createTestAccounts()
    if (accounts.length === 0) {
      log.error('未能创建任何测试账户，退出')
      process.exit(1)
    }

    // 2. 创建账户组
    const groups = await createTestGroups(accounts)
    if (groups.length === 0) {
      log.error('未能创建任何账户组，退出')
      process.exit(1)
    }

    // 3. 配置 API Key
    const apiKeyInfo = await findAndConfigureApiKey(groups)

    // 4. 打印摘要
    await printSummary(accounts, groups, apiKeyInfo)

    log.success('测试环境初始化完成！')
  } catch (error) {
    log.error(`初始化失败: ${error.message}`)
    console.error(error)
    process.exit(1)
  } finally {
    await redis.disconnect()
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = { main }
