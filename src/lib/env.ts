import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  E2E_TEST_MODE: z
    .enum(["0", "1", "false", "true"])
    .optional()
    .transform((value) => value === "1" || value === "true"),
  CRON_SECRET: z.string().optional(),
  AUTO_SHORTLIST_THRESHOLD: z.coerce.number().int().min(1).max(100).default(50),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("resumes"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL_PRIMARY: z.string().default("anthropic/claude-3.7-sonnet"),
  OPENROUTER_MODEL_FAST: z.string().default("openai/gpt-4.1-mini"),
  SERPER_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("Niural TalentOS <talent@updates.local>"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_USER_ID: z.string().optional(),
  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_PRIVATE_KEY: z.string().optional(),
  DOCUSIGN_BASE_URL: z.string().default("https://demo.docusign.net/restapi"),
  DOCUSIGN_AUTH_BASE_URL: z.string().default("account-d.docusign.com"),
  FIREFLIES_API_KEY: z.string().optional(),
  FIREFLIES_WEBHOOK_SECRET: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_ADMIN_USER_TOKEN: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_HR_CHANNEL_ID: z.string().optional(),
  SLACK_HR_EMAIL: z.string().email().default("prakhyat@awwtomation.com"),
  SLACK_WORKSPACE_NAME: z.string().default("Niural"),
  SLACK_WORKSPACE_INVITE_URL: z.string().url().optional(),
  SLACK_ONBOARDING_RESOURCE_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

export const envFlags = {
  hasDatabase: Boolean(env.DATABASE_URL),
  isE2E: Boolean(env.E2E_TEST_MODE),
  hasSupabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasSupabaseAdmin: Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  hasOpenRouter: Boolean(env.OPENROUTER_API_KEY),
  hasResend: Boolean(env.RESEND_API_KEY),
  hasGoogleCalendar: Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI,
  ),
  hasDocusign: Boolean(
    env.DOCUSIGN_ACCOUNT_ID &&
      env.DOCUSIGN_USER_ID &&
      env.DOCUSIGN_INTEGRATION_KEY &&
      env.DOCUSIGN_PRIVATE_KEY,
  ),
  hasFireflies: Boolean(env.FIREFLIES_API_KEY),
  hasSlackBot: Boolean(env.SLACK_BOT_TOKEN),
  hasSlackWebhook: Boolean(env.SLACK_BOT_TOKEN && env.SLACK_SIGNING_SECRET),
  hasSlackAdminInvite: Boolean(env.SLACK_ADMIN_USER_TOKEN),
  hasSlack: Boolean(env.SLACK_BOT_TOKEN && env.SLACK_SIGNING_SECRET),
  hasSerper: Boolean(env.SERPER_API_KEY),
};
