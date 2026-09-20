# 04 · Style Data 数据契约与 JSON 草案

版本：schema_version 0.1.0 ｜ 2026-09-20 ｜ 状态：文档草案，尚未实现读取器或校验器

## 原则

一套模板 + 每款一份结构化 JSON + 本地图片资产。HTML、PDF 和图片清单均读取同一修订版数据。页面可以手工排版验证，但业务数据从第一版就应独立，不把款号、材料和建议散落在模板里。

本文件定义字段与 JSON 示例，不是已经运行的数据库或正式 JSON Schema 文件。后续可据此实现校验器；当前不安装框架、不创建数据服务。

## 通用约定

- schema_version 表示数据结构版本；revision 表示款式资料版本，二者分开递增。
- style_id 在项目内唯一，格式最终待定；DEMO-001 仅供文档示意。
- 文本用 UTF-8；日期用 ISO 8601，精确审核时间须带时区。
- 未知标量用 null；空数组表示尚未提供条目，不能解释为“不需要”。呈现时显示“待确认”。
- 需要事实来源的建议使用 confirmation_status：suggested、pending_confirmation、confirmed。confirmed 必须有确认人和依据。
- status：draft、concept、master_locked、in_review、development_ready。is_demo 为 true 时禁止 development_ready。
- 新开模策略 tooling_policy = existing_library_only 表示范围要求；new_tooling = null 表示尚未核实，不能因此自动变成 false。若证据确认需要新工程，应改款或暂停纳入 V1。
- 所有 *_id 引用指向当前 JSON 中存在的对象；不能用同名显示文本代替稳定 ID。

## 顶层结构

| 字段 | 类型 | 内容与规则 |
| --- | --- | --- |
| schema_version / style_id / revision | string | 数据版本、款号、修订号 |
| is_demo / status | boolean / enum | 模拟标识与资料状态 |
| identity | object | name、season、category、target_market、priority、development_complexity |
| trend_origin | array | evidence_id、来源、记录日期、趋势解读、asset_ids |
| design_brief | object | opportunity、target、constraints、core_features |
| master_design | object | asset_id、view、locked、approved_by、approved_at |
| multi_views | array | view、asset_id、master_revision、qa_status、qa_notes |
| product_language | array | id、title、description、detail_asset_ids |
| structure_map | array | component_id、name、callout_asset_id、callout_label、description |
| materials | array | material_id、name、finish、specification、confirmation_status、source_ref |
| colorways | array | colorway_id、name、is_first_sample、preview_asset_id、assignments |
| bom | array | bom_id、component_id、material_id、colorway_id、finish、specification、confirmation_status |
| design_lock | array | lock_id、feature、intent、reference_asset_ids、component_ids |
| factory_adjustable | array | item_id、area、allowed_scope、must_preserve_lock_ids、report_back_when |
| construction_intent | array | note_id、component_ids、intent、reference_asset_ids、factory_validation |
| development_advice | object | first_sample_colorway_id、tooling_policy、factory_match、new_tooling、notes、open_questions |
| assets | array | 资产 ID、本地路径、类型、来源、用途、授权记录、哈希 |
| presentation | object | 未来工厂资料展示草案；当前图片上传页不读取 |
| gate | object | 固定 12 个 Gate 项及审核证据 |
| review | object | 最终签核、当前修订号与阻断项 |
| revision_history | array | revision、date、changed_by、summary、affected_gate_ids |

identity 中的市场、季节、优先级和复杂度在首款选择后填写；不从示例款号 FW27-SL-014 推断真实季节、市场或已存在鞋款。

## 嵌套对象规则

**材料规格 specification**：建议使用 value、unit、confirmation_status、source_ref；例如厚度未定时 value 为 null，不填 0。材质名称、厚度、色号和供应商码均须区分设计建议与实物确认。

**配色 assignments**：每项含 component_id、material_id、color_name、color_reference、confirmation_status。色号未知则 color_reference 为 null；界面色块/HEX 仅作屏幕示意，不等同于确认的实体色样。每个配色内同部件只有一条明确分配；若是拼接部件，先拆分 component_id。

**BOM**：每个配色的关键部件均应有行；一行通过 component_id、material_id、colorway_id 关联结构、材料与配色。供应商、数量、用量、成本不是本期强制已知项；未来增加时仍不得默认实际值。BOM 与配色 assignments 不得相互矛盾。

**factory_match**：last、sole、heel 各含 direction、library_id、confirmation_status、confirmed_by；方向可写建议，具体库号未经工厂确认保持 null。

**open_questions**：每项含 id、question、kind（design_blocker 或 factory_confirmation）、owner、status（open/resolved）、resolution。未解决 design_blocker 阻止 Ready；工厂工程待确认须明确负责人和后续动作。

**assets**：每项含 asset_id、kind（trend/master/view/detail/material/colorway/callout）、relative_path、mime_type、source_type、source_url、usage_status、usage_evidence、sha256。source_type 区分 reference、generated、factory_provided 等来源；usage_status 使用 pending/cleared/blocked，由人工依据实际材料确认。

relative_path 相对模块根目录，建议如 prototype/assets/shoes/DEMO-001/r01/lateral.png；不得包含个人绝对路径或越界的 ../。只有文件真实存在、可读取且路径有效时才填写；URL 不等于本地图片。sha256 在文件落地后计算，不手编哈希。示例路径不是已存在资产。

**Gate 项**：status（pending/pass/fail）、evidence_refs（证据引用数组）、reviewer、reviewed_at、reviewed_revision、notes。证据引用可使用 JSON Pointer（如 /master_design）或受控本地审核文件路径；必须实际可定位，且不能仅指向空字段。AI 检查结果可作为证据之一，人工审核字段不得由 AI 冒签。

**presentation** 是未来工厂资料展示的结构草案，不替代正式材料、BOM、Gate 或审核记录。当前 V0.3 图片上传页不读取 presentation 或 detail_tabs，也不显示任何开发资料弹窗。当前页面的实际图片状态以 `data/uploaded-styles.json` 为准；它记录每个鞋款位置和图片位置对应的本地网址与上传元数据。图片位置使用 `master`、`view-01…view-30`、`color-01…color-30`，编号连续增加；示例中的三张视角和两张配色只是初始显示数量，不是固定上限。

## 可解析的占位 JSON

以下是数据容器示例，不是一款已开发的鞋。没有图片、材料或签核，12 项 Gate 全部 pending；后续首款启动时才落地 data/style-demo.json 或真实款号文件。

```json
{
  "schema_version": "0.1.0",
  "style_id": "DEMO-001",
  "revision": "r01",
  "is_demo": true,
  "status": "draft",
  "identity": {
    "name": "待选首款（结构示例）",
    "season": null,
    "category": null,
    "target_market": null,
    "priority": null,
    "development_complexity": null
  },
  "trend_origin": [],
  "design_brief": {
    "opportunity": null,
    "target": null,
    "constraints": ["匹配工厂成熟楦库、底库、跟库；不做新工程"],
    "core_features": []
  },
  "master_design": {
    "asset_id": null,
    "view": "lateral",
    "locked": false,
    "approved_by": null,
    "approved_at": null
  },
  "multi_views": [
    {"view": "lateral", "asset_id": null, "master_revision": "r01", "qa_status": "pending", "qa_notes": null},
    {"view": "medial", "asset_id": null, "master_revision": "r01", "qa_status": "pending", "qa_notes": null},
    {"view": "front", "asset_id": null, "master_revision": "r01", "qa_status": "pending", "qa_notes": null},
    {"view": "top", "asset_id": null, "master_revision": "r01", "qa_status": "pending", "qa_notes": null},
    {"view": "back", "asset_id": null, "master_revision": "r01", "qa_status": "pending", "qa_notes": null}
  ],
  "product_language": [],
  "structure_map": [],
  "materials": [],
  "colorways": [],
  "bom": [],
  "design_lock": [],
  "factory_adjustable": [],
  "construction_intent": [],
  "development_advice": {
    "first_sample_colorway_id": null,
    "tooling_policy": "existing_library_only",
    "new_tooling": null,
    "factory_match": {
      "last": {"direction": null, "library_id": null, "confirmation_status": "pending_confirmation", "confirmed_by": null},
      "sole": {"direction": null, "library_id": null, "confirmation_status": "pending_confirmation", "confirmed_by": null},
      "heel": {"direction": null, "library_id": null, "confirmation_status": "pending_confirmation", "confirmed_by": null}
    },
    "notes": [],
    "open_questions": [
      {"id": "Q01", "question": "选择首款并补齐真实设计输入", "kind": "design_blocker", "owner": "项目负责人（姓名待确认）", "status": "open", "resolution": null}
    ]
  },
  "assets": [],
  "presentation": {
    "gallery": [
      {"asset_id": "master", "kind": "MASTER", "label": "主图", "relative_path": null},
      {"asset_id": "view-01", "kind": "DETAIL", "label": "细节图 01", "relative_path": null},
      {"asset_id": "view-02", "kind": "DETAIL", "label": "细节图 02", "relative_path": null},
      {"asset_id": "view-03", "kind": "DETAIL", "label": "细节图 03", "relative_path": null},
      {"asset_id": "cw-01", "kind": "COLORWAY", "label": "配色参考 01", "relative_path": null},
      {"asset_id": "cw-02", "kind": "COLORWAY", "label": "配色参考 02", "relative_path": null}
    ],
    "detail_tabs": {
      "design": {"label": "设计重点", "items": []},
      "materials": {"label": "建议材料", "items": []},
      "development": {"label": "开发建议", "items": []}
    }
  },
  "gate": {
    "trend_evidence": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "design_brief": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "master_design": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "multi_view": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "view_consistency": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "structure_map": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "material": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "bom": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "colorway": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "design_lock": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "factory_adjustable": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null},
    "development_advice": {"status": "pending", "evidence_refs": [], "reviewer": null, "reviewed_at": null, "reviewed_revision": null, "notes": null}
  },
  "review": {
    "approved_by": null,
    "approved_at": null,
    "approved_revision": null,
    "blocking_issue_ids": ["Q01"]
  },
  "revision_history": [
    {"revision": "r01", "date": "2026-09-20", "changed_by": "交接文档", "summary": "仅建立占位结构，无真实款式或审核结果", "affected_gate_ids": []}
  ]
}
```

## 后续校验规则

1. schema_version 支持、style_id 唯一、revision 非空；所有引用 ID 可解析。
2. 必需视图齐全且资产可打开，外侧母图与 multi_views 引用一致，版本相同。
3. 每个关键部件在 Structure Map、材料、BOM、配色和结构说明中一致。
4. Gate 固定 12 项；pass 必须有真实证据、审核人、日期和当前 revision，不接受历史版本签核。
5. development_ready 要求非 demo、母图锁定、所有 Gate pass、最终签核属于当前 revision、无未解决设计阻断项。blocking_issue_ids 与 open_questions 同步，不能仅清空 ID 来绕过阻断。
6. HTML、PDF 与资产清单绑定同一 style_id + revision。变更后不能继续发布旧包而不标版本。
7. 离线构建前逐项检查资产本地文件、完整性、可读性与使用状态；pending/blocked 资产不能进入正式交付。清单记录数量、文件大小及 SHA-256。
8. Standard 构建排除全部 Pro Style Data 与素材；Pro 只选择通过审核的正式款。

资料 Gate 与交付包验收是两层：资料 Ready 不代表图片已打包；打包成功也不代表资料 Ready。

## 离线读取策略

源数据保持独立 JSON。正式离线输出可在构建阶段安全序列化到 HTML 或本地脚本数据容器中，避免直接双击 file:// 页面时 fetch 本地 JSON 的兼容问题。具体方案在原型阶段选择并断网验证；尚未实现。数据文本按文本渲染，不直接作为 HTML 注入。
