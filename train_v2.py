import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# ── 1. Load ───────────────────────────────────────────────────────────────────
df = pd.read_csv('data/heart_v2.csv').dropna()
print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"Class balance:\n{df['HeartDisease'].value_counts()}\n")

# ── 2. Encode categorical columns ─────────────────────────────────────────────
# Sex: M → 1, F → 0
df['Sex'] = df['Sex'].map({'M': 1, 'F': 0})

# ChestPainType: ATA → 1, NAP → 2, ASY → 3, TA → 0
df['ChestPainType'] = df['ChestPainType'].map({'TA': 0, 'ATA': 1, 'NAP': 2, 'ASY': 3})

# RestingECG: Normal → 0, ST → 1, LVH → 2
df['RestingECG'] = df['RestingECG'].map({'Normal': 0, 'ST': 1, 'LVH': 2})

# ExerciseAngina: Y → 1, N → 0
df['ExerciseAngina'] = df['ExerciseAngina'].map({'Y': 1, 'N': 0})

# ST_Slope: Up → 0, Flat → 1, Down → 2
df['ST_Slope'] = df['ST_Slope'].map({'Up': 0, 'Flat': 1, 'Down': 2})

# Drop any rows that failed encoding
df = df.dropna()
print(f"After encoding: {df.shape[0]} rows\n")

# ── 3. Fix zero cholesterol values ───────────────────────────────────────────
# fedesoriano dataset uses 0 to represent missing cholesterol
# Replace with median of non-zero values
chol_median = df[df['Cholesterol'] > 0]['Cholesterol'].median()
df['Cholesterol'] = df['Cholesterol'].replace(0, chol_median)
print(f"Cholesterol zeros replaced with median: {chol_median:.1f} mg/dl\n")

# ── 4. Features and target ────────────────────────────────────────────────────
FEATURES_V2 = ['Age', 'Sex', 'ChestPainType', 'RestingBP', 'Cholesterol',
               'FastingBS', 'RestingECG', 'MaxHR', 'ExerciseAngina',
               'Oldpeak', 'ST_Slope']

X = df[FEATURES_V2]
y = df['HeartDisease']

# ── 5. Split ──────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── 6. Scale ──────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ── 7. Train ──────────────────────────────────────────────────────────────────
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)
print("Model trained.\n")

# ── 8. Evaluate ───────────────────────────────────────────────────────────────
y_pred = model.predict(X_test_scaled)
acc    = accuracy_score(y_test, y_pred)
print(f"Accuracy: {acc * 100:.1f}%")
print(classification_report(y_test, y_pred))

# ── 9. Cross validation ───────────────────────────────────────────────────────
X_all_scaled = scaler.fit_transform(X)
cv_scores    = cross_val_score(model, X_all_scaled, y, cv=5)
print(f"5-fold CV Mean: {cv_scores.mean()*100:.1f}% (+/- {cv_scores.std()*100:.1f}%)\n")

# ── 10. Feature importance ────────────────────────────────────────────────────
feat_imp = pd.Series(
    model.feature_importances_, index=FEATURES_V2
).sort_values(ascending=False)
print("Feature importance:")
print(feat_imp.to_string())
print()

# ── 11. Save ──────────────────────────────────────────────────────────────────
os.makedirs('model', exist_ok=True)
joblib.dump(model,  'model/heart_model_v2.pkl')
joblib.dump(scaler, 'model/scaler_v2.pkl')

# Save feature names so predict.py knows the order
joblib.dump(FEATURES_V2, 'model/features_v2.pkl')

print("Saved: model/heart_model_v2.pkl")
print("Saved: model/scaler_v2.pkl")
print("Saved: model/features_v2.pkl")
