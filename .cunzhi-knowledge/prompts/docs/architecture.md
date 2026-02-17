# 架构

**模板分类**: Message-Only
**提示级别**: 4 (Contextual)

项目架构模式、路径别名、共享类型和核心组件概述。

## 路径别名

项目使用 TypeScript 路径别名：

- `@api/*` → `src/api/*`
- `@auth/*` → `src/auth/*`
- `@db/*` → `src/db/*`
- `@shared/*` → `../shared/*`（monorepo 共享类型）
- `@validation/*` → `src/validation/*`

**始终使用这些别名导入，而非相对路径。**

## 共享类型基础设施

`shared/` 目录包含跨所有项目共享的 TypeScript 类型（后端、前端、CLI 工具）。这为 API 合约、数据库实体和认证类型提供单一真实来源。

### 何时使用 `@shared/types`

- API 请求/响应类型
- 数据库实体类型
- 认证类型
- 速率限制类型
- 验证类型

### 何时保留类型在应用内

- 应用特定类型
- 未通过 API 暴露的内部实现细节
- 依赖应用特定运行时全局变量的类型

### 导入示例

```typescript
// 导入共享类型用于 API 合约
import type { IndexRequest, SearchResponse } from "@shared/types";
import type { AuthContext, Tier } from "@shared/types/auth";
import type { Repository, IndexedFile } from "@shared/types/entities";

// 导入应用特定类型
import type { ApiContext } from "@shared/index";
```

### 破坏性更改

修改共享类型时，使用 TypeScript 编译器错误识别所有受影响的消费者，并在同一 PR 中更新它们。

## 核心组件

### 入口点

- 引导 HTTP 服务器
- 初始化数据库客户端
- 创建应用并开始监听
- 通过 SIGTERM 处理优雅关闭

### API 层

- **路由**: 中间件和路由处理器
- **查询**: 数据库查询函数

### 认证 & 速率限制

- **中间件**: 认证中间件和速率限制执行
- **验证器**: API 密钥验证和层级提取
- **密钥**: API 密钥生成
- **速率限制**: 基于层级的速率限制逻辑

### 验证

- **Schema**: 使用 Zod 的核心验证逻辑
- **类型**: 验证 API 的 TypeScript 类型
- **通用 Schema**: 常见模式的可重用 schema 帮助器
