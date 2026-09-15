declare module 'nodemailer' {
  interface SendMailOptions {
    readonly from: string;
    readonly to: string;
    readonly subject: string;
    readonly html: string;
    readonly attachments?: ReadonlyArray<{
      readonly filename: string;
      readonly content: string;
      readonly contentType: string;
    }>;
  }

  interface Transporter {
    sendMail(options: SendMailOptions): Promise<unknown>;
  }

  interface TransportOptions {
    readonly service?: string;
    readonly connectionTimeout?: number;
    readonly greetingTimeout?: number;
    readonly socketTimeout?: number;
    readonly auth?: {
      readonly user: string;
      readonly pass: string;
    };
  }

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
