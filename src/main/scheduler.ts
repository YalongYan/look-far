import { EventEmitter } from 'events'
import { AppConfig, isInTimeRange, isMealTime } from './config'

export type SchedulerState = 'idle' | 'working' | 'breaking'

/**
 * 定时状态机：
 * idle（暂停/时段外/饭点）<-> working（工作倒计时）-> breaking（休息遮罩）-> working ...
 * 主进程每 1s tick，驱动托盘显示与提醒触发。
 */
export class Scheduler extends EventEmitter {
  private config: AppConfig
  private paused = false
  private state: SchedulerState = 'idle'
  /** working 阶段剩余秒数 */
  private remaining = 0
  private timer: NodeJS.Timeout | null = null

  constructor(config: AppConfig) {
    super()
    this.config = config
  }

  start() {
    if (this.timer) return
    this.tick()
    this.timer = setInterval(() => this.tick(), 1000)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  updateConfig(config: AppConfig) {
    const workChanged = config.workMinutes !== this.config.workMinutes
    this.config = config
    if (workChanged && this.state !== 'breaking') {
      this.remaining = Math.max(1, config.workMinutes * 60)
      if (this.state === 'idle' && !this.paused) {
        this.state = 'working'
      }
      this.emitChange()
      this.emitTray(this.paused ? '已暂停' : this.formatRemaining(this.remaining))
      return
    }
    this.tick()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (paused && this.state === 'breaking') {
      this.endBreak()
    }
    this.emitChange()
    if (paused) {
      this.emitTray('已暂停')
    } else if (this.state === 'working' && this.remaining > 0) {
      this.emitTray(this.formatRemaining(this.remaining))
    } else {
      this.tick()
    }
  }

  /** 把工作倒计时重置为完整工作时长；休息遮罩中则结束休息并重新开始一轮 */
  resetWork() {
    if (this.state === 'breaking') {
      this.endBreak()
      if (this.paused) this.emitTray('已暂停')
      return
    }
    this.remaining = this.config.workMinutes * 60
    if (!this.paused && this.state === 'idle') {
      this.state = 'working'
    }
    this.emitChange()
    this.emitTray(this.paused ? '已暂停' : this.formatRemaining(this.remaining))
  }

  isPaused() {
    return this.paused
  }

  getState(): SchedulerState {
    return this.state
  }

  getRemaining(): number {
    return this.remaining
  }

  /** 用户点击"跳过本次休息" */
  skipBreak() {
    if (this.state !== 'breaking') return
    this.endBreak()
  }

  /** 托盘菜单"立即休息" */
  startBreakNow() {
    if (this.state === 'breaking') return
    this.beginBreak()
  }

  /** 遮罩窗口倒计时自然结束回调 */
  breakFinished() {
    if (this.state !== 'breaking') return
    this.endBreak()
  }

  private tick() {
    const now = new Date()

    if (this.paused) {
      this.emitTray('已暂停')
      return
    }

    if (!this.config.allDay && !isInTimeRange(now, this.config.scheduleStart, this.config.scheduleEnd)) {
      if (this.state === 'breaking') this.endBreak()
      else if (this.state !== 'idle') {
        this.state = 'idle'
        this.emitChange()
      }
      this.emitTray('时段外')
      return
    }

    if (isMealTime(now, this.config.meals)) {
      if (this.state === 'breaking') this.endBreak()
      else if (this.state !== 'idle') {
        this.state = 'idle'
        this.emitChange()
      }
      this.emitTray('🍚 饭点')
      return
    }

    if (this.state === 'idle') {
      this.state = 'working'
      this.remaining = this.config.workMinutes * 60
      this.emitChange()
    }

    if (this.state === 'working') {
      this.remaining--
      if (this.remaining <= 0) {
        this.beginBreak()
        return
      }
      this.emitTray(this.formatRemaining(this.remaining))
    }
    // breaking 状态的倒计时由遮罩窗口自身驱动
  }

  private beginBreak() {
    this.state = 'breaking'
    this.emit('break-start')
    this.emitChange()
    this.emitTray('👀 远眺中')
  }

  private endBreak() {
    this.state = 'working'
    this.remaining = this.config.workMinutes * 60
    this.emit('break-end')
    this.emitChange()
  }

  private formatRemaining(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  private emitChange() {
    this.emit('state-change', {
      state: this.state,
      remaining: this.remaining,
      paused: this.paused
    })
  }

  private emitTray(text: string) {
    this.emit('tray-update', text)
  }
}
