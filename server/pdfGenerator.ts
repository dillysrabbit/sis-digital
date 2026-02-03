/**
 * PDF Generator für SIS-Dokumente
 * Generiert professionelle PDF-Dokumente aus SIS-Einträgen
 */

interface RiskMatrixData {
  dekubitus?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  sturz?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  inkontinenz?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  schmerz?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  ernaehrung?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  sonstiges?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
}

interface SisEntryForPdf {
  patientName: string;
  birthDate?: string | null;
  conversationDate?: string | null;
  nurseSignature?: string | null;
  relativeOrCaregiver?: string | null;
  oTon?: string | null;
  themenfeld1?: string | null;
  themenfeld2?: string | null;
  themenfeld3?: string | null;
  themenfeld4?: string | null;
  themenfeld5?: string | null;
  themenfeld6?: string | null;
  riskMatrix?: RiskMatrixData | unknown;
  massnahmenplan?: string | null;
  pruefungsergebnis?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Convert markdown-like text to simple HTML
function markdownToHtml(text: string): string {
  if (!text) return '';
  
  let html = escapeHtml(text);
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  
  // Convert bullet points
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Convert numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Convert line breaks to paragraphs
  html = html.split('\n\n').map(p => {
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  
  return html;
}

// Format date for display
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Nicht angegeben';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Generate risk matrix HTML
function generateRiskMatrixHtml(riskMatrix: RiskMatrixData | unknown): string {
  if (!riskMatrix || typeof riskMatrix !== 'object') {
    return '<p><em>Keine Risikomatrix ausgefüllt</em></p>';
  }
  
  const matrix = riskMatrix as RiskMatrixData;
  const risks = [
    { key: 'dekubitus', label: 'Dekubitus' },
    { key: 'sturz', label: 'Sturz' },
    { key: 'inkontinenz', label: 'Inkontinenz' },
    { key: 'schmerz', label: 'Schmerz' },
    { key: 'ernaehrung', label: 'Ernährung' },
    { key: 'sonstiges', label: 'Sonstiges' },
  ];
  
  const tfLabels = [
    'TF1: Kognition/Kommunikation',
    'TF2: Mobilität',
    'TF3: Krankheitsbezogen',
    'TF4: Selbstversorgung',
    'TF5: Soziale Beziehungen',
  ];
  
  let html = `
    <table class="risk-matrix">
      <thead>
        <tr>
          <th>Themenfeld</th>
          ${risks.map(r => `<th>${r.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;
  
  for (let i = 0; i < 5; i++) {
    const tfKey = `tf${i + 1}` as 'tf1' | 'tf2' | 'tf3' | 'tf4' | 'tf5';
    html += `<tr><td>${tfLabels[i]}</td>`;
    
    for (const risk of risks) {
      const riskData = matrix[risk.key as keyof RiskMatrixData];
      const tfData = riskData?.[tfKey];
      const ja = tfData?.ja ? '✓' : '–';
      const weitere = tfData?.weitere ? '(w)' : '';
      html += `<td class="center">${ja} ${weitere}</td>`;
    }
    
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  html += '<p class="legend"><small>✓ = Risiko identifiziert, (w) = weitere Einschätzung notwendig</small></p>';
  
  return html;
}

export function generateSisPdfHtml(entry: SisEntryForPdf): string {
  const currentDate = new Date().toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>SIS - ${escapeHtml(entry.patientName)}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      margin: 0;
      padding: 0;
    }
    
    .header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      padding: 15px 20px;
      margin: -15mm -15mm 20px -15mm;
      page-break-inside: avoid;
    }
    
    .header h1 {
      margin: 0 0 5px 0;
      font-size: 18pt;
    }
    
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 9pt;
    }
    
    .meta-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    
    .meta-label {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    
    .meta-value {
      font-weight: 600;
      color: #1e293b;
    }
    
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .section-header {
      padding: 8px 12px;
      border-radius: 6px 6px 0 0;
      margin-bottom: 0;
    }
    
    .section-header h2 {
      margin: 0;
      font-size: 11pt;
      font-weight: 600;
    }
    
    .section-content {
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 6px 6px;
      padding: 12px;
      background: white;
    }
    
    .section-content p {
      margin: 0;
      white-space: pre-wrap;
    }
    
    /* O-Ton - Rot */
    .oton .section-header {
      background: #dc2626;
      color: white;
    }
    
    /* Themenfeld 1 - Orange */
    .tf1 .section-header {
      background: #f97316;
      color: white;
    }
    
    /* Themenfeld 2 - Gelb */
    .tf2 .section-header {
      background: #eab308;
      color: #1e293b;
    }
    
    /* Themenfeld 3 - Grün */
    .tf3 .section-header {
      background: #16a34a;
      color: white;
    }
    
    /* Themenfeld 4 - Lila */
    .tf4 .section-header {
      background: #9333ea;
      color: white;
    }
    
    /* Themenfeld 5 - Blau */
    .tf5 .section-header {
      background: #2563eb;
      color: white;
    }
    
    /* Themenfeld 6 - Türkis */
    .tf6 .section-header {
      background: #0891b2;
      color: white;
    }
    
    /* Risikomatrix */
    .risk-matrix {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-top: 10px;
    }
    
    .risk-matrix th,
    .risk-matrix td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
    }
    
    .risk-matrix th {
      background: #f1f5f9;
      font-weight: 600;
      font-size: 8pt;
    }
    
    .risk-matrix td.center {
      text-align: center;
    }
    
    .legend {
      margin-top: 8px;
      color: #64748b;
    }
    
    /* Maßnahmenplan */
    .massnahmenplan .section-header {
      background: #059669;
      color: white;
    }
    
    .massnahmenplan .section-content {
      background: #f0fdf4;
    }
    
    /* Prüfungsergebnis */
    .pruefung .section-header {
      background: #ea580c;
      color: white;
    }
    
    .pruefung .section-content {
      background: #fff7ed;
    }
    
    /* Content formatting */
    .section-content h2 {
      font-size: 12pt;
      margin: 15px 0 8px 0;
      color: #1e293b;
    }
    
    .section-content h3 {
      font-size: 11pt;
      margin: 12px 0 6px 0;
      color: #334155;
    }
    
    .section-content h4 {
      font-size: 10pt;
      margin: 10px 0 5px 0;
      color: #475569;
    }
    
    .section-content ul {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .section-content li {
      margin-bottom: 4px;
    }
    
    .empty-field {
      color: #94a3b8;
      font-style: italic;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #64748b;
      text-align: center;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Strukturierte Informationssammlung (SIS)</h1>
    <p>Stationäre Pflege • Erstellt am ${currentDate}</p>
  </div>
  
  <div class="meta-info">
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Name der pflegebedürftigen Person</span>
        <span class="meta-value">${escapeHtml(entry.patientName)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Geburtsdatum</span>
        <span class="meta-value">${formatDate(entry.birthDate)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Gespräch am</span>
        <span class="meta-value">${formatDate(entry.conversationDate)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Pflegefachkraft</span>
        <span class="meta-value">${entry.nurseSignature ? escapeHtml(entry.nurseSignature) : 'Nicht angegeben'}</span>
      </div>
      <div class="meta-item" style="grid-column: span 2;">
        <span class="meta-label">Angehöriger/Betreuer</span>
        <span class="meta-value">${entry.relativeOrCaregiver ? escapeHtml(entry.relativeOrCaregiver) : 'Nicht angegeben'}</span>
      </div>
    </div>
  </div>
  
  <div class="section oton">
    <div class="section-header">
      <h2>Feld A – O-Ton: Was bewegt Sie? Was brauchen Sie?</h2>
    </div>
    <div class="section-content">
      ${entry.oTon ? `<p>${escapeHtml(entry.oTon)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf1">
    <div class="section-header">
      <h2>Themenfeld 1 – Kognitive und kommunikative Fähigkeiten</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld1 ? `<p>${escapeHtml(entry.themenfeld1)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf2">
    <div class="section-header">
      <h2>Themenfeld 2 – Mobilität und Beweglichkeit</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld2 ? `<p>${escapeHtml(entry.themenfeld2)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf3">
    <div class="section-header">
      <h2>Themenfeld 3 – Krankheitsbezogene Anforderungen und Belastungen</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld3 ? `<p>${escapeHtml(entry.themenfeld3)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf4">
    <div class="section-header">
      <h2>Themenfeld 4 – Selbstversorgung</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld4 ? `<p>${escapeHtml(entry.themenfeld4)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf5">
    <div class="section-header">
      <h2>Themenfeld 5 – Leben in sozialen Beziehungen</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld5 ? `<p>${escapeHtml(entry.themenfeld5)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf6">
    <div class="section-header">
      <h2>Themenfeld 6 – Wohnen/Häuslichkeit</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld6 ? `<p>${escapeHtml(entry.themenfeld6)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section">
    <div class="section-header" style="background: #64748b; color: white;">
      <h2>Risikomatrix – Erste fachliche Einschätzung</h2>
    </div>
    <div class="section-content">
      ${generateRiskMatrixHtml(entry.riskMatrix)}
    </div>
  </div>
  
  ${entry.massnahmenplan ? `
  <div class="page-break"></div>
  <div class="section massnahmenplan">
    <div class="section-header">
      <h2>Individueller Maßnahmenplan</h2>
    </div>
    <div class="section-content">
      ${markdownToHtml(entry.massnahmenplan)}
    </div>
  </div>
  ` : ''}
  
  ${entry.pruefungsergebnis ? `
  <div class="section pruefung">
    <div class="section-header">
      <h2>SIS-Prüfungsergebnis</h2>
    </div>
    <div class="section-content">
      ${markdownToHtml(entry.pruefungsergebnis)}
    </div>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Dieses Dokument wurde mit SIS Digital erstellt • ${currentDate}</p>
    <p>Strukturierte Informationssammlung nach dem Strukturmodell</p>
  </div>
</body>
</html>
`;
}
