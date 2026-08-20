from __future__ import annotations

import os
from pathlib import Path

import pythoncom
from win32com.client import dynamic


ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_DIR = ROOT / "软著材料" / "00_模板"
INFO_DOC = TEMPLATE_DIR / "software-info-template.doc"
FEATURES_DOC = TEMPLATE_DIR / "features-template.docx"


def word_app():
    clsid = pythoncom.MakeIID("{000209FF-0000-0000-C000-000000000046}")
    obj = pythoncom.CoCreateInstance(
        clsid,
        None,
        pythoncom.CLSCTX_LOCAL_SERVER,
        pythoncom.IID_IDispatch,
    )
    app = dynamic.Dispatch(obj)
    app.Visible = False
    app.DisplayAlerts = 0
    return app


def style_range(rng, size=10.5, bold=False):
    rng.Font.Name = "宋体"
    rng.Font.NameFarEast = "宋体"
    rng.Font.Size = size
    rng.Font.Bold = -1 if bold else 0
    rng.Font.Color = 0


def replace_paragraph(doc, index: int, text: str, size=10.5, bold=False):
    paragraph = doc.Paragraphs(index)
    rng = paragraph.Range.Duplicate
    # 仅替换段落内文字，保留段落标记、单元格标记和原表格结构。
    while rng.End > rng.Start and doc.Range(rng.End - 1, rng.End).Text in ("\r", "\x07"):
        rng.End -= 1
    rng.Text = text
    style_range(rng, size=size, bold=bold)


def replace_cell_by_paragraph(doc, index: int, text: str, size=10.5, bold=False):
    paragraph = doc.Paragraphs(index)
    cell = paragraph.Range.Cells(1)
    rng = cell.Range.Duplicate
    # Word 对象模型中单元格结束标记显示为 \r\x07，
    # 但在 Range 位置中只占一个逻辑字符。
    rng.End -= 1
    rng.Text = text
    style_range(rng, size=size, bold=bold)


def replace_table_cell(cell, text: str, size=10.5):
    rng = cell.Range.Duplicate
    rng.End -= 1
    rng.Text = text
    style_range(rng, size=size)


def fill_info_template(app):
    doc = app.Documents.Open(str(INFO_DOC), False, False)
    try:
        # 旧版 .doc 在单元格写入后可能重新计算段落索引，
        # 因此所有定位操作严格按段落号从大到小执行。
        cell_ops = {
            149: ("● 小程序    ● 云计算软件    ● 大数据软件", 11, False),
            146: ("采用微信原生小程序与云函数架构，针对PAD横屏优化现场计分；通过操作日志实现上一步撤销，以六栏导航统一赛事、球员、教务与数据入口。", 9.5, False),
            142: ("系统支持微信登录、快捷比赛、赛事创建与场次管理、球队和球员库、PAD横屏现场计分、节次与时间控制、比分、犯规、暂停、换人、操作撤销、阵容选择、MC音效及比赛数据管理，并为教务与数据中心扩展提供统一入口。", 9.5, False),
            138: ("体育赛事、篮球教育培训、运动场馆和青少年篮球机构。", 9.5, False),
            133: ("为篮球赛事组织者和教培机构提供赛事创建、现场计分与资料管理工具。", 9.5, False),
            127: ("22800", 9.5, False),
            123: ("JavaScript、WXML、WXSS、JSON", 9.5, False),
            120: ("22800行", 9.5, False),
            117: ("微信客户端、小程序基础库及云开发/云函数服务。", 9.5, False),
            113: ("微信小程序平台，iOS、Android、HarmonyOS等微信支持系统。", 9.5, False),
            108: ("微信开发者工具、Node.js、Visual Studio Code、Git。", 9.5, False),
            103: ("Windows 11操作系统。", 9.5, False),
            96: ("支持微信的智能手机或平板，现场计分推荐PAD横屏。", 9.5, False),
            91: ("x64架构开发电脑，8GB以上内存，具备网络环境。", 9.5, False),
            50: ("[待填写]", 8.5, False),
            49: ("中国", 8.5, False),
            48: ("[待填写]", 8.5, False),
            47: ("[待填写]", 8.5, False),
            46: ("[法人/个人]", 8.5, False),
            45: ("[待填写全称]", 8.5, False),
            34: ("● 独立开发   ○ 合作开发   ○ 委托开发   ○ 下达任务开发", 10, False),
            31: ("○ 已发表（首次发表日期及地点：[待确认]）\v● 未发表（待申请人最终确认）", 10, False),
            28: ("[待填写]    （至少在公司成立3个月之后）", 10, False),
            10: ("赛小蜂篮球", 11, False),
            7: ("V1.0", 12, True),
            4: ("赛小蜂篮球赛事管理软件", 12, True),
        }
        paragraph_ops = {
            25: ("公司成立时间    [待填写]年   [待填写]月", 10, False),
            17: ("○ 中间件", 10.5, False),
            16: ("○ 嵌入式软件", 10.5, False),
            15: ("○ 操作系统      （任选一项）", 10.5, False),
            14: ("● 应用软件", 10.5, False),
        }
        operations = [(idx, "cell", value) for idx, value in cell_ops.items()]
        operations += [(idx, "paragraph", value) for idx, value in paragraph_ops.items()]
        for index, kind, (text, size, bold) in sorted(operations, reverse=True):
            if kind == "cell":
                replace_cell_by_paragraph(doc, index, text, size, bold)
            else:
                replace_paragraph(doc, index, text, size, bold)

        doc.Save()
    finally:
        doc.Close(False)


def fill_features_template(app):
    doc = app.Documents.Open(str(FEATURES_DOC), False, False)
    try:
        cell_ops = {
            52: ("采用微信原生小程序与云函数架构，针对PAD横屏优化计分控制，通过操作日志支持上一步撤销，并以六栏导航统一业务入口。", 9.5),
            49: ("支持微信登录、快捷比赛、赛事与场次管理、球队球员库、PAD横屏计分、时间节次、比分、犯规、暂停、换人、撤销、阵容选择、MC音效及比赛数据管理。", 9.5),
            46: ("为赛事组织者和教培机构提供赛事创建、现场计分与资料管理工具。", 9.5),
            43: ("应用软件（小程序）", 9.5),
            41: ("体育赛事、篮球教育培训、运动场馆", 9.5),
            38: ("22800", 9.5),
            36: ("JavaScript、WXML、WXSS、JSON", 9.5),
            33: ("微信客户端、小程序基础库和云函数", 9),
            31: ("微信小程序平台，iOS、Android、HarmonyOS", 9),
            28: ("微信开发者工具、Node.js、VS Code、Git", 9),
            26: ("Windows 11", 9.5),
            23: ("支持微信的手机或平板，计分推荐PAD横屏", 9),
            20: ("x64架构电脑，8GB以上内存，具备网络环境", 9),
            17: ("60", 10),
            15: ("15", 10),
            9: ("赛小蜂篮球", 10),
            8: ("软件简称", 10),
            7: ("V1.0", 10),
            5: ("赛小蜂篮球赛事管理软件", 10),
        }
        for index, (text, size) in sorted(cell_ops.items(), reverse=True):
            replace_cell_by_paragraph(doc, index, text, size)
        doc.Save()
    finally:
        doc.Close(False)


def main():
    app = word_app()
    try:
        fill_info_template(app)
        fill_features_template(app)
    finally:
        app.Quit()
    print(INFO_DOC)
    print(FEATURES_DOC)


if __name__ == "__main__":
    main()
