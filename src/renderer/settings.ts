import { createApp } from 'vue'
import './style.css'

declare global {
  interface Window { eyeApi: any }
}

const App = {
  data() {
    return {
      config: {
        workMinutes: 20,
        breakSeconds: 20,
        allDay: true,
        scheduleStart: '09:00',
        scheduleEnd: '18:00',
        meals: [
          { enabled: true, start: '12:00', end: '13:00' },
          { enabled: false, start: '18:00', end: '19:00' }
        ],
        sound: true
      },
      state: { state: 'idle', remaining: 0, paused: false },
      toast: '',
      now: new Date(),
      localRemaining: 0,
      tickTimer: 0
    }
  },
  computed: {
    displayTime(): string {
      const sec = this.localRemaining
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    },
    statusLabel(): string {
      if (this.state.paused) return '已暂停'
      if (this.state.state === 'breaking') return '休息中…'
      if (this.state.state === 'working') return '距离下次休息'
      if (!this.config.allDay) return '当前不在运行时段'
      return '待机中'
    }
  },
  async mounted() {
    if (!window.eyeApi) return
    this.config = await window.eyeApi.getConfig()
    this.state = await window.eyeApi.getState()
    this.localRemaining = this.state.remaining

    window.eyeApi.onStateChanged((s: any) => {
      this.state = s
      this.localRemaining = s.remaining
    })

    // 本地每秒递减，界面显示更平滑（权威值仍由主进程每5s同步）
    this.tickTimer = window.setInterval(() => {
      this.now = new Date()
      if (this.state.state === 'working' && !this.state.paused && this.localRemaining > 0) {
        this.localRemaining--
      }
    }, 1000)
  },
  beforeUnmount() {
    clearInterval(this.tickTimer)
  },
  methods: {
    async save() {
      // 简单校验
      this.config.workMinutes = Math.min(120, Math.max(1, Number(this.config.workMinutes) || 20))
      this.config.breakSeconds = Math.min(600, Math.max(5, Number(this.config.breakSeconds) || 20))
      await window.eyeApi.saveConfig(JSON.parse(JSON.stringify(this.config)))
      this.showToast('✓ 已保存')
    },
    togglePause() {
      window.eyeApi.togglePause()
    },
    resetWork() {
      window.eyeApi.resetWork()
    },
    toggle(key: string) {
      ;(this.config as any)[key] = !(this.config as any)[key]
    },
    toggleMeal(i: number) {
      this.config.meals[i].enabled = !this.config.meals[i].enabled
    },
    showToast(text: string) {
      this.toast = text
      setTimeout(() => (this.toast = ''), 2000)
    }
  },
  template: `
  <div class="app">
    <div class="status-card">
      <div class="status-time">{{ displayTime }}</div>
      <div class="status-label">{{ statusLabel }}</div>
      <div class="status-actions">
        <button class="pause-btn" :class="{ paused: state.paused }" @click="togglePause">
          {{ state.paused ? '▶ 继续' : '⏸ 暂停' }}
        </button>
        <button class="reset-btn" @click="resetWork">↺ 重置</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">节奏</div>
      <div class="row">
        <span class="row-label">工作时长</span>
        <span>
          <input class="num-input" type="number" v-model.number="config.workMinutes" min="1" max="120" />
          <span class="unit">分钟</span>
        </span>
      </div>
      <div class="row">
        <span class="row-label">休息时长</span>
        <span>
          <input class="num-input" type="number" v-model.number="config.breakSeconds" min="5" max="600" />
          <span class="unit">秒</span>
        </span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">运行时段</div>
      <div class="row">
        <span class="row-label">全天运行</span>
        <div class="switch" :class="{ on: config.allDay }" @click="toggle('allDay')"></div>
      </div>
      <div class="row" v-if="!config.allDay">
        <span class="row-label">时段</span>
        <span>
          <input class="time-input" type="time" v-model="config.scheduleStart" />
          <span class="range-sep">至</span>
          <input class="time-input" type="time" v-model="config.scheduleEnd" />
        </span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">饭点排除</div>
      <div class="row" v-for="(meal, i) in config.meals" :key="i">
        <div class="switch" :class="{ on: meal.enabled }" @click="toggleMeal(i)"></div>
        <span>
          <input class="time-input" type="time" v-model="meal.start" :disabled="!meal.enabled" />
          <span class="range-sep">至</span>
          <input class="time-input" type="time" v-model="meal.end" :disabled="!meal.enabled" />
        </span>
      </div>
    </div>

    <div class="section">
      <div class="row">
        <span class="row-label">声音提醒</span>
        <div class="switch" :class="{ on: config.sound }" @click="toggle('sound')"></div>
      </div>
    </div>

    <button class="save-btn" @click="save">保存设置</button>
    <div class="toast">{{ toast }}</div>
  </div>
  `
}

createApp(App).mount('#app')
