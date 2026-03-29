import { useState, useEffect, useRef } from "react";

const COLORS = ["#FFD700", "#FF69B4", "#FF1493", "#FFA500", "#FF6B6B", "#C0C0C0", "#FFFACD", "#FFB6C1"];

function Confetti() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const pieces = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 7 + 3,
            d: Math.random() * 80 + 20,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngle: 0,
            tiltSpeed: Math.random() * 0.1 + 0.05,
            shape: Math.random() > 0.5 ? "rect" : "circle",
        }));

        let angle = 0;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            angle += 0.01;

            pieces.forEach((p, i) => {
                p.tiltAngle += p.tiltSpeed;
                p.y += (Math.cos(angle + p.d) + 1.5) * 1.2;
                p.x += Math.sin(angle) * 0.8;
                p.tilt = Math.sin(p.tiltAngle) * 12;

                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                if (p.shape === "circle") {
                    ctx.arc(p.x + p.tilt, p.y, p.r, 0, Math.PI * 2);
                } else {
                    ctx.rect(p.x + p.tilt, p.y, p.r * 2, p.r * 0.8);
                }
                ctx.fill();
                ctx.restore();

                if (p.y > canvas.height + 20) {
                    pieces[i] = {
                        ...p,
                        x: Math.random() * canvas.width,
                        y: -20,
                    };
                }
            });

            animId = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0, left: 0,
                width: "100%", height: "100%",
                pointerEvents: "none",
                zIndex: 0,
            }}
        />
    );
}

function Sparkles() {
    return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
            {Array.from({ length: 18 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        width: i % 3 === 0 ? "10px" : "6px",
                        height: i % 3 === 0 ? "10px" : "6px",
                        borderRadius: "50%",
                        background: COLORS[i % COLORS.length],
                        left: `${5 + (i * 5.5) % 90}%`,
                        top: `${(i * 7 + 10) % 90}%`,
                        animation: `sparkle ${1.5 + (i % 4) * 0.4}s ease-in-out ${(i * 0.2) % 2}s infinite`,
                        boxShadow: `0 0 6px 2px ${COLORS[i % COLORS.length]}`,
                    }}
                />
            ))}
        </div>
    );
}

function FloatingHearts() {
    return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
            {["❤️", "🎂", "✨", "🎉", "💕", "🌟", "🎁", "💖"].map((emoji, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        fontSize: `${16 + (i % 3) * 6}px`,
                        left: `${8 + i * 11}%`,
                        animation: `floatUp ${3 + (i % 3)}s ease-in-out ${i * 0.6}s infinite`,
                        opacity: 0,
                    }}
                >
                    {emoji}
                </div>
            ))}
        </div>
    );
}

export default function App() {
    const [revealed, setRevealed] = useState(false);
    const [showCert, setShowCert] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setRevealed(true), 400);
        const t2 = setTimeout(() => setShowCert(true), 900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:wght@300;400;600&family=Great+Vibes&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a14;
          min-height: 100vh;
          font-family: 'Cormorant Garamond', serif;
          overflow-x: hidden;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(0px) rotate(-10deg); }
          20% { opacity: 1; }
          80% { opacity: 0.7; }
          100% { opacity: 0; transform: translateY(-120px) rotate(15deg); }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3), 0 0 60px rgba(255,105,180,0.15); }
          50% { box-shadow: 0 0 40px rgba(255,215,0,0.6), 0 0 100px rgba(255,105,180,0.3); }
        }

        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes bounce-in {
          0% { transform: scale(0) rotate(-5deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(2deg); opacity: 1; }
          80% { transform: scale(0.96) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes title-reveal {
          from { opacity: 0; letter-spacing: 0.3em; }
          to { opacity: 1; letter-spacing: 0.05em; }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(-2deg) scale(1); }
          50% { transform: rotate(2deg) scale(1.03); }
        }

        .cert-card {
          animation: bounce-in 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }

        .shimmer-text {
          background: linear-gradient(90deg, #FFD700, #FFB6C1, #FFF, #FFD700, #FF69B4, #FFD700);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }

        .ornament-line {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 12px 0;
        }

        .ornament-line::before,
        .ornament-line::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, #FFD700, transparent);
        }

        .stamp {
          animation: rotate-slow 8s linear infinite;
          display: inline-block;
        }

        .cat-img {
          animation: wiggle 3s ease-in-out infinite;
        }
      `}</style>

            {/* Background */}
            <div style={{
                position: "fixed", inset: 0,
                background: "radial-gradient(ellipse at 20% 30%, #1a0a2e 0%, #0a0a14 50%, #0d1520 100%)",
                zIndex: -1,
            }} />

            <Confetti />

            {/* Page */}
            <div style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 16px 40px",
                position: "relative",
                zIndex: 2,
            }}>

                {/* Birthday Header */}
                <div style={{
                    textAlign: "center",
                    marginBottom: "28px",
                    opacity: revealed ? 1 : 0,
                    transition: "opacity 0.8s ease",
                }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎂 🎉 🎁</div>
                    <div style={{
                        fontFamily: "'Great Vibes', cursive",
                        fontSize: "clamp(28px, 8vw, 48px)",
                        color: "#FFD700",
                        textShadow: "0 0 20px rgba(255,215,0,0.5)",
                        lineHeight: 1.2,
                    }}>
                        С Днём Рождения!
                    </div>
                    <div style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "clamp(13px, 3.5vw, 16px)",
                        color: "rgba(255,182,193,0.8)",
                        marginTop: "6px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                    }}>
                        Специальный подарок для тебя
                    </div>
                </div>

                {/* Certificate Card */}
                {showCert && (
                    <div
                        className="cert-card"
                        style={{
                            borderRadius: "18px",
                            width: "100%",
                            maxWidth: "420px",
                            position: "relative",
                            animation: "bounce-in 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards, pulse-glow 3s ease-in-out 1s infinite",
                        }}
                    >
                        {/* Outer glow border */}
                        <div style={{
                            position: "absolute",
                            inset: "-2px",
                            borderRadius: "20px",
                            background: "linear-gradient(135deg, #FFD700, #FF69B4, #C0C0C0, #FFD700)",
                            backgroundSize: "300% 300%",
                            animation: "shimmer 3s linear infinite",
                            zIndex: 0,
                        }} />

                        {/* Card body */}
                        <div style={{
                            position: "relative",
                            zIndex: 1,
                            background: "linear-gradient(160deg, #12102a 0%, #0f1528 50%, #1a0e2e 100%)",
                            borderRadius: "18px",
                            padding: "clamp(24px, 6vw, 36px)",
                            overflow: "hidden",
                        }}>
                            <FloatingHearts />
                            <Sparkles />

                            {/* Top decorative row */}
                            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative", zIndex: 2 }}>
                                <div style={{ fontSize: "28px", marginBottom: "6px" }}>🚗 ✨</div>
                                <div style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontSize: "clamp(10px, 2.5vw, 12px)",
                                    color: "#FFD700",
                                    letterSpacing: "0.25em",
                                    textTransform: "uppercase",
                                    opacity: 0.8,
                                }}>
                                    Сертификат
                                </div>
                            </div>

                            {/* Title */}
                            <div style={{ textAlign: "center", marginBottom: "20px", position: "relative", zIndex: 2 }}>
                                <div className="ornament-line">
                                    <span style={{ color: "#FFD700", fontSize: "16px" }}>◆</span>
                                </div>

                                <h1
                                    className="shimmer-text"
                                    style={{
                                        fontFamily: "'Playfair Display', serif",
                                        fontSize: "clamp(22px, 6.5vw, 32px)",
                                        fontWeight: 700,
                                        lineHeight: 1.25,
                                        marginBottom: "4px",
                                    }}
                                >
                                    Тонировка Стёкол
                                </h1>
                                <div style={{
                                    fontFamily: "'Playfair Display', serif",
                                    fontStyle: "italic",
                                    fontSize: "clamp(15px, 4vw, 20px)",
                                    color: "rgba(255,255,255,0.7)",
                                }}>
                                    автомобиля
                                </div>

                                <div className="ornament-line">
                                    <span style={{ color: "#FFD700", fontSize: "16px" }}>◆</span>
                                </div>
                            </div>

                            {/* Main description */}
                            <div style={{
                                background: "rgba(255,215,0,0.06)",
                                border: "1px solid rgba(255,215,0,0.2)",
                                borderRadius: "12px",
                                padding: "18px 20px",
                                textAlign: "center",
                                marginBottom: "20px",
                                position: "relative",
                                zIndex: 2,
                            }}>
                                <p style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontSize: "clamp(14px, 3.8vw, 17px)",
                                    color: "rgba(255,255,255,0.88)",
                                    lineHeight: 1.7,
                                    fontWeight: 300,
                                }}>
                                    Настоящий сертификат удостоверяет, что его обладательница имеет право на{" "}
                                    <span style={{ color: "#FFD700", fontWeight: 600 }}>
                                        полную тонировку стёкол автомобиля
                                    </span>{" "}
                                    — стильную, качественную и с заботой о тебе.
                                </p>
                            </div>

                            {/* Cat block */}
                            <div style={{
                                position: "relative",
                                zIndex: 2,
                                marginBottom: "22px",
                                textAlign: "center",
                            }}>
                                {/* Cat image */}
                                <div style={{
                                    borderRadius: "14px",
                                    overflow: "hidden",
                                    border: "2px solid rgba(255,215,0,0.35)",
                                    boxShadow: "0 4px 24px rgba(255,105,180,0.2)",
                                    display: "inline-block",
                                    width: "100%",
                                }}>
                                    <img
                                        className="cat-img"
                                        src="https://cataas.com/cat/funny?width=400&height=280"
                                        alt="Смешной котик"
                                        style={{
                                            width: "100%",
                                            height: "220px",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                        onError={(e) => {
                                            // Fallback to another cat API if first fails
                                            e.target.src = "https://placecats.com/400/220";
                                        }}
                                    />
                                </div>

                                {/* Caption */}
                                <div style={{
                                    marginTop: "12px",
                                    background: "rgba(255,105,180,0.08)",
                                    border: "1px solid rgba(255,105,180,0.25)",
                                    borderRadius: "10px",
                                    padding: "10px 14px",
                                }}>
                                    <p style={{
                                        fontFamily: "'Cormorant Garamond', serif",
                                        fontSize: "clamp(13px, 3.5vw, 16px)",
                                        color: "rgba(255,255,255,0.85)",
                                        lineHeight: 1.5,
                                        fontStyle: "italic",
                                    }}>
                                        🐱 Это ты, когда сядешь в свою затонированую Тайоту 😎
                                    </p>
                                </div>
                            </div>

                            {/* Recipient line */}
                            <div style={{
                                textAlign: "center",
                                marginBottom: "20px",
                                position: "relative",
                                zIndex: 2,
                            }}>
                                <div style={{
                                    fontFamily: "'Great Vibes', cursive",
                                    fontSize: "clamp(24px, 7vw, 34px)",
                                    color: "#FF69B4",
                                    textShadow: "0 0 15px rgba(255,105,180,0.5)",
                                    marginBottom: "4px",
                                }}>
                                    С любовью, для тебя 💕
                                </div>
                                <div style={{
                                    width: "60%",
                                    height: "1px",
                                    background: "linear-gradient(90deg, transparent, rgba(255,105,180,0.5), transparent)",
                                    margin: "0 auto",
                                }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer note */}
                <div style={{
                    marginTop: "28px",
                    textAlign: "center",
                    opacity: revealed ? 1 : 0,
                    transition: "opacity 1.2s ease 0.5s",
                }}>
                </div>

            </div>
        </>
    );
}