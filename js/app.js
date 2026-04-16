// ===============================
// VARIABLES
// ===============================
let clientes = [];
let trabajos = [];
let vendedores = [];

// ===============================
// FIREBASE LISTENERS
// ===============================
db.collection("clientes").onSnapshot(snapshot => {
  clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  actualizarClientes();
});

db.collection("trabajos").onSnapshot(snapshot => {
  trabajos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  actualizarTrabajos();
});

db.collection("vendedores").onSnapshot(snapshot => {
  vendedores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  actualizarVendedores();
});

// ===============================
// CLIENTES
// ===============================
function actualizarClientes() {
  actualizarListaClientes();
}

function actualizarListaClientes() {
  const lista = document.getElementById('lista-clientes');
  const select = document.getElementById('trabajo-cliente');
  if (!lista || !select) return;

  lista.innerHTML = '';
  select.innerHTML = '<option value="">Seleccionar cliente...</option>';

  clientes.forEach(c => {
    lista.innerHTML += `
      <div class="item-lista">
        <strong>${c.nombre}</strong><br>
        📱 ${c.telefono}
        ${c.email ? `<br>✉️ ${c.email}` : ''}
      </div>
    `;

    select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });
}

function agregarCliente() {
  const nombre = document.getElementById('cliente-nombre').value.trim();
  const telefono = document.getElementById('cliente-telefono').value.trim();
  const email = document.getElementById('cliente-email').value.trim();

  if (!nombre || !telefono) return alert("❌ Nombre y teléfono obligatorios");

  db.collection("clientes").add({
    nombre,
    telefono,
    email,
    fecha: new Date().toLocaleDateString('es-CO')
  }).then(() => {
    alert("✅ Cliente guardado");
    document.getElementById('cliente-nombre').value = '';
    document.getElementById('cliente-telefono').value = '';
    document.getElementById('cliente-email').value = '';
  });
}

// VENDEDORES
function actualizarVendedores() {
  actualizarSelectVendedores();
  actualizarTablaVendedores();
}

function actualizarSelectVendedores() {
  const select = document.getElementById("trabajo-vendedor");
  if (!select) return;

  select.innerHTML = '<option value="">Seleccione vendedor</option>';
  vendedores.forEach(v => {
    select.innerHTML += `<option value="${v.nombre}">${v.nombre}</option>`;
  });
}

function crearVendedorDesdeInput() {
  const input = document.getElementById("nuevo-vendedor");
  const nombre = input.value.trim();

  if (!nombre) return alert("❌ Ingresa un nombre");

  db.collection("vendedores").add({ nombre })
    .then(() => {
      alert("✅ Vendedor creado");
      input.value = "";
    });
}

function actualizarTablaVendedores() {
  const tbody = document.querySelector('#tabla-vendedores tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const resumen = {};

  trabajos.forEach(t => {
    const v = t.vendedor || "Sin asignar";

    if (!resumen[v]) resumen[v] = { total: 0, ganancia: 0 };

    resumen[v].total++;
    if (t.estado === "Entregado") {
      resumen[v].ganancia += t.ganancia || 0;
    }
  });

  vendedores.forEach(v => {
    const data = resumen[v.nombre] || { total: 0, ganancia: 0 };

    tbody.innerHTML += `
      <tr>
        <td><strong>${v.nombre}</strong></td>
        <td>${data.total}</td>
        <td>$${data.ganancia.toLocaleString('es-CO')}</td>
      </tr>
    `;
  });
}

// TRABAJOS
function actualizarTrabajos() {
  actualizarTabla();
  actualizarStats();
  actualizarTablaVendedores();
}

function agregarTrabajo() {
  const clienteId = document.getElementById('trabajo-cliente').value;
  const dispositivo = document.getElementById('trabajo-dispositivo').value.trim();
  const problema = document.getElementById('trabajo-problema').value.trim();
  const reparacion = parseFloat(document.getElementById('trabajo-valor-reparacion').value) || 0;
  const repuesto = parseFloat(document.getElementById('trabajo-repuesto').value) || 0;
  const domicilio = parseFloat(document.getElementById('trabajo-domicilio').value) || 0;
  const vendedor = document.getElementById('trabajo-vendedor').value || "";

  if (!clienteId || !dispositivo || reparacion <= 0) {
    return alert("❌ Completa los datos");
  }

  const cliente = clientes.find(c => c.id === clienteId);
  const ganancia = (reparacion - (repuesto + domicilio)) * 0.25;
  const ahora = new Date();

  db.collection("trabajos").add({
    cliente: cliente.nombre,
    telefono: cliente.telefono,
    dispositivo,
    problema,
    reparacion,
    repuesto,
    domicilio,
    vendedor,
    ganancia,
    fecha: ahora.toLocaleString('es-CO'),
    isoFecha: ahora.toISOString(),
    estado: 'En reparación'
  }).then(() => alert("✅ Trabajo creado"));
}

function actualizarTabla() {
  const tbody = document.querySelector('#tabla-trabajos tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  trabajos
    .sort((a, b) => new Date(b.isoFecha) - new Date(a.isoFecha))
    .forEach(t => {

      const ingresos = t.reparacion || 0;
      const costos = (t.repuesto || 0) + (t.domicilio || 0);

      const ganancia = t.estado === "Entregado"
        ? (ingresos - costos) * 0.25
        : 0;

      const estadoClase =
        t.estado === "Entregado" ? "estado verde" :
        t.estado === "En reparación" ? "estado amarillo" :
        "estado azul";

      tbody.innerHTML += `
        <tr>
          <td>
            <strong>${t.cliente}</strong><br>
            <small>${t.telefono || ''}</small>
          </td>

          <td>${t.dispositivo}</td>

          <td><span class="${estadoClase}">${t.estado}</span></td>

          <td class="ingresos">
            $${ingresos.toLocaleString('es-CO')}
          </td>

          <td class="costos">
            $${costos.toLocaleString('es-CO')}
          </td>

          <td class="${ganancia > 0 ? 'ganancia-verde' : 'ganancia-roja'}">
            $${ganancia.toLocaleString('es-CO')}
          </td>

          <td>
            ${new Date(t.isoFecha).toLocaleString('es-CO')}
          </td>

          <td class="acciones">
            <button onclick="cambiarEstado('${t.id}','En reparación')">🟡</button>
            <button onclick="cambiarEstado('${t.id}','Por entregar')">🔵</button>
            <button onclick="cambiarEstado('${t.id}','Entregado')">🟢</button>
            <button onclick="eliminarTrabajo('${t.id}')">🗑️</button>
          </td>
        </tr>
      `;
    });
}

// ACCIONES
function eliminarTrabajo(id) {
  if (!confirm("¿Eliminar trabajo?")) return;

  db.collection("trabajos").doc(id).delete()
    .then(() => alert("🗑️ Eliminado"));
}

function cambiarEstado(id, estado) {
  db.collection("trabajos").doc(id).update({ estado });
}

// STATS
function actualizarStats() {
  const trabajosEl = document.getElementById('total-trabajos');
  const gananciasEl = document.getElementById('total-ganancias');

  if (!trabajosEl || !gananciasEl) return;

  trabajosEl.textContent = trabajos.length;

  const total = trabajos.reduce((acc, t) => acc + (t.ganancia || 0), 0);
  gananciasEl.textContent = `$${total.toLocaleString('es-CO')}`;
}

// ===============================
// UI
// ===============================
function mostrarVista(id){
  document.querySelectorAll("main section").forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";

  document.querySelectorAll(".sidebar ul li").forEach(li => li.classList.remove("active"));
  const item = document.querySelector(`.sidebar ul li[onclick="mostrarVista('${id}')"]`);
  if(item) item.classList.add("active");

  // 🔥 CERRAR SIDEBAR EN MÓVIL
  document.querySelector(".sidebar").classList.remove("active");
}

// ===============================
// LOGIN
// ===============================
firebase.auth().onAuthStateChanged(user => {
  document.getElementById("login-screen").style.display = user ? "none" : "block";
  document.getElementById("app").style.display = user ? "block" : "none";
});

function iniciarSesion() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .catch(error => alert(error.message));
}

// CERRAR SIDEBAR AL TOCAR FUERA (MÓVIL)
document.addEventListener("click", function(e) {
  const sidebar = document.querySelector(".sidebar");
  const btn = document.querySelector(".btn-icon");

  if (!sidebar.classList.contains("active")) return;

  // si el click NO fue dentro del sidebar ni en el botón
  if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
    sidebar.classList.remove("active");
  }
});
function toggleMenu(){
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("active");
}

function calcularGanancia(t) {
  const ingresos = t.reparacion || 0;
  const costos = (t.repuesto || 0) + (t.domicilio || 0);

  if (t.estado !== "Entregado") return 0;

  return (ingresos - costos) * 0.25;
}