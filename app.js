const tituloEl = document.getElementById('titulo');
const mundialEl = document.getElementById('mundial');
const statsEl = document.getElementById('stats');
const gridEl = document.getElementById('grid');
const busquedaEl = document.getElementById('busqueda');
const btnExportarEl = document.getElementById('btn-exportar');
const btnImportarEl = document.getElementById('btn-importar');
const btnReparseEl = document.getElementById('btn-reparse');
const inputListadoEl = document.getElementById('input-listado');
const ordenCriterioEl = document.getElementById('orden-criterio');
const ordenDireccionEl = document.getElementById('orden-direccion');
const printSheetEl = document.getElementById('print-sheet');
const tabs = document.querySelectorAll('.tab');

const STORAGE_KEY = 'figuritas-listado';
const STORAGE_TXT_KEY = 'figuritas-listado-txt';
const SORT_STORAGE_KEY = 'figuritas-orden';

let tabActiva = 'faltantes';
let listado = null;
let toastTimer = null;
let ordenCriterio = 'original';
let ordenDireccion = 'asc';

function normalizarPais(item, indice) {
  return {
    ...item,
    nombre: item.nombre || nombreCompletoPais(item.pais, item.bandera),
    icono: item.icono ?? codigoIconoPais(item.pais),
    _orden: indice,
  };
}

function normalizarListado(data) {
  const faltantes = data.faltantes.map(normalizarPais);
  const repetidas = data.repetidas.map(normalizarPais);
  const completados = calcularEquiposCompletados(faltantes, repetidas).map(normalizarPais);

  return {
    ...data,
    faltantes,
    repetidas,
    completados,
  };
}

function ordenarPaises(paises) {
  const dir = ordenDireccion === 'asc' ? 1 : -1;
  const items = [...paises];

  items.sort((a, b) => {
    if (ordenCriterio === 'original') {
      return (a._orden - b._orden) * dir;
    }

    return a.nombre.localeCompare(b.nombre, 'es') * dir;
  });

  return items;
}

function obtenerPaisesOrdenados(tipo) {
  return ordenarPaises(listado[tipo] || []);
}

function guardarPreferenciasOrden() {
  try {
    localStorage.setItem(
      SORT_STORAGE_KEY,
      JSON.stringify({ criterio: ordenCriterio, direccion: ordenDireccion })
    );
  } catch {
    /* sin espacio o modo privado */
  }
}

function cargarPreferenciasOrden() {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return;

    const prefs = JSON.parse(raw);
    if (prefs.criterio) ordenCriterio = prefs.criterio;
    if (prefs.direccion) ordenDireccion = prefs.direccion;
  } catch {
    /* preferencias inválidas */
  }
}

function contarFiguritas(items) {
  return items.reduce((total, pais) => total + pais.figuritas.length, 0);
}

function contarRepetidasTotales(items) {
  return items.reduce(
    (total, pais) =>
      total + pais.figuritas.reduce((sum, f) => sum + (f.cantidad || 1), 0),
    0
  );
}

function renderStats() {
  const faltantes = contarFiguritas(listado.faltantes);
  const repetidas = contarRepetidasTotales(listado.repetidas);
  const completados = listado.completados.length;

  statsEl.innerHTML = `
    <div class="stat">
      <span class="stat__value">${faltantes}</span>
      <span class="stat__label">Figuritas que faltan</span>
    </div>
    <div class="stat">
      <span class="stat__value">${repetidas}</span>
      <span class="stat__label">Repetidas en total</span>
    </div>
    <div class="stat">
      <span class="stat__value">${completados}</span>
      <span class="stat__label">Equipos completados</span>
    </div>
  `;
}

function obtenerIcono(paisItem) {
  return paisItem.icono ?? codigoIconoPais(paisItem.pais);
}

function crearBandera(paisItem, className = 'card__flag') {
  const wrapper = document.createElement('span');
  wrapper.className = className;

  const icono = obtenerIcono(paisItem);
  const etiqueta = paisItem.nombre || paisItem.pais;

  if (icono) {
    const fi = document.createElement('span');
    fi.className = `fi fi-${icono}`;
    fi.setAttribute('role', 'img');
    fi.setAttribute('aria-label', etiqueta);
    wrapper.appendChild(fi);
  } else {
    wrapper.textContent = paisItem.bandera;
    wrapper.setAttribute('aria-hidden', 'true');
  }

  return wrapper;
}

function crearChip(figurita, tipo) {
  const chip = document.createElement('span');
  chip.className = `chip chip--${tipo === 'faltantes' ? 'faltante' : 'repetida'}`;
  chip.textContent = figurita.numero;

  if (tipo === 'repetidas' && figurita.cantidad > 1) {
    const badge = document.createElement('span');
    badge.className = 'chip__badge';
    badge.textContent = `×${figurita.cantidad}`;
    chip.appendChild(badge);
  }

  if (tipo === 'faltantes' && figurita.repetidas > 1) {
    const badge = document.createElement('span');
    badge.className = 'chip__badge';
    badge.textContent = `×${figurita.repetidas}`;
    chip.appendChild(badge);
  }

  return chip;
}

function crearCard(paisItem, tipo) {
  const card = document.createElement('article');
  card.className = 'card';
  if (tipo === 'completados') card.classList.add('card--completo');

  const head = document.createElement('div');
  head.className = 'card__head';

  const info = document.createElement('div');
  info.className = 'card__info';

  const nombre = document.createElement('h2');
  nombre.className = 'card__pais';
  nombre.textContent = paisItem.nombre || paisItem.pais;

  const codigo = document.createElement('span');
  codigo.className = 'card__codigo';
  codigo.textContent = ` (${paisItem.pais})`;
  nombre.appendChild(codigo);

  info.append(nombre, crearBandera(paisItem));

  const count = document.createElement('span');
  count.className = 'card__count';

  if (tipo === 'completados') {
    count.classList.add('card__count--completo');
    count.textContent = 'Completo';
  } else {
    count.textContent = `${paisItem.figuritas.length} fig.`;
  }

  head.append(info, count);
  card.append(head);

  if (tipo === 'completados') {
    const reps = paisItem.repetidasEquipo || [];
    const msg = document.createElement('p');
    msg.className = 'card__completo-msg';
    msg.textContent =
      reps.length > 0
        ? `Sin faltantes · ${reps.length} repetida${reps.length > 1 ? 's' : ''}`
        : 'Sin figuritas faltantes';
    card.append(msg);
    return card;
  }

  const chips = document.createElement('div');
  chips.className = 'chips';
  paisItem.figuritas.forEach((fig) => chips.appendChild(crearChip(fig, tipo)));
  card.append(chips);

  return card;
}

function filtrarPaises(paises, query) {
  const q = query.trim().toLowerCase();
  if (!q) return paises;

  return paises.filter(
    (item) =>
      item.pais.toLowerCase().includes(q) ||
      (item.nombre && item.nombre.toLowerCase().includes(q)) ||
      item.bandera.toLowerCase().includes(q)
  );
}

function renderGrid() {
  const items = obtenerPaisesOrdenados(tabActiva);
  const filtrados = filtrarPaises(items, busquedaEl.value);

  gridEl.innerHTML = '';

  if (filtrados.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent =
      tabActiva === 'completados' && !busquedaEl.value.trim()
        ? 'Todavía no hay equipos completados.'
        : 'No hay resultados para esa búsqueda.';
    gridEl.appendChild(empty);
    return;
  }

  filtrados.forEach((paisItem) => {
    gridEl.appendChild(crearCard(paisItem, tabActiva));
  });
}

function formatearNumeros(figuritas, tipo) {
  return figuritas
    .map((fig) => {
      const extra =
        tipo === 'repetidas'
          ? fig.cantidad > 1
            ? `×${fig.cantidad}`
            : ''
          : fig.repetidas > 1
            ? `×${fig.repetidas}`
            : '';
      return extra ? `${fig.numero}${extra}` : String(fig.numero);
    })
    .join(', ');
}

function crearListaImpresion(paises, tipo) {
  const lista = document.createElement('ul');
  lista.className = 'print-sheet__list';

  paises.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'print-sheet__item';

    const pais = document.createElement('span');
    pais.className = 'print-sheet__pais';
    pais.textContent = `${item.nombre || item.pais} (${item.pais}) `;

    const nums = document.createElement('span');
    nums.className = 'print-sheet__nums';
    nums.textContent = formatearNumeros(item.figuritas, tipo);

    li.append(pais, crearBandera(item, 'print-sheet__flag'), document.createTextNode(': '), nums);
    lista.appendChild(li);
  });

  return lista;
}

function construirHojaImpresion() {
  const faltantes = contarFiguritas(listado.faltantes);
  const repetidas = contarRepetidasTotales(listado.repetidas);
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  printSheetEl.innerHTML = '';

  const notesLabel = document.createElement('p');
  notesLabel.className = 'print-sheet__notes-label';
  notesLabel.textContent = 'Notas / tachar cambios:';

  const notes = document.createElement('div');
  notes.className = 'print-sheet__notes';
  notes.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'print-sheet__header';
  header.innerHTML = `
    <h1 class="print-sheet__title">${listado.titulo}</h1>
    <p class="print-sheet__meta">
      ${listado.mundial}<br>
      ${fecha} · Faltan ${faltantes} · Repetidas ${repetidas}
    </p>
  `;

  const body = document.createElement('div');
  body.className = 'print-sheet__body';

  const colFaltan = document.createElement('section');
  colFaltan.innerHTML = `<h2 class="print-sheet__section-title">Me faltan (${faltantes})</h2>`;
  colFaltan.appendChild(crearListaImpresion(obtenerPaisesOrdenados('faltantes'), 'faltantes'));

  const colRep = document.createElement('section');
  colRep.innerHTML = `<h2 class="print-sheet__section-title">Repetidas (${repetidas})</h2>`;
  colRep.appendChild(crearListaImpresion(obtenerPaisesOrdenados('repetidas'), 'repetidas'));

  body.append(colFaltan, colRep);
  printSheetEl.append(notesLabel, notes, header, body);
}

function exportarPdf() {
  construirHojaImpresion();
  window.print();
}

function mostrarToast(mensaje, esError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }

  toast.textContent = mensaje;
  toast.classList.toggle('toast--error', esError);
  toast.classList.add('toast--visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 3200);
}

function guardarTxt(contenido) {
  try {
    localStorage.setItem(STORAGE_TXT_KEY, contenido);
  } catch {
    /* sin espacio o modo privado */
  }
}

function cargarTxtGuardado() {
  try {
    return localStorage.getItem(STORAGE_TXT_KEY);
  } catch {
    return null;
  }
}

async function obtenerContenidoListado() {
  try {
    const respuesta = await fetch('listado.txt', { cache: 'no-store' });
    if (respuesta.ok) {
      return await respuesta.text();
    }
  } catch {
    /* file:// o sin acceso al archivo */
  }

  return cargarTxtGuardado();
}

function procesarContenido(contenido) {
  const data = parseListado(contenido);
  guardarTxt(contenido);
  guardarListado(data);
  aplicarListado(data);
  return data;
}

function guardarListado(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* sin espacio o modo privado */
  }
}

function cargarListadoGuardado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function aplicarListado(data) {
  listado = normalizarListado(data);
  document.title = listado.titulo;
  tituloEl.textContent = listado.titulo;
  mundialEl.textContent = listado.mundial;
  renderStats();
  renderGrid();
}

function initOrden() {
  if (!ordenCriterioEl || !ordenDireccionEl) return;

  ordenCriterioEl.value = ordenCriterio;
  ordenDireccionEl.value = ordenDireccion;

  const actualizarOrden = () => {
    ordenCriterio = ordenCriterioEl.value;
    ordenDireccion = ordenDireccionEl.value;
    guardarPreferenciasOrden();
    renderGrid();
  };

  ordenCriterioEl.addEventListener('change', actualizarOrden);
  ordenDireccionEl.addEventListener('change', actualizarOrden);
}

function initImportar() {
  btnImportarEl.addEventListener('click', () => inputListadoEl.click());

  inputListadoEl.addEventListener('change', async () => {
    const archivo = inputListadoEl.files[0];
    inputListadoEl.value = '';
    if (!archivo) return;

    try {
      procesarContenido(await archivo.text());
      mostrarToast('Listado actualizado correctamente.');
    } catch (err) {
      mostrarToast(err.message || 'No se pudo leer el archivo.', true);
    }
  });
}

async function reprocesarListado() {
  btnReparseEl.disabled = true;
  btnReparseEl.classList.add('btn-reparse--loading');

  try {
    const contenido = await obtenerContenidoListado();
    if (!contenido) {
      mostrarToast('No se encontró listado.txt. Usá "Actualizar listado" primero.', true);
      return;
    }

    procesarContenido(contenido);
    mostrarToast('Listado reprocesado correctamente.');
  } catch (err) {
    mostrarToast(err.message || 'No se pudo reprocesar el listado.', true);
  } finally {
    btnReparseEl.disabled = false;
    btnReparseEl.classList.remove('btn-reparse--loading');
  }
}

function initReprocesar() {
  btnReparseEl.addEventListener('click', reprocesarListado);
}

function initExportar() {
  btnExportarEl.addEventListener('click', exportarPdf);
}

function initTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabActiva = tab.dataset.tab;

      tabs.forEach((t) => {
        const activa = t.dataset.tab === tabActiva;
        t.classList.toggle('tab--active', activa);
        t.setAttribute('aria-selected', String(activa));
      });

      renderGrid();
    });
  });
}

function init() {
  cargarPreferenciasOrden();

  const guardado = cargarListadoGuardado();
  const inicial = guardado || (typeof LISTADO !== 'undefined' ? LISTADO : null);

  if (!inicial) {
    gridEl.innerHTML =
      '<p class="empty">No hay datos cargados. Usá <strong>Actualizar listado</strong> para elegir tu <code>listado.txt</code>.</p>';
    initOrden();
    initImportar();
    initReprocesar();
    return;
  }

  aplicarListado(inicial);
  initTabs();
  initOrden();
  initImportar();
  initReprocesar();
  initExportar();
  busquedaEl.addEventListener('input', renderGrid);
}

init();
