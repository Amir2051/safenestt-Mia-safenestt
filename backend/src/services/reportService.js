import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../../reports');
mkdirSync(REPORTS_DIR, { recursive: true });

export function generateReportPDF(caseData, evidenceList) {
  return new Promise((resolve, reject) => {
    const fileName = `${caseData.id}-report-${Date.now()}.pdf`;
    const filePath = `${REPORTS_DIR}/${fileName}`;
    const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
    const stream = createWriteStream(filePath);

    doc.pipe(stream);

    // Colors
    const navy   = '#1a2744';
    const blue   = '#2563eb';
    const red    = '#dc2626';
    const gray   = '#6b7280';
    const light  = '#f8fafc';

    // ── Cover header ──────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 110).fill(navy);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
       .text('SAFENEST T', 60, 30, { align: 'left' });
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8')
       .text('Investigation Intelligence Platform', 60, 56);
    doc.fillColor('#64748b').fontSize(9)
       .text(`CONFIDENTIAL — FOR LAW ENFORCEMENT USE`, 60, 75)
       .text(`Generated: ${new Date().toUTCString()}`, 60, 88);

    doc.moveDown(3);

    // ── Case ID banner ────────────────────────────────────────
    doc.rect(60, 125, doc.page.width - 120, 40).fill('#eff6ff');
    doc.fillColor(blue).fontSize(16).font('Helvetica-Bold')
       .text(`CASE: ${caseData.id}`, 70, 134);
    doc.fillColor(gray).fontSize(9).font('Helvetica')
       .text(`Status: ${caseData.status?.toUpperCase()} | Type: ${caseData.type}`, 70, 152);

    doc.moveDown(3);

    // ── Section helper ────────────────────────────────────────
    const section = (title) => {
      doc.moveDown(0.5);
      doc.rect(60, doc.y, doc.page.width - 120, 22).fill(navy);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text(title.toUpperCase(), 70, doc.y - 16);
      doc.moveDown(0.8);
      doc.fillColor('#1f2937').font('Helvetica').fontSize(10);
    };

    const field = (label, value) => {
      if (!value) return;
      doc.font('Helvetica-Bold').fillColor('#374151').fontSize(9).text(`${label}:  `, { continued: true });
      doc.font('Helvetica').fillColor('#1f2937').text(String(value));
    };

    // ── Case Summary ──────────────────────────────────────────
    section('1. CASE SUMMARY');
    field('Title',       caseData.title);
    field('Case ID',     caseData.id);
    field('Type',        caseData.type);
    field('Status',      caseData.status);
    field('Date Opened', caseData.created_at?.split(' ')[0]);
    field('Last Updated',caseData.updated_at?.split(' ')[0]);
    doc.moveDown(0.5);

    // ── Victim ────────────────────────────────────────────────
    section('2. VICTIM INFORMATION');
    field('Name / ID', caseData.victim || 'Not identified');
    if (caseData.amount_lost) {
      field('Financial Loss', `${caseData.currency || 'USD'} ${parseFloat(caseData.amount_lost).toLocaleString()}`);
    }
    doc.moveDown(0.5);

    // ── Suspect ───────────────────────────────────────────────
    section('3. SUSPECT INFORMATION');
    field('Name / Handle', caseData.suspect || 'Unknown');
    doc.moveDown(0.5);

    // ── Incident Description ──────────────────────────────────
    section('4. INCIDENT DESCRIPTION');
    doc.fillColor('#1f2937').font('Helvetica').fontSize(10)
       .text(caseData.description || 'No description provided.', { width: doc.page.width - 140 });
    doc.moveDown(0.5);

    // ── Evidence Log ──────────────────────────────────────────
    section(`5. EVIDENCE LOG (${evidenceList.length} items)`);
    if (evidenceList.length === 0) {
      doc.fillColor(gray).text('No evidence logged.');
    } else {
      evidenceList.forEach((e, i) => {
        doc.fillColor(navy).font('Helvetica-Bold').fontSize(9)
           .text(`[${i + 1}] ${(e.type || 'unknown').toUpperCase()} — ${e.label || 'No label'}`, { continued: false });
        doc.fillColor(gray).font('Helvetica').fontSize(8).text(`Added: ${e.created_at}  |  By: ${e.submitted_by || 'investigator'}`);
        if (e.content) doc.fillColor('#1f2937').text(`Content: ${String(e.content).slice(0, 200)}`, { indent: 10 });
        if (e.file_name) doc.fillColor(blue).text(`File: ${e.file_name}`, { indent: 10 });
        doc.moveDown(0.3);
      });
    }

    // ── Reporting Guidance ────────────────────────────────────
    section('6. LAW ENFORCEMENT SUBMISSION GUIDANCE');
    const guidance = [
      '• FBI Internet Crime Complaint Center (IC3): ic3.gov — Submit online at ic3.gov/complaint',
      '• FTC Report: reportfraud.ftc.gov',
      '• CISA (cyber incidents): cisa.gov/report',
      '• FinCEN (financial crime): fincen.gov',
      '• Europol (international): europol.europa.eu/report-a-crime',
      '',
      'REQUIRED INFORMATION FOR IC3:',
      '  — Your name and contact information',
      '  — Suspect name, email, phone, website, wallet addresses',
      '  — Detailed chronological narrative of the incident',
      '  — Financial amounts and payment methods used',
      '  — All evidence (screenshots, emails, transaction IDs)',
    ];
    doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
    guidance.forEach(line => doc.text(line));
    doc.moveDown(0.5);

    // ── Footer ────────────────────────────────────────────────
    doc.moveDown(2);
    doc.rect(60, doc.y, doc.page.width - 120, 1).fill('#e2e8f0');
    doc.moveDown(0.5);
    doc.fillColor(gray).fontSize(8).font('Helvetica')
       .text(`Report generated by SafeNestT Mia Investigation Platform | Case ${caseData.id} | ${new Date().toISOString()}`, { align: 'center' })
       .text('This document is for lawful investigation and victim protection purposes only.', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve({ fileName, filePath }));
    stream.on('error', reject);
  });
}
