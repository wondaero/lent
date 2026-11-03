<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Chart, BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js'

// 필요한 컨트롤러만 등록(tree-shaking)
Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

const props = defineProps({ config: { type: Object, required: true } })
const canvas = ref(null)
let chart = null

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function build() {
  Chart.defaults.color = css('--text-3')
  Chart.defaults.borderColor = css('--line')
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily
  chart = new Chart(canvas.value, props.config)
}

onMounted(build)
// 데이터만 바뀌면 인스턴스를 재생성하지 않고 update
watch(() => props.config, (cfg) => {
  if (!chart) return build()
  if (chart.config.type !== cfg.type) { chart.destroy(); return build() }
  chart.data = cfg.data
  chart.options = cfg.options
  chart.update()
})
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div class="chart-box"><canvas ref="canvas" /></div>
</template>

<style scoped>
.chart-box { position: relative; width: 100%; height: 100%; }
</style>
