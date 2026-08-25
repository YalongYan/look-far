import { createApp } from 'vue'

declare global {
  interface Window { eyeApi: any }
}

type ThemeId = 'light' | 'dark' | 'warm'

const RING = 2 * Math.PI * 120

function applyOverlayTheme(theme: ThemeId) {
  const id = theme === 'light' || theme === 'warm' ? theme : 'dark'
  document.documentElement.setAttribute('data-overlay', id)
}

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
    applyOverlayTheme('dark')
    this.startCountdown()

    const apply = (payload: { seconds?: number; overlayTheme?: ThemeId }) => {
      if (payload.overlayTheme) applyOverlayTheme(payload.overlayTheme)
      const n = Math.max(1, Number(payload.seconds) || 20)
      if (n === this.seconds) return
      this.seconds = n
      this.remaining = n
      this.startCountdown()
    }

    window.eyeApi?.onBreakConfig((c: { seconds: number; overlayTheme?: ThemeId }) => apply(c))

    try {
      const config = await window.eyeApi?.getConfig()
      if (config) {
        apply({
          seconds: config.breakSeconds,
          overlayTheme: config.overlayTheme
        })
      }
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
        <circle class="ring-track" cx="140" cy="140" r="120" fill="none" stroke-width="8"/>
        <circle class="ring-active" cx="140" cy="140" r="120" fill="none" stroke-width="8"
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
  html, body { width: 100%; height: 100%; }
  body {
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    user-select: none;
  }

  :root, [data-overlay="dark"] {
    --ov-bg: #16171c;
    --ov-mid: #1e2128;
    --ov-edge: #14151a;
    --ov-count: #c8c4ba;
    --ov-hint: #7a7670;
    --ov-ring: #2c2f38;
    --ov-ring-active: #7d9b8a;
    --ov-btn-border: #3a3d46;
    --ov-btn: #8a8680;
    --ov-btn-hover-bg: rgba(255,255,255,0.06);
    --ov-btn-hover: #c8c4ba;
  }
  [data-overlay="light"] {
    --ov-bg: #eef3fa;
    --ov-mid: #f5f8fc;
    --ov-edge: #e4ecf7;
    --ov-count: #4a5568;
    --ov-hint: #7a869a;
    --ov-ring: #d5deea;
    --ov-ring-active: #7eb0f5;
    --ov-btn-border: #c3cfdf;
    --ov-btn: #8a94a6;
    --ov-btn-hover-bg: rgba(255,255,255,0.7);
    --ov-btn-hover: #4a5568;
  }
  [data-overlay="warm"] {
    --ov-bg: #1f1a16;
    --ov-mid: #2a221c;
    --ov-edge: #181410;
    --ov-count: #e4d5c4;
    --ov-hint: #a89480;
    --ov-ring: #3d342c;
    --ov-ring-active: #d4a574;
    --ov-btn-border: #5a4c40;
    --ov-btn: #b8a090;
    --ov-btn-hover-bg: rgba(255,255,255,0.06);
    --ov-btn-hover: #e4d5c4;
  }

  html, body { background: var(--ov-bg); }
  .break-screen {
    width: 100vw; height: 100vh;
    background: radial-gradient(ellipse at center, var(--ov-mid) 0%, var(--ov-edge) 70%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .ring-wrap { position: relative; width: 280px; height: 280px; }
  .ring-track { stroke: var(--ov-ring); }
  .ring-active { stroke: var(--ov-ring-active); }
  .count {
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 72px; font-weight: 200;
    color: var(--ov-count); font-variant-numeric: tabular-nums;
  }
  .hint {
    margin-top: 28px;
    font-size: 18px; color: var(--ov-hint); letter-spacing: 2px;
  }
  .skip-btn {
    margin-top: 40px;
    padding: 10px 32px;
    border: 1px solid var(--ov-btn-border);
    border-radius: 22px;
    background: transparent;
    color: var(--ov-btn);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .skip-btn:hover { background: var(--ov-btn-hover-bg); color: var(--ov-btn-hover); }
`
document.head.appendChild(style)

createApp(App).mount('#app')
