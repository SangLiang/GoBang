# Tools Directory

此目录包含辅助工具脚本，用于管理训练流程和查看结果。

## 脚本说明

### 初始化工具

- **init-opponents.js** - 初始化对手权重文件
  ```bash
  npm run tools:init-opponents
  # 或
  node tools/init-opponents.js
  ```
  创建 `data/opponent-black.json` 和 `data/opponent-white.json`

### 更新对手权重

- **update-opponent-white.js** - 更新白方对手权重
  ```bash
  npm run tools:update-white
  # 或指定文件
  node tools/update-opponent-white.js evolved-xxxx.json
  ```

- **update-opponent-black.js** - 更新黑方对手权重
  ```bash
  npm run tools:update-black
  # 或指定文件
  node tools/update-opponent-black.js evolved-xxxx.json
  ```

### 查看工具

- **view-trained-games.js** - 查看训练后的对局棋谱
  ```bash
  npm run tools:view-games
  # 或
  node tools/view-trained-games.js
  ```

## 交替训练流程

```bash
# 1. 初始化对手（首次使用）
npm run tools:init-opponents

# 2. 训练白棋（config.js 中 EVOLVE_PLAY_BLACK_RATIO = 0）
npm run evolve:self

# 3. 更新白方对手权重
npm run tools:update-white

# 4. 修改 config.js，EVOLVE_PLAY_BLACK_RATIO = 1，训练黑棋
npm run evolve:self

# 5. 更新黑方对手权重
npm run tools:update-black

# 6. 重复步骤 2-5 进行交替训练
```

## 目录结构

```
GoBang/
├── scripts/          # 核心训练脚本（evolve-ai.js, boardCore.js 等）
├── tools/            # 辅助工具脚本（本目录）
├── data/             # 数据文件
│   ├── opponent-black.json    # 固定黑方权重
│   ├── opponent-white.json    # 固定白方权重
│   └── evolved-*.json         # 训练结果
└── ...
```
