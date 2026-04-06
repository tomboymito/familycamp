const API = "/api";

const spotsList = document.getElementById("spotsList");
const spotSelect = document.getElementById("spotSelect");
const bookingForm = document.getElementById("bookingForm");
const formStatus = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");

async function fetchSpots() {
  const res = await fetch(`${API}/spots`);
  const spots = await res.json();
  spotsList.innerHTML = "";
  spotSelect.innerHTML = "";
  spots.forEach((spot) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h3>${spot.name}</h3><p>Тип: ${spot.type}</p><p>Вместимость: ${spot.capacity}</p>`;
    spotsList.appendChild(div);

    const option = document.createElement("option");
    option.value = spot.id;
    option.textContent = `${spot.name} (${spot.type})`;
    spotSelect.appendChild(option);
  });
}

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formStatus.textContent = "Отправка...";
  submitBtn.disabled = true;

  const formData = new FormData(bookingForm);
  const payload = Object.fromEntries(formData.entries());
  payload.spot_id = Number(payload.spot_id);
  payload.guests_count = Number(payload.guests_count);

  try {
    const availability = await fetch(`${API}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spot_id: payload.spot_id,
        check_in: payload.check_in,
        check_out: payload.check_out,
      }),
    });
    const avail = await availability.json();
    if (!avail.available) {
      formStatus.textContent = "Выбранные даты недоступны.";
      return;
    }

    const response = await fetch(`${API}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json();
      formStatus.textContent = err.detail || "Ошибка при бронировании.";
      return;
    }

    const booking = await response.json();
    bookingForm.reset();
    formStatus.textContent = `Бронь #${booking.id} успешно создана. Мы свяжемся с вами.`;
  } catch {
    formStatus.textContent = "Техническая ошибка. Попробуйте позже.";
  } finally {
    submitBtn.disabled = false;
  }
});

fetchSpots();
