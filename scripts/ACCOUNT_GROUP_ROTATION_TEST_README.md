# 账户组轮转测试 - 使用指南

## 📋 测试环境已就绪

✅ **10 个测试账户** (claude-console 类型)
✅ **5 个账户组** (Group A-E，每组 2 个账户)
✅ **轮转配置** ($10 上限、1分钟使用时间、10分钟冷却)

---

## 🚀 快速开始

### 步骤 1：在 Web 界面创建 API Key

由于测试环境中没有 API Key，你需要先创建一个：

1. 访问: `http://localhost:3001/admin-next/`
2. 进入 **API Keys** 页面
3. 点击 **创建 API Key**
4. 记下创建的 API Key ID

### 步骤 2：配置 API Key 的账户组轮转

运行配置脚本，将账户组绑定到你的 API Key：

```bash
node scripts/full-test-rotation-setup.js
```

这个脚本会自动：
- 找到所有测试账户组（Group A-E）
- 找到你刚创建的 API Key
- 配置 `groupRotation` 字段，启用轮转功能

### 步骤 3：查看当前状态

```bash
node scripts/verify-rotation-status.js
```

你会看到：
- ✅ 5 个账户组全部可用
- ✅ API Key 配置了 groupRotation
- ✅ 当前使用 Group A (索引 0)

### 步骤 4：模拟成本消耗

#### 方式 A：快速模式（直接设置成本）

```bash
# 将 Group A 的成本设置为 $9.5（接近 $10 上限）
node scripts/simulate-group-usage.js --group-index 0 --set-cost 9.5
```

#### 方式 B：真实模式（模拟多次请求）

```bash
# 模拟 10 次请求，每次 $1.0
node scripts/simulate-group-usage.js --group-index 0 --requests 10 --cost-per-request 1.0
```

### 步骤 5：触发轮转

继续增加成本直到超过 $10：

```bash
# 再增加 $1.0，触发轮转
node scripts/simulate-group-usage.js --group-index 0 --requests 1 --cost-per-request 1.0
```

观察日志输出：
```
🔄 触发轮转: cost_exhausted
❄️  当前处于冷却期
```

### 步骤 6：验证轮转结果

```bash
node scripts/verify-rotation-status.js
```

你会看到：
- ❄️  Group A 进入冷却期（剩余 10 分钟）
- ✅ API Key 的 currentIndex 切换到 1 (Group B)

### 步骤 7：在 Web 界面查看

访问 `http://localhost:3001/admin-next/` 查看：
- **账户组页面**: 查看 Group A 的使用统计和冷却状态
- **API Keys 页面**: 查看 groupRotation 配置

---

## 🧪 自动化完整测试

如果你想一键运行完整测试流程：

```bash
node scripts/test-rotation-logic.js
```

这个脚本会自动：
1. ✅ 检查初始状态
2. ✅ 模拟 Group A 达到配额上限
3. ✅ 验证轮转到 Group B
4. ✅ 依次耗尽所有账户组
5. ✅ 验证所有分组都不可用
6. ✅ 提示冷却期恢复机制

---

## 📊 实时监控模式

如果你想实时监控轮转状态：

```bash
node scripts/verify-rotation-status.js --watch
```

每 5 秒自动刷新一次，按 Ctrl+C 退出。

---

## 🔄 重置测试环境

### 软重置（仅清除使用数据）

```bash
node scripts/reset-rotation-test.js --soft
```

这会：
- 清除所有分组的使用统计
- 移除冷却状态
- 重置 API Key 的 currentIndex 为 0
- **保留**账户组和账户

### 完全删除

```bash
node scripts/reset-rotation-test.js --full
```

这会：
- 删除所有测试账户组
- 删除所有测试账户
- 清除 API Key 的 groupRotation 配置

---

## 📝 脚本汇总

| 脚本 | 功能 | 用法示例 |
|------|------|----------|
| `setup-test-rotation.js` | 初始化测试环境 | `node scripts/setup-test-rotation.js` |
| `full-test-rotation-setup.js` | 配置 API Key 轮转 | `node scripts/full-test-rotation-setup.js` |
| `verify-rotation-status.js` | 查看状态 | `node scripts/verify-rotation-status.js` |
| `simulate-group-usage.js` | 模拟成本消耗 | `node scripts/simulate-group-usage.js --group-index 0 --set-cost 9.5` |
| `test-rotation-logic.js` | 自动化完整测试 | `node scripts/test-rotation-logic.js` |
| `reset-rotation-test.js` | 重置环境 | `node scripts/reset-rotation-test.js --soft` |

---

## 🎯 测试目标验证清单

测试完成后，确认以下功能正常：

- [ ] **成本限制触发**: Group A 达到 $10 后自动进入冷却
- [ ] **时间限制触发**: Group A 使用 1 分钟后自动进入冷却（可选测试）
- [ ] **分组切换**: API Key 的 currentIndex 正确递增（0→1→2→3→4）
- [ ] **冷却期生效**: 冷却中的分组不可用，返回 `cooldown` 状态
- [ ] **全部耗尽处理**: 所有分组都在冷却时，返回 `all_groups_exhausted` 错误
- [ ] **自动恢复**: 冷却期结束（10分钟）后，分组重新可用
- [ ] **Web 界面显示**: 账户组页面正确显示使用统计和冷却状态
- [ ] **使用统计记录**: totalCost、totalTokens、startTime 正确记录

---

## 💡 提示

1. **冷却时间设置**: 当前设置为 10 分钟（0.167 小时），便于快速测试
2. **使用时长设置**: 当前设置为 1 分钟（0.0167 小时），便于触发时间限制
3. **生产环境配置**: 实际使用时，建议设置为：
   - `maxCost`: $50-100
   - `maxHours`: 5-12 小时
   - `cooldownHours`: 12-24 小时

---

## 🐛 常见问题

### Q: 未找到任何 API Key

**A:** 请先在 Web 界面创建一个 API Key: `http://localhost:3001/admin-next/`

### Q: 轮转没有触发

**A:** 检查：
1. 成本是否真正超过 `maxCost`
2. groupRotationService.trackUsageAndCheckRotation() 是否被调用
3. 查看日志: `logs/claude-relay-*.log`

### Q: 如何手动触发轮转

**A:** 直接调用：
```bash
node -e "
const redis = require('./src/models/redis');
const groupRotationService = require('./src/services/groupRotationService');
(async () => {
  await redis.connect();
  await groupRotationService.trackUsageAndCheckRotation('GROUP_ID', { cost: 15, tokens: 1000000 });
  await redis.disconnect();
})();
"
```

### Q: 如何立即结束冷却期

**A:** 运行软重置：
```bash
node scripts/reset-rotation-test.js --soft
```

---

## 📚 相关文档

- **CLAUDE.md**: 项目完整文档
- **src/services/accountGroupService.js**: 账户组管理服务
- **src/services/groupRotationService.js**: 轮转逻辑实现
- **src/services/unifiedClaudeScheduler.js**: 调度器集成

---

**创建时间**: 2025-11-12
**测试环境**: 10 账户 + 5 账户组 + 轮转配置
**状态**: ✅ 就绪
