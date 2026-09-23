# 项目开发约定

## 项目背景

- 这是一个始于 2024 年的既有项目。控制改动范围，避免顺手重写旧模块或重构大型遗留组件；确实需要时再拆解新增职责。
- 前端基于 Vue、Vite，后端基于 NestJS。前端样式同时存在项目原有 SCSS 与 Tailwind CSS。

## 前端技术栈选择

- 新模块或独立新功能使用 Nuxt UI、Tailwind CSS（twcss）、Vue 和 TypeScript。
- 新增交互控件优先使用 Nuxt UI，并沿用设置页等既有页面的控件和视觉约定。
- 页面路由集中维护在 `frontend/src/router/index.ts`；新增页面沿用现有懒加载方式，catch-all 路由放在路由表末尾。
- 在已有模块中增加功能时，优先把新增职责拆分为边界清晰、可复用的组件。新建或拆分出的组件可以使用 Tailwind CSS。
- 修改已有组件时，沿用该组件及所在模块的既有实现方式和样式约定；项目原有 SCSS 组件继续使用 SCSS，不为局部修改迁移整块样式。
- 除非需求明确要求，不借实现新功能之机重写既有模块或统一迁移其样式体系。

## 整体 UI 风格

- 整体是清爽、克制、以内容为主的学习工具界面：浅色中性背景、清晰的页面边界、充足但有秩序的留白。沿用现有页头、导航、侧栏和主内容框架，不另造一套壳层。
- 主背景使用轻微的冷灰蓝层次；内容面板接近白色，使用细而浅的边框和轻柔的阴影。卡片圆角以现有约 10px 为基准，避免厚重描边、强投影、大片渐变和层层嵌套卡片。
- 色彩保持低饱和：正文为深蓝灰，次级说明为柔和的蓝灰，品牌强调色为现有青蓝色。强调色主要用于主操作、选中状态、链接和进度；错误、成功等状态沿用项目的语义色，不随意添加装饰色。
- 标题、正文、说明文字与统计数字有明确字号和字重层级。沿用现有 Inter 与系统中文字体栈；重点数值可以醒目，辅助说明保持次级对比度，避免全页都使用粗体或大字号。
- 导航默认轻量、低对比，当前项用深色和字重突出。按钮、筛选器和徽标保持紧凑；主操作使用品牌强调色，次要操作使用中性表面，不把所有操作都做成高亮按钮。
- 保持浅色和深色主题一致：新样式必须适应主题切换，不能依赖固定白底、纯黑字或只在浅色背景可读的颜色。
- SCSS 与 Tailwind CSS 混写时共用同一套视觉 tokens。优先使用 `main.scss` 中的 `--color-base*`、`--color-surface-*`、`--color-primary`、`--border-color-base*`、`--box-shadow-diverge`，以及 Nuxt UI 的语义色；不要在 SCSS 和 utility class 中各自硬编码或复制一套色板。
- 新组件可以用 Tailwind 表达布局、间距、字重和主题 token；旧组件继续沿用其 SCSS 结构。混写后仍需让背景、文字、边框、圆角、阴影、控件状态和深色主题看起来像同一个应用。

## 后端架构

- 新业务流程按事件驱动拆分：先列出业务事件及其 payload `interface`，再实现发布者与监听者。
- Service 只负责本业务域的核心数据库操作；核心操作成功后通过共享 EventBus 发布事件，通知、爬取等跨模块副作用由监听者处理。不要让业务 Service 直接互相依赖。
- 增加事件前先检查并复用项目级 EventBus；若基础设施缺失，先明确统一实现和模块注册方式，不要各自临时造总线。修改旧流程时控制范围，不为遵循新约定而迁移无关代码。
- 后端使用 NestJS、TypeORM 和 PostgreSQL。TypeORM 的 `synchronize` 保持关闭，数据库结构变更通过 migration 管理。
- HTTP 响应沿用 `ApiResponseUtil`。管理接口在后端校验管理员权限（当前约定为 `permission >= 10`），不能只依赖前端隐藏入口。
- 用户密码、身份证号、姓名等敏感字段不得直接暴露在管理响应或日志中；遵循现有加密与脱敏方式。

## 工具链与部署

- 使用 pnpm workspace；根 `package.json` 的 `packageManager`、CI 的 Node/pnpm 版本和工作流保持一致。当前 CI 使用 Node 22、pnpm 11.24.0，并以 `pnpm install --frozen-lockfile` 安装。
- 运行时直接依赖要声明在实际使用它的 workspace package 的 `dependencies` 中，并更新根 `pnpm-lock.yaml`。部署产物通过 Docker 构建并使用 backend 的生产依赖；本地 build 通过不代表部署产物或远程服务已验证。
- 修改生产依赖或部署打包逻辑时，检查 `deploy/Dockerfile.dist` 与 `scripts/build-dist.mjs` 的产物流程；只有实际构建并检查产物后，才报告产物验证通过。不要把本地 build 描述成远程部署成功。

## 修改与验证流程

- 修改前检查 `git status` 和目标文件 diff；保留已有工作区改动，不使用重置或覆盖式清理处理无关内容。
- 使用 TypeScript 和明确的 `interface` 描述跨模块事件 payload；避免无必要的 `any`。除非用户提出，不添加测试用例或 Mock 数据。
- 不因单个需求启用全项目 TypeScript strict 或批量改造旧代码的类型；保留现有非严格配置，局部补足可靠类型。
- 临时日志、调试代码在交付前移除；不要读取、输出或提交 `.env` 中的密钥与凭据。
- 如果任务明确要求多 Agent 协作，为各 Agent 划定互不重叠的文件范围，由主 Agent 复核合并结果并执行最终 build。
- 改动后运行相关 build：前端 `pnpm --filter ./frontend build`，后端 `pnpm --filter ./backend build`；涉及两端时运行根目录 `pnpm build`。build 失败时不能报告任务完成，也不要留下正在运行的开发服务器。
- 前端 `frontend:format` 会格式化整个 `src/`。窄范围改动只格式化本次修改的文件，避免行尾或全目录格式化噪音；提交前检查 `git diff --check` 和 `git status --short`。
- 用户要求提交时，使用中文 Conventional Commit，并明确暂存本次相关文件。
