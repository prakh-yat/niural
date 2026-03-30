import { createPrivateKey } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";

import { env, envFlags } from "@/lib/env";

let cachedAccessToken:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;
let accessTokenPromise: Promise<string> | null = null;

function normalizePrivateKeyPem(value: string) {
  return value.replaceAll("\\n", "\n").trim();
}

async function importDocusignPrivateKey(value: string) {
  const normalized = normalizePrivateKeyPem(value);
  if (normalized.includes("BEGIN PRIVATE KEY")) {
    return importPKCS8(normalized, "RS256");
  }

  if (normalized.includes("BEGIN RSA PRIVATE KEY")) {
    const pkcs8Pem = createPrivateKey({
      key: normalized,
      format: "pem",
    }).export({
      format: "pem",
      type: "pkcs8",
    });

    return importPKCS8(String(pkcs8Pem), "RS256");
  }

  throw new Error("DocuSign private key must be a PEM-encoded PKCS#8 or RSA private key.");
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }

  if (accessTokenPromise) {
    return accessTokenPromise;
  }

  accessTokenPromise = (async () => {
    const privateKey = await importDocusignPrivateKey(env.DOCUSIGN_PRIVATE_KEY!);
    const jwt = await new SignJWT({ scope: "signature impersonation" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(env.DOCUSIGN_INTEGRATION_KEY!)
      .setSubject(env.DOCUSIGN_USER_ID!)
      .setAudience(env.DOCUSIGN_AUTH_BASE_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    const response = await fetch(
      `https://${env.DOCUSIGN_AUTH_BASE_URL}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(20_000),
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`DocuSign token exchange failed: ${response.status} ${message}`);
    }

    const payload = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };

    const expiresInSeconds =
      typeof payload.expires_in === "number" && payload.expires_in > 120
        ? payload.expires_in - 60
        : 300;

    cachedAccessToken = {
      token: payload.access_token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };

    return payload.access_token;
  })().finally(() => {
    accessTokenPromise = null;
  });

  return accessTokenPromise;
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
    return {
      envelopeId: `mock-envelope-${Date.now()}`,
      mode: "preview" as const,
      errorMessage: "DocuSign environment variables are not fully configured.",
    };
  }

  try {
    const accessToken = await getAccessToken();
    const response = await fetch(
      `${env.DOCUSIGN_BASE_URL}/v2.1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(20_000),
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

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`DocuSign envelope creation failed: ${response.status} ${message}`);
    }

    const payload = await response.json();
    return {
      envelopeId: payload.envelopeId as string,
      mode: "live" as const,
    };
  } catch (error) {
    return {
      envelopeId: `mock-envelope-${Date.now()}`,
      mode: "preview" as const,
      errorMessage: error instanceof Error ? error.message : "DocuSign delivery failed.",
    };
  }
}

export async function getEnvelopeStatus(envelopeId: string) {
  if (!envFlags.hasDocusign) {
    return {
      envelopeId,
      status: "unknown",
      mode: "preview" as const,
      errorMessage: "DocuSign environment variables are not fully configured.",
    };
  }

  try {
    const accessToken = await getAccessToken();
    const response = await fetch(
      `${env.DOCUSIGN_BASE_URL}/v2.1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`DocuSign envelope lookup failed: ${response.status} ${message}`);
    }

    const payload = await response.json();
    return {
      envelopeId,
      status: String(payload.status ?? "unknown"),
      completedAt:
        typeof payload.completedDateTime === "string" ? payload.completedDateTime : null,
      mode: "live" as const,
    };
  } catch (error) {
    return {
      envelopeId,
      status: "unknown",
      mode: "preview" as const,
      errorMessage: error instanceof Error ? error.message : "DocuSign status lookup failed.",
    };
  }
}
