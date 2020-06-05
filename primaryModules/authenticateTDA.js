const {
    getAuthCode,
    getAccessToken_fromAuthCode,
  } = require('../helpers/tdaCommunication'),
  { configDir } = require('../helpers/constants'),
  fs = require('fs'),
  path = require('path');

(async () => {
  const authCode = await getAuthCode();
  const { refresh_token } = await getAccessToken_fromAuthCode(authCode);
  fs.writeFileSync(
    path.join(configDir, 'tdaConfig.json'),
    JSON.stringify({ refresh_token }),
    'utf8'
  );
  console.log('refresh token saved to config/tdaConfig.json');
})();
