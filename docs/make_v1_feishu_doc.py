# -*- coding: utf-8 -*-
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import html, struct, os

root = Path.cwd()
out_dir = root / 'docs' / 'prototype-v1-raster'
out_dir.mkdir(parents=True, exist_ok=True)
md_path = out_dir / 'saixiaofeng-basketball-v1-feishu.md'
docx_path = out_dir / 'saixiaofeng-basketball-v1-feishu.docx'

v1 = Path('docs/prototype-v1-raster')
screens = Path('docs/prototype-assets/screens')

sections = [
    ('登录页', v1/'01-登录页.png', '1.0必做', ['微信登录、游客体验、协议勾选、品牌露出。', '实现重点：登录状态、游客态、协议勾选校验。']),
    ('首页', v1/'02-首页.png', '1.0必做', ['快速开始比赛、最近赛果、创建赛事、球员库入口。', '实现重点：首页只放高频入口，不承载复杂教务功能。']),
    ('快速比赛设置', v1/'03-快速比赛设置.png', '1.0必做', ['设置主客队、节数、每节时长、计时方式。', '实现重点：生成一场本地/云端比赛配置，进入计分盘。']),
    ('竖屏裁判比分板最终版', screens/'33-scorer-mobile-final-drawers-small-mc.png', '1.0必做', ['核心计分、计时、犯规、暂停、换人、技术统计、MC小按钮、左右球员抽屉、交换场地。', '规则：加分按钮最大；MC按钮不能大于加分按钮；裁判签到不放本页。']),
    ('PAD横屏比分板最终版', screens/'32-scorer-pad-final-no-referee-checkin.png', '1.0建议做', ['记录台/PAD横屏使用，三栏布局，左右首发/替补抽屉，中间交换场地，底部MC面板。', '如果工期紧，可作为1.0增强项，但设计上应提前确认。']),
    ('MC音效抽屉', v1/'05-MC音效抽屉.png', '1.0必做', ['现场欢呼、进攻、防守、暂停、得分播报等音效入口。', '实现重点：单路播放，进攻/防守互斥循环，当前播放高亮。']),
    ('我的页面', v1/'06-我的页面.png', '1.0必做', ['账号信息、会员、反馈、音效设置入口。', '实现重点：账号态、游客态、会员权益入口。']),
    ('MC音效设置', v1/'07-MC音效设置.png', '1.0必做', ['音效开关、随机/固定播放、语音包、外设快捷键配置。', '实现重点：设置项保存后影响计分盘MC面板。']),
    ('赛事列表', v1/'09-赛事列表.png', '1.0必做', ['赛事列表、状态筛选、创建赛事入口。', '实现重点：草稿、进行中、已结束三类状态。']),
    ('赛事详情/场次管理', v1/'10-赛事详情场次.png', '1.0必做', ['赛事信息、添加场次、添加球队、球员名单、进入计分。', '实现重点：从场次进入计分盘，赛果回写到赛事详情。']),
    ('球员库', v1/'11-球员库.png', '1.0必做', ['添加球员、姓名号码、所属球队、编辑球员。', '实现重点：1.0只做基础球员库，不做成长系统。']),
    ('PC管理后台', v1/'08-PC管理后台.png', '1.0必做', ['用户、会员码、权益、MC音乐库管理。', '实现重点：后台维护音频，小程序读取音频库。']),
]

future = [
    ('家长端卖课/课程体系', ['02-parent-courses.png','03-course-detail.png','04-trial-booking.png','05-student-growth-file.png'], '后期作为家长端/招生端，不纳入1.0核心计分交付。'),
    ('教务管理', ['06-org-workbench.png','09-edu-admin.png','10-data-center.png','20-payroll.png','21-student-detail-data-center.png'], '2.0教培机构管理能力，涉及课消、薪酬、校区、数据中台。'),
    ('赛事数据打通', ['14-roster-import.png','15-eligibility-check.png','25-starting-lineup-report.png','26-referee-postgame-report.png','19-match-report.png'], '2.0赛事执行闭环，涉及名单、资格校验、报表、裁判报告。'),
    ('家长传播资产', ['11-parent-share-assets.png','17-parent-match-data.png'], '2.0传播能力，球员卡、徽章、数据海报。'),
    ('多角色/游客/教练游戏化', ['12-role-entry.png','16-coach-record.png','18-public-live-score.png','22-coach-gamification.png'], '2.0角色体系，1.0暂不展开。'),
]

md = []
md.append('# 赛小蜂篮球 1.0 版本范围与原型交付说明')
md.append('')
md.append('> 面向对象：开发、产品、UI。  ')
md.append('> 目标：从已完成的全局原型中筛选出 1.0 本期应实现的页面，并把 2.0/后期功能单独归档，避免开发范围失控。')
md.append('')
md.append('## 一、1.0 版本定位')
md.append('')
md.append('1.0 不是完整教培 SaaS，而是“篮球赛事计分 + MC现场音效 + 基础赛事/球员管理 + PC音频后台”的可演示、可交付版本。')
md.append('')
md.append('### 1.0 必须体现')
for item in ['登录与游客体验','首页快速开赛','快速比赛设置','手机竖屏计分盘','PAD横屏计分盘（建议作为增强项）','MC音效播放与设置','赛事列表与场次进入计分','基础球员库','我的页面','PC后台音乐库/会员管理']:
    md.append(f'- {item}')
md.append('')
md.append('### 1.0 暂不展开')
for item in ['完整教务课消','薪酬销售核算','自动资格校验','首发报告/裁判报告/PDF专业报表','家长端球员卡/徽章/数据海报','多角色权限体系','教练游戏化成长体系']:
    md.append(f'- {item}')
md.append('')
md.append('## 二、1.0 页面与原型图')
for i,(title,path,status,bullets) in enumerate(sections,1):
    rel = os.path.relpath(root/path, out_dir).replace('\\','/')
    md.append(f'### {i}. {title}（{status}）')
    md.append('')
    md.append(f'![{title}]({rel})')
    md.append('')
    for b in bullets:
        md.append(f'- {b}')
    md.append('')
md.append('## 三、后期迭代页面池')
for title, imgs, desc in future:
    md.append(f'### {title}')
    md.append(desc)
    for img in imgs:
        md.append(f'- `{img}`')
    md.append('')
md.append('## 四、开发优先级')
for b in ['P0：登录、首页、快速比赛设置、手机计分盘、赛事列表、赛事详情、球员库。','P1：MC音效抽屉、MC音效设置、我的页面、PC后台音乐库。','P2：PAD横屏比分板、外设快捷键、会员权益展示。','P3：2.0教务、报表、家长传播、角色体系。']:
    md.append(f'- {b}')
md.append('')
md.append('## 五、实现原则')
for b in ['复杂视觉素材用图片，比分、队名、球员、计时、表格必须用真实组件渲染。','比分板页面不放裁判签到，裁判签到后期放到递交首发/赛前管理页面。','加分按钮是计分盘最大按钮，MC按钮必须小于加分按钮。','交换场地只交换UI左右显示，不改变真实球队ID和历史事件归属。','1.0先保证现场可用，2.0再做教务和赛事数据深度打通。']:
    md.append(f'- {b}')
md_path.write_text('\n'.join(md), encoding='utf-8')

NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture'

def esc(s): return html.escape(s, quote=True)
def p(text='', style=None):
    st = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ''
    return f'<w:p>{st}<w:r><w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'
def bullet(text):
    return f'<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>{esc(text)}</w:t></w:r></w:p>'
def png_size(path):
    with open(path,'rb') as f:
        sig=f.read(24)
    if sig[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', sig[16:24])
    return (1200,1600)
def image_xml(rid, name, cx, cy, docPrId):
    return f'''<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="{NS_WP}"><wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="{docPrId}" name="{esc(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1" xmlns:a="{NS_A}"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="{NS_A}"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="{NS_PIC}"><pic:nvPicPr><pic:cNvPr id="0" name="{esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="{rid}" xmlns:r="{NS_R}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'''
body=[]; rels=[]; media=[]; img_id=1
body.append(p('赛小蜂篮球 1.0 版本范围与原型交付说明','Title'))
body.append(p('面向开发、产品、UI。本文用于明确 1.0 本期实现页面，并区分 2.0/后期迭代功能。'))
body.append(p('一、1.0 版本定位','Heading1'))
body.append(p('1.0 不是完整教培 SaaS，而是“篮球赛事计分 + MC现场音效 + 基础赛事/球员管理 + PC音频后台”的可演示、可交付版本。'))
body.append(p('1.0 必须体现','Heading2'))
for b in ['登录与游客体验','首页快速开赛','快速比赛设置','手机竖屏计分盘','PAD横屏计分盘（建议作为增强项）','MC音效播放与设置','赛事列表与场次进入计分','基础球员库','我的页面','PC后台音乐库/会员管理']:
    body.append(bullet(b))
body.append(p('1.0 暂不展开','Heading2'))
for b in ['完整教务课消','薪酬销售核算','自动资格校验','首发报告/裁判报告/PDF专业报表','家长端球员卡/徽章/数据海报','多角色权限体系','教练游戏化成长体系']:
    body.append(bullet(b))
body.append(p('二、1.0 页面与原型图','Heading1'))
for i,(title,path,status,bullets) in enumerate(sections,1):
    abs_path=root/path
    body.append(p(f'{i}. {title}（{status}）','Heading2'))
    if abs_path.exists():
        w,h=png_size(abs_path)
        max_in = 6.3 if w > h else 3.2
        cx=int(max_in*914400); cy=int(cx*h/w)
        rid=f'rId{img_id}'; media_name=f'image{img_id}.png'
        body.append(image_xml(rid,title,cx,cy,img_id))
        rels.append((rid,f'media/{media_name}')); media.append((media_name,abs_path)); img_id+=1
    for b in bullets: body.append(bullet(b))
body.append(p('三、后期迭代页面池','Heading1'))
for title,imgs,desc in future:
    body.append(p(title,'Heading2')); body.append(p(desc))
    for img in imgs: body.append(bullet(img))
body.append(p('四、开发优先级','Heading1'))
for b in ['P0：登录、首页、快速比赛设置、手机计分盘、赛事列表、赛事详情、球员库。','P1：MC音效抽屉、MC音效设置、我的页面、PC后台音乐库。','P2：PAD横屏比分板、外设快捷键、会员权益展示。','P3：2.0教务、报表、家长传播、角色体系。']:
    body.append(bullet(b))
body.append(p('五、实现原则','Heading1'))
for b in ['复杂视觉素材用图片，比分、队名、球员、计时、表格必须用真实组件渲染。','比分板页面不放裁判签到，裁判签到后期放到递交首发/赛前管理页面。','加分按钮是计分盘最大按钮，MC按钮必须小于加分按钮。','交换场地只交换UI左右显示，不改变真实球队ID和历史事件归属。','1.0先保证现场可用，2.0再做教务和赛事数据深度打通。']:
    body.append(bullet(b))
rels_xml=''.join([f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{target}"/>' for rid,target in rels])
document_xml=f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="{NS_W}" xmlns:r="{NS_R}"><w:body>{''.join(body)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>'''
content_types='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'''
root_rels='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''
doc_rels=f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels_xml}</Relationships>'''
styles='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>'''
numbering='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>'''
with ZipFile(docx_path,'w',ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml',content_types); z.writestr('_rels/.rels',root_rels)
    z.writestr('word/document.xml',document_xml); z.writestr('word/_rels/document.xml.rels',doc_rels)
    z.writestr('word/styles.xml',styles); z.writestr('word/numbering.xml',numbering)
    for media_name,abs_path in media: z.write(abs_path,f'word/media/{media_name}')
print(str(md_path))
print(str(docx_path))
print(len(media),'images embedded')
