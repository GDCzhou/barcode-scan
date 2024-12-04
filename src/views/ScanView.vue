<template>
  <div>
    <!-- <select v-model="selectedConstraints">
      <option v-for="option in constraintOptions" :key="option.label" :value="option.constraints">
        {{ option.label }}
      </option>
    </select> -->
    <!-- <p>
      <span
        v-for="option in Object.keys(barcodeFormats)"
        :key="option"
        class="barcode-format-checkbox"
      >
        <input type="checkbox" v-model="barcodeFormats[option]" :id="option" />
        <label :for="option">{{ option }}</label>
      </span>
    </p> -->

    <p class="error">{{ error }}</p>

    <p class="decode-result">
      扫描结果: <div v-for="res in result" :key="res">{{ res }}</div> |
    </p>

    <div>
      <qrcode-stream
        :constraints="facingMode"
        :track="trackFunctionSelected.value"
        :formats="selectedBarcodeFormats"
        @error="onError"
        @detect="onDetect"
        @camera-on="onCameraReady"
        :torch="torchActive"
      >
        <button @click="torchActive = !torchActive" :disabled="torchNotSupported">
          {{ torchActive ? '关闭' : '打开' }}手电筒
        </button>
        <button @click="switchCamera">切换摄像头</button>
      </qrcode-stream>
    </div>
  </div>

  <p v-if="torchNotSupported" class="error">这个摄像头不支持闪光灯</p>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useRouter } from 'vue-router'

/*** detection handling ***/

const result = ref<string[]>([])
const torchActive = ref(false) //闪光灯
const torchNotSupported = ref(false) //不支持闪光灯

const router = useRouter()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onDetect(detectedCodes: any[]) {
  console.log(detectedCodes)
  result.value = detectedCodes.map((code) => code.rawValue)
}

/*** select camera ***/
watch(result, (value)=>{
  if(value.length>0){
    router.push({
      params: {
        barcode: value[0]
      },
      name: 'home'
    })
  }
})

const selectedConstraints = ref({ facingMode: 'environment' })
const defaultConstraintOptions = [
  { label: 'rear camera', constraints: { facingMode: 'environment' } },
  { label: 'front camera', constraints: { facingMode: 'user' } },
]
const constraintOptions = ref(defaultConstraintOptions)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
async function onCameraReady(capabilities) {
  // NOTE: on iOS we can't invoke `enumerateDevices` before the user has given
  // camera access permission. `QrcodeStream` internally takes care of
  // requesting the permissions. The `camera-on` event should guarantee that this
  // has happened.
  torchNotSupported.value = !capabilities.torch
  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoDevices = devices.filter(({ kind }) => kind === 'videoinput')
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  constraintOptions.value = [
    ...defaultConstraintOptions,
    ...videoDevices.map(({ deviceId, label }) => ({
      label: `${label} (ID: ${deviceId})`,
      constraints: { deviceId },
    })),
  ]

  error.value = ''
}

/*** track functons ***/
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function paintOutline(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const [firstPoint, ...otherPoints] = detectedCode.cornerPoints

    ctx.strokeStyle = 'red'

    ctx.beginPath()
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (const { x, y } of otherPoints) {
      ctx.lineTo(x, y)
    }
    ctx.lineTo(firstPoint.x, firstPoint.y)
    ctx.closePath()
    ctx.stroke()
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function paintBoundingBox(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const {
      boundingBox: { x, y, width, height },
    } = detectedCode

    ctx.lineWidth = 2
    ctx.strokeStyle = '#007bff'
    ctx.strokeRect(x, y, width, height)
  }
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function paintCenterText(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const { boundingBox, rawValue } = detectedCode

    const centerX = boundingBox.x + boundingBox.width / 2
    const centerY = boundingBox.y + boundingBox.height / 2

    const fontSize = Math.max(12, (50 * boundingBox.width) / ctx.canvas.width)

    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'

    ctx.lineWidth = 3
    ctx.strokeStyle = '#35495e'
    ctx.strokeText(detectedCode.rawValue, centerX, centerY)

    ctx.fillStyle = '#5cb984'
    ctx.fillText(rawValue, centerX, centerY)
  }
}
const trackFunctionOptions = [
  { text: 'nothing (default)', value: undefined },
  { text: 'outline', value: paintOutline },
  { text: 'centered text', value: paintCenterText },
  { text: 'bounding box', value: paintBoundingBox },
]

const facingMode = ref({ facingMode: 'environment' })
function switchCamera() {
  switch (facingMode.value.facingMode) {
    case 'environment':
      facingMode.value.facingMode = 'user'
      break
    case 'user':
      facingMode.value.facingMode = 'environment'
      break
  }
}

const trackFunctionSelected = ref(trackFunctionOptions[1])

/*** barcode formats ***/

const barcodeFormats = ref({
  aztec: false,
  code_128: true,
  code_39: false,
  code_93: false,
  codabar: true,
  databar: true,
  databar_expanded: true,
  data_matrix: false,
  dx_film_edge: false,
  ean_13: false,
  ean_8: false,
  itf: false,
  maxi_code: false,
  micro_qr_code: false,
  pdf417: false,
  qr_code: true,
  rm_qr_code: false,
  upc_a: false,
  upc_e: false,
  linear_codes: false,
  matrix_codes: false,
})
const selectedBarcodeFormats = computed(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return Object.keys(barcodeFormats.value).filter((format) => barcodeFormats.value[format])
})

/*** error handling ***/

const error = ref('')

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function onError(err) {
  error.value = `[${err.name}]: `

  if (err.name === 'NotAllowedError') {
    error.value += 'you need to grant camera access permission'
  } else if (err.name === 'NotFoundError') {
    error.value += 'no camera on this device'
  } else if (err.name === 'NotSupportedError') {
    error.value += 'secure context required (HTTPS, localhost)'
  } else if (err.name === 'NotReadableError') {
    error.value += 'is the camera already in use?'
  } else if (err.name === 'OverconstrainedError') {
    error.value += 'installed cameras are not suitable'
  } else if (err.name === 'StreamApiNotSupportedError') {
    error.value += 'Stream API is not supported in this browser'
  } else if (err.name === 'InsecureContextError') {
    error.value +=
      'Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.'
  } else {
    error.value += err.message
  }
}
</script>

<style scoped>
.error {
  font-weight: bold;
  color: red;
}
.barcode-format-checkbox {
  margin-right: 10px;
  white-space: nowrap;
  display: inline-block;
}
</style>
