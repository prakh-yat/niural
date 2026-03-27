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
};

export function buildOfferMarkdown(input: OfferTemplateInput) {
  return `# Employment Offer Letter

Dear ${input.candidateName},

Niural is pleased to extend you an offer to join the company as **${input.jobTitle}**. Your anticipated start date is **${formatShortDate(input.startDate)}** and you will report to **${input.managerName}**.

## Compensation

- Base salary: **$${input.baseSalary.toLocaleString()}** annually
- Bonus: **${input.bonus}**
- Equity: **${input.equity}**

## Terms

${input.customTerms}

## Manager note

${input.managerGreeting}

We are excited about the judgment, speed, and systems thinking you will bring to Niural.

Sincerely,  
Niural People Operations
`;
}

export function buildOfferHtml(input: OfferTemplateInput) {
  return `
    <html>
      <body style="font-family: Inter, Arial, sans-serif; color: #131320; padding: 48px; line-height: 1.6;">
        <h1 style="font-size: 32px; margin-bottom: 16px;">Employment Offer Letter</h1>
        <p>Dear ${input.candidateName},</p>
        <p>
          Niural is pleased to extend you an offer to join the company as
          <strong> ${input.jobTitle}</strong>. Your anticipated start date is
          <strong> ${formatShortDate(input.startDate)}</strong> and you will report to
          <strong> ${input.managerName}</strong>.
        </p>
        <h2 style="margin-top: 28px;">Compensation</h2>
        <ul>
          <li>Base salary: <strong>$${input.baseSalary.toLocaleString()}</strong> annually</li>
          <li>Bonus: <strong>${input.bonus}</strong></li>
          <li>Equity: <strong>${input.equity}</strong></li>
        </ul>
        <h2 style="margin-top: 28px;">Terms</h2>
        <p>${input.customTerms}</p>
        <h2 style="margin-top: 28px;">Manager note</h2>
        <p>${input.managerGreeting}</p>
        <p style="margin-top: 32px;">Sincerely,<br />Niural People Operations</p>
      </body>
    </html>
  `;
}
