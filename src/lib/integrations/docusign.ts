import { SignJWT, importPKCS8 } from "jose";

import { env, envFlags } from "@/lib/env";

async function getAccessToken() {
  const privateKey = await importPKCS8(env.DOCUSIGN_PRIVATE_KEY!, "RS256");
  const jwt = await new SignJWT({ scope: "signature impersonation" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.DOCUSIGN_INTEGRATION_KEY!)
    .setSubject(env.DOCUSIGN_USER_ID!)
    .setAudience(`https://${env.DOCUSIGN_AUTH_BASE_URL}`)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const response = await fetch(
    `https://${env.DOCUSIGN_AUTH_BASE_URL}/oauth/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      }),
    },
  );

  const payload = await response.json();
  return payload.access_token as string;
}

export async function createEnvelope(input: {
  candidateName: string;
  candidateEmail: string;
  subject: string;
  documentName: string;
  documentBase64: string;
  fileExtension: "pdf" | "html";
}) {
  if (!envFlags.hasDocusign) {
    return { envelopeId: `mock-envelope-${Date.now()}`, mode: "preview" as const };
  }

  const accessToken = await getAccessToken();
  const response = await fetch(
    `${env.DOCUSIGN_BASE_URL}/v2.1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/envelopes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailSubject: input.subject,
        status: "sent",
        documents: [
          {
            documentBase64: input.documentBase64,
            fileExtension: input.fileExtension,
            name: input.documentName,
            documentId: "1",
          },
        ],
        recipients: {
          signers: [
            {
              email: input.candidateEmail,
              name: input.candidateName,
              recipientId: "1",
              routingOrder: "1",
              tabs: {
                signHereTabs: [
                  {
                    anchorString: "/sn1/",
                    anchorUnits: "pixels",
                    anchorYOffset: "12",
                    anchorXOffset: "8",
                  },
                ],
              },
            },
          ],
        },
      }),
    },
  );

  const payload = await response.json();
  return { envelopeId: payload.envelopeId as string, mode: "live" as const };
}
