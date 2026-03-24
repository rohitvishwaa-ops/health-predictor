/**
 * Mirrors check_stress_test_needed() from dashboard.py exactly.
 */
export function checkStressTestNeeded(pqrst = {}, inp = {}, res = {}, extra = {}) {
  const reasons = [];

  // PQRST triggers
  if (pqrst.pr_interval  && pqrst.pr_interval  > 200)
    reasons.push([`PR interval prolonged: ${pqrst.pr_interval} ms (normal 120–200 ms)`, "mild"]);
  if (pqrst.qrs_duration && pqrst.qrs_duration > 120)
    reasons.push([`QRS duration wide: ${pqrst.qrs_duration} ms (normal 60–120 ms)`, "moderate"]);
  if (pqrst.qt_interval  && pqrst.qt_interval  > 440)
    reasons.push([`QT interval prolonged: ${pqrst.qt_interval} ms (normal 350–440 ms)`, "significant"]);

  // Risk factor triggers
  const age_val = inp.age  || inp.Age  || 0;
  const cp_val  = inp.cp   || inp.ChestPainType || 0;
  const op_val  = inp.oldpeak || inp.Oldpeak || 0;
  const conf    = res.confidence || 0;
  const pred    = res.prediction ?? 0;
  const spo2    = extra.spo2;

  if (age_val > 50 && cp_val > 0)
    reasons.push([`Age ${age_val} with chest pain — stress test advised for accurate assessment`, "mild"]);
  if (op_val > 2.0)
    reasons.push([`ST depression ${op_val} — significant ECG finding, stress test recommended`, "moderate"]);
  if (pred === 1 && conf > 70)
    reasons.push([`High-confidence heart disease prediction (${conf}%) — stress test for confirmation`, "significant"]);
  if (spo2 && spo2 < 95)
    reasons.push([`Low SpO2 (${spo2}%) — cardiac stress evaluation recommended`, "moderate"]);

  // Deduplicate
  const seen = new Set();
  return reasons.filter(([r]) => { if (seen.has(r)) return false; seen.add(r); return true; });
}

export function buildAlerts(res, extra = {}, pqrst = {}) {
  const alerts = [...(res.alerts || [])];
  if (extra.diastolic && extra.diastolic > 90)
    alerts.push(`Diastolic BP high: ${extra.diastolic} mmHg (normal ≤ 90 mmHg)`);
  if (extra.spo2 && extra.spo2 < 95)
    alerts.push(`SpO2 low: ${extra.spo2}% (normal ≥ 95%)`);
  if (extra.temperature) {
    if (extra.temperature > 37.5) alerts.push(`Temperature elevated: ${extra.temperature}°C (normal ≤ 37.5°C)`);
    else if (extra.temperature < 36) alerts.push(`Temperature low: ${extra.temperature}°C (normal ≥ 36°C)`);
  }
  if (pqrst.pr_interval  && pqrst.pr_interval  < 120) alerts.push(`PR interval short: ${pqrst.pr_interval} ms (normal 120–200 ms)`);
  if (pqrst.qt_interval  && pqrst.qt_interval  < 350) alerts.push(`QT interval short: ${pqrst.qt_interval} ms (normal 350–440 ms)`);
  return alerts;
}

export function getBoundaryWarnings(inp = {}) {
  const warnings = [];
  const age  = inp.age      || inp.Age      || 0;
  const bp   = inp.trestbps || inp.RestingBP || 0;
  const hr   = inp.thalach  || inp.MaxHR     || 0;
  const chol = inp.chol     || inp.Cholesterol || 0;
  if (age  <= 22)  warnings.push("Age is near the lower boundary of our training data (min: 20). Prediction may be less accurate for very young patients.");
  if (age  >= 78)  warnings.push("Age is near the upper boundary of our training data (max: 80). Prediction may be less accurate for elderly patients.");
  if (bp   <= 85)  warnings.push("Blood pressure is near the lower boundary (min: 80 mmHg). Values this low may indicate shock — please seek emergency care.");
  if (bp   >= 195) warnings.push("Blood pressure is near the upper boundary (max: 200 mmHg). This indicates hypertensive crisis — please seek emergency care immediately.");
  if (hr   <= 65)  warnings.push("Max heart rate is near the lower boundary (min: 60 bpm). Very low values may reduce prediction accuracy.");
  if (hr   >= 205) warnings.push("Max heart rate is near the upper boundary (max: 210 bpm). Values this high are rare and may reduce prediction accuracy.");
  if (chol >= 580) warnings.push("Cholesterol is near the upper boundary (max: 600 mg/dl). This is extremely high — please consult a doctor immediately.");
  return warnings;
}
