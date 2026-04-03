# 单人模式与 AI 分析说明

本文档整理 GoBang 项目中**单人模式**的流程、**AI 落子逻辑**、涉及文件，以及当前已知的**实现缺陷与算法局限**，便于维护与后续改进。

---

## 1. 单人模式概览

| 项目 | 说明 |
|------|------|
| 入口 | `public/js/main.js` 中按 **S** 进入单人模式，调用 `SingleMode.start()` |
| 棋盘数据 | `window.gameList`，15×15，空 `0`、黑 `1`、白 `2` |
| 回合值 | `window.gameTurn`：`0` 黑棋、`1` 白棋（与 `gameLogic.setPieceInGameList` 一致） |
| 玩家操作 | 点击棋盘；`window.isUserTurn` 控制是否允许落子 |
| AI | 白方由 `AI.js` 在玩家落子后执行 `shotPiece` |

**先后手**：`SingleMode.js` 中本有用随机数决定电脑是否先手，但存在 **`random = 1` 写死**，实际效果固定为玩家先手（黑棋）。

**扩展阅读**：神经进化 / 神经网络如何与当前 AI、训练 API（`server`）结合，见 **`神经网络与神经进化整合方案.md`**。

---

## 2. AI 决策流程（简述）

1. **`gameLogic.checkDanger()`**  
   扫描与已有棋子相邻的空格，写入 **`window.needComputePlace`**，作为候选落子点。

2. **若候选非空**  
   对每个候选点调用 **`gameLogic.getTheGameWeight(gameList, x, y, turn)`**（返回 **数字棋形分**，不再返回数组）：  
   - 先用「下一手若为 AI 方」的 `turn`（棋盘值 `1`/`2`）算进攻分；  
   - 再用「下一手若为玩家方」的 `turn` 算防守分。  
   棋形分由 **`computePatternScoreAt`** 汇总：在空位上假设落下该色子，对**横、竖、两斜**四条线做**连续段**分析，按 **成五 / 活四 / 冲四 / 活三 / 眠三 / 活二** 等查表加分，并对 **双活三**、**双冲四** 叠加组合加成。  
   用 **`util.getMostDangerPlace`** 在候选中各取进攻最大点、防守最大点，再比较两标量，**进攻分更大则攻，否则守**。

3. **无候选时**  
   落在 **`(7, 7)`**（天元）。

4. **落子与回合**  
   `gameLogic.setPieceInGameList` 更新棋盘 → `shotPiece` 生成棋子 → 延时后加入舞台 → `getResult` 判胜 → 切换 `window.gameTurn` 与 `window.isUserTurn`。

---

## 3. 相关文件职责

| 文件 | 职责 |
|------|------|
| `public/js/SingleMode.js` | 单人模式初始化、点击落子、调用 AI、胜负 UI |
| `public/js/AI.js` | `shotPiece`：调用 `checkDanger`、按棋形分比较攻守 |
| `public/js/gameLogic.js` | 棋盘写入、胜负检测、`checkDanger`、**棋形评分**（`virtualCell` / `scanConnectedLine` / `linePatternScore` / `computePatternScoreAt`）及 **`getTheGameWeight` 返回分数** |
| `public/js/util.js` | 坐标转换、`getMostDangerPlace`、`AIDelayShot` |

---

## 4. 已知问题分类

### 4.1 实现缺陷（建议优先修复）

| 编号 | 问题 | 状态 | 说明 |
|------|------|------|------|
| A | **`_tempCount` 为模块级全局变量**，`getTheGameWeight` 内未在每次评估开始时置 `0`，且多方向递归共用 | ✅ 已修复 | 已将 `_tempCount` 改为函数参数传递，每个方向独立从 0 开始计数，避免跨方向/跨点污染 |
| B | 八向递归权重与斜向不一致 | ✅ 已替代 | 已删除八向递归，横竖斜统一为四向 `scanConnectedLine` 棋形分析 |
| C | **`checkDanger` 使用裸变量 `gameList`**，依赖全局 `window.gameList` | 待修复 | 当前单人模式可用；若改为多实例或非 window 棋盘，易用错数据 |
| D | **`SingleMode.js` 中 `gameTurn` 与 `window.gameTurn` 混用** | 待修复 | 严格模式或部分打包环境下可能出现未定义引用；应与 `window.gameTurn` 统一 |

### 4.2 算法与产品设计局限

| 编号 | 说明 |
|------|------|
| E | **已改进**：棋形评分区分连五、活四、冲四、活三、眠三、活二及双活三/双冲四；**仍局限**：仅**连续段**、未识别跳三，分数表可继续调参 |
| F | 攻守只比较**两个标量**，相等时固定走防守分支；**无**多层搜索、VCF/VCT 等必胜/必败推演 |
| G | **`killPosition`** 仍保留为全局变量，**AI 已不再读取**；必胜/必防由高分棋形自然体现 |
| H | 文档与代码中已提及：**终局后仍可点击**、无重启等，属模式层体验问题，不限于 AI |

---

## 5. 改进优先级建议

### 5.1 已完成的修复

1. ✅ **`_tempCount` 参数化**（随后已由棋形重写替代八向递归）。
2. ✅ **棋形评分表**：`getTheGameWeight` 返回**整数分**，区分成五、活四、冲四、活三、眠三、活二等，并含双活三/双冲四加成；已移除对 **`weight_list.length`** 与 **`killPosition` 强制落子** 的依赖。
3. ✅ **代码精简**：删除原八向递归权重函数，逻辑集中在 `gameLogic.js` 顶部辅助函数。

### 5.2 待修复问题

1. **高**：`SingleMode.js` 去掉写死的 `random = 1`，并统一使用 **`window.gameTurn`**（修复问题 D）。
2. **中**：`checkDanger` 改为显式传入 `gameList` 参数，避免隐式依赖全局（修复问题 C）。

### 5.3 算法增强（低优先级）

1. 补充 **跳三**、更细的眠三/冲三分类，并迭代 **分数表**。
2. 实现简单搜索或 VCF/VCT 必胜/必败推演，提升 AI 决策质量。
3. 多候选 **同分** 时的次要排序（距离、中心偏好等）。

---

## 6. 版本说明

- 文档基于当前仓库中 `public/js` 下源码整理。  
- **开发时推荐**：在项目根目录执行 **`npm start`**（等价于 `gulp default`）。会完成首次拷贝与打包、启动 **http://localhost:5000**，并**监听** `public/js`、`index.html`、`public/css`、`config.js`；保存后自动执行对应构建/拷贝，并通过 **LiveReload** 刷新页面。**注意**：`gulp-connect` 的 `connect.server` 必须在服务器就绪时调用回调，否则 `gulp.series` 会卡在 `webserver`，**`watch` 根本不会启动**（终端里看不到「监听中」和 `[watch]`）。  
- 若用 `file://` 直接打开 HTML，LiveReload 不会生效，请始终用上述本地地址访问。  
- 仅改资源图等未列入监听的路径时，可手动执行 `npx gulp copy:resource`（或整包 `npx gulp copy`）。  
- **改代码后页面不变时**：请改 **`public/js/`** 源文件（勿改 `dist/js/main.js`）。`npm start` 后应先看到 **`chokidar 就绪`**；保存后先有 **`[watch] public/js/...`**，再有 **「正在打包…」**。若始终没有 **`Finished 'webserver'`** 与 **`chokidar 就绪`**，说明 `webserver` 未正确结束，`watch` 未启动（需 `connect.server` 传入就绪回调）。若仅有 `[watch]` 而无「正在打包」，保留终端输出便于排查。

### 6.1 修改记录

| 日期 | 修改内容 | 涉及文件 |
|------|----------|----------|
| 2026-03-23 | 修复 `_tempCount` 全局变量问题：改为函数参数传递，各方向独立计数；补齐 `getLeftBottomWeight`/`getRightBottomWeight` 空位延伸和 `killPosition` 逻辑；优化 `console.log` 描述 | `public/js/gameLogic.js` |
| 2026-03-23 | **棋形评分**：以四向连续段 + 评分表替代 `weight_list` 与八向递归；`getTheGameWeight` 返回数字；`AI.js` 去掉 `killPosition` 覆盖 | `public/js/gameLogic.js`、`public/js/AI.js`、`docs/单人模式与AI分析.md` |
