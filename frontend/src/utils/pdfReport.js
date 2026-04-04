import { jsPDF } from "jspdf";

export const generateClinicalReport = (result, inputs, extra, user) => {
  const doc = new jsPDF({ format: "a4", unit: "pt" });

  const margin = 50;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Theme styling
  const primaryColor = [20, 108, 159]; // #146c9f
  const textDark = [24, 48, 70];
  const textMuted = [86, 113, 140];
  const dangerColor = [207, 79, 79];
  const successColor = [35, 151, 106];
  
  const danger = result.prediction === 1;

  // Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 110, "F");

  // Logo / Title (White text)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("VitalAI", margin, 50);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("CLINICAL CARDIAC ASSESSMENT REPORT", margin, 74);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin, 74, { align: "right" });

  y = 140;

  // Section 1: Patient Information Array
  doc.setTextColor(...textDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT DEMOGRAPHICS", margin, y);
  
  y += 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y); // Separator
  
  y += 25;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const age = inputs.age || inputs.Age || "N/A";
  const sex = inputs.sex !== undefined ? (inputs.sex === 1 ? "Male" : "Female") : (inputs.Sex !== undefined ? (inputs.Sex === 1 ? "Male" : "Female") : "N/A");
  
  doc.setTextColor(...textMuted);
  doc.text("Age / Sex:", margin, y);
  doc.setTextColor(...textDark);
  doc.text(`${age} years / ${sex}`, margin + 80, y);
  
  doc.setTextColor(...textMuted);
  doc.text("Handled By:", pageWidth / 2, y);
  doc.setTextColor(...textDark);
  doc.text(`${user?.name || "Dr. Administrator"}`, pageWidth / 2 + 80, y);

  y += 40;

  // Section 2: Clinical Vitals
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("MONITORED VITALS", margin, y);
  y += 20;
  doc.line(margin, y, pageWidth - margin, y);
  y += 25;

  const vitals = [
    ["Resting BP", `${inputs.trestbps || inputs.RestingBP || "N/A"} mmHg`],
    ["Cholesterol", `${inputs.chol || inputs.Cholesterol || "N/A"} mg/dl`],
    ["Max Heart Rate", `${inputs.thalach || inputs.MaxHR || "N/A"} bpm`],
    ["Blood Sugar > 120", (inputs.fbs || inputs.FastingBS) === 1 ? "Subject is Elevated" : "Normal"]
  ];
  
  if (extra && extra.spo2) vitals.push(["SpO2", `${extra.spo2}%`]);
  if (extra && extra.temperature) vitals.push(["Temperature", `${extra.temperature}°C`]);

  doc.setFontSize(10);
  let vY = y;
  vitals.forEach((v, index) => {
    const col = index % 2;
    const xBase = col === 0 ? margin : pageWidth / 2;
    if (col === 0 && index > 0) vY += 20;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(v[0] + ":", xBase, vY);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text(String(v[1]), xBase + 90, vY);
  });

  y = vY + 45;

  // Section 3: AI Diagnostic Output
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("AI PREDICTION ANALYSIS", margin, y);
  y += 20;
  doc.line(margin, y, pageWidth - margin, y);
  y += 30;

  // Draw Result Box
  doc.setDrawColor(danger ? dangerColor[0] : successColor[0], danger ? dangerColor[1] : successColor[1], danger ? dangerColor[2] : successColor[2]);
  doc.setFillColor(danger ? 253 : 246, danger ? 238 : 251, danger ? 238 : 248);
  doc.rect(margin, y, pageWidth - (margin * 2), 100, "FD");

  y += 25;
  doc.setTextColor(danger ? dangerColor[0] : successColor[0], danger ? dangerColor[1] : successColor[1], danger ? dangerColor[2] : successColor[2]);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(danger ? "ELEVATED CORONARY RISK DETECTED" : "NO CORONARY DISEASE DETECTED", margin + 20, y);
  
  y += 25;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textDark);
  doc.text(`Model Confidence: ${result.confidence}%`, margin + 20, y);
  
  y += 20;
  doc.text(`Primary Diagnostic Driver: ${result.top_factors?.[0]?.[0] || 'Cumulative Model Pattern'}`, margin + 20, y);

  y += 65;

  // ECG Analytics if present
  if (extra && extra.pqrst && Object.keys(extra.pqrst).length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text("ECG INTERVAL METRICS", margin, y);
    y += 20;
    doc.line(margin, y, pageWidth - margin, y);
    y += 25;

    doc.setFontSize(10);
    const pqrst = extra.pqrst;
    
    const rows = [
      ["PR Interval", pqrst.pr_interval, "120-200 ms"],
      ["QRS Duration", pqrst.qrs_duration, "80-120 ms"],
      ["QT Interval", pqrst.qt_interval, "360-440 ms"],
    ];

    rows.forEach((r, i) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.text(r[0] + ":", margin, y + (i * 20));
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textDark);
      doc.text((r[1] ? String(r[1]) : "N/A"), margin + 100, y + (i * 20));
      
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...textMuted);
      doc.text("Ref: " + r[2], margin + 200, y + (i * 20));
    });
    
    y += (rows.length * 20) + 20;
  }

  // Section 5: Clinical & Lifestyle Recommendations
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("CLINICAL & LIFESTYLE RECOMMENDATIONS", margin, y);
  y += 20;
  doc.line(margin, y, pageWidth - margin, y);
  y += 25;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);

  const reqCardio = danger || result.confidence > 65;
  const bpHigh = (inputs.trestbps || inputs.RestingBP) >= 140;
  const cholHigh = (inputs.chol || inputs.Cholesterol) >= 240;
  const fbsHigh = (inputs.fbs || inputs.FastingBS) === 1;

  const suggestions = [];

  // Categorize based on main risk
  if (reqCardio) {
    suggestions.push("• URGENT: Please consult a licensed cardiologist or physician promptly for a comprehensive evaluation.");
    suggestions.push("• A potential follow-up utilizing clinical stress testing or angiography may be advised.");
  } else {
    suggestions.push("• Uphold a consistent, heart-healthy lifestyle incorporating balanced cardiological exercise.");
    suggestions.push("• Proceed with standard annual wellness check-ups to monitor baseline metrics.");
  }

  // Add condition-specific recommendations
  if (bpHigh) suggestions.push("• Hypertension Alert: Your blood pressure is elevated. Monitor regularly and reduce sodium intake.");
  if (cholHigh) suggestions.push("• Lipid Panel Warning: Elevated cholesterol detected. Focus on a diet low in saturated fats and high in fiber.");
  if (fbsHigh) suggestions.push("• Blood Sugar Alert: Fasting blood sugar is elevated. Engage in glycemic monitoring and diet adjustments.");
  
  if (danger) {
    suggestions.push("• IMPORTANT: If you experience acute chest pain, shortness of breath, or dizziness, seek emergency care immediately.");
  }

  suggestions.forEach((text) => {
    const splitText = doc.splitTextToSize(text, pageWidth - (margin * 2));
    doc.text(splitText, margin, y);
    y += (splitText.length * 15) + 5;
  });

  y += 10;

  // Footer Disclaimer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(180, 180, 180);
  doc.text("DISCLAIMER: This document was automatically generated by the VitalAI screening workspace. This prediction is strictly a machine learning estimate and is not intended to substitute for formal clinical diagnosis. Recommend formal cardiology review.", margin, doc.internal.pageSize.getHeight() - 40, { maxWidth: pageWidth - (margin * 2) });

  const base64Uri = doc.output("datauristring");
  const a = document.createElement("a");
  a.href = base64Uri;
  a.download = `VitalAI_Clinical_Report_${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
