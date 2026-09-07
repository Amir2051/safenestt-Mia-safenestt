'use client';
import AppShell from '@/components/AppShell';
import { ExternalLink, CheckSquare, AlertTriangle, Shield } from 'lucide-react';

const G = '#00ff41'; const A = '#ff9500'; const R = '#ff2d2d';

const AGENCIES = [
  {
    name: 'IC3 — Internet Crime Complaint Center',
    url:  'https://www.ic3.gov/complaint',
    org:  'FBI',
    color: R,
    desc: 'Primary US agency for internet crime. File here first for fraud, crypto theft, romance scams, investment fraud.',
    needed: [
      'Your name, address, phone, email',
      'Financial institution and account info used',
      'Suspect name, email, phone, website, wallet addresses',
      'Detailed narrative of what happened',
      'Exact dollar amounts lost and payment methods',
      'Dates of contact and transactions',
    ],
    steps: [
      'Go to ic3.gov and click "File a Complaint"',
      'Select "Internet Crime" as the complaint type',
      'Enter victim and subject (suspect) information',
      'Write a detailed chronological narrative',
      'Attach evidence (screenshots, emails, transaction records)',
      'Submit and save your complaint ID',
    ],
  },
  {
    name: 'FTC — Federal Trade Commission',
    url:  'https://reportfraud.ftc.gov',
    org:  'FTC',
    color: A,
    desc: 'For consumer fraud, scams, identity theft. Feeds into the Consumer Sentinel Network used by law enforcement.',
    needed: [
      'Your contact information',
      'How you were contacted (phone, email, website)',
      'What was offered / promised',
      'Amount paid and payment method',
    ],
    steps: [
      'Visit reportfraud.ftc.gov',
      'Select the fraud type that best matches',
      'Provide contact and transaction details',
      'Submit — you will receive a confirmation number',
    ],
  },
  {
    name: 'CISA — Cybersecurity & Infrastructure Security Agency',
    url:  'https://www.cisa.gov/reporting-cyber-incidents',
    org:  'DHS',
    color: G,
    desc: 'For cyberattacks, ransomware, critical infrastructure incidents.',
    needed: ['Type of attack', 'Systems affected', 'Timeline', 'Technical indicators'],
    steps: [
      'Visit cisa.gov/report',
      'Select "Report a Cyber Incident"',
      'Complete the incident report form',
    ],
  },
  {
    name: 'Europol — European Financial Crime',
    url:  'https://www.europol.europa.eu/report-a-crime/report-cybercrime-online',
    org:  'Europol',
    color: '#60a5fa',
    desc: 'For international cases, EU-based suspects, or crypto fraud with European connections.',
    needed: ['Case narrative', 'Cross-border elements', 'Suspect locations if known'],
    steps: [
      'Go to europol.europa.eu/report-a-crime',
      'Select "Report Cybercrime Online"',
      'Also file locally with your national police',
    ],
  },
  {
    name: 'FinCEN — Financial Crimes Enforcement Network',
    url:  'https://www.fincen.gov/resources/statutes-and-regulations/ctr',
    org:  'US Treasury',
    color: G,
    desc: 'For money laundering, large cash transactions, suspicious financial activity. Banks file SARs here.',
    needed: ['Financial institution details', 'Transaction records', 'Suspicious activity description'],
    steps: [
      'Notify your bank or financial institution first',
      'Your institution may file a SAR (Suspicious Activity Report)',
      'You can also contact FinCEN directly at 1-800-767-2825',
    ],
  },
];

const IC3_CHECKLIST = [
  'Full chronological narrative written',
  'All suspect contact info collected (email, phone, social media)',
  'All wallet addresses documented',
  'All transaction IDs / hashes saved',
  'Screenshots of conversations saved',
  'Bank/wire transfer records saved',
  'IP addresses / domain names noted',
  'Dates and times of all contact documented',
  'Amount lost per transaction calculated',
  'Any witnesses or other victims identified',
];

function Section({ title, color = G, children }) {
  return (
    <div className="rounded" style={{ border: `1px solid ${color}22` }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${color}15`, background: `${color}06` }}>
        <span className="font-mono text-xs font-bold tracking-widest" style={{ color }}>{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function GuidancePage() {
  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>REPORTING GUIDANCE</h1>
          <p className="text-xs font-mono opacity-40 mt-1">Step-by-step guide to reporting fraud to law enforcement agencies</p>
        </div>

        {/* Disclaimer */}
        <div className="px-4 py-3 rounded font-mono text-xs leading-relaxed" style={{ background: 'rgba(255,45,45,.06)', border: '1px solid rgba(255,45,45,.2)', color: 'rgba(255,45,45,.8)' }}>
          <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle size={12} /> IMPORTANT</div>
          SafeNestT does not submit reports on your behalf and does not interact with government agencies directly.
          Use this guidance to prepare and file your own reports. Always consult legal counsel for complex cases.
        </div>

        {/* Evidence checklist */}
        <Section title="PRE-FILING EVIDENCE CHECKLIST" color={G}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {IC3_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckSquare size={13} style={{ color: G, opacity: .6, marginTop: 2, shrink: 0 }} />
                <span className="font-mono text-sm opacity-70">{item}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Agency guides */}
        {AGENCIES.map(a => (
          <Section key={a.name} title={`${a.org} — ${a.name}`} color={a.color}>
            <p className="font-mono text-sm opacity-60 mb-4">{a.desc}</p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs font-mono font-bold tracking-widest mb-2 opacity-50" style={{ color: a.color }}>INFORMATION NEEDED</div>
                {a.needed.map((n,i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-xs font-mono opacity-40" style={{ color: a.color }}>•</span>
                    <span className="font-mono text-xs opacity-70">{n}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-mono font-bold tracking-widest mb-2 opacity-50" style={{ color: a.color }}>STEPS</div>
                {a.steps.map((s,i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold" style={{ color: a.color, opacity: .6 }}>{i+1}.</span>
                    <span className="font-mono text-xs opacity-70">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <a href={a.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded font-mono text-xs font-bold transition-all"
              style={{ background: `${a.color}10`, border: `1px solid ${a.color}30`, color: a.color }}>
              <ExternalLink size={11} /> Open {a.org} Portal
            </a>
          </Section>
        ))}

        {/* Tips */}
        <Section title="EVIDENCE PRESERVATION TIPS" color={A}>
          {[
            'Take screenshots immediately — platforms may delete content after you report it',
            'Use screen recording for video-based evidence',
            'Preserve email headers, not just email body text',
            'Save blockchain transaction IDs (hashes) — they are permanent and can be verified',
            'Maintain a timeline document: date, time, what happened, who said what',
            'Do not warn the suspect you are filing a report',
            'Keep originals — do not edit, crop, or alter any evidence',
            'Store evidence in multiple places (cloud + local)',
          ].map((t,i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <Shield size={11} style={{ color: A, opacity: .6, marginTop: 2, shrink: 0 }} />
              <span className="font-mono text-sm opacity-70">{t}</span>
            </div>
          ))}
        </Section>
      </div>
    </AppShell>
  );
}
