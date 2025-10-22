import { format } from "date-fns";
import { v4 as uuid } from "uuid";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Request, Response, NextFunction } from "express";

const logEvents = async (
    message: string,
    logFileName: string
): Promise<void> => {
    const dateTime = format(new Date(), "yyyyMMdd\tHH:mm:ss");
    const logItem = `${dateTime}\t${uuid()}\t${message}\n`;

    try {
        const logsDir = path.join(__dirname, "..", "logs");

        if (!fs.existsSync(logsDir)) {
            await fsPromises.mkdir(logsDir);
        }

        await fsPromises.appendFile(path.join(logsDir, logFileName), logItem);
    } catch (err) {
        console.error("Error writing log file:", err);
    }
};

const logger = (req: Request, res: Response, next: NextFunction): void => {
    logEvents(`${req.method}\t${req.url}\t${req.headers.origin}`, "reqLog.log");
    console.log(`${req.method} ${req.path}`);
    next();
};

export { logEvents, logger };
