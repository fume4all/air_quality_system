-- how many rows you have
SELECT COUNT(*) FROM defaultdb.air_quality_readings;

-- latest 20 readings
SELECT * FROM defaultdb.air_quality_readings ORDER BY created_at DESC LIMIT 20;