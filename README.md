# 灵山胜境 · 管理后台（lingshan-admin）

灵山胜境导览小程序的管理员 Web 端，提供知识库管理、数据大屏、游客报告等功能。

## 技术栈

- **前端**：Vue 3 + Element Plus + ECharts + Vite
- **后端**：CloudBase JS SDK 直接操作云数据库（无需云函数中间层）
- **认证**：CloudBase 匿名登录 + 应用层管理员账号校验
- **部署**：静态网站托管

## 项目结构

```
lingshan-admin/
└── web/                             # Vue 3 管理前端
    └── src/
        ├── api/
        │   ├── cloudbase.js         # CloudBase SDK 初始化 + 匿名登录
        │   ├── auth.js              # 管理员认证（基于 settings 集合）
        │   ├── knowledge.js         # 知识库 CRUD（直接操作云数据库）
        │   ├── dashboard.js         # 数据大屏聚合统计
        │   ├── reports.js           # 交互报告 & 情感分析
        │   ├── digitalHuman.js      # 数字人配置
        │   ├── faq.js               # FAQ 管理
        │   └── index.js             # 统一导出
        ├── stores/                  # Pinia 状态管理
        ├── router/                  # Vue Router 路由
        ├── views/                   # 页面组件
        └── components/              # 公共组件
```

## 与小程序的关系

- **共用云环境**：`cloud1-d3gyqt3k21c692b8e`
- **共用数据库**：`knowledge`、`knowledge_full`、`users`、`chat_history`、`settings`
- **直接操作**：Web 端通过 CloudBase JS SDK 匿名登录后，直接读写云数据库
- **无需云函数**：不依赖 HTTP 云函数作为中间层

## 本地开发

```bash
cd web
npm install
npm run dev
```

## 部署前准备

### 1. CloudBase 控制台配置

在 [CloudBase 控制台](https://console.cloud.tencent.com/tcb) 中：

1. **安全域名** → 将 `localhost:3000` 和你的生产域名加入白名单
2. **数据库权限** → 将以下集合设为「所有用户可读」：
   - `knowledge`
   - `knowledge_full`
   - `chat_history`
   - `settings`
3. **匿名登录** → 在「登录授权」中开启「匿名登录」

### 2. 默认管理员账号

- 用户名：`linghsn`
- 密码：`linghsn6688`

可在数据库 `settings` 集合中创建 `type: 'admin'` 文档自定义账号。

### 3. 部署前端

```bash
cd web
npm run build
# 将 dist/ 目录部署到 CloudBase 静态托管 或任意 Web 服务器
```

## 关联项目

- `dpxc-A5` — 灵山胜境微信小程序（共用同一个云环境）
