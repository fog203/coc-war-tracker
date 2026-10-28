require("dotenv").config();

const { google } = require("googleapis");
const https = require("https");

const SPREADSHEET_ID = "1pwESJJFsrOZhHAHMCRsVprZUGOmn55zsVCIPbzHsNi8";
const SHEET_NAME = "클랜전 현황";

const CLANS = [
  { name: "무화", tag: "#2CQJ2VVVL", col: 0 },
  { name: "설화", tag: "#2CRYOJLYY", col: 6 },
];

function cocRequest(path, token) {
  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: "api.clashofclans.com",
          path: `/v1${path}`,
          headers: { Authorization: `Bearer ${token}` },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              if (res.statusCode !== 200) {
                throw new Error(`CoC API ${res.statusCode}: ${body}`);
              }
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        },
      )
      .on("error", reject);
  });
}

async function main() {
  const token = (process.env.COC_API_TOKEN || "").trim();
  if (!token) throw new Error(".env 파일에 COC_API_TOKEN이 없습니다.");

  const auth = new google.auth.GoogleAuth({
    keyFile: "./service-account.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const clanData = [];

  for (const clan of CLANS) {
    console.log(`${clan.name} 조회 중...`);

    const info = await cocRequest(
      `/clans/${encodeURIComponent(clan.tag)}`,
      token,
    );

    const members = await Promise.all(
      info.memberList.map(async (member) => {
        const player = await cocRequest(
          `/players/${encodeURIComponent(member.tag)}`,
          token,
        );

        return {
          name: member.name,
          tag: member.tag,
          townHall: player.townHallLevel || "",
          status:
            player.warPreference === "in"
              ? "참가"
              : player.warPreference === "out"
                ? "불참"
                : "확인 필요",
        };
      }),
    );

    members.sort(
      (a, b) => b.townHall - a.townHall || a.name.localeCompare(b.name),
    );

    clanData.push({ ...clan, members });
  }

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets(properties(sheetId,title))",
  });

  let target = metadata.data.sheets?.find(
    (s) => s.properties.title === SHEET_NAME,
  );

  if (!target) {
    const created = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: { properties: { title: SHEET_NAME } },
          },
        ],
      },
    });
    target = {
      properties: created.data.replies[0].addSheet.properties,
    };
  }

  const sheetId = target.properties.sheetId;

  // 명단 영역만 초기화 (상단 새로고침 셀은 보존)
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      ranges: [
        `'${SHEET_NAME}'!A7:D`,
        `'${SHEET_NAME}'!F4:F`,
        `'${SHEET_NAME}'!G7:J`,
      ],
    },
  });

  const now = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });

  const updates = [
    {
      range: `'${SHEET_NAME}'!A2:B2`,
      values: [["마지막 업데이트", now]],
    },
  ];

  const requests = [];

  // 이전 설화 위치였던 F열의 배경색 초기화
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 3,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 1, blue: 1 },
        },
      },
      fields: "userEnteredFormat.backgroundColor",
    },
  });

  for (const clan of clanData) {
    const joined = clan.members.filter((m) => m.status === "참가").length;
    const absent = clan.members.filter((m) => m.status === "불참").length;

    const startCol = clan.col === 0 ? "A" : "G";

    updates.push({
      range: `'${SHEET_NAME}'!${startCol}4`,
      values: [
        [clan.name, "전체", clan.members.length, "참가", joined],
        ["", "불참", absent],
      ],
    });

    updates.push({
      range: `'${SHEET_NAME}'!${startCol}7`,
      values: [
        ["닉네임", "마을회관", "참가 상태", "플레이어 태그"],
        ...clan.members.map((m) => [m.name, m.townHall, m.status, m.tag]),
      ],
    });

    // 기존 명단 색상 초기화
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 6,
          endRowIndex: 7 + Math.max(clan.members.length, 50),
          startColumnIndex: clan.col,
          endColumnIndex: clan.col + 4,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 },
          },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    });

    // 명단 헤더
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 6,
          endRowIndex: 7,
          startColumnIndex: clan.col,
          endColumnIndex: clan.col + 4,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.85, green: 0.91, blue: 0.98 },
            textFormat: { bold: true },
          },
        },
        fields:
          "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold",
      },
    });

    // 불참 인원 빨간색
    clan.members.forEach((member, index) => {
      if (member.status !== "불참") return;

      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: index + 7,
            endRowIndex: index + 8,
            startColumnIndex: clan.col,
            endColumnIndex: clan.col + 4,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1, green: 0.82, blue: 0.82 },
            },
          },
          fields: "userEnteredFormat.backgroundColor",
        },
      });
    });

    console.log(
      `${clan.name} 완료: 전체 ${clan.members.length}명 / 참가 ${joined}명 / 불참 ${absent}명`,
    );
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updates,
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  console.log("통합 구글시트 업데이트 완료!");
}

main().catch((error) => {
  console.error("오류:", error.message);
  process.exitCode = 1;
});
