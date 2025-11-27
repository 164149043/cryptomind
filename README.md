# CryptoMind.AI - 多智能体加密货币交易助手

## 简介

**CryptoMind.AI** 是一个基于 React 的分层式 AI 交易决策系统。它模拟了一家专业的加密货币对冲基金的运作架构，协调 9 个专业的 AI 智能体（从底层分析师到顶层 CEO）来分析实时的 BTC/USDT 市场数据，并生成精准的交易信号。

系统支持 **Google Gemini 2.5**（速度快、免费额度高）和 **DeepSeek R1**（擅长深度推理）两种模型。

## 核心功能

*   **多智能体分层架构**：
    *   **第1层 (分析师)**：短线、趋势、量化、链上、宏观分析师并行工作，从不同维度解析市场。
    *   **第2层 (经理)**：技术经理和基本面经理汇总下属报告，解决观点冲突。
    *   **第3层 (风控)**：风控经理计算盈亏比 (R:R)，拥有“一票否决权”，确保交易安全。
    *   **第4层 (CEO)**：综合所有信息，输出最终的 JSON 交易指令（开多/开空/观望）。
*   **实时数据集成**：
    *   集成 **Binance API** 获取实时 K 线、订单簿深度（Order Book）和资金费率。
    *   集成 **Etherscan API** 获取实时 ETH Gas 价格，辅助判断链上热度。
*   **双模型切换**：用户可以在界面上一键切换使用 Google Gemini 或 DeepSeek 模型。
*   **交互式 UI**：
    *   包含技术指标（SMA, Bollinger Bands）的实时 K 线图表。
    *   可视化的智能体思维链（Chain of Thought）展示。
    *   持仓管理模拟：输入你的持仓成本，AI 会给出针对性的建议。

## 技术栈

*   **前端框架**: React 19, TypeScript
*   **样式库**: Tailwind CSS
*   **图表库**: Recharts
*   **AI SDK**: Google GenAI SDK (`@google/genai`), Fetch API (DeepSeek)
*   **数据源**: Binance API (Market Data), Etherscan API (On-Chain Data)

## 部署与运行

### 1. 环境准备

确保你的本地环境已安装：
*   [Node.js](https://nodejs.org/) (推荐 v16 或更高版本)
*   npm 或 yarn

### 2. 获取代码

```bash
git clone https://github.com/164149043/cryptomind.git
cd cryptomind-ai
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置 API Key

本项目依赖 AI 模型的 API Key 才能运行。

**方式 A：通过环境变量配置（推荐）**

在项目根目录下创建一个 `.env` 文件（或修改现有的环境配置文件），添加以下内容：

```env
# Google Gemini API Key (必须)
# 获取地址: https://aistudio.google.com/
API_KEY=AIzaSy...

# DeepSeek API Key (可选，也可以在网页 UI 中直接输入)
# 获取地址: https://platform.deepseek.com/
DEEPSEEK_API_KEY=sk-...
```

**方式 B：通过 UI 配置**

项目启动后，你也可以直接在网页界面的输入框中填入 DeepSeek API Key 和 Etherscan API Key。

### 5. 启动开发服务器

```bash
npm start
# 或者使用 vite/next 等命令，取决于具体的构建工具
# npm run dev
```

启动成功后，打开浏览器访问 `http://localhost:3000`（具体端口请查看控制台输出）。

## 使用指南

1.  **选择语言与模型**：点击右上角的语言按钮切换中/英，点击“Gemini”或“DeepSeek”切换底层模型。
2.  **输入标的**：在顶部输入框输入交易对（如 `BTCUSDT`, `ETHUSDT`, `SOLUSDT`）。
3.  **设置持仓（可选）**：点击控制面板中的“设置持仓”，输入你当前的开仓价格和方向。AI 会在分析时考虑到你的持仓风险。
4.  **开始运行**：点击右侧的 **"开始市场分析"** 按钮。
5.  **查看结果**：
    *   观察右侧的智能体节点依次亮起，它们会实时打字输出分析逻辑。
    *   等待 CEO 输出最终决策弹窗。
    *   点击右上角的设置图标，可以填入 **Etherscan Key** 以启用链上数据分析，或调整每个智能体的“随机性”（Temperature）。

## 目录结构说明

```
/
├── components/      # UI 组件 (Header, Chart, AgentNode, Modals 等)
├── hooks/           # 核心业务逻辑 Hooks (useAgentWorkflow)
├── services/        # API 服务层
│   ├── binanceService.ts  # 币安行情数据
│   ├── etherscanService.ts # 链上 Gas 数据
│   ├── geminiService.ts    # Google Gemini 调用封装
│   ├── deepseekService.ts  # DeepSeek 调用封装
│   └── prompts.ts          # AI 提示词工程与技术指标计算
├── types.ts         # TypeScript 类型定义
├── locales.ts       # 多语言翻译文件
├── constants.ts     # 智能体角色定义与默认配置
├── App.tsx          # 主应用入口组件
└── index.tsx        # React 挂载点
```

## 免责声明

本系统生成的交易建议仅供学习和研究使用，不构成任何财务建议。加密货币市场波动巨大，请自行承担投资风险。
