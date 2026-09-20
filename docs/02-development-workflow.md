# 02 · 单款开发流程与审核

版本：V1.0 ｜ 2026-09-20 ｜ 上级依据：[项目交接书](../PROJECT_HANDOFF.md)

## 8 步流程

| 步骤 | 输入 | 工作与输出 | 放行与退回规则 |
| --- | --- | --- | --- |
| 01 Trend Opportunity | 趋势图、元素、鞋型参考、买手判断 | 记录来源；形成 Design Brief：目标、机会、限制、不可改变的视觉特征 | 用户确认方向；缺少明确设计目标则补 Brief |
| 02 Concept Design | Brief 与参考 | 少量候选，记录采用和放弃原因 | 用户选定一个方向；候选保持 concept，不向工厂称 Ready |
| 03 Master Design Lock | 入选概念 | 锁定外侧母图、款号、版本、关键特征 | 用户确认锁版后才能派生多视图 |
| 04 Multi-view + QA | 当前版本母图与 Lock | 外侧、内侧、正面、俯视、后视；逐项对照记录 | 任一关键结构冲突则修改/重生成并复核 |
| 05 Structure Map | 已复核视图 | 关键部件编号、名称与标注位置 | 标注、BOM、材料和结构意图必须共用编号 |
| 06 Material + Color + BOM | Structure Map、材质方向 | 材料板、首版配色、部件清单、规格建议与未知项 | 材料/配色映射无冲突，关键部件无遗漏 |
| 07 Intent + Advice | 以上全部内容 | Design Lock、Factory Adjustable、结构意图、首版路线和验证事项 | 不越界代替工厂工程；阻断设计理解的问题先解决 |
| 08 Development Ready Review | 同一修订版的完整资料 | 12 项 Gate、审核记录、发布判断 | 全部 pass 且当前版本人工签核，才成为 Pro 交付候选 |

用户承担买手/设计负责人角色，AI 辅助工作，工厂提供可行性与工程反馈。正式审核人的姓名/分工在首款启动时确定，本次不代填。

## 多视图复核

必需视角：lateral 外侧、medial 内侧、front 正面、top 俯视、back 后视。3/4、局部 Detail 可按需要补充；底视只在表达设计意图确有需要时增加，不生成虚假的底模工程。

逐项核对鞋头长度与轮廓、鞋口线、跟高与跟型的视觉一致性、后带连接点、扣饰所在侧及数量、裁片关系、缝线和材料边界。每项记录对照图、问题位置、结论和修订动作。非对称设计应按 Brief 对照，不能误判为必须镜像。

图片透视不能用来推算精确毫米尺寸。只有用户/工厂确认的数值才可标为确认规格；建议值必须注明建议及验证人。不能仅凭图像断言穿着舒适、强度合格或工程可行。

## 部件与材料编号

例如 A01 前帮、A02 后带、A03 五金扣是编号示意，实际拆件依首款而定。一个 component_id 在 Structure Map、BOM、Colorway 和 Construction Intent 中指向同一部件。修改名称不改变身份；拆分/合并部件时更新修订记录及全部引用。

每个关键部件须有明确材料和颜色方向。厚度、供应商、材料编号、实际用量、单价或楦号未知时保留待确认，不能为使表格显得完整而虚构。BOM 是开发材料清单，尚非已核价的生产 BOM。

## 12 项 Gate 操作标准

| ID | Gate | 审核内容 | 不通过示例 |
| --- | --- | --- | --- |
| trend_evidence | TREND EVIDENCE | 来源、趋势点、与本款的关系 | 只有图片，没有来源或解读 |
| design_brief | DESIGN BRIEF | 目标、品类、设计方向、约束 | 不清楚给谁做或保留什么 |
| master_design | MASTER DESIGN | 当前母图、款号、版本、锁版记录 | 母图仍在选择或版本不明 |
| multi_view | MULTI-VIEW | 五个必需视角可读取 | 缺内侧图或图片文件丢失 |
| view_consistency | VIEW CONSISTENCY | 对照母图的逐项审核 | 带位、五金、裁片发生冲突 |
| structure_map | STRUCTURE MAP | 关键部件编号与标注 | BOM 与图上编号不是同一部件 |
| material | MATERIAL | 各部位材料、表面方向与确认状态 | 主材完全未定或与图片冲突 |
| bom | BOM | 关键部件、材料和颜色映射 | 关键部件遗漏或引用无效 |
| colorway | COLORWAY | 首版方案及部件颜色分配 | 图片与 BOM 主色矛盾 |
| design_lock | DESIGN LOCK | 必须保留的特征和参考位置 | 工厂无法知道哪些外观不能改 |
| factory_adjustable | FACTORY ADJUSTABLE | 工程调整边界及回报条件 | 把改外观与工程调整混为一谈 |
| development_advice | DEVELOPMENT ADVICE | 首版路线、重点验证、未决事项 | 只写“可开发”，无具体建议 |

每项包含 status、evidence_refs、reviewer、reviewed_at、reviewed_revision、notes。status 只能是 pending/pass/fail；不得删除必需 Gate 或以 N/A 代替。

Ready 判定条件：12 项全部 pass、每项证据有效且属于当前 revision、有真实人工审核记录、非演示数据、无阻断设计问题、当前版本最终签核完成。缺少任何一个条件都不能发布为 Ready。该判定规则尚未实现为程序。

## 状态与修订

建议状态顺序：draft → concept → master_locked → in_review → development_ready。只有实际完成相应工作才迁移状态；不是按日期自动升级。

出现关键设计变化时创建新 revision，恢复 in_review，撤销受影响 Gate 的通过状态并重新审核；不得沿用上一版的签核冒充当前版。未受影响证据可引用，但审核人仍须对当前 revision 重新确认。所有 HTML/PDF/ZIP 必须绑定同一发布修订版。

演示数据可用于 V0.1 版式验证，必须显著标注 demo，不能进入 development_ready。若为演示 Ready 版式，应单独标注“状态展示示意”，不能伪造审核签名。

## 未决事项的两种处理

阻断设计的问题：缺视图、部件不明、裁片冲突、主材视觉方向未定、Lock 与 Flex 相互矛盾。处理：停在审核阶段，补齐资料。

工程接棒事项：具体楦号/底号/跟号、材料供货、内部加固、成本与样品周期。可以作为 factory_confirmation 事项列出，明确责任人和验证动作；其存在不能被解释为已确认能生产。若发现没有成熟库可以匹配且需要新工程，返回改款或暂缓本款。

## 工厂接棒与反馈

工厂匹配成熟楦底跟 → 开纸版 → 备料 → 做面与成型 → 首版样鞋 → 复核与修改。我们继续核对样鞋是否保留 Design Lock，工厂负责功能和工程验证。

后续可收集正面、侧面、后面、俯视、3/4、上脚照片与文字反馈，形成 Revision。样鞋评审与 12 项资料 Gate 分开记录；本次不生成样品，不承诺工厂已认可，也不建设自动反馈系统。
