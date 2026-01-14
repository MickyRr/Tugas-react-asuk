import React, { useState, useRef, useEffect } from "react";

export default function MatrixCalculator() {
  const [expr, setExpr] = useState([]);
  const [matrixResult, setMatrixResult] = useState(null);
  const [scalarResult, setScalarResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [loadingScalar, setLoadingScalar] = useState(false);
  const [activeIdx, setActiveIdx] = useState({ r: -1, c: -1 });
  const [isLandscape, setIsLandscape] = useState(false);
  const [hoverGrid, setHoverGrid] = useState({ r: 0, c: 0 });
  const [showPicker, setShowPicker] = useState(false);
  const [steps, setSteps] = useState([]);
  const [showSteps, setShowSteps] = useState(false);

  const intervalRef = useRef(null);

  // --- KEYBOARD & ORIENTATION HANDLERS ---
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key >= "0" && e.key <= "9") handleBtn(e.key);
      if (e.key === "+") handleBtn("+");
      if (e.key === "-") handleBtn("−");
      if (e.key === "*") handleBtn("×");
      if (e.key === "/") handleBtn("÷");
      if (e.key === ".") handleBtn(".");
      if (e.key === "Enter") calculate();
      if (e.key === "Backspace") handleBtn("del");
      if (e.key === "Escape") clear();
      if (e.key.toLowerCase() === "m") setShowPicker(true);
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [expr, animating, loadingScalar]);

  useEffect(() => {
    const checkOri = () => setIsLandscape(window.innerWidth > 900);
    checkOri();
    window.addEventListener("resize", checkOri);
    return () => window.removeEventListener("resize", checkOri);
  }, []);

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setExpr([]); setMatrixResult(null); setScalarResult(null);
    setAnimating(false); setLoadingScalar(false); setActiveIdx({ r: -1, c: -1 });
    setSteps([]); setShowSteps(false);
  };

  const handleKeyDownInMatrix = (e, matrixIdx, r, c, rows, cols) => {
    let nextR = r, nextC = c;
    if (e.key === "ArrowRight") nextC = (c + 1) % cols;
    else if (e.key === "ArrowLeft") nextC = (c - 1 + cols) % cols;
    else if (e.key === "ArrowDown") nextR = (r + 1) % rows;
    else if (e.key === "ArrowUp") nextR = (r - 1 + rows) % rows;
    else if (e.key === "Enter") {
      e.preventDefault();
      nextC = (c + 1);
      if (nextC >= cols) { nextC = 0; nextR = (r + 1) % rows; }
    } else return;
    const nextEl = document.querySelector(`[data-pos="${matrixIdx}-${nextR}-${nextC}"]`);
    if (nextEl) nextEl.focus();
  };

  const handleBtn = (v) => {
    if (animating || loadingScalar) return;
    if (scalarResult !== null || matrixResult !== null) { 
       setMatrixResult(null); setScalarResult(null); setSteps([]); 
    }
    if (v === "del") { setExpr(prev => prev.slice(0, -1)); return; }
    if (v === "TRANS") {
      setExpr(prev => {
        const lastIdx = [...prev].reverse().findIndex(item => item.type === "matrix");
        if (lastIdx === -1) return prev;
        const actualIdx = prev.length - 1 - lastIdx;
        const targetMatrix = prev[actualIdx].val;
        const T = targetMatrix[0].map((_, c) => targetMatrix.map(row => row[c]));
        const newExpr = [...prev];
        newExpr[actualIdx] = { ...newExpr[actualIdx], val: T };
        return newExpr;
      });
      return;
    }
    const val = v === "x²" ? "²" : v === "INVERS" ? "⁻¹" : v;
    setExpr(prev => {
      const last = prev[prev.length - 1];
      if (last && last.type === "symbol" && !isNaN(last.val) && !isNaN(v)) {
        return [...prev.slice(0, -1), { ...last, val: last.val + v }];
      }
      return [...prev, { type: "symbol", val }];
    });
  };

  // --- LOGIKA DETERMINAN DETAIL ---
  const getDet = (m, logArr = null, depth = 0) => {
    const size = m.length;
    const indent = "   ".repeat(depth);
    if (size === 1) return parseFloat(m[0][0] || 0);
    if (size === 2) {
      const d = (m[0][0] * m[1][1]) - (m[0][1] * m[1][0]);
      if(logArr) logArr.push(`${indent}└─ Minor 2x2: (${m[0][0]} × ${m[1][1]}) − (${m[0][1]} × ${m[1][0]}) = ${d}`);
      return d;
    }
    return m[0].reduce((acc, val, i) => {
      const sub = m.slice(1).map(row => row.filter((_, j) => i !== j));
      const subDet = getDet(sub, logArr, depth + 1);
      const sign = i % 2 ? -1 : 1;
      const term = sign * val * subDet;
      if(logArr) {
        logArr.push(`${indent}• Baris 1 Kolom ${i+1}:`);
        logArr.push(`${indent}  Tanda: $(-1)^{1+${i+1}} = ${sign > 0 ? '+' : '-'}`);
        logArr.push(`${indent}  Elemen: ${val}`);
        logArr.push(`${indent}  Sub-Determinan: ${subDet}`);
        logArr.push(`${indent}  Hasil Bagian: ${sign} × ${val} × ${subDet} = ${term}`);
      }
      return acc + term;
    }, 0);
  };

  // --- CORE CALCULATOR ---
  const calculate = async () => {
    if (animating || loadingScalar || expr.length === 0) return;
    let L = [];
    try {
      const matrices = expr.filter(e => e.type === "matrix");
      const symbols = expr.filter(e => e.type === "symbol");
      const rawExpr = expr.map(e => e.val).join("");

      // 1. SKALAR
      if (matrices.length === 1 && symbols.some(s => !isNaN(s.val)) && rawExpr.includes("×")) {
        const scalarVal = parseFloat(symbols.find(s => !isNaN(s.val)).val);
        L.push("--- OPERASI PERKALIAN SKALAR ---", `Mengalikan nilai skalar k = ${scalarVal} ke setiap sel matriks:`);
        const resM = matrices[0].val.map((row, r) => row.map((v, c) => {
            const res = parseFloat((scalarVal * (v || 0)).toFixed(2));
            L.push(`Baris ${r+1}, Kolom ${c+1}: ${scalarVal} × ${v||0} = ${res}`);
            return res;
        }));
        setSteps(L); return runAnim(resM);
      }

      // 2. ARITMATIKA BIASA
      if (matrices.length === 0) {
        setLoadingScalar(true);
        setTimeout(() => {
          let evalStr = rawExpr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/(\d+)²/g, "Math.pow($1,2)");
          try {
            const res = eval(evalStr);
            L.push("--- OPERASI MATEMATIKA ---", `Persamaan: ${rawExpr}`,  `Hasil Akhir: ${res}`);
            setSteps(L); setScalarResult(res);
          } catch { setScalarResult("ERR"); }
          setLoadingScalar(false);
        }, 800);
        return;
      }

      // 3. DETERMINAN
      if (rawExpr.toLowerCase().includes("det")) {
        L.push("--- PERHITUNGAN DETERMINAN (METODE LAPLACE) ---", "Mengekspansi baris pertama matriks:");
        const res = getDet(matrices[0].val, L);
        L.push("------------------------------------------------", `TOTAL DETERMINAN = ${res}`);
        setSteps(L); return setScalarResult(res);
      }

      // 4. INVERS
      if (rawExpr.includes("⁻¹")) {
        L.push("--- PROSES INVERS MATRIKS ---", "Langkah 1: Menghitung Determinan Matriks...");
        const d = getDet(matrices[0].val, L);
        if (d === 0) {
            L.push("HASIL: Determinan = 0. Invers tidak dapat dihitung (Matriks Singular).");
            throw new Error("Matriks Singular!");
        }
        L.push(`Langkah 2: Menghitung Matriks Kofaktor & Adjoin dibagi ${d}...`);
        const resM = matrices[0].val.map((row, r) => row.map((_, c) => {
          const sub = matrices[0].val.filter((_, i) => i !== r).map(row => row.filter((_, j) => j !== c));
          const subDet = getDet(sub);
          const sign = (r + c) % 2 ? -1 : 1;
          const val = parseFloat(((sign * subDet) / d).toFixed(2));
          L.push(`Kofaktor [${r+1},${c+1}]: (${sign > 0 ? '+':'-'}) Det_Minor(${subDet}) / ${d} = ${val}`);
          return val;
        }));
        setSteps(L); return runAnim(resM);
      }

      // 5. OPERASI DUA MATRIKS
      if (matrices.length === 2) {
        const op = expr.find(e => ["+", "−", "×"].includes(e.val))?.val;
        const [A, B] = [matrices[0].val, matrices[1].val];
        if (op === "×") {
          L.push("--- PERKALIAN MATRIKS (BARIS × KOLOM) ---", "Rumus: Perkalian elemen baris A dengan kolom B.");
          if (A[0].length !== B.length) throw new Error("Kolom A ≠ Baris B!");
          const resM = Array.from({length: A.length}, () => Array(B[0].length).fill(0));
          for(let r=0; r<A.length; r++) for(let c=0; c<B[0].length; c++) {
              let sum = 0, detail = [];
              for(let k=0; k<A[0].length; k++) {
                let p = (A[r][k]||0) * (B[k][c]||0);
                sum += p;
                detail.push(`(${A[r][k]}×${B[k][c]})`);
              }
              resM[r][c] = parseFloat(sum.toFixed(2));
              L.push(`Hasil [${r+1},${c+1}]: ${detail.join(" + ")} = ${resM[r][c]}`);
          }
          setSteps(L); return runAnim(resM);
        } else {
          L.push(`--- OPERASI ${op === "+" ? "PENJUMLAHAN" : "PENGURANGAN"} ---`, "Menghitung elemen pada posisi indeks yang sama:");
          const resM = A.map((row, r) => row.map((v, c) => {
            const res = op === "+" ? parseFloat(v||0) + parseFloat(B[r][c]||0) : parseFloat(v||0) - parseFloat(B[r][c]||0);
            L.push(`Indeks [${r+1},${c+1}]: ${v||0} ${op} ${B[r][c]||0} = ${res}`);
            return res;
          }));
          setSteps(L); return runAnim(resM);
        }
      }
    } catch (e) { setScalarResult(e.message); setAnimating(false); }
  };

  const runAnim = (resMatrix) => {
    setAnimating(true);
    const display = resMatrix.map(row => row.map(() => ""));
    let r = 0, c = 0;
    intervalRef.current = setInterval(() => {
      if (r < resMatrix.length) {
        display[r][c] = resMatrix[r][c];
        setMatrixResult([...display.map(row => [...row])]);
        setActiveIdx({ r, c });
        c++; if (c >= resMatrix[0].length) { c = 0; r++; }
      } else { 
        clearInterval(intervalRef.current); 
        setAnimating(false); 
        setActiveIdx({ r: -1, c: -1 }); // Reset animasi kotak agar tidak tertinggal
      }
    }, 120);
  };

  return (
    <div style={st.container}>
      <style>{`
        .btn-3d { transition: 0.1s; border: none; cursor: pointer; }
        .btn-3d:active { transform: translateY(3px) !important; box-shadow: 0 1px 0 rgba(0,0,0,0.5) !important; }
        .btn-log { 
          background: none; border: 1px solid #333; color: #00f2fe; padding: 10px 24px; 
          border-radius: 12px; font-size: 11px; cursor: pointer; font-weight: 800;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-log:hover { 
          background: rgba(0,242,254,0.1); border-color: #00f2fe; 
          box-shadow: 0 0 20px rgba(0,242,254,0.3); transform: scale(1.05);
        }
        .btn-understand {
          width: 100%; padding: 14px; background: #00ff88; color: #000; border-radius: 18px; 
          border: none; margin-top: 20px; font-weight: 900; cursor: pointer; transition: 0.3s ease;
        }
        .btn-understand:hover { 
          background: #00f2fe; box-shadow: 0 0 25px rgba(0,242,254,0.6); transform: translateY(-3px); 
        }
        .node-neon { width: 38px; height: 38px; margin: 5px; border-radius: 10px; transition: 0.3s; cursor: pointer; background: rgba(255,255,255,0.03); }
        .node-neon.active { box-shadow: 0 0 15px #00f2fe; background: linear-gradient(135deg, #7b61ff, #00f2fe); }
        .laser-line { position: absolute; width: 100%; height: 3px; background: #00f2fe; box-shadow: 0 0 12px #00f2fe; animation: scan-move 2s linear infinite; pointer-events: none; }
        @keyframes scan-move { 0% { top: 0% } 100% { top: 100% } }
        .spinner { width: 35px; height: 35px; border: 4px solid rgba(0,242,254,0.1); border-top: 4px solid #00f2fe; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      <div style={st.card}>
        <div style={st.header}>MATRIX88 <span style={{color:"#00f2fe"}}>SPESIAL MADE FROM GUNDAR</span></div>
        <div style={{ display: "flex", flexDirection: isLandscape ? "row" : "column", gap: "20px" }}>
          
          <div style={st.displayArea}>
            <div style={st.expressionArea}>
              {expr.map((item, i) => (
                <div key={i} style={{display:'flex', alignItems:'center', gap:8}}>
                  {item.type === "matrix" ? <MatrixUI 
                      matrixIdx={i} data={item.val} 
                      onEdit={(r,c,v) => { const next = [...expr]; next[i].val[r][c] = v; setExpr(next); }} 
                      onKeyDown={handleKeyDownInMatrix}
                    /> : <span style={st.symbol}>{item.val}</span>}
                </div>
              ))}
            </div>
            
            {(matrixResult || scalarResult !== null || animating || loadingScalar) && (
              <div style={st.resBox}>
                <div style={st.centeredOutput}>
                    {loadingScalar && <div className="spinner" />}
                    {matrixResult && !loadingScalar && (
                      <div style={{position:'relative'}}>
                        {animating && <div className="laser-line" />}
                        <MatrixUI data={matrixResult} readOnly active={activeIdx} isResult />
                      </div>
                    )}
                    {scalarResult !== null && !animating && !loadingScalar && <div style={st.scalarRes}>{scalarResult}</div>}
                </div>
                {!animating && !loadingScalar && steps.length > 0 && <button className="btn-log" onClick={() => setShowSteps(true)}>TAMPILKAN PROSES </button>}
              </div>
            )}
          </div>

          <div style={st.grid}>
            <button className="btn-3d" style={st.btnFunc} onClick={() => handleBtn("det")}>DET</button>
            <button className="btn-3d" style={st.btnFunc} onClick={() => handleBtn("INVERS")}>INVERS</button>
            <button className="btn-3d" style={st.btnFunc} onClick={() => handleBtn("TRANS")}>TRANS</button>
            <button className="btn-3d" style={st.btnDel} onClick={() => handleBtn("del")}>✕</button>
            {["7","8","9","÷","4","5","6","×","1","2","3","−","0","."].map(b => (
              <button key={b} className="btn-3d" style={st.btnNum} onClick={() => handleBtn(b)}>{b}</button>
            ))}
            <button className="btn-3d" style={st.btnAC} onClick={clear}>C</button>
            <button className="btn-3d" style={st.btnNum} onClick={() => handleBtn("+")}>+</button>
            <button className="btn-3d" style={st.btnPlus} onClick={() => setShowPicker(true)}>MATRIKS</button>
            <button className="btn-3d" style={st.btnEqual} onClick={calculate}>=</button>
          </div>
        </div>
      </div>

      {showPicker && <div style={st.modal} onClick={() => setShowPicker(false)}>
        <div style={st.pBox} onClick={e => e.stopPropagation()}>
            <div style={{color:'#00f2fe', fontSize:14, marginBottom:10, fontWeight: 800}}>PILIH ORDO MATRIKS</div>
            <div style={{fontSize: 32, fontWeight: 900, color: '#fff'}}>{hoverGrid.r} × {hoverGrid.c}</div>
            <div style={{marginTop: 20}}>
              {[1,2,3,4,5].map(r => ( <div key={r} style={{display:"flex", justifyContent: "center"}}>
                {[1,2,3,4,5].map(c => {
                  const isS = r <= hoverGrid.r && c <= hoverGrid.c;
                  return <div key={c} className={`node-neon ${isS ? 'active' : ''}`} onMouseEnter={() => setHoverGrid({r,c})} 
                    onClick={() => { setExpr([...expr, {type:"matrix", val: Array.from({length:r},()=>Array(c).fill(""))}]); setShowPicker(false); }} />;
                })}
              </div> ))}
            </div>
        </div>
      </div>}

      {showSteps && <div style={st.modal} onClick={() => setShowSteps(false)}>
        <div style={st.stepBox} onClick={e => e.stopPropagation()}>
          <div style={st.stepHeader}>LANGKAH PROSES DALAM PERHITUNGAN</div>
          <div style={st.stepContent}>{steps.map((l, i) => <div key={i} style={st.stepLine}>{l}</div>)}</div>
          <button className="btn-understand" onClick={() => setShowSteps(false)}>SAYA MENGERTI</button>
        </div>
      </div>}
    </div>
  );
}

const MatrixUI = ({ matrixIdx, data, onEdit, onKeyDown, readOnly, active, isResult }) => (
  <div style={{display:'flex', alignItems:'stretch', margin: '5px'}}>
    <div style={{...st.bracket, borderRight: "none", borderColor: isResult ? "#00f2fe" : "#7b61ff"}} />
    <div style={{padding: '4px'}}>
      {data.map((row, ri) => ( <div key={ri} style={{display:"flex"}}>
        {row.map((val, ci) => (
          <div key={ci} style={{ ...st.cell, background: active?.r === ri && active?.c === ci ? "rgba(0,242,254,0.35)" : "rgba(255,255,255,0.04)", border: active?.r === ri && active?.c === ci ? "1px solid #00f2fe" : "1px solid rgba(255,255,255,0.08)" }}>
            <input type="text" data-pos={`${matrixIdx}-${ri}-${ci}`} value={val} disabled={readOnly} onKeyDown={(e) => onKeyDown?.(e, matrixIdx, ri, ci, data.length, row.length)} onChange={e => onEdit?.(ri, ci, e.target.value)} style={{...st.mInput, color: isResult ? "#00f2fe" : "#fff", fontSize: data.length > 3 ? 14 : 18}} />
          </div>
        ))}
      </div> ))}
    </div>
    <div style={{...st.bracket, borderLeft: "none", borderColor: isResult ? "#00f2fe" : "#7b61ff"}} />
  </div>
);

const st = {
  container: { height: "100vh", background: "#050507", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "sans-serif", overflow: "hidden" },
  card: { background: "#0d0d12", padding: "25px", borderRadius: "35px", width: "95%", maxWidth: "900px" },
  header: { fontSize: 10, letterSpacing: 3, marginBottom: 15, textAlign: "center", color: '#222', fontWeight: 900 },
  displayArea: { minHeight: "350px", background: "#000", borderRadius: "25px", padding: "20px", display: "flex", flexDirection: "column", flex: 1.4 },
  expressionArea: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  symbol: { fontSize: 32, color: "#7b61ff", fontWeight: 800, margin: "0 8px" },
  resBox: { borderTop: "1px solid #111", padding: "15px 0", textAlign: "center" },
  centeredOutput: { minHeight: "100px", display: "flex", alignItems: "center", justifyContent: "center" },
  scalarRes: { fontSize: 45, color: "#00f2fe", fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flex: 1 },
  btnNum: { padding: "18px", background: "#1a1a24", borderRadius: "15px", color: "#fff", fontSize: 22, boxShadow: "0 4px 0 #000" },
  btnFunc: { padding: "18px", background: "#1a1a2e", borderRadius: "15px", color: "#7b61ff", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 0 #000" },
  btnDel: { background: "linear-gradient(135deg, #ff4d4d, #b30000)", color: "#fff", borderRadius: "15px", fontSize: 18, boxShadow: "0 4px 0 #600", fontWeight: 900 },
  btnAC: { background: "linear-gradient(135deg, #ffd700, #b8860b)", color: "#000", borderRadius: "15px", fontSize: 16, boxShadow: "0 4px 0 #540", fontWeight: 900 },
  btnEqual: { gridColumn: "span 2", background: "linear-gradient(135deg, #00ff88, #008044)", color: "#000", borderRadius: "15px", fontWeight: 900, fontSize: 30, boxShadow: "0 4px 0 #042" },
  btnPlus: { gridColumn: "span 2", background: "#1a1a24", color: "#fff", borderRadius: "15px", fontSize: 11, boxShadow: "0 4px 0 #000" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
  pBox: { background: '#0d0d12', padding: '35px', borderRadius: '40px', textAlign: 'center' },
  stepBox: { background: "#0d0d12", padding: "30px", borderRadius: "30px", width: "90%", maxWidth: "600px" },
  stepHeader: { color: '#00f2fe', fontSize: 18, marginBottom: 15, fontWeight: 800, textAlign: "center" },
  stepContent: { maxHeight: '400px', overflowY: 'auto', textAlign: "left" },
  stepLine: { fontSize: 12, color: '#aaa', marginBottom: 10, borderLeft: "3px solid #7b61ff", paddingLeft: 12, fontFamily: 'monospace', lineHeight: "1.6" },
  bracket: { width: 10, borderTop: "4px solid", borderBottom: "4px solid", borderLeft: "4px solid", borderRight: "4px solid" },
  cell: { width: 42, height: 42, margin: 3, borderRadius: 8, display: "flex", justifyContent: "center", alignItems: "center" },
  mInput: { width: "100%", textAlign: "center", border: "none", background: "transparent", outline: "none", fontWeight: 700 }
};