'use client'

import React, { useState, useRef, useEffect } from 'react'

interface ConfettiPiece {
  id: number
  left: number
  animDuration: number
  animDelay: number
  color: string
}

export default function App() {
  const [inputValue, setInputValue] = useState<string>('')
  const [winnerName, setWinnerName] = useState<string>('')
  const [showWinner, setShowWinner] = useState<boolean>(false)
  const [btnAmbilDisabled, setBtnAmbilDisabled] = useState<boolean>(true)
  const [isShaking, setIsShaking] = useState<boolean>(false)

  // MediaPipe state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState<boolean>(false)
  const [mediaPipeError, setMediaPipeError] = useState<string | null>(null)
  const [shakeProgress, setShakeProgress] = useState<number>(0)
  const [pinchProgress, setPinchProgress] = useState<number>(0)
  const [isPinchDetected, setIsPinchDetected] = useState<boolean>(false)

  const names = useRef<string[]>([])
  const picking = useRef<boolean>(false)
  const pickedName = useRef<string>('')
  const winCounts = useRef<Record<string, number>>({})

  const handSvg = useRef<SVGSVGElement | null>(null)
  const handG = useRef<SVGGElement | null>(null)
  const handPaper = useRef<SVGGElement | null>(null)

  // MediaPipe refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastWristX = useRef<number | null>(null)
  const shakeEnergy = useRef<number>(0)
  const cameraInstance = useRef<any>(null)
  const handsInstance = useRef<any>(null)
  const isBoxReady = useRef<boolean>(false)
  const lastTrackedX = useRef<number>(200)
  const lastTrackedY = useRef<number>(-180)
  const isPinchingRef = useRef<boolean>(false)
  const pinchStartY = useRef<number>(0)

  const BW = 400
  const BH = 300

  function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInputValue(val)

    const newNames = val
      .split('\n')
      .map(v => v.trim())
      .filter(v => v !== '')

    names.current = newNames
    setBtnAmbilDisabled(newNames.length === 0)
  }

  async function animateHand(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    dur: number,
    rotateStart = 0,
    rotateEnd = 0,
    scaleStart = 1,
    scaleEnd = 1,
  ): Promise<void> {
    return new Promise(resolve => {
      const t0 = performance.now()

      function easeOutBack(x: number) {
        const c1 = 1.70158
        const c3 = c1 + 1
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
      }

      function frame(now: number) {
        const t = Math.min((now - t0) / dur, 1)
        const e = easeOutBack(t)

        const x = x0 + (x1 - x0) * e
        const y = y0 + (y1 - y0) * e
        const rotate = rotateStart + (rotateEnd - rotateStart) * e
        const scale = scaleStart + (scaleEnd - scaleStart) * e

        if (handG.current) {
          handG.current.setAttribute(
            'transform',
            `translate(${x},${y}) rotate(${rotate}) scale(${scale})`
          )
        }

        if (handSvg.current) {
          handSvg.current.style.filter =
            t < 0.5
              ? `blur(${(1 - t) * 1.2}px)`
              : `blur(${t * 0.2}px)`
        }

        if (t < 1) {
          requestAnimationFrame(frame)
        } else {
          if (handSvg.current) {
            handSvg.current.style.filter = 'blur(0px)'
          }
          resolve()
        }
      }

      requestAnimationFrame(frame)
    })
  }

  // MediaPipe Script Loader
  function loadMediaPipeScripts(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Hands && ((window as any).Camera || (window as any).CameraUtils)) {
        resolve()
        return
      }

      // Check if scripts are already loading
      const existingHands = document.querySelector('script[src*="mediapipe/hands"]')
      const existingCamera = document.querySelector('script[src*="mediapipe/camera_utils"]')

      if (existingHands && existingCamera) {
        const interval = setInterval(() => {
          if ((window as any).Hands && (window as any).Camera) {
            clearInterval(interval)
            resolve()
          }
        }, 100)
        return
      }

      const scriptHands = document.createElement('script')
      scriptHands.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
      scriptHands.async = true

      const scriptCamera = document.createElement('script')
      scriptCamera.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
      scriptCamera.async = true

      let handsLoaded = false
      let cameraLoaded = false

      scriptHands.onload = () => {
        handsLoaded = true
        if (cameraLoaded) resolve()
      }

      scriptCamera.onload = () => {
        cameraLoaded = true
        if (handsLoaded) resolve()
      }

      scriptHands.onerror = () => reject(new Error('Gagal memuat MediaPipe Hands.'))
      scriptCamera.onerror = () => reject(new Error('Gagal memuat MediaPipe Camera.'))

      document.head.appendChild(scriptHands)
      document.head.appendChild(scriptCamera)
    })
  }

  // Draw hand skeleton on canvas
  function drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm
    ]

    ctx.lineWidth = 3
    ctx.strokeStyle = '#06b6d4' // Neon cyan
    ctx.shadowColor = '#06b6d4'
    ctx.shadowBlur = 6

    for (const [i, j] of connections) {
      const pt1 = landmarks[i]
      const pt2 = landmarks[j]
      if (pt1 && pt2) {
        ctx.beginPath()
        ctx.moveTo(pt1.x * ctx.canvas.width, pt1.y * ctx.canvas.height)
        ctx.lineTo(pt2.x * ctx.canvas.width, pt2.y * ctx.canvas.height)
        ctx.stroke()
      }
    }
    ctx.shadowBlur = 0 // Reset
  }

  // Hand detection results callback
  function onHandResults(results: any) {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Mirror image for a natural mirror-view webcam experience
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)

    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]

      drawSkeleton(ctx, landmarks)

      // Draw glowing joint points
      for (const lm of landmarks) {
        ctx.beginPath()
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI)
        ctx.fillStyle = '#ec4899' // Pink neon node
        ctx.shadowColor = '#ec4899'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }

      const wrist = landmarks[0]
      const thumbTip = landmarks[4]
      const indexTip = landmarks[8]

      // Real-time tracking of the SVG hand to follow user's hand movements
      if (wrist && handG.current && handSvg.current) {
        const x = (1 - wrist.x) * BW
        const y = -180 + wrist.y * 340 // Map wrist.y [0, 1] to [-180, 160]

        lastTrackedX.current = x
        lastTrackedY.current = y

        if (!picking.current) {
          handSvg.current.style.display = 'block'
          const angle = (x - BW / 2) * 0.08
          handG.current.setAttribute(
            'transform',
            `translate(${x},${y}) rotate(${angle}) scale(1.05)`
          )
        }
      }

      if (picking.current) {
        ctx.restore()
        return
      }

      // 1. Shake Detection
      if (wrist) {
        const currentX = wrist.x
        if (lastWristX.current !== null) {
          const dx = Math.abs(currentX - lastWristX.current)

          if (dx > 0.012) { // Slightly lower threshold for easier detection
            if (!isBoxReady.current) {
              shakeEnergy.current = Math.min(100, shakeEnergy.current + dx * 85)
              if (shakeEnergy.current >= 95) {
                isBoxReady.current = true
                shakeEnergy.current = 100
              }
            }
            setIsShaking(true)
          } else {
            if (!isBoxReady.current) {
              shakeEnergy.current = Math.max(0, shakeEnergy.current - 0.5)
            }
            if (shakeEnergy.current < 5) {
              setIsShaking(false)
            }
          }
          setShakeProgress(Math.round(shakeEnergy.current))
        }
        lastWristX.current = currentX
      }

      // 2. Pinch + Pull Up Detection (cubit lalu tarik ke atas)
      if (wrist && thumbTip && indexTip) {
        // Scale-invariant pinch: normalize against hand size
        const pinchDist = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) +
          Math.pow(thumbTip.y - indexTip.y, 2)
        )
        const handSize = Math.sqrt(
          Math.pow(wrist.x - landmarks[9].x, 2) +
          Math.pow(wrist.y - landmarks[9].y, 2)
        )
        const relativeDist = pinchDist / (handSize || 1)
        const isPinching = relativeDist < 0.35 // generous threshold

        if (isPinching && !isPinchingRef.current) {
          // Just started pinching - record the Y position
          isPinchingRef.current = true
          pinchStartY.current = wrist.y
        } else if (!isPinching) {
          // Released pinch
          isPinchingRef.current = false
          pinchStartY.current = 0
        }

        // Calculate pull-up progress (wrist.y decreasing = hand moving up in camera)
        let pullProgress = 0
        if (isPinchingRef.current) {
          const pulled = pinchStartY.current - wrist.y // positive = moved up
          pullProgress = Math.max(0, Math.min(100, Math.round(pulled / 0.12 * 100)))
        }

        setPinchProgress(isPinching ? Math.max(pullProgress, 15) : 0)
        setIsPinchDetected(pullProgress >= 100)

        if (pullProgress >= 100 && !picking.current && names.current.length > 0) {
          isPinchingRef.current = false
          triggerWinnerAnnounce()
        }
      }
    } else {
      // Decay shake energy when no hand is detected, unless box is already prepared
      if (!isBoxReady.current) {
        shakeEnergy.current = Math.max(0, shakeEnergy.current - 1.0)
      }
      if (shakeEnergy.current < 5) {
        setIsShaking(false)
      }
      setShakeProgress(Math.round(shakeEnergy.current))
      setPinchProgress(0)
      setIsPinchDetected(false)

      if (!picking.current && handSvg.current) {
        handSvg.current.style.display = 'none'
      }
    }

    ctx.restore()
  }

  // MediaPipe Initialization Hook
  useEffect(() => {
    let active = true

    async function initMediaPipe() {
      if (!isCameraActive) return

      try {
        setMediaPipeError(null)
        await loadMediaPipeScripts()

        if (!active) return
        setIsMediaPipeLoaded(true)

        const Hands = (window as any).Hands
        const Camera = (window as any).Camera

        if (!Hands || !Camera) {
          throw new Error('Pustaka MediaPipe tidak terdefinisi pada objek window.')
        }

        const hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        })

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        hands.onResults(onHandResults)
        handsInstance.current = hands

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsInstance.current) {
                await handsInstance.current.send({ image: videoRef.current })
              }
            },
            width: 320,
            height: 240
          })

          cameraInstance.current = camera
          await camera.start()
        }
      } catch (err: any) {
        console.error(err)
        const errMsg = err.message || err.toString() || ''
        let errType = 'unknown'

        if (
          err.name === 'NotAllowedError' ||
          errMsg.includes('NotAllowedError') ||
          errMsg.includes('Permission denied') ||
          errMsg.includes('permission denied')
        ) {
          errType = 'permission_denied'
        } else if (
          err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError' ||
          errMsg.includes('NotFoundError') ||
          errMsg.includes('DevicesNotFoundError')
        ) {
          errType = 'not_found'
        } else if (
          err.name === 'NotReadableError' ||
          err.name === 'TrackStartError' ||
          errMsg.includes('NotReadableError') ||
          errMsg.includes('TrackStartError')
        ) {
          errType = 'not_readable'
        } else {
          errType = errMsg || 'Gagal mengaktifkan kamera atau model MediaPipe.'
        }

        if (active) {
          setMediaPipeError(errType)
        }
      }
    }

    if (isCameraActive) {
      initMediaPipe()
    } else {
      // Clean up camera & model resources
      if (cameraInstance.current) {
        cameraInstance.current.stop()
        cameraInstance.current = null
      }
      if (handsInstance.current) {
        handsInstance.current.close()
        handsInstance.current = null
      }
      setIsMediaPipeLoaded(false)
      setShakeProgress(0)
      setPinchProgress(0)
      setIsPinchDetected(false)
      shakeEnergy.current = 0
      lastWristX.current = null
      isBoxReady.current = false
      isPinchingRef.current = false
      pinchStartY.current = 0
      if (handSvg.current) {
        handSvg.current.style.display = 'none'
      }
      if (handPaper.current) {
        handPaper.current.setAttribute('opacity', '0')
      }
    }

    return () => {
      active = false
    }
  }, [isCameraActive])

  async function triggerWinnerAnnounce() {
    if (picking.current) return

    if (!names.current || names.current.length === 0) {
      alert("Silakan masukkan nama-nama peserta terlebih dahulu di kolom input sebelah kiri!")
      return
    }

    picking.current = true
    setBtnAmbilDisabled(true)
    setShowWinner(false)

    // Make the paper appear in the virtual hand to show the grab action
    if (handPaper.current) {
      handPaper.current.setAttribute('opacity', '1')
    }

    const weights = names.current.map(name => {
      const wins = winCounts.current[name] || 0
      return 1 / Math.pow(10000, wins)
    })

    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let randomVal = Math.random() * totalWeight
    let idx = names.current.length - 1

    for (let i = 0; i < weights.length; i++) {
      randomVal -= weights[i]
      if (randomVal <= 0) {
        idx = i
        break
      }
    }

    const winner = names.current[idx]
    pickedName.current = winner
    winCounts.current[winner] = (winCounts.current[winner] || 0) + 1

    // Pull the hand UP out of the box dynamically!
    const startY = lastTrackedY.current ?? 60
    const startX = lastTrackedX.current ?? (BW / 2)
    const targetY = -220 // High above the box
    const duration = 650 // ms

    if (handG.current) {
      const startTime = performance.now()
      await new Promise<void>(resolve => {
        function animatePull(now: number) {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / duration, 1)

          // Cubic ease-out
          const ease = 1 - Math.pow(1 - progress, 3)
          const currentY = startY + (targetY - startY) * ease

          if (handG.current) {
            const angle = (startX - BW / 2) * 0.08
            handG.current.setAttribute(
              'transform',
              `translate(${startX},${currentY}) rotate(${angle}) scale(1.05)`
            )
          }

          if (progress < 1) {
            requestAnimationFrame(animatePull)
          } else {
            resolve()
          }
        }
        requestAnimationFrame(animatePull)
      })
    } else {
      await wait(650)
    }

    if (handSvg.current && handPaper.current) {
      handSvg.current.style.display = 'none'
      handPaper.current.setAttribute('opacity', '0')
    }

    setWinnerName(winner)
    setShowWinner(true)
    picking.current = false

    // Reset gesture meters
    isBoxReady.current = false
    shakeEnergy.current = 0
    setShakeProgress(0)
  }

  async function pickWinner(isGestureMode = false) {
    if (picking.current || !names.current.length) return

    picking.current = true
    setBtnAmbilDisabled(true)
    setShowWinner(false)

    const weights = names.current.map(name => {
      const wins = winCounts.current[name] || 0
      return 1 / Math.pow(10000, wins)
    })

    const totalWeight = weights.reduce((a, b) => a + b, 0)

    let randomVal = Math.random() * totalWeight
    let idx = names.current.length - 1

    for (let i = 0; i < weights.length; i++) {
      randomVal -= weights[i]

      if (randomVal <= 0) {
        idx = i
        break
      }
    }

    const winner = names.current[idx]

    pickedName.current = winner
    winCounts.current[winner] = (winCounts.current[winner] || 0) + 1

    const centerX = BW / 2

    if (handSvg.current && handPaper.current) {
      handSvg.current.style.display = 'block'
      handPaper.current.setAttribute('opacity', '0')

      await animateHand(
        centerX,
        -180,
        centerX,
        120,
        isGestureMode ? 700 : 900, // Faster in gesture mode for immediate response
        -10,
        4,
        0.9,
        1.05,
      )

      if (!isGestureMode) {
        setIsShaking(true)
        await wait(1200)
        setIsShaking(false)
      } else {
        await wait(200)
      }

      handPaper.current.setAttribute('opacity', '1')

      await animateHand(
        centerX,
        120,
        centerX,
        -180,
        isGestureMode ? 800 : 1000,
        4,
        -8,
        1.05,
        0.95,
      )

      await wait(400)

      handSvg.current.style.display = 'none'
    }

    setWinnerName(winner)
    setShowWinner(true)
    picking.current = false

    if (isGestureMode) {
      shakeEnergy.current = 0
      setShakeProgress(0)
    }
  }

  function removeWinner() {
    const nameToRemove = pickedName.current
    const idx = names.current.indexOf(nameToRemove)

    if (idx > -1) {
      names.current.splice(idx, 1)
      setInputValue(names.current.join('\n'))
    }

    delete winCounts.current[nameToRemove]

    pickedName.current = ''
    setShowWinner(false)
    setBtnAmbilDisabled(names.current.length === 0)
  }

  function keepWinner() {
    setShowWinner(false)
    setBtnAmbilDisabled(false)
    pickedName.current = ''
  }

  const confettiColors = ['#ffd700', '#ffffff', '#ff4500', '#1e90ff', '#32cd32', '#ff69b4']

  const confettiPieces: ConfettiPiece[] = Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    animDuration: 3 + Math.random() * 4,
    animDelay: Math.random() * 2,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }))

  return (
    <div className="min-h-screen bg-[#050816] text-white flex flex-col items-center justify-center overflow-hidden relative px-4">
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }

          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes cinematic-shake {
          0% { transform: translateX(0px); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          100% { transform: translateX(0px); }
        }

        @keyframes float-box {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }

        .glass {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .animate-paper-shake {
          animation:
            float-box 4s ease-in-out infinite,
            cinematic-shake 0.15s linear infinite;
        }

        .animate-box-float {
          animation: float-box 4s ease-in-out infinite;
        }
      `}</style>

      <div className="absolute top-10 text-center z-20">
        <h1 className="text-5xl font-black tracking-tight">
          UNDIAN ONLINE
        </h1>
      </div>

      <div
        className="
    relative
    md:absolute
    md:top-24
    md:left-4
    z-20
    w-full
    max-w-[320px]
    md:w-[260px]
    glass
    rounded-3xl
    p-4
    mb-8
    md:mb-0
  "
      >
        <textarea
          value={inputValue}
          onChange={handleTextareaChange}
          placeholder="Masukkan nama satu per baris"
          className="
    w-full
    h-[180px]
    md:h-[220px]
    bg-transparent
    outline-none
    resize-none
    text-sm
    leading-7
    placeholder:text-white/30
  "
        />

        <div className="mt-3 text-xs text-white/40">
          Total Nama: {names.current.length}
        </div>
      </div>

      {/* MediaPipe Gesture Panel */}
      <div
        className="
          relative
          md:absolute
          md:top-24
          md:right-4
          z-20
          w-full
          max-w-[320px]
          md:w-[300px]
          glass
          rounded-3xl
          p-5
          flex
          flex-col
          gap-4
          mb-8
          md:mb-0
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📷</span>
            <h3 className="font-bold text-sm tracking-wide text-white">GESTURE CONTROL</h3>
          </div>
          <button
            onClick={() => {
              if (isCameraActive) {
                setIsCameraActive(false)
                setMediaPipeError(null)
              } else {
                setMediaPipeError(null)
                setIsCameraActive(true)
              }
            }}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300
              ${isCameraActive ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-white/10'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                ${isCameraActive ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {isCameraActive ? (
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[4/3] w-full rounded-2xl bg-black/40 overflow-hidden border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
              />

              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="w-full h-full object-cover"
              />

              {!isMediaPipeLoaded && !mediaPipeError && (
                <div className="absolute inset-0 bg-[#050816]/90 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                  <span className="text-xs text-white/60 tracking-wider">Memuat MediaPipe...</span>
                </div>
              )}

              {mediaPipeError && (
                <div className="absolute inset-0 bg-[#0a0f24]/95 backdrop-blur-md p-5 flex flex-col items-center justify-between text-center overflow-y-auto z-30">
                  <div className="flex flex-col items-center gap-2 w-full mt-2">
                    <span className="text-3xl animate-bounce">⚠️</span>

                    {mediaPipeError === 'permission_denied' ? (
                      <div className="flex flex-col gap-3 text-left w-full px-2">
                        <h4 className="text-sm font-bold text-red-400 text-center tracking-wide uppercase">
                          Akses Kamera Diblokir
                        </h4>
                        <p className="text-[11px] text-white/70 leading-relaxed text-center">
                          Aplikasi membutuhkan izin kamera untuk fitur Kontrol Gestur. Silakan aktifkan dengan langkah berikut:
                        </p>
                        <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] text-white/80 leading-relaxed">
                          <div className="flex items-start gap-2">
                            <span className="bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded text-[9px]">1</span>
                            <span>
                              Klik ikon <strong>Gembok (🔒)</strong> atau <strong>Kamera (🎥)</strong> di sebelah kiri kolom alamat browser (URL bar).
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded text-[9px]">2</span>
                            <span>
                              Ubah opsi <strong>Kamera (Camera)</strong> menjadi <strong>Izinkan (Allow)</strong>.
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded text-[9px]">3</span>
                            <span>
                              Muat ulang (refresh) halaman untuk menerapkan perubahan.
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : mediaPipeError === 'not_found' ? (
                      <div className="flex flex-col gap-2 text-center px-4">
                        <h4 className="text-sm font-bold text-red-400 tracking-wide uppercase">
                          Kamera Tidak Ditemukan
                        </h4>
                        <p className="text-xs text-white/70 leading-relaxed">
                          Kami tidak dapat mendeteksi adanya kamera/webcam pada perangkat Anda. Pastikan kamera Anda terhubung dan berfungsi dengan baik.
                        </p>
                      </div>
                    ) : mediaPipeError === 'not_readable' ? (
                      <div className="flex flex-col gap-2 text-center px-4">
                        <h4 className="text-sm font-bold text-red-400 tracking-wide uppercase">
                          Kamera Sedang Digunakan
                        </h4>
                        <p className="text-xs text-white/70 leading-relaxed">
                          Kamera Anda sedang digunakan oleh aplikasi lain (seperti Zoom, Teams, Google Meet, atau tab browser lain). Harap tutup aplikasi tersebut dan coba lagi.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 text-center px-4">
                        <h4 className="text-sm font-bold text-red-400 tracking-wide uppercase">
                          Gagal Memulai Kamera
                        </h4>
                        <p className="text-xs text-white/60 leading-relaxed font-mono break-all bg-black/40 p-2 rounded-lg border border-white/5">
                          {mediaPipeError}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsCameraActive(false)
                      setMediaPipeError(null)
                    }}
                    className="w-full mt-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold uppercase rounded-xl transition-all duration-300 shadow-lg shadow-red-950/50 hover:scale-[1.02]"
                  >
                    Tutup & Coba Lagi
                  </button>
                </div>
              )}
            </div>

            {isMediaPipeLoaded && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-semibold text-white/60">
                    <span>🫨 KOCOK KOTAK (SHAKE)</span>
                    <span className={shakeProgress >= 100 ? 'text-orange-400 animate-pulse font-bold' : 'text-cyan-400'}>
                      {shakeProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-orange-500 transition-all duration-100 ease-out"
                      style={{ width: `${shakeProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-semibold text-white/60">
                    <span>👌 CUBIT & TARIK KE ATAS</span>
                    <span className={isPinchDetected ? 'text-green-400 animate-pulse font-bold' : 'text-cyan-400'}>
                      {pinchProgress}% {isPinchDetected ? '(TARIK!)' : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-75 ease-out ${isPinchDetected
                        ? 'bg-green-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                        }`}
                      style={{ width: `${pinchProgress}%` }}
                    />
                  </div>
                </div>

                <div className={`
                  mt-1 p-3 rounded-xl text-center text-xs font-bold border transition-all duration-300
                  ${picking.current
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-cyan-500/20 text-cyan-400'
                  }
                `}>
                  {picking.current ? (
                    <span>🤖 Sedang mengambil undian...</span>
                  ) : (
                    <span>👌 Cubit & tarik ke atas untuk mengambil! (Kocok kotak opsional)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-white/40 gap-3 border border-dashed border-white/10 rounded-2xl">
            <span className="text-3xl">🖐️</span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white/60">Kontrol Gestur Nonaktif</span>
              <span className="text-[10px] mt-1 px-4 leading-normal text-white/40">
                Aktifkan kamera untuk mengocok dan mengambil undian dengan gerakan tangan Anda secara virtual!
              </span>
            </div>
            <button
              onClick={() => {
                setMediaPipeError(null)
                setIsCameraActive(true)
              }}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs rounded-xl hover:scale-105 transition-all shadow-md"
            >
              Aktifkan Kamera
            </button>
          </div>
        )}
      </div>

      <div className="relative mt-8 md:mt-32 scale-[0.72] md:scale-100">
        <div className={`relative w-[400px] h-[280px] ${isShaking ? 'animate-paper-shake' : 'animate-box-float'}`}>

          <div className="absolute inset-0 bg-[#09132c] rounded-b-[40px]" />

          <div className="absolute top-0 left-[15%] right-[15%] h-[50px] bg-black rounded-full -translate-y-1/2 z-10" />

          <svg
            ref={handSvg}
            className="absolute inset-0 pointer-events-none overflow-visible z-35"
            viewBox={`0 0 ${BW} ${BH}`}
            style={{ display: 'none' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#dbe4f0" />
              </linearGradient>

              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffe6c7" />
                <stop offset="100%" stopColor="#e6b98f" />
              </linearGradient>

              <linearGradient id="sleeveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#172554" />
              </linearGradient>

              <filter id="handShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.35" />
              </filter>
            </defs>

            <g ref={handG} filter="url(#handShadow)">
              <g ref={handPaper} opacity="0">
                <rect
                  x="-28"
                  y="82"
                  width="56"
                  height="40"
                  rx="4"
                  fill="url(#paperGrad)"
                />

                <line x1="-18" y1="92" x2="18" y2="92" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="-18" y1="100" x2="12" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="-18" y1="108" x2="16" y2="108" stroke="#cbd5e1" strokeWidth="1" />
              </g>

              <path
                d="M-36 -280 C-40 -200 -38 -120 -32 -30 L32 -30 C38 -120 40 -200 36 -280 Z"
                fill="url(#sleeveGrad)"
              />

              <ellipse
                cx="0"
                cy="-25"
                rx="40"
                ry="16"
                fill="#1e40af"
              />

              <path
                d="M-28 -12 C-30 10 -26 40 -14 58 C-6 70 10 72 22 62 C34 50 36 28 30 0 C26 -16 12 -28 -6 -28 C-16 -28 -24 -22 -28 -12 Z"
                fill="url(#skinGrad)"
              />

              <path
                d="M-20 8 C-42 18 -44 46 -26 58 C-16 64 -6 56 -6 42 C-6 28 -10 16 -20 8 Z"
                fill="url(#skinGrad)"
              />

              <path
                d="M-6 8 C-10 28 -8 74 0 92 C4 102 14 102 18 92 C24 74 20 30 16 10 Z"
                fill="url(#skinGrad)"
              />

              <path
                d="M12 4 C8 30 10 90 20 112 C24 122 36 122 40 110 C48 88 42 28 36 4 Z"
                fill="url(#skinGrad)"
              />

              <path
                d="M30 10 C28 34 30 84 38 98 C44 108 54 106 58 94 C64 76 58 34 52 12 Z"
                fill="url(#skinGrad)"
              />

              <path
                d="M48 16 C48 34 50 66 56 78 C62 88 70 86 74 76 C78 62 72 34 66 18 Z"
                fill="url(#skinGrad)"
              />
            </g>
          </svg>

          <div className="absolute inset-0 bg-gradient-to-b from-blue-600 to-indigo-950 rounded-b-[40px] border-4 border-white/10 z-30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent" />

            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
              <div className="text-2xl font-black tracking-[0.3em]">
                MYSTERY BOX
              </div>
            </div>
          </div>

          <div className="absolute top-0 left-[15%] right-[15%] h-[50px] rounded-full -translate-y-1/2 border-b-4 border-blue-400/80 z-40" />
        </div>
      </div>

      <button
        disabled={btnAmbilDisabled}
        onClick={() => pickWinner(false)}
        className="mt-10 px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-lg shadow-2xl hover:scale-105 transition-all disabled:opacity-50"
      >
        AMBIL UNDIAN
      </button>

      {showWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiPieces.map(c => (
              <div
                key={c.id}
                className="absolute top-[-5%]"
                style={{
                  left: `${c.left}%`,
                  width: '8px',
                  height: '16px',
                  backgroundColor: c.color,
                  animation: `confetti-fall ${c.animDuration}s linear ${c.animDelay}s infinite`,
                  borderRadius: '2px',
                }}
              />
            ))}
          </div>

          <div className="relative glass rounded-[40px] p-10 w-[420px] text-center z-10">
            <div className="text-blue-400 uppercase tracking-[0.3em] text-xs mb-4">
              Pemenang Terpilih
            </div>

            <h2 className="text-5xl font-black leading-tight">
              {winnerName}
            </h2>

            <div className="flex gap-4 mt-8">
              <button
                onClick={removeWinner}
                className="flex-1 py-4 rounded-2xl bg-red-500/20 border border-red-500/30"
              >
                Hapus
              </button>

              <button
                onClick={keepWinner}
                className="flex-1 py-4 rounded-2xl bg-white/10 border border-white/10"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
      <a href="https://syahendra.com" target="_blank" rel="noopener noreferrer">
        <div className='text-center text-xs text-white/50 absolute w-full bottom-3 left-1/2 -translate-x-1/2 pb-4'>
          © 2026 Undian Online | Games Undian Online by Muh Syahendra
        </div>
      </a>
    </div>
  )
}
