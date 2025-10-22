import transporter from "../middleware/emailHanler";
import EmailTemplate from "./emailTemplate";

interface EmailInput {
    name?: string;
    email: string;
    password?: string;
    link?: string;
}

const emailController = {
    sendEmail: async (to: string, subject: string, message: string) => {
        const mailOptions = {
            from: `"${process.env.SITE_NAME}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: message,
        };
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("✅ Email sent:", info.messageId);
            return info;
        } catch (error) {
            console.error("❌ Error sending email:", error);
            throw error;
        }
    },

    newAccount: async (data: EmailInput): Promise<void> => {
        const subject = "Account Created";
        const to = data.email;
        const content = `
          <tr>
            <td style="text-align:center;padding: 30px 30px 20px">
               <h2 style="font-size: 18px; color: #6576ff; font-weight: 600; margin: 0;">Account Created</h2>
               <p style="margin-bottom: 10px;">Hi ${data.name},</p>
               <p style="margin-bottom: 10px;">Welcome! <br> You are receiving this email because you have been registered to our site.</p>
               <p style="margin-bottom: 10px;">Click the link below to go to you account.</p>
               <p style="margin-bottom: 25px;">Login Details.</p>
               <p style="margin-bottom: 25px;">Email: <b>${data.email} </b> Password:<b>${data.password}</b> </p>
               <p style="margin-bottom: 25px;"><b>PLEASE CHANGE PASSWORD AFTER LOGIN</b> </p>
                  <a href="${data.link}" style="background-color:#6576ff;border-radius:4px;color:#ffffff;display:inline-block;font-size:13px;font-weight:600;line-height:44px;text-align:center;text-decoration:none;text-transform: uppercase; padding: 0 30px">Login to App</a>
           </td>
         </tr>
         <tr>
            <td style="padding: 0 30px">
               <h4 style="font-size: 15px; color: #000000; font-weight: 600; margin: 0; text-transform: uppercase; margin-bottom: 10px; text-align: center">or</h4>
               <p style="margin-bottom: 10px;">If the button above does not work, paste this link into your web browser:</p>
               <a href="${data.link}" style="color: #6576ff; text-decoration:none;word-break: break-all;">${data.link}</a>
            </td>
         </tr>
        `;
        const message = EmailTemplate(content);

        await emailController.sendEmail(to, subject, message); // ✅ await was missing
    },

    passwordReset: async (data: EmailInput): Promise<boolean> => {
        const subject = "Password Reset";
        const to = data.email;
        const content = `
           <tr>
               <td style="text-align:center;padding: 30px 30px 15px 30px;">
                  <h2 style="font-size: 18px; color: #6576ff; font-weight: 600; margin: 0;">Reset Password</h2>
               </td>
            </tr>
            <tr>
               <td style="text-align:center;padding: 0 30px 20px">
                  <p style="margin-bottom: 10px;">Hi ${data.name},</p>
                  <p style="margin-bottom: 25px;">Click On The link blow to reset tour password.</p>
                  <a href="${data.link}" style="background-color:#6576ff;border-radius:4px;color:#ffffff;display:inline-block;font-size:13px;font-weight:600;line-height:44px;text-align:center;text-decoration:none;text-transform: uppercase; padding: 0 25px">Reset Password</a>
                   
               </td>
            </tr>
            <tr>
            <td style="padding: 0 30px">
               <h4 style="font-size: 15px; color: #000000; font-weight: 600; margin: 0; text-transform: uppercase; margin-bottom: 10px; text-align: center">or</h4>
               <p style="margin-bottom: 10px;">If the button above does not work, paste this link into your web browser:</p>
               <a href="${data.link}" style="color: #6576ff; text-decoration:none;word-break: break-all;">${data.link}</a>
               <br/>
                 <p>If you did not make this request, please contact us or ignore this message.</p>
            </td>
         </tr>
        `;
        const message = EmailTemplate(content);
        try {
            await emailController.sendEmail(to, subject, message);
            return true;
        } catch (error) {
            console.error("Password reset email failed:", error);
            return false;
        }
    },

    resetSuccess: async (data: EmailInput): Promise<void> => {
        const subject = "Password Success ";
        const to = data.email;
        const content = `
        <tr>
            <td style="text-align:center;padding: 30px 30px 15px 30px;">
               <h2 style="font-size: 18px; color: #1ee0ac; font-weight: 600; margin: 0;">Password Reseted</h2>
            </td>
         </tr>
         <tr>
            <td style="text-align:center;padding: 0 30px 20px">
               <p style="margin-bottom: 10px;">Hi ${data.name},</p>
               <p>You Successfully Reseted Your Password. Thanks For being with Us.</p>
            </td>
         </tr>
      `;
        const message = EmailTemplate(content);

        await emailController.sendEmail(to, subject, message); // ✅ await was missing
    },
};

export default emailController;
