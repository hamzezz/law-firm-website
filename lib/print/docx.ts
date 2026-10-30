/**
 * مولّد ملف Word بترويسة القضية — بلا حزمة خارجية.
 *
 * ملف .docx حزمةُ ZIP فيها ملفات XML. وبناؤها هنا بأيدينا لسببٍ عملي:
 * لا يمكن إضافة حزمة إلى المشروع من هذه البيئة، وملف القفل يمنع بناءً
 * لا يطابقه. فكُتب الحدّ الأدنى الذي يفتحه Word وGoogle Docs.
 *
 * والضغط معطَّل (تخزين فقط): الملف أكبر بقليل، لكن بناءه لا يحتمل خطأً
 * في بيانات الضغط — وترويسةٌ من بضعة أسطر لا يعنيها الحجم.
 */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

type Entry = { name: string; data: Buffer }

/** حزمة ZIP بتخزينٍ بلا ضغط */
function zip(entries: Entry[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8')
    const crc = crc32(e.data)

    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)          // النسخة المطلوبة
    local.writeUInt16LE(0x0800, 6)      // أسماء بترميز UTF-8
    local.writeUInt16LE(0, 8)           // الطريقة: تخزين
    local.writeUInt16LE(0, 10)          // الوقت
    local.writeUInt16LE(0x21, 12)       // التاريخ (١٩٨٠-٠١-٠١)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(e.data.length, 18)
    local.writeUInt32LE(e.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    name.copy(local, 30)

    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0x21, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(e.data.length, 20)
    central.writeUInt32LE(e.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)        // extra
    central.writeUInt16LE(0, 32)        // تعليق
    central.writeUInt16LE(0, 34)        // رقم القرص
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)

    locals.push(local, e.data)
    centrals.push(central)
    offset += local.length + e.data.length
  }

  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...locals, centralBuf, end])
}

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** فقرة عربية من اليمين إلى اليسار */
function p(text: string, opts: { bold?: boolean; size?: number; center?: boolean; after?: number } = {}) {
  const size = opts.size || 24           // نصف نقاط: ٢٤ = ١٢pt
  const jc = opts.center ? '<w:jc w:val="center"/>' : ''
  const after = '<w:spacing w:after="' + (opts.after === undefined ? 120 : opts.after) + '"/>'
  const bold = opts.bold ? '<w:b/><w:bCs/>' : ''
  return (
    '<w:p><w:pPr><w:bidi/>' + jc + after + '</w:pPr>' +
    '<w:r><w:rPr>' + bold + '<w:rtl/><w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/></w:rPr>' +
    '<w:t xml:space="preserve">' + esc(text) + '</w:t></w:r></w:p>'
  )
}

export type DocxHeaderData = {
  courtName: string
  caseNumber: string
  caseType: string
  clientName: string
  otherParty: string
  docType: string
  dateLabel: string
}

export function buildHeaderDocx(d: DocxHeaderData): Buffer {
  const body: string[] = []

  if (d.courtName) body.push(p('أمام ' + d.courtName, { bold: true, size: 32, center: true, after: 60 }))
  if (d.caseNumber) body.push(p('في القضية رقم ' + d.caseNumber, { bold: true, size: 28, center: true, after: 240 }))

  if (d.clientName) body.push(p('المدّعي / المستأنِف: ' + d.clientName, { bold: true }))
  if (d.otherParty) body.push(p('المدّعى عليه / المستأنَف ضده: ' + d.otherParty, { bold: true }))
  if (d.caseType) body.push(p('نوع القضية: ' + d.caseType))
  if (d.docType) body.push(p('الموضوع: ' + d.docType, { bold: true }))
  if (d.dateLabel) body.push(p('التاريخ: ' + d.dateLabel, { after: 240 }))

  // فاصل ثم فراغ المتن
  body.push(
    '<w:p><w:pPr><w:bidi/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="999999"/></w:pBdr>' +
    '<w:spacing w:after="240"/></w:pPr></w:p>'
  )
  for (let i = 0; i < 3; i++) body.push(p('', { after: 0 }))

  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + body.join('') +
    '<w:sectPr><w:bidi/><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>' +
    '</w:sectPr></w:body></w:document>'

  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>' +
    '<w:sz w:val="24"/><w:szCs w:val="24"/>' +
    '<w:lang w:val="ar-YE" w:bidi="ar-YE"/>' +
    '</w:rPr></w:rPrDefault></w:docDefaults></w:styles>'

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>'

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'

  const docRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>'

  return zip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(document, 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(docRels, 'utf8') },
    { name: 'word/styles.xml', data: Buffer.from(styles, 'utf8') },
  ])
}
