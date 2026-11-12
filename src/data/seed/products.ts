import type { Product } from "@/domain/product";

/**
 * Phase 1 demonstration data only.
 * Products, SKUs and prices are illustrative sample records.
 */
export const seedProducts: Product[] = [
  {
    id: "prd-forge-x1",
    sku: "TEL-FDM-001",
    slug: "forge-x1",
    name: {
      en: "Tello Forge X1",
      ar: "تيلو فورج X1",
    },
    description: {
      en: "An enclosed, production-ready FDM printer with a heated chamber, automatic bed leveling and a 320 × 320 × 350 mm build volume. Built for repeatable engineering parts.",
      ar: "طابعة FDM مغلقة جاهزة للإنتاج بغرفة تسخين ومعايرة تلقائية لسرير الطباعة وحجم بناء 320 × 320 × 350 مم. مصممة لقطع هندسية قابلة للتكرار.",
    },
    categoryId: "cat-3d-printers",
    price: 14500,
    currency: "USD",
    image: {
      url: "/images/product-printer.svg",
      alt: {
        en: "Tello Forge X1 enclosed FDM 3D printer",
        ar: "طابعة تيلو فورج X1 المغلقة بتقنية FDM",
      },
    },
    active: true,
    featured: true,
    createdAt: "2026-08-18T08:30:00.000Z",
    updatedAt: "2026-11-10T07:45:00.000Z",
  },
  {
    id: "prd-forge-pro-600",
    sku: "TEL-FDM-600",
    slug: "forge-pro-600",
    name: {
      en: "Tello Forge Pro 600",
      ar: "تيلو فورج برو 600",
    },
    description: {
      en: "A high-throughput industrial FDM system with a 600 mm build platform, dual extrusion and remote monitoring for continuous production.",
      ar: "نظام FDM صناعي عالي الإنتاجية بمنصة بناء 600 مم وبثق مزدوج ومراقبة عن بُعد للإنتاج المستمر.",
    },
    categoryId: "cat-3d-printers",
    price: 38900,
    currency: "USD",
    image: {
      url: "/images/product-industrial.svg",
      alt: {
        en: "Tello Forge Pro 600 industrial FDM printer",
        ar: "طابعة تيلو فورج برو 600 الصناعية بتقنية FDM",
      },
    },
    active: true,
    featured: true,
    createdAt: "2026-08-22T10:15:00.000Z",
    updatedAt: "2026-11-09T14:20:00.000Z",
  },
  {
    id: "prd-resinlab-s4",
    sku: "TEL-RSN-004",
    slug: "resinlab-s4",
    name: {
      en: "Tello ResinLab S4",
      ar: "تيلو ريزن لاب S4",
    },
    description: {
      en: "A precision resin printer with a 10-inch mono LCD, high-resolution optics and a compact footprint for detailed prototypes and end-use components.",
      ar: "طابعة راتنج دقيقة بشاشة أحادية LCD مقاس 10 بوصات وبصريات عالية الدقة وحجم مدمج للنماذج الأولية المفصلة والمكونات النهائية.",
    },
    categoryId: "cat-3d-printers",
    price: 11750,
    currency: "USD",
    image: {
      url: "/images/product-resin.svg",
      alt: {
        en: "Tello ResinLab S4 resin 3D printer and amber resin",
        ar: "طابعة تيلو ريزن لاب S4 للراتنج وراتنج كهرماني",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-09-02T11:00:00.000Z",
    updatedAt: "2026-11-07T09:30:00.000Z",
  },
  {
    id: "prd-uv-flatbed-2500",
    sku: "TEL-UV-2500",
    slug: "uv-flatbed-2500",
    name: {
      en: "Tello UV Flatbed 2500",
      ar: "تيلو للطباعة المسطحة UV 2500",
    },
    description: {
      en: "A wide-format UV flatbed printer for rigid substrates and specialty production. Includes precision registration, vacuum hold-down and low-mist ink handling.",
      ar: "طابعة مسطحة UV واسعة التنسيق للركائز الصلبة والإنتاج المتخصص. تتضمن محاذاة دقيقة وتثبيتًا بالتفريغ ومعالجة حبر منخفض الرذاذ.",
    },
    categoryId: "cat-uv-printers",
    price: 86000,
    currency: "USD",
    image: {
      url: "/images/product-industrial.svg",
      alt: {
        en: "Tello UV Flatbed 2500 industrial printer",
        ar: "طابعة تيلو المسطحة UV 2500 الصناعية",
      },
    },
    active: true,
    featured: true,
    createdAt: "2026-08-28T13:40:00.000Z",
    updatedAt: "2026-11-08T16:10:00.000Z",
  },
  {
    id: "prd-colorjet-3200",
    sku: "TEL-INK-3200",
    slug: "colorjet-3200",
    name: {
      en: "Tello ColorJet 3200",
      ar: "تيلو كولور جيت 3200",
    },
    description: {
      en: "A compact industrial colour printer for short-run signage and packaging samples, with quick-change ink sets and a robust media feed.",
      ar: "طابعة ألوان صناعية مدمجة للافتات قصيرة الإنتاج وعينات التغليف، مع أطقم حبر سريعة التبديل وتغذية وسائط قوية.",
    },
    categoryId: "cat-industrial-printers",
    price: 54500,
    currency: "USD",
    image: {
      url: "/images/product-industrial.svg",
      alt: {
        en: "Tello ColorJet 3200 industrial colour printer",
        ar: "طابعة تيلو كولور جيت 3200 الصناعية الملونة",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-09-05T09:50:00.000Z",
    updatedAt: "2026-10-31T12:05:00.000Z",
  },
  {
    id: "prd-pla-plus",
    sku: "TEL-MAT-PLA1",
    slug: "pla-plus-filament",
    name: {
      en: "Premium PLA+ Filament 1.75 mm — 1 kg",
      ar: "خيط طباعة PLA+ بريميوم 1.75 مم — 1 كجم",
    },
    description: {
      en: "Dimensional stability, clean layer adhesion and a matte finish for prototypes, fixtures and visual models. Supplied on a recyclable spool.",
      ar: "استقرار أبعادي والتصاق نظيف بين الطبقات وتشطيب مطفي للنماذج والتجهيزات والمجسمات. يُورَّد على بكرة قابلة لإعادة التدوير.",
    },
    categoryId: "cat-materials",
    price: 115,
    currency: "USD",
    image: {
      url: "/images/product-filament.svg",
      alt: {
        en: "Premium PLA+ 3D printer filament spools",
        ar: "بكرات خيط طباعة PLA+ بريميوم",
      },
    },
    active: true,
    featured: true,
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-11-06T08:15:00.000Z",
  },
  {
    id: "prd-petg-engineering",
    sku: "TEL-MAT-PETG",
    slug: "engineering-petg-filament",
    name: {
      en: "Engineering PETG Filament 2.85 mm — 1 kg",
      ar: "خيط هندسي PETG ‏2.85 مم — 1 كجم",
    },
    description: {
      en: "A tough, low-warp engineering filament with good chemical resistance for functional parts, jigs and production fixtures.",
      ar: "خيط هندسي متين منخفض الالتواء بمقاومة كيميائية جيدة للقطع الوظيفية والتجهيزات وقوالب الإنتاج.",
    },
    categoryId: "cat-materials",
    price: 145,
    currency: "USD",
    image: {
      url: "/images/product-filament.svg",
      alt: {
        en: "Engineering PETG filament spool",
        ar: "بكرة خيط PETG الهندسي",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-09-10T08:10:00.000Z",
    updatedAt: "2026-10-29T15:25:00.000Z",
  },
  {
    id: "prd-tough-resin",
    sku: "TEL-MAT-RES1",
    slug: "tough-resin-1l",
    name: {
      en: "Tello Tough Resin — 1 L",
      ar: "راتنج تيلو تاف — 1 لتر",
    },
    description: {
      en: "A durable engineering resin with high impact resistance and fine detail reproduction, suited to functional prototypes and small end-use parts.",
      ar: "راتنج هندسي متين بمقاومة عالية للصدمات وإعادة إنتاج تفاصيل دقيقة، مناسب للنماذج الوظيفية والقطع النهائية الصغيرة.",
    },
    categoryId: "cat-materials",
    price: 210,
    currency: "USD",
    image: {
      url: "/images/product-resin.svg",
      alt: {
        en: "Tello Tough Resin bottle and resin sample",
        ar: "زجاجة راتنج تيلو تاف وعينة راتنج",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-09-12T12:30:00.000Z",
    updatedAt: "2026-11-04T10:40:00.000Z",
  },
  {
    id: "prd-abs-industrial",
    sku: "TEL-MAT-ABS1",
    slug: "industrial-abs-filament",
    name: {
      en: "Industrial ABS Filament — 1 kg",
      ar: "خيط ABS صناعي — 1 كجم",
    },
    description: {
      en: "Heat-resistant ABS for demanding workshop environments, enclosure components and parts that require post-processing.",
      ar: "خيط ABS مقاوم للحرارة لبيئات الورش الصعبة ومكونات الحاويات والقطع التي تتطلب معالجة لاحقة.",
    },
    categoryId: "cat-materials",
    price: 135,
    currency: "USD",
    image: {
      url: "/images/product-filament.svg",
      alt: {
        en: "Industrial ABS filament spool",
        ar: "بكرة خيط ABS صناعي",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-09-14T07:55:00.000Z",
    updatedAt: "2026-10-27T11:35:00.000Z",
  },
  {
    id: "prd-nozzle-kit",
    sku: "TEL-ACC-NOZ4",
    slug: "hardened-nozzle-kit",
    name: {
      en: "Hardened Steel Nozzle Kit",
      ar: "طقم فوهات فولاذية مقسّاة",
    },
    description: {
      en: "A four-piece hardened steel nozzle set in common diameters, designed for abrasive engineering filaments and long production runs.",
      ar: "طقم من أربع فوهات فولاذية مقسّاة بأقطار شائعة، مصمم للخيوط الهندسية الكاشطة ودورات الإنتاج الطويلة.",
    },
    categoryId: "cat-accessories",
    price: 320,
    currency: "USD",
    image: {
      url: "/images/product-accessories.svg",
      alt: {
        en: "Hardened steel 3D printer nozzle kit",
        ar: "طقم فوهات فولاذية مقسّاة لطابعة ثلاثية الأبعاد",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-09-28T08:20:00.000Z",
    updatedAt: "2026-11-06T09:25:00.000Z",
  },
  {
    id: "prd-extruder-maintenance-kit",
    sku: "TEL-ACC-EXT1",
    slug: "extruder-maintenance-kit",
    name: {
      en: "Extruder Maintenance Kit",
      ar: "طقم صيانة البثق",
    },
    description: {
      en: "Replacement gears, tension springs and wear parts for scheduled extruder maintenance. Compatible with the Forge X1 and Forge Pro series.",
      ar: "تروس بديلة ونوابض شد وأجزاء تآكل لصيانة البثق المجدولة. متوافق مع سلسلتي فورج X1 وفورج برو.",
    },
    categoryId: "cat-accessories",
    price: 640,
    currency: "USD",
    image: {
      url: "/images/product-accessories.svg",
      alt: {
        en: "Extruder maintenance and replacement components",
        ar: "مكونات صيانة واستبدال نظام البثق",
      },
    },
    active: false,
    featured: false,
    createdAt: "2026-09-28T08:35:00.000Z",
    updatedAt: "2026-10-20T12:15:00.000Z",
  },
  {
    id: "prd-uv-curing-station",
    sku: "TEL-FIN-UV1",
    slug: "uv-curing-station",
    name: {
      en: "UV Curing Station",
      ar: "محطة معالجة بالأشعة فوق البنفسجية",
    },
    description: {
      en: "A controlled UV curing chamber with adjustable intensity and a rotating platform for consistent resin post-processing.",
      ar: "غرفة معالجة بالأشعة فوق البنفسجية بتحكم في الشدة ومنصة دوارة لمعالجة الراتنج بشكل متسق.",
    },
    categoryId: "cat-uv-printers",
    price: 2850,
    currency: "USD",
    image: {
      url: "/images/product-finishing.svg",
      alt: {
        en: "UV curing station for resin parts",
        ar: "محطة معالجة بالأشعة فوق البنفسجية لقطع الراتنج",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-10-01T11:30:00.000Z",
    updatedAt: "2026-11-02T09:10:00.000Z",
  },
  {
    id: "prd-print-bed-sheet",
    sku: "TEL-FIN-BED2",
    slug: "industrial-print-bed-sheet",
    name: {
      en: "Industrial Print Bed Sheet",
      ar: "ملاءة سرير الطباعة الصناعية",
    },
    description: {
      en: "A replaceable, high-adhesion print surface for large-format FDM platforms. Designed for quick swaps and consistent first-layer results.",
      ar: "سطح طباعة قابل للاستبدال عالي الالتصاق لمنصات FDM كبيرة الحجم. مصمم للتبديل السريع ونتائج متسقة للطبقة الأولى.",
    },
    categoryId: "cat-accessories",
    price: 190,
    currency: "USD",
    image: {
      url: "/images/product-accessories.svg",
      alt: {
        en: "Industrial print bed sheet",
        ar: "ملاءة سرير طباعة صناعية",
      },
    },
    active: true,
    featured: false,
    createdAt: "2026-10-02T13:00:00.000Z",
    updatedAt: "2026-10-25T10:30:00.000Z",
  },
];
