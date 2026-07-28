// ELEMENT REFERENCES
const viewport = document.getElementById('viewport');
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const spinner = document.getElementById('spinner');

const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');

const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');

// STATE VARIABLES
let camera = null;
let hands = null;
let isCameraActive = false;
let isTwoFingersDetected = false;

// CONFIGURATION
const BLUR_AMOUNT = '36px';

// 1. INITIALIZE MEDIAPIPE HANDS
function initMediaPipe() {
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });

  hands.onResults(onHandResults);
}

// HELPER: DETEKSI GESTUR 2 JARI (PEACE / V SIGN)
function checkTwoFingersGesture(landmarks) {
  const isIndexUp = landmarks[8].y < landmarks[6].y;
  const isMiddleUp = landmarks[12].y < landmarks[10].y;
  const isRingDown = landmarks[16].y > landmarks[14].y;
  const isPinkyDown = landmarks[20].y > landmarks[18].y;

  return isIndexUp && isMiddleUp && isRingDown && isPinkyDown;
}

// 2. HAND TRACKING RESULTS CALLBACK
function onHandResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    isTwoFingersDetected = checkTwoFingersGesture(landmarks);
  } else {
    isTwoFingersDetected = false;
  }
}

// 3. START CAMERA & INITIALIZATION
async function startCamera() {
  btnStart.disabled = true;
  showLoading("Menghubungkan kamera & AI...");

  try {
    if (!hands) initMediaPipe();

    // Menggunakan resolusi 640x480 agar tidak memicu NotReadableError
    camera = new Camera(videoElement, {
      onFrame: async () => {
        if (isCameraActive) {
          await hands.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480
    });

    await camera.start();
    isCameraActive = true;
    
    hideOverlay();
    btnStop.disabled = false;
    updateStatus('online', 'Kamera Aktif');
    
    requestAnimationFrame(renderLoop);
  } catch (err) {
    console.error("Camera access error:", err);
    btnStart.disabled = false;
    updateStatus('offline', 'Kamera Sibuk / Terblokir');
    showError("Gagal mengakses kamera. Tutup aplikasi kamera lain (Zoom/OBS/dll) lalu coba lagi.");
  }
}

// 4. STOP CAMERA
async function stopCamera() {
  if (camera) {
    await camera.stop();
  }
  isCameraActive = false;
  isTwoFingersDetected = false;
  
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  btnStart.disabled = false;
  btnStop.disabled = true;
  
  canvasElement.style.filter = 'none';
  updateStatus('offline', 'Kamera Mati');
  
  showOverlay("Kamera dimatikan.", false);
}

// 5. MAIN RENDER LOOP
function renderLoop() {
  if (!isCameraActive) return;

  const w = canvasElement.width;
  const h = canvasElement.height;

  if (videoElement.videoWidth && (w !== videoElement.videoWidth || h !== videoElement.videoHeight)) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  }

  // Draw Camera Frame
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.restore();

  // Apply Blur Logic
  if (isTwoFingersDetected) {
    if (canvasElement.style.filter !== `blur(${BLUR_AMOUNT})`) {
      canvasElement.style.filter = `blur(${BLUR_AMOUNT})`;
      updateStatus('blur', 'Blur Aktif (✌️)');
    }
  } else {
    if (canvasElement.style.filter !== 'none') {
      canvasElement.style.filter = 'none';
      updateStatus('online', 'Kamera Aktif');
    }
  }

  requestAnimationFrame(renderLoop);
}

// 6. UI STATUS HELPER
function updateStatus(type, text) {
  statusBadge.className = `status-badge status-${type}`;
  statusText.textContent = text;
}

function showLoading(message) {
  overlayText.textContent = message;
  spinner.style.display = 'block';
  overlay.classList.remove('hidden');
}

function showError(message) {
  overlayText.textContent = message;
  spinner.style.display = 'none';
  overlay.classList.remove('hidden');
}

function showOverlay(message, showSpinner = true) {
  overlayText.textContent = message;
  spinner.style.display = showSpinner ? 'block' : 'none';
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

// 7. EVENT LISTENERS
btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);

window.addEventListener('load', () => {
  showOverlay("Klik 'Mulai Kamera' untuk mengaktifkan pelacak gestur.", false);
});