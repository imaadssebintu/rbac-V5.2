import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  Skeleton
} from '@mui/material';
import {
  ArrowForward,
  Close,
  ExpandMore,
  Groups,
  PlayCircleFilled,
  Public,
  Shield,
  VerifiedUser
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import HeroCarousel from '../components/common/HeroCarousel';

const Landing = ({ initialAuthMode }) => {
  const { themeMode, setThemeMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for location-based hero images
  const [heroImages, setHeroImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const [language, setLanguage] = useState('EN');
  const [anchorEl, setAnchorEl] = useState(null);
  const [loginMenuEl, setLoginMenuEl] = useState(null);
  const [langMenuEl, setLangMenuEl] = useState(null);
  const [themeMenuEl, setThemeMenuEl] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authRole, setAuthRole] = useState('walkee');
  const [settingsPromptOpen, setSettingsPromptOpen] = useState(false);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(null);

  const openMenu = Boolean(anchorEl);

  const handleOpenAuth = (mode) => {
    setAuthMode(mode);
  };

  const handleCloseAuth = () => {
    setAuthMode(null);
  };

  const handleSettingsClick = () => {
    if (user) {
      return;
    }
    setSettingsPromptOpen(true);
  };

  const translations = useMemo(
    () => ({
      EN: {
        brand: 'Voya',
        services: 'Services',
        safety: 'Safety',
        stories: 'Stories',
        settings: 'Settings',
        login: 'Log in',
        getStarted: 'Get started',
        startJourney: 'Start the journey',
        watchIntro: 'Watch demo',
        heroTitle: 'Travel safer with verified companions.',
        heroBody:
          'Voya connects travelers with verified local guides, security escorts, and destination experts. Plan your route and move with confidence.',
        communityTitle: 'Community stories',
        communityBody:
          'Real travel is built on trust. These profiles show the collaboration between guides and travelers.',
        loginTraveler: 'Traveler login',
        loginGuide: 'Guide login',
        loginAdmin: 'Admin login',
        language: 'Language',
        theme: 'Theme',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        storyButton: 'Read story',
        loginTitle: 'Log in to Voya',
        registerTitle: 'Join Voya',
        settingsPromptTitle: 'Sign in required',
        settingsPromptBody:
          'Please log in or create an account to access settings and your full dashboard features.',
        settingsPromptCancel: 'Cancel',
        settingsPromptLogin: 'Log in',
        settingsPromptSignup: 'Sign up',
        servicesMenu: {
          guides: 'Certified Guides',
          security: 'Security Escorts',
          agency: 'Agency Support'
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Verified Guides',
            text:
              'Every guide completes ID checks, local references, and route training before being listed. Travelers can review profiles, credentials, and verified badges.'
          },
          {
            key: 'security',
            title: 'Security Assurance',
            text:
              'Guided routes use live check-ins, emergency contacts, and escalation support. You can share your walk details with trusted contacts at any time.'
          },
          {
            key: 'global',
            title: 'Global Reach',
            text:
              'From major cities to regional hubs, Voya connects travelers with multilingual guides who understand local culture, safety, and mobility needs.'
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca in Nairobi',
            role: 'Traveler',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg',
            story:
              'Luca arrived for a two-week research stay and needed help navigating busy routes between the airport, a research center, and downtown.',
            fullStory:
              'Luca booked a verified guide before landing in Nairobi. Together they mapped safe routes between lodging, the research center, and local markets, with check-ins at key points. The guide coordinated safe pickup, helped with local etiquette, and provided a daily schedule with secure meeting points.'
          },
          {
            id: 'story-amarian',
            name: 'Amarian in Kigali',
            role: 'Guide',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg',
            story:
              "Amarian is a multilingual guide who supports visitors with city orientation, museum routes, and safety briefings.",
            fullStory:
              'Amarian works with visitors who need trusted guidance for first-time travel. After a quick needs assessment, Amarian designs a route, shares safety notes, and provides optional escort support.'
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi in Entebbe',
            role: 'Operations Lead',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg',
            story:
              'Ssebuguzi coordinates guide schedules, verifies availability, and makes sure travelers get matched to the right support level.',
            fullStory:
              'Ssebuguzi manages daily operations: availability checks, guide verification, and customer support. Each request is matched to the right guide based on location, language, and support needs.'
          }
        ]
      },
      FR: {
        brand: 'Voya',
        services: 'Services',
        safety: 'Securite',
        stories: 'Recits',
        settings: 'Parametres',
        login: 'Connexion',
        getStarted: 'Commencer',
        startJourney: 'Commencer le voyage',
        watchIntro: 'Voir la demo',
        heroTitle: 'Voyage plus sur avec des compagnons verifies.',
        heroBody:
          'Voya relie les voyageurs aux guides locaux verifies, escortes de securite et experts de destination. Planifiez votre itineraire et voyagez en confiance.',
        communityTitle: 'Recits de la communaute',
        communityBody:
          'Les voyages reels reposent sur la confiance. Voici des profils qui montrent la collaboration entre guides et voyageurs.',
        loginTraveler: 'Connexion voyageur',
        loginGuide: 'Connexion guide',
        loginAdmin: 'Connexion admin',
        language: 'Langue',
        theme: 'Theme',
        light: 'Clair',
        dark: 'Sombre',
        system: 'Systeme',
        storyButton: 'Lire le recit',
        loginTitle: 'Connexion a Voya',
        registerTitle: 'Rejoindre Voya',
        settingsPromptTitle: 'Connexion requise',
        settingsPromptBody:
          'Veuillez vous connecter ou creer un compte pour acceder aux parametres et aux fonctions completes.',
        settingsPromptCancel: 'Annuler',
        settingsPromptLogin: 'Se connecter',
        settingsPromptSignup: 'S\'inscrire',
        servicesMenu: {
          guides: 'Guides certifies',
          security: 'Escortes de securite',
          agency: 'Soutien agence'
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Guides verifies',
            text:
              'Chaque guide passe des verifications, des references locales et une formation de parcours. Les voyageurs peuvent consulter profils et badges verifies.'
          },
          {
            key: 'security',
            title: 'Assurance securite',
            text:
              "Les trajets guides utilisent des points de controle, des contacts d'urgence et un support d'escalade."
          },
          {
            key: 'global',
            title: 'Portee globale',
            text:
              'Des grandes villes aux centres regionaux, Voya relie les voyageurs a des guides multilingues.'
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca a Nairobi',
            role: 'Voyageur',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038697/citywalk_nhorgp.jpg',
            story:
              'Luca est venu pour deux semaines et avait besoin d\'aide entre l\'aeroport, le centre de recherche et le centre-ville.',
            fullStory:
              'Luca a reserve un guide verifie avant son arrivee. Ensemble ils ont defini des itineraires surs avec des points de controle et une prise en charge securisee.'
          },
          {
            id: 'story-amarian',
            name: 'Amarian a Kigali',
            role: 'Guide',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg',
            story:
              'Amarian accompagne les visiteurs avec des parcours culturels et des briefings securite.',
            fullStory:
              'Amarian propose des routes claires, des conseils de securite et un accompagnement optionnel selon le besoin.'
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi a Entebbe',
            role: 'Responsable operations',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038719/limegreen_lpoe4g.jpg',
            story:
              'Ssebuguzi coordonne les horaires des guides et les correspondances voyageurs.',
            fullStory:
              "Il gere la verification, les disponibilites et l'assistance client pour des parcours bien organises."
          }
        ]
      },
      SW: {
        brand: 'Voya',
        services: 'Huduma',
        safety: 'Usalama',
        stories: 'Hadithi',
        settings: 'Mipangilio',
        login: 'Ingia',
        getStarted: 'Anza',
        startJourney: 'Anza safari',
        watchIntro: 'Tazama utangulizi',
        heroTitle: 'Safari salama huanza na wasaidizi walioidhinishwa.',
        heroBody:
          'Voya huunganisha wasafiri na waongoza wa ndani waliothibitishwa, walinzi wa usalama, na wataalamu wa maeneo. Panga njia yako na usafiri kwa kujiamini.',
        communityTitle: 'Hadithi za jamii',
        communityBody:
          'Safari halisi hujengwa kwa uaminifu. Hizi ni hadithi za ushirikiano kati ya waongoza na wasafiri.',
        loginTraveler: 'Ingia kama Msafiri',
        loginGuide: 'Ingia kama Mwongoza',
        loginAdmin: 'Ingia kama Admin',
        language: 'Lugha',
        theme: 'Mandhari',
        light: 'Mwanga',
        dark: 'Giza',
        system: 'Mfumo',
        storyButton: 'Soma hadithi',
        loginTitle: 'Ingia kwenye Voya',
        registerTitle: 'Jiunge na Voya',
        settingsPromptTitle: 'Ingia inahitajika',
        settingsPromptBody:
          'Tafadhali ingia au tengeneza akaunti ili kupata mipangilio na huduma zote.',
        settingsPromptCancel: 'Ghairi',
        settingsPromptLogin: 'Ingia',
        settingsPromptSignup: 'Jisajili',
        servicesMenu: {
          guides: 'Waongoza waliothibitishwa',
          security: 'Wasindikizaji wa usalama',
          agency: 'Msaada wa wakala'
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Waongoza waliothibitishwa',
            text:
              'Kila mwongoza hupitia uthibitisho wa utambulisho na mafunzo ya njia. Wasafiri wanaweza kuona wasifu na uthibitisho.'
          },
          {
            key: 'security',
            title: 'Uhakika wa usalama',
            text:
              'Njia zina ukaguzi wa mara kwa mara, mawasiliano ya dharura na msaada wa haraka.'
          },
          {
            key: 'global',
            title: 'Ufikivu wa kimataifa',
            text:
              'Kutoka miji mikubwa hadi vituo vya kikanda, Voya huunganisha wasafiri na waongoza wa lugha nyingi.'
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca Nairobi',
            role: 'Msafiri',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038705/tunnel_xe63mu.jpg',
            story:
              'Luca alihitaji msaada kati ya uwanja wa ndege, kituo cha utafiti na katikati ya jiji.',
            fullStory:
              'Luca aliweka nafasi ya mwongoza kabla ya kuwasili. Walitengeneza njia salama na vituo vya ukaguzi kwa utulivu wa safari.'
          },
          {
            id: 'story-amarian',
            name: 'Amarian Kigali',
            role: 'Mwongoza',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1776700063/main-sample.png',
            story:
              'Amarian husaidia wageni kwa mwelekeo wa jiji na taarifa za usalama.',
            fullStory:
              'Amarian hupanga njia, hutoa mwongozo wa usalama na usindikizaji wa hiari.'
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi Entebbe',
            role: 'Msimamizi wa shughuli',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg',
            story:
              'Ssebuguzi huratibu ratiba za waongoza na ulinganifu wa wasafiri.',
            fullStory:
              'Anasimamia uthibitisho, upatikanaji na msaada wa wateja ili safari ziwe salama na wazi.'
          }
        ]
      },
      DE: {
        brand: 'Voya',
        services: 'Dienste',
        safety: 'Sicherheit',
        stories: 'Geschichten',
        settings: 'Einstellungen',
        login: 'Anmelden',
        getStarted: 'Loslegen',
        startJourney: 'Reise starten',
        watchIntro: 'Demo ansehen',
        heroTitle: 'Sicher reisen mit verifizierten Begleitern.',
        heroBody:
          'Voya verbindet Reisende mit verifizierten lokalen Guides, Sicherheitspersonal und Experten vor Ort. Plane deine Route und bewege dich sicher.',
        communityTitle: 'Geschichten aus der Community',
        communityBody:
          'Echte Reisen basieren auf Vertrauen. Diese Profile zeigen die Zusammenarbeit zwischen Guides und Reisenden.',
        loginTraveler: 'Anmeldung als Reisender',
        loginGuide: 'Anmeldung als Guide',
        loginAdmin: 'Anmeldung als Admin',
        language: 'Sprache',
        theme: 'Design',
        light: 'Hell',
        dark: 'Dunkel',
        system: 'System',
        storyButton: 'Geschichte lesen',
        loginTitle: 'Anmeldung bei Voya',
        registerTitle: 'Voya beitreten',
        settingsPromptTitle: 'Anmeldung erforderlich',
        settingsPromptBody:
          'Bitte anmelden oder registrieren, um Einstellungen und alle Funktionen zu nutzen.',
        settingsPromptCancel: 'Abbrechen',
        settingsPromptLogin: 'Anmelden',
        settingsPromptSignup: 'Registrieren',
        servicesMenu: {
          guides: 'Zertifizierte Guides',
          security: 'Sicherheitsbegleitung',
          agency: 'Agentur Support'
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Verifizierte Guides',
            text:
              'Jeder Guide durchlaeuft Identitaetspruefung, lokale Referenzen und Routentraining.'
          },
          {
            key: 'security',
            title: 'Sicherheitsgarantie',
            text:
              'Gefuehrte Routen nutzen Check-ins, Notfallkontakte und Eskalationssupport.'
          },
          {
            key: 'global',
            title: 'Globale Reichweite',
            text:
              'Von Grossstaedten bis regionalen Zentren verbindet Voya Reisende mit mehrsprachigen Guides.'
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca in Nairobi',
            role: 'Reisender',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038705/tunnel_xe63mu.jpg',
            story:
              'Luca brauchte Hilfe zwischen Flughafen, Forschungszentrum und Innenstadt.',
            fullStory:
              'Luca buchte vorab einen verifizierten Guide. Gemeinsam planten sie sichere Routen mit klaren Treffpunkten.'
          },
          {
            id: 'story-amarian',
            name: 'Amarian in Kigali',
            role: 'Guide',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038707/culture_vervsz.jpg',
            story:
              'Amarian begleitet Besucher mit Orientierung, Museumsrouten und Sicherheitsbriefings.',
            fullStory:
              'Amarian erstellt Routen, gibt Sicherheitshinweise und bietet optionalen Begleitschutz.'
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi in Entebbe',
            role: 'Operations Lead',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038711/direction_hct2vs.jpg',
            story:
              'Ssebuguzi koordiniert Guide-Zeiten und sorgt fuer passende Zuordnung.',
            fullStory:
              'Er steuert Verifizierung, Verfuegbarkeit und Support fuer klare Ablaufe.'
          }
        ]
      },
      RU: {
        brand: 'Voya',
        services: 'Uslugi',
        safety: 'Bezopasnost',
        stories: 'Istorii',
        settings: 'Nastroiki',
        login: 'Vkhod',
        getStarted: 'Nachat',
        startJourney: 'Nachat puteshestvie',
        watchIntro: 'Smotret demo',
        heroTitle: 'Bezopasnoe puteshestvie s proverenymi sputnikami.',
        heroBody:
          'Voya svyazyvaet puteshestvennikov s proverenymi lokalnymi gidami, okhranoi i ekspertami. Planiroyte marshrut i dvigaytes uverenno.',
        communityTitle: 'Istorii soobshchestva',
        communityBody:
          'Nastoyashchie puteshestviya stroiatsya na doverii. Eti profili pokazyvayut sotrudnichestvo gidov i puteshestvennikov.',
        loginTraveler: 'Vkhod dlya puteshestvennika',
        loginGuide: 'Vkhod dlya gida',
        loginAdmin: 'Vkhod dlya admina',
        language: 'Yazyk',
        theme: 'Tema',
        light: 'Svetlaya',
        dark: 'Temnaya',
        system: 'Sistema',
        storyButton: 'Chitat istoriyu',
        loginTitle: 'Vkhod v Voya',
        registerTitle: 'Registratsiya v Voya',
        settingsPromptTitle: 'Nuzhen vkhod',
        settingsPromptBody:
          'Pozhaluista, voiti ili sozdat akkaunt dlya dostupa k nastroikam i funktsiyam.',
        settingsPromptCancel: 'Otmena',
        settingsPromptLogin: 'Vkhod',
        settingsPromptSignup: 'Registratsiya',
        servicesMenu: {
          guides: 'Proverennye gidy',
          security: 'Okhrana',
          agency: 'Podderzhka agentstva'
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Proverennye gidy',
            text:
              'Kazhdyi gid prokhodit proverku dokumentov, rekomendatsii i obuchenie marshrutam.'
          },
          {
            key: 'security',
            title: 'Bezopasnost',
            text: 'Marshruty imeyut check-in, ekstrennye kontakty i podderzhku.'
          },
          {
            key: 'global',
            title: 'Globalnaya set',
            text:
              'Voya svyazyvaet puteshestvennikov s mnogoyazychnymi gidami v raznykh gorodakh.'
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca v Nairobi',
            role: 'Puteshestvennik',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038707/culture_vervsz.jpg',
            story:
              'Luca nuzhdalsya v pomoshchi mezhdu aeroportom, tsentrom issledovanii i gorodom.',
            fullStory:
              'Luca zaraneye zabroniroval gida. Oni sostavili bezopasnye marshruty i tochki vstrechi.'
          },
          {
            id: 'story-amarian',
            name: 'Amarian v Kigali',
            role: 'Gid',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg',
            story: 'Amarian pomogaet gostyam s orientatsiei i bezopasnostyu.',
            fullStory:
              'Amarian proektiroval marshrut, podgotovil instruktazh i po zhelaniyu soprovozhdaet.'
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi v Entebbe',
            role: 'Operatsii',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038729/love_p4ccf5.jpg',
            story:
              'Ssebuguzi koordiniruet grafiki gidov i podbiraet podkhodyashchie sootvetstviya.',
            fullStory: 'On upravlyaet proverkami, dostupnostyu i podderzhkoi klientov.'
          }
        ]
      },
      ZH: {
        brand: 'Voya',
        services: 'Fu wu',
        safety: 'An quan',
        stories: 'Gu shi',
        settings: 'She zhi',
        login: 'Deng lu',
        getStarted: 'Kai shi',
        startJourney: 'Kai shi lu cheng',
        watchIntro: 'Guan kan yan shi',
        heroTitle: 'An quan lv xing cong yan zheng huo ban kai shi.',
        heroBody:
          'Voya lian jie lv ke yu yi yan zheng de ben di dao you, an bao he mu di di zhuan jia. Gui hua lu xian, an xin chu xing.',
        communityTitle: 'She qu gu shi',
        communityBody:
          'Zhen shi lv xing jian li zai xin ren shang. Zhe xie jian jie xian shi dao you he lv ke de he zuo.',
        loginTraveler: 'Lv ke deng lu',
        loginGuide: 'Dao you deng lu',
        loginAdmin: 'Guan li deng lu',
        language: 'Yu yan',
        theme: 'Zhu ti',
        light: 'Liang se',
        dark: 'An se',
        system: 'Xi tong',
        storyButton: 'Yue du gu shi',
        loginTitle: 'Deng lu Voya',
        registerTitle: 'Jia ru Voya',
        settingsPromptTitle: 'Xu yao deng lu',
        settingsPromptBody:
          'Qing deng lu huo zhu ce yi fang wen she zhi he wan zheng gong neng.',
        settingsPromptCancel: 'Qu xiao',
        settingsPromptLogin: 'Deng lu',
        settingsPromptSignup: 'Zhu ce',
        servicesMenu: {
          guides: 'Ren zheng dao you',
          security: 'An bao pei tong',
          agency: 'Ji gou zhi chi'
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Ren zheng dao you',
            text:
              'Mei wei dao you dou yao tong guo shen fen he lu xian xun lian. lv ke ke yi cha kan zi liao.'
          },
          {
            key: 'security',
            title: 'An quan bao zhang',
            text: 'Lu xian you jian cha, jin ji lian luo he zhi yuan.'
          },
          {
            key: 'global',
            title: 'Quan qiu fu gai',
            text: 'Voya lian jie bu tong cheng shi de duo yu yan dao you.'
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca zai Nairobi',
            role: 'Lv ke',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038705/tunnel_xe63mu.jpg',
            story:
              'Luca xu yao zai ji chang, yan jiu zhong xin he shi qu zhi jian an quan chu xing.',
            fullStory: 'Luca ti qian yu ding dao you, yi qi she ji an quan lu xian he jian cha dian.'
          },
          {
            id: 'story-amarian',
            name: 'Amarian zai Kigali',
            role: 'Dao you',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg',
            story: 'Amarian ti gong cheng shi dao lan he an quan jian jie.',
            fullStory: 'Amarian gen ju xu qiu ding zhi lu xian bing ti gong an quan jian yi.'
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi zai Entebbe',
            role: 'Yun ying',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038729/love_p4ccf5.jpg',
            story: 'Ssebuguzi fu ze pai ban, he shi pei pei dui.',
            fullStory: 'Ta guan li ren zheng, ke yong xing he ke fu zhi chi.'
          }
        ]
      },
      KO: {
        brand: 'Voya',
        services: 'Seobiseu',
        safety: 'Anjeon',
        stories: 'Iyagi',
        settings: 'Seoljeong',
        login: 'Login',
        getStarted: 'Sijak',
        startJourney: 'Yeohaeng sijak',
        watchIntro: 'Demo bogi',
        heroTitle: 'Anjeonhan yeohaeng-eun geomyoon hoeowonbuteo sijak.',
        heroBody:
          'Voya-neun geomyoonhan hyeonji gaideu, boan, jeonmun gaedeul-eul yeolyeonhamnida. dongseon-eul gogyohago anjeonhage umjiguseyo.',
        communityTitle: 'Keomyuniti iyagi',
        communityBody:
          'Jinsilhan yeohaeng-eun mideumeul batan-euro hapnida. yeogi iyagi deul-eun gaideuwa yeohaenggaek-ui hyeob-eob-eul boyeojumnida.',
        loginTraveler: 'Yeohaenggaek login',
        loginGuide: 'Gaideu login',
        loginAdmin: 'Admin login',
        language: 'Eoneo',
        theme: 'Tema',
        light: 'Balgeun',
        dark: 'Eoduun',
        system: 'Siseutem',
        storyButton: 'Iyagi ilgi',
        loginTitle: 'Voya login',
        registerTitle: 'Voya gaib',
        settingsPromptTitle: 'Login pil-yo',
        settingsPromptBody:
          'Seoljeong-eul sayongharyeomyeon login ttoneun gaibhae juseyo.',
        settingsPromptCancel: 'Chwiso',
        settingsPromptLogin: 'Login',
        settingsPromptSignup: 'Gaib',
        servicesMenu: {
          guides: 'Geomyun gaideu',
          security: 'Boan donghaeng',
          agency: 'Agency jiwon'
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Geomyun gaideu',
            text: 'Gaideu-neun sinbun haksin-gwa route training-eul gechibnida.'
          },
          {
            key: 'security',
            title: 'Anjeon bojang',
            text: 'Chek-in, emergency contact, support ga itseumnida.'
          },
          {
            key: 'global',
            title: 'Jeonse gyeolseong',
            text: 'Voya-neun yeoreo dosi-ui daeyangeo gaideu-reul yeolyeonhamnida.'
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca Nairobi',
            role: 'Yeohaenggaek',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038705/tunnel_xe63mu.jpg',
            story:
              'Luca-neun gonghang-gwa yeongu center, downtowneul anjeonhage idonghaeya haessseumnida.',
            fullStory:
              'Luca-neun gaideureul miri yeyak하고 anjeon routewa meeting pointreul jeonghaessseumnida.'
          },
          {
            id: 'story-amarian',
            name: 'Amarian Kigali',
            role: 'Gaideu',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg',
            story: 'Amarian-eun city orientation-gwa safety briefing-eul 제공합니다.',
            fullStory: 'Amarian-eun needs assessment hu routewa safety guidereul 제공합니다.'
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi Entebbe',
            role: 'Operations',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038729/love_p4ccf5.jpg',
            story: 'Ssebuguzi-neun schedule-gwa matching-eul gwanrihamnida.',
            fullStory: 'Geomyun, availability, supportreul chegyehwareum니다.'
          }
        ]
      },
      LG: {
        brand: 'Voya',
        services: 'Obuweereza',
        safety: 'Obukuumi',
        stories: 'Emboozi',
        settings: 'Enteekateeka',
        login: 'Yingira',
        getStarted: 'Tandika',
        startJourney: 'Tandika olugendo',
        watchIntro: 'Laba okwanjula',
        heroTitle: 'Olugendo olwa bulungi lutandika n’abayambi abakakasiddwa.',
        heroBody:
          'Voya ekwasaganya abatambuze n’abalagirizi ab’omu kitundu abakakasiddwa, abakuumi n’abakugu b’ebifo. Teeka olugendo lwo mu nteekateeka era tambula n’obwesige.',
        communityTitle: 'Emboozi z’abantu',
        communityBody:
          'Enkola ennungi etambulira ku kwesiga. Emboozi zino z’oleka enkolagana wakati w’abalagirizi n’abatambuze.',
        loginTraveler: 'Yingira nga mutambuze',
        loginGuide: 'Yingira nga mulagirizi',
        loginAdmin: 'Yingira nga admin',
        language: 'Olulimi',
        theme: 'Mukolo',
        light: 'Kkakadde',
        dark: 'Ekizikiza',
        system: 'Sisitemu',
        storyButton: 'Soma emboozi',
        loginTitle: 'Yingira ku Voya',
        registerTitle: 'Weeyunge ku Voya',
        settingsPromptTitle: 'Okuyingira kwetaagisa',
        settingsPromptBody:
          "Yingira oba weeyunge okufuna enteekateeka n'ebyo okukozesa ebijjuvu.",
        settingsPromptCancel: 'Sazamu',
        settingsPromptLogin: 'Yingira',
        settingsPromptSignup: 'Weeyunge',
        servicesMenu: {
          guides: 'Abalagirizi abakakasiddwa',
          security: 'Abakuumi',
          agency: "Obuyambi bw'ekitongole"
        },
        safetyItems: [
          {
            key: 'guides',
            title: 'Abalagirizi abakakasiddwa',
            text: "Buli mulagirizi ayita mu kukakasa endagaano n'okutendekebwa ku makubo."
          },
          {
            key: 'security',
            title: "Obukuumi obw'okukakasa",
            text:
              "Amakubo gakulizibwa n'okukebera, obukozesa bw'amasimu n'okuyambibwa mu bwangu."
          },
          {
            key: 'global',
            title: 'Okutuuka ku nsi yonna',
            text:
              "Voya ekwasaganya abatambuze n'abalagirizi abatulugunyiziddwa mu bibuga bingi."
          }
        ],
        storyCards: [
          {
            id: 'story-luca',
            name: 'Luca Nairobi',
            role: 'Mutambuze',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038707/culture_vervsz.jpg',
            story:
              "Luca yetaaga obuyambi wakati w'enyonyi, ekifo ky'okunoonyereza n'ekibuga.",
            fullStory:
              "Luca yakola booking ey'omulagirizi nga tanatuka, ne bateekateeka amakubo amalungi n'ebifo eby'okusisinkana."
          },
          {
            id: 'story-amarian',
            name: 'Amarian Kigali',
            role: 'Mulagirizi',
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg',
            story: "Amarian ayamba abagenyi okutegeera ekibuga n'okuteekebwa mu bukuumi.",
            fullStory:
              "Amarian atonda ekkubo, atwala okutegeezebwa ku bukuumi era n'okuyambibwa nga kyetagisa."
          },
          {
            id: 'story-ssebuguzi',
            name: 'Ssebuguzi Entebbe',
            role: "Omukulembeze w'emirimu",
            image:
              'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038729/love_p4ccf5.jpg',
            story:
              "Ssebuguzi atereeza ennyiriri n'okukwataganya abatambuze n'abalagirizi.",
            fullStory: "Alabirira okukakasa, okuboneka n'okuyambibwa kw'abakiliya."
          }
        ]
      }
    }),
    []
  );

  const t = translations[language] || translations.EN;
  const safetyItems = t.safetyItems || translations.EN.safetyItems;
  const storyCards = t.storyCards || translations.EN.storyCards;

  // Fetch user location and load hero images
  useEffect(() => {
    const fetchLocationAndImages = async () => {
      try {
        setLoadingImages(true);
        const city = userLocation || 'Global';

        // Fetch images from backend API
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        const imagesResponse = await axios.get(`${backendUrl}/api/media/trending?location=${encodeURIComponent(city)}`);
        
        if (imagesResponse.data && imagesResponse.data.success) {
          setHeroImages(imagesResponse.data.data);
        } else {
          // Fallback to default images if API fails
          setHeroImages([
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038685/app_nxb8oj.jpg',
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038705/tunnel_xe63mu.jpg',
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038707/culture_vervsz.jpg',
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038700/sweetlife_mt8n1j.jpg'
          ]);
        }
      } catch (error) {
        console.error('Error fetching hero images:', error);
        // Fallback to default images
        setHeroImages([
          'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038685/app_nxb8oj.jpg',
          'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038700/sweetlife_mt8n1j.jpg',
          'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038701/nightime_ncsyza.jpg',
          'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg'
        ]);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchLocationAndImages();
  }, []);

  useEffect(() => {
    if (initialAuthMode) {
      setAuthMode(initialAuthMode);
    }
  }, [initialAuthMode]);

  useEffect(() => {
    const body = document.body;
    if (authMode) {
      body.classList.add('auth-modal-open');
    } else {
      body.classList.remove('auth-modal-open');
    }

    return () => {
      body.classList.remove('auth-modal-open');
    };
  }, [authMode]);

  return (
    <Box>
      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(14px)',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,20,28,0.9)' : 'rgba(255,255,255,0.85)',
          borderBottom: 1,
          borderColor: 'divider'
        })}
      >
        <Container maxWidth="lg" sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
            {t.brand}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button endIcon={<ExpandMore />} onClick={(e) => setAnchorEl(e.currentTarget)}>
              {t.services}
            </Button>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/guides?service=guides');
                }}
              >
                {t.servicesMenu.guides}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/guides?service=security');
                }}
              >
                {t.servicesMenu.security}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/guides?service=agency');
                }}
              >
                {t.servicesMenu.agency}
              </MenuItem>
            </Menu>
            <Button href="#safety">{t.safety}</Button>
            <Button href="#stories">{t.stories}</Button>
            <Button onClick={handleSettingsClick}>{t.settings}</Button>
            {user ? (
              <Button variant="contained" onClick={() => navigate('/')}>
                Dashboard
              </Button>
            ) : (
              <Button variant="outlined" onClick={(e) => setLoginMenuEl(e.currentTarget)} endIcon={<ExpandMore />}>
                {t.login}
              </Button>
            )}
            <Menu anchorEl={loginMenuEl} open={Boolean(loginMenuEl)} onClose={() => setLoginMenuEl(null)}>
              <MenuItem
                onClick={() => {
                  setLoginMenuEl(null);
                  setAuthRole('walkee');
                  handleOpenAuth('login');
                }}
              >
                {t.loginTraveler}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setLoginMenuEl(null);
                  setAuthRole('walker');
                  handleOpenAuth('login');
                }}
              >
                {t.loginGuide}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setLoginMenuEl(null);
                  setAuthRole('admin');
                  handleOpenAuth('login');
                }}
              >
                {t.loginAdmin}
              </MenuItem>
            </Menu>
            <Button variant="outlined" onClick={(e) => setThemeMenuEl(e.currentTarget)} endIcon={<ExpandMore />}>
              {t.theme}: {t[themeMode] || themeMode}
            </Button>
            <Menu anchorEl={themeMenuEl} open={Boolean(themeMenuEl)} onClose={() => setThemeMenuEl(null)}>
              <MenuItem
                onClick={() => {
                  setThemeMode('light');
                  setThemeMenuEl(null);
                }}
              >
                {t.light}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setThemeMode('dark');
                  setThemeMenuEl(null);
                }}
              >
                {t.dark}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setThemeMode('system');
                  setThemeMenuEl(null);
                }}
              >
                {t.system}
              </MenuItem>
            </Menu>
            <Button variant="outlined" onClick={(e) => setLangMenuEl(e.currentTarget)} endIcon={<ExpandMore />}>
              {t.language}: {language}
            </Button>
            <Menu anchorEl={langMenuEl} open={Boolean(langMenuEl)} onClose={() => setLangMenuEl(null)}>
              {['EN', 'FR', 'DE', 'ES', 'RU', 'ZH', 'KO', 'SW', 'LG'].map((lang) => (
                <MenuItem
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setLangMenuEl(null);
                  }}
                >
                  {lang}
                </MenuItem>
              ))}
            </Menu>
            {!user && (
              <Button variant="contained" onClick={() => handleOpenAuth('register')}>
                {t.getStarted}
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h2" sx={{ mb: 2 }}>
              {t.heroTitle}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {t.heroBody}
            </Typography>
            {userLocation && (
              <Typography variant="caption" color="primary" sx={{ mb: 2, display: 'block' }}>
                Showing images from {userLocation}
              </Typography>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => handleOpenAuth('register')}
              >
                {t.startJourney}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PlayCircleFilled />}
                onClick={() => window.open('https://www.youtube.com/watch?v=-8HDE-n8rMs', '_blank', 'noreferrer')}
              >
                {t.watchIntro}
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            {loadingImages ? (
              <Skeleton
                variant="rectangular"
                sx={{
                  height: { xs: 260, md: 340 },
                  borderRadius: 4,
                  bgcolor: themeMode === 'dark' ? 'grey.800' : 'grey.200'
                }}
              />
            ) : (
              <HeroCarousel images={heroImages} autoPlay={true} interval={5000} />
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 6 }} />

        <Box id="safety" />
        <Grid container spacing={3}>
          {safetyItems.map((item) => (
            <Grid item xs={12} md={4} key={item.key || item.title}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'translateY(-6px)' }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 1.2, borderRadius: 2 }}>
                      {item.key === 'guides' && <VerifiedUser />}
                      {item.key === 'security' && <Shield />}
                      {item.key === 'global' && <Public />}
                    </Box>
                    <Typography variant="h6">{item.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 4 }}>
          {[
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038701/nightime_ncsyza.jpg',
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038717/green_2_uiujge.jpg',
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038720/escort_k6bwed.jpg',
            'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038703/lover_iswrrb.jpg'
          ].map((img) => (
            <Grid item xs={12} md={6} key={img}>
              <Box
                component="img"
                src={img}
                alt="Voya walking scene"
                sx={{
                  height: 240,
                  width: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  borderRadius: 3,
                  boxShadow: 'var(--shadow-soft)',
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.02)' }
                }}
              />
            </Grid>
          ))}
        </Grid>

        <Box
          sx={(theme) => ({
            mt: 6,
            p: 4,
            borderRadius: 4,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(21,28,38,0.9)' : 'background.paper',
            boxShadow: 'var(--shadow-soft)'
          })}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {t.communityTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.communityBody}
              </Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={1}>
                {storyCards.map((story) => (
                  <Button
                    key={story.id}
                    variant="outlined"
                    startIcon={<Groups />}
                    onClick={() => {
                      setActiveStory(story);
                      setStoryDialogOpen(true);
                    }}
                  >
                    {story.name}
                  </Button>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <Box id="stories" sx={{ mt: 5 }}>
          <Grid container spacing={3}>
            {storyCards.map((card) => (
              <Grid item xs={12} md={4} key={card.name}>
                <Card sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
                  <Box
                    component="img"
                    src={card.image}
                    alt={card.name}
                    sx={{
                      height: 220,
                      width: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                      {card.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      {card.role}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.story}
                    </Typography>
                    <Button
                      variant="text"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => {
                        setActiveStory(card);
                        setStoryDialogOpen(true);
                      }}
                    >
                      {t.storyButton}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      <Dialog open={authMode === 'login'} onClose={handleCloseAuth} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t.loginTitle}
          <IconButton onClick={handleCloseAuth}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Login initialRole={authRole} />
        </DialogContent>
      </Dialog>

      <Dialog open={authMode === 'register'} onClose={handleCloseAuth} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t.registerTitle}
          <IconButton onClick={handleCloseAuth}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Register onClose={handleCloseAuth} />
        </DialogContent>
      </Dialog>

      <Dialog open={settingsPromptOpen} onClose={() => setSettingsPromptOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.settingsPromptTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t.settingsPromptBody}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={() => setSettingsPromptOpen(false)}>{t.settingsPromptCancel}</Button>
            <Button
              variant="outlined"
              onClick={() => {
                setSettingsPromptOpen(false);
                setAuthRole('walkee');
                handleOpenAuth('login');
              }}
            >
              {t.settingsPromptLogin}
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setSettingsPromptOpen(false);
                handleOpenAuth('register');
              }}
            >
              {t.settingsPromptSignup}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={storyDialogOpen} onClose={() => setStoryDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {activeStory?.name || t.communityTitle}
          <IconButton onClick={() => setStoryDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {activeStory && (
            <>
              <Box
                component="img"
                src={activeStory.image}
                alt={activeStory.name}
                sx={{
                  height: 220,
                  width: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  borderRadius: 2,
                  mb: 2
                }}
              />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {activeStory.role}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeStory.fullStory}
              </Typography>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Landing;
