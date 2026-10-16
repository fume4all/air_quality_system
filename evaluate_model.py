import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)

# 1. Load CSV Dataset (using utf-8-sig to clear hidden Windows BOM characters)
csv_filename = "Air_Quality_Dataset.csv.csv"
df = pd.read_csv(csv_filename, encoding='utf-8-sig')

print("\n==================================================")
print("Columns found in your CSV file:")
print(list(df.columns))
print("==================================================\n")

# 2. Automatically map CSV columns to features
col_map = {}
for col in df.columns:
    c_clean = col.lower().replace('.', '').replace('_', '').replace(' ', '').strip()
    if 'pm25' in c_clean or 'pm2.5' in c_clean: col_map['pm25'] = col
    elif 'pm10' in c_clean: col_map['pm10'] = col
    elif 'co2' in c_clean: col_map['co2'] = col
    elif 'co' in c_clean: col_map['co'] = col
    elif 'temp' in c_clean: col_map['temperature'] = col
    elif 'hum' in c_clean: col_map['humidity'] = col
    elif 'press' in c_clean: col_map['pressure'] = col

if 'pm25' not in col_map:
    print("❌ ERROR: Could not find a PM2.5 column in your CSV file.")
    print("Please check the column list printed above.")
    exit()

# Rename matched columns for standard processing
df_clean = df.rename(columns={v: k for k, v in col_map.items()})
features = list(col_map.keys())

print(f"Using features for model training: {features}\n")
X = df_clean[features].dropna()

# 3. Regression Evaluation (Predicting PM2.5 Values)
y_reg = X['pm25'] 
X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_reg, test_size=0.2, random_state=42)

regressor = RandomForestRegressor(n_estimators=100, random_state=42)
regressor.fit(X_train_r, y_train_r)
y_pred_r = regressor.predict(X_test_r)

mae = mean_absolute_error(y_test_r, y_pred_r)
rmse = np.sqrt(mean_squared_error(y_test_r, y_pred_r))
r2 = r2_score(y_test_r, y_pred_r)

print("==================================================")
print("=== REGRESSION METRICS (PM2.5 Prediction) ===")
print("==================================================")
print(f"MAE  : {mae:.4f} µg/m³")
print(f"RMSE : {rmse:.4f} µg/m³")
print(f"R²   : {r2:.4f}\n")

# 4. Classification Evaluation (AQI Category)
def get_aqi_category(pm25):
    if pm25 <= 12.0: return "Good"
    elif pm25 <= 35.4: return "Moderate"
    elif pm25 <= 55.4: return "Unhealthy (Sensitive)"
    else: return "Unhealthy"

y_class = X['pm25'].apply(get_aqi_category)
X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_class, test_size=0.2, random_state=42)

classifier = RandomForestClassifier(n_estimators=100, random_state=42)
classifier.fit(X_train_c, y_train_c)
y_pred_c = classifier.predict(X_test_c)

acc = accuracy_score(y_test_c, y_pred_c)
prec = precision_score(y_test_c, y_pred_c, average='weighted', zero_division=0)
rec = recall_score(y_test_c, y_pred_c, average='weighted', zero_division=0)
f1 = f1_score(y_test_c, y_pred_c, average='weighted', zero_division=0)

print("==================================================")
print("=== CLASSIFICATION METRICS (AQI Categories) ===")
print("==================================================")
print(f"Accuracy : {acc * 100:.2f}%")
print(f"Precision: {prec:.4f}")
print(f"Recall   : {rec:.4f}")
print(f"F1-Score : {f1:.4f}\n")

print("Full Classification Report:")
print(classification_report(y_test_c, y_pred_c, zero_division=0))

# 5. Generate & Save Confusion Matrix Plot
cm = confusion_matrix(y_test_c, y_pred_c, labels=np.unique(y_class))
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=np.unique(y_class), 
            yticklabels=np.unique(y_class))
plt.title('AQI Classification Confusion Matrix')
plt.xlabel('Predicted Label')
plt.ylabel('Actual Label')
plt.tight_layout()
plt.savefig("confusion_matrix.png", dpi=300)
print("\nSaved confusion_matrix.png successfully!")