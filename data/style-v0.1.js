(function () {
  "use strict";
  window.SIGHTLINE_DEVELOPMENT_STYLE = Object.freeze({
    schema_version: "0.1.0",
    style_id: "PENDING-001",
    revision: "r01",
    is_demo: true,
    status: "draft",
    identity: {
      name: "待选首款",
      season: null,
      category: null,
      target_market: null,
      priority: null,
      development_complexity: null
    },
    master_design: {
      asset_id: null,
      view: "lateral",
      locked: false,
      approved_by: null,
      approved_at: null
    },
    multi_views: [
      { view: "lateral", label: "外侧母图", asset_id: null, qa_status: "pending" },
      { view: "medial", label: "内侧", asset_id: null, qa_status: "pending" },
      { view: "front", label: "正面", asset_id: null, qa_status: "pending" },
      { view: "top", label: "俯视", asset_id: null, qa_status: "pending" },
      { view: "back", label: "后视", asset_id: null, qa_status: "pending" }
    ],
    product_language: [
      { id: "PL-01", title: "SILHOUETTE", description: "鞋头、鞋口、跟型与整体比例待从母图提取。" },
      { id: "PL-02", title: "LINE", description: "裁片、边界与缝线的关键关系待确认。" },
      { id: "PL-03", title: "SIGNATURE", description: "标识性带位、五金或局部细节待选定。" },
      { id: "PL-04", title: "SURFACE", description: "主材质感、光泽与颜色层次待与设计同步定义。" }
    ],
    design_lock: [],
    factory_adjustable: [
      { area: "成熟鞋楦匹配", scope: "由工厂提出接近方案，若改变锁定轮廓必须回报。" },
      { area: "成熟大底 / 鞋跟匹配", scope: "优先使用现有库；需新开工程时退回改款或暂缓。" },
      { area: "纸版与内部结构", scope: "由工厂完成工程实现，不得自行消除 Design Lock。" }
    ],
    materials: [],
    colorways: [],
    bom: [],
    construction_intent: [],
    development_advice: {
      tooling_policy: "existing_library_only",
      new_tooling: null,
      factory_match: {
        last: { direction: null, library_id: null, confirmation_status: "pending_confirmation" },
        sole: { direction: null, library_id: null, confirmation_status: "pending_confirmation" },
        heel: { direction: null, library_id: null, confirmation_status: "pending_confirmation" }
      },
      open_questions: [
        { id: "Q01", question: "首款设计母图与目标品类是什么？", owner: "项目负责人", status: "open" },
        { id: "Q02", question: "目标工厂可匹配的鞋楦、大底与鞋跟库号是什么？", owner: "工厂开发", status: "open" }
      ]
    },
    presentation: {
      gallery: [
        { asset_id: "master", kind: "MASTER", label: "主图", relative_path: null },
        { asset_id: "view-01", kind: "DETAIL", label: "细节图 01", relative_path: null },
        { asset_id: "view-02", kind: "DETAIL", label: "细节图 02", relative_path: null },
        { asset_id: "view-03", kind: "DETAIL", label: "细节图 03", relative_path: null },
        { asset_id: "cw-01", kind: "COLORWAY", label: "配色参考 01", relative_path: null },
        { asset_id: "cw-02", kind: "COLORWAY", label: "配色参考 02", relative_path: null }
      ],
      detail_tabs: {
        design: {
          label: "设计重点",
          items: [
            { title: "整体轮廓", body: "待 GPT 根据锁定母图提取。" },
            { title: "标识性细节", body: "待 GPT 根据实际鞋图说明。" },
            { title: "配色逻辑", body: "待与三个 AI 配色方案同步导入。" }
          ]
        },
        materials: {
          label: "建议材料",
          items: [
            { title: "鞋面主材", body: "材料名称、质感和表面方向待确认。" },
            { title: "辅助材料", body: "根据裁片和细节设计由 GPT 生成建议。" },
            { title: "鞋底 / 鞋跟", body: "只表达外观匹配方向，具体库号由工厂确认。" }
          ]
        },
        development: {
          label: "开发建议",
          items: [
            { title: "首版路线", body: "优先匹配工厂成熟鞋楦、大底与鞋跟库。" },
            { title: "样品重点", body: "待首款确定后列出视觉、结构和穿着验证项。" },
            { title: "工厂待确认", body: "楦底跟库号、纸版、内部结构、成本与周期。" }
          ]
        }
      }
    },
    gate: {
      trend_evidence: { label: "TREND EVIDENCE", status: "pending" },
      design_brief: { label: "DESIGN BRIEF", status: "pending" },
      master_design: { label: "MASTER DESIGN", status: "pending" },
      multi_view: { label: "MULTI-VIEW", status: "pending" },
      view_consistency: { label: "VIEW CONSISTENCY", status: "pending" },
      structure_map: { label: "STRUCTURE MAP", status: "pending" },
      material: { label: "MATERIAL", status: "pending" },
      bom: { label: "BOM", status: "pending" },
      colorway: { label: "COLORWAY", status: "pending" },
      design_lock: { label: "DESIGN LOCK", status: "pending" },
      factory_adjustable: { label: "FACTORY ADJUSTABLE", status: "pending" },
      development_advice: { label: "DEVELOPMENT ADVICE", status: "pending" }
    }
  });
})();
