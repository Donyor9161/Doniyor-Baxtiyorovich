// --- TUN / KUN REJIMI (DARK / LIGHT MODE) ---
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const htmlEl = document.documentElement;

// Saqlangan rejimni tekshirish
const savedTheme = localStorage.getItem('donylogic_theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlEl.setAttribute('data-theme', newTheme);
        localStorage.setItem('donylogic_theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    if (!themeIcon) return;
    if (theme === 'light') {
        themeIcon.className = 'ri-sun-line';
    } else {
        themeIcon.className = 'ri-moon-line';
    }
}


// --- KO'P TILLI QILISH (I18N: UZ / EN) ---
const translations = {
    uz: {
        page_title: "DONYLOGIC — Kod orqali fikrlash",
        nav_about: "Biz haqimizda",
        nav_something: "Bir narsalar",
        nav_dev: "Dasturchi",
        hero_eyebrow: "Yakka dasturchi",
        hero_title: "Bu yerda <em>Donylogic</em><br>mavjud.",
        hero_lead: "Men — yolg'iz o'zim ishlaydigan dasturchiman. Bu sahifa shunchaki Donylogic borligini va nima bilan shug'ullanishimni bildirish uchun — ortiqcha va'dalarsiz, faqat kod va aniq izlar.",
        hero_btn: "Ishlarimni ko'rish",
        socials_eyebrow: "Biz bilan bog'laning",
        socials_title: "Studiya ijtimoiy tarmoqlari",
        badge_eyebrow: "Rasmiy nomi",
        badge_caption: "yoshi",
        time_days: "kun",
        time_hours: "soat",
        time_minutes: "daqiqa",
        time_seconds: "soniya",
        comments_eyebrow: "Fikr-mulohaza",
        comments_title: "Fikringizni qoldiring",
        auth_google: "Google bilan kirish",
        auth_github: "GitHub bilan kirish",
        comment_placeholder: "Fikringizni shu yerga yozing...",
        comment_send: "Yuborish",
        comments_hint: "Fikr qoldirish uchun avval Google bilan kiring.",
        comments_loading: "Fikrlar yuklanmoqda...",
        stat_eyebrow: "Jonli statistika",
        stat_registered: "kishi Google orqali ro'yxatdan o'tdi",
        stat_visits: "marta saytga tashrif buyurildi",
        donate_eyebrow: "Qo'llab-quvvatlash",
        donate_title: "Loyihani qo'llab-quvvatlang",
        donate_lead: "Agar loyiha yoqqan bo'lsa, ixtiyoriy ravishda quyidagi kartalardan biriga donat qilishingiz mumkin. Har bir yordam uchun rahmat!",
        donate_copy: "Nusxalash",
        donate_total_text: "Jami donat qilingan:",
        footer_rights: "© 2025-26 Donylogic. Barcha huquqlar himoyalangan.",
        footer_disclaimer: "Tashqi saytlar mazmuni va huquqlariga Donylogic javobgar emas. Havolalar tegishli egalarining ruxsati bilan joylashtirilgan."
    },
    en: {
        page_title: "DONYLOGIC — Thinking through Code",
        nav_about: "About us",
        nav_something: "Something",
        nav_dev: "Developer",
        hero_eyebrow: "Solo Developer",
        hero_title: "This is where <em>Donylogic</em><br>exists.",
        hero_lead: "I am a solo developer. This page simply exists to show that Donylogic is here and what I work on — no extra promises, just code and clear tracks.",
        hero_btn: "View my works",
        socials_eyebrow: "Get in touch",
        socials_title: "Studio Social Networks",
        badge_eyebrow: "Official Name",
        badge_caption: "age",
        time_days: "days",
        time_hours: "hours",
        time_minutes: "minutes",
        time_seconds: "seconds",
        comments_eyebrow: "Feedback",
        comments_title: "Leave a comment",
        auth_google: "Sign in with Google",
        auth_github: "Sign in with GitHub",
        comment_placeholder: "Write your comment here...",
        comment_send: "Send",
        comments_hint: "Please sign in with Google to leave a comment.",
        comments_loading: "Loading comments...",
        stat_eyebrow: "Live Statistics",
        stat_registered: "people registered via Google",
        stat_visits: "visits to the site",
        donate_eyebrow: "Support",
        donate_title: "Support the Project",
        donate_lead: "If you like the project, you can optionally donate to one of the cards below. Thanks for every bit of help!",
        donate_copy: "Copy",
        donate_total_text: "Total donated:",
        footer_rights: "© 2025-26 Donylogic. All rights reserved.",
        footer_disclaimer: "Donylogic is not responsible for the content of external sites. Links are posted with the permission of their respective owners."
    }
};

const langToggleBtn = document.getElementById('langToggleBtn');
const currentLangText = document.getElementById('currentLangText');
let currentLang = localStorage.getItem('donylogic_lang') || 'uz';

setLanguage(currentLang);

if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'uz' ? 'en' : 'uz';
        localStorage.setItem('donylogic_lang', currentLang);
        setLanguage(currentLang);
    });
}

function setLanguage(lang) {
    if (currentLangText) currentLangText.textContent = lang.toUpperCase();
    document.documentElement.setAttribute('lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });
}
