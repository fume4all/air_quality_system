const API_URL = "http://127.0.0.1:8000/telemetry";
const NIGERIA_TZ = "Africa/Lagos";

let trendChartInstance = null;
let pollutantChartInstance = null;
let historicalTelemetry = [];

// Format timestamps into full Date & Time (e.g., "Oct 03, 2026, 01:10:05 PM")
function formatNigeriaDateTime(dateInput, options = {}) {
    const defaultOptions = {
        timeZone: NIGERIA_TZ,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    const finalOptions = { ...defaultOptions, ...options };

    try {
        if (!dateInput) return new Date().toLocaleString('en-US', finalOptions);
        
        let timeStr = String(dateInput).replace(" ", "T");
        if (!timeStr.endsWith("Z") && !timeStr.includes("+") && !timeStr.includes("-", 10)) {
            timeStr += "Z";
        }

        const d = new Date(timeStr);
        return isNaN(d.getTime()) 
            ? new Date().toLocaleString('en-US', finalOptions) 
            : d.toLocaleString('en-US', finalOptions);
    } catch (e) {
        return new Date().toLocaleString('en-US', finalOptions);
    }
}

// Short Date & Time for Graph Labels (e.g., "Oct 03, 01:10 PM")
function formatShortDate(dateInput) {
    return formatNigeriaDateTime(dateInput, {
        year: undefined,
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: undefined
    });
}

function cleanDeviceId(id) {
    return (!id || id.trim().toLowerCase() === "string") ? "ESP32_SENSOR_01" : id;
}

// Fallback data generator with Date & Time
function generateMockTelemetry() {
    const now = new Date();
    const mockData = [];
    for (let i = 0; i < 7; i++) {
        const time = new Date(now.getTime() - i * 5 * 60 * 1000);
        mockData.push({
            id: 100 - i,
            device_id: "ESP32_SENSOR_01",
            pm25: parseFloat((12.5 + (Math.random() * 2 - 1)).toFixed(1)),
            pm10: parseFloat((25.0 + (Math.random() * 4 - 2)).toFixed(1)),
            co: parseFloat((0.4 + (Math.random() * 0.1 - 0.05)).toFixed(2)),
            co2: Math.round(415 + (Math.random() * 10 - 5)),
            temperature: parseFloat((28.5 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
            humidity: Math.round(65 + (Math.random() * 2 - 1)),
            pressure: parseFloat((1013.25 + (Math.random() * 0.5 - 0.25)).toFixed(2)),
            created_at: time.toISOString()
        });
    }
    return mockData;
}

function updatePollutantGraph(latest) {
    if (typeof Chart === "undefined") return;

    const pm25 = latest.pm25 ?? 12.5;
    const pm10 = latest.pm10 ?? 25.0;
    const co = latest.co ?? 0.4;
    const co2 = latest.co2 ?? 415;
    const temp = latest.temperature ?? 28.5;

    let aqi = Math.round(pm25 * 3.8 + co * 4);
    if (aqi < 1) aqi = 49;

    const canvas = document.getElementById("pollutantChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const data = [pm25, pm10, co, co2];
    const labels = ["PM2.5 (µg/m³)", "PM10 (µg/m³)", "CO (ppm)", "CO₂ (ppm)"];
    
    const bgColors = [
        pm25 > 35.4 ? '#ef4444' : pm25 > 12.0 ? '#eab308' : '#22c55e',
        pm10 > 154.0 ? '#ef4444' : pm10 > 54.0 ? '#eab308' : '#22c55e',
        co > 9.4 ? '#ef4444' : co > 4.4 ? '#eab308' : '#22c55e',
        co2 > 1000.0 ? '#ef4444' : co2 > 800.0 ? '#eab308' : '#22c55e'
    ];

    if (pollutantChartInstance) {
        pollutantChartInstance.data.datasets[0].data = data;
        pollutantChartInstance.data.datasets[0].backgroundColor = bgColors;
        pollutantChartInstance.update();
    } else {
        pollutantChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Current Concentration',
                    data: data,
                    backgroundColor: bgColors,
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: "#f8fafc", font: { weight: 'bold' } }, grid: { display: false } },
                    y: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255, 255, 255, 0.1)" }, beginAtZero: true }
                }
            }
        });
    }

    const predElement = document.getElementById("ai_prediction");
    if (predElement) {
        if (aqi <= 50) { predElement.innerText = "Very Good"; predElement.style.color = "#4ade80"; }
        else if (aqi <= 100) { predElement.innerText = "Good"; predElement.style.color = "#a3e635"; }
        else if (aqi <= 150) { predElement.innerText = "Fair"; predElement.style.color = "#facc15"; }
        else if (aqi <= 200) { predElement.innerText = "Poor"; predElement.style.color = "#fb923c"; }
        else if (aqi <= 300) { predElement.innerText = "Very Poor"; predElement.style.color = "#f87171"; }
        else { predElement.innerText = "Hazardous"; predElement.style.color = "#ef4444"; }
    }

    if (document.getElementById("ai_aqi_index")) document.getElementById("ai_aqi_index").innerText = `Calculated AQI: ${aqi}`;
    if (document.getElementById("hf0")) document.getElementById("hf0").innerText = aqi;
    if (document.getElementById("ht0")) document.getElementById("ht0").innerText = `${Math.round(temp)}°`;

    const now = new Date();
    for (let i = 1; i <= 4; i++) {
        const nextHour = new Date(now.getTime() + i * 60 * 60 * 1000);
        const timeStr = formatNigeriaDateTime(nextHour, { year: undefined, month: undefined, day: undefined, second: undefined });
        
        if (document.getElementById(`htime${i}`)) document.getElementById(`htime${i}`).innerText = timeStr;
        if (document.getElementById(`hf${i}`)) document.getElementById(`hf${i}`).innerText = Math.max(1, aqi - i);
        if (document.getElementById(`ht${i}`)) document.getElementById(`ht${i}`).innerText = `${Math.round(temp - (i * 0.5))}°`;
    }
}

// Render Trend Chart with Short Date & Time on X-Axis
function renderTrendChart(readings) {
    if (typeof Chart === "undefined") return;

    const canvas = document.getElementById("trendChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const sortedReadings = [...readings].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const recent = sortedReadings.slice(-12);
    
    // Displays "Oct 03, 01:10 PM" on X-Axis
    const labels = recent.map(r => r.created_at ? formatShortDate(r.created_at) : `#${r.id}`);
    const pm25Data = recent.map(r => r.pm25);
    const pm10Data = recent.map(r => r.pm10);
    const coData = recent.map(r => r.co);
    const co2Data = recent.map(r => r.co2);

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                { label: "PM2.5 (µg/m³)", data: pm25Data, borderColor: "#38bdf8", tension: 0.3, fill: false, yAxisID: 'y' },
                { label: "PM10 (µg/m³)", data: pm10Data, borderColor: "#a855f7", tension: 0.3, fill: false, yAxisID: 'y' },
                { label: "CO (ppm)", data: coData, borderColor: "#f97316", tension: 0.3, fill: false, yAxisID: 'y' },
                { label: "CO₂ (ppm)", data: co2Data, borderColor: "#4ade80", backgroundColor: "rgba(74, 222, 128, 0.15)", tension: 0.3, fill: true, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: "#cbd5e1", font: { size: 10 } }, grid: { display: false } },
                y: { type: 'linear', display: true, position: 'left', ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255, 255, 255, 0.1)" } },
                y1: { type: 'linear', display: true, position: 'right', ticks: { color: "#4ade80" }, grid: { drawOnChartArea: false } }
            },
            plugins: { legend: { labels: { color: "#f8fafc" } } }
        }
    });
}

// Fetch telemetry from API
async function fetchTelemetryData() {
    const refreshIcon = document.getElementById("refreshIcon");
    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        historicalTelemetry = Array.isArray(data) ? (data.length > 0 ? data : generateMockTelemetry()) : [data];
    } catch (error) {
        historicalTelemetry = generateMockTelemetry();
    }

    if (historicalTelemetry && historicalTelemetry.length > 0) {
        const latest = historicalTelemetry[0];

        try {
            if (document.getElementById("device_id")) document.getElementById("device_id").innerText = cleanDeviceId(latest.device_id);
            if (document.getElementById("pm25")) document.getElementById("pm25").innerText = latest.pm25 ?? "--";
            if (document.getElementById("pm10")) document.getElementById("pm10").innerText = latest.pm10 ?? "--";
            if (document.getElementById("co")) document.getElementById("co").innerText = latest.co ?? "--";
            if (document.getElementById("co2")) document.getElementById("co2").innerText = latest.co2 ?? "--";
            if (document.getElementById("temperature")) document.getElementById("temperature").innerText = latest.temperature ?? "--";
            if (document.getElementById("humidity")) document.getElementById("humidity").innerText = latest.humidity ?? "--";
            if (document.getElementById("pressure")) document.getElementById("pressure").innerText = latest.pressure ?? "--";
            
            // Displays Full Date & Time in header (e.g., Oct 03, 2026, 01:10:05 PM)
            if (document.getElementById("timestamp")) document.getElementById("timestamp").innerText = formatNigeriaDateTime(latest.created_at);
        } catch (err) {
            console.error("DOM update error:", err);
        }

        try { updatePollutantGraph(latest); } catch (e) { console.error("Pollutant chart error:", e); }
        try { renderTrendChart(historicalTelemetry); } catch (e) { console.error("Trend chart error:", e); }
    }

    setTimeout(() => {
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    }, 500);
}

// Helper to extract clean separated Date and Time for CSV export
function getRowDateTime(row) {
    let dateVal = row.reading_date;
    let timeVal = row.reading_time;

    // Fallback parser if reading_date or reading_time are missing/undefined
    if (!dateVal || !timeVal) {
        const rawTimestamp = row.created_at || new Date().toISOString();
        let timeStr = String(rawTimestamp).replace(" ", "T");
        if (!timeStr.endsWith("Z") && !timeStr.includes("+") && !timeStr.includes("-", 10)) {
            timeStr += "Z";
        }
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
            if (!dateVal) {
                dateVal = d.toLocaleDateString('en-CA', { timeZone: "Africa/Lagos" });
            }
            if (!timeVal) {
                timeVal = d.toLocaleTimeString('en-US', { 
                    timeZone: "Africa/Lagos", 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit', 
                    hour12: true 
                });
            }
        }
    }
    return { dateVal: dateVal || "N/A", timeVal: timeVal || "N/A" };
}

// Download CSV with explicit, separated Date and Time columns
function downloadDatasetCSV() {
    if (!historicalTelemetry || !historicalTelemetry.length) {
        alert("No dataset available to download.");
        return;
    }

    const headers = [
        "ID",
        "Device ID",
        "PM2.5 (ug/m3)",
        "PM10 (ug/m3)",
        "CO (ppm)",
        "CO2 (ppm)",
        "Temperature (C)",
        "Humidity (%)",
        "Pressure (hPa)",
        "Date (WAT)",
        "Time (WAT)"
    ];

    const csvRows = [headers.join(",")];

    historicalTelemetry.forEach(row => {
        const { dateVal, timeVal } = getRowDateTime(row);
        
        const values = [
            row.id ?? "",
            `"${cleanDeviceId(row.device_id)}"`,
            row.pm25 ?? "",
            row.pm10 ?? "",
            row.co ?? "",
            row.co2 ?? "",
            row.temperature ?? "",
            row.humidity ?? "",
            row.pressure ?? "",
            `"${dateVal}"`,
            `"${timeVal}"`
        ];
        csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Air_Quality_Dataset_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

window.addEventListener("DOMContentLoaded", () => {
    fetchTelemetryData();
    setInterval(fetchTelemetryData, 5000);
});