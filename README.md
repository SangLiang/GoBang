# GoBang

Hamster.js 五子棋（含训练 API、Node 离线进化脚本）。  
分步计划与验收项见 [`docs/神经进化功能实现计划.md`](docs/神经进化功能实现计划.md)；训练 API 细节见 [`server/README.md`](server/README.md)。

## npm 脚本说明

| 命令 | 作用 |
|------|------|
| **`npm start`** | 执行 `gulp default`：拷贝静态资源、Browserify 打包 `public/js` → `dist/js/main.js`、起本地静态服（默认 **5000**）并监听文件变更。日常在浏览器打开游戏用它。 |
| **`npm run server`** | 启动 **`server/index.js`**：训练数据 API，默认 **http://127.0.0.1:3847**（与静态服端口分离）。单人终局日志 `PUT append`、NN 权重 `GET` 等都走此服务。详见 [`server/README.md`](server/README.md)。 |
| **`npm run selftest:board`** | 运行 `scripts/selftest-board.js`：棋盘核心（`boardCore`）冒烟测试——五连判定、随机合法对局、双 `ruleAi` 对弈不落子非法。 |
| **`npm run evolve`** | 运行 `scripts/evolve-ai.js`：在 Node 里用神经进化优化 NN 辅助网，对局基线对手为 `ruleAi`；结果写入 **`data/evolved-<时间戳>.json`**。环境变量、适应度含义、与 `ai-training.json` 合并方式见 [`scripts/README-evolve.md`](scripts/README-evolve.md)。 |
| **`npm run benchmark:ruleai`** | 运行 `scripts/benchmark-ruleai.js`：默认 **100 盘** `ruleAi` 自对弈，统计平均手数，用于确认脚本侧规则 AI 无死循环（基线常下满 225 手）。可用 `BENCHMARK_GAMES` 改盘数。 |
| **`npm run selftest:playout`** | 验收 `scripts/playout.js`：默认适应度胜/负/和与 `playOneGame(ruleAi, ruleAi)`。 |
| **`npm run verify:nn-lambda`** | Node 侧抽检：`λ>0` 时 `nnAssistPick` 与纯 `ruleAi` 选点可不同（见计划 M3-T5-a′）。 |

开发时常见组合：终端 A `npm run server`，终端 B `npm start`；改完前端执行 `npx gulp brow`（若未开 `gulp default` 的 watch）。

## 运行与模式入口

- 前端静态服务与训练 API 解耦：只开 `npm start` 也能正常对局；训练接口失败不会中断游戏。
- 游戏入口在 `public/js/main.js`：按 `S` 进入单人模式（`SingleMode.start()`），按 `D` 进入双人模式。

推荐联调流程：

1. 终端 A：`npm run server`
2. 终端 B：`npm start`
3. 打开 `http://localhost:5000` 并按 `S` 进入单人模式

## AI 决策流程（单人模式）

AI 入口是 `public/js/AI.js` 的 `shotPiece(gameTurn, gameList)`，核心逻辑如下：

1. 先通过 `checkDanger()` 生成候选点（`window.needComputePlace`），若为空回退天元 `(7,7)`。
2. 规则分支（`NN_ASSIST_ENABLED=false` 或 `NN_LAMBDA=0`）：计算候选点的进攻/防守分，比较最大威胁点后落子。
3. NN 混合分支（开启 NN 且 `lambda!=0`）：在规则分基础上追加 `assist` 分，按 `weight = patternScore + lambda * assist` 混合评分，再比较进攻/防守最大威胁点。
4. 落子后统一做胜负检查；单人终局会通过训练 API 追加对局日志。

当前 NN 辅助输入特征定义在 `public/js/nnFeatures.js`，特征维度为 `6`，默认网络形状为 `[6,4,1]`。

## 训练数据接口与排障

- 前端封装：`public/js/trainingApi.js`
  - `GET /api/training`：拉取训练数据/权重
  - `PUT /api/training/append`：追加单局日志
- 服务端实现：`server/index.js`
  - 读写文件：`data/ai-training.json`
  - 兼容策略：请求异常仅告警并返回安全值，不阻断对局

常见问题：

- 看不到 NN 影响：检查 `public/js/config.js` 中 `NN_ASSIST_ENABLED` 与 `NN_LAMBDA`
- 出现训练请求告警：确认 `npm run server` 已启动（`127.0.0.1:3847`）
- 需要回到纯规则 AI：设 `NN_ASSIST_ENABLED=false` 或 `NN_LAMBDA=0`
