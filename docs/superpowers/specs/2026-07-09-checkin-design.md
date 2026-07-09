# 首页签到功能设计

**日期**: 2026-07-09 | **状态**: 已确认

## 概述

在首页增加每日签到模块：勾选事项后保存，用 ECharts 展示最近 30 / 60 / 90 天各事项累计完成次数曲线。数据存于仓库 JSON，通过 GitHub API 持久化。

## 数据模型

文件路径：`data/checkin/checkin.json`

```json
{
  "items": [
    { "id": 1, "label": "日常打卡" },
    { "id": 2, "label": "算法刷题" }
  ],
  "records": {
    "2026-07-09": [1, 2]
  }
}
```

- `items`：事项列表，用数字 `id` 标识，历史记录只存 id；`label` 可自由修改。
- `records`：按日期 `YYYY-MM-DD` 存当天勾选的事项 id 数组。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/checkin` | 返回 items、records、今日签到状态；图表由前端按所选天数本地计算 |
| POST | `/api/checkin/save` | `{ date?, itemIds }`，更新当天记录并 commit；今日已签到则拒绝 |

## 前端

- 位置：`pages/index/index.vue` 快捷入口下方
- 组件：`components/CheckinPanel.vue`
- 今日事项复选框 + 保存按钮（无需密码）
- 今日已签到时禁用保存按钮与复选框
- ECharts 折线图：每个事项一条线，展示最近 30 / 60 / 90 天累计完成次数（默认 30 天，可切换）
