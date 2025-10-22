if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASSWORD
) {
    throw new Error("❌ Missing email configuration in environment variables");
}
const emailSettings = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT), // <-- convert to number
    secure: process.env.EMAIL_SECURE === "true", // Use true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
};

export default emailSettings;
