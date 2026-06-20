import { defineStore } from 'pinia'
import { SPHEngine, DEFAULT_PARAMS, PRESETS } from '../utils/sph-engine'
import type { SimParams, Preset, Particle } from '../types'

interface CachedStats {
  frame: number
  avgDensity: number
  maxDensity: number
  avgPressure: number
  maxPressure: number
  avgVelocity: number
  maxVelocity: number
  totalKineticEnergy: number
  avgForce: number
  maxForce: number
  gridCellCount: number
  boundaryParticleCount: number
  restingParticleCount: number
  activeParticleCount: number
}

export const useFluidStore = defineStore('fluid', {
  state: () => ({
    engine: null as SPHEngine | null,
    isRunning: false,
    particleCount: 800,
    currentPreset: PRESETS[0],
    params: { ...DEFAULT_PARAMS } as SimParams,
    fps: 0,
    frameCount: 0,
    subSteps: 3,
    _animId: null as number | null,
    _lastTime: 0,
    _fpsAccum: 0,
    _fpsFrames: 0,
    _cachedStats: null as CachedStats | null,
  }),
  getters: {
    particleArray: (state) => state.engine?.particles ?? [],
    simTime: (state) => state.frameCount * state.subSteps * state.params.dt,
    _computedStats(state): CachedStats {
      if (state._cachedStats && state._cachedStats.frame === state.frameCount) {
        return state._cachedStats
      }
      if (!state.engine || state.engine.particles.length === 0) {
        const empty: CachedStats = {
          frame: state.frameCount,
          avgDensity: 0, maxDensity: 0, avgPressure: 0, maxPressure: 0,
          avgVelocity: 0, maxVelocity: 0, totalKineticEnergy: 0,
          avgForce: 0, maxForce: 0, gridCellCount: 0,
          boundaryParticleCount: 0, restingParticleCount: 0, activeParticleCount: 0,
        }
        state._cachedStats = empty
        return empty
      }
      const particles = state.engine.particles
      const n = particles.length
      let sumDensity = 0, maxDensity = 0
      let sumPressure = 0, maxPressure = 0
      let sumSpeed = 0, maxSpeed = 0
      let sumSpeedSq = 0
      let sumForce = 0, maxForce = 0
      let boundaryCount = 0, restingCount = 0, activeCount = 0
      const margin = 10
      const { width, height } = state.engine
      for (let i = 0; i < n; i++) {
        const p = particles[i]
        sumDensity += p.density
        if (p.density > maxDensity) maxDensity = p.density
        sumPressure += p.pressure
        if (p.pressure > maxPressure) maxPressure = p.pressure
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        sumSpeed += speed
        sumSpeedSq += p.vx * p.vx + p.vy * p.vy
        if (speed > maxSpeed) maxSpeed = speed
        const force = Math.sqrt(p.fx * p.fx + p.fy * p.fy)
        sumForce += force
        if (force > maxForce) maxForce = force
        if (p.x <= margin || p.x >= width - margin || p.y <= margin || p.y >= height - margin) {
          boundaryCount++
        }
        if (speed < 1.0) restingCount++
        if (speed > 10.0) activeCount++
      }
      const stats: CachedStats = {
        frame: state.frameCount,
        avgDensity: sumDensity / n,
        maxDensity,
        avgPressure: sumPressure / n,
        maxPressure,
        avgVelocity: sumSpeed / n,
        maxVelocity: maxSpeed,
        totalKineticEnergy: 0.5 * state.params.particleMass * sumSpeedSq,
        avgForce: sumForce / n,
        maxForce,
        gridCellCount: state.engine.grid.size,
        boundaryParticleCount: boundaryCount,
        restingParticleCount: restingCount,
        activeParticleCount: activeCount,
      }
      state._cachedStats = stats
      return stats
    },
    avgDensity(): number { return this._computedStats.avgDensity },
    maxDensity(): number { return this._computedStats.maxDensity },
    avgPressure(): number { return this._computedStats.avgPressure },
    maxPressure(): number { return this._computedStats.maxPressure },
    avgVelocity(): number { return this._computedStats.avgVelocity },
    maxVelocity(): number { return this._computedStats.maxVelocity },
    totalKineticEnergy(): number { return this._computedStats.totalKineticEnergy },
    avgForce(): number { return this._computedStats.avgForce },
    maxForce(): number { return this._computedStats.maxForce },
    gridCellCount(): number { return this._computedStats.gridCellCount },
    boundaryParticleCount(): number { return this._computedStats.boundaryParticleCount },
    restingParticleCount(): number { return this._computedStats.restingParticleCount },
    activeParticleCount(): number { return this._computedStats.activeParticleCount },
  },
  actions: {
    initSimulation(preset?: Preset) {
      if (preset) {
        this.currentPreset = preset
        this.params = { ...DEFAULT_PARAMS, ...preset.params }
        this.particleCount = preset.particleCount
      }
      const canvas = { width: 800, height: 500 }
      this.engine = new SPHEngine(this.particleCount, canvas.width, canvas.height, this.params)
      this.engine.initParticles(this.currentPreset.initialConfig, this.particleCount)
      this.frameCount = 0
      this.fps = 0
      this._cachedStats = null
    },
    start() {
      if (this.isRunning || !this.engine) return
      this.isRunning = true
      this._lastTime = performance.now()
      this._fpsAccum = 0
      this._fpsFrames = 0
      const loop = (now: number) => {
        if (!this.isRunning || !this.engine) return
        const elapsed = now - this._lastTime
        this._lastTime = now
        this._fpsAccum += elapsed
        this._fpsFrames++
        if (this._fpsAccum >= 500) {
          this.fps = Math.round(this._fpsFrames / (this._fpsAccum / 1000))
          this._fpsAccum = 0
          this._fpsFrames = 0
        }
        // Sub-steps for stability
        for (let s = 0; s < this.subSteps; s++) {
          this.engine.step()
        }
        this.frameCount++
        this._animId = requestAnimationFrame(loop)
      }
      this._animId = requestAnimationFrame(loop)
    },
    stop() {
      this.isRunning = false
      if (this._animId !== null) {
        cancelAnimationFrame(this._animId)
        this._animId = null
      }
    },
    reset() {
      this.stop()
      this.initSimulation(this.currentPreset)
    },
    stepOnce() {
      if (!this.engine || this.isRunning) return
      for (let s = 0; s < this.subSteps; s++) {
        this.engine.step()
      }
      this.frameCount++
    },
    updateParam(key: keyof SimParams, value: number) {
      this.params[key] = value
      if (this.engine) {
        this.engine.params[key] = value
        if (key === 'smoothingRadius') {
          this.engine.cellSize = value
        }
      }
    },
  },
})
