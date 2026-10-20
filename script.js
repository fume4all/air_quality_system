// Point this directly to your live Railway backend domain
const API_URL = "https://airqualitysystem-production.up.railway.app";

async function fetchLatestData() {
    try {
        const response = await fetch(`${API_URL}/telemetry/latest`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Update your dashboard UI elements dynamically here
        document.getElementById("device-id-display").innerText = data.device_id || "Connected";
        document.getElementById("pm25-val").innerText = data.pm25 ?? "--";
        document.getElementById("pm10-val").innerText = data.pm10 ?? "--";
        document.getElementById("co-val").innerText = data.co ?? "--";
        document.getElementById("co2-val").innerText = data.co2 ?? "--";
        document.getElementById("temp-val").innerText = data.temperature ?? "--";
        document.getElementById("humidity-val").innerText = data.humidity ?? "--";
        document.getElementById("pressure-val").innerText = data.pressure ?? "--";
        document.getElementById("ai-classification").innerText = data.aqi_level || "Normal";

    } catch (error) {
        console.error("Failed to fetch live sensor telemetry:", error);
    }
}

// Automatically poll for new data every 5 seconds
setInterval(fetchLatestData, 5000);

// Run once on initial page load
window.onload = fetchLatestData;