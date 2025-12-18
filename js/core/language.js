const LanguageManager = (function() {
    
    const dictionary = {
        en: {
            // AUTH & API
            "login_title": "IPTV Player",
            "login_desc": "Enter your username to load profile",
            "login_btn": "Login / Create",
            "api_title": "Connect API",
            "api_desc": "Enter Xtream Codes details for",
            "api_label_name": "Playlist Name (Optional)",
            "api_label_server": "Server URL (http://...:port)",
            "api_label_user": "API Username",
            "api_label_pass": "API Password",
            "api_btn_connect": "Connect / Save",

            // MAIN MENU
            "menu_live": "Live TV",
            "menu_movies": "Movies",
            "menu_series": "Series",
            "menu_speedtest": "Speed Test",
            "menu_language": "Language",
            "menu_settings": "Settings",
            "menu_about": "About",

            // LIVE TV
            "live_categories": "Categories",
            "live_select_category": "Select Category",
            "live_preview_hint": "Select a channel to preview",
            "live_hint_play": "Press OK to play.",
            "live_hint_fullscreen": "Press OK again for Fullscreen.",

            // VOD & SERIES
            "vod_categories": "Categories",
            "vod_select_hint": "Select a category to load content",
            "detail_director": "Director:",
            "detail_cast": "Cast:",
            
            // BUTTONS
            "btn_play": "Play",
            "btn_favorite": "Favorite",
            "btn_remove_fav": "Remove Favorite",
            "btn_add_fav": "Add Favorite",
            "btn_trailer": "Trailer",
            "btn_start": "Start",
            "btn_close": "Close",
            "btn_refresh": "Refresh",
            "btn_test_mode": "Test Mode",
            "btn_logout": "Logout",
            "btn_edit_playlist": "Edit Current Playlist",
            "btn_clear_favs": "Clear All Favorites",
            "btn_clear_history": "Clear Watching Progress",
            "btn_retry": "Retry",
            "btn_yes": "Yes",
            "btn_no": "No",

            // SETTINGS
            "settings_language": "Language",
            "settings_manage_cats": "Manage Categories",
            "btn_manage_live": "Manage Live TV",
            "btn_manage_movies": "Manage Movies",
            "btn_manage_series": "Manage Series",
            "settings_player_theme": "Player Theme",
            "settings_app_theme": "App Theme",
            "settings_account": "Account",
            "settings_api": "API Settings",
            "settings_cache": "General Actions",
            "manager_hint": "Toggle Hide / Pin",
            "sub_settings_title": "Subtitle Appearance",
            "sub_label_size": "Size",
            "sub_label_color": "Color",
            "sub_label_bg": "Background",
            "sub_label_font": "Font",
            
            // NEW PRIVACY KEYS
            "settings_privacy": "Privacy Policy",
            "settings_privacy_policy": "Privacy Policy",
            "privacy_terms_title": "Terms of Service & Privacy Policy",
            "btn_agree": "AGREE",
            "btn_exit": "EXIT",

            // SPEED TEST
            "speedtest_title": "Network Speed Test",

            // CACHE / PERFORMANCE
            "settings_cache_all_categories": "Cache All Categories",

            // PLAYLISTS
            "playlists_title": "My Playlists",
            "playlist_add_new": "Add New Playlist",
            "playlist_setup_title": "Setup Playlist",
            "visit_url": "Visit:",
            "waiting_playlist": "Waiting for playlist...",
            "scan_hint": "Scan to add your playlist",

            // PLAYLIST USER INFO
            "user_info_title": "Playlist Info",
            "user_trial_tag": "Trial Account",
            "user_status": "Status",
            "user_expires": "Expires",
            "user_formats": "Formats",
            "user_server": "Server",
            "user_active": "Active",
            "user_expired": "Expired",
            "user_unlimited": "Unlimited",
            "user_days_left": "days left",

            // DEVICE / SUBSCRIPTION INFO (NEW)
            "sub_device_info": "Device Info",
            "sub_status": "Status",
            "sub_mac": "MAC Address",
            "sub_created": "Created",
            "sub_playlists_count": "Playlists",
            "sub_active": "Active",
            "sub_trial": "Trial",

            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_dev": "Developer:",
            "about_contact": "Contact:",
            "about_desc": "Description:",
            "loading": "Loading...",
            "search_placeholder": "Search current list...",
            "title_searching": "Search Results",
            
            // MESSAGES
            "msg_fav_added": "Added to Favorites",
            "msg_fav_removed": "Removed from Favorites",
            "msg_fav_cleared": "Favorites cleared.",
            "msg_watch_cleared": "Watching progress cleared.",
            "msg_skin_updated": "Player Skin Updated",
            "msg_theme_updated": "App Theme Updated",
            "msg_lang_updated": "Language Updated",

            "exit_title": "Exit App",
            "exit_msg": "Do you want to exit the application?"
        },
        fr: {
            // AUTH & API
            "login_title": "Lecteur IPTV",
            "login_desc": "Entrez votre nom d'utilisateur",
            "login_btn": "Connexion / Créer",
            "api_title": "Connexion API",
            "api_desc": "Entrez les détails Xtream Codes pour",
            "api_label_name": "Nom de la Playlist (Optionnel)",
            "api_label_server": "URL Serveur (http://...:port)",
            "api_label_user": "Utilisateur API",
            "api_label_pass": "Mot de passe API",
            "api_btn_connect": "Connecter / Sauvegarder",

            // MAIN MENU
            "menu_live": "TV Direct",
            "menu_movies": "Films",
            "menu_series": "Séries",
            "menu_speedtest": "Test de Vitesse",
            "menu_language": "Langue",
            "menu_settings": "Paramètres",
            "menu_about": "À propos",

            // LIVE TV
            "live_categories": "Catégories",
            "live_select_category": "Choisir une catégorie",
            "live_preview_hint": "Sélectionnez une chaîne pour l'aperçu",
            "live_hint_play": "Appuyez sur OK pour lire.",
            "live_hint_fullscreen": "Appuyez encore pour le plein écran.",

            // VOD & SERIES
            "vod_categories": "Catégories",
            "vod_select_hint": "Sélectionnez une catégorie",
            "detail_director": "Réalisateur:",
            "detail_cast": "Casting:",
            
            // BUTTONS
            "btn_play": "Lecture",
            "btn_favorite": "Favoris",
            "btn_remove_fav": "Retirer Favoris",
            "btn_add_fav": "Ajouter Favoris",
            "btn_trailer": "Bande-annonce",
            "btn_start": "Démarrer",
            "btn_close": "Fermer",
            "btn_refresh": "Actualiser",
            "btn_test_mode": "Mode Test",
            "btn_logout": "Déconnexion",
            "btn_edit_playlist": "Modifier Playlist",
            "btn_clear_favs": "Effacer Favoris",
            "btn_clear_history": "Effacer Historique",
            "btn_retry": "Réessayer",
            "btn_yes": "Oui",
            "btn_no": "Non",

            // SETTINGS
            "settings_language": "Langue",
            "settings_manage_cats": "Gérer Catégories",
            "btn_manage_live": "Gérer TV Direct",
            "btn_manage_movies": "Gérer Films",
            "btn_manage_series": "Gérer Séries",
            "settings_player_theme": "Thème Lecteur",
            "settings_app_theme": "Thème App",
            "settings_account": "Compte",
            "settings_api": "Paramètres API",
            "settings_cache": "Actions Générales",
            "manager_hint": "Masquer / Épingler",
            "sub_settings_title": "Apparence Sous-titres",
            "sub_label_size": "Taille",
            "sub_label_color": "Couleur",
            "sub_label_bg": "Arrière-plan",
            "sub_label_font": "Police",

            // NEW PRIVACY KEYS
            "settings_privacy": "Politique de Confidentialité",
            "settings_privacy_policy": "Politique de Confidentialité",
            "privacy_terms_title": "Conditions d'utilisation & Confidentialité",
            "btn_agree": "ACCEPTER",
            "btn_exit": "QUITTER",

            // SPEED TEST
            "speedtest_title": "Test de Vitesse Réseau",

            // CACHE / PERFORMANCE
            "settings_cache_all_categories": "Mettre en cache toutes les catégories",

            // PLAYLISTS
            "playlists_title": "Mes Playlists",
            "playlist_add_new": "Ajouter Playlist",
            "playlist_setup_title": "Configurer Playlist",
            "visit_url": "Visitez:",
            "waiting_playlist": "En attente de playlist...",
            "scan_hint": "Scannez pour ajouter",

            // PLAYLIST USER INFO
            "user_info_title": "Infos Playlist",
            "user_trial_tag": "Compte d'essai",
            "user_status": "Statut",
            "user_expires": "Expire le",
            "user_formats": "Formats",
            "user_server": "Serveur",
            "user_active": "Actif",
            "user_expired": "Expiré",
            "user_unlimited": "Illimité",
            "user_days_left": "jours restants",

            // DEVICE / SUBSCRIPTION INFO
            "sub_device_info": "Info Appareil",
            "sub_status": "Statut",
            "sub_mac": "Adresse MAC",
            "sub_created": "Créé le",
            "sub_playlists_count": "Playlists",
            "sub_active": "Actif",
            "sub_trial": "Essai",

            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_dev": "Développeur:",
            "about_contact": "Contact:",
            "about_desc": "Description:",
            "loading": "Chargement...",
            "search_placeholder": "Rechercher...",
            "title_searching": "Résultats de recherche",
            
            // MESSAGES
            "msg_fav_added": "Ajouté aux favoris",
            "msg_fav_removed": "Retiré des favoris",
            "msg_fav_cleared": "Favoris effacés",
            "msg_watch_cleared": "Historique effacé",
            "msg_skin_updated": "Thème lecteur mis à jour",
            "msg_theme_updated": "Thème application mis à jour",
            "msg_lang_updated": "Langue mise à jour",

            "exit_title": "Quitter l'application",
            "exit_msg": "Voulez-vous vraiment quitter ?"
        },
        es: {
            // AUTH & API
            "login_title": "Reproductor IPTV",
            "login_desc": "Ingrese su usuario",
            "login_btn": "Entrar / Crear",
            "api_title": "Conectar API",
            "api_desc": "Ingrese detalles Xtream Codes para",
            "api_label_name": "Nombre Playlist (Opcional)",
            "api_label_server": "URL Servidor (http://...:port)",
            "api_label_user": "Usuario API",
            "api_label_pass": "Contraseña API",
            "api_btn_connect": "Conectar / Guardar",

            // MAIN MENU
            "menu_live": "TV en Vivo",
            "menu_movies": "Películas",
            "menu_series": "Series",
            "menu_speedtest": "Test de Velocidad",
            "menu_language": "Idioma",
            "menu_settings": "Ajustes",
            "menu_about": "Acerca de",

            // LIVE TV
            "live_categories": "Categorías",
            "live_select_category": "Seleccionar Categoría",
            "live_preview_hint": "Seleccione canal para vista previa",
            "live_hint_play": "Presione OK para reproducir.",
            "live_hint_fullscreen": "Presione otra vez para pantalla completa.",

            // VOD & SERIES
            "vod_categories": "Categorías",
            "vod_select_hint": "Seleccione una categoría",
            "detail_director": "Director:",
            "detail_cast": "Reparto:",
            
            // BUTTONS
            "btn_play": "Reproducir",
            "btn_favorite": "Favorito",
            "btn_remove_fav": "Quitar Favorito",
            "btn_add_fav": "Añadir Favorito",
            "btn_trailer": "Tráiler",
            "btn_start": "Iniciar",
            "btn_close": "Cerrar",
            "btn_refresh": "Actualizar",
            "btn_test_mode": "Modo Prueba",
            "btn_logout": "Cerrar Sesión",
            "btn_edit_playlist": "Editar Playlist",
            "btn_clear_favs": "Borrar Favoritos",
            "btn_clear_history": "Borrar Historial",
            "btn_retry": "Reintentar",
            "btn_yes": "Sí",
            "btn_no": "No",

            // SETTINGS
            "settings_language": "Idioma",
            "settings_manage_cats": "Gestionar Categorías",
            "btn_manage_live": "Gestionar TV",
            "btn_manage_movies": "Gestionar Películas",
            "btn_manage_series": "Gestionar Series",
            "settings_player_theme": "Tema Reproductor",
            "settings_app_theme": "Tema App",
            "settings_account": "Cuenta",
            "settings_api": "Ajustes API",
            "settings_cache": "Acciones Generales",
            "manager_hint": "Ocultar / Fijar",
            "sub_settings_title": "Apariencia Subtítulos",
            "sub_label_size": "Tamaño",
            "sub_label_color": "Color",
            "sub_label_bg": "Fondo",
            "sub_label_font": "Fuente",

            // NEW PRIVACY KEYS
            "settings_privacy": "Política de Privacidad",
            "settings_privacy_policy": "Política de Privacidad",
            "privacy_terms_title": "Términos y Privacidad",
            "btn_agree": "ACEPTAR",
            "btn_exit": "SALIR",

            // SPEED TEST
            "speedtest_title": "Prueba de Velocidad de Red",

            // CACHE / PERFORMANCE
            "settings_cache_all_categories": "Caché de todas las categorías",

            // PLAYLISTS
            "playlists_title": "Mis Playlists",
            "playlist_add_new": "Nueva Playlist",
            "playlist_setup_title": "Configurar Playlist",
            "visit_url": "Visitar:",
            "waiting_playlist": "Esperando playlist...",
            "scan_hint": "Escanear para añadir",

            // PLAYLIST USER INFO
            "user_info_title": "Info Playlist",
            "user_trial_tag": "Cuenta de Prueba",
            "user_status": "Estado",
            "user_expires": "Caduca",
            "user_formats": "Formatos",
            "user_server": "Servidor",
            "user_active": "Activo",
            "user_expired": "Caducado",
            "user_unlimited": "Ilimitado",
            "user_days_left": "días restantes",

            // DEVICE / SUBSCRIPTION INFO
            "sub_device_info": "Info Dispositivo",
            "sub_status": "Estado",
            "sub_mac": "Dirección MAC",
            "sub_created": "Creado",
            "sub_playlists_count": "Listas",
            "sub_active": "Activo",
            "sub_trial": "Prueba",

            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_dev": "Desarrollador:",
            "about_contact": "Contacto:",
            "about_desc": "Descripción:",
            "loading": "Cargando...",
            "search_placeholder": "Buscar...",
            "title_searching": "Resultados de búsqueda",
            
            // MESSAGES
            "msg_fav_added": "Añadido a favoritos",
            "msg_fav_removed": "Eliminado de favoritos",
            "msg_fav_cleared": "Favoritos borrados",
            "msg_watch_cleared": "Historial borrado",
            "msg_skin_updated": "Tema del reproductor actualizado",
            "msg_theme_updated": "Tema de la aplicación actualizado",
            "msg_lang_updated": "Idioma actualizado",

            "exit_title": "Salir de la aplicación",
            "exit_msg": "¿Quieres salir de la aplicación?"
        },
        ar: {
            // AUTH & API
            "login_title": "مشغل IPTV",
            "login_desc": "أدخل اسم المستخدم لتحميل الملف الشخصي",
            "login_btn": "دخول / إنشاء",
            "api_title": "اتصال API",
            "api_desc": "أدخل تفاصيل Xtream Codes لـ",
            "api_label_name": "اسم القائمة (اختياري)",
            "api_label_server": "رابط السيرفر (http://...:port)",
            "api_label_user": "اسم المستخدم",
            "api_label_pass": "كلمة المرور",
            "api_btn_connect": "اتصال / حفظ",

            // MAIN MENU
            "menu_live": "بث مباشر",
            "menu_movies": "أفلام",
            "menu_series": "مسلسلات",
            "menu_speedtest": "اختبار السرعة",
            "menu_language": "اللغة",
            "menu_settings": "الإعدادات",
            "menu_about": "حول التطبيق",

            // LIVE TV
            "live_categories": "التصنيفات",
            "live_select_category": "اختر تصنيفاً",
            "live_preview_hint": "اختر قناة للمعاينة",
            "live_hint_play": "اضغط OK للتشغيل",
            "live_hint_fullscreen": "اضغط OK مجدداً لتكبير الشاشة",

            // VOD & SERIES
            "vod_categories": "التصنيفات",
            "vod_select_hint": "اختر تصنيفاً لعرض المحتوى",
            "detail_director": "المخرج:",
            "detail_cast": "الممثلون:",
            
            // BUTTONS
            "btn_play": "تشغيل",
            "btn_favorite": "مفضلة",
            "btn_remove_fav": "إزالة من المفضلة",
            "btn_add_fav": "إضافة للمفضلة",
            "btn_trailer": "إعلان",
            "btn_start": "بدء",
            "btn_close": "إغلاق",
            "btn_refresh": "تحديث",
            "btn_test_mode": "وضع التجربة",
            "btn_logout": "تسجيل خروج",
            "btn_edit_playlist": "تعديل القائمة",
            "btn_clear_favs": "مسح المفضلة",
            "btn_clear_history": "مسح المشاهدة",
            "btn_retry": "إعادة المحاولة",
            "btn_yes": "نعم",
            "btn_no": "لا",

            // SETTINGS
            "settings_language": "اللغة",
            "settings_manage_cats": "إدارة التصنيفات",
            "btn_manage_live": "إدارة البث المباشر",
            "btn_manage_movies": "إدارة الأفلام",
            "btn_manage_series": "إدارة المسلسلات",
            "settings_player_theme": "مظهر المشغل",
            "settings_app_theme": "مظهر التطبيق",
            "settings_account": "الحساب",
            "settings_api": "إعدادات API",
            "settings_cache": "إجراءات عامة",
            "manager_hint": "إخفاء / تثبيت",
            "sub_settings_title": "مظهر الترجمة",
            "sub_label_size": "الحجم",
            "sub_label_color": "اللون",
            "sub_label_bg": "الخلفية",
            "sub_label_font": "الخط",

            // NEW PRIVACY KEYS
            "settings_privacy": "سياسة الخصوصية",
            "settings_privacy_policy": "سياسة الخصوصية",
            "privacy_terms_title": "شروط الخدمة والخصوصية",
            "btn_agree": "موافق",
            "btn_exit": "خروج",

            // SPEED TEST
            "speedtest_title": "اختبار سرعة الشبكة",

            // CACHE / PERFORMANCE
            "settings_cache_all_categories": "تخزين كافة التصنيفات مؤقتاً",

            // PLAYLISTS
            "playlists_title": "قوائم التشغيل",
            "playlist_add_new": "إضافة قائمة جديدة",
            "playlist_setup_title": "إعداد القائمة",
            "visit_url": "قم بزيارة:",
            "waiting_playlist": "بانتظار القائمة...",
            "scan_hint": "امسح الرمز للإضافة",

            // PLAYLIST USER INFO
            "user_info_title": "معلومات القائمة",
            "user_trial_tag": "حساب تجريبي",
            "user_status": "الحالة",
            "user_expires": "الانتهاء",
            "user_formats": "الصيغ",
            "user_server": "السيرفر",
            "user_active": "نشط",
            "user_expired": "منتهي",
            "user_unlimited": "غير محدود",
            "user_days_left": "أيام متبقية",

            // DEVICE / SUBSCRIPTION INFO
            "sub_device_info": "معلومات الجهاز",
            "sub_status": "الحالة",
            "sub_mac": "عنوان MAC",
            "sub_created": "تاريخ الإنشاء",
            "sub_playlists_count": "القوائم",
            "sub_active": "نشط",
            "sub_trial": "تجريبي",

            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_dev": "المطور:",
            "about_contact": "تواصل:",
            "about_desc": "الوصف:",
            "loading": "جاري التحميل...",
            "search_placeholder": "بحث في القائمة...",
            "title_searching": "نتائج البحث",
            
            // MESSAGES
            "msg_fav_added": "تم الإضافة للمفضلة",
            "msg_fav_removed": "تم الإزالة من المفضلة",
            "msg_fav_cleared": "تم مسح المفضلة",
            "msg_watch_cleared": "تم مسح سجل المشاهدة",
            "msg_skin_updated": "تم تحديث مظهر المشغل",
            "msg_theme_updated": "تم تحديث مظهر التطبيق",
            "msg_lang_updated": "تم تحديث اللغة",

            "exit_title": "الخروج من التطبيق",
            "exit_msg": "هل تريد الخروج من التطبيق؟"
        }
    };

    /**
     * Get translated string
     * @param {string} key - The dictionary key
     */
    function t(key) {
        const lang = (userSettings && userSettings.language) ? userSettings.language : 'en';
        if (dictionary[lang] && dictionary[lang][key]) {
            return dictionary[lang][key];
        }
        // Fallback to English
        return dictionary['en'][key] || key;
    }

    /**
     * Update all DOM elements with data-i18n attribute
     */
    function updateDOM() {
        const lang = (userSettings && userSettings.language) ? userSettings.language : 'en';
        console.log(`[LanguageManager] Updating DOM to: ${lang}`);

        // 1. Handle RTL for Arabic
        /*
        if (lang === 'ar') {
            document.body.setAttribute('dir', 'rtl');
            document.body.classList.add('rtl-layout');
        } else {
            document.body.setAttribute('dir', 'ltr');
            document.body.classList.remove('rtl-layout');
        }*/

        // 2. Update Text Content
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                el.textContent = t(key);
            }
        });

        // 3. Update Placeholders (for search inputs)
        const inputs = document.querySelectorAll('[data-i18n-placeholder]');
        inputs.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) {
                el.placeholder = t(key);
            }
        });
    }

    return {
        t,
        updateDOM,
        dictionary
    };

})();

// Global alias for easy access
window.t = LanguageManager.t;