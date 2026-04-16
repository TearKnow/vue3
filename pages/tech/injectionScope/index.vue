<template>
  <main class="wrap">
    <h2>Provide / Inject Scope Demo</h2>
    <p>点击每个区域的 +1，它们互不影响，<b>不会串起来</b>。</p>

    <ScopeProvider mode="product-detail" :initial="100">
      <section class="area detail">
        <h3>Detail Area</h3>
        <SharedPanel title="Detail store panel" />
        <SharedPanel title="Detail store panel" />
      </section>
    </ScopeProvider>

    <ScopeProvider mode="quick-purchase" :initial="0">
      <section class="area quick">
        <h3>Quick Purchase Area</h3>
        <SharedPanel title="Quick store panel" />
      </section>
    </ScopeProvider>

    <div class="tips">
      <p class="tips-title">结论与解释</p>
      <p>
        <b>provide</b> 可以理解为“向后代组件提供一份共享数据”；<b>inject</b> 可以理解为“后代组件按 key 取这份数据”。
        它们用于跨层级传值，避免一层层 props 透传。
      </p>
      <p>
        SharedPanel 内部调用的是 <code>useScopedCounterStore()</code>（本质是 inject）。
        inject 的查找规则是：从当前组件开始，沿着组件树向上逐层查找谁 provide 了对应 key，
        找到的第一个祖先就立即返回，这就是“从最近的祖先取值”。
      </p>
      <p>
        这里的 key 在本 demo 里不是手写字符串，而是 <code>createInjectionState(useScopedCounter)</code>
        在内部生成并管理的唯一 key（通常是 Symbol）。<code>provideScopedCounter</code> 和
        <code>useScopedCounterStore</code> 共享同一个 key：前者负责 provide，后者负责 inject。
      </p>
      <p>
        <code>provideScopedCounter</code> 的定义来源在 <code>useScopedCounter.ts</code>（由
        <code>createInjectionState</code> 生成并导出），真正执行 provide 的位置在
        <code>ScopeProvider.vue</code>（调用 <code>provideScopedCounter(props.initial, props.mode)</code>）。
      </p>
      <p>
        所以规则是：同一个 ScopeProvider 下的多个 SharedPanel 会共享同一份 store；
        不同 ScopeProvider 下的 SharedPanel 互不影响；如果出现嵌套 ScopeProvider，内层会覆盖外层（因为更近）。
      </p>
      <p class="tips-example-title">例子（伪结构）：</p>
      <pre class="tips-code">ScopeProvider(Outer)
├─ SharedPanel-A   // 读取 Outer
└─ ScopeProvider(Inner)
   └─ SharedPanel-B // 读取 Inner（就近优先）</pre>
    </div>
  </main>
</template>

<script setup lang="ts">
import ScopeProvider from './ScopeProvider.vue'
import SharedPanel from './SharedPanel.vue'
</script>

<style scoped>
.wrap {
  max-width: 720px;
  margin: 24px auto;
  display: grid;
  gap: 16px;
}

.area {
  padding: 12px;
  border-radius: 8px;
}

.tips {
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid #1677ff;
  background: #f0f7ff;
  border-radius: 6px;
  color: #1f2d3d;
  font-size: 14px;
  line-height: 1.6;
}

.tips-title {
  margin: 0 0 6px;
  font-weight: 700;
}

.tips-example-title {
  margin: 8px 0 4px;
  font-weight: 600;
}

.tips-code {
  margin: 0;
  padding: 8px 10px;
  background: #e8f2ff;
  border-radius: 6px;
  overflow-x: auto;
}

.tips code {
  background: #e8f2ff;
  padding: 0 4px;
  border-radius: 4px;
}

.detail {
  background: #fafafa;
}

.quick {
  background: #f6fbff;
}
</style>
