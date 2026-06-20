<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useFluidStore } from './store/fluid'
import { PRESETS } from './utils/sph-engine'
import FluidCanvas from './components/FluidCanvas.vue'
import ControlPanel from './components/ControlPanel.vue'

const store = useFluidStore()

onMounted(() => {
  store.initSimulation(PRESETS[0])
})

type StatsMode = 'simple' | 'detailed'
const statsMode = ref<StatsMode>('simple')

interface MetricItem {
  label: string
  value: string | number
  color: string
}

const simpleMetrics = computed<MetricItem[]>(() => [
  { label: 'FPS', value: store.fps, color: 'text-green-400' },
  { label: '粒子', value: store.particleArray.length, color: 'text-blue-400' },
  { label: '平均密度', value: store.avgDensity.toFixed(1), color: 'text-yellow-400' },
  { label: '最大速度', value: store.maxVelocity.toFixed(1), color: 'text-red-400' },
  { label: '当前预设', value: store.currentPreset.label, color: 'text-purple-400' },
  { label: '帧数', value: store.frameCount, color: 'text-gray-300' },
])

const detailedMetrics = computed<MetricItem[]>(() => [
  { label: 'FPS', value: store.fps, color: 'text-green-400' },
  { label: '帧数', value: store.frameCount, color: 'text-gray-300' },
  { label: '模拟时间', value: `${store.simTime.toFixed(2)}s`, color: 'text-cyan-400' },
  { label: '运行状态', value: store.isRunning ? '运行中' : '已暂停', color: store.isRunning ? 'text-green-400' : 'text-gray-400' },
  { label: '粒子数', value: store.particleArray.length, color: 'text-blue-400' },
  { label: '活跃粒子', value: store.activeParticleCount, color: 'text-blue-300' },
  { label: '静止粒子', value: store.restingParticleCount, color: 'text-slate-400' },
  { label: '边界粒子', value: store.boundaryParticleCount, color: 'text-violet-400' },
  { label: '网格单元', value: store.gridCellCount, color: 'text-sky-400' },
  { label: '当前预设', value: store.currentPreset.label, color: 'text-purple-400' },
  { label: '子步数', value: store.subSteps, color: 'text-sky-400' },
  { label: '时间步长', value: store.params.dt.toFixed(4), color: 'text-indigo-400' },
  { label: '平均密度', value: store.avgDensity.toFixed(1), color: 'text-yellow-400' },
  { label: '最大密度', value: store.maxDensity.toFixed(0), color: 'text-amber-400' },
  { label: '平均压力', value: store.avgPressure.toFixed(0), color: 'text-orange-400' },
  { label: '最大压力', value: store.maxPressure.toFixed(0), color: 'text-pink-400' },
  { label: '平均速度', value: store.avgVelocity.toFixed(1), color: 'text-rose-400' },
  { label: '最大速度', value: store.maxVelocity.toFixed(1), color: 'text-red-400' },
  { label: '总动能', value: store.totalKineticEnergy.toFixed(0), color: 'text-lime-400' },
  { label: '平均力', value: store.avgForce.toFixed(1), color: 'text-teal-400' },
  { label: '最大力', value: store.maxForce.toFixed(1), color: 'text-fuchsia-400' },
])

const activeMetrics = computed(() => statsMode.value === 'detailed' ? detailedMetrics.value : simpleMetrics.value)

function toggleStatsMode() {
  statsMode.value = statsMode.value === 'simple' ? 'detailed' : 'simple'
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <h1 class="text-xl font-bold text-white tracking-wide">流体力学 SPH 粒子模拟器</h1>
      <p class="text-xs text-gray-500 mt-1">Smoothed Particle Hydrodynamics — 点击画布施加冲量</p>
    </header>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden p-4 gap-4">
      <!-- Left: Canvas -->
      <div class="flex-1 flex flex-col items-start gap-2">
        <FluidCanvas />
      </div>

      <!-- Right: Controls -->
      <div class="flex-shrink-0">
        <ControlPanel />
      </div>
    </div>

    <!-- Bottom Stats Bar -->
    <footer class="bg-gray-800 border-t border-gray-700 px-6 py-2 text-xs">
      <div
        class="flex items-center gap-x-6 gap-y-1.5 flex-wrap"
        :class="statsMode === 'detailed' ? 'items-start' : 'items-center'"
      >
        <div
          v-for="m in activeMetrics"
          :key="m.label"
          class="flex items-center gap-2"
        >
          <span class="text-gray-500">{{ m.label }}:</span>
          <span class="font-mono" :class="m.color">{{ m.value }}</span>
        </div>

        <div class="flex items-center gap-2 ml-auto">
          <span class="text-gray-600 hidden sm:inline">{{ statsMode === 'simple' ? '简洁' : '详细' }}模式</span>
          <button
            @click="toggleStatsMode"
            class="px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition text-xs flex items-center gap-1"
            :title="statsMode === 'simple' ? '切换到详细指标' : '切换回简洁指标'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statsMode === 'detailed' ? 'bg-cyan-400' : 'bg-gray-400'"></span>
            {{ statsMode === 'simple' ? '详细指标' : '简洁模式' }}
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>
