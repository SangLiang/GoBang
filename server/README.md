# 训练数据 API（Node）

## 启动

在项目根目录：

```bash
npm install
npm run server
```

默认监听 **http://127.0.0.1:3847**（与 gulp 的 5000 不冲突）。改端口：

```bash
set TRAINING_API_PORT=4000
npm run server
```

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 探活 |
| GET | `/api/training` | 读取 `data/ai-training.json` 解析后的对象；无文件则 `data: null` |
| POST | `/api/training` | 请求体为任意 JSON，**整文件覆盖**保存，并自动增加 `savedAt` |
| PUT | `/api/training/append` | 请求体 `{ "entry": { ... } }`，在文件中维护 `records` 数组并追加一条（含时间戳） |

## 前端调用示例（需页面在 http 下打开）

```javascript
// 保存（覆盖）
fetch("http://127.0.0.1:3847/api/training", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ weights: [0.1, -0.2], generation: 42 })
}).then(function (r) { return r.json(); }).then(console.log);

// 读取
fetch("http://127.0.0.1:3847/api/training").then(function (r) { return r.json(); }).then(console.log);
```

## 数据文件

- 默认路径：`data/ai-training.json`（已加入 `.gitignore`，不提交到仓库）

## NN 辅助权重（M2，可选）

在 `ai-training.json` 根对象可与 `records` 并列增加（也可用 `POST /api/training` 写入整文件）：

- `nnAssistSchemaVersion`：固定为 **1**（与前端 `nnAssist.NN_ASSIST_SCHEMA_VERSION` 一致）。
- `nnAssistWeights`：`Neuroevolution` 里 `Network.getSave()` 的形态 `{ "neurons": [6,4,1], "weights": [...] }`。  
  亦兼容字段名 **`weights`**（须仍带 `nnAssistSchemaVersion`）。

单人模式在 **NN 已开启且 λ≠0** 时会在开局 `GET /api/training` 尝试加载；失败或未匹配则使用内置随机初始网。

## 与 GoBang 单人模式联动（M1）

- 当前单人模式在**终局**时会尝试调用 `PUT /api/training/append`。
- 因此开发时建议同时启动：
  - 终端 1：`npm run server`
  - 终端 2：`npm start`
- 若训练 API 未启动，前端会 `console.warn`，但**不会中断游戏流程**。
