const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, '演示数据', '青少年篮球32队');
const adminAssetRoot = path.join(root, 'admin', 'assets', 'demo', 'youth-basketball');
const data = JSON.parse(fs.readFileSync(path.join(dataRoot, '赛小蜂名单数据.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

async function run() {
  assert(data.teams.length === 32, `球队数量错误：${data.teams.length}`);
  assert(data.players.length === 384, `球员数量错误：${data.players.length}`);
  assert(unique(data.teams.map((team) => team.id)), '球队 ID 存在重复');
  assert(unique(data.teams.map((team) => team.name)), '球队名称存在重复');
  assert(unique(data.players.map((player) => player.id)), '球员 ID 存在重复');
  const ageGroupCounts = data.teams.reduce((counts, team) => {
    const key = team.ageGroup.split('（')[0];
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  assert(['U8', 'U10', 'U12', 'U14'].every((key) => ageGroupCounts[key] === 8), `组别球队数量错误：${JSON.stringify(ageGroupCounts)}`);
  assert(data.teams.every((team) => team.isDemo && team.fictional && team.name.length <= 5), '球队演示标记或名称长度错误');
  const expectedNumbers = '4,5,6,7,8,9,10,11,12,13,14,15';
  const hashes = [];
  for (const team of data.teams) {
    const roster = data.players.filter((player) => player.teamId === team.id);
    assert(roster.length === 12, `${team.name} 球员数量错误：${roster.length}`);
    assert(roster.map((player) => player.number).join(',') === expectedNumbers, `${team.name} 球衣号码错误`);
    assert(roster.filter((player) => player.gender === '男').length === 9, `${team.name} 男球员数量错误`);
    assert(roster.filter((player) => player.gender === '女').length === 3, `${team.name} 女球员数量错误`);
    const logo = path.join(adminAssetRoot, 'logos', `${team.key}.png`);
    assert(fs.existsSync(logo), `${team.name} 队徽缺失`);
    const logoMeta = await sharp(logo).metadata();
    assert(logoMeta.width === 256 && logoMeta.height === 256, `${team.name} 队徽尺寸错误`);
    for (const player of roster) {
      const avatar = path.join(adminAssetRoot, 'avatars', team.key, `${player.number.padStart(2, '0')}.webp`);
      assert(fs.existsSync(avatar), `${team.name} ${player.number}号头像缺失`);
      const buffer = fs.readFileSync(avatar);
      const metadata = await sharp(buffer).metadata();
      assert(metadata.width === 320 && metadata.height === 320, `${team.name} ${player.number}号头像尺寸错误`);
      hashes.push(crypto.createHash('sha256').update(buffer).digest('hex'));
    }
  }
  assert(unique(hashes), '头像文件存在完全重复内容');
  console.log(JSON.stringify({ teams: 32, players: 384, ageGroupCounts, logos: 32, avatars: 384, uniqueAvatarHashes: hashes.length, status: 'passed' }, null, 2));
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });
