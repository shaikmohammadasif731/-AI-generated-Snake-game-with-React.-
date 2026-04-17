import React, { useState, useEffect, useRef, useCallback } from 'react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const INITIAL_SPEED = 120;

const TRACKS = [
  { id: 1, title: 'SYS.AUDIO.01_CORRUPT', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'MEM_DUMP_0xFF_ERR', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'FATAL_EXCEPTION_BEAT', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const formatTime = (timeInSecs: number) => {
  if (isNaN(timeInSecs)) return "00:00";
  const m = Math.floor(timeInSecs / 60);
  const s = Math.floor(timeInSecs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function App() {
  // === Music Player State ===
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationStr, setDurationStr] = useState("00:00");
  const [currentTimeStr, setCurrentTimeStr] = useState("00:00");
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // === Snake Game State ===
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const directionRef = useRef(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  
  const generateFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  // Audio Side Effects
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Autoplay prevented:", error);
          setIsPlaying(false);
        });
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIdx]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIdx((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const prevTrack = () => {
    setCurrentTrackIdx((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDurationStr(formatTime(audioRef.current.duration));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      setCurrentTimeStr(formatTime(audioRef.current.currentTime));
    }
  };

  // Keyboard controls for Snake
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const isDirectionKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key);

      if (!hasStarted && !gameOver && isDirectionKey) {
        setHasStarted(true);
        if (!isPlaying) setIsPlaying(true);
      }

      const { x: dx, y: dy } = directionRef.current;

      if ((e.key === 'ArrowUp' || e.key === 'w') && dy !== 1) {
        nextDirectionRef.current = { x: 0, y: -1 };
      } else if ((e.key === 'ArrowDown' || e.key === 's') && dy !== -1) {
        nextDirectionRef.current = { x: 0, y: 1 };
      } else if ((e.key === 'ArrowLeft' || e.key === 'a') && dx !== 1) {
        nextDirectionRef.current = { x: -1, y: 0 };
      } else if ((e.key === 'ArrowRight' || e.key === 'd') && dx !== -1) {
        nextDirectionRef.current = { x: 1, y: 0 };
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, gameOver, isPlaying]);

  // Game Loop
  useEffect(() => {
    if (!hasStarted || gameOver || isPaused) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        directionRef.current = nextDirectionRef.current;
        const head = prevSnake[0];
        const newHead = { x: head.x + directionRef.current.x, y: head.y + directionRef.current.y };

        // Check Wall Collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setGameOver(true);
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check Food Collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => {
            const newScore = s + 10;
            if (newScore > highScore) setHighScore(newScore);
            return newScore;
          });
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const speed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 10);
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [hasStarted, gameOver, isPaused, food, highScore, score, generateFood]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setHasStarted(false);
    setFood(generateFood(INITIAL_SNAKE));
  };

  const activeTrack = TRACKS[currentTrackIdx];

  return (
    <>
      <div className="scanlines" />
      <div className="noise" />
      <div className="min-h-screen bg-black flex items-center justify-center p-4 lg:p-8 relative z-10 font-sans text-white">
        
        <div className="flex flex-col lg:flex-row gap-12 max-w-6xl w-full">
          
          {/* MUSIC PLAYER / TERMINAL */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            <h1 className="font-display text-2xl glitch mb-4" data-text="SYSTEM.AUDIO">SYSTEM.AUDIO</h1>
            
            <div className="glitch-border bg-black p-6 w-full flex flex-col gap-6">
               <div className="border-b-2 border-cyan-500 pb-2 flex justify-between">
                 <span className="text-cyan-500 uppercase tracking-widest text-sm">STATUS</span>
                 <span className="text-magenta-500 uppercase font-bold text-sm animate-pulse">{isPlaying ? 'PLAYING' : 'IDLE'}</span>
               </div>
               
               <div>
                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">CURRENT_TRACK</label>
                  <div className="font-display text-sm text-cyan-400 break-all leading-relaxed">
                     {activeTrack.title}
                  </div>
               </div>

               <div className="flex flex-col gap-2">
                 <div className="flex justify-between text-xl text-magenta-500">
                    <span>{currentTimeStr}</span>
                    <span>{durationStr}</span>
                 </div>
                 <div className="w-full h-4 border-2 border-cyan-500 bg-black relative">
                   <div 
                     className="absolute top-0 left-0 h-full bg-magenta-500 transition-all duration-100 ease-linear"
                     style={{ width: `${progress}%` }}
                   />
                 </div>
               </div>

               <div className="flex justify-between mt-2 gap-2">
                 <button onClick={prevTrack} className="btn-glitch px-4 py-2 text-xs flex-1">[&lt;&lt;]</button>
                 <button onClick={togglePlay} className="btn-glitch px-4 py-2 text-xs flex-1">
                   {isPlaying ? '[||]' : '[=>]'}
                 </button>
                 <button onClick={nextTrack} className="btn-glitch px-4 py-2 text-xs flex-1">[&gt;&gt;]</button>
               </div>

               <div className="flex items-center gap-4 mt-4 border-t-2 border-cyan-500 pt-4">
                 <button onClick={() => setIsMuted(!isMuted)} className="text-xs text-cyan-500 font-display min-w-16 text-left">
                   {isMuted || volume === 0 ? 'MUTED' : 'VOL'}
                 </button>
                 <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={isMuted ? 0 : volume} 
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }} 
                    className="w-full h-2 bg-black border border-cyan-500 appearance-none cursor-pointer"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <style>{`
                    input[type=range]::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      height: 16px;
                      width: 8px;
                      background: #ff00ff;
                      cursor: pointer;
                    }
                  `}</style>
               </div>
            </div>

            {/* AUDIO LOGS */}
            <div className="glitch-border bg-black p-4 mt-4 text-xs text-cyan-400 opacity-80 h-32 overflow-hidden flex flex-col justify-end text-lg">
               <p>&gt; INIT SYSTEM PROTOCOLS...</p>
               <p>&gt; MOUNT AUDIO_DB_V1.3...</p>
               <p className="text-magenta-500">&gt; WARNING: SNAKE_ENTITY DETECTED.</p>
               <p>&gt; AWAITING INPUT...</p>
               {isPlaying && <p className="animate-pulse">&gt; STREAMING DATA...</p>}
            </div>

            <audio 
              ref={audioRef} 
              src={activeTrack.src} 
              onEnded={nextTrack}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              crossOrigin="anonymous"
            />
          </div>

          {/* GAME BOARD SECTION */}
          <div className="w-full lg:w-2/3 flex flex-col items-center">
             
             <div className="w-full flex justify-between items-end mb-4 px-2 max-w-lg">
                <div>
                   <span className="text-[10px] text-magenta-500 font-display leading-none block mb-2">SCORE_VAL</span>
                   <div className="text-5xl text-cyan-500 font-sans tracking-widest">{score.toString().padStart(5, '0')}</div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] text-cyan-500 font-display leading-none block mb-2">HIGH_SCORE</span>
                   <div className="text-3xl text-magenta-500 font-sans tracking-widest">{highScore.toString().padStart(5, '0')}</div>
                </div>
             </div>

             <div className="glitch-block w-full max-w-lg aspect-square">
                <div 
                  className="w-full h-full border-4 border-[#00ffff] bg-black relative"
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                    boxShadow: '4px 4px 0 #ff00ff'
                  }}
                >
                  {gameOver && (
                    <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center border-4 border-[#ff00ff] m-2 p-4">
                       <h3 className="font-display text-2xl md:text-3xl text-[#ff00ff] mb-4 text-center glitch" data-text="FATAL ERROR">FATAL ERROR</h3>
                       <p className="text-cyan-500 text-2xl mb-8 font-sans uppercase">ERR_CODE: {score}</p>
                       <button onClick={resetGame} className="btn-glitch px-6 py-4 text-sm">REBOOT_SYS</button>
                    </div>
                  )}

                  {!hasStarted && !gameOver && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80">
                       <p className="text-magenta-500 font-display text-sm md:text-md tracking-widest animate-pulse text-center leading-[2.5]">PRESS [W A S D]<br/>TO INITIATE</p>
                    </div>
                  )}

                  {isPaused && hasStarted && !gameOver && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                       <span className="text-cyan-500 font-display text-xl glitch" data-text="[ PAUSED ]">[ PAUSED ]</span>
                    </div>
                  )}

                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const x = i % GRID_SIZE;
                    const y = Math.floor(i / GRID_SIZE);
                    const isHead = snake[0].x === x && snake[0].y === y;
                    const isSnake = snake.some(s => s.x === x && s.y === y);
                    const isFood = food.x === x && food.y === y;
                    
                    let classes = "w-full h-full ";
                    if (isHead) {
                      classes += "bg-[#ff00ff]";
                    } else if (isSnake) {
                      classes += "bg-cyan-500 opacity-80 border-[0.5px] border-black scale-95";
                    } else if (isFood) {
                      classes += "bg-[#ff00ff] animate-pulse opacity-100 scale-75 rounded-none";
                    } else {
                      classes += "border-[0.5px] border-cyan-900/40";
                    }
                    
                    return <div key={i} className={classes} />;
                  })}
                </div>
             </div>

             <div className="mt-8 text-center text-lg md:text-xl text-cyan-500 font-sans tracking-widest opacity-60 max-w-lg">
                &gt; OPERATION BOUND BY W A S D KEYS. P TO HALT.
             </div>

          </div>

        </div>
      </div>
    </>
  );
}
