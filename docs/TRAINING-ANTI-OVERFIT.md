# 防过拟合：对手池使用指南

## 🚨 问题背景

你发现训练后的权重有"水分"，AI发现了规则AI的某个漏洞后专门进化来利用这个漏洞。这就是典型的**对手过拟合**（Opponent Overfitting）问题。

## 💡 解决方案：对手池（Opponent Pool）

### 核心思想
不训练AI打败单一对手，而是让它同时面对**多个不同风格、不同强度**的对手，从而学到真正的通用策略。

### 工作原理
1. **维护对手池**：保留最近几代的最优权重、规则AI、随机对手等
2. **随机采样**：每局训练时按一定概率从池中随机选择对手
3. **动态更新**：定期淘汰弱对手，加入新的强对手

---

## 🚀 快速开始

### 方法1：使用增强版训练脚本（推荐）

```bash
# 使用对手池模式训练（自动处理所有细节）
npm run evolve:pool

# 或者直接在代码中evolve-ai-enhanced.js中运行
node scripts/evolve-ai-enhanced.js
```

### 方法2：配置config.js启用对手池

```javascript
// config.js

// 启用对手池（最关键！）
var EVOLVE_USE_OPPONENT_POOL = true;

// 配置细节
var OPPONENT_POOL_SIZE = 8;           // 池中保持8个对手
var OPPONENT_POOL_UPDATE_EVERY = 5;   // 每5代更新一次池
var OPPONENT_POOL_SAMPLING_TEMP = 0.5; // 采样温度（0.5=偏向强对手但不绝对）

// 池中对手类型比例
var OPPONENT_POOL_RULE_RATIO = 0.3;   // 30%概率选规则AI（保持基础能力）
var OPPONENT_POOL_RANDOM_RATIO = 0.1; // 10%概率选随机（增加多样性）
// 剩下60%从历史最优权重中采样
```

### 方法3：使用传统模式+混合

如果暂时不想用完整对手池，可以先用混合模式过渡：

```javascript
var EVOLVE_OPPONENT = "mixed";        // 混合模式
var EVOLVE_MIXED_RATIO = 0.5;         // 50%规则AI + 50%自对弈
```

---

## ⚙️ 高级调参指南

### 采样温度（SAMPLING_TEMP）

控制对手选择的"探索-利用"平衡：

- **TEMP = 0.1**：几乎总选最强对手（快速收敛但易过拟合）
- **TEMP = 0.5**：偏向强对手但有探索（推荐）
- **TEMP = 1.0**：均匀随机（探索充分但收敛慢）
- **TEMP = 2.0**：偏向弱对手（适合早期探索）

**建议**：训练初期用`0.8`，中后期降到`0.3`。

### 池大小（POOL_SIZE）

- **4-6个**：小规模快速训练（适合调试）
- **8-10个**：标准规模（推荐）
- **15+个**：大规模（需要更多计算资源）

### 更新频率（UPDATE_EVERY）

每N代更新一次池：
- **3-5代**：频繁更新（跟上进化速度）
- **10代**：稳定更新（适合长程训练）

### 对手类型比例

```javascript
// 推荐配置：保持多样性
RULE_RATIO = 0.3      // 30%规则AI（防止忘记基础）
RANDOM_RATIO = 0.1    // 10%随机（探索意想不到的策略）
HISTORICAL = 0.6      // 60%历史权重（学习打败不同风格）
```

---

## 📊 监控训练过程

启用对手池后，你会在日志中看到：

```
[evolve-ai] generation 5
[OpponentPool] 更新对手池，代数: 5
[OpponentPool] 加入新对手: Gen 5-best
[OpponentPool] 池大小: 8
[OpponentPool] 淘汰对手: Gen 0-weak

[OpponentPool] 状态: 
{
  "size": 8,
  "opponents": [
    {"id": "rule-ai", "strength": 0.5, "name": "RuleAI"},
    {"id": "random", "strength": 0.1, "name": "Random"},
    {"id": "gen3-best", "strength": 0.74, "name": "历史权重: gen3..."},
    ...
  ]
}
```

**关键指标**：
- 如果池中有太多**规则AI**（>50%）→ 说明神经网络没有明显进步
- 如果**早期代数**快速被淘汰 → 进步太快，可能过拟合
- 如果**池多样性**保持得比较好 → 训练健康

---

## 🎓 补充方案：课程学习（Curriculum Learning）

除了对手池，还可以配合课程学习：从简单到复杂逐步提升难度。

```javascript
// 渐进式提升对手强度
generation = 0-10:  RULE_RATIO = 0.7      // 70%规则AI（打基础）
generation = 11-20: RULE_RATIO = 0.4      // 40%规则AI
generation = 21+:   RULE_RATIO = 0.2      // 20%规则AI（挑战自我）

// 或在config.js中实现：
function getRuleRatio(generation) {
    return Math.max(0.2, 0.7 - generation * 0.02);  // 线性递减
}
```

---

## 🔍 诊断过拟合

### 症状检查清单

训练时表现很好，但：
- [ ] 对稍微修改的规则AI输得很惨
- [ ] 对人类玩家（不同风格）表现差
- [ ] 前几代进步很快，后面几乎停滞
- [ ] `bestCleanEver` 提升缓慢（<0.01/代）
- [ ] 胜利模式单一（总是同一类开局或陷阱）

### 验证方法

```bash
# 1. 用最佳权重对战规则AI
npm run benchmark:ruleai
#（如果胜率>80%，可能过拟合了）

# 2. 自我对弈测试
# 用best.json vs best.json，看是否有新颖策略

# 3. 池多样性检查
# 看evolved/目录下不同代数的权重是否差异化
```

---

## 💡 其他防过拟合技巧

### 技巧1：增加评估局数（GAMES_PER_INDIVIDUAL）

```javascript
// 从6局增加到10局
var EVOLVE_GAMES_PER_INDIVIDUAL = 10;

// 原理：更多对局 = 更难靠运气/单一漏洞获胜
```

### 技巧2：多样性正则化（Diversity Regularization）

在适应度函数中加入多样性奖励：

```javascript
// 鼓励与父代或池内其他对手有不同的策略
function diversityBonus(net, opponentPool) {
    var diversity = 0;
    // 比较网络输出在同样局面下的差异
    // 差异越大，说明策略越新颖
    return diversity * 0.01; // 小幅奖励
}
```

### 技巧3：周期性重置（Periodic Reset）

```javascript
// 每20代，随机重置池底部20%的对手
if (generation % 20 === 0) {
    opponentPool.resetWeakest(0.2);
}
```

### 技巧4：多目标优化

不仅优化胜率，还优化：
- 对局长度（鼓励速胜）
- 走子多样性（entropy bonus）
- 对抗不同对手的平均表现

```javascript
// 在fitnessFromResult中加入多样性指标
fitness = winBonus + speedBonus + diversityBonus;
```

---

## 📈 预期效果

启用对手池后，你应该观察到：

**训练初期**（0-10代）：
- 胜率可能下降（因为对手更强了）
- 但对规则AI的胜率更稳定

**训练中期**（11-25代）：
- 胜率稳步提升
- 池内对手多样化（不同代数共存）

**训练后期**（26+代）：
- bestCleanEver持续提升，每代约0.02-0.05
- 对未知对手有较强的泛化能力

---

## 🎯 最佳实践总结

```javascript
// config.js - 推荐配置

// 基础配置
EVOLVE_POPULATION = 30;               // 种群别太大（30-50足够）
EVOLVE_GAMES_PER_INDIVIDUAL = 10;     // 每局多评估几次
EVOLVE_GENERATIONS = 50;              // 多训练几代

// 对手池（最关键！）
EVOLVE_USE_OPPONENT_POOL = true;      // 启用！
OPPONENT_POOL_SIZE = 8;               // 适中规模
OPPONENT_POOL_SAMPLING_TEMP = 0.5;    // 平衡探索-利用
OPPONENT_POOL_UPDATE_EVERY = 5;       // 定期更新

// 其他防过拟合
EVOLVE_PLAY_BLACK_RATIO = 0.5;        // 黑白都训练
FITNESS_NOISE = 0.02;                 // 增加噪声，避免局部最优
```

---

## 📚 相关文件

- **核心实现**：`scripts/opponentPool.js` - 对手池管理器
- **增强训练**：`scripts/evolve-ai-enhanced.js` - 集成对手池的训练脚本
- **配置文件**：`config.js` - 所有参数配置

---

## ❓ 常见问题

**Q1: 启用对手池后训练变慢了？**
A: 正常！因为每局需要面对不同对手，评估更准确但耗时。建议减少POPULATION（30）或GAMES（6-8）。

**Q2: bestCleanEver为什么下降了？**
A: 因为对手变强了！看中期是否能回升。如果持续下降，检查TEMP是否太高（太多弱对手）。

**Q3: 怎么知道池是否有效？**
A: 观察日志中对手池的更新频率和淘汰情况。如果很少有淘汰，说明进化停滞。

**Q4: 可以和混合模式一起用吗？**
A: 可以但没必要。对手池已包含混合模式的优点。

---

## 🎉 下一步

1. **先跑起来**：`npm run evolve:pool`
2. **观察日志**：看对手池的更新和淘汰
3. **调参优化**：根据训练曲线调整TEMP和POOL_SIZE
4. **结合其他技巧**：课程学习、多样性奖励等

祝训练顺利！🚀