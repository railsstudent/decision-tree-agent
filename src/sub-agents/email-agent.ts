import { BaseAgent, Event, InvocationContext, ReadonlyContext, createEvent } from '@google/adk';
import { getMergerContext } from './utils.js';
import nodemailer from 'nodemailer';
import { marked } from 'marked';
import { SmtpConfig } from './types/email.type.js';

async function sendEmail(smtpConfig: SmtpConfig, subject: string, text: string) {
  const { host, port, user, pass, from, email: to } = smtpConfig;
  const transporter = nodemailer.createTransport({
    host,
    port,
    auth: user && pass ? { user, pass } : undefined,
    secure: false,
  });

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: await marked.parse(text),
  });
}

class EmailAgent extends BaseAgent {
  readonly smtpConfig: SmtpConfig;

  constructor(smtpConfig: SmtpConfig) {
    super({
      name: 'EmailAgent',
      description: 'Send a recommendation and summary email to the administrator.',
    });

    this.smtpConfig = smtpConfig;
  }

  protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    for await (const event of this.runLiveImpl(context)) {
      yield event;
    }
  }

  protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    const readonlyCtx = new ReadonlyContext(context);
    const { merger } = getMergerContext(readonlyCtx);

    const { invocationId, branch = '' } = context;
    const baseEvent = {
      invocationId,
      author: this.name,
      branch,
    };

    if (!merger) {
      yield createEvent({
        ...baseEvent,
        content: {
          role: 'model',
          parts: [
            {
              text: JSON.stringify({
                status: 'error',
                response: `Failed to send email to ${this.smtpConfig.email}. Merger results are missing.`,
              }),
            },
          ],
        },
      });
      return;
    }

    try {
      const emailContent = `${merger.recommendation}\n\n## Summary\n\n${merger.summary}`;
      await sendEmail(this.smtpConfig, 'Project Evaluation Results', emailContent);
      yield createEvent({
        ...baseEvent,
        content: {
          role: 'model',
          parts: [
            {
              text: JSON.stringify({
                status: 'success',
                response: `Email sent to ${this.smtpConfig.email} with project evaluation results.`,
              }),
            },
          ],
        },
      });
    } catch (e) {
      console.error(e);
      yield createEvent({
        ...baseEvent,
        content: {
          role: 'model',
          parts: [
            {
              text: JSON.stringify({
                status: 'error',
                response: `Failed to send email to ${this.smtpConfig.email} with project evaluation results.`,
              }),
            },
          ],
        },
      });
    }
  }
}

export function createEmailAgent(): BaseAgent {
  const email = process.env.ADMIN_EMAIL || 'admin@test.local';
  const host = process.env.SMTP_HOST || 'localhost';
  const port = parseInt(process.env.SMTP_PORT || '1025');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || 'no-reply@test.local';

  const smtpConfig: SmtpConfig = {
    host,
    port,
    user,
    pass,
    from,
    email,
  };

  return new EmailAgent(smtpConfig);
}
