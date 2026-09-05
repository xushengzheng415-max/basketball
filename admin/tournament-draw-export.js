(() => {
  'use strict';

  const posterStyles = [
    { id: 'orange', name: '热血赛场', description: '橙黑灯光与速度切面，适合赛事官宣', swatches: ['#080b0e', '#ff7500', '#f4f6f7'] },
    { id: 'blue', name: '霓虹战术', description: '深蓝球场网格与冷光，适合社群发布', swatches: ['#031122', '#25c7ff', '#edf7ff'] },
    { id: 'light', name: '冠军公报', description: '暖白纸张与冠军绶带，适合正式发布', swatches: ['#f6efe2', '#d85c18', '#182538'] }
  ];

  const themes = {
    orange: { background: '#090d10', panel: '#151b20', panelAlt: '#1b2228', accent: '#ff7500', text: '#f7f8f9', muted: '#9da6ad', line: '#384149' },
    blue: { background: '#031122', panel: 'rgba(7,31,56,.92)', panelAlt: 'rgba(12,49,83,.94)', accent: '#25c7ff', text: '#f2f8ff', muted: '#9ab7ca', line: '#29617f' },
    light: { background: '#f6efe2', panel: 'rgba(255,252,245,.95)', panelAlt: '#eee1cf', accent: '#d85c18', text: '#28231e', muted: '#786d62', line: '#d5c4ad' }
  };

  const posterImageCache = new Map();

  function safeFileName(value, fallback = '分组结果') {
    return String(value || fallback).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || fallback;
  }

  function xml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function spreadsheetXml(data) {
    const detailRows = [];
    Object.entries(data.assignments).forEach(([letter, teams]) => {
      teams.forEach((team, index) => detailRows.push([data.groupName, `${letter}组`, index + 1, team, data.competition]));
    });
    const groupEntries = Object.entries(data.assignments);
    const longestGroup = Math.max(0, ...groupEntries.map(([, teams]) => teams.length));
    const detailXml = detailRows.map((row) => `<Row>${row.map((value, index) => `<Cell ss:StyleID="${index === 2 ? 'Number' : 'Body'}"><Data ss:Type="${index === 2 ? 'Number' : 'String'}">${xml(value)}</Data></Cell>`).join('')}</Row>`).join('');
    const overviewHeader = groupEntries.map(([letter]) => `<Cell ss:StyleID="GroupHeader"><Data ss:Type="String">${xml(letter)}组</Data></Cell>`).join('');
    const overviewRows = Array.from({ length: longestGroup }, (_, rowIndex) => `<Row>${groupEntries.map(([, teams]) => `<Cell ss:StyleID="Body"><Data ss:Type="String">${xml(teams[rowIndex] || '')}</Data></Cell>`).join('')}</Row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>赛小蜂篮球</Author><Title>${xml(data.eventName)}分组结果</Title><Created>${new Date().toISOString()}</Created></DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Microsoft YaHei" ss:Size="11"/></Style>
    <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Microsoft YaHei" ss:Size="18" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#FF7500" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Meta"><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#666666"/><Interior ss:Color="#FFF3E6" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Microsoft YaHei" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#20272D" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FF7500"/></Borders></Style>
    <Style ss:ID="GroupHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Microsoft YaHei" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#FF7500" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D45E00"/></Borders></Style>
    <Style ss:ID="Body"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E4E7E9"/></Borders></Style>
    <Style ss:ID="Number"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E4E7E9"/></Borders><NumberFormat ss:Format="0"/></Style>
  </Styles>
  <Worksheet ss:Name="分组明细"><Table>
    <Column ss:Width="130"/><Column ss:Width="70"/><Column ss:Width="55"/><Column ss:Width="150"/><Column ss:Width="180"/>
    <Row ss:Height="34"><Cell ss:MergeAcross="4" ss:StyleID="Title"><Data ss:Type="String">${xml(data.eventName)} · 分组结果</Data></Cell></Row>
    <Row ss:Height="22"><Cell ss:MergeAcross="4" ss:StyleID="Meta"><Data ss:Type="String">竞赛组别：${xml(data.groupName)}　赛制：${xml(data.competition)}　导出时间：${xml(data.exportedAt)}</Data></Cell></Row>
    <Row ss:Height="8"/>
    <Row ss:Height="26">${['竞赛组别','小组','签位','球队','竞赛赛制'].map((name) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${name}</Data></Cell>`).join('')}</Row>
    ${detailXml}
  </Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>4</SplitHorizontal><TopRowBottomPane>4</TopRowBottomPane><Selected/></WorksheetOptions></Worksheet>
  <Worksheet ss:Name="分组总览"><Table>
    ${groupEntries.map(() => '<Column ss:Width="145"/>').join('')}
    <Row ss:Height="34"><Cell ss:MergeAcross="${Math.max(0, groupEntries.length - 1)}" ss:StyleID="Title"><Data ss:Type="String">${xml(data.groupName)} · 分组总览</Data></Cell></Row>
    <Row ss:Height="8"/>
    <Row ss:Height="27">${overviewHeader}</Row>
    ${overviewRows}
  </Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal><TopRowBottomPane>3</TopRowBottomPane></WorksheetOptions></Worksheet>
</Workbook>`;
  }

  function downloadTable(data) {
    const content = spreadsheetXml(data);
    downloadBlob(new Blob(['\ufeff', content], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${safeFileName(`${data.eventName}-${data.groupName}-分组结果`)}.xls`);
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function fillRoundedRect(context, x, y, width, height, radius, color) {
    roundedRect(context, x, y, width, height, radius);
    context.fillStyle = color;
    context.fill();
  }

  function fitText(context, text, maxWidth, startSize, weight = 700) {
    let size = startSize;
    do {
      context.font = `${weight} ${size}px "Microsoft YaHei", sans-serif`;
      if (context.measureText(text).width <= maxWidth) break;
      size -= 2;
    } while (size > 18);
    return size;
  }

  function drawBasketballMark(context, x, y, radius, theme) {
    context.save();
    context.strokeStyle = theme.accent;
    context.lineWidth = Math.max(3, radius * .09);
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.moveTo(x - radius, y); context.lineTo(x + radius, y); context.stroke();
    context.beginPath(); context.moveTo(x, y - radius); context.quadraticCurveTo(x - radius * .75, y, x, y + radius); context.stroke();
    context.beginPath(); context.moveTo(x, y - radius); context.quadraticCurveTo(x + radius * .75, y, x, y + radius); context.stroke();
    context.restore();
  }

  function drawStyleBackdrop(context, width, height, style, theme, portrait) {
    context.save();
    if (style === 'blue') {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#020a16'); gradient.addColorStop(.52, '#062442'); gradient.addColorStop(1, '#020c18');
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * .8, height * .12, 0, width * .8, height * .12, width * .48);
      glow.addColorStop(0, 'rgba(37,199,255,.34)'); glow.addColorStop(.35, 'rgba(24,126,209,.14)'); glow.addColorStop(1, 'rgba(3,17,34,0)');
      context.fillStyle = glow; context.fillRect(0, 0, width, height);
      context.strokeStyle = 'rgba(60,205,255,.13)'; context.lineWidth = 1;
      const spacing = portrait ? 70 : 86;
      for (let x = -height; x < width + height; x += spacing) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x + height * .48, height); context.stroke(); }
      for (let y = height * .22; y < height; y += spacing) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
      context.globalAlpha = .62; context.strokeStyle = '#25c7ff'; context.lineWidth = portrait ? 8 : 10;
      context.beginPath(); context.moveTo(0, height * .19); context.lineTo(width * .38, 0); context.stroke();
      context.beginPath(); context.moveTo(width, height * .58); context.lineTo(width * .82, height); context.stroke();
    } else if (style === 'light') {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#fffaf0'); gradient.addColorStop(.55, '#f3e7d4'); gradient.addColorStop(1, '#ead9c0');
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);
      context.fillStyle = '#182538';
      context.beginPath(); context.moveTo(width * .64, 0); context.lineTo(width, 0); context.lineTo(width, height * .31); context.lineTo(width * .78, height * .18); context.closePath(); context.fill();
      context.fillStyle = '#d85c18';
      context.beginPath(); context.moveTo(0, height * .72); context.lineTo(width * .16, height); context.lineTo(0, height); context.closePath(); context.fill();
      context.globalAlpha = .12; context.strokeStyle = '#7c512f'; context.lineWidth = 2;
      for (let x = 24; x < width; x += 36) for (let y = 26; y < height; y += 36) { context.beginPath(); context.arc(x, y, 1.6, 0, Math.PI * 2); context.stroke(); }
      context.globalAlpha = .16; context.strokeStyle = '#d85c18'; context.lineWidth = portrait ? 16 : 20;
      context.beginPath(); context.arc(width * .9, height * .15, portrait ? width * .22 : height * .24, 0, Math.PI * 2); context.stroke();
      context.beginPath(); context.arc(width * .9, height * .15, portrait ? width * .14 : height * .15, 0, Math.PI * 2); context.stroke();
    } else {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#07090c'); gradient.addColorStop(.56, '#11171c'); gradient.addColorStop(1, '#080b0e');
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * .74, height * .1, 0, width * .74, height * .1, width * .42);
      glow.addColorStop(0, 'rgba(255,117,0,.36)'); glow.addColorStop(.38, 'rgba(255,85,0,.12)'); glow.addColorStop(1, 'rgba(255,117,0,0)');
      context.fillStyle = glow; context.fillRect(0, 0, width, height);
      context.fillStyle = 'rgba(255,117,0,.88)';
      context.beginPath(); context.moveTo(width * .72, 0); context.lineTo(width, 0); context.lineTo(width, height * .13); context.lineTo(width * .84, height * .24); context.closePath(); context.fill();
      context.fillStyle = 'rgba(255,117,0,.2)';
      context.beginPath(); context.moveTo(0, height * .42); context.lineTo(width * .17, height); context.lineTo(0, height); context.closePath(); context.fill();
      context.globalAlpha = .16; context.strokeStyle = '#ff7500'; context.lineWidth = portrait ? 12 : 15;
      context.beginPath(); context.arc(width * .9, height * .13, portrait ? width * .24 : height * .28, .25, Math.PI * 1.75); context.stroke();
      context.globalAlpha = .2; context.fillStyle = '#ff8a21';
      for (let x = width * .68; x < width; x += 22) for (let y = 24; y < height * .25; y += 22) { context.beginPath(); context.arc(x, y, 2.2, 0, Math.PI * 2); context.fill(); }
    }
    context.restore();
  }

  function loadPosterImage(source) {
    if (!source) return Promise.resolve(null);
    if (posterImageCache.has(source)) return posterImageCache.get(source);
    const promise = new Promise((resolve) => {
      const image = new Image();
      if (/^https?:/i.test(source)) image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
    });
    posterImageCache.set(source, promise);
    return promise;
  }

  function drawEventLogo(context, image, x, y, size, backgroundKey, theme) {
    const backgrounds = { dark: '#101419', white: '#ffffff', light: '#eef1f3', cream: '#fff5df', orange: '#ff7500' };
    fillRoundedRect(context, x, y, size, size, size * .2, backgrounds[backgroundKey] || backgrounds.dark);
    context.save(); roundedRect(context, x, y, size, size, size * .2); context.clip();
    if (image) {
      const padding = size * .09;
      const box = size - padding * 2;
      const scale = Math.min(box / image.naturalWidth, box / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      context.drawImage(image, x + (size - drawWidth) / 2, y + (size - drawHeight) / 2, drawWidth, drawHeight);
    } else drawBasketballMark(context, x + size / 2, y + size / 2, size * .3, theme);
    context.restore();
    context.strokeStyle = theme.line; context.lineWidth = 2; roundedRect(context, x, y, size, size, size * .2); context.stroke();
  }

  function drawContainedImage(context, image, x, y, width, height) {
    if (!image) return;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawTeamLogo(context, image, x, y, size, theme) {
    const radius = Math.max(7, size * .2);
    fillRoundedRect(context, x, y, size, size, radius, 'rgba(255,255,255,.94)');
    context.save();
    roundedRect(context, x, y, size, size, radius);
    context.clip();
    drawContainedImage(context, image, x + size * .1, y + size * .1, size * .8, size * .8);
    context.restore();
    context.strokeStyle = theme.line;
    context.lineWidth = 1.5;
    roundedRect(context, x, y, size, size, radius);
    context.stroke();
  }

  function teamPresentation(entries, portrait, requestedScale = 100) {
    const groupCount = Math.max(1, entries.length);
    const maxTeams = Math.max(1, ...entries.map(([, teams]) => teams.length));
    let densityScale = .72;
    if (groupCount <= 2 && maxTeams <= 3) densityScale = 1.34;
    else if (groupCount <= 2 && maxTeams <= 4) densityScale = 1.22;
    else if (groupCount <= 4 && maxTeams <= 4) densityScale = .9;
    else if (groupCount <= 4 && maxTeams <= 6) densityScale = .76;
    const manualScale = Math.max(.75, Math.min(1.5, Number(requestedScale || 100) / 100));
    const scale = densityScale * manualScale;
    return {
      rowHeight: (portrait ? 92 : 82) * scale,
      logoSize: (portrait ? 78 : 72) * scale,
      nameSize: (portrait ? 46 : 42) * scale,
      numberSize: (portrait ? 25 : 23) * scale,
      groupCount,
      maxTeams
    };
  }

  function drawFormatBackdrop(context, width, height, theme, preset, portrait) {
    const normalized = String(preset || 'group-only');
    context.save();
    context.globalAlpha = .13;
    context.strokeStyle = theme.accent;
    context.fillStyle = theme.accent;
    context.lineWidth = Math.max(2, width * .002);
    if (normalized.includes('double-knockout')) {
      const startX = width * .48;
      const topY = height * .10;
      [0, 1].forEach((track) => {
        const offset = track * height * .13;
        context.beginPath();
        context.moveTo(startX, topY + offset);
        context.bezierCurveTo(width * .68, topY + offset - height * .04, width * .76, topY + offset + height * .12, width * .94, topY + offset + height * .08);
        context.stroke();
        for (let node = 0; node < 5; node += 1) {
          const x = startX + (width * .46 / 4) * node;
          const y = topY + offset + Math.sin(node * 1.4) * height * .025;
          context.beginPath(); context.arc(x, y, width * .007, 0, Math.PI * 2); context.fill();
        }
      });
    } else if (normalized.includes('knockout')) {
      const originX = portrait ? width * .58 : width * .64;
      const originY = height * .06;
      const roundWidth = portrait ? width * .11 : width * .08;
      const roundHeight = height * .055;
      for (let round = 0; round < 4; round += 1) {
        const matches = Math.max(1, 8 / (2 ** round));
        for (let match = 0; match < matches; match += 1) {
          const x = originX + round * roundWidth;
          const y = originY + (match + .5) * (height * .30 / matches);
          context.beginPath();
          context.moveTo(x, y - roundHeight / 2);
          context.lineTo(x + roundWidth * .55, y - roundHeight / 2);
          context.lineTo(x + roundWidth * .55, y + roundHeight / 2);
          context.lineTo(x, y + roundHeight / 2);
          context.stroke();
        }
      }
    } else if (normalized === 'round-robin' || normalized === 'double-round' || normalized.includes('round-robin')) {
      const cx = width * .82;
      const cy = height * .15;
      const maxRadius = portrait ? width * .28 : height * .16;
      [1, .72, .44].forEach((scale) => { context.beginPath(); context.arc(cx, cy, maxRadius * scale, 0, Math.PI * 2); context.stroke(); });
      for (let index = 0; index < 8; index += 1) {
        const angle = Math.PI * 2 * index / 8;
        context.beginPath(); context.arc(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius, width * .007, 0, Math.PI * 2); context.fill();
      }
    } else {
      const cols = portrait ? 4 : 6;
      const size = portrait ? width * .12 : width * .075;
      const startX = width - size * (cols + .5);
      const startY = height * .045;
      for (let index = 0; index < cols; index += 1) {
        context.strokeRect(startX + index * size, startY, size * .78, size * .78);
        context.font = `900 ${size * .34}px sans-serif`;
        context.fillText(String.fromCharCode(65 + index), startX + index * size + size * .26, startY + size * .52);
      }
    }
    context.restore();
  }

  async function drawPoster(canvas, data, options = {}) {
    const portrait = options.ratio === '9:16';
    const width = portrait ? 900 : 1600;
    const height = portrait ? 1600 : 900;
    const theme = themes[options.style] || themes.orange;
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = theme.background; context.fillRect(0, 0, width, height);
    drawStyleBackdrop(context, width, height, options.style || 'orange', theme, portrait);

    drawFormatBackdrop(context, width, height, theme, data.formatPreset, portrait);

    const margin = portrait ? 58 : 72;
    const headerHeight = portrait ? 300 : 250;
    const logoSize = portrait ? 76 : 68;
    const logoImage = await loadPosterImage(data.logo);
    const teamLogoPairs = await Promise.all(Object.entries(data.teamLogos || {}).map(async ([name, source]) => [name, await loadPosterImage(source)]));
    const teamLogoImages = Object.fromEntries(teamLogoPairs);
    drawEventLogo(context, logoImage, margin, margin, logoSize, data.logoBackground, theme);
    context.fillStyle = theme.accent;
    context.font = `800 ${portrait ? 24 : 22}px "Microsoft YaHei", sans-serif`;
    context.fillText('官方分组结果', margin + logoSize + 20, margin + logoSize * .57);
    const titleY = margin + (portrait ? 130 : 135);
    const titleSize = fitText(context, data.eventName, width - margin * 2, portrait ? 52 : 54, 900);
    context.fillStyle = theme.text;
    context.font = `900 ${titleSize}px "Microsoft YaHei", sans-serif`;
    context.fillText(data.eventName, margin, titleY);
    context.fillStyle = theme.muted;
    context.font = `600 ${portrait ? 24 : 21}px "Microsoft YaHei", sans-serif`;
    context.fillText(`${data.groupName} · ${data.competition}`, margin, titleY + (portrait ? 48 : 42));

    const entries = Object.entries(data.assignments);
    const presentation = teamPresentation(entries, portrait, options.teamScale);
    const columns = portrait ? (entries.length <= 2 ? 1 : Math.min(2, entries.length)) : Math.min(4, Math.max(1, entries.length));
    const rows = Math.ceil(entries.length / columns);
    const gap = portrait ? 22 : 20;
    const footerHeight = portrait ? 105 : 80;
    const gridTop = headerHeight + margin;
    const gridHeight = height - gridTop - footerHeight - margin;
    const cardWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
    const cardHeight = (gridHeight - gap * (rows - 1)) / Math.max(1, rows);
    const cardPadding = portrait ? 22 : 20;

    entries.forEach(([letter, teams], index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + col * (cardWidth + gap);
      const y = gridTop + row * (cardHeight + gap);
      fillRoundedRect(context, x, y, cardWidth, cardHeight, 18, theme.panel);
      context.strokeStyle = theme.line;
      context.lineWidth = 2;
      roundedRect(context, x, y, cardWidth, cardHeight, 18);
      context.stroke();
      fillRoundedRect(context, x, y, cardWidth, Math.min(78, cardHeight * .24), 18, theme.panelAlt);
      context.fillStyle = theme.accent;
      context.font = `900 ${portrait ? 32 : 28}px "Microsoft YaHei", sans-serif`;
      context.fillText(`${letter} 组`, x + cardPadding, y + (portrait ? 49 : 45));
      context.textAlign = 'right';
      context.fillStyle = theme.muted;
      context.font = `600 ${portrait ? 18 : 16}px "Microsoft YaHei", sans-serif`;
      context.fillText(`${teams.length} 支球队`, x + cardWidth - cardPadding, y + (portrait ? 47 : 43));
      context.textAlign = 'left';
      const listTop = y + Math.min(92, cardHeight * .29);
      const listHeight = cardHeight - (listTop - y) - 18;
      const rowHeight = Math.min(presentation.rowHeight, listHeight / Math.max(1, teams.length));
      teams.forEach((team, teamIndex) => {
        const rowY = listTop + teamIndex * rowHeight;
        if (teamIndex > 0) {
          context.strokeStyle = theme.line;
          context.lineWidth = 1;
          context.beginPath(); context.moveTo(x + cardPadding, rowY); context.lineTo(x + cardWidth - cardPadding, rowY); context.stroke();
        }
        const teamLogo = teamLogoImages[team];
        const teamLogoSize = teamLogo ? Math.min(presentation.logoSize, rowHeight * .92) : 0;
        const numberX = x + cardPadding;
        const logoX = numberX + (portrait ? 52 : 48);
        if (teamLogo) drawTeamLogo(context, teamLogo, logoX, rowY + (rowHeight - teamLogoSize) / 2, teamLogoSize, theme);
        const teamX = logoX + (teamLogo ? teamLogoSize + 12 : 0);
        context.fillStyle = theme.accent;
        context.font = `800 ${Math.max(16, Math.min(presentation.numberSize, rowHeight * .42))}px "Microsoft YaHei", sans-serif`;
        context.fillText(String(teamIndex + 1).padStart(2, '0'), numberX, rowY + rowHeight * .66);
        const teamFont = fitText(context, team, x + cardWidth - cardPadding - teamX, Math.max(18, Math.min(presentation.nameSize, rowHeight * .6)), 700);
        context.fillStyle = theme.text;
        context.font = `700 ${teamFont}px "Microsoft YaHei", sans-serif`;
        context.fillText(team, teamX, rowY + rowHeight * .66);
      });
    });

    context.fillStyle = theme.muted;
    context.font = `500 ${portrait ? 18 : 16}px "Microsoft YaHei", sans-serif`;
    context.fillText(`分组确认时间：${data.exportedAt}`, margin, height - margin * .55);
    context.textAlign = 'right';
    context.fillStyle = theme.accent;
    context.font = `800 ${portrait ? 19 : 17}px "Microsoft YaHei", sans-serif`;
    context.fillText('由赛小蜂篮球赛事中心生成', width - margin, height - margin * .55);
    context.textAlign = 'left';
    return { width, height };
  }

  function downloadPoster(canvas, data, options) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('海报生成失败')); return; }
        const ratioLabel = options.ratio === '9:16' ? '竖版9比16' : '横版16比9';
        const styleName = posterStyles.find((style) => style.id === options.style)?.name || '热血橙黑';
        downloadBlob(blob, `${safeFileName(`${data.eventName}-${data.groupName}-分组海报-${ratioLabel}-${styleName}`)}.png`);
        resolve();
      }, 'image/png');
    });
  }

  window.SXFDrawExport = { posterStyles, spreadsheetXml, downloadTable, drawPoster, downloadPoster, safeFileName, teamPresentation };
})();
