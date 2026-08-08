import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePlayerStore = defineStore('arcadePlayer', () => {
  const scrap = ref(0);
  const cores = ref(0);
  const totalPlayTime = ref(0); // 分钟

  function $reset() {
    scrap.value = 0;
    cores.value = 0;
    totalPlayTime.value = 0;
  }

  return { scrap, cores, totalPlayTime, $reset };
});