# 账户组轮转测试指南

## 🎯 核心测试脚本

### 1. 初始化环境
```bash
node scripts/setup-test-rotation.js
```
**功能：**
- 创建 10 个测试账户
- 创建 5 个账户组（Group A-E）
- 配置轮转规则：$10 上限、1分钟使用时间、10分钟冷却
- 自动配置现有的 API Key

**运行一次即可，无需重复执行**

---

### 2. 恢复初始状态
```bash
node scripts/test-rotation-init.js
```
**功能：**
- 清除所有使用数据和冷却状态
- 将 API Key 重置到 Group A（索引 0）
- 显示所有分组的初始状态

**每次新测试前运行此脚本**

---

### 3. 查看当前状态
```bash
node scripts/test-rotation-status.js
```
**显示：**
- 所有分组的剩余费用
- 所有分组的剩余时间
- 冷却状态和剩余冷却时间
- 当前 API Key 使用的分组

---

### 4. 增加费用
```bash
# 增加 $1.0（默认）
node scripts/test-rotation-add-cost.js

# 增加 $2.5
node scripts/test-rotation-add-cost.js 2.5

# 增加 $10（触发轮转）
node scripts/test-rotation-add-cost.js 10
```
**功能：**
- 向当前分组增加指定金额
- 自动检查是否触发轮转
- 触发轮转时自动切换到下一个分组
- 显示所有分组的最新状态

---

### 5. 增加时间
```bash
# 增加 30 秒（默认）
node scripts/test-rotation-add-time.js

# 增加 60 秒（1分钟）
node scripts/test-rotation-add-time.js 60

# 增加 120 秒（2分钟，触发轮转）
node scripts/test-rotation-add-time.js 120
```
**功能：**
- 向当前分组增加指定时长（秒）
- 自动检查是否触发时间限制
- 触发轮转时自动切换到下一个分组
- 显示所有分组的最新状态

---

## 📝 完整测试流程示例

### 测试场景 1：费用限制触发轮转

```bash
# 1. 恢复初始状态
node scripts/test-rotation-init.js

# 2. 查看初始状态（应该显示 Group A，剩余 $10）
node scripts/test-rotation-status.js

# 3. 增加 $3
node scripts/test-rotation-add-cost.js 3

# 4. 查看状态（应该显示 Group A，剩余 $7）
node scripts/test-rotation-status.js

# 5. 再增加 $8（总共 $11，触发轮转）
node scripts/test-rotation-add-cost.js 8

# 6. 查看状态
# - Group A 应该显示：冷却中 ❄️（剩余 10 分钟）
# - 当前 API Key 使用：Group B
node scripts/test-rotation-status.js
```

---

### 测试场景 2：时间限制触发轮转

```bash
# 1. 恢复初始状态
node scripts/test-rotation-init.js

# 2. 增加 30 秒
node scripts/test-rotation-add-time.js 30

# 3. 查看状态（应该还在 Group A）
node scripts/test-rotation-status.js

# 4. 再增加 40 秒（总共 70 秒，超过 60 秒限制，触发轮转）
node scripts/test-rotation-add-time.js 40

# 5. 查看状态
# - Group A 应该显示：冷却中 ❄️
# - 当前 API Key 使用：Group B
node scripts/test-rotation-status.js
```

---

### 测试场景 3：耗尽所有分组

```bash
# 1. 恢复初始状态
node scripts/test-rotation-init.js

# 2. 循环耗尽所有分组
node scripts/test-rotation-add-cost.js 10  # Group A → Group B
node scripts/test-rotation-add-cost.js 10  # Group B → Group C
node scripts/test-rotation-add-cost.js 10  # Group C → Group D
node scripts/test-rotation-add-cost.js 10  # Group D → Group E
node scripts/test-rotation-add-cost.js 10  # Group E → 所有分组耗尽

# 3. 查看状态
# 所有分组应该显示：冷却中 ❄️
node scripts/test-rotation-status.js

# 4. 等待 10 分钟后，Group A 会自动恢复可用
```

---

## 🎨 Web 界面验证

在执行脚本的同时，你可以：

1. 访问 `http://localhost:3001/admin-next/`
2. 进入"账户组"页面
3. 刷新页面查看：
   - 使用统计更新
   - 冷却状态变化
   - 当前费用和时间

---

## 📊 输出说明

### 正常状态
```
  Group A
    剩余费用: $7.50 / $10.00
    剩余时间: 0.8 分钟 / 1.0 分钟
    冷却时间: 10.0 分钟
    状态: 可用 ✓
```

### 已达上限
```
  Group A
    剩余费用: $0.00 / $10.00
    剩余时间: 0.0 分钟 / 1.0 分钟
    冷却时间: 10.0 分钟
    状态: 已达上限
```

### 冷却中
```
  Group A
    剩余费用: -$1.20 / $10.00
    剩余时间: -0.2 分钟 / 1.0 分钟
    冷却时间: 10.0 分钟
    状态: 冷却中 ❄️ (剩余 9 分钟)
```

---

## 🔧 配置说明

当前轮转配置（在 `setup-test-rotation.js` 中定义）：

- **金额上限**: $10.00
- **使用时长**: 1 分钟（0.0167 小时）
- **冷却时间**: 10 分钟（0.167 小时）

如需修改，编辑 `scripts/setup-test-rotation.js` 中的 `CONFIG.rotationConfig`。

---

## 🐛 故障排除

### 问题：增加费用后没有触发轮转

**检查：**
```bash
node scripts/test-rotation-status.js
```
查看当前分组的剩余费用是否真的小于 0。

### 问题：所有分组都在冷却中

**解决：**
```bash
node scripts/test-rotation-init.js
```
重置所有分组到初始状态。

### 问题：Web 界面显示的状态不更新

**解决：**
1. 刷新浏览器页面
2. 检查 Redis 连接
3. 查看日志：`logs/claude-relay-*.log`

---

## 📚 脚本源码位置

所有测试脚本位于：`/scripts/`

- `setup-test-rotation.js` - 一次性初始化
- `test-rotation-init.js` - 恢复初始状态
- `test-rotation-status.js` - 查看状态
- `test-rotation-add-cost.js` - 增加费用
- `test-rotation-add-time.js` - 增加时间

---

**创建时间**: 2025-11-12
**状态**: ✅ 就绪
