import nodemailer from "nodemailer";
import emailSetting from "../config/emailSetting";
const transporter = nodemailer.createTransport(emailSetting);
export default transporter;
