import type { Request } from "express";
import type { Multer } from "multer";

declare global {
    namespace Express {
        interface Request {
            uploadedFiles?: Array<Express.Multer.File & { filetype?: string }>;
            uploadedFile?: Express.Multer.File;
            uploadFolderPath?: string;
        }
    }
}
