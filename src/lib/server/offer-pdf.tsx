import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import slugify from "slugify";

import { formatCurrency, formatShortDate } from "@/lib/utils";

type OfferPdfInput = {
  candidateName: string;
  jobTitle: string;
  startDate: Date | string;
  baseSalary: number;
  bonus?: string | null;
  equity?: string | null;
  managerName: string;
  markdown: string;
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#111827",
    fontFamily: "Times-Roman",
    fontSize: 11,
    paddingTop: 44,
    paddingBottom: 48,
    paddingHorizontal: 50,
    lineHeight: 1.5,
  },
  eyebrow: {
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 12,
    marginBottom: 14,
  },
  paragraph: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginTop: 12,
    marginBottom: 8,
  },
  summaryCard: {
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 18,
    padding: 14,
  },
  summaryTitle: {
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  summaryText: {
    marginBottom: 4,
  },
  signoff: {
    marginTop: 18,
  },
  signatureSection: {
    borderTopColor: "#d1d5db",
    borderTopWidth: 1,
    marginTop: 28,
    paddingTop: 18,
  },
  signatureLabel: {
    color: "#4b5563",
    marginBottom: 16,
  },
  signatureLine: {
    borderBottomColor: "#111827",
    borderBottomWidth: 1,
    height: 24,
    marginBottom: 12,
    width: 220,
  },
  dateLine: {
    borderBottomColor: "#111827",
    borderBottomWidth: 1,
    height: 20,
    width: 160,
  },
  hiddenAnchor: {
    color: "#ffffff",
    fontSize: 1,
    marginTop: 4,
  },
});

function stripInlineMarkdown(value: string) {
  return value
    .replaceAll(/\*\*(.*?)\*\*/g, "$1")
    .replaceAll(/\*(.*?)\*/g, "$1")
    .replaceAll(/`(.*?)`/g, "$1")
    .replaceAll(/^\s*[-*]\s+/gm, "")
    .replaceAll(/ {2}\n/g, "\n")
    .replaceAll("/sn1/", "")
    .trim();
}

function parseMarkdownSections(markdown: string) {
  const normalized = markdown.replaceAll("\r\n", "\n");
  const signatureIndex = normalized.indexOf("## Signature");
  const content = signatureIndex >= 0 ? normalized.slice(0, signatureIndex) : normalized;
  const rawBlocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const titleBlock = rawBlocks.find((block) => block.startsWith("# "));
  const greetingBlock = rawBlocks.find((block) => block.startsWith("Dear "));
  const contentBlocks = rawBlocks.filter(
    (block) => block !== titleBlock && block !== greetingBlock && !block.startsWith("Sincerely"),
  );

  return {
    title: stripInlineMarkdown(titleBlock?.replace(/^#\s+/, "") ?? "Employment Offer Letter"),
    greeting: stripInlineMarkdown(greetingBlock ?? ""),
    blocks: contentBlocks.map((block) => {
      if (block.startsWith("## ")) {
        return {
          type: "heading" as const,
          text: stripInlineMarkdown(block.replace(/^##\s+/, "")),
        };
      }

      return {
        type: "paragraph" as const,
        text: stripInlineMarkdown(block),
      };
    }),
  };
}

function OfferPdfDocument(input: OfferPdfInput) {
  const parsed = parseMarkdownSections(input.markdown);

  return (
    <Document
      title={`Niural Offer Letter - ${input.candidateName}`}
      author="Niural"
      subject={`Offer for ${input.jobTitle}`}
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.eyebrow}>Niural Employment Offer</Text>
        <Text style={styles.title}>{parsed.title}</Text>
        <Text style={styles.greeting}>{parsed.greeting || `Dear ${input.candidateName},`}</Text>

        {parsed.blocks.map((block, index) =>
          block.type === "heading" ? (
            <Text key={`${block.type}-${index}`} style={styles.sectionHeading}>
              {block.text}
            </Text>
          ) : (
            <Text key={`${block.type}-${index}`} style={styles.paragraph}>
              {block.text}
            </Text>
          ),
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Offer Summary</Text>
          <Text style={styles.summaryText}>Role: {input.jobTitle}</Text>
          <Text style={styles.summaryText}>Start date: {formatShortDate(input.startDate)}</Text>
          <Text style={styles.summaryText}>Base salary: {formatCurrency(input.baseSalary)}</Text>
          <Text style={styles.summaryText}>Bonus: {input.bonus || "N/A"}</Text>
          <Text style={styles.summaryText}>Equity: {input.equity || "N/A"}</Text>
          <Text style={styles.summaryText}>Manager: {input.managerName}</Text>
        </View>

        <Text style={styles.signoff}>Sincerely,</Text>
        <Text>Niural People Operations</Text>

        <View style={styles.signatureSection}>
          <Text style={styles.sectionHeading}>Candidate Signature</Text>
          <Text style={styles.signatureLabel}>
            Please sign via DocuSign in the secure email sent by Niural.
          </Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Candidate signature</Text>
          <View style={styles.dateLine} />
          <Text style={styles.signatureLabel}>Date</Text>
          <Text style={styles.hiddenAnchor}>/sn1/</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function buildOfferPdfBuffer(input: OfferPdfInput) {
  return renderToBuffer(<OfferPdfDocument {...input} />);
}

export function buildOfferPdfFileName(candidateName: string, jobTitle: string) {
  return `${slugify(candidateName, { lower: true, strict: true })}-${slugify(jobTitle, {
    lower: true,
    strict: true,
  })}-offer-letter.pdf`;
}

export function buildOfferPdfPath(offerId: string) {
  return `/api/offers/${offerId}/pdf`;
}
