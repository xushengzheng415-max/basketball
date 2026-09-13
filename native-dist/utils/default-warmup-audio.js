const ROOT = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/暖场音乐/';

const names = [
  'American Authors-Go Big Or Go Home-2015年NBA季后赛主题曲.mp3',
  'Carly Rae Jepsen-Good Time.mp3',
  'DJ Khaled_Ludacris_T-Pain_Snoop Dogg_Rick Ross-All I Do Is Win (feat. T-Pain， Ludacris， Snoop Dogg _ Rick Ross)(Explicit).mp3',
  'DJ Snake_Lil Jon-Turn Down For What-《速度与激情7》电影插曲.mp3',
  'Dr. Dre_Snoop Dogg-Still D.R.E (Instrumental Version).mp3',
  'Fort Minor-Remember the Name.mp3',
  'Gabriel Marian-Its My Life.mp3',
  'Gnarls Barkley-Crazy(Single Version).mp3',
  'Imagine Dragons_Lil Wayne-Believer.mp3',
  'Kesha-Your Love Is My Drug.mp3',
  'Nelly_Kelly Rowland-Dilemma(Explicit)-《对着天空说爱你》英文版.mp3',
  'Tez cadey-Seve(Radio Edit).mp3',
  'Usher-Yeah.mp3'
];

module.exports = names.map((fileName) => ({
  channel: 'warmup',
  name: fileName.replace(/\.mp3$/i, ''),
  fileID: ROOT + fileName
}));
