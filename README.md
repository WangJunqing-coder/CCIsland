# 🏝️ CCIsland - Claude Code 灵动岛

一个 macOS 风格的桌面灵动岛组件，实时显示 Claude Code 的运行状态。

**认真摸鱼，工作交给CC，完成会通知你**

无需任何配置，启动即用。当 Claude Code 需要确认时，灵动岛会闪烁提醒并发送系统通知，再也不用担心错过确认提示。

## ✨ 功能特性

- **开箱即用** — 无需配置，双击即用
- **自动检测** — 自动监控 Claude Code 进程和活动状态
- **灵动岛 UI** — macOS 风格顶部悬浮胶囊，支持展开/折叠动画
- **系统通知** — 需要确认时弹出系统通知 + 闪烁提醒
- **实时状态** — 运行中、待确认、已完成、错误等状态实时显示

## 📸 状态展示

| 状态  | 图标  | 颜色  | 说明              |
| --- | --- | --- | --------------- |
| 就绪  | 💤  | 灰色  | Claude Code 未运行 |
| 运行中 | ⚡   | 蓝色  | 正在执行（呼吸动画）      |
| 待确认 | ⚠️  | 橙色  | 需要用户确认（闪烁 + 通知） |
| 已完成 | ✅   | 绿色  | 任务完成            |
| 错误  | ❌   | 红色  | 执行出错            |

![1780565769642.png](image%2F1780565769642.png)

![1780565551991.png](image%2F1780565551991.png)

![1780565573661.png](image%2F1780565573661.png)

![1780565676214.png](image%2F1780565676214.png)




## 🚀 快速开始

### 方式一：直接下载

1. 下载 `CCIsland-v1.0.0-win64.zip`
2. 解压到任意位置
3. 双击 `CCIsland.exe` 启动

### 方式二：从源码构建

```bash
# 克隆项目
git clone <repo-url>
cd CCIsland

# 安装依赖
npm install

# 开发模式运行
npm start

# 打包为可执行文件
npm run build
```

打包产物在 `dist/CCIsland-win32-x64/` 目录。

## 🔧 工作原理

CCIsland 启动时会**自动配置 Claude Code 的 hooks**（写入 `~/.claude/settings.json`），之后 Claude Code 在执行工具、等待确认、完成任务时会自动通知灵动岛。

- **自动配置** — 首次启动自动写入 hooks，无需手动操作
- **实时状态** — Claude Code 主动推送状态，准确可靠
- **HTTP 接口** — 同时提供 HTTP API，支持外部程序主动推送状态

## 📡 HTTP API

灵动岛启动后会在 `http://127.0.0.1:31126` 开启 HTTP 服务。

### 获取状态

```bash
curl http://127.0.0.1:31126/status
# 返回: {"status":"running","message":"Claude Code 正在运行"}
```

### 推送状态

```bash
curl -X POST http://127.0.0.1:31126/status \
  -H "Content-Type: application/json" \
  -d '{"status": "waiting", "message": "需要确认: 是否继续?"}'
```

支持的状态值：`idle`、`running`、`waiting`、`completed`、`error`

### 使用 Node.js 脚本推送

```bash
node hooks/notify.js running "正在编译..."
node hooks/notify.js waiting "需要确认"
node hooks/notify.js completed "任务完成"
node hooks/notify.js error "出错了"
```

## 🎨 界面交互

- **鼠标悬停** — 展开显示详细状态信息
- **鼠标离开** — 自动折叠回紧凑态
- **状态变化** — 自动展开显示，3 秒后折叠
- **待确认状态** — 持续闪烁，不自动折叠

## 📁 项目结构

```
CCIsland/
├── package.json          # 项目配置
├── main.js               # Electron 主进程 + 自动配置 hooks + HTTP 服务
├── preload.js            # 安全 IPC 桥接
├── renderer/
│   ├── index.html        # 灵动岛界面
│   └── style.css         # 动画样式
├── hooks/
│   ├── notify.js         # 状态推送脚本
│   ├── setup.sh          # macOS/Linux hooks 配置（可选）
│   └── setup.cmd         # Windows hooks 配置（可选）
├── assets/
│   └── create-icon.js    # 图标生成脚本
└── dist/                 # 打包输出
    └── CCIsland-win32-x64/
        ├── CCIsland.exe
        └── 使用说明.txt
```

## ⚙️ 配置说明

### 开机自启动

将 `CCIsland.exe` 的快捷方式放入启动文件夹：

```
Win+R 输入: shell:startup
将快捷方式拖入打开的文件夹
```

### 修改端口

编辑 `main.js` 中的 `PORT` 常量：

```javascript
const PORT = 31126; // 修改为你想要的端口
```

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式
npm start

# 手动测试状态推送
node hooks/notify.js running "测试"
node hooks/notify.js waiting "测试"
node hooks/notify.js completed "测试"

# 打包
npm run build
```

## 📋 系统要求

- Windows 10/11 (64-bit)
- macOS / Linux（需自行构建）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
