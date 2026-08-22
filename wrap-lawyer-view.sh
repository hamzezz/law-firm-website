#!/bin/bash
# سكربت لف محتوى لوحة المحامي بمكوّن ViewSwitcher (تبويب قضايا/تقويم)
# طريقة الاستخدام: bash wrap-lawyer-view.sh

cat > /tmp/wrap_lawyer_view.py << 'SCRIPT_END'
with open('app/lawyer/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1) إضافة الاستيراد
content = content.replace(
    "import CalendarView from './calendar-view'",
    "import ViewSwitcher from './view-switcher'"
)

# 2) استبدال <main ...> بفتح main + فتح ViewSwitcher مع casesContent
old_main_open = '      <main className="max-w-4xl mx-auto p-6">'
new_main_open = '''      <main className="max-w-4xl mx-auto p-6">
        <ViewSwitcher calendarEvents={calendarEvents} casesContent={<>'''

if old_main_open in content and 'ViewSwitcher calendarEvents' not in content:
    content = content.replace(old_main_open, new_main_open, 1)

    # 3) إغلاق قبل </main> النهائي: نبحث عن آخر ظهور لـ </main> ونضيف قبله إغلاق Fragment و ViewSwitcher
    last_main_close_index = content.rfind('</main>')
    if last_main_close_index != -1:
        closing = '</>} />\n      '
        content = content[:last_main_close_index] + closing + content[last_main_close_index:]

    with open('app/lawyer/dashboard/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("SKIPPED or FAILED")
SCRIPT_END

python3 /tmp/wrap_lawyer_view.py
