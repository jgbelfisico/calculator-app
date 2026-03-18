// ─── Referencias al DOM ───────────────────────────────────────────────────────
// getElementById busca un elemento HTML por su atributo id="...".

const pantallaResultado  = document.getElementById('resultado');
const pantallaExpresion  = document.getElementById('expresion');
const listaHistorial     = document.getElementById('lista-historial');
const btnBorrarHistorial = document.getElementById('btn-borrar-historial');
const btnTema            = document.getElementById('btn-tema');

// ─── Tema (oscuro / claro) ────────────────────────────────────────────────────
// El tema se controla con el atributo data-tema en el elemento <html>.
// localStorage guarda la preferencia del usuario aunque cierre el navegador.

/**
 * Aplica el tema recibido ('claro' u 'oscuro') y actualiza el botón.
 * @param {string} tema  'claro' o 'oscuro'
 */
function aplicarTema(tema) {
  if (tema === 'claro') {
    document.documentElement.setAttribute('data-tema', 'claro');
    btnTema.textContent = 'Oscuro'; // el botón siempre dice a dónde vas
  } else {
    document.documentElement.removeAttribute('data-tema'); // vuelve al :root (oscuro)
    btnTema.textContent = 'Claro';
  }
  // Guardamos en localStorage para que la preferencia persista al recargar
  localStorage.setItem('tema', tema);
}

// Al cargar la página, leemos el tema guardado (o usamos oscuro por defecto)
aplicarTema(localStorage.getItem('tema') || 'oscuro');

// Al hacer clic, alternamos entre los dos temas
btnTema.addEventListener('click', () => {
  const temaActual = document.documentElement.getAttribute('data-tema');
  aplicarTema(temaActual === 'claro' ? 'oscuro' : 'claro');
});

// ─── Estado de la calculadora ────────────────────────────────────────────────
// Este objeto funciona como la "memoria" de la calculadora.
// Guarda todo lo que necesitamos recordar entre un clic y el siguiente.

const estado = {
  numeroActual:   '0',   // El número que el usuario está escribiendo ahora
  numeroAnterior: '',    // El primer número de la operación (antes del operador)
  operador:       null,  // El operador activo: '+', '-', '*' o '/'
  operacionLista: false, // true después de presionar un operador O después de presionar =
};

// ─── Funciones de pantalla ───────────────────────────────────────────────────

/**
 * Actualiza la pantalla para reflejar el estado actual.
 * Siempre que cambie el estado, llamamos a esta función.
 */
function actualizarPantalla() {
  pantallaResultado.textContent = estado.numeroActual;

  // Si hay un operador activo, mostramos la expresión parcial arriba (ej: "8 +")
  if (estado.operador && estado.numeroAnterior !== '') {
    pantallaExpresion.textContent = `${estado.numeroAnterior} ${estado.operador}`;
  } else {
    pantallaExpresion.textContent = '';
  }
}

// ─── Funciones de acción ─────────────────────────────────────────────────────

/**
 * Agrega un dígito o punto decimal al número actual.
 * @param {string} valor  El carácter presionado: '0'–'9' o '.'
 */
function ingresarNumero(valor) {
  // Un número no puede tener dos puntos decimales
  if (valor === '.' && estado.numeroActual.includes('.')) return;

  if (estado.operacionLista) {
    // El operador fue presionado (o acaba de calcularse un resultado):
    // el siguiente dígito inicia un número nuevo en lugar de concatenarse
    estado.numeroActual   = (valor === '.') ? '0.' : valor;
    estado.operacionLista = false;
  } else {
    // Reemplazamos el '0' inicial, o concatenamos al número existente
    if (estado.numeroActual === '0' && valor !== '.') {
      estado.numeroActual = valor;
    } else {
      estado.numeroActual += valor;
    }
  }

  actualizarPantalla();
}

/**
 * Registra el operador elegido y prepara la calculadora para el segundo número.
 * Si ya había una operación pendiente, la resuelve primero.
 * @param {string} nuevoOperador  El símbolo presionado: '+', '-', '*' o '/'
 */
function seleccionarOperador(nuevoOperador) {
  // Encadenamiento: si el usuario escribe 2 + 3 *, calculamos 2+3 antes de guardar *
  if (estado.operador && !estado.operacionLista) {
    calcular();
  }

  estado.numeroAnterior  = estado.numeroActual;
  estado.operador        = nuevoOperador;
  estado.operacionLista  = true;

  actualizarPantalla();
}

/**
 * Ejecuta la operación pendiente y muestra el resultado.
 */
function calcular() {
  // No hay nada que calcular si falta el primer número o el operador
  if (!estado.operador || estado.numeroAnterior === '') return;

  const a = parseFloat(estado.numeroAnterior);
  const b = parseFloat(estado.numeroActual);
  let resultado;

  switch (estado.operador) {
    case '+': resultado = a + b; break;
    case '-': resultado = a - b; break;
    case '*': resultado = a * b; break;
    case '/':
      if (b === 0) { mostrarError('Error: ÷ 0'); return; }
      resultado = a / b;
      break;
    default:
      // No debería llegar aquí, pero si el operador no es reconocido salimos
      return;
  }

  // Guardamos la expresión antes de modificar el estado (ej: "8 + 3")
  const expresion = `${estado.numeroAnterior} ${estado.operador} ${estado.numeroActual}`;

  // Mostramos la expresión completa en la pantalla (ej: "8 + 3 =")
  pantallaExpresion.textContent = `${expresion} =`;

  // toFixed(10) limita los decimales para evitar resultados como 0.30000000004
  // parseFloat(...) elimina los ceros finales (ej: "1.5000000000" → "1.5")
  estado.numeroActual = parseFloat(resultado.toFixed(10)).toString();

  estado.numeroAnterior = '';
  estado.operador       = null;
  // Marcamos operacionLista = true para que el próximo dígito empiece
  // un número nuevo en lugar de concatenarse al resultado actual.
  // Sin esto, presionar = y luego 2 daría "82" en vez de "2".
  estado.operacionLista = true;

  pantallaResultado.textContent = estado.numeroActual;

  // Agregamos esta operación al historial visible
  agregarAlHistorial(expresion, estado.numeroActual);
}

/**
 * Vuelve la calculadora a su estado inicial.
 */
function limpiar() {
  reiniciarEstado();
  actualizarPantalla();
}

// ─── Funciones de apoyo ──────────────────────────────────────────────────────

/**
 * Resetea todas las variables del estado a sus valores iniciales.
 * Se usa en limpiar() y en mostrarError() para no repetir el mismo código.
 */
function reiniciarEstado() {
  estado.numeroActual   = '0';
  estado.numeroAnterior = '';
  estado.operador       = null;
  estado.operacionLista = false;
}

/**
 * Muestra un mensaje de error en la pantalla y reinicia la calculadora.
 * @param {string} mensaje  El texto a mostrar, ej: 'Error: ÷ 0'
 */
function mostrarError(mensaje) {
  pantallaResultado.textContent = mensaje;
  pantallaExpresion.textContent = '';
  reiniciarEstado();
}

// ─── Historial ───────────────────────────────────────────────────────────────

/**
 * Agrega una entrada al historial con la expresión y el resultado.
 * Las entradas nuevas aparecen arriba (insertamos al principio de la lista).
 * @param {string} expresion  Ej: "8 + 3"
 * @param {string} resultado  Ej: "11"
 */
function agregarAlHistorial(expresion, resultado) {
  // La primera vez que se agrega un cálculo, quitamos el mensaje "Aún no hay cálculos"
  const mensajeVacio = listaHistorial.querySelector('.historial-vacio');
  if (mensajeVacio) mensajeVacio.remove();

  // Creamos los elementos con textContent en vez de innerHTML.
  // Buena práctica: nunca insertar texto de usuario directamente como HTML.
  const entrada = document.createElement('li');
  entrada.classList.add('historial-entrada');

  const spanExpresion = document.createElement('span');
  spanExpresion.classList.add('historial-expresion');
  spanExpresion.textContent = `${expresion} =`;

  const spanResultado = document.createElement('span');
  spanResultado.classList.add('historial-resultado');
  spanResultado.textContent = resultado;

  entrada.appendChild(spanExpresion);
  entrada.appendChild(spanResultado);

  // Insertamos al principio para que el más reciente quede arriba
  listaHistorial.insertBefore(entrada, listaHistorial.firstChild);
}

/**
 * Borra todas las entradas del historial y muestra el mensaje vacío.
 */
function borrarHistorial() {
  listaHistorial.innerHTML = '<li class="historial-vacio">Aún no hay cálculos</li>';
}

// Botón "Borrar" del historial
btnBorrarHistorial.addEventListener('click', borrarHistorial);

// ─── Escuchar clics en los botones ───────────────────────────────────────────
// querySelectorAll devuelve todos los elementos con clase "btn".
// forEach recorre cada uno y le añade un listener de clic.

document.querySelectorAll('.btn').forEach(boton => {
  boton.addEventListener('click', () => {
    const accion = boton.dataset.accion; // lee data-accion="..."
    const valor  = boton.dataset.valor;  // lee data-valor="..."

    switch (accion) {
      case 'numero':   ingresarNumero(valor);      break;
      case 'operador': seleccionarOperador(valor);  break;
      case 'igual':    calcular();                  break;
      case 'limpiar':  limpiar();                   break;
    }
  });
});

// ─── Soporte de teclado ───────────────────────────────────────────────────────
// keydown se dispara cada vez que el usuario presiona una tecla.

document.addEventListener('keydown', evento => {
  const tecla = evento.key;

  if      (tecla >= '0' && tecla <= '9') ingresarNumero(tecla);
  else if (tecla === '.')                ingresarNumero('.');
  else if (tecla === '+')                seleccionarOperador('+');
  else if (tecla === '-')                seleccionarOperador('-');
  else if (tecla === '*')                seleccionarOperador('*');
  else if (tecla === '/') {
    evento.preventDefault(); // evita que '/' abra la búsqueda del navegador
    seleccionarOperador('/');
  }
  else if (tecla === 'Enter' || tecla === '=') calcular();
  else if (tecla === 'Escape' || tecla === 'c') limpiar();
});
