/**
 * Lógica de parseo compartida (navegador y Node.js).
 */

/** Código del álbum → nombre completo en español. */
const NOMBRES_POR_PAIS = {
  MEX: 'México',
  RSA: 'Sudáfrica',
  KOR: 'Corea del Sur',
  CZE: 'República Checa',
  CAN: 'Canadá',
  BIH: 'Bosnia y Herzegovina',
  QAT: 'Catar',
  SUI: 'Suiza',
  BRA: 'Brasil',
  MAR: 'Marruecos',
  HAI: 'Haití',
  SCO: 'Escocia',
  USA: 'Estados Unidos',
  PAR: 'Paraguay',
  AUS: 'Australia',
  TUR: 'Turquía',
  GER: 'Alemania',
  CUW: 'Curazao',
  CIV: 'Costa de Marfil',
  ECU: 'Ecuador',
  NED: 'Países Bajos',
  JPN: 'Japón',
  SWE: 'Suecia',
  TUN: 'Túnez',
  BEL: 'Bélgica',
  EGY: 'Egipto',
  IRN: 'Irán',
  NZL: 'Nueva Zelanda',
  ESP: 'España',
  CPV: 'Cabo Verde',
  KSA: 'Arabia Saudita',
  URU: 'Uruguay',
  FRA: 'Francia',
  SEN: 'Senegal',
  IRQ: 'Irak',
  NOR: 'Noruega',
  ARG: 'Argentina',
  ALG: 'Argelia',
  AUT: 'Austria',
  JOR: 'Jordania',
  POR: 'Portugal',
  COD: 'República Democrática del Congo',
  UZB: 'Uzbekistán',
  COL: 'Colombia',
  ENG: 'Inglaterra',
  CRO: 'Croacia',
  GHA: 'Ghana',
  PAN: 'Panamá',
  FWC: 'FIFA World Cup',
  CC: 'Coca-Cola',
};

/** Código del álbum → ISO 3166-1 alpha-2 para flag-icons. */
const ICONOS_POR_PAIS = {
  MEX: 'mx',
  RSA: 'za',
  KOR: 'kr',
  CZE: 'cz',
  CAN: 'ca',
  BIH: 'ba',
  QAT: 'qa',
  SUI: 'ch',
  BRA: 'br',
  MAR: 'ma',
  HAI: 'ht',
  SCO: 'gb-sct',
  USA: 'us',
  PAR: 'py',
  AUS: 'au',
  TUR: 'tr',
  GER: 'de',
  CUW: 'cw',
  CIV: 'ci',
  ECU: 'ec',
  NED: 'nl',
  JPN: 'jp',
  SWE: 'se',
  TUN: 'tn',
  BEL: 'be',
  EGY: 'eg',
  IRN: 'ir',
  NZL: 'nz',
  ESP: 'es',
  CPV: 'cv',
  KSA: 'sa',
  URU: 'uy',
  FRA: 'fr',
  SEN: 'sn',
  IRQ: 'iq',
  NOR: 'no',
  ARG: 'ar',
  ALG: 'dz',
  AUT: 'at',
  JOR: 'jo',
  POR: 'pt',
  COD: 'cd',
  UZB: 'uz',
  COL: 'co',
  ENG: 'gb-eng',
  CRO: 'hr',
  GHA: 'gh',
  PAN: 'pa',
};

/** Secciones especiales identificadas por emoji (FWC, CC). */
const NOMBRES_POR_BANDERA = {
  '🏆': 'Copa del Mundo',
  '🌎': 'Mundial',
  '📜': 'Historia',
  '🥤': 'Coca-Cola',
};

function nombreCompletoPais(pais, bandera) {
  if (NOMBRES_POR_BANDERA[bandera]) return NOMBRES_POR_BANDERA[bandera];
  return NOMBRES_POR_PAIS[pais] || pais;
}

function codigoIconoPais(pais) {
  return ICONOS_POR_PAIS[pais] || null;
}

function claveEquipo(item) {
  if (item.pais === 'FWC' || item.pais === 'CC') {
    return `${item.pais}|${item.bandera}`;
  }
  return item.pais;
}

function calcularEquiposCompletados(faltantes, repetidas) {
  const faltantesKeys = new Set(faltantes.map(claveEquipo));
  const repetidasMap = new Map(repetidas.map((item) => [claveEquipo(item), item]));

  const roster = Object.keys(ICONOS_POR_PAIS).map((pais) => {
    const rep = repetidasMap.get(pais);
    return {
      pais,
      bandera: rep?.bandera || '',
      nombre: NOMBRES_POR_PAIS[pais],
      icono: ICONOS_POR_PAIS[pais],
      figuritas: [],
      repetidasEquipo: rep?.figuritas || [],
    };
  });

  for (const [bandera, nombre] of Object.entries(NOMBRES_POR_BANDERA)) {
    const pais = bandera === '🥤' ? 'CC' : 'FWC';
    const key = claveEquipo({ pais, bandera });
    const rep = repetidasMap.get(key);

    roster.push({
      pais,
      bandera,
      nombre,
      icono: codigoIconoPais(pais),
      figuritas: [],
      repetidasEquipo: rep?.figuritas || [],
    });
  }

  return roster.filter((equipo) => !faltantesKeys.has(claveEquipo(equipo)));
}

function parseFiguritaToken(token) {
  const match = token.trim().match(/^(\d+)(?:\s*\([×x]?\s*(\d+)\))?$/i);
  if (!match) return null;

  const numero = parseInt(match[1], 10);
  const cantidad = match[2] ? parseInt(match[2], 10) : 1;

  return { numero, cantidad };
}

function parseFiguritas(numerosStr, tipo) {
  return numerosStr
    .split(',')
    .map((token) => parseFiguritaToken(token))
    .filter(Boolean)
    .map(({ numero, cantidad }) => {
      if (tipo === 'faltantes') {
        const entry = { numero };
        if (cantidad > 1) entry.repetidas = cantidad;
        return entry;
      }
      return { numero, cantidad };
    });
}

function parsePaisLinea(linea, tipo) {
  const colonIndex = linea.indexOf(':');
  if (colonIndex === -1) return null;

  const paisBandera = linea.slice(0, colonIndex).trim();
  const numerosStr = linea.slice(colonIndex + 1).trim();

  const espacioIndex = paisBandera.indexOf(' ');
  const pais = espacioIndex === -1 ? paisBandera : paisBandera.slice(0, espacioIndex);
  const bandera = espacioIndex === -1 ? '' : paisBandera.slice(espacioIndex + 1).trim();

  return {
    pais,
    nombre: nombreCompletoPais(pais, bandera),
    icono: codigoIconoPais(pais),
    bandera,
    figuritas: parseFiguritas(numerosStr, tipo),
  };
}

function parseListado(contenido) {
  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length < 3) {
    throw new Error('El archivo debe tener al menos título, mundial y un bloque de datos.');
  }

  const titulo = lineas[0];
  const mundial = lineas[1];

  const idxFaltan = lineas.findIndex((l) => l.toLowerCase() === 'me faltan');
  const idxRepetidas = lineas.findIndex((l) => l.toLowerCase() === 'repetidas');

  if (idxFaltan === -1) throw new Error('No se encontró la sección "Me faltan".');
  if (idxRepetidas === -1) throw new Error('No se encontró la sección "Repetidas".');

  const faltantes = lineas
    .slice(idxFaltan + 1, idxRepetidas)
    .map((linea) => parsePaisLinea(linea, 'faltantes'))
    .filter(Boolean);

  const repetidas = lineas
    .slice(idxRepetidas + 1)
    .map((linea) => parsePaisLinea(linea, 'repetidas'))
    .filter(Boolean);

  return {
    titulo,
    mundial,
    faltantes,
    repetidas,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseListado,
    parsePaisLinea,
    parseFiguritas,
    parseFiguritaToken,
    nombreCompletoPais,
    codigoIconoPais,
    claveEquipo,
    calcularEquiposCompletados,
    NOMBRES_POR_PAIS,
    ICONOS_POR_PAIS,
  };
}
