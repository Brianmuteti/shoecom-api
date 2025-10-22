import bcrypt from "bcrypt";
import User from "../../services/user/user.service";
import jwt from "jsonwebtoken";
import IP from "ip";
import geoip from "geoip-lite";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import emailController from "./email.controller";

const authController = {
    //  login: async (req: Request, res: Response): Promise<void> => {
    //      const { email, password, browser, os } = req.body;
    //      if (!email || !password) {
    //          res.status(400).json({ message: "All fields are required" });
    //          return;
    //      }
    //      const foundUser = await User.findUserByEmail(email);
    //      if (!foundUser || !foundUser.active || foundUser.deletedAt != null) {
    //          res.status(401).json({ message: "Unauthorized" });
    //          return;
    //      }
    //      const match = await bcrypt.compare(password, foundUser.password);
    //      if (!match) {
    //          res.status(401).json({ message: "Unauthorized" });
    //          return;
    //      }
    //      const accessToken = jwt.sign(
    //          {
    //              UserInfo: {
    //                  email: foundUser.email,
    //                  name: foundUser.name,
    //                  roles: foundUser.roles,
    //                  bgcolor: foundUser.bgcolor,
    //                  id: foundUser.id,
    //                  passwordChangeAt: foundUser.passwordChangeAt,
    //              },
    //          },
    //          process.env.ACCESS_TOKEN_SECRET as string,
    //          { expiresIn: "15m" }
    //      );
    //      const refreshToken = jwt.sign(
    //          { email: foundUser.email },
    //          process.env.REFRESH_TOKEN_SECRET as string,
    //          { expiresIn: "7d" }
    //      );
    //      // Create secure cookie with refresh token
    //      res.cookie("jwt", refreshToken, {
    //          httpOnly: true, //accessible only by web server
    //          secure: true, //https
    //          sameSite: "none", //cross-site cookie
    //          maxAge: 7 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
    //      });
    //      const updateData = {
    //          lastLogin: new Date(),
    //      };
    //      await User.updateUser(updateData, foundUser.id);
    //      const getLocation = (ip: string) => {
    //          const geo = geoip.lookup(ip);
    //          return geo ? `${geo.city}, ${geo.country}` : "Unknown";
    //      };
    //      const ip = IP.address();
    //      const location = getLocation(ip);
    //      await User.createLog({
    //          userId: foundUser.id,
    //          refreshToken: refreshToken,
    //          browser: browser,
    //          os: os,
    //          ip: ip,
    //          location: location,
    //      });
    //      // Send accessToken containing email and roles
    //      res.json({ accessToken });
    //  },
    //  refresh: (req: Request, res: Response, next: NextFunction) => {
    //      const cookies = req.cookies;
    //      if (!cookies?.jwt) {
    //          res.status(401).json({ message: "Unauthorized" });
    //          return;
    //      }
    //      const refreshToken = cookies.jwt;
    //      const processToken = async (
    //          decoded: any,
    //          res: Response,
    //          next: NextFunction
    //      ) => {
    //          const foundUser = await User.findUserByEmail(decoded.email);
    //          if (!foundUser) {
    //              res.status(401).json({ message: "Unauthorized" });
    //              return;
    //          }
    //          const accessToken = jwt.sign(
    //              {
    //                  UserInfo: {
    //                      email: foundUser.email,
    //                      name: foundUser.name,
    //                      bgcolor: foundUser.bgcolor,
    //                      roles: foundUser.roles,
    //                      id: foundUser.id,
    //                      passwordChangeAt: foundUser.passwordChangeAt,
    //                  },
    //              },
    //              process.env.ACCESS_TOKEN_SECRET as string,
    //              { expiresIn: "15m" }
    //          );
    //          res.json({ accessToken });
    //      };
    //      jwt.verify(
    //          refreshToken,
    //          process.env.REFRESH_TOKEN_SECRET as string,
    //          (err: jwt.VerifyErrors | null, decoded: any) => {
    //              if (err) {
    //                  res.status(403).json({ message: "Forbidden" });
    //                  return;
    //              }
    //              // Call processToken and pass next
    //              processToken(decoded, res, next);
    //          }
    //      );
    //  },
    //  logout: (req: Request, res: Response) => {
    //      const cookies = req.cookies;
    //      if (!cookies?.jwt) {
    //          res.sendStatus(204);
    //          return;
    //      } //No content
    //      res.clearCookie("jwt", {
    //          httpOnly: true,
    //          sameSite: "none",
    //          secure: true,
    //      });
    //      res.json({ message: "Cookie cleared" });
    //  },
    //  emailVerify: async (req: Request, res: Response): Promise<void> => {
    //      const schema = z.object({
    //          email: z.string().email(),
    //      });
    //      const { email } = schema.parse(req.body);
    //      const foundUser = await User.findUserByEmail(email);
    //      if (!foundUser || !foundUser.active || foundUser.deletedAt != null) {
    //          res.status(401).json({ message: "Unauthorized" });
    //          return;
    //      }
    //      const passwordtoken = crypto.randomBytes(32).toString("hex");
    //      const currentDateTime = new Date();
    //      currentDateTime.setHours(currentDateTime.getHours() + 1);
    //      const updateData = {
    //          passwordToken: passwordtoken,
    //          tokenValidity: currentDateTime,
    //          tokenUsed: 0,
    //      };
    //      const updatedUser = await User.updateUser(updateData, foundUser.id);
    //      if (!updatedUser) {
    //          res.status(401).json({
    //              message:
    //                  "Cannot process your request now. Please contact admin",
    //          });
    //      }
    //      const name = foundUser.name;
    //      const link = `${
    //          process.env.DOMAIN
    //      }/auth-reset-password?email=${encodeURIComponent(
    //          email
    //      )}&token=${passwordtoken}`;
    //      const reset = await emailController.passwordReset({
    //          email,
    //          name,
    //          link,
    //      });
    //      if (reset) {
    //          res.status(200).json({ message: "Request successful" });
    //          return;
    //      } else {
    //          res.status(400).json({
    //              message: "Cannot reset password at the moment",
    //          });
    //          return;
    //      }
    //  },
    //  passwordReset: async (req: Request, res: Response): Promise<void> => {
    //      const passwordSchema = z
    //          .string()
    //          .min(8, { message: "Password must be at least 8 characters long" })
    //          .regex(
    //              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}])[A-Za-z\d@$!%*?&#^()[\]{}]+$/,
    //              {
    //                  message:
    //                      "Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character",
    //              }
    //          );
    //      const schema = z.object({
    //          email: z.string().email(),
    //          password: passwordSchema,
    //          token: z.string(),
    //      });
    //      const { email, password, token } = schema.parse(req.body);
    //      const foundUser = await User.findUserByEmail(email);
    //      if (!foundUser || !foundUser.active || foundUser.deletedAt != null) {
    //          res.status(401).json({ message: "Unauthorized" });
    //          return;
    //      }
    //      const currentDatetime = new Date();
    //      if (
    //          !foundUser.tokenValidity ||
    //          currentDatetime > foundUser.tokenValidity
    //      ) {
    //          res.status(401).json({
    //              message: "Authentication token expired. Please contact support",
    //          });
    //          return;
    //      }
    //      if (foundUser.tokenUsed === 1) {
    //          res.status(401).json({
    //              message: "Authentication token used. Please contact support",
    //          });
    //          return;
    //      }
    //      if (token !== foundUser.passwordToken) {
    //          res.status(401).json({ message: "Failed. Not authorized" });
    //          return;
    //      }
    //      const duplicate = await bcrypt.compare(password, foundUser.password);
    //      if (duplicate) {
    //          res.status(401).json({
    //              message: "New password cannot be the same as old password",
    //          });
    //          return;
    //      }
    //      const hashedPwd = await bcrypt.hash(password, 10);
    //      const updateData = {
    //          password: hashedPwd,
    //          tokenUsed: 1,
    //          passwordChangeAt: new Date(),
    //      };
    //      const updatedUser = await User.updateUser(updateData, foundUser.id);
    //      if (!updatedUser) {
    //          res.status(401).json({
    //              message:
    //                  "Cannot process your request now. Please contact admin",
    //          });
    //      }
    //      const name = foundUser.name;
    //      let emailError: string | null = null;
    //      try {
    //          await emailController.resetSuccess({ name, email });
    //      } catch (err) {
    //          console.error("Email sending failed:", err);
    //          emailError = "Email sending failed";
    //      }
    //      res.status(201).json({
    //          message: `Password Changed Successfully`,
    //          ...(emailError && { emailError }),
    //      });
    //  },
};

export default authController;
