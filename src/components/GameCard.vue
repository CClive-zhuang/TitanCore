// 文件名: src/components/GameCard.vue
<template>
  <div 
    class="group relative w-full aspect-[2/3] rounded-theme transition-all duration-300 ease-out z-0 select-none hover:-translate-y-2 will-change-transform"
    @click="emit('action')"
    @contextmenu.prevent="emit('contextmenu', { id, x: $event.clientX, y: $event.clientY, title, type, installed: isInstalled, path: '' })"
    role="button"
    tabindex="0"
  >
    <div class="relative h-full w-full rounded-theme overflow-hidden bg-bg-panel border border-white/5 z-10 flex flex-col transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">

      <div class="absolute inset-0 overflow-hidden bg-black/40">
        <TitanImage 
          :id="id" :src="image" 
          class="w-full h-full object-cover transition-transform duration-700 ease-out backface-hidden group-hover:scale-110"
          :class="statusStyle"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500"></div>
      </div>

      <div v-if="showTopRightBadge && isInstalled" class="absolute top-2 right-2 z-20 px-2.5 py-1 rounded-[3px] bg-[#050a10]/90 border border-primary/20 text-primary text-[9px] font-bold font-code tracking-widest flex items-center gap-1.5 backdrop-blur-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_var(--primary)]"></span>
        <span>{{ t('status.ready') }}</span>
      </div>

      <div v-if="!hideControls" class="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center bg-black/60">
        <div class="flex items-center gap-2 w-full px-4">
          <button 
            type="button"
            v-if="type !== 'collection'"
            @click.stop="emit('collect')"
            class="flex-1 px-3 py-2 rounded-sm text-[10px] font-black font-code tracking-widest text-center transition-all border"
            :class="isInLibrary ? 'bg-primary/20 border-primary/30 text-primary hover:bg-primary/30' : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white hover:border-white/40'"
          >
            <span>{{ isInLibrary ? '★ ' + t('card.collected') : '☆ ' + t('card.collect') }}</span>
          </button>
          <button 
            type="button"
            @click.stop="emit('action')"
            class="px-3 py-2 rounded-sm text-[10px] font-black font-code tracking-widest text-center transition-transform hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
            :class="[buttonClass, 'flex-1']"
          >
            <span>{{ buttonText }}</span>
          </button>
        </div>
      </div>

      <div class="absolute bottom-0 inset-x-0 p-4 z-20 flex flex-col justify-end pointer-events-none">
        <div class="relative translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
          <h3 class="text-lg font-black text-white leading-tight mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-primary transition-colors duration-300 tracking-wide line-clamp-2">
            {{ displayTitle }}
          </h3>

          <div v-if="!showTopRightBadge" class="flex items-center justify-between mt-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
            <div class="flex gap-1.5 flex-wrap flex-1 mr-2">
              <span v-if="isInstalled" class="flex items-center gap-1 text-[9px] font-bold text-green-400 px-2 py-0.5 rounded border border-green-500/30 bg-black/80 tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> {{ t('status.ready') }}
              </span>
              <span v-else class="text-[9px] font-bold text-white/90 px-2 py-0.5 rounded border border-white/10 bg-black/70 tracking-wider whitespace-nowrap shadow-sm">
                {{ type === 'titan_protocol' ? 'STEAM' : (tags[0] || 'GAME') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!hideControls" class="absolute top-3 left-3 z-20 pointer-events-none transition-transform duration-300 group-hover:scale-105">
        <div :class="`px-2 py-0.5 border rounded-sm text-[8px] font-code font-bold tracking-[0.15em] shadow-[0_2px_5px_rgba(0,0,0,0.5)] ${currentTypeColor}`">
          {{ currentTypeLabel }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import TitanImage from './TitanImage.vue'

const props = defineProps<{
  id: string; title: string; tags: string[]; image: string; type: string;
  isInLibrary: boolean; isInstalled: boolean; isInstalling?: boolean; isDownloading?: boolean;
  hideControls?: boolean;
  showTopRightBadge?: boolean
}>()

const emit = defineEmits(['action', 'contextmenu', 'collect'])

const displayTitle = computed(() => {
  const safeTitle = props.title || ''
  return safeTitle.length > 40 ? `${safeTitle.slice(0, 37)}...` : safeTitle
})
const statusStyle = computed(() => props.isInstalled ? 'grayscale-0' : 'grayscale-[0.3] group-hover:grayscale-0')

const typeLabelMap: Record<string, string> = { 
  titan_module: t('type.titanModule'), 
  game: t('type.game'), 
  wallpaper: t('type.wallpaper'), 
  tool: t('type.tool'), 
  titan_protocol: t('type.titanProtocol'), 
  collection: t('type.collection'), 
  unknown: t('type.unknown'),
  patch: t('type.patch')
}

const typeColorClass: Record<string, string> = { 
  titan_module: 'bg-primary/15 text-primary border-primary/30 backdrop-blur-sm', 
  game: 'bg-green-500/15 text-green-300 border-green-400/30 backdrop-blur-sm', 
  wallpaper: 'bg-blue-500/15 text-blue-300 border-blue-400/30 backdrop-blur-sm', 
  tool: 'bg-gray-400/15 text-gray-300 border-gray-400/30 backdrop-blur-sm', 
  titan_protocol: 'bg-sky-400/15 text-sky-300 border-sky-300/30 backdrop-blur-sm', 
  collection: 'bg-pink-500/15 text-pink-300 border-pink-400/30 backdrop-blur-sm', 
  unknown: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30 backdrop-blur-sm',
  patch: 'bg-orange-500/15 text-orange-300 border-orange-400/30 backdrop-blur-sm'
}

const buttonClass = computed(() => {
  if (props.isInstalling || props.isDownloading) return 'bg-yellow-500 text-black animate-pulse'
  if (props.type === 'collection') return 'bg-pink-500 text-white'
  return props.isInstalled ? 'bg-green-500 text-white' : 'bg-primary text-black'
})

const buttonText = computed(() => {
  if (props.isInstalling || props.isDownloading) return t('card.syncing')
  if (props.type === 'collection') return t('card.viewCollection')
  if (props.isInstalled) {
    if (props.type === 'wallpaper') return t('card.applyWallpaper')
    if (props.type === 'titan_protocol') return t('card.inLibrary')
    return t('card.launch')
  }
  return t('card.view')
})

const currentTypeLabel = computed(() => typeLabelMap[props.type] || typeLabelMap['unknown'])
const currentTypeColor = computed(() => typeColorClass[props.type] || typeColorClass['unknown'])
</script>