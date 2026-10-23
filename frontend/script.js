// Define your API base URL
const API_BASE_URL = "http://127.0.0.1:8000"; // Or your Render URL when deployed

// 1. Initialize Chart.js for the 7-Parameter Pollutant Bar Chart
const pollutantCtx = document.getElementById('pollutantChart').getContext('2d');
const pollutantChart = new Chart(pollutantCtx, {
    type: 'bar',
    data: {
        labels: ['PM2.5', 'PM10', 'CO', 'CO₂', 'Temp (°C)', 'Humidity (%)', 'Pressure'],
        datasets: [{
            label: 'Latest Sensor Values',
            data: [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: [
                '#38bdf8', // PM2.5 - Cyan
                '#3b82f6', // PM10 - Blue
                '#f59e0b', // CO - Amber
                '#10b981', // CO2 - Emerald
                '#ef4444', // Temperature - Red
                '#06b6d4', // Humidity - Light Blue
                '#a855f7'  // Pressure - Purple
            ],
            borderWidth: 1,
            borderRadius: 6
        }]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false } 
        },
        scales: { 
            y: { 
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#cbd5e1' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#cbd5e1' }
            }
        } 
    }
});

// 2. Initialize Historical Trends Line Chart with all 7 parameters
const trendCtx = document.getElementById('trendChart').getContext('2d');
const trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'PM2.5', data: [], borderColor: '#38bdf8', tension: 0.3, fill: false },
            { label: 'PM10', data: [], borderColor: '#3b82f6', tension: 0.3, fill: false },
            { label: 'CO', data: [], borderColor: '#f59e0b', tension: 0.3, fill: false },
            { label: 'CO₂', data: [], borderColor: '#10b981', tension: 0.3, fill: false },
            { label: 'Temp (°C)', data: [], borderColor: '#ef4444', tension: 0.3, fill: false },
            { label: 'Humidity (%)', data: [], borderColor: '#06b6d4', tension: 0.3, fill: false },
            { label: 'Pressure', data: [], borderColor: '#a855f7', tension: 0.3, fill: false }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { labels: { color: '#cbd5e1', font: { size: 9 } } } 
        },
        scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#cbd5e1' } },
            x: { grid: { display: false }, ticks: { color: '#cbd5e1' } }
        }
    }
});

// Global variable to track previous AQI for smooth number animation
let previousAqi = 0;

// Function to smoothly animate AQI number changes
function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);
    if (!obj) return;

    const timer = setInterval(() => {
        current += increment;
        obj.innerText = `Calculated AQI: ${current}`;
        if (current === end) {
            clearInterval(timer);
        }
    }, Math.max(stepTime, 20));
}

// 3. Main Data Fetching and UI Update Function
async function fetchAllData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/latest-sensor-data`);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();

        // Update Header Meta Info
        if (data.device_id) document.getElementById('device_id').innerText = data.device_id;
        if (data.timestamp) document.getElementById('timestamp').innerText = data.timestamp;

        // Update the 7 Hardware Parameter Cards
        document.getElementById('pm25').innerText = data.pm25 ?? '--';
        document.getElementById('pm10').innerText = data.pm10 ?? '--';
        document.getElementById('co').innerText = data.co ?? '--';
        document.getElementById('co2').innerText = data.co2 ?? '--';
        document.getElementById('temperature').innerText = data.temperature ?? '--';
        document.getElementById('humidity').innerText = data.humidity ?? '--';
        document.getElementById('pressure').innerText = data.pressure ?? '--';

        // Update Dynamic AI Classification Card with Smooth Animation
        const aiPredElem = document.getElementById('ai_prediction');
        const aiIndexElem = document.getElementById('ai_aqi_index');
        if (data.aqi_status) {
            aiPredElem.innerText = data.aqi_status;
            
            // Animate AQI number change dynamically if it changes
            if (data.calculated_aqi !== previousAqi) {
                animateValue('ai_aqi_index', previousAqi, data.calculated_aqi, 500);
                previousAqi = data.calculated_aqi;
            } else {
                aiIndexElem.innerText = `Calculated AQI: ${data.calculated_aqi}`;
            }

            // Dynamic color coding based on status
            if (data.aqi_status === "Very Good" || data.aqi_status === "Good") {
                aiPredElem.style.color = "#4ade80"; // Green
            } else if (data.aqi_status.includes("Fair")) {
                aiPredElem.style.color = "#facc15"; // Yellow
            } else {
                aiPredElem.style.color = "#ef4444"; // Red
            }
        }

        // Update the 7-Parameter Pollutant Bar Chart
        pollutantChart.data.datasets[0].data = [
            data.pm25 || 0,
            data.pm10 || 0,
            data.co || 0,
            data.co2 || 0,
            data.temperature || 0,
            data.humidity || 0,
            data.pressure || 0
        ];
        pollutantChart.update();

    } catch (err) {
        console.error("Error fetching telemetry data:", err);
        document.getElementById('device_id').innerText = "Connection Failed";
    }

    // Fetch and Populate Hourly Forecast
    try {
        const forecastRes = await fetch(`${API_BASE_URL}/api/hourly-forecast`);
        if (forecastRes.ok) {
            const forecast = await forecastRes.json();
            forecast.forEach((item, index) => {
                const badge = document.getElementById(`hf${index}`);
                const timeElem = index === 0 ? null : document.getElementById(`htime${index}`);
                const tempElem = document.getElementById(`ht${index}`);

                if (badge) badge.innerText = item.aqi;
                if (tempElem) tempElem.innerText = `${Math.round(item.temperature)}°`;
                if (timeElem && index > 0) timeElem.innerText = item.time;
            });
        }
    } catch (e) {
        console.log("Hourly forecast fetch error:", e);
    }

    // Fetch Historical Trends for all 7 parameters
    try {
        const historyRes = await fetch(`${API_BASE_URL}/api/historical-trends`);
        if (historyRes.ok) {
            const history = await historyRes.json();
            trendChart.data.labels = history.map(item => item.timestamp);
            trendChart.data.datasets[0].data = history.map(item => item.pm25);
            trendChart.data.datasets[1].data = history.map(item => item.pm10);
            trendChart.data.datasets[2].data = history.map(item => item.co);
            trendChart.data.datasets[3].data = history.map(item => item.co2);
            trendChart.data.datasets[4].data = history.map(item => item.temperature);
            trendChart.data.datasets[5].data = history.map(item => item.humidity);
            trendChart.data.datasets[6].data = history.map(item => item.pressure);
            trendChart.update();
        }
    } catch (e) {
        console.log("Historical trend fetch error:", e);
    }
}

// Bind Refresh Button Event
document.getElementById('refreshBtn').addEventListener('click', () => {
    const icon = document.getElementById('refreshIcon');
    icon.classList.add('fa-spin');
    fetchAllData().finally(() => {
        setTimeout(() => icon.classList.remove('fa-spin'), 600);
    });
});

// Auto-poll every 2 seconds for rapid live telemetry updates
setInterval(fetchAllData, 2000);

// Initial load on window startup
window.onload = fetchAllData;