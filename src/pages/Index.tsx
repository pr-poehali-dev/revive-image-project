import { useState, useEffect, useRef, useCallback } from "react";

const PHOTO_URL = "https://cdn.poehali.dev/projects/9d33f3d4-b651-4edb-a187-a3412f765983/bucket/f488ec12-6286-4eba-86cb-8d0b293d7f2f.jpg";

export default function Index() {
  const [isSinging, setIsSinging] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [headTilt, setHeadTilt] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(false);
  const [breathe, setBreathe] = useState(0);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [hasTrack, setHasTrack] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const animFrameRef = useRef<number>();
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sinTimeRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio refs
  const audioCtxRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<AudioBufferSourceNode>();
  const audioBufferRef = useRef<AudioBuffer>();
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const audioElRef = useRef<HTMLAudioElement>();

  const stopAudio = useCallback(() => {
    try { sourceRef.current?.stop(); } catch (err) { void err; }
    sourceRef.current = undefined;
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setTrackName(file.name.replace(/\.[^/.]+$/, ""));
    setHasTrack(true);
    setIsSinging(false);
    stopAudio();
    pauseOffsetRef.current = 0;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    const arrayBuffer = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    audioBufferRef.current = decoded;
    setDuration(decoded.duration);
  }, [stopAudio]);

  const playAudio = useCallback((offset = 0) => {
    const ctx = audioCtxRef.current;
    const analyser = analyserRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !analyser || !buffer) return;

    stopAudio();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(analyser);
    src.start(0, offset);
    src.onended = () => {
      setIsSinging(false);
      pauseOffsetRef.current = 0;
      setCurrentTime(0);
    };
    sourceRef.current = src;
    startTimeRef.current = ctx.currentTime - offset;
  }, [stopAudio]);

  // Animation loop reading real audio data
  useEffect(() => {
    if (isSinging) {
      const freqData = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 128);

      const tick = () => {
        sinTimeRef.current += 0.055;
        const t = sinTimeRef.current;

        let amp = 0;
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(freqData);
          // Focus on vocal range (roughly bins 4-40)
          let sum = 0;
          const start = 4, end = Math.min(40, freqData.length);
          for (let i = start; i < end; i++) sum += freqData[i];
          amp = sum / ((end - start) * 255);
        } else {
          amp = 0.5 + 0.3 * Math.sin(t * 2.3) + 0.15 * Math.sin(t * 5.1);
        }

        setAmplitude(Math.max(0, Math.min(1, amp)));
        setHeadTilt(Math.sin(t * 0.65) * 2.8 + Math.sin(t * 1.3) * 1.2);
        setBreathe(Math.sin(t * 0.38) * 0.011);

        // Update playback time
        if (audioCtxRef.current && startTimeRef.current > 0) {
          const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
          setCurrentTime(Math.min(elapsed, audioBufferRef.current?.duration ?? 0));
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);

      const scheduleBlink = () => {
        const delay = 2200 + Math.random() * 3000;
        blinkTimerRef.current = setTimeout(() => {
          setEyeBlink(true);
          setTimeout(() => { setEyeBlink(false); scheduleBlink(); }, 110);
        }, delay);
      };
      scheduleBlink();

      return () => {
        cancelAnimationFrame(animFrameRef.current!);
        clearTimeout(blinkTimerRef.current!);
      };
    } else {
      cancelAnimationFrame(animFrameRef.current!);
      clearTimeout(blinkTimerRef.current!);
      setAmplitude(0);
      setHeadTilt(0);
      setBreathe(0);
      setEyeBlink(false);
    }
  }, [isSinging]);

  const handleToggle = () => {
    if (!hasTrack) { fileInputRef.current?.click(); return; }
    if (isSinging) {
      // Pause
      pauseOffsetRef.current = audioCtxRef.current
        ? audioCtxRef.current.currentTime - startTimeRef.current
        : 0;
      stopAudio();
      setIsSinging(false);
    } else {
      // Resume / play from offset
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
      playAudio(pauseOffsetRef.current);
      setIsSinging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) loadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const mouthOpen = isSinging ? amplitude * 30 : 0;
  const mouthWidth = isSinging ? 52 + amplitude * 12 : 52;
  const cheekOpacity = isSinging ? 0.05 + amplitude * 0.13 : 0;
  const scaleVal = 1 + breathe;
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className="singing-root"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="grain-overlay" />

      {dragOver && (
        <div className="drop-zone">
          <span>отпусти файл</span>
        </div>
      )}

      <div className="portrait-wrapper">
        <div
          className="portrait-frame"
          style={{
            transform: `rotate(${headTilt}deg) scale(${scaleVal})`,
            transition: isSinging ? "none" : "transform 0.8s ease",
          }}
        >
          <img
            src={PHOTO_URL}
            alt="portrait"
            className="portrait-img"
            style={{
              filter: `brightness(${isSinging ? 0.80 + amplitude * 0.26 : 0.72}) contrast(1.15) grayscale(1)`,
            }}
          />

          {eyeBlink && <div className="blink-overlay" />}
          <div className="cheek-glow" style={{ opacity: cheekOpacity }} />

          <svg className="face-svg" viewBox="0 0 400 520" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(200, 370)">
              <ellipse cx="0" cy={-mouthOpen * 0.3} rx={mouthWidth / 2} ry="8" fill="#100808" opacity="0.9" />
              <ellipse cx="0" cy={mouthOpen * 0.7} rx={mouthWidth / 2 - 2} ry="9" fill="#1e0d0d" opacity="0.88" />
              {isSinging && mouthOpen > 2 && (
                <>
                  <ellipse cx="0" cy={mouthOpen * 0.2} rx={mouthWidth / 2 - 8} ry={mouthOpen * 0.45 + 2} fill="#000000" opacity="0.96" />
                  <ellipse cx="0" cy={mouthOpen * 0.02} rx={mouthWidth / 2 - 15} ry={Math.max(0, mouthOpen * 0.16)} fill="#ece6de" opacity={0.5 + amplitude * 0.35} />
                </>
              )}
              <ellipse cx={-(mouthWidth / 2)} cy="0" rx="5" ry="5" fill="#0d0505" opacity="0.75" />
              <ellipse cx={mouthWidth / 2} cy="0" rx="5" ry="5" fill="#0d0505" opacity="0.75" />
            </g>
            {isSinging && amplitude > 0.25 && (
              <g transform="translate(200, 400)" opacity={amplitude * 0.5}>
                {[1, 2, 3].map((i) => (
                  <ellipse key={i} cx="0" cy="0" rx={55 + i * 28 + amplitude * 18} ry={9 + i * 5 + amplitude * 7}
                    fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" opacity={1 - i * 0.28} />
                ))}
              </g>
            )}
          </svg>

          <div className="vignette" />
        </div>

        {/* Track name */}
        <div className="track-name">
          {trackName ?? "нет трека"}
        </div>

        {/* Progress bar */}
        <div className="progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="progress-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Sound bars */}
        <div className="sound-bars">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="bar"
              style={{
                height: isSinging
                  ? `${6 + amplitude * 32 * Math.abs(Math.sin(i * 0.72 + sinTimeRef.current * 2.2))}px`
                  : "3px",
                transition: isSinging ? "height 0.07s ease" : "height 0.5s ease",
                opacity: isSinging ? 0.35 + amplitude * 0.65 : 0.1,
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="controls">
          <button className={`sing-btn ${isSinging ? "singing" : ""}`} onClick={handleToggle}>
            {isSinging ? (
              <span className="btn-inner">
                <span className="pause-icon"><span /><span /></span>
                пауза
              </span>
            ) : (
              <span className="btn-inner">
                <span className="play-icon">▶</span>
                {hasTrack ? "играть" : "выбрать трек"}
              </span>
            )}
          </button>

          {hasTrack && (
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()} title="сменить трек">
              ↑
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {!hasTrack && (
          <div className="hint">перетащи MP3 / WAV сюда или нажми кнопку</div>
        )}

        <div className="app-label">ЖИВОЙ ПОРТРЕТ</div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@200;300;400&display=swap');

        * { box-sizing: border-box; }

        .singing-root {
          min-height: 100vh;
          background: #080808;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Montserrat', sans-serif;
          overflow: hidden;
          position: relative;
        }

        .grain-overlay {
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 100;
          opacity: 0.55;
        }

        .drop-zone {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          font-family: 'Cormorant', serif;
          font-size: 28px;
          font-style: italic;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.1em;
        }

        .portrait-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
        }

        .portrait-frame {
          position: relative;
          width: min(88vw, 320px);
          height: min(108vw, 400px);
          border-radius: 1px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 40px 80px rgba(0,0,0,0.9);
          transform-origin: center 38%;
        }

        .portrait-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
          transition: filter 0.1s ease;
        }

        .blink-overlay {
          position: absolute;
          top: 24%;
          left: 16%;
          width: 68%;
          height: 9%;
          background: #080808;
          border-radius: 50%;
          opacity: 0.94;
          pointer-events: none;
        }

        .cheek-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 55% 38% at 50% 46%, rgba(190,70,50,0.45) 0%, transparent 70%);
          pointer-events: none;
          transition: opacity 0.1s;
        }

        .face-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 85% 85% at 50% 50%, transparent 45%, rgba(0,0,0,0.75) 100%);
          pointer-events: none;
        }

        /* Track name */
        .track-name {
          font-family: 'Cormorant', serif;
          font-style: italic;
          font-weight: 300;
          font-size: clamp(13px, 3.5vw, 16px);
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.06em;
          margin-top: 18px;
          max-width: min(88vw, 320px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
        }

        /* Progress */
        .progress-wrap {
          width: min(88vw, 320px);
          margin-top: 10px;
        }
        .progress-bar {
          width: 100%;
          height: 1px;
          background: rgba(255,255,255,0.1);
          border-radius: 1px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: rgba(255,255,255,0.45);
          border-radius: 1px;
          transition: width 0.3s linear;
        }
        .progress-times {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.2);
          margin-top: 5px;
        }

        /* Sound bars */
        .sound-bars {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 40px;
          margin-top: 12px;
        }
        .bar {
          width: 2.5px;
          background: rgba(255,255,255,0.65);
          border-radius: 2px;
          height: 3px;
        }

        /* Controls */
        .controls {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
        }

        .sing-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.65);
          padding: 11px 28px;
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 1px;
          transition: all 0.3s ease;
          outline: none;
        }
        .sing-btn:hover {
          border-color: rgba(255,255,255,0.4);
          color: #fff;
          background: rgba(255,255,255,0.04);
        }
        .sing-btn.singing {
          border-color: rgba(220,70,50,0.45);
          color: rgba(255,110,90,0.88);
        }

        .upload-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.3);
          width: 36px;
          height: 36px;
          border-radius: 1px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          outline: none;
        }
        .upload-btn:hover {
          border-color: rgba(255,255,255,0.35);
          color: rgba(255,255,255,0.7);
        }

        .btn-inner { display: flex; align-items: center; gap: 9px; }
        .play-icon { font-size: 8px; opacity: 0.75; }
        .pause-icon { display: flex; gap: 3px; align-items: center; }
        .pause-icon span { display: block; width: 2px; height: 11px; background: currentColor; border-radius: 1px; }

        .hint {
          margin-top: 12px;
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.15);
          text-align: center;
        }

        .app-label {
          margin-top: 16px;
          font-size: 8px;
          letter-spacing: 0.4em;
          color: rgba(255,255,255,0.12);
          font-weight: 200;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}