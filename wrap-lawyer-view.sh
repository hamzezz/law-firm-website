cat .env.localcat .env.localcat .env.localgit status#!/bin/bapython3 << 'PYEOF'
p='app/api/manager/upload-sessions/route.ts'
c=open(p,encoding='utf-8').read()

# 1) استخدام الخريطة بدل استعلامين لاسم الموكل
old1="""    let clientName = 'غير محدد'
    const { data: clientRow } = await admin
      .from('clients')
      .select('user_id')
      .eq('id', matchedCase.client_id)
      .single()
    if (clientRow) {
      const { data: clientUser } = await admin
        .from('users')
        .select('full_name')
        .eq('id', clientRow.user_id)
        .single()
      if (clientUser) clientName = clientUser.full_name
    }"""
new1="""    const clientName = clientNameById.get(matchedCase.client_id) || 'غير محدد'"""
ok1 = old1 in c
c = c.replace(old1, new1)

# 2) جلب المحامين مرة واحدة قبل الحلقة
old2="""  const matchedCases: any[] = []
  // نتتبّع القضايا المعالجة"""
new2="""  // خريطة المحامين مرة واحدة بدل استعلام لكل قضية
  const { data: allLawyerRows } = await admin.from('lawyers').select('id, user_id')
  const lawyerUserById = new Map((allLawyerRows || []).map((l: any) => [l.id, l.user_id]))
  const allLawyerUserIds = (allLawyerRows || []).map((l: any) => l.user_id)

  const matchedCases: any[] = []
  // نتتبّع القضايا المعالجة"""
ok2 = old2 in c
c = c.replace(old2, new2)

# 3) استخدام الخرائط لتحديد المستلمين
old3="""    if (matchedCase.primary_lawyer_id) {
      const { data: lawyerRow } = await admin
        .from('lawyers')
        .select('user_id')
        .eq('id', matchedCase.primary_lawyer_id)
        .single()
      if (lawyerRow) recipientUserIds.push(lawyerRow.user_id)
    } else {
      const { data: allLawyers } = await admin.from('lawyers').select('user_id')
      if (allLawyers) {
        for (const lawyer of allLawyers) recipientUserIds.push(lawyer.user_id)
      }
    }"""
new3="""    if (matchedCase.primary_lawyer_id) {
      const lawyerUserId = lawyerUserById.get(matchedCase.primary_lawyer_id)
      if (lawyerUserId) recipientUserIds.push(lawyerUserId)
    } else {
      for (const uid of allLawyerUserIds) recipientUserIds.push(uid)
    }"""
ok3 = old3 in c
c = c.replace(old3, new3)

open(p,'w',encoding='utf-8').write(c)
print("1:", "OK" if ok1 else "NOT FOUND")
print("2:", "OK" if ok2 else "NOT FOUND")
print("3:", "OK" if ok3 else "NOT FOUND")
PYEOFsh
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
