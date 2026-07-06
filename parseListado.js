const fs = require('fs');
const path = require('path');
const { parseListado } = require('./parser.js');

const INPUT_FILE = path.join(__dirname, 'listado.txt');
const OUTPUT_FILE = path.join(__dirname, 'listado.json');
const DATA_JS_FILE = path.join(__dirname, 'data.js');

function main() {
  const contenido = fs.readFileSync(INPUT_FILE, 'utf8');
  const json = parseListado(contenido);
  const jsonStr = JSON.stringify(json, null, 2);

  fs.writeFileSync(OUTPUT_FILE, jsonStr, 'utf8');
  fs.writeFileSync(DATA_JS_FILE, `const LISTADO = ${jsonStr};\n`, 'utf8');
  console.log(`JSON generado en: ${OUTPUT_FILE}`);
  console.log(`Datos para la vista en: ${DATA_JS_FILE}`);
}

if (require.main === module) {
  main();
}
