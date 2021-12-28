window.addEventListener('load', initDom)
window.addEventListener('keyup', initAudio, {once: true})

let inputRecord = []
let audioInited = false;

function initAudio() {
  audioInited = true
  const AudioContext = window.AudioContext || window.webkitAudioContext

  const aContext = new AudioContext()
  const oscillator = aContext.createOscillator()
  const gainNode = aContext.createGain()

  const maxGain = 0.5
  const freq = 700
  const fadeTime = 0.0015

  gainNode.gain.value = 0

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(freq, aContext.currentTime)
  oscillator.start()

  oscillator.connect(gainNode).connect(aContext.destination)

  let isPlaying = false
  let playingKey = ''
  let beepStart = 0
  let beepEnd = 0


  document.addEventListener('keydown', e => {
    if (!isPlaying) {
      console.log(e);
      if (e.key === 'Enter') {
        interpret()
        inputRecord = []
      } else if (/^[A-Za-z ]$/.test(e.key)) {
        keyDown(e)
      }
    }
  })

  document.addEventListener('keyup', e => {
    if (e.key === playingKey) {
      beepEnd = aContext.currentTime
      inputRecord.push((beepEnd - beepStart).toPrecision(3))
      isPlaying = false
      gainNode.gain.setTargetAtTime(0, aContext.currentTime, fadeTime)
    }
  })

  function keyDown(e) {
    beepStart = aContext.currentTime
    if (inputRecord.length > 0){
      inputRecord.push((beepEnd - beepStart).toPrecision(3))
    }
    playingKey = e.key
    isPlaying = true
    gainNode.gain.setTargetAtTime(maxGain, aContext.currentTime, fadeTime)
  }

  function interpret() {
    const jank = interpreter(inputRecord)
    console.log(jank)
  }
}

function initDom() {
}

function interpreter(inputs) {
  // 0 - dit
  // 1 - dah
  // 2 - letterGap
  // 3 - wordGap
  let interpreted = []
  inputs.forEach((val) => {
    if (val < 0){ // Space
      if (-val > 0.5) { // wordGap
        interpreted.push(3)
      } else if (-val > 0.24) { // letterGap
        interpreted.push(2)
      }
      // tapGap not pushed
    }
    else { // Beep
      if (val > 0.11) { // dah
        interpreted.push(1)
      } else { // dit
        interpreted.push(0);
      }
    }
  })
  return interpreted
}