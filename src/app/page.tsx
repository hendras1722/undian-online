'use client'

import React, { useEffect } from 'react';

interface Paper {
  name: string;
  x: number;
  y: number;
  rot: number;
  vx: number;
  vy: number;
  vrot: number;
}

interface ConfettiPiece {
  id: number;
  left: number;
  animDuration: number;
  animDelay: number;
  color: string;
}

export default function App() {
  const [inputValue, setInputValue] = React.useState<string>('');
  // const [namesList, setNamesList] = React.useState<string[]>([]);
  const [papersList, setPapersList] = React.useState<Paper[]>([]);
  const [winnerName, setWinnerName] = React.useState<string>('');
  const [showWinner, setShowWinner] = React.useState<boolean>(false);
  const [btnAmbilDisabled, setBtnAmbilDisabled] = React.useState<boolean>(true);
  const [isShaking, setIsShaking] = React.useState<boolean>(false);

  const names = React.useRef<string[]>([]);
  const papers = React.useRef<Paper[]>([]);
  const picking = React.useRef<boolean>(false);
  const pickedIndex = React.useRef<number>(-1);
  const winCounts = React.useRef<Record<string, number>>({});

  const handSvg = React.useRef<SVGSVGElement | null>(null);
  const handG = React.useRef<SVGGElement | null>(null);
  const handPaper = React.useRef<SVGRectElement | null>(null);

  function rnd(a: number, b: number): number {
    return a + Math.random() * (b - a);
  }

  function wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  function ease(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInputValue(val);
    const newNames = val.split('\n').map(n => n.trim()).filter(n => n !== '');
    names.current = newNames;
    // setNamesList(newNames);
    setBtnAmbilDisabled(true);
  }

  // function removeName(index: number) {
  //   const removedName = names.current[index];
  //   names.current.splice(index, 1);
  //   delete winCounts.current[removedName];
  //   setNamesList([...names.current]);
  //   setInputValue(names.current.join('\n'));
  //   setBtnAmbilDisabled(true);
  // }

  function generatePapers() {
    if (!names.current.length) {
      papers.current = [];
      setPapersList([]);
      setBtnAmbilDisabled(true);
      return;
    }
    setShowWinner(false);

    const existingPapers = papers.current;

    papers.current = names.current.map((name, i) => {
      if (existingPapers[i]) {
        return { ...existingPapers[i], name };
      }
      return {
        name,
        x: rnd(20, 280),
        y: rnd(180, 200),
        rot: rnd(-20, 20),
        vx: 0,
        vy: 0,
        vrot: 0
      };
    });

    setPapersList([...papers.current]);
    setBtnAmbilDisabled(false);
  }

  function scatterPapers(floating = false): Promise<void> {
    return new Promise(resolve => {
      papers.current.forEach(p => {
        p.vx = floating ? rnd(-12, 12) : rnd(-2, 2);
        p.vy = floating ? rnd(-12, 12) : 0;
        p.vrot = floating ? rnd(-20, 20) : rnd(-4, 4);
      });

      const BW = 300, BH = 220, HW = 20, HH = 15;
      const FRIC = floating ? 0.92 : 0.80;
      const GRAV = floating ? 0 : 0.55;
      let frame = 0;
      const maxFrames = floating ? 30 : 45;

      function tick() {
        frame++;
        let moving = false;

        papers.current.forEach((p, i) => {
          p.vy += GRAV;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vrot;
          p.vx *= FRIC;
          p.vy *= FRIC;
          p.vrot *= FRIC;

          if (p.x - HW < 0) { p.x = HW; p.vx = Math.abs(p.vx) * (floating ? 0.9 : 0.5); }
          if (p.x + HW > BW) { p.x = BW - HW; p.vx = -Math.abs(p.vx) * (floating ? 0.9 : 0.5); }
          if (p.y - HH < 0) { p.y = HH; p.vy = Math.abs(p.vy) * (floating ? 0.9 : 0.5); }
          if (p.y + HH > BH) { p.y = BH - HH; p.vy = -Math.abs(p.vy) * (floating ? 0.9 : 0.4); p.vx *= (floating ? 0.9 : 0.8); }

          const el = document.getElementById('p' + i) as HTMLElement | null;
          if (el) {
            el.style.transition = 'none';
            el.style.left = (p.x - HW) + 'px';
            el.style.top = (p.y - HH) + 'px';
            el.style.transform = `rotate(${p.rot}deg)`;
          }
          if (Math.abs(p.vx) > 0.25 || Math.abs(p.vy) > 0.25 || Math.abs(p.vrot) > 0.25) {
            moving = true;
          }
        });

        if (moving && frame < maxFrames) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  function animateHand(x0: number, y0: number, x1: number, y1: number, dur: number): Promise<void> {
    return new Promise(resolve => {
      const t0 = performance.now();
      function frame(now: number) {
        const t = Math.min((now - t0) / dur, 1);
        const e = ease(t);
        if (handG.current) {
          handG.current.setAttribute('transform', `translate(${x0 + (x1 - x0) * e},${y0 + (y1 - y0) * e})`);
        }
        if (t < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  async function pickWinner() {
    if (picking.current || !papers.current.length) return;
    picking.current = true;
    setBtnAmbilDisabled(true);
    setShowWinner(false);

    setIsShaking(true);
    for (let w = 0; w < 4; w++) {
      await scatterPapers(true);
    }
    setIsShaking(false);
    await scatterPapers(false);
    await wait(180);

    const weights = papers.current.map(p => {
      const wins = winCounts.current[p.name] || 0;
      return 1 / Math.pow(10000, wins);
    });

    const totalWeight = weights.reduce((acc, val) => acc + val, 0);
    let randomVal = Math.random() * totalWeight;
    let idx = papers.current.length - 1;

    for (let i = 0; i < weights.length; i++) {
      randomVal -= weights[i];
      if (randomVal <= 0) {
        idx = i;
        break;
      }
    }

    pickedIndex.current = idx;
    const p = papers.current[idx];

    winCounts.current[p.name] = (winCounts.current[p.name] || 0) + 1;

    if (handSvg.current && handPaper.current && handG.current) {
      handSvg.current.style.display = 'block';
      handPaper.current.setAttribute('opacity', '0');
      handG.current.setAttribute('transform', `translate(${p.x}, -100)`);

      await animateHand(p.x, -100, p.x, p.y - 30, 420);
      await animateHand(p.x, p.y - 30, p.x, p.y + 5, 130);

      const el = document.getElementById('p' + idx) as HTMLElement | null;
      if (el) el.style.opacity = '0';
      handPaper.current.setAttribute('opacity', '1');

      await wait(100);

      await animateHand(p.x, p.y + 5, p.x, -160, 520);

      handSvg.current.style.display = 'none';
    }

    setWinnerName(papers.current[idx].name);
    setShowWinner(true);
    picking.current = false;
  }

  function removeWinner() {
    const idx = names.current.indexOf(winnerName);
    if (idx > -1) {
      names.current.splice(idx, 1);
      // setNamesList([...names.current]);
      setInputValue(names.current.join('\n'));
    }

    delete winCounts.current[winnerName];

    if (pickedIndex.current > -1) {
      papers.current.splice(pickedIndex.current, 1);
      setPapersList([...papers.current]);
      pickedIndex.current = -1;
    }

    setShowWinner(false);
    if (papers.current.length > 0) {
      setBtnAmbilDisabled(false);
    }
  }

  function keepWinner() {
    setShowWinner(false);
    setBtnAmbilDisabled(false);

    if (pickedIndex.current > -1) {
      const el = document.getElementById('p' + pickedIndex.current) as HTMLElement | null;
      if (el) el.style.opacity = '1';
    }
  }

  const confettiColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const confettiPieces: ConfettiPiece[] = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    animDuration: 2 + Math.random() * 3,
    animDelay: Math.random() * 2,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));

  useEffect(() => {
    generatePapers();
  }, [names.current]);

  return (
    <div className="flex flex-col items-center py-8 px-4 gap-4 font-sans min-h-screen">
      <div className="text-[20px] font-medium text-gray-800">Undian Online</div>

      <div className="flex w-full max-w-[320px]">
        <textarea
          value={inputValue}
          onChange={handleTextareaChange}
          placeholder="Masukkan nama... (pisahkan dengan Enter/baris baru)"
          rows={4}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-[14px] bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* <div className="flex flex-wrap gap-[6px] w-full max-w-[320px] min-h-[24px]">
        {namesList.map((name, index) => (
          <span key={index} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-[13px] text-gray-600">
            {name}
            <button
              onClick={() => removeName(index)}
              className="text-gray-400 hover:text-red-500 font-bold ml-1 outline-none cursor-pointer"
              title="Hapus Nama"
            >
              &times;
            </button>
          </span>
        ))}
      </div> */}

      <div className="flex gap-2 w-full max-w-[320px]">
        <button
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md text-[15px] font-semibold cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          onClick={pickWinner}
          disabled={btnAmbilDisabled || papersList.length === 0}
        >
          Mulai
        </button>
      </div>

      <style>
        {`
          @keyframes box-shake {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            20% { transform: translate(-3px, 2px) rotate(-1deg); }
            40% { transform: translate(3px, -2px) rotate(1deg); }
            60% { transform: translate(-3px, -2px) rotate(-1deg); }
            80% { transform: translate(3px, 2px) rotate(1deg); }
          }
          .animate-box-shake {
            animation: box-shake 0.15s infinite;
          }
        `}
      </style>

      <div className={`relative w-[300px] h-[220px] bg-[#c8b89a] rounded-[14px] border-[3px] border-[#a8977a] overflow-hidden mt-4 shadow-sm ${isShaking ? 'animate-box-shake' : ''}`}>
        <div className="absolute bottom-0 left-0 right-0 h-[16px] bg-[#b5a080] rounded-b-[11px]"></div>

        <div id="papers">
          {papersList.map((p, i) => (
            <div
              key={i}
              id={`p${i}`}
              className="absolute w-[40px] h-[30px] bg-[#fef9c3] border border-[#d4c43a] rounded-[3px] origin-center"
              style={{
                left: `${p.x - 20}px`,
                top: `${p.y - 15}px`,
                transform: `rotate(${p.rot}deg)`,
                opacity: 1
              }}
            ></div>
          ))}
        </div>

        <svg
          ref={handSvg}
          className="absolute inset-0 pointer-events-none overflow-visible z-10"
          viewBox="0 0 300 220"
          style={{ display: 'none' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g ref={handG}>
            <rect ref={handPaper} x="-20" y="46" width="40" height="30" rx="3" fill="#fef9c3" stroke="#d4c43a" strokeWidth="1" opacity="0" />
            <rect x="-18" y="-60" width="36" height="68" rx="6" fill="#f0b882" />
            <rect x="-22" y="0" width="44" height="52" rx="8" fill="#f4c090" />
            <rect x="-18" y="44" width="12" height="46" rx="6" fill="#f4c090" />
            <rect x="-5" y="48" width="12" height="50" rx="6" fill="#f4c090" />
            <rect x="8" y="46" width="12" height="48" rx="6" fill="#f4c090" />
            <rect x="21" y="40" width="10" height="38" rx="5" fill="#f0b882" />

            <line x1="-12" y1="47" x2="-12" y2="53" stroke="#e0965a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="1" y1="50" x2="1" y2="56" stroke="#e0965a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="14" y1="48" x2="14" y2="54" stroke="#e0965a" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {showWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <style>
            {`
              @keyframes confetti-fall {
                0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
              }
            `}
          </style>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiPieces.map(c => (
              <div
                key={c.id}
                className="absolute top-[-10%]"
                style={{
                  left: `${c.left}%`,
                  width: '10px',
                  height: '20px',
                  backgroundColor: c.color,
                  animation: `confetti-fall ${c.animDuration}s linear ${c.animDelay}s infinite`
                }}
              />
            ))}
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl z-10 flex flex-col items-center min-w-[300px] transform transition-all scale-100 mx-4">
            <div className="text-[14px] text-gray-500 mb-2 uppercase tracking-widest font-semibold">Selamat Kepada</div>
            <div className="text-[36px] font-bold text-gray-800 mb-8 text-center drop-shadow-sm">
              {winnerName}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={removeWinner}
                className="flex-1 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[14px] font-medium transition-colors cursor-pointer"
              >
                Hapus
              </button>
              <button
                onClick={keepWinner}
                className="flex-1 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[14px] font-medium transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}