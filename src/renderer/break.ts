import { createApp } from 'vue'

declare global {
  interface Window { eyeApi: any }
}

const RING = 2 * Math.PI * 120

const App = {
  data() {
    return {
      seconds: 20,
      remaining: 20,
      timer: 0,
      ringLen: RING
    }
  },
  computed: {
    progress(): number {
      return this.seconds > 0 ? (this.seconds - this.remaining) / this.seconds : 0
    },
    ringOffset(): number {
      return this.ringLen * (1 - this.progress)
    },
    displayTime(): string {
      const m = Math.floor(this.remaining / 60)
      const s = this.remaining % 60
      if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
      return String(Math.max(0, this.remaining))
    }
  },
  async mounted() {
    this.startCountdown()

    const apply = (seconds: number) => {
      const n = Math.max(1, Number(seconds) || 20)
      if (n === this.seconds) return
      this.seconds = n
      this.remaining = n
      this.startCountdown()
    }

    window.eyeApi?.onBreakConfig((c: { seconds: number }) => apply(c.seconds))

    try {
      const config = await window.eyeApi?.getConfig()
      if (config?.breakSeconds) apply(config.breakSeconds)
    } catch {
      // 保持默认 20 秒倒计时
    }
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    startCountdown() {
      if (this.timer) clearInterval(this.timer)
      this.timer = window.setInterval(() => {
        this.remaining--
        if (this.remaining <= 0) {
          this.remaining = 0
          clearInterval(this.timer)
          window.eyeApi?.breakFinished()
        }
      }, 1000)
    },
    skip() {
      clearInterval(this.timer)
      window.eyeApi?.skipBreak()
    }
  },
  template: `
  <div class="break-screen">
    <div class="ring-wrap">
      <svg width="280" height="280" viewBox="0 0 280 280">
        <circle cx="140" cy="140" r="120" fill="none" stroke="#2c2f38" stroke-width="8"/>
        <circle cx="140" cy="140" r="120" fill="none" stroke="#7d9b8a" stroke-width="8"
          stroke-linecap="round" :stroke-dasharray="ringLen"
          :stroke-dashoffset="ringOffset"
          transform="rotate(-90 140 140)" style="transition: stroke-dashoffset 1s linear"/>
      </svg>
      <div class="count">{{ displayTime }}</div>
    </div>
    <div class="hint">看向 6 米外 · 放松双眼</div>
    <button class="skip-btn" @click="skip">跳过本次</button>
  </div>
  `
}

const style = document.createElement('style')
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%;
    background: #16171c;
  }
  body {
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    user-select: none;
  }
  .break-screen {
    width: 100vw; height: 100vh;
    background: radial-gradient(ellipse at center, #1e2128 0%, #14151a 70%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .ring-wrap { position: relative; width: 280px; height: 280px; }
  .count {
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 72px; font-weight: 200;
    color: #c8c4ba; font-variant-numeric: tabular-nums;
  }
  .hint {
    margin-top: 28px;
    font-size: 18px; color: #7a7670; letter-spacing: 2px;
  }
  .skip-btn {
    margin-top: 40px;
    padding: 10px 32px;
    border: 1px solid #3a3d46;
    border-radius: 22px;
    background: transparent;
    color: #8a8680;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .skip-btn:hover { background: rgba(255,255,255,0.06); color: #c8c4ba; }
`
document.head.appendChild(style)

createApp(App).mount('#app')
