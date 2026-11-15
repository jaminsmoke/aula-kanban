import { formatNumber, type Evaluation } from "./calculator-evaluation";

class Unsupported extends Error {}
class InvalidSyntax extends Error {}

type Rational = { n: bigint; d: bigint };

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const FIVE = BigInt(5);
const TEN = BigInt(10);
const THOUSAND = BigInt(1000);

function absolute(value: bigint): bigint {
  return value < ZERO ? -value : value;
}

function gcd(a: bigint, b: bigint): bigint {
  return b === ZERO ? a : gcd(b, a % b);
}

function rational(n: bigint, d: bigint): Rational {
  if (d === ZERO) throw new Unsupported();
  if (d < ZERO) {
    n = -n;
    d = -d;
  }
  if (n === ZERO) return { n: ZERO, d: ONE };
  const divisor = gcd(absolute(n), d);
  return { n: n / divisor, d: d / divisor };
}

function add(left: Rational, right: Rational): Rational {
  return rational(left.n * right.d + right.n * left.d, left.d * right.d);
}

function subtract(left: Rational, right: Rational): Rational {
  return rational(left.n * right.d - right.n * left.d, left.d * right.d);
}

function multiply(left: Rational, right: Rational): Rational {
  return rational(left.n * right.n, left.d * right.d);
}

function divide(left: Rational, right: Rational): Rational {
  if (right.n === ZERO) throw new Unsupported();
  return rational(left.n * right.d, left.d * right.n);
}

function bigintPower(base: bigint, exponent: bigint): bigint {
  let result = ONE;
  let factor = base;
  let remaining = exponent;
  while (remaining > ZERO) {
    if (remaining % TWO === ONE) result *= factor;
    factor *= factor;
    remaining /= TWO;
  }
  return result;
}

function power(base: Rational, exponent: bigint): Rational {
  if (exponent === ZERO) return rational(ONE, ONE);
  if (exponent < ZERO) {
    if (base.n === ZERO) throw new Unsupported();
    return rational(bigintPower(base.d, -exponent), bigintPower(base.n, -exponent));
  }
  return rational(bigintPower(base.n, exponent), bigintPower(base.d, exponent));
}

function factorial(value: bigint): Rational {
  let result = ONE;
  for (let factor = TWO; factor <= value; factor += ONE) result *= factor;
  return rational(result, ONE);
}

function pow10(exponent: number): bigint {
  let result = ONE;
  for (let index = 0; index < exponent; index += 1) result *= TEN;
  return result;
}

function decimal(value: string): Rational {
  const [whole, fraction = ""] = value.split(".");
  return rational(BigInt(`${whole || "0"}${fraction}`), pow10(fraction.length));
}

/**
 * Devuelve la expansión decimal exacta si termina.
 * @param value - Fracción reducida.
 * @returns La expansión decimal o null si es periódica.
 */
function terminatingDecimal(value: Rational): string | null {
  let denominator = value.d;
  let twos = 0;
  let fives = 0;
  while (denominator % TWO === ZERO) {
    denominator /= TWO;
    twos += 1;
  }
  while (denominator % FIVE === ZERO) {
    denominator /= FIVE;
    fives += 1;
  }
  if (denominator !== ONE) return null;

  const scale = Math.max(twos, fives);
  const scaled = (value.n * pow10(scale)) / value.d;
  const negative = scaled < ZERO;
  const digits = absolute(scaled).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, -scale);
  const fraction = digits.slice(-scale);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function evaluation(value: Rational): Evaluation {
  if (value.d === ONE) {
    const exact = value.n.toString();
    return { kind: "value", exact, latex: exact, numeric: exact, isNumeric: true };
  }

  const exact = terminatingDecimal(value);
  const numeric = exact === null ? (() => {
    const approximate = Number(value.n) / Number(value.d);
    return Number.isFinite(approximate) ? formatNumber(approximate.toString()) : null;
  })() : formatNumber(exact);
  return {
    kind: "value",
    exact: exact ?? `${value.n}/${value.d}`,
    latex: exact ?? `${value.n}/${value.d}`,
    numeric,
    isNumeric: numeric !== null,
  };
}

class Parser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): Rational {
    const value = this.expression();
    if (this.index !== this.source.length) throw new InvalidSyntax();
    return value;
  }

  private skip(): void {
    while (/\s/.test(this.source[this.index] ?? "")) this.index += 1;
  }

  private match(character: string): boolean {
    this.skip();
    if (this.source[this.index] !== character) return false;
    this.index += 1;
    return true;
  }

  private startsImplicitFactor(): boolean {
    this.skip();
    const character = this.source[this.index];
    return character === "(" || /[0-9]/.test(character ?? "");
  }

  private expression(): Rational {
    let value = this.term();
    for (;;) {
      if (this.match("+")) value = add(value, this.term());
      else if (this.match("-")) value = subtract(value, this.term());
      else break;
    }
    return value;
  }

  private term(): Rational {
    let value = this.unary();
    for (;;) {
      if (this.match("*")) value = multiply(value, this.unary());
      else if (this.match("/")) value = divide(value, this.unary());
      else if (this.startsImplicitFactor()) value = multiply(value, this.unary());
      else break;
    }
    return value;
  }

  private unary(): Rational {
    if (this.match("+")) return this.unary();
    if (this.match("-")) {
      const value = this.unary();
      return { n: -value.n, d: value.d };
    }
    return this.power();
  }

  private power(): Rational {
    const base = this.postfix();
    if (!this.match("^")) return base;
    const exponent = this.unary();
    if (exponent.d !== ONE || absolute(exponent.n) > THOUSAND) throw new Unsupported();
    return power(base, exponent.n);
  }

  private postfix(): Rational {
    let value = this.primary();
    while (this.match("!")) {
      if (value.d !== ONE || value.n < ZERO || value.n > THOUSAND) throw new Unsupported();
      value = factorial(value.n);
    }
    return value;
  }

  private primary(): Rational {
    if (this.match("(")) {
      const value = this.expression();
      if (!this.match(")")) throw new InvalidSyntax();
      return value;
    }
    return this.number();
  }

  private number(): Rational {
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(this.source.slice(this.index));
    if (!match) throw new InvalidSyntax();
    this.index += match[0].length;
    return decimal(match[0]);
  }
}

/**
 * Evalúa una expresión de la calculadora básica sin cargar el motor simbólico.
 * Devuelve null para las expresiones que necesitan LaTeX o funciones que el
 * parser no cubre, de modo que el llamador pueda usar `evaluateLatex`.
 * @param source - Expresión escrita con el teclado básico.
 * @returns El resultado, un error de sintaxis o null si hay que delegar.
 */
export function evaluateBasic(source: string): Evaluation | null {
  const input = source.trim();
  if (!input) return { kind: "empty" };
  if (input.includes("\\") || /[a-zA-Z]/.test(input)) return null;

  try {
    return evaluation(new Parser(input).parse());
  } catch (error) {
    if (error instanceof Unsupported) return null;
    if (error instanceof InvalidSyntax) {
      return { kind: "error", message: "La expresión no está bien escrita. Revisa la fórmula." };
    }
    throw error;
  }
}
