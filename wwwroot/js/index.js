window.addEventListener('load', () => {
    controlBurgerShowing();
    if (navigator.userAgent.toLowerCase().includes("yabrowser")) {
        alert("Please turn off yandex translation for this site!");
    }

});

window.addEventListener('resize', () => {
    controlBurgerShowing();
});
// Кастомные переводы
const translations = {
    "ru": {
        "sign-up-in-hat": "Регистрация",
        "sign-up-in-burger": "Регистрация",
    },
    "default": {
        "sign-up-in-hat": "Sign Up",
        "sign-up-in-burger": "Sign Up",
    }
};

// Следим за изменением языка
function applyCustomTranslations() {
    const lang = document.documentElement.lang; // Узнаем текущий язык
    if (lang == "ru") {
        for (const [id, translation] of Object.entries(translations["ru"] || {})) {
            document.getElementById(id).innerText = translation;
        }
    }
    else {
        for (const [id, translation] of Object.entries(translations["default"] || {})) {
            document.getElementById(id).innerText = translation;
        }
    }
}
const observer = new MutationObserver(() => {
    applyCustomTranslations();
    controlBurgerShowing();
});

observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

document.getElementById('side-menu-bg').addEventListener('click', function (e) {
    if (e.target.id === 'side-menu-bg') {
        document.getElementById('side-menu').setAttribute('hidden', '');
        document.body.style.overflow = '';
    }
});

document.getElementById('burger-icon').addEventListener('click', function (e) {
    document.getElementById('side-menu').removeAttribute('hidden', '');
    document.body.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
});

function controlBurgerShowing() {
    const screenWidth = Number(getComputedStyle(document.querySelector('html')).width.replace('px', ''));
    if (screenWidth > 1200) {
        document.getElementById('burger-icon').setAttribute('hidden', '');
        if (!document.getElementById('side-menu').hasAttribute('hidden'))
            document.getElementById('side-menu').setAttribute('hidden', '');
    }
    else {
        document.getElementById('burger-icon').removeAttribute('hidden', '');
    }
}
