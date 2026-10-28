const { google } = require("googleapis");
const { spawn } = require("child_process");
const path = require("path");

const SPREADSHEET_ID = "1pwESJJFsrOZhHAHMCRsVprZUGOmn55zsVCIPbzHsNi8";

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

let running = false;

async function setStatus(status) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'설정'!B2",
    valueInputOption: "RAW",
    requestBody: { values: [[status]] },
  });
}

async function checkRefresh() {
  if (running) return;
  running = true;

  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'설정'!B1:B2",
    });

    const values = result.data.values || [];
    const requestTime = values[0]?.[0];
    const status = values[1]?.[0];

    if (!requestTime || status !== "대기 중") return;

    console.log("새로고침 요청 감지!");
    await setStatus("업데이트 중");

    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["sheet.js"], {
        cwd: __dirname,
        stdio: "inherit",
      });

      child.on("error", reject);
      child.on("close", resolve);
    });

    const latest = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'설정'!B1",
    });

    const latestRequestTime = latest.data.values?.[0]?.[0];

    await setStatus(
      latestRequestTime !== requestTime
        ? "대기 중"
        : exitCode === 0
          ? "완료"
          : "오류",
    );

    console.log(exitCode === 0 ? "새로고침 완료!" : "새로고침 실패");
  } catch (error) {
    console.error("오류:", error.message);
  } finally {
    running = false;
  }
}

console.log("CoC 새로고침 요청 대기 중...");
checkRefresh();
setInterval(checkRefresh, 10000);
