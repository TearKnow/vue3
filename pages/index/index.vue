<template>
  <div class="page-nav">
    <div class="page-header">
      <h2>首页快捷入口</h2>
    </div>
    <p>这里是常用快捷入口，点击即可打开相应页面。</p>

    <div class="action-panels">
      <div class="action-group">
        <h3 class="action-group-title">
          快捷入口
        </h3>
        <div class="action-group-body">
          <NuxtLink
            class="action-card card-blog"
            to="/blog"
          >
            <span class="action-icon">✍</span>
            <span class="action-label">博客</span>
          </NuxtLink>
          <NuxtLink
            class="action-card card-browser"
            to="/file-browser"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="action-icon">📂</span>
            <span class="action-label">文件浏览器</span>
          </NuxtLink>
          <NuxtLink
            class="action-card card-route-tree"
            to="/route-tree"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="action-icon">🧭</span>
            <span class="action-label">页面目录</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

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
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 12px rgb(15 23 42 / 5%);
  overflow: hidden;
}

.action-group-title {
  margin: 0;
  padding: 10px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
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
  box-shadow: 0 2px 6px rgb(15 23 42 / 6%);
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
  box-shadow: 0 6px 16px rgb(15 23 42 / 10%);
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
</style>
