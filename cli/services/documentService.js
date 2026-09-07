import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { analyze } from './aiService.js';

// ── Text extraction ───────────────────────────────────────────────────────────
export async function extractText(filePath) {
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const ext = extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const buf = readFileSync(filePath);
    const data = await pdfParse(buf);
    return { text: data.text, pages: data.numpages, type: 'pdf' };
  }

  if (['.txt', '.md', '.csv', '.json', '.log'].includes(ext)) {
    const text = readFileSync(filePath, 'utf-8');
    return { text, pages: 1, type: ext.slice(1) };
  }

  throw new Error(`Unsupported file type: ${ext}. Supported: .pdf .txt .md .csv .json .log`);
}

// ── AI-powered document analysis ──────────────────────────────────────────────
export async function analyzeDocument(filePath, context = '') {
  const { text, pages, type } = await extractText(filePath);

  const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n\n[Document truncated — first 8000 chars analyzed]' : text;

  const prompt = `You are analyzing a document as part of a fraud investigation.
File type: ${type} | Pages: ${pages}
${context ? `Investigator context: ${context}` : ''}

DOCUMENT CONTENT:
${truncated}

Perform a thorough investigation analysis. Extract and report:

1. KEY ENTITIES
   - Names of people, companies, organizations
   - Dates and timelines
   - Locations and addresses
   - Financial amounts and account numbers (if any)
   - Email addresses, phone numbers, wallet addresses

2. SUSPICIOUS PATTERNS
   - Inconsistencies or contradictions
   - Unusual financial flows
   - Pressure tactics or urgency language
   - Promises of unrealistic returns
   - Request for personal/financial information

3. EVIDENCE VALUE
   - What this document proves or suggests
   - How it connects to fraud patterns
   - Reliability assessment

4. RECOMMENDED ACTIONS
   - What additional evidence should be sought
   - Which agencies should receive this document
   - Immediate next steps

Be specific. Quote directly from the document where relevant.`;

  const analysis = await analyze(prompt, 3000);

  return {
    fileName: filePath.split('/').pop(),
    fileType: type,
    pages,
    charCount: text.length,
    analysis,
    extractedText: truncated,
  };
}

// ── Pattern extraction (regex-based, no AI needed) ────────────────────────────
export function extractPatterns(text) {
  return {
    emails:        [...new Set(text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])],
    phones:        [...new Set(text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])],
    ethAddresses:  [...new Set(text.match(/0x[a-fA-F0-9]{40}/g) || [])],
    btcAddresses:  [...new Set(text.match(/[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}/g) || [])],
    urls:          [...new Set(text.match(/https?:\/\/[^\s]+/g) || [])],
    amounts:       [...new Set(text.match(/\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d+)?\s*(?:ETH|BTC|USDT|USDC)/g) || [])],
    dates:         [...new Set(text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2}/g) || [])],
  };
}
