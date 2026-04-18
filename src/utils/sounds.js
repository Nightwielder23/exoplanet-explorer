let sfxOn = false
let sfxVol = 0.3

export const setSfxEnabled = (val) => { sfxOn = val }
export const setSfxVolume = (val) => { sfxVol = val }

export const playClick = () => {
  if (!sfxOn) return
  const audio = new Audio('/click.wav')
  audio.volume = Math.min(1, sfxVol * 2.0)
  audio.play().catch(() => {})
  setTimeout(() => { audio.pause(); audio.currentTime = 0 }, 500)
}

export const playOpen = () => {
  if (!sfxOn) return
  const audio = new Audio('/open.mp3')
  audio.volume = Math.min(1, sfxVol * 1.5)
  audio.playbackRate = 0.9
  audio.play().catch(() => {})
  setTimeout(() => { audio.pause(); audio.currentTime = 0 }, 500)
}
