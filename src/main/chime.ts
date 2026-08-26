/** 短促三音调，休息开始时播放 */
function buildChimeWav(): Buffer {
  const sampleRate = 22050
  const duration = 0.6
  const n = Math.floor(sampleRate * duration)
  const pcm = Buffer.alloc(n * 2)
  const tones = [
    { freq: 523.25, start: 0.00, dur: 0.20 },
    { freq: 659.25, start: 0.12, dur: 0.32 },
    { freq: 783.99, start: 0.22, dur: 0.30 }
  ]
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    let sample = 0
    for (const tone of tones) {
      if (t >= tone.start && t < tone.start + tone.dur) {
        const lt = t - tone.start
        const env = Math.min(lt / 0.012, 1) * Math.exp(-lt * 5.2)
        sample += Math.sin(2 * Math.PI * tone.freq * lt) * env
      }
    }
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * 0.42)) * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

export const CHIME_DATA_URL = 'data:audio/wav;base64,' + buildChimeWav().toString('base64')
