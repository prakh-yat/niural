import { formatShortDate } from "@/lib/utils";

type OfferTemplateInput = {
  candidateName: string;
  jobTitle: string;
  startDate: string | Date;
  baseSalary: number;
  bonus: string;
  equity: string;
  managerName: string;
  managerGreeting: string;
  customTerms: string;
  openingParagraph?: string;
  roleParagraph?: string;
  compensationParagraph?: string;
  termsParagraph?: string;
  managerNote?: string;
  closingParagraph?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildOfferMarkdown(input: OfferTemplateInput) {
  return `# Employment Offer Letter

Dear ${input.candidateName},

${input.openingParagraph ?? `Niural is pleased to extend you an offer to join the company as **${input.jobTitle}**. Your anticipated start date is **${formatShortDate(input.startDate)}** and you will report to **${input.managerName}**.`}

${input.roleParagraph ?? ""}

## Compensation

${input.compensationParagraph ?? `Your compensation package includes a base salary of **$${input.baseSalary.toLocaleString()}** annually, plus **${input.bonus}** and **${input.equity}**.`}

## Terms

${input.termsParagraph ?? input.customTerms}

## Manager note

${input.managerNote ?? input.managerGreeting}

${input.closingParagraph ?? "We are excited about the judgment, speed, and systems thinking you will bring to Niural."}

Sincerely,  
Niural People Operations

## Signature

Candidate signature (DocuSign): /sn1/

Date: ______________________
`;
}

export function buildOfferHtml(input: OfferTemplateInput) {
  const openingParagraph =
    input.openingParagraph ||
    `Niural is pleased to extend you an offer to join the company as ${input.jobTitle}. Your anticipated start date is ${formatShortDate(input.startDate)} and you will report to ${input.managerName}.`;
  const roleParagraph = input.roleParagraph || "";
  const compensationParagraph =
    input.compensationParagraph ||
    `Your compensation package includes a base salary of $${input.baseSalary.toLocaleString()} annually, plus ${input.bonus} and ${input.equity}.`;
  const termsParagraph = input.termsParagraph || input.customTerms;
  const managerNote = input.managerNote || input.managerGreeting;
  const closingParagraph =
    input.closingParagraph ||
    "We are excited about the judgment, speed, and systems thinking you will bring to Niural.";

  return `
    <html>
      <body style="font-family: Georgia, 'Times New Roman', serif; color: #111827; padding: 56px; line-height: 1.7; background: #ffffff;">
        <div style="max-width: 760px; margin: 0 auto;">
          <p style="margin: 0 0 24px; font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: #6b7280;">Niural employment offer</p>
          <h1 style="font-size: 34px; margin: 0 0 28px; font-weight: 600;">Employment Offer Letter</h1>
          <p style="margin: 0 0 24px; font-size: 17px;">Dear ${escapeHtml(input.candidateName)},</p>
          <p style="margin: 0 0 18px; font-size: 16px;">${escapeHtml(openingParagraph)}</p>
          ${roleParagraph ? `<p style="margin: 0 0 18px; font-size: 16px;">${escapeHtml(roleParagraph)}</p>` : ""}

          <div style="margin: 36px 0 0; padding: 24px 28px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fafafa;">
            <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #6b7280;">Compensation summary</p>
            <p style="margin: 0 0 10px; font-size: 16px;">${escapeHtml(compensationParagraph)}</p>
            <p style="margin: 0; font-size: 15px; color: #4b5563;">
              Base salary: <strong>$${input.baseSalary.toLocaleString()}</strong><br />
              Bonus: <strong>${escapeHtml(input.bonus)}</strong><br />
              Equity: <strong>${escapeHtml(input.equity)}</strong>
            </p>
          </div>

          <h2 style="margin: 36px 0 12px; font-size: 20px; font-weight: 600;">Terms and conditions</h2>
          <p style="margin: 0 0 18px; font-size: 16px;">${escapeHtml(termsParagraph)}</p>

          <h2 style="margin: 36px 0 12px; font-size: 20px; font-weight: 600;">Manager note</h2>
          <p style="margin: 0 0 18px; font-size: 16px;">${escapeHtml(managerNote)}</p>

          <p style="margin: 0 0 28px; font-size: 16px;">${escapeHtml(closingParagraph)}</p>

          <p style="margin: 0 0 48px; font-size: 16px;">
            Sincerely,<br />
            <strong>Niural People Operations</strong>
          </p>

          <div style="margin-top: 56px; padding-top: 28px; border-top: 1px solid #d1d5db;">
            <h2 style="margin: 0 0 18px; font-size: 20px; font-weight: 600;">Signature</h2>
            <p style="margin: 0 0 14px; color: #4b5563; font-size: 15px;">Candidate signature (DocuSign): /sn1/</p>
            <p style="margin: 0; color: #4b5563; font-size: 15px;">Date: ______________________</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
