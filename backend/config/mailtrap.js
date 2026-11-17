import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
});

const ENDPOINT = process.env.MAILTRAP_ENDPOINT;
const TOKEN = process.env.MAILTRAP_TOKEN;

if (!ENDPOINT || !TOKEN) {
  throw new Error(
    "Missing MAILTRAP_ENDPOINT or MAILTRAP_TOKEN in the project .env file",
  );
}

export const mailTrapClient = new MailtrapClient({
  endpoint: ENDPOINT,
  token: TOKEN,
});

export const sender = {
  email: "hello@demomailtrap.co",
  name: "Nisal",
};

