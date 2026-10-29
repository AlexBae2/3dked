// Единый источник размеров: 3D-модель и чертёж строятся из этого файла.
// Оси: X вдоль стеллажа (0..6000), Y глубина (0 = фасад .. 700), Z высота (0..1800). Все размеры в мм.

export const P = {
  L: 6000, D: 700, H: 1800,
  modules: 3,          // секций по 2000 мм (болтовое соединение, перевозка)
  cellsPerModule: 4,   // ячеек по 500 в секции
  rows: 2,             // нижний и верхний ряд
  pitch: 500,          // шаг ячеек
  rowH: 900,           // высота ячейки (шаг рядов)
  angle: 45, angleT: 4,        // уголок 45x45x4 ГОСТ 8509-93
  sheetT: 1.5,                 // листовая сталь, мм
  doorGap: 3,                  // суммарный зазор между дверями
  doorReturn: 20,              // отгиб кромки двери
  hingesPerDoor: 3,
  steelDensity: 7850,
};

P.modW = P.L / P.modules;                         // 2000
P.cols = P.modules * P.cellsPerModule;            // 12
P.angleKgM = 2.73;                                // 45x45x4, кг/м (ГОСТ 8509-93)
P.sheetKgM2 = P.sheetT * P.steelDensity / 1000;   // кг/м2
P.doorW = P.pitch - P.doorGap;                    // 497
P.doorH = P.rowH - P.doorGap;                     // 897

// Оси стоек внутри секции (локально по X): краевые стойки лицом к торцу секции, средние по оси деления ячеек
const a = P.angle;
export function uprightAxes() {
  const xs = [a / 2];
  for (let k = 1; k < P.cellsPerModule; k++) xs.push(k * P.pitch);
  xs.push(P.modW - a / 2);
  return xs;
}
// Уровни горизонтальных рам (нижняя грань, верх z): низ, середина, верх
export const levels = [
  { name: 'низ', z0: 0 },
  { name: 'середина', z0: P.rowH - a / 2 },
  { name: 'верх', z0: P.H - a },
];

// Двери: 24 шт., пары, шарниры по краям пары, замок на сходящейся кромке
export function doors() {
  const out = [];
  for (let c = 0; c < P.cols; c++) {
    for (let r = 0; r < P.rows; r++) {
      const m = Math.floor(c / P.cellsPerModule), lc = c % P.cellsPerModule;
      const x0 = c * P.pitch + P.doorGap / 2;
      const hingeLeft = lc % 2 === 0;
      out.push({
        id: `Д${r === 0 ? 'Н' : 'В'}${String(c + 1).padStart(2, '0')}`,
        col: c, row: r, module: m,
        x0, x1: x0 + P.doorW,
        z0: r * P.rowH + P.doorGap / 2, z1: r * P.rowH + P.doorGap / 2 + P.doorH,
        hingeLeft,
      });
    }
  }
  return out;
}

// Ведомость деталей (на весь стеллаж)
export function cutList() {
  const m = P.modules, a = P.angle;
  const inner = P.modW - 2 * a;      // между краевыми стойками
  const tie = P.D - 2 * a;           // между передней и задней стойкой
  const clearRow = P.rowH - a;       // свет ряда по горизонтали (по осям рам, округл.)
  const clearRowZ = (P.rowH - a / 2) - a;  // 832.5
  const nUp = (P.cellsPerModule + 1) * 2 * m;
  const angles = [
    { pos: '1', name: 'Стойка', size: `L45×45×4, L=${P.H}`, len: P.H, qty: nUp, note: 'ГОСТ 8509-93, Ст3' },
    { pos: '2', name: 'Продольная перекладина (фасад/тыл)', size: `L45×45×4, L=${inner}`, len: inner, qty: 3 * 2 * m, note: 'низ, середина, верх' },
    { pos: '3', name: 'Поперечная связь (глубина)', size: `L45×45×4, L=${tie}`, len: tie, qty: 3 * (P.cellsPerModule + 1) * m, note: 'по линии каждой стойки' },
  ];
  const sheets = [
    { pos: '4', name: 'Дверь (с отгибом 20 мм по периметру)', size: `${P.doorW}×${P.doorH}×${P.sheetT}`, qty: P.cols * P.rows, area: P.doorW * P.doorH / 1e6, note: 'развёртка с отгибами ≈ 537×937' },
    { pos: '5', name: 'Перегородка между ячейками', size: `${tie}×${clearRowZ}×${P.sheetT}`, qty: (P.cellsPerModule + 1) * P.rows * m, area: tie * clearRowZ / 1e6, note: 'приварить к стойкам и поясам' },
    { pos: '6', name: 'Задняя стенка ряда (в секции)', size: `${inner}×${clearRowZ}×${P.sheetT}`, qty: P.rows * m, area: inner * clearRowZ / 1e6, note: 'в секции по ряду' },
    { pos: '7', name: 'Днище/перекрытие ячейки', size: `${P.pitch - a}×${tie}×${P.sheetT}`, qty: P.cols * 3, area: (P.pitch - a) * tie / 1e6, note: 'низ, середина (между рядами), верх' },
  ];
  const hw = [
    { pos: '8', name: 'Петля накладная усиленная 80 мм', qty: P.cols * P.rows * P.hingesPerDoor },
    { pos: '9', name: 'Замок врезной/накладной с ключом', qty: P.cols * P.rows },
    { pos: '10', name: 'Ручка-скоба', qty: P.cols * P.rows },
    { pos: '11', name: 'Болт М8×30 + гайка + шайба (стяжка секций)', qty: 4 * 2 * (m - 1) },
    { pos: '12', name: 'Опора регулируемая М10 (виброопора)', qty: (P.cellsPerModule + 1) * 2 * m },
  ];
  const angleM = angles.reduce((s, x) => s + x.len * x.qty, 0) / 1000;
  const angleKg = angleM * P.angleKgM;
  const sheetArea = sheets.reduce((s, x) => s + x.area * x.qty, 0);
  const sheetKg = sheetArea * P.sheetKgM2;
  return { angles, sheets, hw, angleM, angleKg, sheetArea, sheetKg, totalKg: angleKg + sheetKg };
}
