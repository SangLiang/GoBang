# Node 离线进化

## 配置方式

**所有配置统一从 `config.js` 读取**，不再支持环境变量覆盖。修改 `config.js` 即可调整训练参数。

## 与浏览器 AI 的差异

- **`scripts/ruleAi.js`**：与前端 **关闭 NN**（`NN_ASSIST_ENABLED=false` 或 `NN_LAMBDA=0`）时的选点规则一致：同一套 `getPatternScoreAt`、攻守列表与 `getMostDangerPlace` 比较。
- **`public/js/AI.js`**：可在开启 NN 时使用 `λ·assist`；进化脚本中的个体由 **`scripts/nnAssistPick.js`** 使用相同特征与混合公式评估。
- **棋盘与胜负**：由 **`scripts/boardCore.js`** 从 `gameLogic` 棋形/胜负逻辑抽出，无 DOM；若你改了浏览器端 `gameLogic`，应同步更新 `boardCore.js`。

## 配置参数（`config.js`）

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `EVOLVE_POPULATION` | 每代种群大小 | 50 |
| `EVOLVE_GENERATIONS` | 进化代数 | 30 |
| `EVOLVE_GAMES_PER_INDIVIDUAL` | 每个个体评估局数 | 7 |
| `EVOLVE_PLAY_BLACK_RATIO` | NN AI 执黑比例（0~1） | 0 |
| `EVOLVE_OPPONENT` | 对手模式：`"self"`=自对弈, `"rule"`=Rule AI | `"self"` |
| `EVOLVE_MIXED` | 混合模式：1=每局随机选对手 | 0 |
| `EVOLVE_MIXED_RATIO` | 混合模式下选 Rule AI 的概率 | 0.5 |
| `EVOLVE_SEED_FILE` | 种子权重文件路径 | `data/ai-training.json` |
| `EVOLVE_SEED_RATIO` | 首代使用种子初始化的占比 | 0.8 |
| `EVOLVE_SEED_MUTATION_RANGE` | 种子扰动幅度 | 0.3 |
| `EVOLVE_OPPONENT_BLACK_FILE` | 固定黑方对手权重文件 | `data/opponent-black.json` |
| `EVOLVE_OPPONENT_WHITE_FILE` | 固定白方对手权重文件 | `data/opponent-white.json` |
| `NN_LAMBDA` | NN 评分放大系数 λ | 1000 |

## 命令（与 `package.json` 对应）

| npm 命令 | 说明 |
|----------|------|
| `npm run evolve` | 离线进化（使用 config.js 配置） |
| `npm run evolve:self` | 自对弈进化 |
| `npm run evolve:self:coldstart` | 自对弈冷启动（无种子） |
| `npm run evolve:seed` | 使用种子继续训练 |
| `npm run selftest:board` | 棋盘 + 规则 AI 自检 |
| `npm run benchmark:ruleai` | 规则 AI 对局统计 |
| `npm run tools:init-opponents` | 初始化对手权重文件 |
| `npm run tools:update-white` | 更新白方对手权重 |
| `npm run tools:update-black` | 更新黑方对手权重 |
| `npm run tools:view-games` | 查看训练棋谱 |

```bash
# 自对弈训练（白棋进化 vs 固定黑方）
npm run evolve:self

# 查看训练结果棋谱
npm run tools:view-games
```

## 自对弈训练

### 交替训练流程

通过修改 `EVOLVE_PLAY_BLACK_RATIO` 可以切换哪一方进化：

```
第1轮：EVOLVE_PLAY_BLACK_RATIO = 0 → 白棋进化，对手是 opponent-black.json
第2轮：EVOLVE_PLAY_BLACK_RATIO = 1 → 黑棋进化，对手是 opponent-white.json
第3轮：更新对手文件，重复上述过程
```

### 操作步骤

```bash
# 1. 初始化对手文件（首次使用）
npm run tools:init-opponents

# 2. 训练白棋（config.js 中 EVOLVE_PLAY_BLACK_RATIO = 0）
npm run evolve:self

# 3. 查看棋谱确认训练效果
npm run tools:view-games

# 4. 更新白方对手权重
npm run tools:update-white

# 5. 修改 config.js：EVOLVE_PLAY_BLACK_RATIO = 1，训练黑棋
npm run evolve:self

# 6. 更新黑方对手权重
npm run tools:update-black

# 7. 重复步骤 2-6 进行交替训练
```

### 对手文件说明

| 文件 | 用途 |
|------|------|
| `data/opponent-black.json` | 固定黑方对手权重（白棋训练时使用） |
| `data/opponent-white.json` | 固定白方对手权重（黑棋训练时使用） |

训练时根据 `EVOLVE_PLAY_BLACK_RATIO` 自动选择：
- `0` → NN 执白进化，读取 `opponent-black.json` 作为黑方对手
- `1` → NN 执黑进化，读取 `opponent-white.json` 作为白方对手

## 输出

- 在 **`data/evolved/evolved-<时间戳>.json`** 写入最优 `nnAssistWeights` 与 `nnAssistSchemaVersion: 2`。
- 运行 `npm run tools:view-games` 会在 **`data/games/games-<时间戳>.txt`** 写入棋谱。
- 将 evolved 权重合并进 **`data/ai-training.json` 根级**（与 `records` 并列），并启动 `npm run server`，前端在 NN 开启且 λ≠0 时会在单人开局 `GET /api/training` 加载。

### 浏览器联调

1. 终端 A：`npm run server`（3847）。终端 B：`npm start`（5000），用 **http://localhost:5000** 打开游戏（勿用 `file://`）。
2. 在根目录 **`config.js`** 中设 **`NN_ASSIST_ENABLED: true`**、**`NN_LAMBDA`** 为 **0.05～0.12** 等非零值（与进化时 `NN_LAMBDA` 接近更易观察）。
3. 将 `data/evolved/evolved-*.json` 里的 **`nnAssistSchemaVersion`**、**`nnAssistWeights`** 合并进 **`data/ai-training.json` 根对象**（与 `records` 并列；勿破坏 `records` 数组）。若暂无进化文件，可先只开 λ 看随机初始网与 λ=0 的差异。
4. 单人开局后 F12 → **Network** 应出现对 **`127.0.0.1:3847/api/training`** 的 GET；落子风格与「同配置但删除权重字段、仅靠默认随机网」相比应有可感知差别即算通过（不要求变强）。
5. 辅助：`npm run verify:nn-lambda` 仅在 Node 侧证明 λ 混合会改选点，**不能替代**本段浏览器步骤。

## 慎用：POST 覆盖

若设置 **`EVOLVE_POST_PORT=3847`**，脚本会向 `POST /api/training` 提交 JSON，**整文件覆盖** `ai-training.json`（会丢失原有 `records`）。一般优先用手写合并或只使用 `evolved-*.json`。

## 耗时量级

每代评估量 ≈ `POPULATION × GAMES_PER_INDIVIDUAL` 局；每局步数依棋力可达数十～百余手。例：种群 50 × 每体 7 局 × 30 代 ≈ 10500 局对弈。

## 规则 AI 对局统计

```bash
npm run benchmark:ruleai
```

默认 100 盘 `ruleAi` 自对弈；局数可用环境变量 `BENCHMARK_GAMES` 修改。当前基线下常见结果为下满 225 手（和棋式终局），用于确认无死循环。

## 工具脚本（`tools/` 目录）

| 脚本 | 说明 |
|------|------|
| `tools/init-opponents.js` | 初始化 `opponent-black.json` 和 `opponent-white.json` |
| `tools/update-opponent-white.js` | 将最新训练结果更新到白方对手文件 |
| `tools/update-opponent-black.js` | 将最新训练结果更新到黑方对手文件 |
| `tools/view-trained-games.js` | 查看最新训练结果的棋谱（自动从 config.js 读取配置） |
