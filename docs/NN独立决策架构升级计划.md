# NN 独立决策架构升级计划（v2）与 NN 对战模式实施计划

> **目标**：让神经网络从"辅助规则微调"升级为"独立评估决策"，通过胜负信号自主学习五子棋策略，突破当前进化上限（fitness ≈ 0.58）。
>
> **启动日期**：2026-03-27
>
> **整合说明**：本文档整合了 `NN独立决策架构升级计划` 的 v2 架构升级与新增 `NN 对战模式（按 N）` 的实施计划（原“NN主导对战实施计划”内容已并入）。

---

## 目录

- [1. 背景与问题分析](#1-背景与问题分析)
- [2. 架构对比：v1 vs v2](#2-架构对比v1-vs-v2)
- [3. 特征工程设计](#3-特征工程设计)
- [4. 网络结构设计](#4-网络结构设计)
- [5. 决策流程设计](#5-决策流程设计)
- [6. 进化训练设计](#6-进化训练设计)
- [7. 实施计划](#7-实施计划)
- [8. 文件改动清单](#8-文件改动清单)
- [9. 验证与测试计划](#9-验证与测试计划)
- [10. 风险与应对](#10-风险与应对)
- [11. 进度跟踪](#11-进度跟踪)
- [12. NN 对战模式实施计划（按 N）](#12-nn-对战模式实施计划按-n)
- [13. 参考资料](#13-参考资料)

---

## 1. 背景与问题分析

### 1.1 当前 v1 架构

当前 NN 辅助系统（`nnAssistSchemaVersion=1`）的工作方式：

```
候选点 → 规则分(patternScore, 3~1,000,000) + NN微调(λ*assist, 0~80)
       → 混合分 → 取攻防各自最高分 → 比较 → 落子
```

- **网络结构**：`[6, 4, 1]` = 28 个参数
- **输入特征**：6 维（位置坐标、规则进攻分、规则防守分、候选数、棋局进度）
- **NN 输出**：`assist ∈ (0,1)`，作为规则分的微调量

### 1.2 遇到的进化上限

多次实验结果：

| 实验 | 配置 | 最终 fitness | 评估 |
|------|------|-------------|------|
| 20 个体 × 5 代 | 基础 | 0.57 | 有提升空间 |
| 20 个体 × 30 代 | 增加代数 | 0.58 | **已上限** |
| 50 个体 × 30 代 | 增加种群 | 0.5764 | **起点即上限** |

无论增加多少代数或种群，fitness 始终卡在 ~0.58（约 70% 胜率对 ruleAi）。

### 1.3 根因分析

上限**不是进化算法参数的问题**，而是架构层面的结构性瓶颈：

**瓶颈 1：NN 只能微调，无法主导**

```
规则分范围：3 ~ 1,000,000
NN bump 范围：0 ~ 80（lambda=80, assist∈(0,1)）

当规则分差距 > 80 时，NN 完全无法改变决策
NN 只能在"规则分很接近的候选"之间做选择
NN 永远不可能选一个规则系统没看好的点
```

**瓶颈 2：6 维特征信息量太少**

NN 看到的输入：

```
[nx, ny, attackNorm, defenseNorm, candCountNorm, moveProgress]
 ↑位置  ↑规则已算好的进攻分  ↑规则已算好的防守分  ↑候选数  ↑进度
```

NN **看不到**：局部是什么棋形、周围有几颗己方/对手子、是否存在跳空、多方向威胁情况。

**瓶颈 3：对手就是自己**

NN 的输入特征（attackNorm、defenseNorm）来自 `ruleAi` 的 `getPatternScoreAt` 输出。NN 用"规则的输出"来试图打败"规则本身"，上限自然被锁定在规则 AI 的水平。

**瓶颈 4：网络容量太小**

28 个参数的 `6→4→1` 网络，表达能力极其有限，无法学习复杂的棋形判断。

### 1.4 结论

要突破上限，必须**让 NN 独立做决策**：

1. 特征直接来自棋盘局部，不再依赖规则算好的分数
2. NN 输出就是候选点的最终得分，不再与规则分相加
3. 胜负信号驱动学习，不依赖人工标注

---

## 2. 架构对比：v1 vs v2

### 2.1 架构对比图

```
v1（当前）：NN 辅助规则
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│ 候选点    │───→│ 规则打分      │───→│ NN 微调      │───→│ 比较攻防  │──→ 落子
│ (候选集合) │    │ patternScore │    │ +λ*assist   │    │ 取最高分  │
└──────────┘    │ 3~1,000,000  │    │ bump 0~80   │    └──────────┘
                └──────────────┘    └─────────────┘
                ↑ 规则是主导         ↑ NN 是配角


v2（目标）：NN 独立决策
┌──────────┐    ┌──────────────┐    ┌─────────────┐
│ 候选点    │───→│ 提取局部特征  │───→│ NN 完整评分  │──→ 取最高分 → 落子
│ (候选集合) │    │ 22维棋盘信息  │    │ score∈(0,1) │
└──────────┘    │ 不依赖规则分  │    │ NN 就是最终分 │
                └──────────────┘    └─────────────┘
                ↑ NN 看原始棋盘      ↑ NN 是主角
```

### 2.2 关键差异

| 维度 | v1（当前） | v2（目标） |
|------|-----------|-----------|
| 输入特征 | 6 维抽象摘要（含规则分） | 22 维局部棋盘信息（不含规则分） |
| 规则依赖 | 强依赖（patternScore 是主信号） | 不依赖（特征直接从棋盘提取） |
| NN 输出 | assist（微调量，0~1） | score（完整评分，0~1） |
| 决策方式 | attackBest vs defenseBest 比较 | 单列表取最高分 |
| 网络结构 | `[6, 4, 1]` = 28 参数 | `[22, 32, 1]` = 736 参数 |
| 学习信号 | 胜负 → 微调排序 | 胜负 → 学会完整评估 |
| 理论上限 | 规则 AI 水平（~70%） | 可超越规则 AI（取决于特征和容量） |

### 2.3 保留不变的部分

以下内容 v2 保持不变：

- `gameLogic.checkDanger()`：候选点生成逻辑
- `boardCore.getLegalCandidates()`：Node 侧候选生成（已去重）
- `boardCore.checkWin()` / `gameLogic.getResult()`：胜负判定
- `Neuroevolution.js`：进化框架
- `evolve-ai.js` 的进化循环结构
- 训练 API 接口（`GET/POST /api/training`、`PUT /api/training/append`）
- `playout.js`：对局模拟

---

## 3. 特征工程设计

### 3.1 设计原则

1. **不依赖规则打分**：所有特征直接从棋盘状态提取
2. **保留方向信息**：四方向（横/竖/两斜）独立编码，让 NN 学会多方向组合判断
3. **对称编码**：己方信息和对手信息并列，让 NN 理解攻防一体
4. **归一化**：所有特征归一化到 [0,1] 或 [-1,1]，便于网络学习

### 3.2 特征定义（22 维）

每个候选点 `(mx, my)` 提取 22 维特征向量：

#### 全局特征（2 维）

| 索引 | 名称 | 含义 | 计算公式 | 范围 |
|------|------|------|----------|------|
| 0 | `isMyTurn` | 是否轮到当前评估方 | `gameTurn == player ? 1 : 0` | {0, 1} |
| 1 | `progress` | 棋局进度 | `clamp(stonesOnBoard / 225, 0, 1)` | [0, 1] |

#### 方向特征（4 方向 × 5 维 = 20 维）

四个方向：`[1,0]`（横向）、`[0,1]`（纵向）、`[1,1]`（主对角）、`[1,-1]`（副对角）

每个方向的 5 维特征：

| 索引偏移 | 名称 | 含义 | 计算方式 | 范围 |
|----------|------|------|----------|------|
| +0 | `myCount` | 己方连续子数（含候选点） | 从候选点向两侧扫描，统计连续同色子 | /4 归一化 |
| +1 | `myGap` | 己方跳空标志 | 连续段外跳过 1 空后是否有己方子 | {0, 1} |
| +2 | `oppCount` | 对手连续子数 | 同上，但统计对手色 | /4 归一化 |
| +3 | `oppGap` | 对手跳空标志 | 同上，但针对对手色 | {0, 1} |
| +4 | `openSides` | 开口数 | 两侧到棋盘边界或异色子之间的空位数（上限 5） | /5 归一化 |

#### 特征索引总表

```
维度  名称              含义
0     isMyTurn          是否轮到我下
1     progress          棋局进度

--- 横向 (dx=1, dy=0) ---
2     h_myCount         我方连续子数 /4
3     h_myGap           我方跳空标志
4     h_oppCount        对手连续子数 /4
5     h_oppGap          对手跳空标志
6     h_openSides       两侧开口数 /5

--- 纵向 (dx=0, dy=1) ---
7     v_myCount         我方连续子数 /4
8     v_myGap           我方跳空标志
9     v_oppCount        对手连续子数 /4
10    v_oppGap          对手跳空标志
11    v_openSides       两侧开口数 /5

--- 主对角 (dx=1, dy=1) ---
12    d1_myCount        我方连续子数 /4
13    d1_myGap          我方跳空标志
14    d1_oppCount       对手连续子数 /4
15    d1_oppGap         对手跳空标志
16    d1_openSides      两侧开口数 /5

--- 副对角 (dx=1, dy=-1) ---
17    d2_myCount        我方连续子数 /4
18    d2_myGap          我方跳空标志
19    d2_oppCount       对手连续子数 /4
20    d2_oppGap         对手跳空标志
21    d2_openSides      两侧开口数 /5
```

### 3.3 方向特征的计算算法

以横向 `(dx=1, dy=0)` 为例，候选点 `(mx, my)`，评估方为 `player`（棋盘值 1 或 2），对手为 `opponent`：

```
// 1. 己方连续子数（含候选点自身）
myCount = 1  // 候选点本身算一颗
// 向左扫描
cx = mx - 1, cy = my
while (cx >= 0 && board[cx][cy] === player) { myCount++; cx--; }
// 向右扫描
cx = mx + 1, cy = my
while (cx <= 14 && board[cx][cy] === player) { myCount++; cx++; }
myCount = min(myCount, 4)  // 上限 4（五连已直接赢）

// 2. 己方跳空标志
myGap = 0
// 左侧：连续段结束位置的再左边一格
gapX = mx - myCountLeft - 1  // myCountLeft 是左侧连续数
if (gapX >= 0 && board[gapX][my] === 0) {
    beyondX = gapX - 1
    if (beyondX >= 0 && board[beyondX][my] === player) myGap = 1
}
// 右侧同理（若 myGap 尚为 0）
if (myGap === 0) {
    gapX = mx + myCountRight + 1
    if (gapX <= 14 && board[gapX][my] === 0) {
        beyondX = gapX + 1
        if (beyondX <= 14 && board[beyondX][my] === player) myGap = 1
    }
}

// 3. 对手连续子数（扫描对手色，不含候选点）
//    注意：这里扫描的是"当前棋盘上对手色的连续段"
//    不做虚拟落子，因为这是评估对手的既有威胁
oppCount = 0
cx = mx - 1, cy = my
while (cx >= 0 && board[cx][cy] === opponent) { oppCount++; cx--; }
cx = mx + 1, cy = my
while (cx <= 14 && board[cx][cy] === opponent) { oppCount++; cx++; }
oppCount = min(oppCount, 4)

// 4. 对手跳空标志（与 myGap 同理，但扫描对手色）
oppGap = 0
// ... 同 myGap 的计算逻辑，替换为 opponent

// 5. 两侧开口数
openSides = 0
// 左侧：连续己方子的外侧，到棋盘边界或异色子之间的空位数
// 先跳过己方连续段
cx = mx - 1
while (cx >= 0 && board[cx][my] === player) cx--;
// 从这里向左数空位
while (cx >= 0 && board[cx][my] === 0) { openSides++; cx--; }
// 右侧同理
cx = mx + 1
while (cx <= 14 && board[cx][my] === player) cx++;
while (cx <= 14 && board[cx][my] === 0) { openSides++; cx++; }
openSides = min(openSides, 5)
```

### 3.4 特征值示例

假设棋盘局部（横向）如下，候选点在 `_` 处，评估方为 `M`（我方），对手为 `O`：

```
场景 1: O M M _ M . . O
             ↑ 候选
  h_myCount  = 3（左 2 + 候选 1，右侧 M 不连续因为中间有空？不对，
              这里 M M _ M 中 _ 是候选点，虚拟落子后变成 M M M M = 4 连续）
  → 修正：myCount 是假设在候选点落子后的连续数
  h_myCount  = 4（M M M M，虚拟落子后）
  h_myGap    = 0（无跳空）
  h_oppCount = 0（候选点两侧紧邻的对手连续段，这里没有）
  h_oppGap   = 0
  h_openSides = 2（左边 O 外侧无空位 + 右边 . . 共 2 个空位）

场景 2: . M _ M O . .
             ↑ 候选
  h_myCount  = 3（M M M，虚拟落子后）
  h_myGap    = 0
  h_oppCount = 1（右侧 O）
  h_oppGap   = 0
  h_openSides = 3（左边 1 空 + 右边 O 之后 2 空）

场景 3: . . M _ . M . .
             ↑ 候选
  h_myCount  = 1（虚拟落子后，两侧 M 不连续，中间有空）
  h_myGap    = 1（右侧跳过 1 空后有 M）
  h_oppCount = 0
  h_oppGap   = 0
  h_openSides = 4（左边 2 空 + 右边 .M. 之间算开口）
```

### 3.5 与 v1 特征的对比

| 对比维度 | v1 (6 维) | v2 (22 维) |
|----------|-----------|------------|
| 位置信息 | `nx`, `ny` 坐标 | 不含坐标（由候选集合隐式决定） |
| 攻防信息 | `attackNorm`, `defenseNorm`（规则算好的分数） | `myCount`, `oppCount`（原始连子数） |
| 棋形信息 | 无 | `myGap`, `oppGap`（跳空标志） |
| 空间信息 | `candCountNorm`（候选数） | `openSides`（每方向开口数） |
| 时间信息 | `moveProgress` | `progress`（同义） |
| 规则依赖 | **强**（2 维来自规则分） | **无**（全部从棋盘提取） |

---

## 4. 网络结构设计

### 4.1 网络形状

```
v1: [6, 4, 1]    → 6×4 + 4×1 = 28 个参数
v2: [22, 32, 1]  → 22×32 + 32×1 = 736 个参数
```

- **输入层**：22 个神经元（对应 22 维特征）
- **隐藏层**：32 个神经元，Sigmoid 激活
- **输出层**：1 个神经元，Sigmoid 激活

### 4.2 为什么选择这个结构

| 决策 | 理由 |
|------|------|
| 输入 22 维 | 4 方向 × 5 维 + 2 全局，覆盖局部棋形的核心信息 |
| 隐藏层 32 个 | 28→736 参数，容量提升 26 倍但仍可控；32 是 22 的 ~1.5 倍，留足非线性组合空间 |
| 单隐藏层 | 保持与 v1 一致的深度，避免训练复杂度骤增；后续可试验多层 |
| Sigmoid 激活 | 与 Neuroevolution.js 默认激活函数一致，无需修改框架 |
| 输出 Sigmoid | 输出 (0,1)，作为候选点评分，乘以 lambda 后使用 |

### 4.3 权重数量与存储

```
隐藏层权重：22 × 32 = 704 个浮点数
输出层权重：32 × 1  =  32 个浮点数
总计：736 个浮点数

存储格式（nnAssistWeights）：
{
  "neurons": [22, 32, 1],
  "weights": [736个浮点数]
}
```

### 4.4 输出解读

```
network.compute(features) → [score]
score ∈ (0, 1)

- score 接近 1：该候选点对当前评估方非常有利（进攻好点 / 必防点）
- score 接近 0.5：中性局面，该点价值一般
- score 接近 0：该候选点对当前评估方不利

最终得分 = lambda * score
候选点中取最高分者落子
```

---

## 5. 决策流程设计

### 5.1 浏览器端决策流程（AI.js）

```
AI.shotPiece(gameTurn, gameList)
  │
  ├─ 1. gameLogic.checkDanger()
  │     → window.needComputePlace（候选集合）
  │
  ├─ 2. if (候选为空) → 落子 (7, 7)
  │
  ├─ 3. 确定评估方
  │     player = gameTurn == 0 ? 1 : 2  // 当前行棋方的棋盘值
  │
  ├─ 4. 对每个候选点 (cx, cy)：
  │     ├─ features = nnFeatures.buildFeatures(gameList, cx, cy, player, ...)
  │     ├─ raw = nnAssist.computeAssist(features)
  │     ├─ score = raw[0]（NN 输出）
  │     └─ push { x: cx, y: cy, weight: lambda * score }
  │
  ├─ 5. 取 weight 最高的候选点 → position
  │
  └─ 6. 落子、判胜负、切换回合
```

### 5.2 与 v1 决策流程的关键差异

| 步骤 | v1 | v2 |
|------|----|----|
| 候选评分 | `attackScore + λ*assist` 和 `defenseScore + λ*assist` 两个列表 | `λ * score` 单个列表 |
| 最优点选取 | 攻击最高 vs 防守最高，取较大者 | 单列表取最高分 |
| 特征输入 | 含 `attackScore`, `defenseScore`（规则分） | 不含规则分，纯棋盘局部信息 |
| 攻防判断 | 由"哪个列表分更高"隐式决定 | 由 NN 自己学习（特征包含对手信息） |

### 5.3 强制规则层（可选增强）

在 NN 决策之上，可以加一层硬性规则确保不漏杀/漏堵：

```
// 伪代码
forceMove = null
for each candidate:
    if (我方落子后成五) → forceMove = 此点（必下）
    if (对手落子后成五) → forceMove = 此点（必堵）

if (forceMove) → 直接落子 forceMove
else → 走 NN 评分流程
```

**是否需要**：取决于纯 NN 进化后是否出现漏杀/漏堵。初期不做，观察进化结果后再决定。

---

## 6. 进化训练设计

### 6.1 训练流程

进化流程的基本结构不变：

```
for 每一代:
    for 每个个体（一组权重）:
        for 每局棋（vs ruleAi）:
            每步: 候选点 → 提取 22 维特征 → NN 打分 → 选最高分落子
            一局结束: 赢 +1 / 输 -1 / 和 DRAW_FITNESS
        5 局平均 → 适应度
    精英保留 + 交叉变异 → 下一代
```

**关键点**：训练时 NN 的对手是 `ruleAi`，但 NN **不使用 ruleAi 的打分**作为输入。NN 的输入是自己从棋盘提取的局部信息。这意味着 NN 有机会学到**超越规则 AI 的策略**。

### 6.2 进化参数建议

| 参数 | v1 默认值 | v2 建议值 | 理由 |
|------|-----------|-----------|------|
| `POPULATION` | 50 | **100** | 参数从 28 增到 736，需要更大种群保持多样性 |
| `GENERATIONS` | 30 | **100** | 搜索空间更大，需要更多代 |
| `GAMES_PER_INDIVIDUAL` | 5 | **5~8** | 评估稳定性，8 局更准但更慢 |
| `NN_LAMBDA` | 80 | **1000** | v2 输出直接是评分，需要更大系数拉开差距 |
| `mutationRate` | 0.15 | **0.1** | 参数多，过高的变异率容易破坏好权重 |
| `mutationRange` | 0.5 | **0.3** | 同上，小幅变异更安全 |
| `elitism` | 0.2 | **0.15** | 保留更多空间给交叉变异，增加探索 |
| `randomBehaviour` | 0.1 | **0.15** | 更多种群注入保持多样性 |

### 6.3 渐进式训练策略

不建议一步到位，而是分阶段推进：

```
阶段 1（验证可行性）：
  POPULATION=50, GENERATIONS=20, LAMBDA=500
  目标：确认新特征能让 NN 学到任何东西（fitness 是否有提升趋势）

阶段 2（基础训练）：
  POPULATION=100, GENERATIONS=50, LAMBDA=1000
  目标：突破 v1 的 0.58 上限

阶段 3（深度训练）：
  POPULATION=100, GENERATIONS=100, LAMBDA=1000~2000
  目标：尽可能提高到 0.7+ 甚至更高

阶段 4（持续进化/断点续训）：
  加载阶段 3 最优权重作为种子，继续进化
  目标：探索更高水平
```

### 6.4 适应度评估调整

v1 的适应度计算保持不变：

```javascript
win  = 1 + speedBonus  // 胜 + 速胜奖励
loss = -1              // 负
draw = DRAW_FITNESS    // 和（默认 -0.1）
```

v2 建议增加**对局多样性**：

```javascript
// 评估时轮流执黑/白，避免只从一方学
for (g = 0; g < GAMES; g++) {
    playingBlack = g % 2 === 0;
    if (playingBlack) {
        r = playout.playOneGame(pickNn, ruleAi.pickMove);
    } else {
        r = playout.playOneGame(ruleAi.pickMove, pickNn);
    }
    sum += fitnessFromResult(r.winner, playingBlack, r.moves, opts);
}
```

此逻辑在 `evolve-ai.js` 中已有，无需改动。

---

## 7. 实施计划

### 里程碑 1：特征提取模块（核心基础）

**目标**：实现 22 维局部棋盘特征的提取函数，浏览器端和 Node 端各一份。

**任务清单**：

- [ ] **T1.1** 重写 `public/js/nnFeatures.js`
  - `FEATURE_DIM` 改为 22
  - `NN_ASSIST_HIDDEN` 改为 `[32]`
  - `buildFeatures(gameList, x, y, player, context)` 实现 22 维特征提取
  - 新增辅助函数：`scanDirectionLine(board, mx, my, dx, dy, player)`
  - 移除对 `attackScore`、`defenseScore` 的依赖
  - `nnAssistSchemaVersion` 改为 2

- [ ] **T1.2** 在 `scripts/boardCore.js` 中新增 `buildLocalFeatures(gameList, x, y, player, stonesOnBoard)`
  - Node 侧的 22 维特征提取，逻辑与浏览器端 `buildFeatures` 一致
  - 供进化脚本 `nnAssistPick.js` 调用

- [ ] **T1.3** 编写特征验证脚本 `scripts/verify-features.js`
  - 构造若干测试棋盘局面
  - 验证特征值是否符合预期
  - 验证浏览器端与 Node 端特征一致性

**验收标准**：
- 同一棋盘局面、同一候选点，浏览器端 `buildFeatures` 与 Node 端 `buildLocalFeatures` 输出一致
- 特征值在预期范围内（无 NaN、无越界）
- `FEATURE_DIM === 22`，维度校验通过

**预估工时**：2~3 天

---

### 里程碑 2：NN 决策接入（浏览器 + 进化）

**目标**：让 NN 使用 22 维特征独立评分做决策，替换 v1 的混合评分。

**任务清单**：

- [ ] **T2.1** 重写 `public/js/AI.js` 的评分逻辑
  - 移除 `attackScore` / `defenseScore` 双列表
  - 改为单列表：`features → NN compute → score → weight = lambda * score`
  - 保留候选点遍历、最高分选取、落子、判胜负流程
  - 保留 NN 开关控制（`NN_ASSIST_ENABLED`、`NN_LAMBDA`）
  - 更新 metric 日志标签为 `[AI][NN_V2][metric]`

- [ ] **T2.2** 重写 `scripts/nnAssistPick.js`
  - 使用 `boardCore.buildLocalFeatures` 提取特征
  - NN 直接打分选点，不再混合 `getPatternScoreAt`
  - 供进化脚本 `evolve-ai.js` 调用

- [ ] **T2.3** 更新 `scripts/evolve-ai.js`
  - 网络结构改为 `[22, [32], 1]`
  - 适配新的 `nnAssistPick` 接口
  - 输出文件增加 `nnAssistSchemaVersion: 2`

- [ ] **T2.4** 更新 `public/js/nnAssist.js`
  - 适配 `nnAssistSchemaVersion = 2` 的权重加载
  - 网络结构改为 `[22, [32], 1]`
  - 保留对 v1 权重的兼容（schemaVersion=1 时用旧结构）

- [ ] **T2.5** 更新 `config.js`
  - `NN_LAMBDA` 默认值改为 1000（v2 需要更大系数）
  - `NN_ASSIST_SCHEMA_VERSION` 改为 2

**验收标准**：
- 浏览器端进入 v2 NN 对局模式（单人/NN 对战入口，取决于接入方式），AI 能正常落子（无崩溃、无非法落子）
- 能完成完整对局到终局
- `npm run evolve` 能正常运行并产出 `evolved-*.json`
- 进化输出的 `nnAssistWeights.neurons === [22, 32, 1]`

**预估工时**：3~5 天

---

### 里程碑 3：进化验证与调参

**目标**：通过实际进化验证新架构是否能突破 v1 的 0.58 上限。

**任务清单**：

- [ ] **T3.1** 阶段 1 进化：验证可行性
  ```
  POPULATION=50, GENERATIONS=20, LAMBDA=500
  ```
  - 观察 fitness 是否有提升趋势
  - 观察日志输出中的 `clean[min med max]` 是否有区分度
  - 如果 fitness 从第 0 代就开始上升，说明特征有效

- [ ] **T3.2** 阶段 2 进化：突破上限
  ```
  POPULATION=100, GENERATIONS=50, LAMBDA=1000
  ```
  - 目标：bestCleanEver > 0.58
  - 如果达到 0.7+，确认新架构有效

- [ ] **T3.3** 阶段 3 进化：深度优化
  ```
  POPULATION=100, GENERATIONS=100, LAMBDA=1000~2000
  ```
  - 尝试不同的 lambda 值（500 / 1000 / 1500 / 2000）
  - 每个 lambda 值跑一轮，记录结果对比

- [ ] **T3.4** 编写进化结果对比脚本 `scripts/compare-evolution.js`
  - 读取多个 `evolved-*.json` 的 `bestFitness`
  - 输出对比表格

- [ ] **T3.5** 体感测试
  - 将最优权重加载到浏览器
  - 与 AI 对战 10+ 局，体感评估：
    - 是否会主动进攻？
    - 是否会防守对手的冲四/活三？
    - 是否有明显的弱棋（低级失误）？
    - 开局/中盘/后盘表现是否均衡？

**验收标准**：
- 进化 fitness 稳定超过 0.58（v1 上限）
- 体感对战中 AI 不出现低级失误（漏堵四连、漏杀成五）
- 如果出现低级失误 → 考虑增加强制规则层（见 §5.3）

**预估工时**：3~7 天（含跑进化的时间）

---

### 里程碑 4：稳定化与优化

**目标**：修复进化中发现的问题，优化体验。

**任务清单**：

- [ ] **T4.1** 强制规则层（如果需要）
  - 如果进化后的 AI 有漏杀/漏堵，在 AI.js 决策前加一层：
    - 检查是否有候选点能成五 → 强制落子
    - 检查对手是否有候选点能成五 → 强制堵
  - 影响文件：`public/js/AI.js`、`scripts/nnAssistPick.js`

- [ ] **T4.2** lambda 自动调参
  - 编写 `scripts/tune-lambda.js`
  - 固定最优权重，遍历不同 lambda 值（100~3000）
  - 每个 lambda 下对战 ruleAi 100 局，记录胜率
  - 输出最优 lambda

- [ ] **T4.3** 断点续训支持
  - 修改 `evolve-ai.js`，支持从已有权重文件初始化种群
  - 环境变量：`EVOLVE_SEED_FILE=data/evolved-xxx.json`
  - 种群中一定比例（如 50%）从种子权重变异而来

- [ ] **T4.4** 性能优化
  - 如果 22 维特征计算或 736 参数推理导致浏览器卡顿：
    - 减少候选点上限（从 50 降到 30）
    - 或减少隐藏层神经元（32 → 24）

- [ ] **T4.5** 文档更新
  - 更新 `docs/开发手册.md` 的相关章节
  - 更新 `docs/神经进化功能实现计划.md`
  - 更新 `README.md`（如果存在）

**预估工时**：2~5 天

---

### 里程碑 5（可选）：高级特性

以下特性在 v2 稳定后考虑：

- [ ] **T5.1** 多层隐藏层：`[22, [64, 32], 1]`，进一步提升表达力
- [ ] **T5.2** 自对弈进化：NN vs NN 互相进化，而非只 vs ruleAi
- [ ] **T5.3** 分阶段策略：开局/中盘/后盘使用不同的 lambda 或网络
- [ ] **T5.4** 难例重放：收集漏防/弱棋局面，针对性加强训练
- [ ] **T5.5** 模型集成：多个进化结果投票选点，提升稳定性

---

## 8. 文件改动清单

### 8.1 必须改动的文件

| 文件 | 改动类型 | 改动内容 |
|------|----------|----------|
| `public/js/nnFeatures.js` | **重写** | `FEATURE_DIM=22`，`NN_ASSIST_HIDDEN=[32]`，`buildFeatures` 实现 22 维局部棋盘特征 |
| `public/js/AI.js` | **重写** | 评分逻辑从双列表改为单列表，NN 直接打分，移除 patternScore 依赖 |
| `public/js/nnAssist.js` | **修改** | 网络结构 `[22, [32], 1]`，schemaVersion=2，保留 v1 兼容 |
| `scripts/boardCore.js` | **新增函数** | `buildLocalFeatures(gameList, x, y, player, stonesOnBoard)` |
| `scripts/nnAssistPick.js` | **重写** | 使用 `buildLocalFeatures`，NN 直接打分 |
| `scripts/evolve-ai.js` | **修改** | 网络结构 `[22, [32], 1]`，schemaVersion=2 |
| `config.js` | **修改** | `NN_LAMBDA` 改为 1000，`NN_ASSIST_SCHEMA_VERSION` 改为 2 |

### 8.2 新增的文件

| 文件 | 用途 |
|------|------|
| `scripts/verify-features.js` | 验证浏览器端与 Node 端特征一致性 |
| `scripts/compare-evolution.js` | 对比多个进化结果 |
| `scripts/tune-lambda.js` | lambda 自动调参（里程碑 4） |

### 8.3 不需要改动的文件

| 文件 | 原因 |
|------|------|
| `public/js/gameLogic.js` | `checkDanger` 候选生成保持不变 |
| `public/js/Neuroevolution.js` | 进化框架不变 |
| `scripts/playout.js` | 对局模拟不变 |
| `scripts/ruleAi.js` | 作为对手不变 |
| `server/index.js` | 训练 API 不变 |
| `public/js/trainingApi.js` | 日志接口不变 |
| `public/js/util.js` | 工具函数不变 |
| `public/js/UI.js` | UI 不变 |
| `public/js/SingleMode.js` | 模式流程不变 |

### 8.4 改动影响关系图

```
nnFeatures.js ──→ AI.js（浏览器端决策）
     │                  │
     │                  ↓
     └──→ boardCore.js ──→ nnAssistPick.js ──→ evolve-ai.js
                              （Node 端决策）      │
                                                   ↓
                                            evolved-*.json
                                                   │
                                                   ↓
                                          nnAssist.js（加载权重）
                                                   │
                                                   ↓
                                               AI.js（浏览器端使用）
```

---

## 9. 验证与测试计划

### 9.1 单元验证

| 验证项 | 方法 | 预期结果 |
|--------|------|----------|
| 特征维度 | `buildFeatures().length === 22` | 通过 |
| 特征值范围 | 所有值在 [0,1] 内 | 通过 |
| 浏览器/Node 一致性 | `verify-features.js` | 同一局面输出完全一致 |
| 跳空检测 | 构造 `X_X` 棋形 | `myGap = 1` |
| 连续子计数 | 构造 `XXX_` 棋形 | `myCount = 3`（含候选） |
| 开口数 | 边界/异色子阻挡 | `openSides` 正确 |

### 9.2 集成验证

| 验证项 | 方法 | 预期结果 |
|--------|------|----------|
| 浏览器对局 | 进入 v2 NN 对局模式（单人/NN 对战入口，取决于接入方式），完整下完一局 | 无崩溃，正常终局 |
| 进化脚本 | `cd scripts && node evolve-ai.js` | 正常运行，输出 evolved 文件 |
| 权重加载 | 进化后 POST 到训练 API，浏览器 GET 加载 | NN 正常打分 |
| 回退兼容 | `NN_ASSIST_ENABLED=false` | 与纯规则 AI 行为一致 |

### 9.3 性能验证

| 验证项 | 方法 | 预期结果 |
|--------|------|----------|
| 单步推理耗时 | `console.time/timeEnd` | < 50ms（736 参数，现代浏览器） |
| 候选数上限 | 观察 `candidates.length` | < 100（15x15 棋盘 8 邻域的实际上限） |
| 进化速度 | 100 个体 × 5 局 | < 10 分钟/代（Node 侧） |

### 9.4 水平验证

| 验证项 | 方法 | 目标 |
|--------|------|------|
| 突破 v1 上限 | 进化结果 bestCleanEver | > 0.58 |
| 不出现弱棋 | 体感对战 10 局 | 无漏堵四连、无漏杀成五 |
| 攻防均衡 | 观察落子分布 | 既有主动进攻，也有及时防守 |
| 对比 v1 | NN_V2 vs NN_V1 对战 | NN_V2 胜率 > 50% |

---

## 10. 风险与应对

### 10.1 风险矩阵

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 初期水平暴跌 | 高 | 中 | 新 NN 从随机开始，初期肯定弱于规则。保留 `NN_ASSIST_ENABLED=false` 可随时切回纯规则 |
| 进化不收敛 | 中 | 高 | 分阶段调参（§6.3），先小规模验证可行性 |
| 学不会防守 | 中 | 高 | 特征中已包含对手威胁信息（opp 系列）；必要时加强制规则层 |
| 漏杀/漏堵 | 中 | 高 | 里程碑 4 加强制规则层（成五必下、对手四必堵） |
| 浏览器卡顿 | 低 | 中 | 736 参数推理很快（<50ms），但若出问题可减小网络 |
| 种群早熟收敛 | 中 | 中 | 增大 randomBehaviour、降低 elitism、增大种群 |
| 进化时间过长 | 中 | 低 | 100 个体 × 100 局 × 100 代，按 Node 单线程估算约数小时 |

### 10.2 回退方案

任何时候都可以通过配置切回 v1 或纯规则：

```javascript
// config.js 中设置即可回退
NN_ASSIST_ENABLED = false;  // 回退到纯规则 AI
NN_ASSIST_ENABLED = true;
NN_LAMBDA = 0;              // 同上（lambda=0 时 NN 不生效）
```

v1 的权重文件和代码不会被删除，只是不再被默认使用。

### 10.3 与现有代码的兼容性

- `window.needComputePlace` 的数据格式不变（`{x, y} 数组`），`checkDanger` 无需改动
- `gameList` 的格式不变（15×15，0/1/2）
- `gameTurn` 的含义不变（0 黑 / 1 白）
- `trainingApi` 的接口不变
- `Neuroevolution.js` 不需要修改（支持任意 `[input, hidden, output]` 结构）

---

## 11. 进度跟踪

### 进度总览

| 里程碑 | 状态 | 开始日期 | 完成日期 | 备注 |
|--------|------|----------|----------|------|
| M1：特征提取模块 | ⬜ 未开始 | - | - | |
| M2：NN 决策接入 | ⬜ 未开始 | - | - | |
| M3：进化验证与调参 | ⬜ 未开始 | - | - | |
| M4：稳定化与优化 | ⬜ 未开始 | - | - | |
| M5：高级特性（可选） | ⬜ 未开始 | - | - | |

### 任务明细

#### M1：特征提取模块

| 任务 | 状态 | 负责 | 备注 |
|------|------|------|------|
| T1.1 重写 nnFeatures.js | ⬜ | | |
| T1.2 boardCore.js 新增 buildLocalFeatures | ⬜ | | |
| T1.3 verify-features.js 验证脚本 | ⬜ | | |

#### M2：NN 决策接入

| 任务 | 状态 | 负责 | 备注 |
|------|------|------|------|
| T2.1 重写 AI.js 评分逻辑 | ⬜ | | |
| T2.2 重写 nnAssistPick.js | ⬜ | | |
| T2.3 更新 evolve-ai.js | ⬜ | | |
| T2.4 更新 nnAssist.js | ⬜ | | |
| T2.5 更新 config.js | ⬜ | | |

#### M3：进化验证与调参

| 任务 | 状态 | 负责 | 备注 |
|------|------|------|------|
| T3.1 阶段 1 进化（可行性） | ⬜ | | |
| T3.2 阶段 2 进化（突破上限） | ⬜ | | |
| T3.3 阶段 3 进化（深度优化） | ⬜ | | |
| T3.4 compare-evolution.js | ⬜ | | |
| T3.5 体感测试 | ⬜ | | |

#### M4：稳定化与优化

| 任务 | 状态 | 负责 | 备注 |
|------|------|------|------|
| T4.1 强制规则层（如需） | ⬜ | | |
| T4.2 lambda 自动调参 | ⬜ | | |
| T4.3 断点续训支持 | ⬜ | | |
| T4.4 性能优化（如需） | ⬜ | | |
| T4.5 文档更新 | ⬜ | | |

### 进化实验记录

| 实验编号 | 配置 | bestClean | 备注 |
|----------|------|-----------|------|
| v2-exp-001 | POP=50, GEN=20, λ=500 | - | 待运行 |
| v2-exp-002 | POP=100, GEN=50, λ=1000 | - | 待运行 |
| v2-exp-003 | POP=100, GEN=100, λ=1000 | - | 待运行 |
| v2-exp-004 | POP=100, GEN=100, λ=1500 | - | 待运行 |
| v2-exp-005 | POP=100, GEN=100, λ=2000 | - | 待运行 |

---

## 12. NN 对战模式实施计划（按 N）

> **目标**：新增按 `N` 进入“NN 对战模式”，由玩家与经 `v2` 架构训练出的神经网络独立决策 AI 对弈。
>
> **架构基础**：复用本文件前文的 `v2`（22 维特征 + NN 独立评分）能力；本章节只补齐“模式入口 + 独立决策链路 + Nn 对战体验”的实现要点。

---

### 12.1 目标与约束

1. 新增 **NN 对战模式**（按键 `N`）：玩家 vs v2 神经网络 AI。
2. 现有模式保持行为隔离：`S`（单人模式）与 `D`（双人模式）不复用/不耦合本模式的 v2 决策链路。
3. NN 模式使用独立实现：特征提取、评分、选点走独立代码路径（建议新增 `NnAI.js` 与 `NnMode.js`，避免直接改动 `AI.js` 的 v1 逻辑）。

### 12.2 模式入口与交互设计

#### 12.2.1 按键入口

| 按键 | 模式 |
|------|------|
| `S` | 单人模式（现有，不改） |
| `D` | 双人模式（现有，不改） |
| `N` | NN 对战模式（新增） |

#### 12.2.2 游戏流程（建议实现逻辑）

1. 页面加载后提示文字增加 `N` 键说明。
2. 玩家按 `N` 进入 NN 对战模式：
   - 清空棋盘并初始化状态
   - 玩家执黑先手；NN 执白后手
   - 提示文字变为“NN 对战模式 - 你的回合（黑棋）”
3. 玩家点击落子：
   - 校验点击坐标是否在棋盘内、且落点合法
   - 落子后判胜负，若未终局则进入 NN 回合
4. NN 回合：
   - 生成候选点（复用 `checkDanger` 候选集合或实现等价去重）
   - 对每个候选点提取 22 维特征并用 NN 独立评分
   - 选最高分落子、判胜负并切回玩家回合
5. 终局：
   - 显示胜负
   - 记录一条训练日志（可选：用于后续分析/复盘）

#### 12.2.3 UI 变化要点

- 入口提示文字增加 `N` 键说明
- 进入 NN 模式后回合提示使用“NN 对战模式 - 当前回合：黑棋/白棋”
- NN 思考过程可简单显示“NN 思考中...”

---

### 12.3 架构设计

#### 12.3.1 整体架构（模式层）

```
main.js
  ├─ keyDown S → SingleMode.start()   （现有，不改）
  ├─ keyDown D → DoubliePlayerMode.start() （现有，不改）
  └─ keyDown N → NnMode.start()       （新增）
                     ├─ 初始化棋盘/状态/UI
                     └─ NN 回合调用 → NnAI.shotPiece(gameTurn, gameList)
```

#### 12.3.2 核心组件清单

| 组件 | 文件 | 职责 |
|------|------|------|
| `NnMode` | `public/js/NnMode.js`（新增） | 模式入口：管理回合、玩家点击、胜负/UI、调用 `NnAI` |
| `NnAI` | `public/js/NnAI.js`（新增） | v2 NN 独立评分：候选点提取 + 22维特征构建 + NN 打分选点 |
| `nnFeatures` v2 | `public/js/nnFeatures.js`（修改） | 保留 v1 特征（6维）与新增 v2 特征（22维），确保 v1 分支不被破坏 |
| `nnAssist` v1/v2 | `public/js/nnAssist.js`（修改） | 支持双版本权重加载/推理：v1 供 `AI.js`，v2 供 `NnAI.js` |

#### 12.3.3 关键设计决策（与 v1/AI.js 兼容）

**Q1：为什么不复用 `AI.js`？**  
`AI.js` 中的 `shotPiece` 通常包含 v1（双列表攻防 + NN 微调）逻辑，直接改动会影响 `S` 模式行为。通过新增 `NnAI.js` 可以把 v2 逻辑隔离在 `N` 模式路径中。

**Q2：`nnFeatures.js` 改动会不会影响 `S`？**  
若 `nnFeatures.js` 直接用 22 维覆盖原 6 维接口，会破坏 v1 NN_ASSIST 分支。建议保留 `buildFeaturesV1`（6维）与新增 `buildFeaturesV2`（22维），由调用方决定使用哪个版本。

**Q3：权重能共用吗？**  
不能共用：v1 网络结构与 v2 网络结构不同。应通过 `saveData.neurons` 或 `schemaVersion` 自动选择对应网络，并在 `nnAssist.js` 中区分 `computeV1 / computeV2`（或以“默认兼容 v1、显式 v2 计算”方式实现）。

#### 12.3.4 nnAssist 双版本兼容（实现要点）

建议在 `nnAssist.js` 中同时持有 v1/v2 网络：

- 根据权重的 `neurons` 或 `schemaVersion`，初始化并 `setSave(saveData)`
- 默认 `computeAssist(features)` 仍按 v1 行为输出（用于 `AI.js`）
- 新增显式的 `computeV2(features)`（用于 `NnAI.js`），输入维度为 22

（具体代码可按前述“nnAssist 双版本兼容”要点自行补齐。）

---

### 12.4 实施计划

#### 12.4.1 里程碑 1：v2 特征与 NN 决策基础（共享）

本里程碑与本文件前文 `M1（特征提取） + M2（v2 接入）` 共享，不在本章节重复拆工时。

#### 12.4.2 里程碑 2：新增 NN 对战模式（本章节核心）

- **T2.1 新建 `public/js/NnAI.js`**
  - 职责：v2 NN 独立决策 AI
  - 关键流程：候选点生成 → 对每候选点提取 22 维特征 → NN 打分（v2）→ 选最高分点落子
  - 约束：NN 模式独立于 `AI.js` v1 的双列表评分逻辑

- **T2.2 新建 `public/js/NnMode.js`**
  - 职责：模式入口与交互管理
  - 关键流程：
    - 初始化棋盘与回合状态
    - 玩家回合：点击校验、落子、判胜负
    - NN 回合：显示“思考中...”，调用 `NnAI.shotPiece`，落子、判胜负、切回玩家回合
    - 终局：显示胜负并可记录日志（便于复盘/统计）

- **T2.3 修改 `public/js/main.js`**
  - 增加 `keyDown` 对 `N` 的监听：在配置开启时调用 `NnMode.start()`

- **T2.4 修改 `config.js`（新增模式隔离配置）**
  - 建议新增：
    - `NN_V2_ENABLED`：控制 `N` 键是否启用（默认建议关闭，避免误触影响体验）
    - `NN_V2_LAMBDA`：v2 输出打分放大系数（独立于 S 模式的 `NN_LAMBDA`）
    - `NN_V2_SCHEMA_VERSION`：与训练产出的权重 schema 保持一致（v2=2）

- **T2.5 修改 `public/js/nnAssist.js`**
  - 双版本权重加载与推理：
    - v1：继续服务 `AI.js` 的 NN_ASSIST 分支（不影响 S）
    - v2：服务 `NnAI.js` 的独立评分分支

- **T2.6 修改 `public/js/nnFeatures.js`**
  - 保留 v1（6维）特征构建函数
  - 新增 v2（22维）特征构建函数（细节复用本文件 §3）

#### 12.4.3 里程碑 3：进化训练（提供 v2 权重）

运行 `evolve-ai.js` 产出 v2 权重（`evolved-*.json`），并让浏览器端加载权重时能够识别 v2 的 `neurons`/`schemaVersion`。

#### 12.4.4 里程碑 4：体验优化（可选）

- 终局后增加“再来一局”（如 `R` 键）
- NN 思考延迟与提示文案（改善体感）
- 每局记录日志与复盘信息（可选）

---

### 12.5 文件改动清单（模式层）

#### 12.5.1 新增文件

- `public/js/NnAI.js`：v2 NN 独立决策 AI
- `public/js/NnMode.js`：NN 对战模式入口与 UI/回合管理

#### 12.5.2 修改文件（建议范围）

- `public/js/main.js`：增加 `N` 键监听
- `config.js`：新增 `NN_V2_ENABLED` / `NN_V2_LAMBDA` / `NN_V2_SCHEMA_VERSION`
- `public/js/nnFeatures.js`：保留 v1 6维特征 + 新增 v2 22维特征
- `public/js/nnAssist.js`：v1/v2 双版本网络与推理

---

### 12.6 验证计划

#### 12.6.1 功能验证

- `S` 模式：行为与改动前一致（建议回归检查）
- `D` 模式：行为与改动前一致
- `N` 键可进入：
  - `NN_V2_ENABLED=true` 时进入 NN 对战模式
  - `NN_V2_ENABLED=false` 时按 `N` 无反应或提示未启用
- NN 能正常落子：无崩溃、无非法落子
- 完整对局：玩家 vs NN 能走到终局并显示胜负

#### 12.6.2 回归验证（建议）

- `S` 模式 NN_ASSIST 开/关（`NN_ASSIST_ENABLED` 与 `NN_LAMBDA`）确认行为不变
- `D` 模式不受影响

#### 12.6.3 性能验证

- NN 单步推理耗时：满足浏览器可用性（参考 v2 约 736 参数推理）
- 长对局流畅：下满棋盘可视化不明显卡顿

---

### 12.7 风险与回退

#### 12.7.1 风险矩阵（模式层）

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| v2 权重未训练好 | 高（初期） | 中 | 通过 `NN_V2_ENABLED=false` 关闭 `N` 模式，不影响 `S/D` |
| NN 漏杀/漏堵 | 中 | 中 | 后续可在决策链中加入强制规则层（成五必下、四连必堵） |
| v1 特征被破坏 | 低 | 高 | 保留 `buildFeaturesV1`，并在 v1/v2 分支中显式区分 |
| nnAssist 双版本冲突 | 低 | 中 | 通过 `saveData.neurons/schemaVersion` 自动选择网络 |

#### 12.7.2 回退方案

```javascript
// 紧急回退：一行配置关闭 NN 对战模式
NN_V2_ENABLED = false;
// NnMode 不再响应；S/D 行为不受影响
```

---

### 12.8 进度跟踪（模式层）

| 任务 | 状态 |
|------|------|
| M1：nnFeatures.js v2 特征（与本文件共享） | ⬜ 未开始 |
| M1：nnAssist.js 双版本支持（与本文件共享） | ⬜ 未开始 |
| M2：boardCore.js buildLocalFeatures（与本文件共享） | ⬜ 未开始 |
| M2：NnAI.js（新增） | ⬜ 未开始 |
| M2：NnMode.js（新增） | ⬜ 未开始 |
| M2：main.js N 键监听 | ⬜ 未开始 |
| M2：config.js 配置项 | ⬜ 未开始 |
| M3：进化训练产出 v2 权重 | ⬜ 未开始 |
| M4：体验优化 | ⬜ 未开始 |

**执行顺序建议**：

1. 完成本文件 `M1`（特征提取）与 `M2`（v2 接入基础）
2. 实现本章节 `M2` 的 `NnAI.js + NnMode.js + main.js` 入口
3. 运行进化训练产出 v2 权重
4. 浏览器按 `N` 验证 NN 对战模式体感
5. 按问题（漏杀/体验）迭代可选的稳定化策略

---

## 13. 参考资料

### 项目内文档

- `docs/开发手册.md`：项目整体架构、AI 决策流程、NN 辅助系统说明
- `docs/单人模式与AI分析.md`：已知问题与算法局限
- `docs/神经进化功能实现计划.md`：v1 神经进化实现记录
- `docs/神经网络与神经进化整合方案.md`：NN 与规则 AI 整合方案

### 关键源码

- `public/js/nnFeatures.js`：特征提取（v1 为 6 维，v2 改为 22 维）
- `public/js/AI.js`：AI 决策入口
- `public/js/gameLogic.js`：棋盘逻辑、候选生成、棋形评分
- `public/js/nnAssist.js`：NN 推理接口
- `public/js/Neuroevolution.js`：神经进化框架
- `scripts/boardCore.js`：Node 侧棋盘核心
- `scripts/nnAssistPick.js`：Node 侧 NN 选点
- `scripts/evolve-ai.js`：离线进化脚本
- `scripts/playout.js`：对局模拟
- `scripts/ruleAi.js`：规则 AI 基线对手

### 版本记录

| 版本 | 日期 | 内容 |
|------|------|------|
| v1 | 2026-03-23 | 6 维特征 + 4 隐藏层 + 混合评分，fitness 上限 ~0.58 |
| v2（本文档） | 2026-03-27 | 22 维特征 + 32 隐藏层 + 独立评分，目标突破上限 |

---

## 附录 A：特征提取伪代码（完整版）

```javascript
// nnFeatures.js v2 - buildFeatures 完整伪代码

function buildFeatures(gameList, mx, my, player, context) {
    var stonesOnBoard = context.stonesOnBoard;
    var opponent = player === 1 ? 2 : 1;

    // 全局特征
    var isMyTurn = context.isMyTurn; // 0 或 1
    var progress = clamp(stonesOnBoard / 225, 0, 1);

    var features = [isMyTurn, progress];

    // 四个方向
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (var d = 0; d < dirs.length; d++) {
        var dx = dirs[d][0];
        var dy = dirs[d][1];
        var dirFeat = scanDirection(gameList, mx, my, dx, dy, player, opponent);
        features.push(dirFeat.myCount / 4);
        features.push(dirFeat.myGap);
        features.push(dirFeat.oppCount / 4);
        features.push(dirFeat.oppGap);
        features.push(dirFeat.openSides / 5);
    }

    // features.length 应为 2 + 4×5 = 22
    return features;
}

function scanDirection(board, mx, my, dx, dy, player, opponent) {
    // 己方连续子数（含候选点自身，虚拟落子后）
    var myCountLeft = 0;
    var cx = mx - dx, cy = my - dy;
    while (inBoard(cx, cy) && board[cx][cy] === player) {
        myCountLeft++;
        cx -= dx; cy -= dy;
    }
    var myCountRight = 0;
    cx = mx + dx; cy = my + dy;
    while (inBoard(cx, cy) && board[cx][cy] === player) {
        myCountRight++;
        cx += dx; cy += dy;
    }
    var myCount = Math.min(1 + myCountLeft + myCountRight, 4);

    // 己方跳空
    var myGap = 0;
    // 左侧跳空
    var gapX = mx - dx * (myCountLeft + 1);
    var gapY = my - dy * (myCountLeft + 1);
    if (inBoard(gapX, gapY) && board[gapX][gapY] === 0) {
        var bx = gapX - dx, by = gapY - dy;
        if (inBoard(bx, by) && board[bx][by] === player) myGap = 1;
    }
    // 右侧跳空（若尚未检测到）
    if (myGap === 0) {
        gapX = mx + dx * (myCountRight + 1);
        gapY = my + dy * (myCountRight + 1);
        if (inBoard(gapX, gapY) && board[gapX][gapY] === 0) {
            bx = gapX + dx; by = gapY + dy;
            if (inBoard(bx, by) && board[bx][by] === player) myGap = 1;
        }
    }

    // 对手连续子数（不含候选点，扫描当前棋盘上的对手色）
    var oppCountLeft = 0;
    cx = mx - dx; cy = my - dy;
    while (inBoard(cx, cy) && board[cx][cy] === opponent) {
        oppCountLeft++;
        cx -= dx; cy -= dy;
    }
    var oppCountRight = 0;
    cx = mx + dx; cy = my + dy;
    while (inBoard(cx, cy) && board[cx][cy] === opponent) {
        oppCountRight++;
        cx += dx; cy += dy;
    }
    var oppCount = Math.min(oppCountLeft + oppCountRight, 4);

    // 对手跳空
    var oppGap = 0;
    gapX = mx - dx * (oppCountLeft + 1);
    gapY = my - dy * (oppCountLeft + 1);
    if (inBoard(gapX, gapY) && board[gapX][gapY] === 0) {
        bx = gapX - dx; by = gapY - dy;
        if (inBoard(bx, by) && board[bx][by] === opponent) oppGap = 1;
    }
    if (oppGap === 0) {
        gapX = mx + dx * (oppCountRight + 1);
        gapY = my + dy * (oppCountRight + 1);
        if (inBoard(gapX, gapY) && board[gapX][gapY] === 0) {
            bx = gapX + dx; by = gapY + dy;
            if (inBoard(bx, by) && board[bx][by] === opponent) oppGap = 1;
        }
    }

    // 开口数（己方连续段外侧的空位数）
    var openSides = 0;
    // 左侧
    cx = mx - dx * (myCountLeft + 1);
    cy = my - dy * (myCountLeft + 1);
    var steps = 0;
    while (inBoard(cx, cy) && board[cx][cy] === 0 && steps < 5) {
        openSides++;
        cx -= dx; cy -= dy;
        steps++;
    }
    // 右侧
    cx = mx + dx * (myCountRight + 1);
    cy = my + dy * (myCountRight + 1);
    steps = 0;
    while (inBoard(cx, cy) && board[cx][cy] === 0 && steps < 5) {
        openSides++;
        cx += dx; cy += dy;
        steps++;
    }
    openSides = Math.min(openSides, 5);

    return {
        myCount: myCount,
        myGap: myGap,
        oppCount: oppCount,
        oppGap: oppGap,
        openSides: openSides
    };
}

function inBoard(x, y) {
    return x >= 0 && x <= 14 && y >= 0 && y <= 14;
}
```

---

## 附录 B：进化参数速查表

| 参数 | 环境变量 | v1 默认 | v2 建议 | 说明 |
|------|----------|---------|---------|------|
| 种群大小 | `POPULATION` | 50 | 100 | 搜索广度 |
| 进化代数 | `GENERATIONS` | 30 | 100 | 搜索深度 |
| 每个体局数 | `GAMES_PER_INDIVIDUAL` | 5 | 5~8 | 评估稳定性 |
| 混合系数 | `NN_LAMBDA` | 80 | 1000 | NN 输出放大倍数 |
| 和棋适应度 | `DRAW_FITNESS` | -0.1 | -0.1 | 不变 |
| 速胜奖励 | `WIN_SPEED_BONUS` | 0.04 | 0.04 | 不变 |
| 适应度噪声 | `FITNESS_NOISE` | 0.015 | 0.01 | 减小噪声，更准确排序 |

运行示例：

```bash
# 阶段 1：验证可行性
POPULATION=50 GENERATIONS=20 NN_LAMBDA=500 node scripts/evolve-ai.js

# 阶段 2：突破上限
POPULATION=100 GENERATIONS=50 NN_LAMBDA=1000 node scripts/evolve-ai.js

# 阶段 3：深度优化
POPULATION=100 GENERATIONS=100 NN_LAMBDA=1000 FITNESS_NOISE=0.01 node scripts/evolve-ai.js

# 阶段 3（高 lambda 对比）
POPULATION=100 GENERATIONS=100 NN_LAMBDA=2000 FITNESS_NOISE=0.01 node scripts/evolve-ai.js
```

---

*文档结束。最后更新：2026-03-27*
