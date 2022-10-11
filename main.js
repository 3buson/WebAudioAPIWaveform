const audio = document.createElement('audio')
const audioContext = new window.AudioContext()
const svg = document.querySelector('svg')
const progress = svg.querySelector('#progress')
const remaining = svg.querySelector('#remaining')
const width = svg.getAttribute('width')
const height = svg.getAttribute('height')
svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
const smoothing = 2

svg.addEventListener('click', e => {
    const position = e.offsetX / svg.getBoundingClientRect().width
    audio.currentTime = position * audio.duration
})

document.querySelector('input').addEventListener('change', e => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = e => processFile(e.target.result)
    reader.readAsArrayBuffer(file)
    playAudio(file)
})

function avg (values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length
}

function max (values) {
    return values.reduce((max, value) => Math.max(max, value), 0)
}

function getWaveformData(audioBuffer, dataPoints) {
  const leftChannel = audioBuffer.getChannelData(0)
  const rightChannel = audioBuffer.getChannelData(1)

  const values = new Float32Array(dataPoints)
  const dataWindow = Math.round(leftChannel.length / dataPoints)
  for (let i = 0, y = 0, buffer = []; i < leftChannel.length; i++) {
    const summedValue = (Math.abs(leftChannel[i]) + Math.abs(rightChannel[i])) / 2
    buffer.push(summedValue)
    if (buffer.length === dataWindow) {
      values[y++] = avg(buffer)
      buffer = []
    }
  }
  return values
}

function getSVGPath(waveformData) {
    let path = `M 0 ${height} `
    for (let i = 0; i < waveformData.length; i++) {
        path += `L ${i * smoothing} ${(1 - waveformData[i] / max(waveformData)) * height} `
    }
    path += `V ${height} H 0 Z`

    return path
}

function playAudio(file) {
    audio.setAttribute('autoplay', true)
    audio.src = URL.createObjectURL(file)
    updateAudioPosition()
}

function updateAudioPosition() {
    const { currentTime, duration } = audio
    const physicalPosition = currentTime / duration * width
    if (physicalPosition) {
        progress.setAttribute('width', physicalPosition)
        remaining.setAttribute('x', physicalPosition)
        remaining.setAttribute('width', width - physicalPosition)
    }
    requestAnimationFrame(updateAudioPosition)
}

function processFile(file) {
  const source = audioContext.createBufferSource()
  console.time('Decoding audio data')
  return audioContext.decodeAudioData(file)
      .then(audioBuffer => {
        console.timeEnd('Decoding audio data')

        console.time('Computing waveform')
        const waveformData = getWaveformData(audioBuffer, width / smoothing)
        console.timeEnd('Computing waveform')

        console.time('Computing SVG path')
        svg.querySelector('path').setAttribute('d', getSVGPath(waveformData, height, smoothing))
        console.timeEnd('Computing SVG path')

        source.buffer = audioBuffer
        source.connect(audioContext.destination)
      })
      .catch(error => {
          console.error(error)
          alert(error)
      })
}
