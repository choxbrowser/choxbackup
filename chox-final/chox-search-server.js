const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

if (!BRAVE_API_KEY) {
    console.error("ERROR: BRAVE_API_KEY is missing.");
    console.error("Create a .env file and add your Brave Search API key.");
    process.exit(1);
}

app.disable("x-powered-by");

app.use(express.json({
    limit: "10kb"
}));

/*
 * Serve the Chox frontend.
 */
app.use(express.static(path.join(__dirname, "public")));


/*
 * Very simple in-memory rate limiter.
 *
 * This prevents one browser from hammering the search endpoint.
 * Search queries themselves are NOT stored.
 */

const requestTimes = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 20;

function rateLimit(req, res, next) {
    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "unknown";

    const now = Date.now();

    const previous = requestTimes.get(ip) || [];

    const recent = previous.filter(
        timestamp => now - timestamp < RATE_LIMIT_WINDOW
    );

    if (recent.length >= MAX_REQUESTS) {
        return res.status(429).json({
            error: "Too many searches. Please wait a moment and try again."
        });
    }

    recent.push(now);

    requestTimes.set(ip, recent);

    next();
}


/*
 * Remove HTML from search-provider descriptions.
 */
function cleanText(value) {
    if (!value) {
        return "";
    }

    return String(value)
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}


/*
 * Search endpoint
 *
 * Example:
 *
 * /api/search?q=minecraft
 */
app.get("/api/search", rateLimit, async (req, res) => {
    const query = String(req.query.q || "").trim();

    if (!query) {
        return res.status(400).json({
            error: "Please enter a search."
        });
    }

    if (query.length > 200) {
        return res.status(400).json({
            error: "Search query is too long."
        });
    }

    try {
        const params = new URLSearchParams({
            q: query,
            count: "10",
            country: "us",
            search_lang: "en",
            safesearch: "strict",
            spellcheck: "1"
        });

        const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?${params}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "X-Subscription-Token": BRAVE_API_KEY
                }
            }
        );

        if (!response.ok) {
            console.error(
                "Brave API returned:",
                response.status
            );

            return res.status(502).json({
                error: "Search service is temporarily unavailable."
            });
        }

        const data = await response.json();

        const results =
            data?.web?.results?.map(result => ({
                title: cleanText(result.title),
                url: result.url,
                description: cleanText(result.description),
                domain:
                    result.profile?.long_name ||
                    getDomain(result.url)
            })) || [];

        /*
         * Don't store the query.
         * We only return the results to the browser.
         */

        res.json({
            query,
            results
        });

    } catch (error) {
        console.error("Search request failed.");

        res.status(500).json({
            error: "Something went wrong while searching."
        });
    }
});


function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return "";
    }
}


/*
 * Send index.html for the main page.
 */
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});


/*
 * Results page.
 */
app.get("/results.html", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "results.html")
    );
});


/*
 * Basic error handler.
 */
app.use((err, req, res, next) => {
    console.error("Server error.");

    res.status(500).json({
        error: "Internal server error."
    });
});


app.listen(PORT, () => {
    console.log(`Chox is running on port ${PORT}`);
});
