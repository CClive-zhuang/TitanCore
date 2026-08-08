<template>
  <div 
    ref="containerRef" 
    class="w-full h-full overflow-y-auto scrollbar-hide relative transform-gpu"
    @scroll="handleScroll"
  >
    <div 
      :style="{ height: totalHeight + 'px' }" 
      class="absolute inset-x-0 top-0 -z-10 w-full pointer-events-none"
    ></div>

    <div 
      :style="{ transform: `translate3d(0, ${visibleRange.offsetY}px, 0)` }"
      class="grid gap-6 p-6 will-change-transform"
      :class="gridColsClass"
    >
      <slot name="default" :items="visibleItems"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string | number }">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  items: T[]
  itemHeight?: number
  columns: number
  aspectRatio?: number
}>()

// --- 模块级静态常量，切断响应式开销与 GC 抖动 ---
const GAP = 24
const PADDING = 24
const BUFFER_ROWS = 4
const COL_MAP: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
  5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8'
}

// --- 响应式引用 ---
const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(800)
const containerWidth = ref(1200)

const gridColsClass = computed(() => COL_MAP[props.columns] || 'grid-cols-4')

const dynamicRowHeight = computed(() => {
  if (!props.aspectRatio || props.aspectRatio <= 0) return props.itemHeight || 360
  const w = containerWidth.value - (PADDING * 2)
  return w <= 0 ? 0 : ((w - (props.columns - 1) * GAP) / props.columns) / props.aspectRatio + GAP
})

const totalRows = computed(() => props.columns < 1 ? 0 : Math.ceil(props.items.length / props.columns))
const totalHeight = computed(() => totalRows.value * dynamicRowHeight.value)

const visibleRange = computed(() => {
  const h = dynamicRowHeight.value
  if (h <= 0 || props.columns === 0) return { start: 0, end: 0, offsetY: 0 }
  
  const startRow = Math.floor(scrollTop.value / h)
  const minRow = Math.max(0, startRow - BUFFER_ROWS)
  const maxRow = startRow + Math.ceil(containerHeight.value / h) + BUFFER_ROWS
  
  return { 
    start: minRow * props.columns, 
    end: Math.min(props.items.length, maxRow * props.columns), 
    offsetY: minRow * h 
  }
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((item, index) => ({ ...item, _virtualIndex: start + index }))
})

// 单行 rAF 帧合并，避免 Electron 主线程 Reflow 竞态碰撞
let rafId: number | null = null
const handleScroll = (e: Event) => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    rafId = null
    scrollTop.value = (e.target as HTMLElement)?.scrollTop || 0
  })
}

let resizeObserver: ResizeObserver | null = null

const initResizeObserver = () => {
  if (!containerRef.value) return
  // 直接解构首个 entry，规避冗余 for...of
  resizeObserver = new ResizeObserver(([entry]) => {
    containerHeight.value = entry.contentRect.height
    containerWidth.value = entry.contentRect.width
  })
  resizeObserver.observe(containerRef.value)
}

const scrollToTop = () => containerRef.value && (containerRef.value.scrollTop = scrollTop.value = 0)
const setScrollTop = (y: number) => containerRef.value && (containerRef.value.scrollTop = y)
const getScrollTop = () => scrollTop.value

defineExpose({ scrollToTop, setScrollTop, getScrollTop })

onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
    containerWidth.value = containerRef.value.clientWidth
    initResizeObserver()
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  resizeObserver && (resizeObserver.disconnect(), resizeObserver = null)
})
</script>