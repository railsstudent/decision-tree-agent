import { BaseAgent, Event, InvocationContext, ReadonlyContext, createEvent } from '@google/adk';
import { getEvaluationContext, getMergerContext } from './utils.js';
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
    const { recommendation } = getEvaluationContext(readonlyCtx);

    const { invocationId, branch = '' } = context;
    const baseEvent = {
      invocationId,
      author: this.name,
      branch,
    };

    const recommendationText = recommendation?.text || 'No recommendation available.';

    if (!merger) {
      yield createEvent({
        ...baseEvent,
        content: {
          role: 'model',
          parts: [
            {
              text: JSON.stringify({
                status: 'error',
                recommendationText,
              }),
            },
          ],
        },
      });
      return;
    }

    try {
      const emailContent = `${recommendation?.text || ''}\n\n## Summary\n\n${merger.summary}`;
      await sendEmail(this.smtpConfig, 'Project Evaluation Results', emailContent);
      yield createEvent({
        ...baseEvent,
        content: {
          role: 'model',
          parts: [
            {
              text: JSON.stringify({
                status: 'success',
                recommendationText,
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
                recommendationText,
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
