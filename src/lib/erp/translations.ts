// FMCore ERP — Translation Engine
// Simple client-side translations for common UI strings.
// Supports: English (en), Arabic (ar), French (fr), Spanish (es), Hindi (hi), Urdu (ur)

export type Language = 'en' | 'ar' | 'fr' | 'es' | 'hi' | 'ur';

export const LANGUAGES: { code: Language; label: string; flag: string; rtl: boolean }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧', rtl: false },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'fr', label: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'es', label: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'ur', label: 'اردو', flag: '🇵🇰', rtl: true },
];

const translations: Record<Language, Record<string, string>> = {
  en: {
    'dashboard': 'Dashboard', 'settings': 'Settings', 'reports': 'Reports', 'audit': 'Audit Logs',
    'add_record': 'Add Record', 'edit': 'Edit', 'delete': 'Delete', 'view': 'View',
    'search': 'Search...', 'save': 'Save', 'cancel': 'Cancel', 'close': 'Close',
    'export': 'Export', 'import': 'Import', 'print': 'Print', 'filter': 'Filter',
    'loading': 'Loading...', 'no_data': 'No data found', 'total': 'Total',
    'actions': 'Actions', 'status': 'Status', 'priority': 'Priority', 'date': 'Date',
    'open_work_orders': 'Open Work Orders', 'critical_priority': 'Critical Priority',
    'pm_due': 'PM Due / Overdue', 'low_stock': 'Low Stock Items', 'active_assets': 'Active Assets',
  },
  ar: {
    'dashboard': 'لوحة التحكم', 'settings': 'الإعدادات', 'reports': 'التقارير', 'audit': 'سجل التدقيق',
    'add_record': 'إضافة سجل', 'edit': 'تحرير', 'delete': 'حذف', 'view': 'عرض',
    'search': 'بحث...', 'save': 'حفظ', 'cancel': 'إلغاء', 'close': 'إغلاق',
    'export': 'تصدير', 'import': 'استيراد', 'print': 'طباعة', 'filter': 'تصفية',
    'loading': 'جاري التحميل...', 'no_data': 'لا توجد بيانات', 'total': 'المجموع',
    'actions': 'إجراءات', 'status': 'الحالة', 'priority': 'الأولوية', 'date': 'التاريخ',
    'open_work_orders': 'أوامر العمل المفتوحة', 'critical_priority': 'أولوية حرجة',
    'pm_due': 'الصيانة الوقائية مستحقة', 'low_stock': 'عناصر منخفضة المخزون', 'active_assets': 'الأصول النشطة',
  },
  fr: {
    'dashboard': 'Tableau de bord', 'settings': 'Paramètres', 'reports': 'Rapports', 'audit': 'Journaux d\'audit',
    'add_record': 'Ajouter un enregistrement', 'edit': 'Modifier', 'delete': 'Supprimer', 'view': 'Voir',
    'search': 'Rechercher...', 'save': 'Enregistrer', 'cancel': 'Annuler', 'close': 'Fermer',
    'export': 'Exporter', 'import': 'Importer', 'print': 'Imprimer', 'filter': 'Filtrer',
    'loading': 'Chargement...', 'no_data': 'Aucune donnée trouvée', 'total': 'Total',
    'actions': 'Actions', 'status': 'Statut', 'priority': 'Priorité', 'date': 'Date',
    'open_work_orders': 'Ordres de travail ouverts', 'critical_priority': 'Priorité critique',
    'pm_due': 'PM dus / en retard', 'low_stock': 'Articles en stock faible', 'active_assets': 'Actifs actifs',
  },
  es: {
    'dashboard': 'Panel de control', 'settings': 'Configuración', 'reports': 'Informes', 'audit': 'Registros de auditoría',
    'add_record': 'Añadir registro', 'edit': 'Editar', 'delete': 'Eliminar', 'view': 'Ver',
    'search': 'Buscar...', 'save': 'Guardar', 'cancel': 'Cancelar', 'close': 'Cerrar',
    'export': 'Exportar', 'import': 'Importar', 'print': 'Imprimir', 'filter': 'Filtrar',
    'loading': 'Cargando...', 'no_data': 'No se encontraron datos', 'total': 'Total',
    'actions': 'Acciones', 'status': 'Estado', 'priority': 'Prioridad', 'date': 'Fecha',
    'open_work_orders': 'Órdenes de trabajo abiertas', 'critical_priority': 'Prioridad crítica',
    'pm_due': 'PM vencidos', 'low_stock': 'Artículos con existencias bajas', 'active_assets': 'Activos activos',
  },
  hi: {
    'dashboard': 'डैशबोर्ड', 'settings': 'सेटिंग्स', 'reports': 'रिपोर्ट', 'audit': 'ऑडिट लॉग',
    'add_record': 'रिकॉर्ड जोड़ें', 'edit': 'संपादित करें', 'delete': 'हटाएं', 'view': 'देखें',
    'search': 'खोजें...', 'save': 'सहेजें', 'cancel': 'रद्द करें', 'close': 'बंद करें',
    'export': 'निर्यात', 'import': 'आयात', 'print': 'प्रिंट', 'filter': 'फ़िल्टर',
    'loading': 'लोड हो रहा है...', 'no_data': 'कोई डेटा नहीं', 'total': 'कुल',
    'actions': 'क्रियाएं', 'status': 'स्थिति', 'priority': 'प्राथमिकता', 'date': 'तारीख',
    'open_work_orders': 'खुले कार्य आदेश', 'critical_priority': 'गंभीर प्राथमिकता',
    'pm_due': 'PM देय', 'low_stock': 'कम स्टॉक वाली वस्तुएं', 'active_assets': 'सक्रिय संपत्ति',
  },
  ur: {
    'dashboard': 'ڈیش بورڈ', 'settings': 'ترتیبات', 'reports': 'رپورٹس', 'audit': 'آڈٹ لاگز',
    'add_record': 'ریکارڈ شامل کریں', 'edit': 'ترمیم', 'delete': 'حذف کریں', 'view': 'دیکھیں',
    'search': 'تلاش کریں...', 'save': 'محفوظ کریں', 'cancel': 'منسوخ', 'close': 'بند کریں',
    'export': 'برآمد', 'import': 'درآمد', 'print': 'پرنٹ', 'filter': 'فلٹر',
    'loading': 'لوڈ ہو رہا ہے...', 'no_data': 'کوئی ڈیٹا نہیں', 'total': 'کل',
    'actions': 'اقدامات', 'status': 'حالت', 'priority': 'ترجیح', 'date': 'تاریخ',
    'open_work_orders': 'کھلے ورک آرڈرز', 'critical_priority': 'تنقیدی ترجیح',
    'pm_due': 'PM واجب الادا', 'low_stock': 'کم اسٹاک آئٹمز', 'active_assets': 'فعال اثاثے',
  },
};

export function t(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}

export function isRTL(lang: Language): boolean {
  return lang === 'ar' || lang === 'ur';
}
