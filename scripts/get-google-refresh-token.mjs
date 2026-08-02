import http from "node:http";

const PORT = 8765;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars before running this script.");
  console.error('Example: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs');
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\nOpen this URL, sign in with the Google account you want the app to use, and approve access:\n");
console.log(authUrl.toString());
console.log("\nWaiting for you to finish in the browser...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400).end("Missing code param.");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h1>Done</h1><p>You can close this tab and go back to the terminal.</p>");
  server.close();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", tokens);
    process.exit(1);
  }

  if (!tokens.refresh_token) {
    console.error(
      "\nNo refresh_token came back. This usually means you've authorized this app before.\n" +
      "Go to https://myaccount.google.com/permissions, remove access for this app, then run the script again.\n"
    );
    process.exit(1);
  }

  console.log("Add these to Dashboard/.env.local:\n");
  console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
  console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_CALENDAR_ID=primary`);
  console.log();
});

server.listen(PORT);
