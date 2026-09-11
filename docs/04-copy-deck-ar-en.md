# 04 — Bilingual copy deck (AR primary / EN secondary)

Arabic is written first; English is the translation. Every string here has a key in
`messages/ar.json` and `messages/en.json`. **No copy is hardcoded in JSX, in either language.**

Brand terms stay Latin and LTR inside Arabic text — wrap them: `<bdi>GENEFIRE</bdi>`,
`<span dir="ltr">SX 300</span>`.

> **The Arabic below is a working draft.** It follows the client's own brochure wording
> wherever the brochure has it, and extends it where the site needs copy the brochure does not
> contain. Fire-safety terminology sold into a civil-defence-adjacent market must be reviewed
> by a native Saudi technical writer before launch. Do not ship machine-checked Arabic.

---

## Global

| key | العربية | English |
|---|---|---|
| `brand.company` | المغربي للخدمات التجارية | ALMAGHRABI for Trading Services |
| `brand.role` | الوكيل المعتمد في المملكة العربية السعودية | Authorized Agent in Saudi Arabia |
| `brand.tagline` | حيث يلتقي الابتكار بالسلامة من الحرائق | Where Innovation Meets Fire Safety |
| `nav.products` | المنتجات | Products |
| `nav.applications` | مجالات الاستخدام | Applications |
| `nav.coverage` | حاسبة التغطية | Coverage calculator |
| `nav.about` | من نحن | About |
| `nav.contact` | تواصل معنا | Contact |
| `cta.primary` | احسب احتياجك | Size your enclosure |
| `cta.secondary` | تحدث إلى مختص | Talk to a specialist |
| `a11y.skip` | تخطَّ إلى المحتوى | Skip to content |

---

## §01 Hero

| key | العربية | English |
|---|---|---|
| `hero.eyebrow` | الوكيل المعتمد في المملكة العربية السعودية | Authorized agent in Saudi Arabia |
| `hero.h1` | حيث يلتقي الابتكار بالسلامة من الحرائق | Where innovation meets fire safety |
| `hero.sub` | أنظمة إطفاء بالهباء الجوي المكثّف: تُثبَّت داخل الحيّز الذي تحميه، دون أنابيب أو فوهات أو أسطوانات مضغوطة. | Condensed aerosol suppression that mounts inside the space it protects — no piping, no nozzles, no pressurised cylinders. |
| `hero.scroll` | مرّر للأسفل | Scroll |

---

## §02 The problem

| key | العربية | English |
|---|---|---|
| `problem.1` | الحريق يبدأ داخل الخزانة، لا خارجها. | Fire starts inside the cabinet, not outside it. |
| `problem.2` | المرشّات تصل بعد فوات الأوان — وتُتلف ما تبقّى. | Sprinklers arrive too late, and ruin what is left. |
| `problem.3` | أنظمة الغاز تحتاج غرفة معدات وشبكة أنابيب لا وجود لها هنا. | Gas systems need a plant room and a pipe network that was never built here. |

---

## §03 Activation

| key | العربية | English |
|---|---|---|
| `activation.line` | لا يزيح الأكسجين. لا يترك بقايا. لا يحتاج إلى أنابيب. | Displaces no oxygen. Leaves no residue. Needs no piping. |
| `activation.caption` | يُطلق المولّد هباءً جافًا فائق النعومة يملأ الحيّز ويوقف التفاعل الكيميائي للاحتراق. | The generator releases an ultra-fine dry aerosol that floods the volume and interrupts the chemistry of combustion. |

---

## §04 Series

| key | العربية | English |
|---|---|---|
| `series.px.name` | سلسلة PX | PX Series |
| `series.px.sub` | تشغيل يدوي وحماية فورية | Manual activation, instant protection |
| `series.sx_small.name` | سلسلة الحماية للمساحات الصغيرة | Small-Scale Series |
| `series.sx_small.sub` | حماية مرنة وقابلة للتوسع للوحات والخزائن الكهربائية | Scalable protection for electrical cabinets & enclosures |
| `series.sx_industrial.name` | السلسلة الصناعية | Industrial Series |
| `series.sx_industrial.sub` | أنظمة إطفاء من الفولاذ المقاوم للصدأ للمساحات الكبيرة | Stainless-steel fire protection for large enclosures |

---

## §05 Product detail — spec labels

| key | العربية | English |
|---|---|---|
| `spec.agc` | كمية المادة الفعّالة | AGC |
| `spec.total` | الوزن الإجمالي | Total weight |
| `spec.volume` | حجم الحماية | Protected volume |
| `spec.time` | زمن التفريغ | Discharge time |
| `spec.size` | الأبعاد | Dimensions |
| `unit.g` | جم | g |
| `unit.m3` | م³ | m³ |
| `unit.s` | ثانية | s |
| `unit.mm` | مم | mm |
| `product.explode` | عرض مفصّل | Exploded view |
| `product.datasheet` | تحميل بطاقة المواصفات | Download datasheet |

Use Western Arabic numerals (0-9) for all figures, in both languages. Consistency across
the spec tables matters more than traditional numeral forms.

---

## §06 Coverage calculator

| key | العربية | English |
|---|---|---|
| `calc.title` | ما الحجم الذي تحتاج إلى حمايته؟ | What volume do you need to protect? |
| `calc.length` | الطول | Length |
| `calc.width` | العرض | Width |
| `calc.height` | الارتفاع | Height |
| `calc.volume` | الحجم | Volume |
| `calc.application` | مجال الاستخدام | Application |
| `calc.result` | الوحدة الموصى بها | Recommended unit |
| `calc.next` | الخيار الأكبر | Next size up |
| `calc.multiple` | يلزم {n} وحدات لتغطية هذا الحجم. | {n} units are required to cover this volume. |
| `calc.rule` | كل 100 جم من المادة الفعّالة تحمي 5 م³. | Every 100 g of agent protects 5 m³. |
| `calc.disclaimer` | نتيجة استرشادية فقط. التصميم النهائي يجب أن يراعي تسرّب الحيّز والعوائق الداخلية ومتطلبات الدفاع المدني المعتمدة. | Indicative sizing only. Final design must account for enclosure leakage, internal obstruction and the applicable civil defence requirements. |
| `calc.cta` | أرسل هذه المواصفات إلى فريقنا | Send these figures to our team |

---

## §07 Applications

| key | العربية | English |
|---|---|---|
| `app.military` | المعدات العسكرية | Military |
| `app.industry` | الصناعة | Industry |
| `app.power` | الطاقة | Power |
| `app.railway` | السكك الحديدية | Railway |
| `app.datacenter` | مراكز البيانات | Data centres |
| `app.laboratory` | المختبرات | Laboratory |

---

## §08 Why aerosol — comparison table

| key | العربية | English |
|---|---|---|
| `cmp.title` | لماذا الهباء الجوي المكثّف؟ | Why condensed aerosol? |
| `cmp.occupied` | آمن في الأماكن المأهولة | Safe in occupied spaces |
| `cmp.piping` | يحتاج أنابيب وفوهات | Requires piping and nozzles |
| `cmp.cost` | تكلفة التركيب | Installed cost |
| `cmp.residue` | البقايا بعد الإطفاء | Residue |
| `cmp.gwp` | تأثير الاحتباس الحراري | Global warming potential |
| `cmp.space` | المساحة المطلوبة | Space required |
| `cmp.retrofit` | قابل للتركيب في خزانة قائمة | Retrofits into an existing cabinet |

---

## Advantages, eco claims, features — brochure wording, verbatim

**المزايا / Advantages**

| العربية | English |
|---|---|
| اقتصادي وفعال من حيث التكلفة | Low cost |
| لا يسبب أضرارًا للمعدات | Non-damaging |
| سهل الاستخدام | Convenient |
| صديق للبيئة | Eco-friendly |
| هباء جوي منخفض الحرارة | Cooler aerosol |
| كفاءة عالية في الإطفاء | Efficient |
| متعدد الاستخدامات | Versatile |
| آمن للاستخدام | Safe |

**الهباء الجوي صديق للبيئة / Eco-friendly aerosol**

| العربية | English |
|---|---|
| لا يؤثر على طبقة الأوزون | Zero ozone depletion potential |
| لا يسهم في ظاهرة الاحتباس الحراري | Zero global warming potential |
| لا يترك أثرًا طويل الأمد في الغلاف الجوي | Zero atmospheric life |
| لا يتسبب في إزاحة الأكسجين | Does not displace oxygen |
| لا يطلق مواد سامة | Does not emit toxic substances |
| آمن للاستخدام في الأماكن المأهولة | Safe for humans |

**مزايا المنتج الرئيسية / Key product features**

| العربية | English |
|---|---|
| إخماد سريع للحرائق | Rapid fire suppression |
| آمن للأفراد والمعدات | Safe for people and equipment |
| صديق للبيئة | Environmentally friendly |
| سهل التركيب والصيانة | Easy to install & maintain |
| صغير الحجم وخفيف الوزن | Compact & lightweight |
| حل اقتصادي وفعال | Cost-effective solution |

**فئات الحرائق / Fire classes**

| فئة | العربية | English |
|---|---|---|
| A | مواد صلبة عادية | Ordinary combustibles |
| B | سوائل قابلة للاشتعال | Flammable liquids |
| C | غازات قابلة للاشتعال | Flammable gases |
| E | معدات كهربائية | Electrical equipment |

The footer strip of the brochure also shows class **F** (cooking oils and fats). Confirm with
the client whether the range is rated for it before adding it to the site.

---

## §10 Contact

| key | العربية | English |
|---|---|---|
| `contact.title` | تحدث إلى فريق المغربي | Talk to the Almaghrabi team |
| `contact.name` | الاسم | Name |
| `contact.company` | الجهة | Company |
| `contact.phone` | رقم الجوال | Phone |
| `contact.message` | تفاصيل الطلب | Details |
| `contact.submit` | إرسال | Send |
| `contact.address` | الرياض — طريق عثمان بن عفان — حي النزهة | Riyadh — Othman Bin Affan Road — Al Nuzha District |

---

## Tone

**Arabic:** فصحى معاصرة — formal Modern Standard, not colloquial, not archaic. Short
sentences. Technical vocabulary used precisely: الهباء الجوي المكثّف (condensed aerosol),
مولّد الهباء (aerosol generator), الحيّز (enclosure/volume), الدفاع المدني (civil defence).
Avoid marketing intensifiers — this audience distrusts them.

**English:** plain, declarative, engineering-adjacent. No exclamation marks, no "revolutionary",
no "game-changing". State a number and stop. The brochure's own English says *"revolutionary"* —
that is the principal's language; Almaghrabi's site does not need to inherit it.

**Both:** never claim more than the client's approved material claims. Never state a
certification the client has not supplied a certificate for.
