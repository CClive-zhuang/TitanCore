<template>
  <img 
    :src="currentSrc" 
    :alt="alt || ''" 
    class="w-full h-full object-cover bg-[#050505] transition-opacity duration-200"
    :class="show ? 'opacity-100' : 'opacity-0'"
    @load="onLoad"
    @error="handleError" 
    draggable="false"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import defaultCover from '../assets/default_cover.webp'

const props = defineProps<{
  id: string
  src: string
  alt?: string
}>()

const currentSrc = ref('')
const show = ref(false)

const load = async () => {
  show.value = false
  try {
    const hasLocal = await window.electron.invoke('sys:check-local-cover', props.id)
    if (hasLocal) {
      currentSrc.value = `titan-img://cover/${props.id}`
    } else {
      currentSrc.value = props.src || defaultCover
    }
  } catch (e) {
    currentSrc.value = props.src || defaultCover
  }
}

const onLoad = () => {
  show.value = true
}

const handleError = () => {
  if (currentSrc.value !== defaultCover) {
    currentSrc.value = defaultCover
  }
}

watch(() => props.id, load, { immediate: true })
</script>