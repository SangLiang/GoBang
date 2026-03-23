# GoBang

Hamster.js 五子棋（含训练 API、Node 离线进化脚本）。

## npm 脚本说明

| 命令 | 作用 |
|------|------|
| **`npm start`** | 执行 `gulp default`：拷贝静态资源、Browserify 打包 `public/js` → `dist/js/main.js`、起本地静态服（默认 **5000**）并监听文件变更。日常在浏览器打开游戏用它。 |
| **`npm run server`** | 启动 **`server/index.js`**：训练数据 API，默认 **http://127.0.0.1:3847**（与静态服端口分离）。单人终局日志 `PUT append`、NN 权重 `GET` 等都走此服务。详见 [`server/README.md`](server/README.md)。 |
| **`npm run selftest:board`** | 运行 `scripts/selftest-board.js`：棋盘核心（`boardCore`）冒烟测试——五连判定、随机合法对局、双 `ruleAi` 对弈不落子非法。 |
| **`npm run evolve`** | 运行 `scripts/evolve-ai.js`：在 Node 里用神经进化优化 NN 辅助网，对局基线对手为 `ruleAi`；结果写入 **`data/evolved-<时间戳>.json`**。环境变量、适应度含义、与 `ai-training.json` 合并方式见 [`scripts/README-evolve.md`](scripts/README-evolve.md)。 |
| **`npm run benchmark:ruleai`** | 运行 `scripts/benchmark-ruleai.js`：默认 **100 盘** `ruleAi` 自对弈，统计平均手数，用于确认脚本侧规则 AI 无死循环（基线常下满 225 手）。可用 `BENCHMARK_GAMES` 改盘数。 |

开发时常见组合：终端 A `npm run server`，终端 B `npm start`；改完前端执行 `npx gulp brow`（若未开 `gulp default` 的 watch）。
