const API_BASE_URL = "https://airqualitysystem-production.up.railway.app";

let pollutantChart, trendChart;

function getAqiColor(level) {
    switch ((level || '').toLowerCase()) {
        case 'very good': case 'good': return '#22c55e';
        case 'fair': return '#eab308';
        case 'poor': return '#f97316';
        case 'very poor': return '#ef4444';
        case 'hazardous': return '#991b1b';
        default: return '#38bdf8';
    }
}

function initCharts() {
    // Pollutant Breakdown Bar Chart
    const ctxPollutant = document.getElementById('pollutantChart').getContext('2d');
    pollutantChart = new Chart(ctxPollutant, {
        type: 'bar',
        data: {
            labels: ['PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'CO (ppm)', 'CO₂ (ppm)'],
            datasets: [{
                label: 'Concentration Level',
                data: [0, 0, 0, 0],
                backgroundColor: ['#38bdf8', '#818cf8', '#f59e0b', '#10b981'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                x: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
            }
        }
    });

    // Historical Telemetry Trends Line Chart (Includes AQI, PM2.5, PM10, CO, CO2, Temp, Pressure)
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'AQI Index', data: [], borderColor: '#38bdf8', tension: 0.3, fill: false },
                { label: 'PM2.5', data: [], borderColor: '#f97316', tension: 0.3, fill: false },
                { label: 'PM10', data: [], borderColor: '#818cf8', tension: 0.3, fill: false },
                { label: 'CO', data: [], borderColor: '#facc15', tension: 0.3, fill: false },
                { label: 'CO₂', data: [], borderColor: '#34d399', tension: 0.3, fill: false },
                { label: 'Temperature (°C)', data: [], borderColor: '#ef4444', tension: 0.3, fill: false },
                { label: 'Pressure (hPa)', data: [], borderColor: '#a855f7', tension: 0.3, fill: false, hidden: true }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#cbd5e1', boxWidth: 12, font: { size: 10 } } } },
            scales: {
                y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                x: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
            }
        }
    });
}

async function fetchTelemetryData() {
    const refreshIcon = document.getElementById("refreshIcon");
    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API request failed");
        const data = await response.json();

        if (data && data.length > 0) {
            const latest = data[data.length - 1];

            // Update Header Meta (Strictly formatted to Nigeria Date and 24-Hour Time)
            document.getElementById("device_id").innerText = latest.device_id || "ESP32_SENSOR_01";
            
            const timestampObj = new Date(latest.created_at || Date.now());
            const nigeriaDateTimeStr = timestampObj.toLocaleString('en-GB', {
                timeZone: 'Africa/Lagos',
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false // 24-hour format
            });

            document.getElementById("timestamp").innerText = nigeriaDateTimeStr;

            document.getElementById("timestamp").innerText = nigeriaDateTimeStr;
            // Update Parameters Grid
            document.getElementById("pm25").innerText = latest.pm25 ?? '--';
            document.getElementById("pm10").innerText = latest.pm10 ?? '--';
            document.getElementById("co").innerText = latest.co ?? '--';
            document.getElementById("co2").innerText = latest.co2 ?? '--';
            document.getElementById("temperature").innerText = latest.temperature ?? '--';
            document.getElementById("humidity").innerText = latest.humidity ?? '--';
            document.getElementById("pressure").innerText = latest.pressure ?? '--';

            // AI Classification Card
            const aiPredElem = document.getElementById("ai_prediction");
            aiPredElem.innerText = latest.aqi_level || "Analyzing...";
            aiPredElem.style.color = getAqiColor(latest.aqi_level);
            document.getElementById("ai_aqi_index").innerText = `AQI Index: ${latest.aqi || '--'}`;

            // Update Pollutant Bar Chart
            pollutantChart.data.datasets[0].data = [latest.pm25 || 0, latest.pm10 || 0, latest.co || 0, latest.co2 || 0];
            pollutantChart.update();

            // Update Historical Telemetry Trends Line Chart (Last 10 Records)
            const recentData = data.slice(-10);
            trendChart.data.labels = recentData.map(r => new Date(r.created_at || Date.now()).toLocaleTimeString('en-GB', {
                timeZone: 'Africa/Lagos',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }));
            
            trendChart.data.datasets[0].data = recentData.map(r => r.aqi !== undefined ? r.aqi : (r.pm25 ? (50 / 12.0) * r.pm25 : 0));
            trendChart.data.datasets[1].data = recentData.map(r => r.pm25 || 0);
            trendChart.data.datasets[2].data = recentData.map(r => r.pm10 || 0);
            trendChart.data.datasets[3].data = recentData.map(r => r.co || 0);
            trendChart.data.datasets[4].data = recentData.map(r => r.co2 || 0);
            trendChart.data.datasets[5].data = recentData.map(r => r.temperature || 0);
            trendChart.data.datasets[6].data = recentData.map(r => r.pressure || 0);
            trendChart.update();

            // Update Hourly Forecast Section
            const now = new Date();
            for (let i = 0; i < 5; i++) {
                const targetTime = new Date(now.getTime() + i * 3600000);
                const timeStr = i === 0 ? "Now" : targetTime.toLocaleTimeString('en-GB', {
                    timeZone: 'Africa/Lagos',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                
                if (i > 0) {
                    const timeElem = document.getElementById(`htime${i}`);
                    if (timeElem) timeElem.innerText = timeStr;
                }
                
                const hfElem = document.getElementById(`hf${i}`);
                if (hfElem) hfElem.innerText = Math.max(10, Math.round((latest.aqi || 50) - (i * 2)));
                
                const htElem = document.getElementById(`ht${i}`);
                if (htElem) htElem.innerText = `${Math.round((latest.temperature || 28) + (i * 0.5))}°`;
            }
        }
    } catch (err) {
        console.error("Error fetching telemetry:", err);
    } finally {
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    }
}

// Initialize charts and triggers on DOM Load
window.addEventListener("DOMContentLoaded", () => {
    initCharts();
    fetchTelemetryData();
    setInterval(fetchTelemetryData, 15000); // Refresh every 15 seconds
});
function downloadCSV(event) {
    if (event) event.preventDefault();
    
    if (!window.latestTelemetryData || window.latestTelemetryData.length === 0) {
        alert("Data is loading or unavailable. Please try again in a moment.");
        return;
    }

    const headers = [
        "id", "device_id", "pm25", "pm10", "co", "co2", 
        "temperature", "humidity", "pressure", "aqi", "aqi_level", "date", "time"
    ];
    let csvContent = headers.join(",") + "\n";

    window.latestTelemetryData.forEach(row => {
        let dateStr = "";
        let timeStr = "";

        const rawTimestamp = row.created_at || row.timestamp;

        if (rawTimestamp) {
            const dt = new Date(rawTimestamp);
            if (!isNaN(dt.getTime())) {
                // Convert to West Africa Time (WAT, GMT+1)
                const watDate = new Date(dt.getTime() + (1 * 60 * 60 * 1000));
                
                const day = String(watDate.getUTCDate()).padStart(2, '0');
                const month = String(watDate.getUTCMonth() + 1).padStart(2, '0');
                const year = String(watDate.getUTCFullYear()).slice(-2);
                dateStr = `${day}-${month}-${year}`;

                const hours = String(watDate.getUTCHours()).padStart(2, '0');
                const minutes = String(watDate.getUTCMinutes()).padStart(2, '0');
                const seconds = String(watDate.getUTCSeconds()).padStart(2, '0');
                timeStr = `${hours}:${minutes}:${seconds}`;
            }
        } else {
            dateStr = row.date || "";
            timeStr = row.time || "";
        }

        const formattedRow = {
            ...row,
            date: dateStr,
            time: timeStr
        };

        const values = headers.map(header => {
            let val = formattedRow[header] !== undefined && formattedRow[header] !== null ? formattedRow[header] : "";
            return `"${val}"`;
        });
        csvContent += values.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Air_Quality_Dataset.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Automatically attach this function to your "Download Dataset (CSV)" button/link
document.addEventListener("click", function(e) {
    if (e.target && e.target.textContent.includes("Download Dataset")) {
        downloadCSV(e);
    }
});

// Automatically fetch and store telemetry data for the CSV download button
fetch("https://air-quality-system-r8np.onrender.com/telemetry")
  .then(response => response.json())
  .then(data => {
      window.latestTelemetryData = data;
  })
  .catch(err => console.error("Error loading telemetry data:", err));