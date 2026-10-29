import json
import urllib.request

url = "http://air-quality-system-r8np.onrender.com/api/sensor-data"
payload = {
    "device_id": "ESP32_SENSOR_01",
    "pm25": 18.5,
    "pm10": 32.0,
    "co": 0.4,
    "co2": 412.5,
    "temperature": 28.5,
    "humidity": 65.0,
    "pressure": 1013.2,
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url, data=data, headers={"Content-Type": "application/json"}
)

try:
  with urllib.request.urlopen(req) as response:
    print("Status Code:", response.getcode())
    print("Response Body:", response.read().decode("utf-8"))
except Exception as e:
  print("Request Failed:", e)