"""
Excel 消费数据导入脚本
将 景点景区旅游数据行为分析数据(1).xlsx 中的灵山相关数据导入 CloudBase sales_data 集合

使用方法：
    1. 安装依赖: pip install openpyxl
    2. 将输出 JSON 文件导入 CloudBase 控制台 → 数据库 → sales_data → 导入
    3. 或配合云函数实现自动导入

筛选条件: attraction_name 包含 "灵山" 或 "拈花湾" (约 777 条)
"""

import openpyxl
import json
import os
from datetime import datetime

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '景点景区旅游数据行为分析数据(1).xlsx')
OUTPUT_JSON = os.path.join(os.path.dirname(__file__), 'lingshan_sales_data.json')
OUTPUT_LINES = os.path.join(os.path.dirname(__file__), 'lingshan_sales_data.jsonl')

LINGSHAN_KEYWORDS = ['灵山', '拈花湾']


def parse_value(val):
    """将 Excel 单元格值转为可 JSON 序列化的格式"""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d')
    if isinstance(val, (int, float)):
        return val
    return str(val)


def is_lingshan(attraction_name):
    """判断是否为灵山相关景点"""
    if not attraction_name:
        return False
    name = str(attraction_name)
    return any(kw in name for kw in LINGSHAN_KEYWORDS)


def main():
    print(f"📖 正在读取 Excel: {EXCEL_PATH}")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb['景点景区旅游数据行为分析数据']

    headers = None
    lingshan_data = []
    total_rows = 0

    for row in ws.iter_rows(values_only=True):
        total_rows += 1
        if headers is None:
            headers = [str(h) for h in row]
            print(f"📋 列名: {headers}")
            continue

        attraction_name = str(row[4]) if row[4] else ''

        if not is_lingshan(attraction_name):
            continue

        record = {
            'tourist_id': parse_value(row[0]),
            'user_nickname': parse_value(row[1]),
            'age': parse_value(row[2]),
            'gender': parse_value(row[3]),
            'attraction_name': parse_value(row[4]),
            'attraction_type': parse_value(row[6]),
            'visit_date': parse_value(row[7]),
            'stay_duration': parse_value(row[8]),
            'ticket_cost': parse_value(row[9]),
            'food_cost': parse_value(row[10]),
            'shopping_cost': parse_value(row[11]),
            'transport_cost': parse_value(row[12]),
            'entertainment_cost': parse_value(row[13]),
            'total_cost': parse_value(row[14]),
            'group_size': parse_value(row[15]),
            'satisfaction': parse_value(row[16]),
            'import_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        lingshan_data.append(record)

    wb.close()

    print(f"📊 总记录数: {total_rows - 1}")
    print(f"🔍 灵山相关记录: {len(lingshan_data)}")

    # 统计各景点数量
    from collections import Counter
    attraction_counts = Counter(r['attraction_name'] for r in lingshan_data)
    for name, count in attraction_counts.most_common():
        print(f"   {name}: {count} 条")

    # 输出 JSON Lines 格式（CloudBase 控制台导入用，每行一条 JSON，后缀 .json）
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        for record in lingshan_data:
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
    print(f"\n✅ 导入用文件已保存: {OUTPUT_JSON}")
    print(f"   格式: JSON Lines（每行一个 JSON 对象）")
    print(f"   文件大小: {os.path.getsize(OUTPUT_JSON) / 1024:.1f} KB")

    # 同时输出格式化 JSON 数组版本（方便查看数据结构）
    pretty_path = os.path.join(os.path.dirname(__file__), 'lingshan_sales_data_pretty.json')
    with open(pretty_path, 'w', encoding='utf-8') as f:
        json.dump(lingshan_data[:3], f, ensure_ascii=False, indent=2)  # 只存前3条供预览
    print(f"✅ 预览文件已保存: {pretty_path} (前3条数据)")

    print("\n📝 下一步:")
    print("   1. 在 CloudBase 控制台创建 sales_data 集合")
    print("   2. 设置权限：仅管理员可读写")
    print("   3. CloudBase 控制台 → 数据库 → sales_data → 导入")
    print("   4. 选择 lingshan_sales_data.json（JSON Lines 格式，控制台自动识别）")


if __name__ == '__main__':
    main()
