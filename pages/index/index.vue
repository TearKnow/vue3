<template>
  <div class="page-nav">
    <div class="page-header">
      <h2>首页快捷入口</h2>
    </div>
    <p>这里是常用快捷入口，点击即可打开相应页面。<b>任何位置按ctrl+z打开快捷入口。</b></p>

    <div class="action-panels">
      <div class="action-group">
        <h3 class="action-group-title">
          快捷入口
        </h3>
        <div class="action-group-body">
          <NuxtLink
            v-for="item in quickEntryLinks"
            :key="item.to"
            class="action-card"
            :class="item.cardClass"
            :to="item.to"
            :target="item.openInNewTab ? '_blank' : undefined"
            :rel="item.openInNewTab ? 'noopener noreferrer' : undefined"
          >
            <span class="action-icon">{{ item.icon }}</span>
            <span class="action-label">{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { quickEntryLinks } from '~/constants/quick-entry-links'
</script>

<style>
.page-nav {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
}

.action-panels {
  margin: 16px 0 20px;
}

.action-group {
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  background: var(--blog-white);
  box-shadow: 0 4px 12px var(--blog-shadow-xs);
  overflow: hidden;
}

.action-group-title {
  margin: 0;
  padding: 10px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--blog-slate-500);
  background: var(--blog-slate-50);
  border-bottom: 1px solid var(--blog-slate-200);
}

.action-group-body {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  font-size: inherit;
  font-weight: 600;
  box-shadow: 0 2px 6px var(--blog-shadow-xs);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}

@media (max-width: 720px) {
  .action-card {
    flex: 0 0 calc(50% - 10px);
    width: calc(50% - 10px);
    min-width: calc(50% - 10px);
  }
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--blog-shadow-sm);
}

.action-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.action-label {
  font-size: 0.85rem;
  white-space: nowrap;
}

.card-blog {
  background: linear-gradient(180deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
  color: #065f46;
}

.card-browser {
  background: linear-gradient(180deg, #ede9fe 0%, #ddd6fe 100%);
  border-color: #c7b5ff;
  color: #5b21b6;
}

.card-route-tree {
  background: linear-gradient(180deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
  color: #991b1b;
}

html.dark .card-blog {
  background: linear-gradient(180deg, #064e3b 0%, #065f46 100%);
  border-color: #059669;
  color: #a7f3d0;
}

html.dark .card-browser {
  background: linear-gradient(180deg, #2e1065 0%, #3b0764 100%);
  border-color: #7c3aed;
  color: #ddd6fe;
}

html.dark .card-route-tree {
  background: linear-gradient(180deg, #450a0a 0%, #5c1010 100%);
  border-color: #b91c1c;
  color: #fecaca;
}
</style>
