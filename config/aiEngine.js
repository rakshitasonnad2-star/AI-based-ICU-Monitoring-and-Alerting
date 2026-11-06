const computeAI = (vitals) => {
  const { heartRate = 72, oxygenLevel = 98, systolicBP = 120, diastolicBP = 80, temperature = 98.6, respiratoryRate = 16 } = vitals;

  let riskScore = 0;
  const alerts = [];

  if (heartRate < 40 || heartRate > 150) { riskScore += 35; alerts.push({ message: `CRITICAL heart rate: ${heartRate} bpm`, severity: 'Critical' }); }
  else if (heartRate < 55 || heartRate > 115) { riskScore += 18; alerts.push({ message: `Abnormal heart rate: ${heartRate} bpm`, severity: 'High' }); }
  else if (heartRate < 60 || heartRate > 100) { riskScore += 8; alerts.push({ message: `Slightly elevated heart rate: ${heartRate} bpm`, severity: 'Medium' }); }

  if (oxygenLevel < 88) { riskScore += 40; alerts.push({ message: `CRITICAL O2 saturation: ${oxygenLevel}%`, severity: 'Critical' }); }
  else if (oxygenLevel < 93) { riskScore += 25; alerts.push({ message: `Low O2 saturation: ${oxygenLevel}%`, severity: 'High' }); }
  else if (oxygenLevel < 95) { riskScore += 12; alerts.push({ message: `Below normal O2: ${oxygenLevel}%`, severity: 'Medium' }); }

  if (systolicBP > 190 || systolicBP < 70) { riskScore += 30; alerts.push({ message: `CRITICAL blood pressure: ${systolicBP}/${diastolicBP} mmHg`, severity: 'Critical' }); }
  else if (systolicBP > 160 || systolicBP < 85) { riskScore += 15; alerts.push({ message: `Abnormal BP: ${systolicBP}/${diastolicBP} mmHg`, severity: 'High' }); }

  if (temperature > 104 || temperature < 94) { riskScore += 25; alerts.push({ message: `CRITICAL temperature: ${temperature}F`, severity: 'Critical' }); }
  else if (temperature > 101.5 || temperature < 96.5) { riskScore += 12; alerts.push({ message: `Abnormal temperature: ${temperature}F`, severity: 'High' }); }

  if (respiratoryRate > 30 || respiratoryRate < 8) { riskScore += 20; alerts.push({ message: `CRITICAL respiratory rate: ${respiratoryRate}/min`, severity: 'Critical' }); }
  else if (respiratoryRate > 24 || respiratoryRate < 12) { riskScore += 10; alerts.push({ message: `Abnormal respiratory rate: ${respiratoryRate}/min`, severity: 'High' }); }

  const stabilityScore = Math.max(0, Math.min(100, 100 - riskScore));

  let riskLevel, prediction;
  if (riskScore >= 60) { riskLevel = 'Critical'; prediction = 'CRITICAL ALERT: Multiple vital parameters severely compromised. Immediate physician intervention required.'; }
  else if (riskScore >= 35) { riskLevel = 'High'; prediction = 'HIGH RISK: Patient showing dangerous vital trends. Physician review required within 30 minutes.'; }
  else if (riskScore >= 15) { riskLevel = 'Medium'; prediction = 'MODERATE RISK: Some parameters outside normal range. Nurse assessment recommended.'; }
  else { riskLevel = 'Low'; prediction = 'Patient vitals within acceptable range. Standard monitoring protocol active.'; }

  return { riskLevel, stabilityScore, prediction, alerts, lastAnalysis: new Date().toISOString() };
};

module.exports = { computeAI };
