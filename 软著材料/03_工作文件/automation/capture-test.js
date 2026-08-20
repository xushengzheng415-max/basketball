const path = require('path');
const automator = require('miniprogram-automator');

(async () => {
  const projectPath = 'C:/Users/Frank/Documents/sxf-basketball';
  const miniProgram = await automator.launch({
    cliPath: 'F:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat',
    projectPath,
    port: 9421,
    trustProject: true,
    timeout: 90000,
  });
  const page = await miniProgram.currentPage();
  console.log(JSON.stringify({ path: page && page.path, system: await miniProgram.systemInfo() }));
  await miniProgram.screenshot({ path: path.resolve(__dirname, '../../01_界面截图/00-automation-test.png') });
  miniProgram.disconnect();
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
