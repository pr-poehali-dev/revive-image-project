import { useState, useEffect, useRef } from "react";

const PHOTO_URL = "https://cdn.poehali.dev/projects/9d33f3d4-b651-4edb-a187-a3412f765983/bucket/f488ec12-6286-4eba-86cb-8d0b293d7f2f.jpg";

const LYRICS = [
  "тишина говорит громче слов",
  "я слышу твой голос сквозь тьму",
  "и снова и снова и снова",
  "мы падаем вниз в никуда",
  "но кто-то поймает нас здесь",
];

export default function Index() {
  const [isSinging, setIsSinging] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [lyricIndex, setLyricIndex] = useState(0);
  const [showLyric, setShowLyric] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(false);
  const [breathe, setBreathe] = useState(0);
  const animFrameRef = useRef<number>();
  const lyricTimerRef = useRef<ReturnType<typeof setInterval>>();
  const blinkTimerRef = useRef<ReturnType<typeof setInterval>>();
  const sinTimeRef = useRef(0);

  useEffect(() => {
    if (isSinging) {
      const tick = () => {
        sinTimeRef.current += 0.08;
        const t = sinTimeRef.current;
        const a =
          0.5 +
          0.3 * Math.sin(t * 2.3) +
          0.15 * Math.sin(t * 5.1) +
          0.05 * Math.sin(t * 9.7);
        setAmplitude(Math.max(0, Math.min(1, a)));
        setHeadTilt(Math.sin(t * 0.7) * 3.5 + Math.sin(t * 1.4) * 1.5);
        setBreathe(Math.sin(t * 0.4) * 0.012);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);

      setShowLyric(true);
      lyricTimerRef.current = setInterval(() => {
        setShowLyric(false);
        setTimeout(() => {
          setLyricIndex((i) => (i + 1) % LYRICS.length);
          setShowLyric(true);
        }, 400);
      }, 3200);

      const scheduleBlink = () => {
        const delay = 2500 + Math.random() * 2500;
        blinkTimerRef.current = setTimeout(() => {
          setEyeBlink(true);
          setTimeout(() => {
            setEyeBlink(false);
            scheduleBlink();
          }, 120);
        }, delay) as unknown as ReturnType<typeof setInterval>;
      };
      scheduleBlink();

      return () => {
        cancelAnimationFrame(animFrameRef.current!);
        clearInterval(lyricTimerRef.current!);
        clearTimeout(blinkTimerRef.current!);
      };
    } else {
      cancelAnimationFrame(animFrameRef.current!);
      clearInterval(lyricTimerRef.current!);
      clearTimeout(blinkTimerRef.current!);
      setAmplitude(0);
      setShowLyric(false);
      setHeadTilt(0);
      setBreathe(0);
      setEyeBlink(false);
    }
  }, [isSinging]);

  const mouthOpen = isSinging ? amplitude * 28 : 0;
  const mouthWidth = isSinging ? 52 + amplitude * 10 : 52;
  const cheekOpacity = isSinging ? 0.06 + amplitude * 0.12 : 0;
  const scaleVal = 1 + breathe;

  return (
    <div className="singing-root">
      <div className="grain-overlay" />

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
              filter: `brightness(${isSinging ? 0.80 + amplitude * 0.24 : 0.72}) contrast(1.15) grayscale(1)`,
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
                  <ellipse
                    cx="0"
                    cy={mouthOpen * 0.2}
                    rx={mouthWidth / 2 - 8}
                    ry={mouthOpen * 0.45 + 2}
                    fill="#000000"
                    opacity="0.96"
                  />
                  <ellipse
                    cx="0"
                    cy={mouthOpen * 0.02}
                    rx={mouthWidth / 2 - 15}
                    ry={Math.max(0, mouthOpen * 0.16)}
                    fill="#ece6de"
                    opacity={0.5 + amplitude * 0.35}
                  />
                </>
              )}
              <ellipse cx={-(mouthWidth / 2)} cy="0" rx="5" ry="5" fill="#0d0505" opacity="0.75" />
              <ellipse cx={mouthWidth / 2} cy="0" rx="5" ry="5" fill="#0d0505" opacity="0.75" />
            </g>

            {isSinging && amplitude > 0.28 && (
              <g transform="translate(200, 400)" opacity={amplitude * 0.55}>
                {[1, 2, 3].map((i) => (
                  <ellipse
                    key={i}
                    cx="0"
                    cy="0"
                    rx={55 + i * 28 + amplitude * 18}
                    ry={9 + i * 5 + amplitude * 7}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    opacity={1 - i * 0.28}
                  />
                ))}
              </g>
            )}
          </svg>

          <div className="vignette" />
        </div>

        <div className={`lyric-display ${showLyric && isSinging ? "lyric-visible" : ""}`}>
          {LYRICS[lyricIndex]}
        </div>

        <div className="sound-bars">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bar"
              style={{
                height: isSinging
                  ? `${8 + amplitude * 30 * Math.abs(Math.sin(i * 0.75 + sinTimeRef.current * 2))}px`
                  : "4px",
                transition: isSinging ? "height 0.09s ease" : "height 0.5s ease",
                opacity: isSinging ? 0.4 + amplitude * 0.6 : 0.12,
              }}
            />
          ))}
        </div>

        <button
          className={`sing-btn ${isSinging ? "singing" : ""}`}
          onClick={() => setIsSinging((v) => !v)}
        >
          {isSinging ? (
            <span className="btn-inner">
              <span className="pause-icon"><span /><span /></span>
              остановить
            </span>
          ) : (
            <span className="btn-inner">
              <span className="play-icon">▶</span>
              запустить
            </span>
          )}
        </button>

        <div className="app-label">ЖИВОЙ ПОРТРЕТ</div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@200;300;400&display=swap');

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

        .portrait-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .portrait-frame {
          position: relative;
          width: min(88vw, 340px);
          height: min(112vw, 430px);
          border-radius: 1px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 50px 100px rgba(0,0,0,0.9);
          transform-origin: center 38%;
        }

        .portrait-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
          transition: filter 0.12s ease;
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
          transition: opacity 0.06s;
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

        .lyric-display {
          font-family: 'Cormorant', serif;
          font-weight: 300;
          font-style: italic;
          font-size: clamp(13px, 3.8vw, 17px);
          color: rgba(255,255,255,0);
          letter-spacing: 0.07em;
          text-align: center;
          height: 30px;
          line-height: 30px;
          margin-top: 22px;
          transition: color 0.35s ease, opacity 0.35s ease;
          opacity: 0;
          white-space: nowrap;
        }
        .lyric-visible {
          color: rgba(255,255,255,0.58);
          opacity: 1;
        }

        .sound-bars {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 44px;
          margin-top: 14px;
        }
        .bar {
          width: 2.5px;
          background: rgba(255,255,255,0.65);
          border-radius: 2px;
          height: 4px;
        }

        .sing-btn {
          margin-top: 22px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.65);
          padding: 11px 30px;
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
          border-color: rgba(255,255,255,0.45);
          color: #fff;
          background: rgba(255,255,255,0.04);
        }
        .sing-btn.singing {
          border-color: rgba(220,70,50,0.45);
          color: rgba(255,110,90,0.88);
        }

        .btn-inner {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .play-icon { font-size: 8px; opacity: 0.75; }
        .pause-icon { display: flex; gap: 3px; align-items: center; }
        .pause-icon span { display: block; width: 2px; height: 11px; background: currentColor; border-radius: 1px; }

        .app-label {
          margin-top: 18px;
          font-size: 8px;
          letter-spacing: 0.4em;
          color: rgba(255,255,255,0.14);
          font-weight: 200;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
