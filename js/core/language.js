const LanguageManager = (function() {
    var docDir = document.body.getAttribute("dir") || 'rtl';
    var isLtr = true;
    // --- FULL PRIVACY POLICY TEXTS ---
    const POLICY_EN = `PRIVACY POLICY FOR SPEEDY IPTV

Last Updated: December 6, 2025

1. Data Collection & Purpose
Speedy IPTV strictly limits data collection to the minimum necessary for the application to function. We collect the following device identifiers:
* MAC Address & Tizen ID: Used as unique identifiers for your user profile. This allows the app to save your playlists, favorites, and settings without requiring a login or password.
* Model Name: Used to detect your TV's technical capabilities (resolution, supported codecs) to ensure smooth video playback.

2. Data Usage
This information is used solely for:
* Authenticating your device.
* Restoring your user preferences.
* Technical troubleshooting.

3. Third-Party Sharing
We do not sell, trade, or transfer your data (MAC Address, Tizen ID, or Model Name) to outside parties. We do not use this data for advertising or tracking purposes.

4. User Consent
By launching Speedy IPTV and clicking "Agree," you consent to this collection. You may withdraw consent by uninstalling the application.

5. Contact
If you have questions regarding this policy, please contact us at: support@geekspro.us`;

    const POLICY_FR = `POLITIQUE DE CONFIDENTIALITÉ POUR SPEEDY IPTV

Dernière mise à jour : 6 décembre 2025

1. Collecte de données et objectif
Speedy IPTV limite strictement la collecte de données au minimum nécessaire au fonctionnement de l'application. Nous collectons les identifiants d'appareil suivants :
* Adresse MAC et identifiant Tizen : utilisés comme identifiants uniques pour votre profil utilisateur. Cela permet à l'application d'enregistrer vos listes de lecture, favoris et paramètres sans nécessiter de connexion ni de mot de passe.
* Nom du modèle : utilisé pour détecter les capacités techniques de votre téléviseur (résolution, codecs pris en charge) afin d'assurer une lecture vidéo fluide.

2. Utilisation des données
Ces informations sont utilisées uniquement pour :
* Authentifier votre appareil.
* Restaurer vos préférences utilisateur.
* Le dépannage technique.

3. Partage avec des tiers
Nous ne vendons, n'échangeons ni ne transférons vos données (adresse MAC, identifiant Tizen ou nom du modèle) à des tiers. Nous n'utilisons pas ces données à des fins publicitaires ou de suivi.

4. Consentement de l'utilisateur
En lançant Speedy IPTV et en cliquant sur « Accepter », vous consentez à cette collecte. Vous pouvez retirer votre consentement en désinstallant l'application.

5. Contact
Si vous avez des questions concernant cette politique, veuillez nous contacter à : support@geekspro.us`;

    const POLICY_ES = `POLÍTICA DE PRIVACIDAD DE SPEEDY IPTV

Última actualización: 6 de diciembre de 2025

1. Recopilación de datos y finalidad
Speedy IPTV limita estrictamente la recopilación de datos al mínimo necesario para que la aplicación funcione. Recopilamos los siguientes identificadores de dispositivo:
* Dirección MAC e ID de Tizen: se utilizan como identificadores únicos para su perfil de usuario. Esto permite que la aplicación guarde sus listas de reproducción, favoritos y configuraciones sin requerir un inicio de sesión o contraseña.
* Nombre del modelo: se utiliza para detectar las capacidades técnicas de su televisor (resolución, códecs compatibles) para garantizar una reproducción de video fluida.

2. Uso de datos
Esta información se utiliza únicamente para:
* Autenticar su dispositivo.
* Restaurar sus preferencias de usuario.
* Solución de problemas técnicos.

3. Intercambio con terceros
No vendemos, comercializamos ni transferimos sus datos (dirección MAC, ID de Tizen o nombre del modelo) a terceros. No utilizamos estos datos con fines publicitarios o de seguimiento.

4. Consentimiento del usuario
Al iniciar Speedy IPTV y hacer clic en "Aceptar", usted da su consentimiento a esta recopilación. Puede retirar su consentimiento desinstalando la aplicación.

5. Contacto
Si tiene preguntas sobre esta política, contáctenos en: support@geekspro.us`;

    const POLICY_AR = `سياسة الخصوصية لـ SPEEDY IPTV

آخر تحديث: 6 ديسمبر 2025

1. جمع البيانات والغرض منها
يقصر Speedy IPTV جمع البيانات بشكل صارم على الحد الأدنى الضروري لعمل التطبيق. نجمع معرفات الجهاز التالية:
* عنوان MAC ومعرف Tizen: تستخدم كمعرفات فريدة لملفك الشخصي. يتيح هذا للتطبيق حفظ قوائم التشغيل والمفضلة والإعدادات دون الحاجة لتسجيل الدخول أو كلمة مرور.
* اسم الموديل: يستخدم للكشف عن القدرات التقنية للتلفزيون (الدقة، برامج الترميز المدعومة) لضمان تشغيل الفيديو بسلاسة.

2. استخدام البيانات
تستخدم هذه المعلومات فقط لـ:
* المصادقة على جهازك.
* استعادة تفضيلات المستخدم.
* استكشاف الأخطاء التقنية وإصلاحها.

3. المشاركة مع أطراف ثالثة
نحن لا نبيع أو نتاجر أو ننقل بياناتك (عنوان MAC أو معرف Tizen أو اسم الموديل) لأطراف خارجية. لا نستخدم هذه البيانات للإعلانات أو التتبع.

4. موافقة المستخدم
من خلال تشغيل Speedy IPTV والنقر على "موافق"، فإنك توافق على هذا الجمع. يمكنك سحب الموافقة عن طريق إلغاء تثبيت التطبيق.

5. الاتصال
إذا كانت لديك أسئلة بخصوص هذه السياسة، يرجى الاتصال بنا على: support@geekspro.us`;


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
            
            // PRIVACY & TERMS
            "settings_privacy": "Privacy Policy",
            "settings_privacy_policy": "Privacy Policy",
            "privacy_terms_title": "Terms of Service & Privacy Policy",
            "btn_agree": "AGREE",
            "btn_exit": "EXIT",
            
            // Privacy Modal Content
            "privacy_consent_intro": "To function properly, <strong>Speedy IPTV</strong> needs to access specific device identifiers. We collect the following data strictly to save your playlists and settings:",
            "privacy_consent_point1": "<strong>MAC Address & Tizen ID:</strong> Used to identify your device so we can restore your saved content.",
            "privacy_consent_point2": "<strong>Model Name:</strong> Used to detect your TV's technical capabilities (resolution, supported codecs) to ensure smooth video playback.",
            "privacy_consent_outro1": "We do not sell, share, or rent this information to third parties.",
            "privacy_consent_outro2": "By clicking <strong>'AGREE'</strong>, you consent to this collection.",
            
            // Full Privacy Policy Text (Injected from constants)
            "privacy_policy_full": POLICY_EN,

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
            "msg_no_playlists": "No playlists found.",

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

            // DEVICE / SUBSCRIPTION INFO
            "sub_device_info": "Device Info",
            "sub_status": "Status",
            "sub_mac": "MAC Address",
            "sub_created": "Created",
            "sub_playlists_count": "Playlists",
            "sub_active": "Active",
            "sub_trial": "Trial",
            "sub_waiting": "Waiting",

            // BOOT STATUS & ERRORS
            "boot_init": "Initializing...",
            "boot_loading_user": "Loading user playlists...",
            "boot_test_mode": "Entering Test Mode...",
            "boot_verifying": "Verifying device...",
            "boot_fetching_info": "Fetching user info...",
            "boot_registering": "Registering device...",
            "boot_firebase_failed": "Firebase Init Failed",
            "boot_https": "Trying HTTPS connection...",
            "boot_http": "Trying HTTP connection...",
            "boot_success": "Connection Successful!",
            "boot_connection_error": "Connection Error",
            "boot_data_error": "Invalid Playlist Data",
            "error_incomplete_playlist": "Selected playlist is incomplete. Please update the details.",
            "error_playlist_auth": "PlayList Error (expired or wrong username/password)",
            "error_connect_failed": "Connect failed",
            "error_network": "Network Error",
            "error_unknown": "An unknown error occurred.",
            "error_code": "Code",
            
            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_version": "Version",
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
            "exit_msg": "Do you want to exit the application?",

            'connection_lost': 'Connection Lost', 
            'waiting_for_network': 'Waiting for network to recover...',

            // ACCESSIBILITY (Voice Guide / TTS) & PLAYER MESSAGES
            "aria_search": "Search",
            "aria_playlists": "Playlists",
            "aria_settings": "Settings",
            "aria_play": "Play",
            "aria_pause": "Pause",
            "aria_subtitles": "Subtitles",
            "aria_audio": "Audio track",
            "aria_sub_settings": "Subtitle settings",
            "aria_seek": "Playback position",
            "aria_change_language": "Change language",
            "aria_app_theme": "App theme",
            "aria_player_theme": "Player theme",
            "aria_rating": "Rating",
            "aria_pinned": "Pinned",
            "aria_pin": "Pin category",
            "aria_hide": "Hide category",
            "aria_season": "Season",
            "aria_episode": "Episode",
            "aria_watched": "watched",
            "msg_playback_stopped": "Playback stopped",
            "msg_live_no_seek": "Seeking is not available for live channels",
            "msg_playback_ended": "Playback ended",

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

            // PRIVACY & TERMS
            "settings_privacy": "Politique de Confidentialité",
            "settings_privacy_policy": "Politique de Confidentialité",
            "privacy_terms_title": "Conditions d'utilisation & Confidentialité",
            "btn_agree": "ACCEPTER",
            "btn_exit": "QUITTER",

            // Privacy Modal Content
            "privacy_consent_intro": "Pour fonctionner correctement, <strong>Speedy IPTV</strong> doit accéder à des identifiants d'appareil spécifiques. Nous collectons les données suivantes uniquement pour sauvegarder vos playlists :",
            "privacy_consent_point1": "<strong>Adresse MAC et identifiant Tizen :</strong> Utilisés pour identifier votre appareil et restaurer votre contenu sauvegardé.",
            "privacy_consent_point2": "<strong>Nom du modèle :</strong> Utilisé pour détecter les capacités techniques de votre TV (résolution, codecs) pour une lecture fluide.",
            "privacy_consent_outro1": "Nous ne vendons, ne partageons et ne louons pas ces informations à des tiers.",
            "privacy_consent_outro2": "En cliquant sur <strong>'ACCEPTER'</strong>, vous consentez à cette collecte.",

            // Full Privacy Policy Text
            "privacy_policy_full": POLICY_FR,

            // SPEED TEST
            "speedtest_title": "Test de Vitesse Réseau",

            // CACHE / PERFORMANCE
            "settings_cache_all_categories": "Mettre en cache toutes les catégories",

            // PLAYLISTS
            "playlists_title": "Mes Playlists",
            "playlist_add_new": "Ajouter Playlist",
            "playlist_setup_title": "Configurer Playlist",
            "visit_url": "Visitez :",
            "waiting_playlist": "En attente de playlist...",
            "scan_hint": "Scannez pour ajouter",
            "msg_no_playlists": "Aucune playlist trouvée.",

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
            "sub_waiting": "En attente",

            // BOOT STATUS & ERRORS
            "boot_init": "Initialisation...",
            "boot_loading_user": "Chargement des playlists...",
            "boot_test_mode": "Passage en mode test...",
            "boot_verifying": "Vérification de l'appareil...",
            "boot_fetching_info": "Récupération infos utilisateur...",
            "boot_registering": "Enregistrement de l'appareil...",
            "boot_firebase_failed": "Échec Init Firebase",
            "boot_https": "Tentative connexion HTTPS...",
            "boot_http": "Tentative connexion HTTP...",
            "boot_success": "Connexion réussie !",
            "boot_connection_error": "Erreur de connexion",
            "boot_data_error": "Données playlist invalides",
            "error_incomplete_playlist": "La playlist sélectionnée est incomplète. Veuillez mettre à jour les détails.",
            "error_playlist_auth": "Erreur Playlist (expiré ou mauvais identifiants)",
            "error_connect_failed": "Échec de connexion",
            "error_network": "Erreur Réseau",
            "error_unknown": "Une erreur inconnue est survenue.",
            "error_code": "Code",

            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_version": "Version",
            "about_dev": "Développeur :",
            "about_contact": "Contact :",
            "about_desc": "Description :",
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
            "exit_msg": "Voulez-vous vraiment quitter ?",

            'connection_lost': 'Connexion Perdue',
            'waiting_for_network': 'En attente de récupération du réseau...',

            // ACCESSIBILITY (Voice Guide / TTS) & PLAYER MESSAGES
            "aria_search": "Rechercher",
            "aria_playlists": "Listes de lecture",
            "aria_settings": "Paramètres",
            "aria_play": "Lecture",
            "aria_pause": "Pause",
            "aria_subtitles": "Sous-titres",
            "aria_audio": "Piste audio",
            "aria_sub_settings": "Paramètres des sous-titres",
            "aria_seek": "Position de lecture",
            "aria_change_language": "Changer de langue",
            "aria_app_theme": "Thème de l'application",
            "aria_player_theme": "Thème du lecteur",
            "aria_rating": "Note",
            "aria_pinned": "Épinglé",
            "aria_pin": "Épingler la catégorie",
            "aria_hide": "Masquer la catégorie",
            "aria_season": "Saison",
            "aria_episode": "Épisode",
            "aria_watched": "vu",
            "msg_playback_stopped": "Lecture arrêtée",
            "msg_live_no_seek": "L'avance et le retour rapides ne sont pas disponibles pour les chaînes en direct",
            "msg_playback_ended": "Lecture terminée",

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

            // PRIVACY & TERMS
            "settings_privacy": "Política de Privacidad",
            "settings_privacy_policy": "Política de Privacidad",
            "privacy_terms_title": "Términos y Privacidad",
            "btn_agree": "ACEPTAR",
            "btn_exit": "SALIR",

            // Privacy Modal Content
            "privacy_consent_intro": "Para funcionar correctamente, <strong>Speedy IPTV</strong> necesita acceder a identificadores específicos del dispositivo. Recopilamos los siguientes datos para guardar sus listas:",
            "privacy_consent_point1": "<strong>Dirección MAC y Tizen ID:</strong> Usados para identificar su dispositivo y restaurar su contenido guardado.",
            "privacy_consent_point2": "<strong>Nombre del modelo:</strong> Usado para detectar capacidades técnicas (resolución, códecs) para una reproducción fluida.",
            "privacy_consent_outro1": "No vendemos, compartimos ni alquilamos esta información a terceros.",
            "privacy_consent_outro2": "Al hacer clic en <strong>'ACEPTAR'</strong>, usted consiente esta recopilación.",

            // Full Privacy Policy Text
            "privacy_policy_full": POLICY_ES,

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
            "msg_no_playlists": "No se encontraron playlists.",

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
            "sub_waiting": "Esperando",

            // BOOT STATUS & ERRORS
            "boot_init": "Iniciando...",
            "boot_loading_user": "Cargando playlists...",
            "boot_test_mode": "Entrando en Modo Prueba...",
            "boot_verifying": "Verificando dispositivo...",
            "boot_fetching_info": "Obteniendo info usuario...",
            "boot_registering": "Registrando dispositivo...",
            "boot_firebase_failed": "Fallo Init Firebase",
            "boot_https": "Intentando conexión HTTPS...",
            "boot_http": "Intentando conexión HTTP...",
            "boot_success": "¡Conexión Exitosa!",
            "boot_connection_error": "Error de Conexión",
            "boot_data_error": "Datos de Playlist Inválidos",
            "error_incomplete_playlist": "La playlist seleccionada está incompleta. Por favor actualice los detalles.",
            "error_playlist_auth": "Error de Playlist (expirada o contraseña incorrecta)",
            "error_connect_failed": "Conexión fallida",
            "error_network": "Error de Red",
            "error_unknown": "Ocurrió un error desconocido.",
            "error_code": "Código",

            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_version": "Versión",
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
            "exit_msg": "¿Quieres salir de la aplicación?",

            "connection_lost": "Conexión Perdida",
            "waiting_for_network": "Esperando recuperación de red...",

            // ACCESSIBILITY (Voice Guide / TTS) & PLAYER MESSAGES
            "aria_search": "Buscar",
            "aria_playlists": "Listas de reproducción",
            "aria_settings": "Ajustes",
            "aria_play": "Reproducir",
            "aria_pause": "Pausa",
            "aria_subtitles": "Subtítulos",
            "aria_audio": "Pista de audio",
            "aria_sub_settings": "Ajustes de subtítulos",
            "aria_seek": "Posición de reproducción",
            "aria_change_language": "Cambiar idioma",
            "aria_app_theme": "Tema de la aplicación",
            "aria_player_theme": "Tema del reproductor",
            "aria_rating": "Valoración",
            "aria_pinned": "Fijado",
            "aria_pin": "Fijar categoría",
            "aria_hide": "Ocultar categoría",
            "aria_season": "Temporada",
            "aria_episode": "Episodio",
            "aria_watched": "visto",
            "msg_playback_stopped": "Reproducción detenida",
            "msg_live_no_seek": "El avance y retroceso no están disponibles en canales en directo",
            "msg_playback_ended": "Reproducción finalizada",

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

            // PRIVACY & TERMS
            "settings_privacy": "سياسة الخصوصية",
            "settings_privacy_policy": "سياسة الخصوصية",
            "privacy_terms_title": "شروط الخدمة والخصوصية",
            "btn_agree": "موافق",
            "btn_exit": "خروج",

            // Privacy Modal Content
            "privacy_consent_intro": "لكي يعمل التطبيق بشكل صحيح، يحتاج <strong>Speedy IPTV</strong> للوصول إلى معرفات الجهاز. نجمع البيانات التالية حصرياً لحفظ قوائم التشغيل الخاصة بك:",
            "privacy_consent_point1": "<strong>عنوان MAC و Tizen ID:</strong> تستخدم للتعرف على جهازك واستعادة المحتوى المحفوظ.",
            "privacy_consent_point2": "<strong>اسم الموديل:</strong> يستخدم للكشف عن القدرات التقنية للتلفاز (الدقة، برامج الترميز) لضمان تشغيل الفيديو بسلاسة.",
            "privacy_consent_outro1": "نحن لا نبيع أو نشارك أو نؤجر هذه المعلومات لأطراف ثالثة.",
            "privacy_consent_outro2": "بالضغط على <strong>'موافق'</strong>، أنت توافق على هذا الجمع للبيانات.",

            // Full Privacy Policy Text
            "privacy_policy_full": POLICY_AR,

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
            "msg_no_playlists": "لم يتم العثور على قوائم.",

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
            "sub_waiting": "انتظار",

            // BOOT STATUS & ERRORS
            "boot_init": "جاري البدء...",
            "boot_loading_user": "تحميل القوائم...",
            "boot_test_mode": "الدخول في وضع التجربة...",
            "boot_verifying": "التحقق من الجهاز...",
            "boot_fetching_info": "جلب معلومات المستخدم...",
            "boot_registering": "تسجيل الجهاز...",
            "boot_firebase_failed": "فشل تهيئة Firebase",
            "boot_https": "محاولة اتصال HTTPS...",
            "boot_http": "محاولة اتصال HTTP...",
            "boot_success": "تم الاتصال بنجاح!",
            "boot_connection_error": "خطأ في الاتصال",
            "boot_data_error": "بيانات القائمة غير صالحة",
            "error_incomplete_playlist": "القائمة المختارة غير مكتملة. يرجى تحديث التفاصيل.",
            "error_playlist_auth": "خطأ في القائمة (منتهية الصلاحية أو بيانات خاطئة)",
            "error_connect_failed": "فشل الاتصال",
            "error_network": "خطأ في الشبكة",
            "error_unknown": "حدث خطأ غير معروف.",
            "error_code": "الرمز",

            // ABOUT & SYSTEM
            "app_name": "Speedy IPTV",
            "about_version": "الإصدار",
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
            "exit_msg": "هل تريد الخروج من التطبيق؟",

            "connection_lost": "فقدان الاتصال",
            "waiting_for_network": "في انتظار استعادة الشبكة...",

            // ACCESSIBILITY (Voice Guide / TTS) & PLAYER MESSAGES
            "aria_search": "بحث",
            "aria_playlists": "قوائم التشغيل",
            "aria_settings": "الإعدادات",
            "aria_play": "تشغيل",
            "aria_pause": "إيقاف مؤقت",
            "aria_subtitles": "الترجمة",
            "aria_audio": "المسار الصوتي",
            "aria_sub_settings": "إعدادات الترجمة",
            "aria_seek": "موضع التشغيل",
            "aria_change_language": "تغيير اللغة",
            "aria_app_theme": "مظهر التطبيق",
            "aria_player_theme": "مظهر المشغل",
            "aria_rating": "التقييم",
            "aria_pinned": "مثبت",
            "aria_pin": "تثبيت الفئة",
            "aria_hide": "إخفاء الفئة",
            "aria_season": "الموسم",
            "aria_episode": "الحلقة",
            "aria_watched": "تمت المشاهدة",
            "msg_playback_stopped": "تم إيقاف التشغيل",
            "msg_live_no_seek": "التقديم والترجيع غير متاحين للقنوات المباشرة",
            "msg_playback_ended": "انتهى التشغيل",

        }
    };

    /**
     * Get translated string
     * @param {string} key - The dictionary key
     */
    function t(key) {

        const lang = (userSettings && userSettings.language) ? userSettings.language : 'en';
        if(key === "waiting_for_network"){
            console.log(key, "1023", dictionary[lang][key])
        }
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
        //i do no need to change RTL at all, this will add complexity to navigation, so i will just keep it LTR
        /*
        if (lang === 'ar') {
            docDir="rtl";
            document.body.setAttribute('dir', docDir);
            document.body.classList.add('rtl-layout');
            isLtr=false;
        } else {
            docDir="ltr";
            document.body.setAttribute('dir', docDir);
            document.body.classList.remove('rtl-layout');
            isLtr=true;
        }
        */
        
        // 2. Update Text Content (Using innerHTML to support <b>, <strong> tags in translations)
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                // Use innerHTML to allow simple formatting tags in translation strings
                el.innerHTML = t(key);
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

        // 4. Accessible names for icon-only controls (read by TV Voice Guide)
        document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria-label');
            if (key) el.setAttribute('aria-label', t(key));
        });

        // 5. Tell the TTS engine which voice to use. Without this, Arabic/French/Spanish
        // text is spoken by the English voice and comes out as garbage.
        document.documentElement.setAttribute('lang', dictionary[lang] ? lang : 'en');
    }

    return {
        t,
        updateDOM,
        dictionary,
        get isLtr(){
            return isLtr;
        }
    };

})();

// Global alias for easy access
window.t = LanguageManager.t;