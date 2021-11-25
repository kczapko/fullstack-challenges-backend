const path = require('path');

const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

class Email {
  constructor(name, subject, to, data) {
    this.name = name;
    this.subject = subject;
    this.to = to;
    this.data = data;

    this.#compileTemplate();
    this.#createTransporter();
  }

  #createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.DEV_MAIL_HOST,
      port: process.env.DEV_MAIL_PORT,
      secure: process.env.DEV_MAIL_SECURE === 'true',
      auth: {
        user: process.env.DEV_MAIL_USER,
        pass: process.env.DEV_MAIL_PASS,
      },
    });
  }

  #compileTemplate() {
    this.template = pug.renderFile(
      path.join(__dirname, '..', 'templates', 'email', `${this.name}.pug`),
      this.data,
    );
    this.textTemplate = htmlToText(this.template);
  }

  async send() {
    return this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: this.to,
      subject: this.subject,
      html: this.template,
      text: this.textTemplate,
    });
  }
}

module.exports = Email;
