import React, { useMemo, useState } from "react";

type TabKey = "shm" | "beats" | "lissajous" | "resonance";
type Point = { x: number; y: number };

const WIDTH = 900;
const HEIGHT = 280;

function linspace(start: number, end: number, n: number) {
  const arr: number[] = [];
  const step = (end - start) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(start + i * step);
  return arr;
}

function normalize(values: number[], outMin: number, outMax: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-9);
  return values.map((v) => outMax - ((v - min) / span) * (outMax - outMin));
}

function toPath(points: Point[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function Plot({ title, points, secondary, square = false }: { title: string; points: Point[]; secondary?: Point[]; square?: boolean }) {
  const w = square ? 360 : WIDTH;
  const h = square ? 360 : HEIGHT;
  return (
    <div className="card plot-card">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="plot">
        {Array.from({ length: 6 }, (_, i) => {
          const x = (i / 5) * w;
          const y = (i / 5) * h;
          return (
            <g key={i}>
              <line x1={x} y1={0} x2={x} y2={h} stroke="rgba(255,255,255,0.08)" />
              <line x1={0} y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.08)" />
            </g>
          );
        })}
        {secondary && <path d={toPath(secondary)} fill="none" stroke="#ffb86b" strokeWidth="2" opacity="0.9" />}
        <path d={toPath(points)} fill="none" stroke="#8ab4ff" strokeWidth="2.4" />
      </svg>
    </div>
  );
}

function Spectrum({ title, freqs, amps }: { title: string; freqs: number[]; amps: number[] }) {
  const maxAmp = Math.max(...amps, 1e-6);
  const maxFreq = Math.max(...freqs, 1);
  return (
    <div className="card plot-card">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="plot">
        {Array.from({ length: 6 }, (_, i) => {
          const x = (i / 5) * WIDTH;
          const y = (i / 5) * HEIGHT;
          return (
            <g key={i}>
              <line x1={x} y1={0} x2={x} y2={HEIGHT} stroke="rgba(255,255,255,0.08)" />
              <line x1={0} y1={y} x2={WIDTH} y2={y} stroke="rgba(255,255,255,0.08)" />
            </g>
          );
        })}
        {freqs.map((f, i) => {
          const x = (f / maxFreq) * (WIDTH - 60) + 30;
          const barH = (amps[i] / maxAmp) * (HEIGHT - 40);
          return (
            <g key={i}>
              <line x1={x} y1={HEIGHT - 20} x2={x} y2={HEIGHT - 20 - barH} stroke="#7cf2c9" strokeWidth="10" strokeLinecap="round" />
              <text x={x} y={HEIGHT - 4} fill="rgba(255,255,255,0.72)" fontSize="12" textAnchor="middle">{f.toFixed(1)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="slider-row">
      <div className="slider-head">
        <span>{label}</span>
        <strong>{value.toFixed(step < 1 ? 2 : 0)}{suffix}</strong>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("shm");

  const [A, setA] = useState(1);
  const [f, setF] = useState(2);
  const [phi, setPhi] = useState(0);
  const [damping, setDamping] = useState(0.05);

  const [beatF1, setBeatF1] = useState(440);
  const [beatF2, setBeatF2] = useState(445);

  const [lx, setLx] = useState(3);
  const [ly, setLy] = useState(2);
  const [lphi, setLphi] = useState(0.5);

  const [f0, setF0] = useState(5);
  const [drive, setDrive] = useState(5);
  const [gamma, setGamma] = useState(0.35);

  const shm = useMemo(() => {
    const t = linspace(0, 4, 800);
    const y = t.map((v) => A * Math.exp(-damping * v) * Math.sin(2 * Math.PI * f * v + phi));
    const vy = t.map((v) => A * 2 * Math.PI * f * Math.cos(2 * Math.PI * f * v + phi));
    const e = y.map((v, i) => 0.5 * (v * v + 0.12 * vy[i] * vy[i]));
    const yPx = normalize(y, 20, HEIGHT - 20);
    const ePx = normalize(e, 20, HEIGHT - 20);
    return {
      p1: t.map((v, i) => ({ x: (v / 4) * WIDTH, y: yPx[i] })),
      p2: t.map((v, i) => ({ x: (v / 4) * WIDTH, y: ePx[i] })),
      msg: `当前为阻尼简谐振动。频率 ${f.toFixed(2)} Hz，阻尼系数 ${damping.toFixed(2)}。`,
    };
  }, [A, damping, f, phi]);

  const beats = useMemo(() => {
    const t = linspace(0, 0.2, 1200);
    const y1 = t.map((v) => Math.sin(2 * Math.PI * beatF1 * v));
    const y2 = t.map((v) => Math.sin(2 * Math.PI * beatF2 * v));
    const sum = t.map((_, i) => y1[i] + y2[i]);
    const env = t.map((v) => 2 * Math.cos(Math.PI * (beatF2 - beatF1) * v));
    const sumPx = normalize(sum, 20, HEIGHT - 20);
    const envPx = normalize(env, 20, HEIGHT - 20);
    return {
      wave: t.map((v, i) => ({ x: ((v - t[0]) / (t[t.length - 1] - t[0])) * WIDTH, y: sumPx[i] })),
      env: t.map((v, i) => ({ x: ((v - t[0]) / (t[t.length - 1] - t[0])) * WIDTH, y: envPx[i] })),
      beatFreq: Math.abs(beatF2 - beatF1),
      freqs: [beatF1, beatF2].sort((a, b) => a - b),
      amps: [1, 1],
    };
  }, [beatF1, beatF2]);

  const lissajous = useMemo(() => {
    const t = linspace(0, Math.PI * 16, 2000);
    const x = t.map((v) => Math.sin(lx * v));
    const y = t.map((v) => Math.sin(ly * v + lphi));
    const xPx = normalize(x, 20, 340);
    const yPx = normalize(y, 20, 340);
    return xPx.map((v, i) => ({ x: v, y: yPx[i] }));
  }, [lx, ly, lphi]);

  const resonance = useMemo(() => {
    const fs = linspace(1, 10, 180);
    const amp = fs.map((fd) => 1 / Math.sqrt((f0 * f0 - fd * fd) ** 2 + (2 * gamma * fd) ** 2));
    const ampPx = normalize(amp, 20, HEIGHT - 20);
    const curve = fs.map((fd, i) => ({ x: ((fd - 1) / 9) * WIDTH, y: ampPx[i] }));
    const currentAmp = 1 / Math.sqrt((f0 * f0 - drive * drive) ** 2 + (2 * gamma * drive) ** 2);
    return {
      curve,
      msg: Math.abs(drive - f0) < 0.4
        ? `驱动频率 ${drive.toFixed(2)} Hz 已接近固有频率 ${f0.toFixed(2)} Hz，系统接近共振。`
        : `驱动频率 ${drive.toFixed(2)} Hz 与固有频率 ${f0.toFixed(2)} Hz 有偏离。`,
      markerX: ((drive - 1) / 9) * WIDTH,
      markerY: normalize([currentAmp], 20, HEIGHT - 20)[0],
    };
  }, [drive, f0, gamma]);

  return (
    <div className="page">
      <style>{`
        *{box-sizing:border-box} body{margin:0;font-family:Inter,Arial,sans-serif;background:#eef4ff;color:#0f172a}
        .page{min-height:100vh;padding:24px}
        .container{max-width:1400px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
        .hero{background:linear-gradient(135deg,#020617,#0f172a 55%,#0b2447);color:white;border-radius:28px;padding:28px;display:grid;grid-template-columns:1.4fr .9fr;gap:20px;box-shadow:0 22px 60px rgba(15,23,42,.25)}
        .hero h1{margin:10px 0 12px;font-size:44px;line-height:1.1}
        .hero p{color:#cbd5e1;line-height:1.8}
        .tag-row,.mini-grid,.tab-row,.main-grid,.plot-grid,.footer-grid{display:flex;gap:12px;flex-wrap:wrap}
        .tag{padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.1);font-size:13px}
        .mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .mini{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:18px;min-height:110px;display:flex;flex-direction:column;justify-content:space-between}
        .mini strong{font-size:16px}.mini span{color:#cbd5e1;line-height:1.6}
        .tab-row button{border:none;background:white;color:#0f172a;padding:12px 18px;border-radius:18px;cursor:pointer;font-size:15px;font-weight:700;min-width:118px;box-shadow:0 10px 28px rgba(15,23,42,.08);transition:all .2s ease}
        .tab-row button:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(15,23,42,.12)}
        .tab-row button.active{background:#0f172a;color:white}
        .main-grid{display:grid;grid-template-columns:320px 1fr;gap:20px}
        .plot-grid{display:grid;gap:20px}
        .card{background:white;color:#0f172a;border-radius:24px;padding:20px;box-shadow:0 10px 30px rgba(15,23,42,.08)}
        .card h2,.card h3{margin:0 0 14px;color:#0b1733}
        .info{background:#0f172a;color:#e2e8f0;border-radius:18px;padding:14px;line-height:1.7;font-size:14px}
        .slider-row{background:#f8fafc;padding:14px;border-radius:18px;margin-bottom:12px}
        .slider-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:14px}
        .slider-row input{width:100%}
        .plot-card h3{font-size:18px}
        .plot{width:100%;border-radius:18px;background:#0b1020}
        .footer-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .footer-grid .card p{margin:0;color:#475569;line-height:1.7}
        .main-grid .card h2{text-align:center;font-size:34px;margin-bottom:18px}
        .plot-card h3{text-align:center}
        .footer-grid .card h3{text-align:center;font-size:30px}
        .footer-grid .card{padding:28px 26px}
        @media (max-width: 980px){.hero,.main-grid,.footer-grid{grid-template-columns:1fr}.hero h1{font-size:34px}}
      `}</style>
      <div className="container">
        <div className="hero">
          <div>
            <div className="tag-row">
              <span className="tag">Physics Interactive Lab</span>
              <span className="tag">Web Simulation</span>
              <span className="tag">Wave & Oscillation</span>
            </div>
            <h1>振动与波动现象交互式演示平台</h1>
            <p>
              基于网页可视化的经典物理现象模拟与分析系统。围绕简谐振动、拍现象、李萨如图与共振四类典型问题，提供参数可调、图像实时更新的交互式演示，用于辅助理解频率、相位差、阻尼、叠加与共振等核心规律。
            </p>
            <div className="tag-row">
              <span className="tag">参数调节</span>
              <span className="tag">动态可视化</span>
              <span className="tag">物理规律分析</span>
            </div>
          </div>
          <div className="mini-grid">
            <div className="mini"><strong>简谐振动</strong><span>研究位移、能量与阻尼随时间的变化规律。</span></div>
            <div className="mini"><strong>拍现象</strong><span>展示相近频率叠加后形成的周期性强弱变化。</span></div>
            <div className="mini"><strong>李萨如图</strong><span>观察频率比和相位差对轨迹图形的影响。</span></div>
            <div className="mini"><strong>共振分析</strong><span>分析驱动频率接近固有频率时的响应峰值。</span></div>
          </div>
        </div>

        <div className="tab-row">
          <button className={tab === "shm" ? "active" : ""} onClick={() => setTab("shm")}>简谐振动</button>
          <button className={tab === "beats" ? "active" : ""} onClick={() => setTab("beats")}>拍现象</button>
          <button className={tab === "lissajous" ? "active" : ""} onClick={() => setTab("lissajous")}>李萨如图</button>
          <button className={tab === "resonance" ? "active" : ""} onClick={() => setTab("resonance")}>共振</button>
        </div>

        {tab === "shm" && (
          <div className="main-grid">
            <div className="card">
              <h2>参数面板</h2>
              <SliderRow label="振幅 A" value={A} min={0.5} max={3} step={0.1} onChange={setA} />
              <SliderRow label="频率 f" value={f} min={0.5} max={6} step={0.1} onChange={setF} suffix=" Hz" />
              <SliderRow label="相位 φ" value={phi} min={0} max={6.28} step={0.05} onChange={setPhi} suffix=" rad" />
              <SliderRow label="阻尼系数" value={damping} min={0} max={0.8} step={0.01} onChange={setDamping} />
              <div className="info">{shm.msg}</div>
            </div>
            <div className="plot-grid">
              <Plot title="位移-时间图" points={shm.p1} />
              <Plot title="机械能变化图" points={shm.p2} />
            </div>
          </div>
        )}

        {tab === "beats" && (
          <div className="main-grid">
            <div className="card">
              <h2>参数面板</h2>
              <SliderRow label="频率 f1" value={beatF1} min={420} max={460} step={1} onChange={setBeatF1} suffix=" Hz" />
              <SliderRow label="频率 f2" value={beatF2} min={421} max={470} step={1} onChange={setBeatF2} suffix=" Hz" />
              <div className="info">拍频 = |f₂ - f₁| = {beats.beatFreq.toFixed(2)} Hz。两个频率越接近，拍现象越明显。</div>
            </div>
            <div className="plot-grid">
              <Plot title="叠加波形与包络" points={beats.wave} secondary={beats.env} />
              <Spectrum title="频谱主峰图" freqs={beats.freqs} amps={beats.amps} />
            </div>
          </div>
        )}

        {tab === "lissajous" && (
          <div className="main-grid">
            <div className="card">
              <h2>参数面板</h2>
              <SliderRow label="x 方向频率" value={lx} min={1} max={6} step={1} onChange={setLx} />
              <SliderRow label="y 方向频率" value={ly} min={1} max={6} step={1} onChange={setLy} />
              <SliderRow label="相位差" value={lphi} min={0} max={6.28} step={0.05} onChange={setLphi} suffix=" rad" />
              <div className="info">当前频率比为 {lx}:{ly}。李萨如图的形状由频率比和相位差共同决定。</div>
            </div>
            <div className="plot-grid">
              <Plot title="李萨如图" points={lissajous} square />
            </div>
          </div>
        )}

        {tab === "resonance" && (
          <div className="main-grid">
            <div className="card">
              <h2>参数面板</h2>
              <SliderRow label="固有频率 f0" value={f0} min={2} max={8} step={0.1} onChange={setF0} suffix=" Hz" />
              <SliderRow label="驱动频率 fd" value={drive} min={1} max={10} step={0.1} onChange={setDrive} suffix=" Hz" />
              <SliderRow label="阻尼 γ" value={gamma} min={0.05} max={1.2} step={0.01} onChange={setGamma} />
              <div className="info">{resonance.msg}</div>
            </div>
            <div className="plot-grid">
              <div className="card plot-card">
                <h3>共振曲线</h3>
                <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="plot">
                  {Array.from({ length: 6 }, (_, i) => {
                    const x = (i / 5) * WIDTH;
                    const y = (i / 5) * HEIGHT;
                    return (
                      <g key={i}>
                        <line x1={x} y1={0} x2={x} y2={HEIGHT} stroke="rgba(255,255,255,0.08)" />
                        <line x1={0} y1={y} x2={WIDTH} y2={y} stroke="rgba(255,255,255,0.08)" />
                      </g>
                    );
                  })}
                  <path d={toPath(resonance.curve)} fill="none" stroke="#8ab4ff" strokeWidth="2.4" />
                  <circle cx={resonance.markerX} cy={resonance.markerY} r={6} fill="#7cf2c9" />
                </svg>
              </div>
            </div>
          </div>
        )}

        <div className="footer-grid">
          <div className="card">
            <h3>项目简介</h3>
            <p>本平台以经典振动与波动问题为对象，通过可视化方式展示参数变化对系统行为的影响，帮助理解抽象公式背后的物理图像。</p>
          </div>
          <div className="card">
            <h3>核心模块</h3>
            <p>包含简谐振动、拍现象、李萨如图和共振分析四个模块，覆盖振动与波动学习中最典型的基础现象。</p>
          </div>
          <div className="card">
            <h3>物理意义</h3>
            <p>可直观观察频率、相位差、阻尼与驱动条件变化后系统响应的不同，从图像层面理解叠加、拍频和共振等规律。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
