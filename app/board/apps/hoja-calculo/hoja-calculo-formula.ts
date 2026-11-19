import type { SpreadsheetCell } from "./hoja-calculo-model";

/** Códigos de error visibles en una celda. */
export type FormulaErrorCode = "#VALOR!" | "#REF!" | "#DIV/0!" | "#NOMBRE!" | "#CIRC!";

/** Valor calculado o literal de una celda. */
export type FormulaValue = number | string | boolean | null;

/** Resultado de evaluar una celda. */
export type FormulaResult =
  | { ok: true; value: FormulaValue }
  | { ok: false; error: FormulaErrorCode };

/** Tamaño máximo de una fórmula, en caracteres. */
export const MAX_FORMULA_LENGTH = 2_000;
/** Celdas máximas que puede recorrer un rango. */
export const MAX_FORMULA_RANGE_CELLS = 10_000;
/** Profundidad máxima de dependencias. */
export const MAX_FORMULA_DEPTH = 200;

/** Error interno que se propaga durante la evaluación. */
class FormulaFailure extends Error {
  constructor(readonly code: FormulaErrorCode) {
    super(code);
  }
}

type CellAddress = { row: number; column: number };

type EvalValue = FormulaValue | FormulaValue[];

type FormulaNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "cell"; address: CellAddress }
  | { type: "range"; start: CellAddress; end: CellAddress }
  | { type: "unary"; operator: "+" | "-"; operand: FormulaNode }
  | { type: "binary"; operator: string; left: FormulaNode; right: FormulaNode }
  | { type: "call"; name: string; args: FormulaNode[] };

type Token =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "ref"; address: CellAddress }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string };

const CELL_REFERENCE = /^\$?([A-Za-z]{1,3})\$?([0-9]+)$/;
const COMPARISON_OPERATORS = new Set(["=", "<>", "<", "<=", ">", ">="]);
const BINARY_OPERATORS = new Set(["+", "-", "*", "/", "^", ...COMPARISON_OPERATORS]);

/**
 * Calcula todas las celdas de una hoja, resolviendo fórmulas y dependencias.
 * @param sheet - Matriz de celdas con fórmulas como texto.
 * @returns Una matriz con el resultado de cada celda.
 */
export function evaluateSheetFormulas(sheet: SpreadsheetCell[][]): FormulaResult[][] {
  const cache = new Map<string, FormulaResult>();
  const visiting = new Set<string>();

  const cellKey = (address: CellAddress) => `${address.row}:${address.column}`;

  const evaluateCell = (address: CellAddress, depth: number): FormulaValue => {
    if (
      address.row < 0
      || address.column < 0
      || address.row >= sheet.length
      || address.column >= (sheet[address.row]?.length ?? 0)
    ) {
      throw new FormulaFailure("#REF!");
    }
    if (depth > MAX_FORMULA_DEPTH) throw new FormulaFailure("#CIRC!");
    const key = cellKey(address);
    const cached = cache.get(key);
    if (cached) {
      if (cached.ok) return cached.value;
      throw new FormulaFailure(cached.error);
    }
    if (visiting.has(key)) throw new FormulaFailure("#CIRC!");

    visiting.add(key);
    try {
      const raw = sheet[address.row][address.column];
      let result: FormulaResult;
      if (typeof raw === "string" && raw.trimStart().startsWith("=")) {
        try {
          result = { ok: true, value: evaluateFormula(raw, evaluateCell, depth) };
        } catch (error) {
          result = { ok: false, error: error instanceof FormulaFailure ? error.code : "#VALOR!" };
        }
      } else {
        result = { ok: true, value: raw };
      }
      cache.set(key, result);
      if (!result.ok) throw new FormulaFailure(result.error);
      return result.value;
    } finally {
      visiting.delete(key);
    }
  };

  return sheet.map((row, rowIndex) => row.map((_, columnIndex) => {
    try {
      return { ok: true, value: evaluateCell({ row: rowIndex, column: columnIndex }, 0) };
    } catch (error) {
      return { ok: false, error: error instanceof FormulaFailure ? error.code : "#VALOR!" };
    }
  }));
}

/**
 * Evalúa una fórmula contra una hoja.
 * @param formula - Fórmula con `=` inicial.
 * @param resolve - Resolver de celdas para referencias y rangos.
 * @param startDepth - Profundidad inicial de evaluación.
 * @returns El valor calculado.
 */
function evaluateFormula(
  formula: string,
  resolve: (address: CellAddress, depth: number) => FormulaValue,
  startDepth: number,
): FormulaValue {
  if (formula.length > MAX_FORMULA_LENGTH) throw new FormulaFailure("#VALOR!");
  const source = formula.trim().replace(/^=/, "");
  if (!source) throw new FormulaFailure("#VALOR!");
  const parser = new FormulaParser(tokenize(source));
  const node = parser.parse();
  const value = evaluateNode(node, resolve, startDepth);
  if (Array.isArray(value)) throw new FormulaFailure("#VALOR!");
  return value;
}

/**
 * Evalúa un nodo AST.
 * @param node - Nodo a evaluar.
 * @param resolve - Resolver de celdas.
 * @param depth - Profundidad de evaluación.
 * @returns El valor del nodo.
 */
function evaluateNode(
  node: FormulaNode,
  resolve: (address: CellAddress, depth: number) => FormulaValue,
  depth: number,
): EvalValue {
  if (node.type === "number" || node.type === "string" || node.type === "boolean") return node.value;
  if (node.type === "cell") return resolve(node.address, depth + 1);
  if (node.type === "range") return evaluateRange(node, resolve, depth);
  if (node.type === "unary") {
    const value = toNumber(scalar(evaluateNode(node.operand, resolve, depth)));
    return node.operator === "-" ? -value : value;
  }
  if (node.type === "binary") {
    const left = scalar(evaluateNode(node.left, resolve, depth));
    const right = scalar(evaluateNode(node.right, resolve, depth));
    return evaluateBinary(node.operator, left, right);
  }
  return evaluateCall(node, resolve, depth);
}

/**
 * Comprueba que un valor no sea un rango donde se espera un escalar.
 * @param value - Valor evaluado.
 * @returns El valor escalar.
 */
function scalar(value: EvalValue): FormulaValue {
  if (Array.isArray(value)) throw new FormulaFailure("#VALOR!");
  return value;
}

/**
 * Resuelve un rango A1:B2.
 * @param node - Nodo de rango.
 * @param resolve - Resolver de celdas.
 * @param depth - Profundidad de evaluación.
 * @returns Una lista de valores.
 */
function evaluateRange(
  node: Extract<FormulaNode, { type: "range" }>,
  resolve: (address: CellAddress, depth: number) => FormulaValue,
  depth: number,
): FormulaValue[] {
  const rowStart = Math.min(node.start.row, node.end.row);
  const rowEnd = Math.max(node.start.row, node.end.row);
  const columnStart = Math.min(node.start.column, node.end.column);
  const columnEnd = Math.max(node.start.column, node.end.column);
  if ((rowEnd - rowStart + 1) * (columnEnd - columnStart + 1) > MAX_FORMULA_RANGE_CELLS) {
    throw new FormulaFailure("#VALOR!");
  }
  const values: FormulaValue[] = [];
  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let column = columnStart; column <= columnEnd; column += 1) {
      values.push(resolve({ row, column }, depth + 1));
    }
  }
  return values;
}

/**
 * Aplica un operador binario.
 * @param operator - Operador.
 * @param left - Valor izquierdo.
 * @param right - Valor derecho.
 * @returns El resultado.
 */
function evaluateBinary(operator: string, left: FormulaValue, right: FormulaValue): FormulaValue {
  if (operator === "=") return compare(left, right) === 0;
  if (operator === "<>") return compare(left, right) !== 0;
  if (operator === "<") return compare(left, right) < 0;
  if (operator === "<=") return compare(left, right) <= 0;
  if (operator === ">") return compare(left, right) > 0;
  if (operator === ">=") return compare(left, right) >= 0;
  const a = toNumber(left);
  const b = toNumber(right);
  if (operator === "+") return a + b;
  if (operator === "-") return a - b;
  if (operator === "*") return a * b;
  if (operator === "/") {
    if (b === 0) throw new FormulaFailure("#DIV/0!");
    return a / b;
  }
  if (operator === "^") return a ** b;
  throw new FormulaFailure("#VALOR!");
}

/**
 * Compara dos valores de forma estable.
 * @param left - Valor izquierdo.
 * @param right - Valor derecho.
 * @returns Negativo, cero o positivo.
 */
function compare(left: FormulaValue, right: FormulaValue): number {
  const a = toNumberIfPossible(left);
  const b = toNumberIfPossible(right);
  if (a !== null && b !== null) return a === b ? 0 : a < b ? -1 : 1;
  const textA = left === null ? "" : String(left);
  const textB = right === null ? "" : String(right);
  return textA === textB ? 0 : textA < textB ? -1 : 1;
}

/**
 * Convierte un valor a número, incluyendo texto numérico.
 * @param value - Valor de celda.
 * @returns El número o `null` si no es numérico.
 */
function toNumberIfPossible(value: FormulaValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === "") return 0;
  if (typeof value === "string") {
    const number = Number(value.trim());
    return Number.isFinite(number) && value.trim() !== "" ? number : null;
  }
  return null;
}

/**
 * Convierte un valor de rango en número para funciones de agregación.
 * @param value - Valor de la celda.
 * @returns El número o `null` para texto y celdas vacías.
 */
function aggregateNumber(value: FormulaValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value.trim());
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

/**
 * Convierte un valor a número para una operación aritmética.
 * @param value - Valor de celda.
 * @returns El número.
 */
function toNumber(value: FormulaValue): number {
  const number = toNumberIfPossible(value);
  if (number === null) throw new FormulaFailure("#VALOR!");
  return number;
}

/**
 * Convierte un valor a booleano para IF.
 * @param value - Valor.
 * @returns Su interpretación booleana.
 */
function truthy(value: FormulaValue): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return typeof value === "string" ? value.length > 0 : false;
}

/**
 * Evalúa una llamada a función.
 * @param node - Nodo de llamada.
 * @param resolve - Resolver de celdas.
 * @param depth - Profundidad.
 * @returns El resultado.
 */
function evaluateCall(
  node: Extract<FormulaNode, { type: "call" }>,
  resolve: (address: CellAddress, depth: number) => FormulaValue,
  depth: number,
): FormulaValue {
  const name = node.name.toUpperCase();
  if (name === "IF") {
    if (node.args.length !== 3) throw new FormulaFailure("#VALOR!");
    const condition = scalar(evaluateNode(node.args[0], resolve, depth));
    return scalar(evaluateNode(truthy(condition) ? node.args[1] : node.args[2], resolve, depth));
  }

  const values = node.args.flatMap((arg) => {
    const value = evaluateNode(arg, resolve, depth);
    return Array.isArray(value) ? value : [value];
  });
  const numbers = values
    .map(aggregateNumber)
    .filter((value): value is number => value !== null);

  if (name === "SUM") return numbers.reduce((total, value) => total + value, 0);
  if (name === "AVERAGE") {
    if (!numbers.length) throw new FormulaFailure("#DIV/0!");
    return numbers.reduce((total, value) => total + value, 0) / numbers.length;
  }
  if (name === "MIN") return numbers.length ? Math.min(...numbers) : 0;
  if (name === "MAX") return numbers.length ? Math.max(...numbers) : 0;
  if (name === "COUNT") return numbers.length;
  if (name === "ABS") {
    if (node.args.length !== 1) throw new FormulaFailure("#VALOR!");
    return Math.abs(toNumber(values[0] ?? null));
  }
  if (name === "ROUND") {
    if (node.args.length < 1 || node.args.length > 2) throw new FormulaFailure("#VALOR!");
    const digits = node.args.length === 2 ? Math.trunc(toNumber(values[1] ?? 0)) : 0;
    const factor = 10 ** digits;
    return Math.round(toNumber(values[0] ?? null) * factor) / factor;
  }
  throw new FormulaFailure("#NOMBRE!");
}

/** Parser de expresiones con precedencia. */
class FormulaParser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  /**
   * Analiza la fórmula completa.
   * @returns El AST.
   */
  parse(): FormulaNode {
    const node = this.parseComparison();
    if (this.peek()) throw new FormulaFailure("#VALOR!");
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    if (!token) throw new FormulaFailure("#VALOR!");
    this.index += 1;
    return token;
  }

  private matchOperator(operators: Set<string>): Extract<Token, { type: "operator" }> | null {
    const token = this.peek();
    if (!token || token.type !== "operator" || !operators.has(token.value)) return null;
    this.index += 1;
    return token;
  }

  private peekOperator(value: string): boolean {
    const token = this.peek();
    return token?.type === "operator" && token.value === value;
  }

  private parseComparison(): FormulaNode {
    return this.parseBinaryLevel(() => this.parseAdditive(), COMPARISON_OPERATORS);
  }

  private parseAdditive(): FormulaNode {
    return this.parseBinaryLevel(() => this.parseMultiplicative(), new Set(["+", "-"]));
  }

  private parseMultiplicative(): FormulaNode {
    return this.parseBinaryLevel(() => this.parsePower(), new Set(["*", "/"]));
  }

  private parsePower(): FormulaNode {
    let left = this.parseUnary();
    const operator = this.matchOperator(new Set(["^"]));
    if (operator) {
      left = { type: "binary", operator: operator.value, left, right: this.parsePower() };
    }
    return left;
  }

  private parseBinaryLevel(next: () => FormulaNode, operators: Set<string>): FormulaNode {
    let left = next();
    let operator = this.matchOperator(operators);
    while (operator) {
      left = { type: "binary", operator: operator.value, left, right: next() };
      operator = this.matchOperator(operators);
    }
    return left;
  }

  private parseUnary(): FormulaNode {
    const token = this.peek();
    if (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
      this.index += 1;
      return { type: "unary", operator: token.value, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaNode {
    const token = this.consume();
    if (token.type === "operator" && token.value === "(") {
      const node = this.parseComparison();
      if (!this.matchOperator(new Set([")"]))) throw new FormulaFailure("#VALOR!");
      return node;
    }
    if (token.type === "number") return { type: "number", value: token.value };
    if (token.type === "string") return { type: "string", value: token.value };
    if (token.type === "ref") {
      const next = this.peek();
      if (next?.type === "operator" && next.value === ":") {
        this.index += 1;
        const end = this.consume();
        if (end.type !== "ref") throw new FormulaFailure("#VALOR!");
        return { type: "range", start: token.address, end: end.address };
      }
      return { type: "cell", address: token.address };
    }
    if (token.type === "identifier") {
      if (token.value.toUpperCase() === "TRUE") return { type: "boolean", value: true };
      if (token.value.toUpperCase() === "FALSE") return { type: "boolean", value: false };
      if (this.peekOperator("(")) {
        this.index += 1;
        const args: FormulaNode[] = [];
        if (!this.peekOperator(")")) {
          while (true) {
            args.push(this.parseComparison());
            const comma = this.matchOperator(new Set([","]));
            if (!comma) break;
          }
        }
        const close = this.matchOperator(new Set([")"]));
        if (!close) throw new FormulaFailure("#VALOR!");
        return { type: "call", name: token.value, args };
      }
      throw new FormulaFailure("#NOMBRE!");
    }
    throw new FormulaFailure("#VALOR!");
  }
}

/**
 * Convierte una fórmula en tokens.
 * @param source - Fórmula sin el `=` inicial.
 * @returns Los tokens.
 */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === '"') {
      let value = "";
      index += 1;
      while (index < source.length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          value += '"';
          index += 2;
        } else if (source[index] === '"') {
          index += 1;
          break;
        } else {
          value += source[index];
          index += 1;
        }
      }
      tokens.push({ type: "string", value });
      continue;
    }
    const number = /^\d+(?:\.\d+)?/.exec(source.slice(index));
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const reference = /^\$?[A-Za-z]{1,3}\$?\d+/.exec(source.slice(index));
    if (reference) {
      const match = CELL_REFERENCE.exec(reference[0]);
      if (!match) throw new FormulaFailure("#REF!");
      tokens.push({
        type: "ref",
        address: {
          row: Number(match[2]) - 1,
          column: columnIndex(match[1]),
        },
      });
      index += reference[0].length;
      continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(index));
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0] });
      index += identifier[0].length;
      continue;
    }
    const twoCharacter = source.slice(index, index + 2);
    if (twoCharacter === "<=" || twoCharacter === ">=" || twoCharacter === "<>") {
      tokens.push({ type: "operator", value: twoCharacter });
      index += 2;
      continue;
    }
    if (BINARY_OPERATORS.has(character) || "(),:%".includes(character)) {
      tokens.push({ type: "operator", value: character });
      index += 1;
      continue;
    }
    throw new FormulaFailure("#VALOR!");
  }
  return tokens;
}

/**
 * Convierte una letra de columna en índice cero-based.
 * @param label - Letras de columna.
 * @returns El índice.
 */
function columnIndex(label: string): number {
  let value = 0;
  for (const character of label.toUpperCase()) {
    value = value * 26 + character.charCodeAt(0) - 64;
  }
  return value - 1;
}
