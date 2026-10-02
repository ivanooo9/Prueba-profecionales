const fs = require('fs');
const path = 'miauwuauf/lib/email-templates.ts';
let content = fs.readFileSync(path, 'utf8');

const startMarker = 'export function getMedicalRecordTemplate(';
const endMarker = '\nexport function getAdoptionStatusTemplate(';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) {
  console.log('ERROR: markers not found startIdx=' + startIdx + ' endIdx=' + endIdx);
  process.exit(1);
}

const newFn = `export function getMedicalRecordTemplate({
  petName,
  title,
  message,
  actionUrl,
  clinicName,
  address,
  phone,
}: {
  petName: string;
  title: string;
  message: string;
  actionUrl: string;
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
}) {
  const isVaccine = title.toLowerCase().includes('vacuna');
  const isDiagnosis = title.toLowerCase().includes('diagn\\u00f3stico');
  const icon = isVaccine ? '' : isDiagnosis ? '' : '';

  // Strip location block from plain-text to avoid duplication in HTML
  const msgClean = message.replace(/\\n\\u2014 Consultorio del Veterinario \\u2014[\\s\\S]*/g, '');
  const safeMessage = escapeHtmlMedical(msgClean).replace(/\\n/g, '<br>');
  const safePetName = escapeHtmlMedical(petName);

  // Build the beautiful location card if vet has clinic info
  let locationBlock = '';
  if (clinicName || address) {
    const safeClinic = clinicName ? escapeHtmlMedical(clinicName) : '';
    const safeAddress = address ? escapeHtmlMedical(address) : '';
    const safePhone = phone ? escapeHtmlMedical(phone) : '';
    const mapsQuery = encodeURIComponent(
      clinicName && address ? (clinicName + ', ' + address) : (address || clinicName || '')
    );
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + mapsQuery;
    locationBlock =
      '<div style="margin-top:24px;border:2.5px solid #000;border-radius:16px;overflow:hidden;box-shadow:5px 5px 0px 0px #000;font-family:Outfit,Arial,sans-serif;">' +
      '<div style="background:#FFDE59;border-bottom:2.5px solid #000;padding:10px 16px;">' +
      '<span style="font-size:18px;">&#128205;</span>&nbsp;' +
      '<span style="font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#000;">Consultorio del Veterinario</span>' +
      '</div>' +
      '<div style="background:#FDF9F0;padding:14px 16px;">' +
      (safeClinic ? '<div style="font-weight:900;font-size:15px;color:#000;margin-bottom:6px;">&#127973; ' + safeClinic + '</div>' : '') +
      (safeAddress ? '<div style="font-size:13px;font-weight:600;color:#444;margin-bottom:10px;">&#128205; ' + safeAddress + '</div>' : '') +
      (safePhone ? '<div style="font-size:13px;font-weight:600;color:#444;margin-bottom:10px;">&#128222; ' + safePhone + '</div>' : '') +
      '<a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000;color:#FFDE59;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:8px 16px;border-radius:8px;text-decoration:none;border:2px solid #000;box-shadow:3px 3px 0px 0px #FFDE59;">&#128506; Ver en Google Maps &rarr;</a>' +
      '</div>' +
      '</div>';
  }

  return getNeobrutalistTemplate({
    title: icon + ' ' + title,
    message: 'Informaci\\u00f3n importante para <strong>' + safePetName + '</strong>:<br><br>' + safeMessage + locationBlock,
    actionUrl: actionUrl,
    actionText: 'Ver Historial'
  });
}`;

const newContent = content.slice(0, startIdx) + newFn + content.slice(endIdx);
fs.writeFileSync(path, newContent, 'utf8');
console.log('OK - replaced getMedicalRecordTemplate successfully');
