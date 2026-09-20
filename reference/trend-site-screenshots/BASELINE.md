# Sightline FINAL 基线记录

核对日期：2026-09-20（北京时间）

## 源码基线

- 项目：`/Users/Admin/Documents/ChatGPT/趋势网站搭建`
- Git 分支：`main`
- 基线提交：`fb484a7 Add offline factory ZIP delivery workflow`
- 核对时状态：工作区干净，`HEAD` 与 `origin/main` 对齐
- 主视觉样式来源：`app/globals.css`
- 主页 / NEWS 结构来源：`app/trend-app.tsx` 与 `app/sightline-shell.tsx`

本项目不修改上述主站。后续集成以该提交的隔离副本为起点；若主站又有新提交，必须重新记录基线。

## 离线阅读包参考

- 文件：`/Users/Admin/Documents/ChatGPT/趋势网站搭建/outputs/sightline-offline-package-2026-09-15.zip`
- SHA-256：`9b2d56646ac006001d0945567100f7614810da31b072a4b30b35fb8f119f658c`
- 定位：已验收的离线 NEWS 阅读布局参考，不等同于当前源码的全部功能快照。

## 视觉参数

| 项目 | FINAL 参考 | Development 映射 |
| --- | --- | --- |
| 色彩 | 纯白 `#fff`、纯黑 `#000`、次级文字 `#666`、细线 `#d8d8d8` | 保持黑白高对比，审核状态不使用装饰性强调色 |
| 字体 | PingFang SC / Noto Sans CJK SC / Microsoft YaHei / Arial | 直接继承，不加在线字体依赖 |
| 顶栏 | 72px，白底，1px 黑线 | 同高度和品牌锁定结构 |
| Hero | 桌面 42% / 58% 分栏，黑色图像容器，完整图优先 | 左侧专题标题，右侧外侧母图，不强制裁切鞋体 |
| 边框 | 1px 直线网格 | 作为 Bento 信息组织主要语言 |
| 按钮 | 黑底白字或白底黑线，hover 反转 | V0.1 仅保留章节导航与未开放资料出口 |
| NEWS 密度 | 宽屏 5 列，每页 30 款 | 本次是单款专题，不复制 NEWS 商品网格 |
| 断点 | 主要为 900px 与 560/700px | 900px 下主栏堆叠，560px 下转单列 |

## 本地原型视觉命题

**Sightline Editorial Grid × Development Evidence**：沿用主站黑白直线体系，但将 NEWS 的“多款浏览”节奏改为“单款从视觉吸引逐步进入开发证据”的纵向叙事。

当前未复制主站图片资产；首款鞋图由用户生成并确认使用范围后再导入。
