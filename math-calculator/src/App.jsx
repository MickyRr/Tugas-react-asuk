import { useState } from "react";

/* ================= APP ================= */

export default function App() {
  const [expr, setExpr] = useState([]);
  const [result, setResult] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [steps, setSteps] = useState([]); // State untuk menyimpan langkah penyelesaian
  const [showMatrixPicker, setShowMatrixPicker] = useState(false);
  
  // State untuk Animasi/Visualisasi Perkalian
  const [animating, setAnimating] = useState(false);
  const [currentIdx, setCurrentIdx] = useState({ r: -1, c: -1 });
  const [multFormula, setMultFormula] = useState("");

  /* ---------- INPUT HANDLERS ---------- */
  const handleBtnClick = (v) => {
    // Reset langkah jika memulai input baru setelah hasil muncul
    if (result !== null && !animating) {
       setSteps([]);
       setResult(null);
    }
    if (expr.length > 0) setExpr([...expr, { type: "symbol", value: v }]);
    else setTextInput((prev) => prev + v);
  };

  const backspace = () => {
    if (expr.length > 0) setExpr(expr.slice(0, -1));
    else setTextInput((prev) => prev.slice(0, -1));
  };

  const clear = () => {
    setExpr([]);
    setResult(null);
    setSteps([]);
    setTextInput("");
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
    newExpr[matrixIdx].value[rowIdx][colIdx] = newValue;
    setExpr(newExpr);
  };

  /* ---------- ANIMATED MULTIPLICATION ---------- */
  const startMatrixAnimation = (A, B) => {
    setAnimating(true);
    let r = 0, c = 0;
    const res = Array(A.length).fill(0).map(() => Array(B[0].length).fill(0));
    const newSteps = ["Memulai perkalian matriks..."];
    
    const interval = setInterval(() => {
      let sum = 0;
      let formulaParts = [];
      for (let k = 0; k < A[0].length; k++) {
        sum += A[r][k] * B[k][c];
        formulaParts.push(`(${A[r][k]}×${B[k][c]})`);
      }
      
      const stepText = `R[${r+1},${c+1}]: ${formulaParts.join(" + ")} = ${sum}`;
      res[r][c] = sum;
      
      // Update state
      setResult([...res.map(row => [...row])]);
      setCurrentIdx({ r, c });
      setMultFormula(stepText);
      setSteps(prev => [...prev, stepText]); // Tambahkan ke daftar langkah agar tetap muncul

      c++;
      if (c >= B[0].length) {
        c = 0;
        r++;
      }

      if (r >= A.length) {
        clearInterval(interval);
        setAnimating(false);
        setCurrentIdx({ r: -1, c: -1 });
        setSteps(prev => [...prev, "Perkalian selesai!"]);
      }
    }, 1000); 
  };

  /* ---------- CALCULATE ---------- */
  const calculate = () => {
    try {
      const matrices = expr.filter((e) => e.type === "matrix");
      const ops = expr.filter((e) => e.type === "symbol");

      if (matrices.length === 2 && ops[0]?.value === "×") {
        setSteps([]); // Reset langkah sebelum mulai
        startMatrixAnimation(matrices[0].value, matrices[1].value);
        return;
      }

      // Normal Mode
      const rawInput = expr.length > 0 ? expr.map((e) => e.value).join("") : textInput;
      const finalSteps = [`Ekspresi: ${rawInput}`];
      
      const source = rawInput
        .replace(/√\(/g, "Math.sqrt(")
        .replace(/π/g, "Math.PI")
        .replace(/\^/g, "**")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-");
      
      const evalResult = eval(source);
      finalSteps.push(`Menghitung hasil...`);
      finalSteps.push(`Hasil akhir: ${evalResult}`);
      
      setSteps(finalSteps);
      setResult(evalResult);
    } catch (e) {
      setResult("Error");
      setSteps(["Terjadi kesalahan format."]);
    }
  };

  /* ================= MATRIX COMPONENT ================= */
  const MatrixEditable = ({ data, matrixIdx, highlightRow, highlightCol, isResult }) => (
    <div style={styles.matrixContainer}>
      {data.map((row, i) => (
        <div key={i} style={{ display: "flex" }}>
          {row.map((v, j) => (
            <input
              key={j}
              type="number"
              value={v}
              onChange={(e) => !isResult && updateMatrix(matrixIdx, i, j, Number(e.target.value))}
              disabled={isResult || animating}
              style={{
                ...styles.cellBase,
                backgroundColor: i === highlightRow ? "#2196f3" : j === highlightCol ? "#ff9800" : "#222",
                color: (i === highlightRow || j === highlightCol) ? "white" : "#00e676",
                border: (i === highlightRow && j === highlightCol) ? "2px solid white" : "1px solid #444",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.calc}>
        {/* DISPLAY */}
        <div style={styles.display}>
          {expr.length === 0 && !result && (
            <input className="text-input" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="0" style={styles.textInput} />
          )}
          {expr.map((e, idx) => (
            e.type === "matrix" ? (
              <MatrixEditable 
                key={idx} 
                data={e.value} 
                matrixIdx={idx} 
                highlightRow={idx === 0 ? currentIdx.r : -1} 
                highlightCol={idx === 1 ? currentIdx.c : -1} 
                isResult={false}
              />
            ) : <span key={idx} style={{ fontSize: 22 }}>{e.value}</span>
          ))}
        </div>

        {/* PERMANENT STEPS BOX */}
        {steps.length > 0 && (
          <div style={styles.solutionBox}>
            <div style={styles.solutionHeader}>CARA PENYELESAIAN:</div>
            <div style={styles.stepsList}>
              {steps.map((step, i) => (
                <div key={i} style={styles.stepItem}>• {step}</div>
              ))}
            </div>
          </div>
        )}

        {/* RESULT AREA */}
        {result !== null && (
          <div style={{ marginBottom: 15, borderTop: "1px solid #444", paddingTop: 10 }}>
             {Array.isArray(result) ? (
               <div style={{textAlign:'center'}}>
                 <p style={{color:'#00e676', fontSize:12, marginBottom: 5}}>HASIL AKHIR:</p>
                 <MatrixEditable data={result} isResult={true} highlightRow={currentIdx.r} highlightCol={currentIdx.c} />
               </div>
             ) : <div style={styles.finalRes}>= {result}</div>}
          </div>
        )}

        {/* MATH BAR */}
        <div style={styles.mathBar}>
          <button style={styles.mathBtn} onClick={() => handleBtnClick("√(")}>√</button>
          <button style={styles.mathBtn} onClick={() => handleBtnClick("^")}>x²</button>
          <button style={styles.mathBtn} onClick={() => handleBtnClick("π")}>π</button>
          <button style={styles.mathBtn} onClick={() => handleBtnClick("(")}>(</button>
          <button style={styles.mathBtn} onClick={() => handleBtnClick(")")}>)</button>
          <button onClick={backspace} style={styles.delBtn}>DEL</button>
        </div>

        {/* BUTTONS GRID */}
        <div style={styles.grid}>
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "+"].map((b) => (
            <button key={b} style={styles.btn} onClick={() => handleBtnClick(b)}>{b}</button>
          ))}
          <button style={styles.equalBtn} onClick={calculate}>=</button>
          <button style={styles.matrixBtn} onClick={() => setShowMatrixPicker(true)}>MATRIX</button>
          <button style={styles.clearBtn} onClick={clear}>C</button>
        </div>
      </div>

      {/* MATRIX PICKER */}
      {showMatrixPicker && (
        <div style={styles.popup}>
          <h3 style={{marginBottom: 20}}>Pilih Ordo Matriks</h3>
          <div style={{ display: "flex", gap: 10 }}>
            {[2, 3, 4].map(n => (
              <button key={n} style={styles.popupBtn} onClick={() => createMatrix(n)}>{n}x{n}</button>
            ))}
          </div>
          <button onClick={() => setShowMatrixPicker(false)} style={styles.cancelBtn}>Batal</button>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { minHeight: "100vh", background: "#111", display: "flex", padding: "20px", justifyContent: "center", alignItems: "flex-start", fontFamily: "sans-serif" },
  calc: { width: 420, padding: 20, background: "#222", borderRadius: 24, color: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" },
  display: { minHeight: 120, background: "#000", padding: 15, marginBottom: 15, borderRadius: 12, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #333" },
  textInput: { width: "100%", background: "transparent", border: "none", color: "white", fontSize: 22, outline: "none" },
  
  // Gaya baru untuk Box Langkah yang permanen
  solutionBox: { background: "#1a1a1a", padding: 12, borderRadius: 10, marginBottom: 15, borderLeft: "4px solid #2196f3", maxHeight: "150px", overflowY: "auto" },
  solutionHeader: { fontSize: 11, color: "#2196f3", fontWeight: "bold", marginBottom: 8, letterSpacing: "1px" },
  stepsList: { display: "flex", flexDirection: "column", gap: "4px" },
  stepItem: { fontSize: 12, color: "#ddd", fontFamily: "monospace" },
  
  finalRes: { textAlign: "right", fontSize: 26, color: "#00e676", fontWeight: "bold" },
  mathBar: { display: "flex", gap: 5, marginBottom: 10 },
  mathBtn: { flex: 1, padding: "12px 0", background: "#444", color: "white", border: "none", borderRadius: 8, cursor: "pointer" },
  delBtn: { flex: 1.5, background: "#ff5722", color: "white", borderRadius: 8, fontWeight: "bold", border: "none", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  btn: { padding: 15, fontSize: 18, background: "#333", color: "white", border: "none", borderRadius: 12, cursor: "pointer" },
  equalBtn: { background: "#2196f3", color: "white", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 20 },
  clearBtn: { gridColumn: "span 2", background: "#d32f2f", color: "white", borderRadius: 12, border: "none", cursor: "pointer" },
  matrixBtn: { gridColumn: "span 2", background: "#673ab7", color: "white", borderRadius: 12, border: "none", cursor: "pointer" },
  matrixContainer: { borderLeft: "2px solid #fff", borderRight: "2px solid #fff", padding: "0 4px", display: "inline-block", margin: "5px" },
  cellBase: { width: 42, height: 38, textAlign: "center", margin: 1, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, transition: "0.3s", fontSize: 14, outline: "none" },
  popup: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", zIndex: 100 },
  popupBtn: { padding: "15px 25px", background: "#2196f3", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 18 },
  cancelBtn: { marginTop: 30, color: "#aaa", background: "none", border: "1px solid #444", padding: "8px 20px", borderRadius: 6, cursor: "pointer" }
};