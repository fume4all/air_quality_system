const pollutantCanvas = document.getElementById("pollutantChart");
const trendCanvas = document.getElementById("trendChart");

const pollutantChart = pollutantCanvas ? new Chart(pollutantCanvas, {
  type: "bar",
  data: {
    labels: ["PM2.5", "PM10", "CO", "CO₂", "Temp", "Humidity", "Pressure"],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, 0],
      backgroundColor: ["#38bdf8", "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#a855f7"],
      borderWidth: 0,
      borderRadius: 6,
      maxBarThickness: 44,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,.08)" } },
      x: { ticks: { color: "#cbd5e1" }, grid: { display: false } },
    },
  },
}) : null;

const trendChart = trendCanvas ? new Chart(trendCanvas, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "PM2.5", data: [], borderColor: "#38bdf8", tension: 0.3, yAxisID: "y" },
      { label: "PM10", data: [], borderColor: "#a855f7", tension: 0.3, yAxisID: "y" },
      { label: "CO", data: [], borderColor: "#f59e0b", tension: 0.3, yAxisID: "y" },
      { label: "CO₂", data: [], borderColor: "#10b981", tension: 0.3, yAxisID: "y" },
      { label: "Temp °C", data: [], borderColor: "#ef4444", tension: 0.3, yAxisID: "y" },
      { label: "Humidity %", data: [], borderColor: "#06b6d4", tension: 0.3, yAxisID: "y" },
      { label: "Pressure", data: [], borderColor: "#8b5cf6", tension: 0.3, yAxisID: "y1" },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { labels: { color: "#cbd5e1", boxWidth: 10, font: { size: 9 } } } },
    scales: {
      y: { beginAtZero: true, ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,.08)" } },
      y1: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#a855f7" } },
      x: { ticks: { color: "#cbd5e1", maxTicksLimit: 8 }, grid: { display: false } },
    },
  },
}) : null;

let previousAqi = null;
let refreshInProgress = false;

function formatSensorValue(value, decimals = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(decimals).replace(/\.0$/, "") : "--";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function statusColor(status) {
  if (status === "Very Good" || status === "Good") return "#4ade80";
  if (status === "Fair") return "#facc15";
  if (status === "Poor") return "#fb923c";
  return "#ef4444";
}

function animateAqi(end) {
  const target = document.getElementById("ai_aqi_index");
  if (!target) return;
  const endNumber = Number.isFinite(Number(end)) ? Number(end) : 0;
  const startNumber = previousAqi ?? endNumber;
  if (startNumber === endNumber) {
    target.textContent = `Calculated AQI: ${endNumber}`;
    return;
  }
  const started = performance.now();
  const duration = 450;
  const frame = (now) => {
    const progress = Math.min((now - started) / duration, 1);
    const value = Math.round(startNumber + (endNumber - startNumber) * progress);
    target.textContent = `Calculated AQI: ${value}`;
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  previousAqi = endNumber;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal, cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function fetchLatest() {
  const data = await fetchJson("/api/latest-sensor-data");
  setText("device_id", data.device_id || "Unknown");
  setText("timestamp", data.timestamp || "--");

  const sensors = ["pm25", "pm10", "co", "co2", "temperature", "humidity", "pressure"];
  sensors.forEach((key) => setText(key, formatSensorValue(data[key])));

  const status = data.aqi_status || "Waiting for Data";
  setText("ai_prediction", status);
  const aiStatus = document.getElementById("ai_prediction");
  if (aiStatus) aiStatus.style.color = statusColor(status);
  animateAqi(data.calculated_aqi ?? 0);
  setText("aqi-status-text", status);
  setText("calculated-aqi-value", String(data.calculated_aqi ?? 0));

  if (pollutantChart) {
    pollutantChart.data.datasets[0].data = sensors.map((key) =>
      Number.isFinite(Number(data[key])) ? Number(data[key]) : 0
    );
    pollutantChart.update();
  }
}

async function fetchForecast() {
  const forecast = await fetchJson("/api/hourly-forecast");
  if (!Array.isArray(forecast)) return;
  forecast.slice(0, 5).forEach((item, index) => {
    setText(`hf${index}`, item.aqi ?? "--");
    setText(`ht${index}`, `${formatSensorValue(item.temperature, 0)}°`);
    if (index > 0) setText(`htime${index}`, item.time || "--:--");
  });
}

async function fetchHistory() {
  const history = await fetchJson("/api/historical-trends");
  if (!Array.isArray(history) || !trendChart) return;
  trendChart.data.labels = history.map((item) => item.timestamp || "");
  const keys = ["pm25", "pm10", "co", "co2", "temperature", "humidity", "pressure"];
  keys.forEach((key, index) => {
    trendChart.data.datasets[index].data = history.map((item) => Number(item[key]));
  });
  trendChart.update();
}

async function fetchAllData() {
  if (refreshInProgress) return;
  refreshInProgress = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const latestResponse = await fetchJson("/api/latest-sensor-data", controller.signal);
    const data = latestResponse;
    setText("device_id", data.device_id || "Unknown");
    setText("timestamp", data.timestamp || "--");
    ["pm25", "pm10", "co", "co2", "temperature", "humidity", "pressure"].forEach((key) => {
      setText(key, formatSensorValue(data[key]));
    });
    const status = data.aqi_status || "Waiting for Data";
    setText("ai_prediction", status);
    const aiStatus = document.getElementById("ai_prediction");
    if (aiStatus) aiStatus.style.color = statusColor(status);
    animateAqi(data.calculated_aqi ?? 0);
    setText("aqi-status-text", status);
    setText("calculated-aqi-value", String(data.calculated_aqi ?? 0));
    if (pollutantChart) {
      pollutantChart.data.datasets[0].data = ["pm25", "pm10", "co", "co2", "temperature", "humidity", "pressure"].map((key) =>
        Number.isFinite(Number(data[key])) ? Number(data[key]) : 0
      );
      pollutantChart.update();
    }
    await Promise.allSettled([fetchForecast(), fetchHistory()]);
  } catch (error) {
    if (error.name !== "AbortError") console.error("Telemetry refresh failed:", error);
    setText("device_id", "Connection unavailable");
  } finally {
    clearTimeout(timeout);
    refreshInProgress = false;
  }
}

const refreshButton = document.getElementById("refreshBtn");
const refreshIcon = document.getElementById("refreshIcon");
if (refreshButton) {
  refreshButton.addEventListener("click", async () => {
    refreshIcon?.classList.add("fa-spin");
    refreshButton.disabled = true;
    try {
      await fetchAllData();
    } finally {
      refreshButton.disabled = false;
      setTimeout(() => refreshIcon?.classList.remove("fa-spin"), 400);
    }
  });
}

fetchAllData();
setInterval(fetchAllData, 15000);
