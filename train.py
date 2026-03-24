import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# ── 1. Load ──────────────────────────────────────────────────────────────────
df = pd.read_csv('data/heart.csv').dropna()
print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"Class balance:\n{df['target'].value_counts()}\n")

X = df.drop('target', axis=1)
y = df['target']

# ── 2. Split ─────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── 3. Scale ─────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ── 4. Train ─────────────────────────────────────────────────────────────────
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)
print("Model trained.\n")

# ── 5. Evaluate ───────────────────────────────────────────────────────────────
y_pred = model.predict(X_test_scaled)
acc = accuracy_score(y_test, y_pred)
print(f"Accuracy: {acc * 100:.1f}%")
print(classification_report(y_test, y_pred))

# ── 6. Feature importance ────────────────────────────────────────────────────
feat_imp = pd.Series(
    model.feature_importances_, index=X.columns
).sort_values(ascending=False)
print("Feature importance:")
print(feat_imp.to_string())
print()

# ── 7. Save ───────────────────────────────────────────────────────────────────
os.makedirs('model', exist_ok=True)
joblib.dump(model,  'model/heart_model.pkl')
joblib.dump(scaler, 'model/scaler.pkl')
print("Saved: model/heart_model.pkl")
print("Saved: model/scaler.pkl")
