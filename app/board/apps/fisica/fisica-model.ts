import { Bodies, Composite, Constraint, Engine, type Body, type Constraint as MatterConstraint } from "matter-js";

/** Ancho lógico del lienzo. */
export const SCENE_WIDTH = 800;
/** Alto lógico del lienzo. */
export const SCENE_HEIGHT = 500;

/** Presets disponibles en el laboratorio. */
export type PresetId = "gravedad" | "colisiones" | "muelle" | "pendulo";

/** Ficha visible de cada preset. */
export type PresetInfo = {
  id: PresetId;
  label: string;
  description: string;
};

/** Presets en el orden del selector. */
export const PRESETS: PresetInfo[] = [
  { id: "gravedad", label: "Gravedad", description: "Cuerpos que caen y rebotan sobre el suelo." },
  { id: "colisiones", label: "Colisiones", description: "Pelotas que chocan contra obstáculos estáticos." },
  { id: "muelle", label: "Muelle", description: "Una masa unida a un anclaje por un muelle." },
  { id: "pendulo", label: "Péndulo", description: "Una masa que oscila alrededor de su anclaje." },
];

/** Escena creada para un preset. */
export type PhysicsScene = {
  engine: Engine;
  bodies: Body[];
  constraints: MatterConstraint[];
};

const BODY_COLORS = ["#7c5cff", "#2f9e8f", "#e5a62e", "#d9688a", "#4b8bd6"];

/**
 * Crea una escena de Matter.js para un preset.
 * @param preset - Experimento que se quiere mostrar.
 * @returns Motor, cuerpos y restricciones de la escena.
 */
export function createScene(preset: PresetId): PhysicsScene {
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
  const bodies: Body[] = [];
  const constraints: MatterConstraint[] = [];

  function add(body: Body): Body {
    bodies.push(body);
    Composite.add(engine.world, body);
    return body;
  }

  function addConstraint(constraint: MatterConstraint): MatterConstraint {
    constraints.push(constraint);
    Composite.add(engine.world, constraint);
    return constraint;
  }

  add(Bodies.rectangle(SCENE_WIDTH / 2, SCENE_HEIGHT - 16, SCENE_WIDTH, 32, {
    isStatic: true,
    label: "suelo",
    render: { fillStyle: "#4b3a78" },
  }));
  add(Bodies.rectangle(-12, SCENE_HEIGHT / 2, 24, SCENE_HEIGHT, {
    isStatic: true,
    label: "pared izquierda",
    render: { fillStyle: "#4b3a78" },
  }));
  add(Bodies.rectangle(SCENE_WIDTH + 12, SCENE_HEIGHT / 2, 24, SCENE_HEIGHT, {
    isStatic: true,
    label: "pared derecha",
    render: { fillStyle: "#4b3a78" },
  }));

  if (preset === "gravedad") {
    for (let index = 0; index < 6; index += 1) {
      add(Bodies.circle(150 + index * 95, 70 + (index % 2) * 55, 18 + (index % 3) * 4, {
        restitution: 0.62,
        frictionAir: 0.012,
        label: `pelota ${index + 1}`,
        render: { fillStyle: BODY_COLORS[index % BODY_COLORS.length] },
      }));
    }
  }

  if (preset === "colisiones") {
    const pegs = [
      [180, 220, 16],
      [320, 160, 18],
      [460, 250, 16],
      [610, 180, 20],
    ] as const;
    for (const [x, y, radius] of pegs) {
      add(Bodies.circle(x, y, radius, {
        isStatic: true,
        label: "obstáculo",
        render: { fillStyle: "#d9a441" },
      }));
    }
    for (let index = 0; index < 7; index += 1) {
      add(Bodies.circle(120 + index * 92, 55, 15 + (index % 2) * 5, {
        restitution: 0.7,
        frictionAir: 0.008,
        label: `pelota ${index + 1}`,
        render: { fillStyle: BODY_COLORS[index % BODY_COLORS.length] },
      }));
    }
  }

  if (preset === "muelle") {
    const anchor = add(Bodies.circle(400, 80, 13, {
      isStatic: true,
      label: "anclaje",
      render: { fillStyle: "#4b3a78" },
    }));
    const bob = add(Bodies.circle(400, 235, 28, {
      restitution: 0.2,
      frictionAir: 0.01,
      label: "masa del muelle",
      render: { fillStyle: BODY_COLORS[0] },
    }));
    addConstraint(Constraint.create({
      pointA: { x: 400, y: 80 },
      bodyB: bob,
      length: 130,
      stiffness: 0.025,
      damping: 0.045,
      label: "muelle",
      render: { visible: true, strokeStyle: "#a78bfa", lineWidth: 3 },
    }));
    // El anclaje se conserva en la escena para que el render lo muestre.
    void anchor;
  }

  if (preset === "pendulo") {
    const anchor = add(Bodies.circle(400, 80, 13, {
      isStatic: true,
      label: "anclaje",
      render: { fillStyle: "#4b3a78" },
    }));
    const bob = add(Bodies.circle(565, 205, 24, {
      restitution: 0.1,
      frictionAir: 0.006,
      label: "masa del péndulo",
      render: { fillStyle: BODY_COLORS[3] },
    }));
    addConstraint(Constraint.create({
      pointA: { x: 400, y: 80 },
      bodyB: bob,
      length: 180,
      stiffness: 0.9,
      damping: 0.01,
      label: "cuerda",
      render: { visible: true, strokeStyle: "#d9688a", lineWidth: 3 },
    }));
    void anchor;
  }

  return { engine, bodies, constraints };
}

/**
 * Crea una pelota nueva para añadirla a una escena.
 * @param x - Posición horizontal.
 * @param y - Posición vertical.
 * @param index - Índice para variar color y radio.
 * @returns La pelota.
 */
export function createBall(x: number, y: number, index = 0): Body {
  return Bodies.circle(x, y, 15 + (index % 3) * 3, {
    restitution: 0.68,
    frictionAir: 0.012,
    label: `pelota nueva ${index + 1}`,
    render: { fillStyle: BODY_COLORS[index % BODY_COLORS.length] },
  });
}
