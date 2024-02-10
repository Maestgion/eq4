import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// middlewares

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(cookieParser());

// security practices
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// for public assets
app.use(express.static('public'));

export default app;
