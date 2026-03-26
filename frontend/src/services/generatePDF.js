import { jsPDF } from "jspdf";

const FEATURE_LABELS = {
  age: "Age", sex: "Sex", cp: "Chest Pain Type", trestbps: "Resting BP",
  chol: "Cholesterol", fbs: "Fasting Blood Sugar", restecg: "Resting ECG",
  thalach: "Max Heart Rate", exang: "Exercise Angina", oldpeak: "ST Depression",
  slope: "ST Slope", ca: "Major Vessels", thal: "Thalassemia",
  Age: "Age", Sex: "Sex", ChestPainType: "Chest Pain Type", RestingBP: "Resting BP",
  Cholesterol: "Cholesterol", FastingBS: "Fasting Blood Sugar", RestingECG: "Resting ECG",
  MaxHR: "Max Heart Rate", ExerciseAngina: "Exercise Angina", Oldpeak: "ST Depression",
  ST_Slope: "ST Slope",
};

function drawRoundedRect(doc, x, y, w, h, r, fillColor) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, r, r, "F");
}

export function generateHealthReportPDF(result, inputs, extra, modelUsed) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const danger = result.prediction === 1;
  const confidence = result.confidence;

  // ── Header band ──
  drawRoundedRect(doc, 0, 0, pageW, 44, 0, danger ? [60, 20, 24] : [12, 42, 36]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("VitalAI Health Report", margin, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 240);
  doc.text(`Generated: ${new Date().toLocaleString()}  •  Mode: ${modelUsed === "doctor" ? "Doctor" : "Common"}`, margin, 28);
  doc.text("AI-Assisted Cardiac Risk Screening — Not a clinical diagnosis", margin, 35);
  y = 52;

  // ── Prediction Result Card ──
  drawRoundedRect(doc, margin, y, contentW, 36, 4, danger ? [50, 16, 20] : [14, 38, 30]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 200, 220);
  doc.text(danger ? "ELEVATED RISK DETECTED" : "LOWER RISK DETECTED", margin + 6, y + 10);
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(result.label, margin + 6, y + 20);
  doc.setFontSize(11);
  doc.setTextColor(200, 215, 230);
  doc.text(`Confidence: ${confidence}%   |   No Disease: ${result.all_proba?.[0]}%   •   Disease: ${result.all_proba?.[1]}%`, margin + 6, y + 30);
  y += 44;

  // ── Severity ──
  if (result.severity) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`Severity: ${result.severity}`, margin, y);
    y += 8;
  }

  // ── Input Parameters Section ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 100, 160);
  doc.text("Patient Input Parameters", margin, y);
  y += 6;

  // Table header
  drawRoundedRect(doc, margin, y, contentW, 8, 2, [230, 240, 250]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 60, 90);
  doc.text("Parameter", margin + 4, y + 5.5);
  doc.text("Value", margin + contentW / 2 + 4, y + 5.5);
  y += 10;

  const entries = Object.entries(inputs);
  entries.forEach(([key, val], i) => {
    if (y > 270) {
      doc.addPage();
      y = 16;
    }
    const bgColor = i % 2 === 0 ? [248, 250, 255] : [255, 255, 255];
    drawRoundedRect(doc, margin, y, contentW, 7, 1, bgColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 60, 80);
    doc.text(FEATURE_LABELS[key] || key, margin + 4, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 60);
    doc.text(String(val), margin + contentW / 2 + 4, y + 5);
    y += 8;
  });
  y += 6;

  // ── Extra vitals (Patient mode) ──
  if (extra && Object.keys(extra).length > 0) {
    if (y > 250) { doc.addPage(); y = 16; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 100, 160);
    doc.text("Additional Vitals & Derived Values", margin, y);
    y += 8;

    const extraItems = [];
    if (extra.diastolic) extraItems.push(["Diastolic BP", `${extra.diastolic} mmHg`]);
    if (extra.resting_hr) extraItems.push(["Resting Heart Rate", `${extra.resting_hr} bpm`]);
    if (extra.est_max_hr) extraItems.push(["Estimated Max HR", `${extra.est_max_hr} bpm`]);
    if (extra.rr_interval) extraItems.push(["RR Interval", `${extra.rr_interval} ms`]);
    if (extra.spo2) extraItems.push(["SpO2", `${extra.spo2}%`]);
    if (extra.temperature) extraItems.push(["Temperature", `${extra.temperature}°C`]);

    const pqrst = extra.pqrst || {};
    if (pqrst.pr_interval) extraItems.push(["PR Interval", `${pqrst.pr_interval} ms`]);
    if (pqrst.qrs_duration) extraItems.push(["QRS Duration", `${pqrst.qrs_duration} ms`]);
    if (pqrst.qt_interval) extraItems.push(["QT Interval", `${pqrst.qt_interval} ms`]);

    extraItems.forEach(([label, value], i) => {
      if (y > 270) { doc.addPage(); y = 16; }
      const bgColor = i % 2 === 0 ? [245, 250, 255] : [255, 255, 255];
      drawRoundedRect(doc, margin, y, contentW, 7, 1, bgColor);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 60, 80);
      doc.text(label, margin + 4, y + 5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 40, 60);
      doc.text(value, margin + contentW / 2 + 4, y + 5);
      y += 8;
    });
    y += 6;
  }

  // ── Top Risk Factors ──
  if (result.top_factors?.length) {
    if (y > 240) { doc.addPage(); y = 16; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 100, 160);
    doc.text("Top Risk Factors", margin, y);
    y += 8;

    const maxFactor = Math.max(...result.top_factors.map(f => f[1]));
    result.top_factors.forEach(([key, val]) => {
      if (y > 270) { doc.addPage(); y = 16; }
      const label = FEATURE_LABELS[key] || key;
      const barW = (val / maxFactor) * (contentW - 60);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 70, 90);
      doc.text(label, margin + 4, y + 4);

      // bar background
      drawRoundedRect(doc, margin + 50, y, contentW - 60, 5, 1.5, [230, 235, 245]);
      // bar fill
      const barColor = danger ? [255, 123, 114] : [99, 215, 171];
      if (barW > 0) {
        drawRoundedRect(doc, margin + 50, y, Math.max(barW, 3), 5, 1.5, barColor);
      }

      doc.setFont("helvetica", "bold");
      doc.text(`${val}%`, margin + contentW - 6, y + 4, { align: "right" });
      y += 8;
    });
    y += 6;
  }

  // ── Alerts ──
  if (result.alerts?.length) {
    if (y > 250) { doc.addPage(); y = 16; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 100, 30);
    doc.text("Alerts", margin, y);
    y += 7;

    result.alerts.forEach(alert => {
      if (y > 270) { doc.addPage(); y = 16; }
      drawRoundedRect(doc, margin, y, contentW, 8, 2, [255, 245, 220]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140, 80, 10);
      doc.text(`⚠  ${alert}`, margin + 4, y + 5.5);
      y += 10;
    });
    y += 4;
  }

  // ── Footer ──
  if (y > 260) { doc.addPage(); y = 16; }
  y += 4;
  doc.setDrawColor(200, 210, 225);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 150, 170);
  doc.text("Disclaimer: This report is generated by VitalAI, an AI-assisted screening tool.", margin, y);
  y += 4;
  doc.text("It does not constitute a medical diagnosis. Always consult a qualified healthcare professional.", margin, y);
  y += 4;
  doc.text(`Report ID: ${Date.now().toString(36).toUpperCase()}  •  © VitalAI ${new Date().getFullYear()}`, margin, y);

  // Save
  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`VitalAI_Health_Report_${timestamp}.pdf`);
}
