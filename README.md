# 趋势AI鞋款设计库

趋势网站内的 AI 鞋款图片模块。已进入 V0.3：桌面双栏的“固定大主图 + 可扩展视角图 + 全量配色参考”结构已建立，可持续新增款式；每页展示四款并自动分页。所有已上传配色在同一张款式卡片中同时展开，数量增加时卡片只向下延伸，不改变主图尺寸，也不使用内部翻页。空图片位可点击上传；已有图片可放大查看、独立替换或删除，删除后后续配色会自动补位；刷新后仍然保留。当前不包含开发资料板块。

## 从这里开始

先读 [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md)，再按 docs/01–05 阅读。交接书统领已确定的目标和边界；细分文档提供实施依据。后续变更同步更新交接书与对应文档，不能在不同文件中保留冲突规则。

本地工作区：

```text
/Users/Admin/Documents/ChatGPT/趋势AI鞋款设计库
```

## 目录

```text
趋势AI鞋款设计库/
├── PROJECT_HANDOFF.md
├── README.md
├── docs/
│   ├── 01-product-definition.md
│   ├── 02-development-workflow.md
│   ├── 03-page-information-architecture.md
│   ├── 04-data-schema.md
│   └── 05-integration-plan.md
├── reference/
│   ├── trend-site-screenshots/  # 已记录主站 FINAL 基线与视觉参数
│   └── design-reference/       # 空：等待首款设计输入
├── prototype/
│   ├── index.html              # PRO DEVELOPMENT 多款图片模块
│   ├── css/development.css     # development-module 隔离样式
│   ├── js/development.js       # 图片选择、拖入、上传与回显
│   └── assets/
│       ├── shoes/uploads/      # 网页上传后的真实图片
│       ├── materials/          # 空
│       └── icons/              # 空
├── data/uploaded-styles.json   # 当前图片路径与上传元数据
├── data/style-v0.1.js          # 未来工厂资料的数据草案，当前页面不读取
└── server.mjs                  # 本地静态页面与图片上传服务
```

在项目根目录运行 `node server.mjs`，再打开 `http://127.0.0.1:4174/prototype/`。必须通过该地址使用上传功能；直接双击 HTML 或使用旧的 4173 静态地址只能展示，不能保存图片。本项目使用独立 Git 仓库管理，尚未修改现有趋势网站。

当前 V0.3 是可实际使用的本地图片上传与展示页；首个款式已导入主图和多张真实配色图。“＋视角”和“＋配色”可建立后续图片位置，上传后会持久保存；配色按数量自动形成 2–3 列并继续向下排列。“新增款式”会创建新的独立款式记录，新款排在第一页最前，超过四款后自动分页。批量智能导入尚未接入，本阶段先验收全量配色版式。工厂开发资料、Gate 与 BOM 不在当前网页范围；旧数据草案仅留作以后需要时参考。主站基线见 [`reference/trend-site-screenshots/BASELINE.md`](reference/trend-site-screenshots/BASELINE.md)。

## 文档索引

| 文件 | 解决的问题 |
| --- | --- |
| [产品定义](docs/01-product-definition.md) | 服务谁、卖什么、双方负责什么 |
| [开发流程](docs/02-development-workflow.md) | 单款如何走完 8 步并通过 12 项 Gate |
| [页面信息架构](docs/03-page-information-architecture.md) | 图片拼图、真实上传与本地保存 |
| [数据契约](docs/04-data-schema.md) | 用同一份 Style Data 生成页面和交付物 |
| [集成计划](docs/05-integration-plan.md) | 如何独立验证、接入、导出和验收 |

## 使用约定

- 当前已进入 V0.3 动态图片模块；首款已有真实主图与多张配色，更多视角和配色可以按需增加、替换或删除。
- 示例价格 Standard ¥10,000/年、Pro ¥16,000/年；数量、条款待确认。
- 所有模拟数据明确标为演示；不以演示素材通过 Development Ready Gate。
- 工厂承担成熟楦底跟匹配、纸版和打样；本项目不交付生产 CAD。
- 主站代码保持隔离，集成前先记录 FINAL 基线与回退点。

目标日期为 2026-10-01 前；HTML、PDF、图片资产 ZIP 和工厂演示包均是后续目标，目前尚未生成。
