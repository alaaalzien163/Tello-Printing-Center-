import type { Category } from "@/domain/category";

/**
 * Phase 1 demonstration data only.
 * Names, descriptions and images are illustrative and are not production records.
 */
export const seedCategories: Category[] = [
  {
    id: "cat-3d-printers",
    slug: "3d-printers",
    name: {
      en: "3D Printers",
      ar: "طابعات ثلاثية الأبعاد",
    },
    description: {
      en: "Professional FDM and resin 3D printers for workshops, studios and production teams.",
      ar: "طابعات FDM وراتنج احترافية للورش والاستوديوهات وفرق الإنتاج.",
    },
    image: {
      url: "/images/product-printer.svg",
      alt: {
        en: "Professional enclosed 3D printer",
        ar: "طابعة ثلاثية الأبعاد احترافية مغلقة",
      },
    },
    active: true,
    createdAt: "2026-08-12T09:00:00.000Z",
    updatedAt: "2026-11-10T07:45:00.000Z",
  },
  {
    id: "cat-materials",
    slug: "3d-printing-filaments-materials",
    name: {
      en: "3D Printing Filaments and Materials",
      ar: "خيوط ومواد الطباعة ثلاثية الأبعاد",
    },
    description: {
      en: "Engineering filaments, specialty resins and materials for professional 3D printing.",
      ar: "خيوط هندسية وراتنجات ومواد متخصصة للطباعة ثلاثية الأبعاد الاحترافية.",
    },
    image: {
      url: "/images/product-filament.svg",
      alt: {
        en: "3D printer filament spools and resin materials",
        ar: "بكرات خيوط ومواد راتنج للطباعة ثلاثية الأبعاد",
      },
    },
    active: true,
    createdAt: "2026-08-12T09:20:00.000Z",
    updatedAt: "2026-11-10T08:15:00.000Z",
  },
  {
    id: "cat-dtf-printers",
    slug: "dtf-printers-equipment",
    name: {
      en: "DTF Printers and Equipment",
      ar: "طابعات ومعدات DTF",
    },
    description: {
      en: "DTF printers and supporting equipment for textile and transfer printing.",
      ar: "طابعات DTF والمعدات المساندة لطباعة المنسوجات ونقل الصور.",
    },
    image: {
      url: "/images/product-industrial.svg",
      alt: {
        en: "DTF printing equipment",
        ar: "معدات طباعة DTF",
      },
    },
    active: true,
    createdAt: "2026-08-12T09:25:00.000Z",
    updatedAt: "2026-10-29T09:10:00.000Z",
  },
  {
    id: "cat-uv-printers",
    slug: "uv-printers-equipment",
    name: {
      en: "UV Printers and Equipment",
      ar: "طابعات ومعدات UV",
    },
    description: {
      en: "UV flatbed printers and related UV equipment for rigid-substrate printing.",
      ar: "طابعات UV مسطحة والمعدات المرتبطة بها لطباعة الركائز الصلبة.",
    },
    image: {
      url: "/images/product-industrial.svg",
      alt: {
        en: "UV flatbed printing machine",
        ar: "آلة طباعة UV مسطحة",
      },
    },
    active: true,
    createdAt: "2026-08-12T09:35:00.000Z",
    updatedAt: "2026-11-08T16:10:00.000Z",
  },
  {
    id: "cat-industrial-printers",
    slug: "industrial-commercial-printing-machines",
    name: {
      en: "Industrial and Commercial Printing Machines",
      ar: "آلات الطباعة الصناعية والتجارية",
    },
    description: {
      en: "Industrial and commercial printing machines for professional print operations.",
      ar: "آلات طباعة صناعية وتجارية لعمليات الطباعة الاحترافية.",
    },
    image: {
      url: "/images/product-industrial.svg",
      alt: {
        en: "Industrial and commercial printing machine",
        ar: "آلة طباعة صناعية وتجارية",
      },
    },
    active: true,
    createdAt: "2026-08-12T09:45:00.000Z",
    updatedAt: "2026-10-31T12:05:00.000Z",
  },
  {
    id: "cat-inks-consumables",
    slug: "printing-inks-consumables",
    name: {
      en: "Printing Inks and Consumables",
      ar: "أحبار ومستلزمات الطباعة",
    },
    description: {
      en: "Printing inks, resins and everyday consumables for professional printing equipment.",
      ar: "أحبار طباعة وراتنجات ومستلزمات يومية لمعدات الطباعة الاحترافية.",
    },
    image: {
      url: "/images/product-resin.svg",
      alt: {
        en: "Printing inks and consumables",
        ar: "أحبار ومستلزمات طباعة",
      },
    },
    active: true,
    createdAt: "2026-08-12T09:50:00.000Z",
    updatedAt: "2026-11-04T10:40:00.000Z",
  },
  {
    id: "cat-accessories",
    slug: "printer-parts-accessories",
    name: {
      en: "Printer Parts and Accessories",
      ar: "قطع غيار وملحقات الطابعات",
    },
    description: {
      en: "Nozzles, maintenance kits, print surfaces and accessories that keep equipment running.",
      ar: "فوهات وأطقم صيانة وأسطح طباعة وملحقات تحافظ على تشغيل المعدات.",
    },
    image: {
      url: "/images/product-accessories.svg",
      alt: {
        en: "Printer parts and accessories",
        ar: "قطع غيار وملحقات طابعات",
      },
    },
    active: true,
    createdAt: "2026-08-12T09:55:00.000Z",
    updatedAt: "2026-11-06T09:25:00.000Z",
  },
];
