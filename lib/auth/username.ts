/**
 * توليد اسم مستخدم عشوائي.
 *
 * حروفٌ لاتينية صغيرة فقط — لا أرقام ولا نقاط ولا شرطات. وهو داخلٌ
 * في شرط الإنشاء القائم `^[a-z0-9._-]+$` فلا يُردّ.
 *
 * ويُبنى بتعاقب ساكنٍ ومتحرّك (CVCVCVCV) لا بحروفٍ عشوائية محضة،
 * لسببٍ عمليّ لا جماليّ: الإدارة تُملي اسم الدخول على الموكّل في
 * الهاتف، و«tulamevo» تُملى في ثانية، و«xkqbzrfw» تُعاد خمس مرّات
 * ثم تُكتب خطأً.
 *
 * وأُسقطت `q` و`x` و`y` من السواكن لأنها تُنطق بأكثر من وجه عند
 * الإملاء بالعربية.
 *
 * والاحتمالات نحو مئة مليون، فالتكرار بعيد. ومع ذلك يفحص الخادم
 * التكرار ويردّ برسالةٍ عربية — فلا يُعتمد على الاحتمال وحده.
 */
const CONSONANTS = 'bcdfghjklmnprstvwz'
const VOWELS = 'aeiou'

function pick(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function generateUsername(): string {
  let name = ''
  for (let i = 0; i < 4; i++) {
    name += pick(CONSONANTS) + pick(VOWELS)
  }
  return name
}
