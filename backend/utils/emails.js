import { mailTrapClient, sender } from "../config/mailtrap.js";

import { VERIFICATION_EMAIL_TEMPLATE } from "./emailsTemplate.js";


export const sendVerificationEmail = async (email, verificationToken) => {
  // Implementation for sending verification email
  const recipient = [{ email }];

  try {
    const response = await mailTrapClient.send({
        from: sender,
        to: recipient,
        subject: "Email Verification",
        html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
        category: "Email Verification",
    })

    console.log("Verification email sent successfully:", response);
  }catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }

}