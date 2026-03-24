from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier
import pandas as pd
from sklearn.preprocessing import StandardScaler

df = pd.read_csv('data/heart.csv').dropna()
X = df.drop('target', axis=1)
y = df['target']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = RandomForestClassifier(n_estimators=100, random_state=42)
scores = cross_val_score(model, X_scaled, y, cv=5)
print(f"5-fold CV scores: {scores}")
print(f"Mean: {scores.mean()*100:.1f}%  (+/- {scores.std()*100:.1f}%)")
