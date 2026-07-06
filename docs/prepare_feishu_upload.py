from pathlib import Path
import shutil
root = Path(r'C:\Users\Frank\Documents\赛小蜂篮球')
upload = Path(r'C:\Users\Frank\Documents\feishu-upload')
imgdir = upload / 'images'
imgdir.mkdir(parents=True, exist_ok=True)
items = [
('01-login.png', root/'docs/prototype-v1-raster/01-登录页.png','登录页','1.0必做','微信登录、游客体验、协议勾选、品牌露出。'),
('02-home.png', root/'docs/prototype-v1-raster/02-首页.png','首页','1.0必做','快速开始比赛、最近赛果、创建赛事、球员库入口。'),
('03-quick-match.png', root/'docs/prototype-v1-raster/03-快速比赛设置.png','快速比赛设置','1.0必做','设置主客队、节数、每节时长、计时方式。'),
('04-scorer-mobile.png', root/'docs/prototype-assets/screens/33-scorer-mobile-final-drawers-small-mc.png','竖屏裁判比分板最终版','1.0必做','核心计分、计时、犯规、暂停、换人、技术统计、MC小按钮、左右球员抽屉、交换场地。'),
('05-scorer-pad.png', root/'docs/prototype-assets/screens/32-scorer-pad-final-no-referee-checkin.png','PAD横屏比分板最终版','1.0建议做','记录台/PAD横屏使用，三栏布局，左右首发/替补抽屉，中间交换场地，底部MC面板。'),
('06-mc-drawer.png', root/'docs/prototype-v1-raster/05-MC音效抽屉.png','MC音效抽屉','1.0必做','现场欢呼、进攻、防守、暂停、得分播报等音效入口。'),
('07-mine.png', root/'docs/prototype-v1-raster/06-我的页面.png','我的页面','1.0必做','账号信息、会员、反馈、音效设置入口。'),
('08-mc-settings.png', root/'docs/prototype-v1-raster/07-MC音效设置.png','MC音效设置','1.0必做','音效开关、随机/固定播放、语音包、外设快捷键配置。'),
('09-tournament-list.png', root/'docs/prototype-v1-raster/09-赛事列表.png','赛事列表','1.0必做','赛事列表、状态筛选、创建赛事入口。'),
('10-tournament-detail.png', root/'docs/prototype-v1-raster/10-赛事详情场次.png','赛事详情/场次管理','1.0必做','赛事信息、添加场次、添加球队、球员名单、进入计分。'),
('11-player-library.png', root/'docs/prototype-v1-raster/11-球员库.png','球员库','1.0必做','添加球员、姓名号码、所属球队、编辑球员。'),
('12-pc-admin.png', root/'docs/prototype-v1-raster/08-PC管理后台.png','PC管理后台','1.0必做','用户、会员码、权益、MC音乐库管理。'),
]
for name, src, *_ in items:
    shutil.copyfile(src, imgdir/name)
lines = []
lines.append('# 赛小蜂篮球 1.0 版本范围与原型交付说明')
lines.append('')
lines.append('面向开发、产品、UI。本文用于明确 1.0 本期实现页面，并区分 2.0/后期迭代功能，避免开发范围失控。')
lines.append('')
lines.append('## 一、1.0 版本定位')
lines.append('')
lines.append('1.0 不是完整教培 SaaS，而是“篮球赛事计分 + MC现场音效 + 基础赛事/球员管理 + PC音频后台”的可演示、可交付版本。')
lines.append('')
lines.append('### 1.0 必须体现')
for x in ['登录与游客体验','首页快速开赛','快速比赛设置','手机竖屏计分盘','PAD横屏计分盘（建议作为增强项）','MC音效播放与设置','赛事列表与场次进入计分','基础球员库','我的页面','PC后台音乐库/会员管理']:
    lines.append(f'- {x}')
lines.append('')
lines.append('### 1.0 暂不展开')
for x in ['完整教务课消','薪酬销售核算','自动资格校验','首发报告/裁判报告/PDF专业报表','家长端球员卡/徽章/数据海报','多角色权限体系','教练游戏化成长体系']:
    lines.append(f'- {x}')
lines.append('')
lines.append('## 二、1.0 页面与原型图')
for i,(name, src, title, status, desc) in enumerate(items,1):
    lines.append('')
    lines.append(f'### {i}. {title}（{status}）')
    lines.append(f'【插图-{i:02d}】')
    lines.append(f'- 页面用途：{desc}')
    if title == '竖屏裁判比分板最终版':
        lines.append('- 实现规则：加分按钮最大；MC按钮不能大于加分按钮；裁判签到不放本页；球员改为左右抽屉。')
    elif title == 'PAD横屏比分板最终版':
        lines.append('- 实现规则：中间必须有交换场地按钮；交换时队名、比分、犯规、暂停和在场队员的左右显示同步互换。')
    else:
        lines.append('- 实现规则：按 1.0 范围做基础能力，不接入 2.0 的教务和报表闭环。')
lines.append('')
lines.append('## 三、后期迭代页面池')
future = [
('家长端卖课/课程体系','后期作为家长端/招生端，不纳入 1.0 核心计分交付。代表图：02-parent-courses、03-course-detail、04-trial-booking、05-student-growth-file。'),
('教务管理','2.0 教培机构管理能力，涉及课消、薪酬、校区、数据中台。代表图：06-org-workbench、09-edu-admin、10-data-center、20-payroll、21-student-detail-data-center。'),
('赛事数据打通','2.0 赛事执行闭环，涉及名单、资格校验、报表、裁判报告。代表图：14-roster-import、15-eligibility-check、25-starting-lineup-report、26-referee-postgame-report、19-match-report。'),
('家长传播资产','2.0 传播能力，包含球员卡、徽章、数据海报。代表图：11-parent-share-assets、17-parent-match-data。'),
('多角色/游客/教练游戏化','2.0 角色体系，1.0 暂不展开。代表图：12-role-entry、16-coach-record、18-public-live-score、22-coach-gamification。'),
]
for title, desc in future:
    lines.append(f'### {title}')
    lines.append(desc)
    lines.append('')
lines.append('## 四、开发优先级')
for x in ['P0：登录、首页、快速比赛设置、手机计分盘、赛事列表、赛事详情、球员库。','P1：MC音效抽屉、MC音效设置、我的页面、PC后台音乐库。','P2：PAD横屏比分板、外设快捷键、会员权益展示。','P3：2.0教务、报表、家长传播、角色体系。']:
    lines.append(f'- {x}')
lines.append('')
lines.append('## 五、实现原则')
for x in ['复杂视觉素材用图片，比分、队名、球员、计时、表格必须用真实组件渲染。','比分板页面不放裁判签到，裁判签到后期放到递交首发/赛前管理页面。','加分按钮是计分盘最大按钮，MC按钮必须小于加分按钮。','交换场地只交换 UI 左右显示，不改变真实球队 ID 和历史事件归属。','1.0 先保证现场可用，2.0 再做教务和赛事数据深度打通。']:
    lines.append(f'- {x}')
(upload/'v1-content.md').write_text('\n'.join(lines), encoding='utf-8')
(upload/'image-list.txt').write_text('\n'.join([f'{i+1:02d}|{name}|{title}' for i,(name,_,title,_,_) in enumerate(items)]), encoding='utf-8')
print(upload/'v1-content.md')
print(upload/'image-list.txt')
