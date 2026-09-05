const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'tmp', 'regions-package', 'package', 'out', 'all.min.json');
const outputPath = path.join(root, 'admin', 'assets', 'data', 'china-regions.js');

if (!fs.existsSync(sourcePath)) {
  throw new Error(`未找到行政区划源文件：${sourcePath}`);
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const citiesByProvince = new Map();
const countiesByCity = new Map();

for (const city of source.city) {
  const provinceCode = String(city.p_code);
  if (!citiesByProvince.has(provinceCode)) citiesByProvince.set(provinceCode, []);
  citiesByProvince.get(provinceCode).push(city);
}

for (const county of source.county) {
  const cityCode = String(county.c_code);
  if (!countiesByCity.has(cityCode)) countiesByCity.set(cityCode, []);
  countiesByCity.get(cityCode).push(county);
}

const regions = source.province.map((province) => ({
  code: String(province.code),
  name: province.name,
  children: (citiesByProvince.get(String(province.code)) || []).map((city) => ({
    code: String(city.code),
    name: city.name,
    children: (countiesByCity.get(String(city.code)) || []).map((county) => ({
      code: String(county.code),
      name: county.name
    }))
  }))
}));

const metadata = {
  package: 'chinese_regions',
  version: '0.5.5',
  updatedAt: '2026-02-20',
  source: 'https://github.com/kamaslau/chinese_regions',
  license: 'MIT',
  provinceCount: regions.length,
  cityCount: regions.reduce((sum, province) => sum + province.children.length, 0),
  countyCount: regions.reduce(
    (sum, province) => sum + province.children.reduce((citySum, city) => citySum + city.children.length, 0),
    0
  )
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const payload = `/* 全国省、市、区县三级地址库。来源与版本见 metadata。 */\nwindow.SXF_CHINA_REGIONS=${JSON.stringify({
  metadata,
  regions
})};\n`;
fs.writeFileSync(outputPath, payload, 'utf8');
process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n${outputPath}\n`);
