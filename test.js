
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('CoC API 토큰 입력: ', (token) => {
  rl.question('클랜 태그 입력 (# 포함): ', (tag) => {
    const path = '/v1/clans/' + encodeURIComponent(tag.trim());

    https.get({
      hostname: 'api.clashofclans.com',
      path,
      headers: {
        Authorization: 'Bearer ' + token.trim()
      }
    }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (res.statusCode !== 200) {
            console.log('API 오류:', res.statusCode);
            console.log(result);
          } else {
            console.log('클랜 이름:', result.name);
            console.log('클랜원 수:', result.members);
            console.log('API 연결 성공!');
          }
        } catch (error) {
          console.log('응답 처리 실패:', error.message);
        }

        rl.close();
      });
    }).on('error', (error) => {
      console.log('연결 오류:', error.message);
      rl.close();
    });
  });
});
