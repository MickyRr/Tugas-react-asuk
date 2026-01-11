import { useState } from "react";

/* ================= APP ================= */
export default function App() {
  const [expr, setExpr] = useState([]);
  const [result, setResult] = useState(null);
  const [steps, setSteps] = useState([]); 
  const [showMatrixPicker, setShowMatrixPicker] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [currentIdx, setCurrentIdx] = useState({ r: -1, c: -1 });

  /* ---------- INPUT HANDLERS ---------- */
  const handleBtnClick = (v) => {
    if (result !== null && !animating) {
       setSteps([]);
       setResult(null);
       setExpr([{ type: "symbol", value: v }]);
       return;
    }
    setExpr([...expr, { type: "symbol", value: v }]);
  };

  const backspace = () => {
    if (expr.length > 0) setExpr(expr.slice(0, -1));
  };

  const clear = () => {
    setExpr([]);
    setResult(null);
    setSteps([]);
    setAnimating(false);
    setCurrentIdx({ r: -1, c: -1 });
  };

  /* ---------- MATRIX LOGIC ---------- */
  const createMatrix = (n) => {
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    setExpr([...expr, { type: "matrix", value: matrix }]);
    setShowMatrixPicker(false);
  };

  const updateMatrix = (matrixIdx, rowIdx, colIdx, newValue) => {
    const newExpr = [...expr];
    if (newExpr[matrixIdx]) {
      newExpr[matrixIdx].value[rowIdx][colIdx] = newValue;
      setExpr(newExpr);
    }
  };

  /* ---------- ANIMATIONS (SAFE VERSION) ---------- */
  const startAdditionAnimation = (A, B) => {
    if (!A || !B || !A[0] || !B[0]) return;
    if (A.length !== B.length || A[0].length !== B[0].length) {
      setSteps(["Error: Ordo matriks harus sama!"]);
      return;
    }
    setAnimating(true);
    let r = 0, c = 0;
    const res = Array(A.length).fill(0).map(() => Array(A[0].length).fill(0));
    const interval = setInterval(() => {
      const sum = (A[r][c] || 0) + (B[r][c] || 0);
      res[r][c] = sum;
      setResult([...res.map(row => [...row])]);
      setCurrentIdx({ r, c });
      setSteps(prev => [...prev, `[${r+1},${c+1}]: ${A[r][c]} + ${B[r][c]} = ${sum}`]);
      c++;
      if (c >= A[0].length) { c = 0; r++; }
      if (r >= A.length) { clearInterval(interval); setAnimating(false); setCurrentIdx({ r: -1, c: -1 }); }
    }, 400);
  };

  const startScalarAnimation = (scalar, matrix) => {
    if (!matrix || !matrix[0]) return;
    setAnimating(true);
    let r = 0, c = 0;
    const res = Array(matrix.length).fill(0).map(() => Array(matrix[0].length).fill(0));
    const interval = setInterval(() => {
      const prod = scalar * (matrix[r][c] || 0);
      res[r][c] = prod;
      setResult([...res.map(row => [...row])]);
      setCurrentIdx({ r, c });
      setSteps(prev => [...prev, `[${r+1},${c+1}]: ${scalar} × ${matrix[r][c]} = ${prod}`]);
      c++;
      if (c >= matrix[0].length) { c = 0; r++; }
      if (r >= matrix.length) { clearInterval(interval); setAnimating(false); setCurrentIdx({ r: -1, c: -1 }); }
    }, 400);
  };

  const startMatrixAnimation = (A, B) => {
    if (!A || !B || !A[0] || !B[0]) return;
    if (A[0].length !== B.length) {
      setSteps(["Error: Kolom A harus sama dengan Baris B!"]);
      return;
    }
    setAnimating(true);
    let r = 0, c = 0;
    const res = Array(A.length).fill(0).map(() => Array(B[0].length).fill(0));
    const interval = setInterval(() => {
      let sum = 0;
      let formula = [];
      for (let k = 0; k < A[0].length; k++) {
        sum += (A[r][k] || 0) * (B[k][c] || 0);
        formula.push(`(${A[r][k]}×${B[k][c]})`);
      }
      res[r][c] = sum;
      setResult([...res.map(row => [...row])]);
      setCurrentIdx({ r, c });
      setSteps(prev => [...prev, `R[${r+1},${c+1}]: ${formula.join("+")} = ${sum}`]);
      c++;
      if (c >= B[0].length) { c = 0; r++; }
      if (r >= A.length) { clearInterval(interval); setAnimating(false); setCurrentIdx({ r: -1, c: -1 }); }
    }, 700);
  };

  /* ---------- CALCULATE ---------- */
  const calculate = () => {
    try {
      const matrices = expr.filter(e => e.type === "matrix");
      const symbols = expr.filter(e => e.type === "symbol");
      setSteps([]); 

      if (matrices.length >= 2 && expr.some(e => e.value === "+")) {
        startAdditionAnimation(matrices[0].value, matrices[1].value);
      } else if (matrices.length >= 2 && expr.some(e => e.value === "×")) {
        startMatrixAnimation(matrices[0].value, matrices[1].value);
      } else if (matrices.length === 1 && expr.some(e => e.value === "×")) {
        const scalar = parseFloat(symbols.find(s => !isNaN(s.value))?.value);
        if (!isNaN(scalar)) startScalarAnimation(scalar, matrices[0].value);
      } else if (matrices.length === 0) {
        const raw = expr.map(e => e.value).join("");
        if (raw) setResult(eval(raw.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\^/g, "**")));
      } else {
        setSteps(["Gunakan + atau × untuk matriks"]);
      }
    } catch (e) { setSteps(["Format Error"]); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.calc}>
        <div style={styles.display}>
          {expr.length === 0 && !result && <div style={{color:'#444'}}>0</div>}
          {expr.map((e, idx) => (
            e.type === "matrix" ? (
              <MatrixBox key={idx} data={e.value} highlightRow={currentIdx.r} highlightCol={currentIdx.c}
                onChange={(r,c,v) => updateMatrix(idx, r, c, v)} disabled={animating} />
            ) : <span key={idx} style={{ fontSize: 22, margin: '0 2px' }}>{e.value}</span>
          ))}
        </div>

        {steps.length > 0 && (
          <div style={styles.solutionBox}>
            <div style={styles.solutionHeader}>LANGKAH:</div>
            {steps.map((s, i) => <div key={i} style={styles.stepItem}>{s}</div>)}
          </div>
        )}

        {result !== null && (
          <div style={{paddingTop: 10, borderTop: '1px solid #333', marginBottom: 15}}>
            {Array.isArray(result) ? (
              <div style={{textAlign:'center'}}>
                <p style={{color:'#00e676', fontSize:10}}>HASIL AKHIR:</p>
                <MatrixBox data={result} readOnly />
              </div>
            ) : <div style={styles.finalRes}>= {result}</div>}
          </div>
        )}

        <div style={styles.mathBar}>
          {["√(", "π", "^", "(", ")"].map(b => (
             <button key={b} style={styles.mathBtn} onClick={() => handleBtnClick(b)}>{b}</button>
          ))}
          <button onClick={backspace} style={styles.delBtn}>DEL</button>
        </div>

        <div style={styles.grid}>
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "+"].map((b) => (
            <button key={b} style={styles.btn} onClick={() => handleBtnClick(b)}>{b}</button>
          ))}
          <button style={styles.equalBtn} onClick={calculate}>=</button>
          <button style={styles.matrixBtn} onClick={() => setShowMatrixPicker(true)}>+ MATRIX</button>
          <button style={styles.clearBtn} onClick={clear}>C</button>
        </div>
      </div>

      {showMatrixPicker && (
        <div style={styles.popup}>
          <h3 style={{marginBottom: 20}}>Pilih Ordo</h3>
          <div style={{ display: "flex", gap: 15 }}>
            {[2, 3, 4].map(n => <button key={n} style={styles.popupBtn} onClick={() => createMatrix(n)}>{n}x{n}</button>)}
          </div>
          <button onClick={() => setShowMatrixPicker(false)} style={styles.cancelBtn}>Batal</button>
        </div>
      )}
    </div>
  );
}

const MatrixBox = ({ data, onChange, readOnly, highlightRow, highlightCol, disabled }) => (
  <div style={styles.matrixContainer}>
    {data.map((row, i) => (
      <div key={i} style={{ display: "flex" }}>
        {row.map((v, j) => (
          <input key={j} type="number" value={v} disabled={readOnly || disabled}
            onChange={(e) => onChange(i, j, Number(e.target.value))}
            style={{
              ...styles.cellBase,
              backgroundColor: (i === highlightRow && j === highlightCol) ? "#2196f3" : "#222",
              color: (i === highlightRow && j === highlightCol) ? "#fff" : "#00e676",
              border: (i === highlightRow && j === highlightCol) ? "1px solid #fff" : "1px solid #444"
            }} />
        ))}
      </div>
    ))}
  </div>
);

const styles = {
  page: { minHeight: "100vh", background: "#111", display: "flex", padding: "20px", justifyContent: "center", alignItems: "flex-start", fontFamily: "sans-serif" },
  calc: { width: 420, padding: 20, background: "#222", borderRadius: 24, color: "white", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" },
  display: { minHeight: 120, background: "#000", padding: 15, marginBottom: 15, borderRadius: 12, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #333" },
  solutionBox: { background: "#1a1a1a", padding: 12, borderRadius: 10, marginBottom: 15, borderLeft: "4px solid #2196f3", maxHeight: "150px", overflowY: "auto" },
  solutionHeader: { fontSize: 10, color: "#2196f3", fontWeight: "bold", marginBottom: 5 },
  stepItem: { fontSize: 11, color: "#888", marginBottom: 2, fontFamily: 'monospace' },
  finalRes: { textAlign: "right", fontSize: 28, color: "#00e676", fontWeight: 'bold' },
  mathBar: { display: "flex", gap: 5, marginBottom: 10 },
  mathBtn: { flex: 1, padding: "10px 0", background: "#444", color: "white", border: "none", borderRadius: 8, cursor: "pointer" },
  delBtn: { flex: 1.5, background: "#ff5722", color: "white", borderRadius: 8, border: "none", fontWeight: 'bold' },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  btn: { padding: 18, fontSize: 18, background: "#333", color: "white", border: "none", borderRadius: 12, cursor: "pointer" },
  equalBtn: { background: "#2196f3", color: "white", borderRadius: 12, border: "none", fontSize: 22 },
  clearBtn: { gridColumn: "span 2", background: "#d32f2f", color: "white", borderRadius: 12, border: "none" },
  matrixBtn: { gridColumn: "span 2", background: "#673ab7", color: "white", borderRadius: 12, border: "none" },
  matrixContainer: { borderLeft: "2px solid #fff", borderRight: "2px solid #fff", padding: "0 4px", display: "inline-block", margin: "5px" },
  cellBase: { width: 38, height: 32, textAlign: "center", margin: 1, borderRadius: 4, fontSize: 12, outline: "none" },
  popup: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", zIndex: 100 },
  popupBtn: { padding: "15px 30px", background: "#2196f3", color: "white", border: "none", borderRadius: 12, fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { marginTop: 30, color: "#aaa", background: "none", border: "1px solid #444", padding: "8px 20px", borderRadius: 6 }
};