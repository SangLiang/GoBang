# Node 离线进化（M3）

## 与浏览器 AI 的差异

- **`scripts/ruleAi.js`**：与前端 **关闭 NN**（`NN_ASSIST_ENABLED=false` 或 `NN_LAMBDA=0`）时的选点规则一致：同一套 `getPatternScoreAt`、攻守列表与 `getMostDangerPlace` 比较。
- **`public/js/AI.js`**：可在开启 NN 时使用 `λ·assist`；进化脚本中的个体由 **`scripts/nnAssistPick.js`** 使用相同特征与混合公式评估。
- **棋盘与胜负**：由 **`scripts/boardCore.js`** 从 `gameLogic` 棋形/胜负逻辑抽出，无 DOM；若你改了浏览器端 `gameLogic`，应同步更新 `boardCore.js`。

## 命令（与 `package.json` 对应）

| npm 命令 | 说明 |
|----------|------|
| `npm run selftest:board` | 同下，棋盘 + 规则 AI 自检 |
| `npm run evolve` | 同下，离线进化 |
| `npm run benchmark:ruleai` | 见文末「规则 AI 对局统计」 |

```bash
# 棋盘 + 规则 AI 自检（随机 / 规则对局不落子非法）
npm run selftest:board

# 进化（默认种群 12、5 代、每体 4 局；完整一轮可能较慢）
npm run evolve
```

缩小试验（更快）：

```bash
set POPULATION=6
set GENERATIONS=3
set GAMES_PER_INDIVIDUAL=1
node scripts/evolve-ai.js
```

（Linux / macOS 用 `export POPULATION=6` 等。）

### 为什么曾经每代 `best 0.0000`？

规则 AI 与 NN 辅助对弈**经常下满 225 手、无五连**，旧版把这种情况记为和棋适应度 **0**；若胜/负也很少出现，**所有个体分数相同**，遗传算法没有有效选择压。

当前默认（可按机器与时间再调）：

- **`GAMES_PER_INDIVIDUAL=4`**：场均适应度更稳定，减少「全靠噪声排序」。
- **`DRAW_FITNESS=-0.1`**：和棋明显差于「胜负各半」。
- **`WIN_SPEED_BONUS`**：胜局越早略加分。
- **`FITNESS_NOISE=0.015`**：只作轻微扰动；若仍远大于种群间 `clean` 差距，会掩盖进化信号。

日志里 **`bestClean`** 为场均无噪声适应度；**`clean[min med max]`** 可看种群是否挤在一起。**`bestNoisy`** 为实际交给遗传库的分数。可用环境变量覆盖。

## 输出

- 在 **`data/evolved-<时间戳>.json`** 写入最优 `nnAssistWeights` 与 `nnAssistSchemaVersion: 1`。
- 将其中字段合并进 **`data/ai-training.json` 根级**（与 `records` 并列），并启动 `npm run server`，前端在 NN 开启且 λ≠0 时会在单人开局 `GET /api/training` 加载。

### 浏览器联调（计划 M3-T5-a）

1. 终端 A：`npm run server`（3847）。终端 B：`npm start`（5000），用 **http://localhost:5000** 打开游戏（勿用 `file://`）。
2. 在根目录 **`config.js`** 中设 **`NN_ASSIST_ENABLED: true`**、**`NN_LAMBDA`** 为 **0.05～0.12** 等非零值（与进化时 `NN_LAMBDA` 接近更易观察）。
3. 将 `data/evolved-*.json` 里的 **`nnAssistSchemaVersion`**、**`nnAssistWeights`** 合并进 **`data/ai-training.json` 根对象**（与 `records` 并列；勿破坏 `records` 数组）。若暂无进化文件，可先只开 λ 看随机初始网与 λ=0 的差异。
4. 单人开局后 F12 → **Network** 应出现对 **`127.0.0.1:3847/api/training`** 的 GET；落子风格与「同配置但删除权重字段、仅靠默认随机网」相比应有可感知差别即算通过（不要求变强）。
5. 辅助：`npm run verify:nn-lambda` 仅在 Node 侧证明 λ 混合会改选点，**不能替代**本段浏览器步骤。

## 慎用：POST 覆盖

若设置 **`EVOLVE_POST_PORT=3847`**，脚本会向 `POST /api/training` 提交 JSON，**整文件覆盖** `ai-training.json`（会丢失原有 `records`）。一般优先用手写合并或只使用 `evolved-*.json`。

## 耗时量级

每代评估量 ≈ `POPULATION × GAMES_PER_INDIVIDUAL` 局；每局步数依棋力可达数十～百余手。例：种群 20 × 每体 3 局 × 5 代 ≈ 300 局对弈。

## 规则 AI 对局统计（M3-T2-b）

```bash
npm run benchmark:ruleai
```

默认 100 盘 `ruleAi` 自对弈；局数可用环境变量 `BENCHMARK_GAMES` 修改。当前基线下常见结果为下满 225 手（和棋式终局），用于确认无死循环。
