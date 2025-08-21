import { google } from "googleapis";
import readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate the URL for user consent
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: process.env.GOOGLE_SCOPES.split(" "),
});

console.log("Authorize this app by visiting this URL:");
console.log(authUrl);

// Read the code from the command line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the code from that page here: ", async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log("✅ Your refresh token is:", tokens.refresh_token);
  } catch (err) {
    console.error("❌ Error retrieving token", err);
  }
  rl.close();
});


