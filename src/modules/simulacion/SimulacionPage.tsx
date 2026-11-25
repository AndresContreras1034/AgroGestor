import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../shared/ui/Button";
import "./simulacion.css";

type Grid = boolean[][];

const createEmptyGrid = (rows: number, cols: number): Grid =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

const normalizeDimension = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(5, Math.min(30, Math.round(value)));
};

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function SimulacionPage() {
  const [rows, setRows] = useState(12);
  const [cols, setCols] = useState(16);
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid(12, 16));
  const [week, setWeek] = useState(0);
  const [running, setRunning] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const population = grid.reduce(
    (total, row) => total + row.filter(Boolean).length,
    0,
  );

  function stopSimulation() {
    setRunning(false);
  }

  useEffect(() => {
    if (!running) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setGrid((current) => advanceGrid(current));
      setWeek((current) => current + 1);
    }, 650);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  function resizeGrid(nextRows: number, nextCols: number) {
    const safeRows = normalizeDimension(nextRows, rows);
    const safeCols = normalizeDimension(nextCols, cols);
    setRows(safeRows);
    setCols(safeCols);
    setGrid((current) =>
      createEmptyGrid(safeRows, safeCols).map((newRow, rowIndex) =>
        newRow.map((_, colIndex) => current[rowIndex]?.[colIndex] ?? false),
      ),
    );
  }

  function toggleCell(rowIndex: number, colIndex: number) {
    stopSimulation();
    setWeek(0);
    setGrid((current) =>
      current.map((row, currentRow) =>
        row.map((cell, currentCol) =>
          currentRow === rowIndex && currentCol === colIndex ? !cell : cell,
        ),
      ),
    );
  }

  function advance(weeks = 1) {
    stopSimulation();
    setGrid((current) => {
      let next = cloneGrid(current);
      for (let index = 0; index < weeks; index += 1) {
        next = advanceGrid(next);
      }
      return next;
    });
    setWeek((current) => current + weeks);
  }

  function loadExample() {
    stopSimulation();
    const nextRows = 12;
    const nextCols = 16;
    const pattern = [
      [5, 6], [5, 7], [5, 8],
      [6, 5], [6, 6], [6, 9],
      [7, 5], [7, 7], [7, 9],
    ];
    const next = createEmptyGrid(nextRows, nextCols);
    pattern.forEach(([row, col]) => {
      next[row][col] = true;
    });
    setRows(nextRows);
    setCols(nextCols);
    setGrid(next);
    setWeek(0);
    setFileName("Datos de ejemplo");
    setError(null);
    setMessage("Se cargaron cultivos de ejemplo.");
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    stopSimulation();
    setError(null);
    setMessage(null);

    try {
      const text = await file.text();
      const loaded = parseGridFile(text, file.name);
      setRows(loaded.rows);
      setCols(loaded.cols);
      setGrid(loaded.grid);
      setWeek(0);
      setFileName(file.name);
      setMessage(`Archivo cargado: ${loaded.population} cultivos activos.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo.");
    }
  }

  function reset() {
    stopSimulation();
    setGrid(createEmptyGrid(rows, cols));
    setWeek(0);
    setFileName("");
    setMessage(null);
    setError(null);
  }

  return (
    <section className="simulacion">
      <header className="simulacion-header">
        <div>
          <span className="simulacion-eyebrow">Modelo de crecimiento</span>
          <h1>Iniciar simulación</h1>
          <p>Simulación semanal tipo Juego de la Vida aplicada a un plano de cultivo.</p>
        </div>
      </header>

      {error && <p className="simulacion-alert simulacion-alert-error" role="alert">{error}</p>}
      {message ? (
        <p className="simulacion-alert" role="status">
          {message}
        </p>
      ) : null}

      <div className="simulacion-layout">
        <aside className="simulacion-panel simulacion-config">
          <div className="simulacion-panel-header">
            <h2>Configuración inicial</h2>
          </div>

          <div className="simulacion-form">
            <label>
              Filas
              <input
                type="number"
                min="5"
                max="30"
                value={rows}
                onChange={(event) => resizeGrid(Number(event.target.value), cols)}
              />
            </label>
            <label>
              Columnas
              <input
                type="number"
                min="5"
                max="30"
                value={cols}
                onChange={(event) => resizeGrid(rows, Number(event.target.value))}
              />
            </label>

            <label className="simulacion-file">
              Cargar archivo
              <input type="file" accept=".csv,.json,.txt,text/csv,application/json" onChange={loadFile} />
            </label>

            <Button variante="secundario" type="button" onClick={loadExample}>
              Usar datos de ejemplo
            </Button>
            <Button variante="secundario" type="button" onClick={reset}>
              Limpiar cuadrícula
            </Button>
          </div>

          <div className="simulacion-format">
            <strong>Formatos admitidos</strong>
            <p>JSON con <code>{"{ \"cells\": [[fila, columna]], \"rows\": 12, \"cols\": 16 }"}</code></p>
            <p>CSV o matriz de texto con <code>0</code> y <code>1</code>.</p>
          </div>
        </aside>

        <div className="simulacion-main">
          <div className="simulacion-toolbar">
            <div className="simulacion-stats">
              <article><span>Semana</span><strong>{week}</strong></article>
              <article><span>Cultivos activos</span><strong>{population}</strong></article>
              <article><span>Estado</span><strong>{running ? "En ejecución" : "Detenido"}</strong></article>
            </div>
            <div className="simulacion-actions">
              {!running ? (
                <Button variante="primario" type="button" onClick={() => setRunning(true)} disabled={population === 0}>
                  Iniciar
                </Button>
              ) : (
                <Button variante="primario" type="button" onClick={stopSimulation}>
                  Pausar
                </Button>
              )}
              <Button type="button" onClick={() => advance(1)}>+1 semana</Button>
              <Button type="button" onClick={() => advance(5)}>+5 semanas</Button>
              <Button type="button" onClick={() => advance(10)}>+10 semanas</Button>
            </div>
          </div>

          <div className="simulacion-panel simulacion-grid-panel">
            <div className="simulacion-panel-header">
              <div>
                <h2>Plano de cultivo</h2>
                {fileName && <p>{fileName}</p>}
              </div>
              <div className="simulacion-legend">
                <span><i className="vacio" /> Vacío</span>
                <span><i className="activo" /> Cultivo activo</span>
              </div>
            </div>

            <div className="simulacion-grid-wrap">
              <div
                className="simulacion-grid"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(18px, 32px))`,
                }}
                role="grid"
                aria-label="Cuadrícula de simulación agrícola"
              >
                {grid.flatMap((row, rowIndex) =>
                  row.map((active, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      type="button"
                      className={active ? "active" : ""}
                      onClick={() => toggleCell(rowIndex, colIndex)}
                      role="gridcell"
                      aria-label={`Fila ${rowIndex + 1}, columna ${colIndex + 1}: ${active ? "cultivo activo" : "vacío"}`}
                      title={`Fila ${rowIndex + 1}, columna ${colIndex + 1}`}
                    />
                  )),
                )}
              </div>
            </div>
          </div>

          <p className="simulacion-help">
            Haga clic sobre una celda para plantar o retirar un cultivo. La población cambia cada semana:
            permanece viva con 2 o 3 vecinos, nace con 3 y desaparece en los demás casos.
          </p>
        </div>
      </div>
    </section>
  );
}

function advanceGrid(current: Grid): Grid {
  return current.map((row, rowIndex) =>
    row.map((active, colIndex) => {
      let neighbors = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) continue;
          if (current[rowIndex + rowOffset]?.[colIndex + colOffset]) neighbors += 1;
        }
      }
      return active ? neighbors === 2 || neighbors === 3 : neighbors === 3;
    }),
  );
}

function parseGridFile(text: string, fileName: string): {
  rows: number;
  cols: number;
  grid: Grid;
  population: number;
} {
  const extension = fileName.toLowerCase().split(".").pop();

  if (extension === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("El archivo JSON no contiene una estructura válida.");
    }

    if (Array.isArray(parsed)) {
      const matrix = parsed.map((row) => (Array.isArray(row) ? row : []));
      if (matrix.length === 0 || matrix.some((row) => row.length === 0)) {
        throw new Error("La matriz JSON debe contener al menos una fila.");
      }
      const cols = Math.max(...matrix.map((row) => row.length));
      const grid = matrix.map((row) =>
        Array.from({ length: cols }, (_, colIndex) =>
          toActiveValue(row[colIndex]),
        ),
      );
      return buildLoadedGrid(grid);
    }

    if (parsed && typeof parsed === "object") {
      const data = parsed as {
        rows?: unknown;
        cols?: unknown;
        width?: unknown;
        height?: unknown;
        matrix?: unknown;
        cells?: unknown;
      };

      if (Array.isArray(data.matrix)) {
        const matrix = data.matrix.map((row) => (Array.isArray(row) ? row : []));
        if (matrix.length === 0 || matrix.some((row) => row.length === 0)) {
          throw new Error("La matriz JSON debe contener al menos una fila.");
        }
        const cols = Math.max(...matrix.map((row) => row.length));
        const grid = matrix.map((row) =>
          Array.from({ length: cols }, (_, colIndex) => toActiveValue(row[colIndex])),
        );
        return buildLoadedGrid(grid);
      }

      if (Array.isArray(data.cells)) {
        const rows = normalizeDimension(Number(data.rows ?? data.height), 12);
        const cols = normalizeDimension(Number(data.cols ?? data.width), 16);
        const grid = createEmptyGrid(rows, cols);
        let invalid = false;
        data.cells.forEach((cell) => {
          if (Array.isArray(cell) && cell.length >= 2) {
            const rowIndex = Number(cell[0]);
            const colIndex = Number(cell[1]);
            if (
              Number.isInteger(rowIndex) &&
              Number.isInteger(colIndex) &&
              rowIndex >= 0 &&
              colIndex >= 0 &&
              rowIndex < rows &&
              colIndex < cols
            ) {
              grid[rowIndex][colIndex] = true;
            } else {
              invalid = true;
            }
          } else {
            invalid = true;
          }
        });
        if (invalid) throw new Error("Algunas coordenadas del JSON están fuera de rango.");
        return buildLoadedGrid(grid);
      }
    }

    throw new Error("JSON no reconocido. Use rows/cols con cells o una matriz.");
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error("El archivo está vacío.");

  const matrix = lines.map((line) =>
    line
      .replace(/\s*\|\s*/g, ",")
      .split(/[,;\t]/)
      .map((value) => value.trim()),
  );
  if (matrix.some((row) => row.length === 0)) {
    throw new Error("El CSV no contiene datos válidos.");
  }

  const cols = Math.max(...matrix.map((row) => row.length));
  const grid = matrix.map((row) =>
    Array.from({ length: cols }, (_, colIndex) => {
      const value = row[colIndex];
      if (value === undefined) return false;
      if (!["0", "1", "true", "false"].includes(value.toLowerCase())) {
        throw new Error(`Valor inválido "${value}". Use 0, 1, true o false.`);
      }
      return toActiveValue(value);
    }),
  );
  return buildLoadedGrid(grid);
}

function toActiveValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
}

function buildLoadedGrid(grid: Grid) {
  if (grid.length > 30 || grid[0].length > 30) {
    throw new Error("La cuadrícula no puede superar 30 filas y 30 columnas.");
  }
  if (grid.length < 5 || grid[0].length < 5) {
    throw new Error("La cuadrícula debe tener al menos 5 filas y 5 columnas.");
  }
  const population = grid.reduce(
    (total, row) => total + row.filter(Boolean).length,
    0,
  );
  return {
    rows: grid.length,
    cols: grid[0].length,
    grid,
    population,
  };
}
