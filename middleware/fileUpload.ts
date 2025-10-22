import multer from "multer";
import { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Reusable upload middleware with field trimming & normalization
 *
 * @param fields Example:
 *   [{ name: "image", maxCount: 1 }, { name: "icon", maxCount: 1 }]
 */
export const uploadFiles = (fields: { name: string; maxCount?: number }[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const mw = upload.fields(fields);
        mw(req, res, (err: any) => {
            if (err) {
                console.error("Multer error:", err);
                return res.status(500).json({ error: "File upload failed" });
            }

            // req.files is an object like { image: [File], icon: [File] }
            const incoming =
                (req.files as { [fieldname: string]: Express.Multer.File[] }) ||
                {};
            const map: { [key: string]: Express.Multer.File[] } = {};

            // Iterate over each field in the incoming files object
            for (const fieldname in incoming) {
                const key = fieldname.trim().toLowerCase();
                if (!key) continue;
                map[key] = incoming[fieldname];
            }

            // ✅ Overwrite req.files with normalized/trimmed keys
            (req as any).files = map;
            next();
        });
    };
};
