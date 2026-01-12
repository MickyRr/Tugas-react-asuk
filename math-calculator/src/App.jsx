import { useState, useRef, useEffect } from "react";

export default function App() {
  const [expr, setExpr] = useState([]);
  const [matrixResult, setMatrixResult] = useState(null);
  const [scalarResult, setScalarResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [activeIdx, setActiveIdx] = useState({ r: -1, c: -1 });
  const [isLandscape, setIsLandscape] = useState(false);
  const [hoverGrid, setHoverGrid] = useState({ r: 0, c: 0 }); 
  const [showPicker, setShowPicker] = useState(false);
  const [isTypingInCell, setIsTypingInCell] = useState(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    const checkOri = () => setIsLandscape(window.innerWidth > 900);
    checkOri();
    window.addEventListener("resize", checkOri);
    const handleKeyDown = (e) => {
      if (showPicker || animating || isTypingInCell) return; 
      const key = e.key.toLowerCase();
      if (/[0-9.]/.test(key)) handleBtn(key);
      else if (key === "+") handleBtn("+");
      else if (key === "-") handleBtn("−");
      else if (key === "*") handleBtn("×");
      else if (key === "/") handleBtn("÷");
      else if (key === "t") handleTranspose(); 
      else if (key === "enter") { e.preventDefault(); calculate(); }
      else if (key === "backspace") setExpr(p => p.slice(0, -1));
      else if (key === "escape") clear();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", checkOri);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPicker, animating, expr, isTypingInCell]);

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setExpr([]); setMatrixResult(null); setScalarResult(null);
    setAnimating(false); setActiveIdx({ r: -1, c: -1 });
  };

  const handleBtn = (v) => {
    if (animating) return;
    if (scalarResult !== null || matrixResult !== null) { setMatrixResult(null); setScalarResult(null); }
    const val = v === "x²" ? "²" : v;
    setExpr(prev => {
      const last = prev[prev.length - 1];
      if (last && last.type === "symbol" && !isNaN(last.val) && !isNaN(v)) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, val: last.val + v };
        return updated;
      }
      return [...prev, { type: "symbol", val }];
    });
  };

  const addMatrix = (r, c) => {
    const newMat = Array.from({ length: r }, () => Array(c).fill(""));
    setExpr(prev => [...prev, { type: "matrix", val: newMat }]);
    setShowPicker(false);
    setHoverGrid({ r: 0, c: 0 });
  };

  const updateMatVal = (mIdx, r, c, v) => {
    setExpr(prev => {
      const next = [...prev];
      const updated = next[mIdx].val.map((row, ri) => row.map((col, ci) => (ri === r && ci === c ? v : col)));
      next[mIdx] = { ...next[mIdx], val: updated };
      return next;
    });
  };

  const handleTranspose = () => {
    if (animating || expr.length === 0) return;
    setExpr(prev => {
      const lastIdx = prev.length - 1;
      const lastItem = prev[lastIdx];
      if (lastItem && lastItem.type === "matrix") {
        const original = lastItem.val;
        const transposed = Array.from({ length: original[0].length }, (_, c) => Array.from({ length: original.length }, (_, r) => original[r][c]));
        const updated = [...prev];
        updated[lastIdx] = { ...lastItem, val: transposed };
        return updated;
      }
      return prev;
    });
  };

  const calculate = () => {
    if (animating || expr.length === 0) return;
    setMatrixResult(null); setScalarResult(null);
    const matrices = expr.filter(e => e.type === "matrix");
    const symbols = expr.filter(e => e.type === "symbol");
    const rawStr = symbols.map(s => s.val).join("");
    try {
      if (matrices.length === 0) {
        let cleanStr = rawStr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
        let res = cleanStr.includes("√") ? Math.sqrt(parseFloat(cleanStr.replace("√", ""))) : cleanStr.includes("²") ? Math.pow(parseFloat(cleanStr.replace("²", "")), 2) : new Function(`return ${cleanStr}`)();
        setScalarResult(res);
      } else if (matrices.length === 1) {
        const M = matrices[0].val;
        const scalarMatch = rawStr.match(/-?[\d.]+/);
        if (scalarMatch && (rawStr.includes("×") || rawStr.includes("*"))) { runAnim(M, (v) => (parseFloat(v)||0) * parseFloat(scalarMatch[0])); }
        else if (rawStr.includes("det")) {
          if(M.length !== M[0].length) { setScalarResult("Hanya Matriks Persegi"); return; }
          setScalarResult(M[0][0]*M[1][1] - (M[0][1]*M[1][0] || 0));
        } else { runAnim(M, (v) => rawStr.includes("²") ? Math.pow(parseFloat(v)||0, 2) : Math.sqrt(parseFloat(v)||0).toFixed(2)); }
      } else if (matrices.length === 2) {
        const A = matrices[0].val; const B = matrices[1].val;
        const op = symbols.find(s => ["+", "−", "×"].includes(s.val))?.val;
        if ((op === "+" || op === "−")) {
          if (A.length !== B.length || A[0].length !== B[0].length) { setScalarResult("Ordo Berbeda!"); return; }
          runAnim(A, (v, r, c) => op === "+" ? (parseFloat(v)||0) + (parseFloat(B[r][c])||0) : (parseFloat(v)||0) - (parseFloat(B[r][c])||0));
        } else if (op === "×") {
          if (A[0].length !== B.length) { setScalarResult("Kolom A ≠ Baris B"); return; }
          runMul(A, B);
        }
      }
    } catch (e) { setScalarResult("Error"); }
  };

  const runAnim = (M, calcFn) => {
    setAnimating(true);
    const res = M.map(row => row.map(() => ""));
    let r = 0, c = 0;
    intervalRef.current = setInterval(() => {
      res[r][c] = calcFn(M[r][c], r, c);
      setMatrixResult([...res.map(row => [...row])]);
      setActiveIdx({ r, c });
      c++; if (c >= M[0].length) { c = 0; r++; }
      if (r >= M.length) { clearInterval(intervalRef.current); setAnimating(false); setActiveIdx({r:-1, c:-1}); }
    }, 60);
  };

  const runMul = (A, B) => {
    setAnimating(true);
    const res = Array.from({ length: A.length }, () => Array(B[0].length).fill(""));
    let r = 0, c = 0;
    intervalRef.current = setInterval(() => {
      let sum = 0; for (let k = 0; k < A[0].length; k++) sum += (parseFloat(A[r][k])||0) * (parseFloat(B[k][c])||0);
      res[r][c] = sum;
      setMatrixResult([...res.map(row => [...row])]);
      setActiveIdx({ r, c });
      c++; if (c >= B[0].length) { c = 0; r++; }
      if (r >= A.length) { clearInterval(intervalRef.current); setAnimating(false); setActiveIdx({r:-1, c:-1}); }
    }, 100);
  };

  return (
    <div style={st.container}>
      <div style={st.bgEffect}></div>
      <div style={{...st.card, width: isLandscape ? "85%" : "95%", maxWidth: isLandscape ? "1000px" : "380px"}}>
        <div style={st.header}>MATRIX <span style={{color:"#00f2fe"}}>ANIMA GLASS V6</span></div>
        <div style={{ display: "flex", flexDirection: isLandscape ? "row" : "column", gap: "15px" }}>
          <div style={{...st.displayArea, flex: isLandscape ? 1.5 : "none"}}>
            <div style={st.expressionArea}>
              {expr.length === 0 && <span style={{opacity:0.1, fontSize:24}}>READY</span>}
              {expr.map((item, i) => item.type === "matrix" ? 
                <MatrixUI key={i} data={item.val} onEdit={(r,c,v) => updateMatVal(i,r,c,v)} setTyping={setIsTypingInCell} /> : 
                <span key={i} style={st.symbol}>{item.val}</span>
              )}
            </div>
            {(matrixResult || scalarResult !== null) && (
              <div style={st.resBox}>
                {matrixResult ? <MatrixUI data={matrixResult} readOnly active={activeIdx} isResult /> : <div style={st.scalarRes}>= {scalarResult}</div>}
              </div>
            )}
          </div>
          <div style={{...st.grid, flex: isLandscape ? 1 : "none"}}>
            {["det", "√", "x²", "del"].map(f => (<button key={f} style={st.btnFunc} onClick={f === "del" ? () => setExpr(p => p.slice(0,-1)) : () => handleBtn(f)}>{f}</button>))}
            {["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","AC","+"].map(b => (
              <button key={b} style={b === "AC" ? st.btnAC : st.btnNum} onClick={b === "AC" ? clear : () => handleBtn(b)}>{b}</button>
            ))}
            <button style={st.btnTranspose} onClick={handleTranspose}>T (Transpose)</button>
            <button style={st.btnPlus} onClick={() => setShowPicker(true)}>+ MATRIX</button>
            <button style={st.btnEqual} onClick={calculate}>{animating ? "..." : "="}</button>
          </div>
        </div>
      </div>
      
      {/* MODERN ANIMATED PICKER */}
      {showPicker && (
        <div style={st.modal} onClick={() => setShowPicker(false)}>
          <div style={st.pBox} onClick={e => e.stopPropagation()}>
            <div style={st.pHeader}>
              <div style={st.pLabel}>Pilihlah Ordo Matriks</div>
              <div style={st.pOrdoText}>{hoverGrid.r || "?"} <span style={{color:"#7b61ff"}}>×</span> {hoverGrid.c || "?"}</div>
            </div>
            <div style={st.visualGrid}>
              {[1,2,3,4,5].map(r => (
                <div key={r} style={{display:"flex"}}>
                  {[1,2,3,4,5].map(c => {
                    const active = r <= hoverGrid.r && c <= hoverGrid.c;
                    return (
                      <div key={c} 
                        onMouseEnter={() => setHoverGrid({r,c})} 
                        onClick={() => addMatrix(r,c)}
                        style={{
                          ...st.gridBox, 
                          background: active ? "linear-gradient(135deg, #00f2fe, #7b61ff)" : "rgba(255,255,255,0.05)",
                          boxShadow: active ? "0 0 15px rgba(0, 242, 254, 0.5)" : "none",
                          transform: active ? "scale(1.1)" : "scale(1)",
                          borderColor: active ? "#00f2fe" : "rgba(255,255,255,0.1)"
                        }} 
                      />
                    )
                  })}
                </div>
              ))}
            </div>
            <div style={st.pFooter}>Klik Untuk Konfirmasi Matriks</div>
          </div>
        </div>
      )}
    </div>
  );
}

const MatrixUI = ({ data, onEdit, readOnly, active, isResult, setTyping }) => (
  <div style={st.mBracketContainer}>
    <div style={{...st.bracket, borderRight:"none", borderRadius:"10px 0 0 10px", borderColor: isResult ? "#00f2fe" : "#7b61ff"}} />
    <div style={st.mInner}>
      {data.map((row, ri) => (
        <div key={ri} style={{display:"flex"}}>
          {row.map((val, ci) => {
            const focused = active?.r === ri && active?.c === ci;
            return (
              <div key={ci} style={{ 
                ...st.cellContainer, 
                background: focused ? "#00f2fe" : "rgba(255, 255, 255, 0.05)",
                border: focused ? "1px solid #00f2fe" : "1px solid rgba(255, 255, 255, 0.1)",
              }}>
                <input type="text" value={val} disabled={readOnly} 
                  onFocus={() => setTyping && setTyping(true)}
                  onBlur={() => setTyping && setTyping(false)}
                  onKeyDown={(e) => e.stopPropagation()} 
                  onChange={(e) => onEdit && onEdit(ri, ci, e.target.value)}
                  style={{...st.mInput, color: focused ? "#000" : (isResult ? "#00f2fe" : "#fff")}} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
    <div style={{...st.bracket, borderLeft:"none", borderRadius:"0 10px 10px 0", borderColor: isResult ? "#00f2fe" : "#7b61ff"}} />
  </div>
);

const st = {
  container: { height:"100vh", background:"#050507", display:"flex", justifyContent:"center", alignItems:"center", color:"#fff", fontFamily:"sans-serif", overflow:"hidden" },
  bgEffect: { position:"absolute", width:"100%", height:"100%", background:"radial-gradient(circle at 50% 50%, #15152a 0%, #050507 100%)" },
  card: { background:"rgba(25, 25, 30, 0.85)", backdropFilter:"blur(20px)", padding:"15px", borderRadius:"30px", border:"1px solid rgba(255,255,255,0.06)", zIndex:1 },
  header: { fontSize:8, letterSpacing:3, marginBottom:10, textAlign:"center", opacity:0.3 },
  displayArea: { minHeight:"140px", maxHeight:"350px", background:"#000", borderRadius:"20px", padding:"12px", border:"1px solid #111", display:"flex", flexDirection:"column", overflow:"auto" },
  expressionArea: { flex:1, display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"center", gap:5 },
  symbol: { fontSize:22, color:"#7b61ff", margin:"0 5px" },
  resBox: { marginTop:10, paddingTop:10, borderTop:"1px solid #111", display:"flex", justifyContent:"center" },
  scalarRes: { fontSize:30, fontWeight:800, color:"#00f2fe" },
  grid: { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 },
  btnNum: { padding:"12px", background:"#1a1a1f", border:"none", borderRadius:"12px", color:"#fff", fontSize:16 },
  btnFunc: { padding:"12px", background:"rgba(123, 97, 255, 0.1)", border:"none", borderRadius:"12px", color:"#7b61ff", fontSize:12, fontWeight:800 },
  btnAC: { background:"rgba(255, 77, 77, 0.1)", color:"#ff4d4d", border:"none", borderRadius:"12px" },
  btnTranspose: { gridColumn:"span 4", background:"rgba(0, 242, 254, 0.08)", color:"#00f2fe", border:"1px solid rgba(0,242,254,0.3)", borderRadius:"12px", padding:8, fontSize:11, fontWeight:800 },
  btnPlus: { gridColumn:"span 2", background:"transparent", color:"#fff", border:"1px dashed #333", borderRadius:"12px", fontSize:11 },
  btnEqual: { gridColumn:"span 2", background:"linear-gradient(135deg, #00f2fe, #7b61ff)", color:"#000", border:"none", borderRadius:"12px", fontSize:20, fontWeight:900 },
  mBracketContainer: { display:"flex", alignItems:"stretch", margin:"2px" },
  bracket: { width:8, borderTop:"2px solid", borderBottom:"2px solid", borderLeft:"2px solid", borderRight:"2px solid" },
  mInner: { padding:"2px 5px" },
  cellContainer: { width:36, height:34, margin:2, borderRadius:6, display:"flex", justifyContent:"center", alignItems:"center", transition:"all 0.2s ease" },
  mInput: { width:"100%", textAlign:"center", border:"none", background:"transparent", outline:"none", fontSize:15, fontWeight: "600" },
  
  // PICKER STYLES
  modal: { position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(15px)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:100 },
  pBox: { background:"rgba(20,20,25,0.9)", padding:30, borderRadius:40, border:"1px solid #333", textAlign:"center", boxShadow:"0 0 50px rgba(0,0,0,0.5)" },
  pHeader: { marginBottom:20 },
  pLabel: { fontSize:10, letterSpacing:2, opacity:0.5, marginBottom:5 },
  pOrdoText: { fontSize:40, fontWeight:900, color:"#fff", textShadow:"0 0 20px rgba(123, 97, 255, 0.5)" },
  visualGrid: { background:"rgba(0,0,0,0.3)", padding:15, borderRadius:25, display:"inline-block", border:"1px solid #222" },
  gridBox: { width:30, height:30, margin:5, borderRadius:8, cursor:"pointer", border:"1px solid transparent", transition:"all 0.15s cubic-bezier(0.4, 0, 0.2, 1)" },
  pFooter: { marginTop:20, fontSize:11, opacity:0.4, fontWeight:600 }
};