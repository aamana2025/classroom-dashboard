import sendEmail from "../utils/sendEmail.js";
import welcomeTemplate from "../utils/emailTemplates/welcomeTemplate.js";
import { pendingPaymentTemplate } from "../utils/emailTemplates/pendingPaymentTemplate.js";
import { paymentSuccessTemplate } from "../utils/emailTemplates/paymentSuccessTemplate.js";
import { otpTemplate } from "../utils/emailTemplates/otpTemplate.js";
import { resendPaymentTemplate } from "../utils/emailTemplates/resendPaymentTemplate.js";

/**
 * Send a general welcome email
 */
export const sendWelcomeEmail = async (req, res) => {
  try {
    const { to, name } = req.body;

    const html = welcomeTemplate({
      name,
      message: "Welcome to our platform! We're glad to have you on board.",
    });

    await sendEmail(to, "Welcome to Our Platform!", html);

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Send Welcome Email Error:", error.message);
    res.status(500).json({ message: "Email failed", error });
  }
};

/**
 * Send pending payment email (after creating checkout session)
 */
export const sendPendingPaymentEmail = async (user, checkoutUrl) => {
  try {
    const html = pendingPaymentTemplate(user, checkoutUrl);

    await sendEmail(
      user.email,
      "Complete Your Payment to Activate Your Account",
      html
    );

  } catch (error) {
    console.error("Send Pending Payment Email Error:", error.message);
  }
};
/**
 * reSend pending payment email (send by admin dash)
 */
export const resendPaymentEmail = async (email, checkoutUrl, timeLeft) => {
  try {
    const html = resendPaymentTemplate(email, checkoutUrl, timeLeft);

    await sendEmail(
      email,
      "Complete Your Payment to Activate Your Account",
      html
    );

  } catch (error) {
    console.error("Send Pending Payment Email Error:", error.message);
  }
};

/**
 * Send payment success email (after Stripe webhook confirms)
 */
export const sendPaymentSuccessEmail = async (user) => {
  try {
    const html = paymentSuccessTemplate(user);

    await sendEmail(user.email, "Your Account is Now Active 🎉", html);

  } catch (error) {
    console.error("Send Payment Success Email Error:", error.message);
  }
};

export const sendOTPEmail = async (user, otp, resetLink) => {
  try {
    const html = otpTemplate(user, otp, resetLink);

    await sendEmail(user.email, "Your Account is Now Active 🎉", html);

  } catch (error) {
    console.error("Send Payment Success Email Error:", error.message);
  }
};