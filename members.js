
const https = require('https');
const readline = require('readline');

const CLAN_TAG = '#2CQJ2VVVL';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function fetchCoC(path, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.clashofclans.com',
      path: '/v1' + path,
      headers: {
        Authorization: 'Bearer ' + token
      }
    }, res => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode !== 200) {
            return reject(new Error(
              `API 오류 ${res.statusCode}: ${JSON.stringify(result)}`
            ));
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

rl.question('CoC API 토큰 입력: ', async token => {
  rl.close();

  try {
    const clan = await fetchCoC(
      '/clans/' + encodeURIComponent(CLAN_TAG),
      token.trim()
    );

    console.log('\n클랜 이름:', clan.name);
    console.log('클랜원 수:', clan.memberList.length);
    console.log('\n클랜전 참가 설정\n');

    for (const member of clan.memberList) {
      const player = await fetchCoC(
        '/players/' + encodeURIComponent(member.tag),
        token.trim()
      );

      const status =
        player.warPreference === 'in' ? '참가' :
        player.warPreference === 'out' ? '불참' :
        '확인 불가';

      console.log(`${player.name} | ${status}`);
    }

    console.log('\n조회 완료!');
  } catch (err) {
    console.error('오류:', err.message);
  }
});
