window.addEventListener('load', initDom)
window.addEventListener('keyup', initAudio, {once: true})
window.addEventListener('touchend', initAudio, {once: true})

const dahThreshold = 120
const symbolGap = 210
const wordGap = 800

const maxGain = 0.35
const freq = 700
const fadeTime = 0.0015

const state = {
  curContent: null,
  audioInited: false,
}

function initAudio() {
  if (state.audioInited){
    return
  }

  state.audioInited = true
  const AudioContext = window.AudioContext || window.webkitAudioContext

  const aContext = new AudioContext()
  const oscillator = aContext.createOscillator()
  const gainNode = aContext.createGain()

  let inputRecord = []

  gainNode.gain.value = 0

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(freq, aContext.currentTime)
  oscillator.start()

  oscillator.connect(gainNode).connect(aContext.destination)

  let isPlaying = false
  let playingKey = ''
  let beepStart = 0
  let beepEnd = 0

  let curTimeout = null

  document.addEventListener('touchstart', interactionStart)
  document.addEventListener('touchend', interactionEnd)

  document.addEventListener('keydown', interactionStart)
  document.addEventListener('keyup', interactionEnd)

  function interactionStart(e) {
    console.log(e.type);
    if (!isPlaying) {
      if (e.key === 'Enter') {
        interpret(inputRecord)
        inputRecord = []
        addNewLine()
      } else if (e.type === 'touchstart' || /^[A-Za-z ]$/.test(e.key)) {
        clearTimeout(curTimeout)
        startBeep(e)
      }
    }
  }

  function interactionEnd(e) {
    if ((e.type === 'touchend' && playingKey === 'touchstart') || e.key === playingKey) {
      beepEnd = Date.now()
      inputRecord.push((beepEnd - beepStart))
      isPlaying = false
      gainNode.gain.setTargetAtTime(0, aContext.currentTime, fadeTime)
      curTimeout = setTimeout((oldRecordLength) => {
        if(inputRecord.length === oldRecordLength){
          onNewLetter(inputRecord)
        }
      }, symbolGap, inputRecord.length)
    }
  }

  function startBeep(e) {
    beepStart = Date.now()
    if (inputRecord.length > 0){
      inputRecord.push((beepEnd - beepStart))
    }
    if (e.type === 'touchstart') {
      playingKey = e.type
    } else {
      playingKey = e.key
    }
    isPlaying = true
    gainNode.gain.setTargetAtTime(maxGain, aContext.currentTime, fadeTime)
  }
}

function onNewLetter(inputs) {
  const translation = translateInputs(inputs)
  state.curContent.innerText = translation
}

function initDom() {
  addNewLine()
}

function addNewLine() {
  const lines = document.getElementById('lines')
  const newLine = document.createElement('p')
  newLine.classList.add('contentLine')
  lines.appendChild(newLine)
  state.curContent = newLine
}

function morseToSym(symbol) {
  const morseAlphabet = {
    '0,1': 'A',
    '1,0,0,0': 'B',
    '1,0,1,0': 'C',
    '1,0,0': 'D',
    '0': 'E',
    '0,0,1,0': 'F',
    '1,1,0': 'G',
    '0,0,0,0': 'H',
    '0,0': 'I',
    '0,1,1,1': 'J',
    '1,0,1': 'K',
    '0,1,0,0': 'L',
    '1,1': 'M',
    '1,0': 'N',
    '1,1,1': 'O',
    '0,1,1,0': 'P',
    '1,1,0,1': 'Q',
    '0,1,0': 'R',
    '0,0,0': 'S',
    '1': 'T',
    '0,0,1': 'U',
    '0,0,0,1': 'V',
    '0,1,1': 'W',
    '1,0,0,1': 'X',
    '1,0,1,1': 'Y',
    '1,1,0,0': 'Z',
    '3': ' ',
    '0,1,1,1,1': '1',
    '0,0,1,1,1': '2',
    '0,0,0,1,1': '3',
    '0,0,0,0,1': '4',
    '0,0,0,0,0': '5',
    '1,0,0,0,0': '6',
    '1,1,0,0,0': '7',
    '1,1,1,0,0': '8',
    '1,1,1,1,0': '9',
    '0,1,0,1,0,1': '.',
    '1,1,0,0,1,1': ',',
    '0,0,1,1,0,0': '?',
    '1,1,1,0,0,0': ':',
    '1,0,0,1,0': '/',
    '1,0,0,0,0,1': '-',
    '1,0,0,0,1': '=',
    '0,1,1,1,1,0': '\'',
    '1,0,1,0,1,1': '!',
    '0,1,0,0,0': '&',
    '0,0,0,1,0,0,1': '$',
  }
  let val = false
  if (typeof symbol === 'string'){
    val = Object.keys(morseAlphabet).includes(symbol) ? morseAlphabet[symbol] : false
  } else if (typeof symbol === 'object'){
    const symbolString = symbol.toString().slice(1,-1)
    const i = Object.values(morseAlphabet).indexOf(symbolString)
    val = (i > -1) ? Object.keys(morseAlphabet).find(key => morseAlphabet[key] === symbolString) : false
  }
  return val
}

function checkLastSymbol(inputs, correctSymbol) {
  const lastInputSymbol = getLastSymbol(inputs)
  const morseCorrectSymbol = morseToSym(correctSymbol)
  const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  return equals(lastInputSymbol, morseCorrectSymbol)
}

function getLastSymbol(inputs) {
  const record = interpret(inputs)

  if (record[record.length - 1] >= 2) {
    record.pop()
  }

  const lastSymbolGap = record.lastIndexOf(2)
  const lastWordGap = record.lastIndexOf(3)
  const lastGap = lastSymbolGap > lastWordGap ? lastSymbolGap : lastWordGap

  return record.slice(lastGap+1)
}

function interpret(inputs) {
  // 0 - dit
  // 1 - dah
  // 2 - symbolGap
  // 3 - wordGap
  let interpreted = []
  inputs.forEach((val) => {
    if (val < 0){ // Space
      if (-val > wordGap) { // wordGap
        interpreted.push(3)
      } else if (-val > symbolGap) { // symbolGap
        interpreted.push(2)
      }
      // tapGap not pushed
    }
    else { // Beep
      if (val > dahThreshold) { // dah
        interpreted.push(1)
      } else { // dit
        interpreted.push(0);
      }
    }
  })
  return interpreted
}

function translateInputs(inputs) {
  const interpretedStr = interpret(inputs).toString()
  const words = interpretedStr.split(',3,')
  const symbols = []
  words.forEach((val,i) => {
    const symInWord = val.split(',2,')
    symbols.push(...symInWord)
    if(i < words.length-1){
      symbols.push('3')
    }
  })
  const translated = symbols.map((sym) => morseToSym(sym)).join('')

  return translated
}