const API = "/api";
let token = localStorage.getItem("admin_token") || "";

const loginSection = document.getElementById("loginSection");
const workspace = document.getElementById("workspace");
const loginStatus = document.getElementById("loginStatus");
const bookingsContainer = document.getElementById("bookings");

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function setLoggedInState() {
  if (token) {
    loginSection.classList.add("hidden");
    workspace.classList.remove("hidden");
  }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  const res = await fetch(`${API}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    loginStatus.textContent = "Ошибка авторизации";
    return;
  }
  const payload = await res.json();
  token = payload.access_token;
  localStorage.setItem("admin_token", token);
  setLoggedInState();
  loadBookings();
  loadGrid();
});

async function loadBookings() {
  const res = await fetch(`${API}/bookings`, { headers: authHeaders() });
  if (!res.ok) {
    bookingsContainer.innerHTML = "Не удалось загрузить";
    return;
  }
  const items = await res.json();
  bookingsContainer.innerHTML = `<table class="grid-table"><tr><th>ID</th><th>Место</th><th>Даты</th><th>Статус</th><th>CRM</th><th>CRM retry</th></tr>${items
    .map(
      (b) => `<tr>
      <td>${b.id}</td>
      <td>${b.spot_id}</td>
      <td>${b.check_in} → ${b.check_out}</td>
      <td>${b.status}</td>
      <td>${b.crm_sync_status}</td>
      <td><button onclick="resync(${b.id})">Повторить</button></td>
      </tr>`,
    )
    .join("")}</table>`;
}

window.resync = async function resync(id) {
  await fetch(`${API}/bookings/${id}/resync-crm`, { method: "POST", headers: authHeaders() });
  loadBookings();
};

function formatDate(value) {
  return value.toISOString().slice(0, 10);
}

async function loadGrid() {
  const input = document.getElementById("gridFrom");
  if (!input.value) {
    input.value = formatDate(new Date());
  }
  const from = new Date(input.value);
  const to = new Date(from);
  to.setDate(from.getDate() + 14);

  const [spotsRes, gridRes] = await Promise.all([
    fetch(`${API}/spots`),
    fetch(`${API}/bookings/grid?date_from=${formatDate(from)}&date_to=${formatDate(to)}`, { headers: authHeaders() }),
  ]);
  const spots = await spotsRes.json();
  const items = await gridRes.json();

  const dates = [];
  const cursor = new Date(from);
  while (cursor < to) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const occupancy = new Map();
  items.forEach((i) => {
    dates.forEach((d) => {
      if (d >= i.check_in && d < i.check_out) occupancy.set(`${i.spot_id}_${d}`, i);
    });
  });

  const table = [`<table class="grid-table"><tr><th>Место</th>${dates.map((d) => `<th>${d.slice(5)}</th>`).join("")}</tr>`];
  spots.forEach((spot) => {
    table.push(`<tr><td>${spot.name}</td>`);
    dates.forEach((d) => {
      const cell = occupancy.get(`${spot.id}_${d}`);
      table.push(`<td class="${cell ? "busy" : "free"}" title="${cell ? `${cell.customer_name} (#${cell.booking_id})` : "Свободно"}">${cell ? "●" : ""}</td>`);
    });
    table.push("</tr>");
  });
  table.push("</table>");
  document.getElementById("grid").innerHTML = table.join("");
}

document.getElementById("loadBookings").addEventListener("click", loadBookings);
document.getElementById("loadGrid").addEventListener("click", loadGrid);

document.getElementById("blockForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  data.spot_id = Number(data.spot_id);
  const res = await fetch(`${API}/blocks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const status = document.getElementById("blockStatus");
  if (res.ok) {
    status.textContent = "Блокировка создана";
    loadGrid();
  } else {
    const err = await res.json();
    status.textContent = err.detail || "Ошибка";
  }
});

setLoggedInState();
if (token) {
  loadBookings();
  loadGrid();
}
