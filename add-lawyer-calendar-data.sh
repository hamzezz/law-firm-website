#!/bin/bash
# سكربت إضافة بيانات التقويم (جلسات + مواعيد حرجة) لصفحة المحامي
# طريقة الاستخدام: bash add-lawyer-calendar-data.sh

cat > /tmp/add_lawyer_calendar.py << 'SCRIPT_END'
with open('app/lawyer/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = "  const casesRaw = Array.from(allCasesMap.values())"

addition = '''  const casesRaw = Array.from(allCasesMap.values())

  const caseIds = casesRaw.map((c) => c.id)

  const sessionsResult = caseIds.length > 0 ? await supabase
    .from('sessions')
    .select('id, session_date, title, case_id')
    .in('case_id', caseIds) : { data: [] }
  const lawyerSessions = sessionsResult.data

  const deadlinesResult = caseIds.length > 0 ? await supabase
    .from('critical_deadlines')
    .select('id, deadline_type, deadline_date, case_id')
    .in('case_id', caseIds)
    .eq('is_resolved', false) : { data: [] }
  const lawyerDeadlines = deadlinesResult.data

  const caseTitleMap = {}
  casesRaw.forEach((c) => { caseTitleMap[c.id] = c.title })

  const calendarEvents = [
    ...(lawyerSessions || []).map((s) => ({
      date: new Date(s.session_date).toISOString().slice(0, 10),
      title: (caseTitleMap[s.case_id] || s.title) + ' - جلسة',
      caseId: s.case_id,
      type: 'session',
    })),
    ...(lawyerDeadlines || []).map((d) => ({
      date: d.deadline_date,
      title: (caseTitleMap[d.case_id] || '') + ' - ' + d.deadline_type,
      caseId: d.case_id,
      type: 'deadline',
    })),
  ]'''

if target in content and "caseIds = casesRaw" not in content:
    content = content.replace(target, addition, 1)
    with open('app/lawyer/dashboard/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("SKIPPED or FAILED")
SCRIPT_END

python3 /tmp/add_lawyer_calendar.py
