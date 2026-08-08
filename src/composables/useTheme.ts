import { ref, watch } from 'vue'

type ThemeName = 'titan' | 'warning' | 'pink'

const currentTheme = ref<ThemeName>('titan')

watch(currentTheme, (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
})

export function setTheme(name: ThemeName) {
  currentTheme.value = name
  localStorage.setItem('titan-theme', name)
}

export function initTheme() {
  const saved = localStorage.getItem('titan-theme') as ThemeName | null
  if (saved && ['titan', 'warning', 'pink'].includes(saved)) {
    setTheme(saved)
  }
}

export function useTheme() {
  return {
    currentTheme,
    setTheme,
    initTheme
  }
}
