'use client'

import React, { useState, useRef } from 'react'

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

  const names = useRef<string[]>([])
  const picking = useRef<boolean>(false)
  const pickedName = useRef<string>('')
  const winCounts = useRef<Record<string, number>>({})

  const handSvg = useRef<SVGSVGElement | null>(null)
  const handG = useRef<SVGGElement | null>(null)
  const handPaper = useRef<SVGGElement | null>(null)

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

  async function pickWinner() {
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
        900,
        -10,
        4,
        0.9,
        1.05,
      )

      setIsShaking(true)
      await wait(1200)
      setIsShaking(false)

      handPaper.current.setAttribute('opacity', '1')

      await animateHand(
        centerX,
        120,
        centerX,
        -180,
        1000,
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

      <div className="relative mt-8 md:mt-32 scale-[0.72] md:scale-100">
        <div className={`relative w-[400px] h-[280px] ${isShaking ? 'animate-paper-shake' : 'animate-box-float'}`}>

          <div className="absolute inset-0 bg-[#09132c] rounded-b-[40px]" />

          <div className="absolute top-0 left-[15%] right-[15%] h-[50px] bg-black rounded-full -translate-y-1/2 z-10" />

          <svg
            ref={handSvg}
            className="absolute inset-0 pointer-events-none overflow-visible z-20"
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
        onClick={pickWinner}
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
    </div>
  )
}
