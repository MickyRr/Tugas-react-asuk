import { useState } from "react";

export default function MatrixModal({ onClose, onInsert }) {
  const [r, setR] = useState(2);
  const [c, setC] = useState(2);
  const [m, setM] = useState([[0,0],[0,0]]);

  const resize = (nr, nc) => {
    setR(nr);
    setC(nc);
    setM(Array.from({ length: nr }, () =>
      Array(nc).fill(0)
    ));
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Matriks</h3>

        <select onChange={e => resize(...e.target.value.split("x").map(Number))}>
          <option>2x2</option>
          <option>3x3</option>
          <option>4x4</option>
        </select>

        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${c},40px)`,
          gap: 4,
          margin: "10px 0"
        }}>
          {m.map((row,i) =>
            row.map((v,j) => (
              <input
                key={i+j}
                value={v}
                onChange={e => {
                  const n = [...m];
                  n[i][j] = Number(e.target.value);
                  setM(n);
                }}
              />
            ))
          )}
        </div>

        <button onClick={() => onInsert(m)}>Masukkan</button>
        <button onClick={onClose}>Batal</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 8
  }
};
