import type { Lang } from "@/lib/i18n/translations";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LegalSection = {
  heading: string;
  /** Each entry is a paragraph. */
  body: string[];
};

export type LegalDoc = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

export type LegalDocId = "terms" | "privacy";

// Shown on every page (kept here so all three languages share one source date).
const LAST_UPDATED = "31/05/2026";

// ── Terms of Service ──────────────────────────────────────────────────────────

const terms: Record<Lang, LegalDoc> = {
  ar: {
    title: "شروط الاستخدام",
    lastUpdated: LAST_UPDATED,
    intro:
      "مرحباً بك في منصة «شوف خدمتي». باستخدامك للمنصة أو التسجيل فيها، فإنك تقرّ بأنك قرأت هذه الشروط وفهمتها ووافقت على الالتزام بها بالكامل. إذا كنت لا توافق على أي بند منها، فيرجى عدم استخدام المنصة.",
    sections: [
      {
        heading: "1. طبيعة المنصة — بند الوسيط",
        body: [
          "منصة «شوف خدمتي» هي مساحة إلكترونية تجمع بين مقدّمي الخدمات (الحرفيين) وطالبيها (الزبائن). المنصة لا توظّف الحرفيين، ولا تقدّم الخدمات بنفسها، وتُعتبر مجرد وسيط تقني.",
          "وبالتالي، لا تتحمّل المنصة أي مسؤولية عن جودة الأعمال، أو سلوك الحرفيين، أو أي أضرار مادية أو معنوية قد تنتج عن التعامل بين الطرفين.",
        ],
      },
      {
        heading: "2. التحقق من الهوية والخبرة",
        body: [
          "تقع مسؤولية التحقق من هوية، وأمانة، وخبرة الحرفي على عاتق الزبون وحده قبل الاتفاق معه والموافقة على العمل. كما تقع على الحرفي مسؤولية التأكد من جدية الزبون.",
          "المنصة لا تقدّم أي ضمانات خلف أي مستخدم، ولا تتحقق من الشهادات أو الرخص أو المؤهلات المهنية لمقدّمي الخدمات.",
        ],
      },
      {
        heading: "3. الأسعار والتسعير والدفع",
        body: [
          "أي اتفاق حول السعر، أو مدة التنفيذ، أو شروط الدفع يتم مباشرةً بين الحرفي والزبون. المنصة لا تتدخّل في هذه الاتفاقيات ولا تضمن تحصيل الأموال لأي طرف.",
          "اشتراك الحرفي الشهري المدفوع للمنصة يخصّ الوصول إلى ميزات المنصة فقط، وهو منفصل تماماً عن أي مبالغ تُدفع مقابل الخدمات الحرفية بين المستخدمين.",
        ],
      },
      {
        heading: "4. مسؤوليات المستخدم وسلوكه",
        body: [
          "يلتزم كل مستخدم بتقديم معلومات صحيحة، وباحترام القوانين المعمول بها، وبعدم نشر أي محتوى مخالف أو مسيء أو احتيالي أو ينتهك حقوق الغير.",
          "يُمنع استخدام المنصة لأي غرض غير مشروع، أو للتحايل، أو لإزعاج المستخدمين الآخرين. تحتفظ المنصة بحق تعليق أو إنهاء أي حساب يخالف هذه الشروط دون إشعار مسبق.",
        ],
      },
      {
        heading: "5. المحتوى والملكية الفكرية",
        body: [
          "يحتفظ كل مستخدم بملكية المحتوى الذي ينشره، لكنه يمنح المنصة ترخيصاً غير حصري لعرض هذا المحتوى داخل المنصة لأغراض تشغيلها.",
          "يتحمّل المستخدم وحده مسؤولية امتلاكه للحقوق اللازمة لأي صور أو فيديوهات أو نصوص ينشرها.",
        ],
      },
      {
        heading: "6. حدود المسؤولية",
        body: [
          "تُقدَّم المنصة «كما هي» دون أي ضمانات صريحة أو ضمنية. لا تضمن المنصة استمرارية الخدمة دون انقطاع أو خلوّها من الأخطاء.",
          "في جميع الأحوال، تقتصر مسؤولية المنصة — إن وُجدت — على ما يسمح به القانون، ولا تشمل أي أضرار غير مباشرة أو تبعية ناتجة عن التعامل بين المستخدمين.",
        ],
      },
      {
        heading: "7. تعديل الشروط",
        body: [
          "يجوز للمنصة تحديث هذه الشروط من وقت لآخر. يُعدّ استمرارك في استخدام المنصة بعد نشر التعديلات موافقةً ضمنية عليها.",
        ],
      },
      {
        heading: "8. القانون المطبَّق والتواصل",
        body: [
          "تخضع هذه الشروط للقوانين المعمول بها في المملكة المغربية. لأي استفسار حول هذه الشروط يمكنك التواصل معنا عبر قنوات الدعم داخل المنصة.",
        ],
      },
    ],
  },

  fr: {
    title: "Conditions d’utilisation",
    lastUpdated: LAST_UPDATED,
    intro:
      "Bienvenue sur la plateforme « Chof Khdemti ». En utilisant la plateforme ou en vous y inscrivant, vous reconnaissez avoir lu, compris et accepté pleinement les présentes conditions. Si vous n’acceptez pas l’une de ces clauses, veuillez ne pas utiliser la plateforme.",
    sections: [
      {
        heading: "1. Nature de la plateforme — clause d’intermédiaire",
        body: [
          "La plateforme « Chof Khdemti » est un espace en ligne qui met en relation des prestataires de services (artisans) et des demandeurs (clients). La plateforme n’emploie pas les artisans, ne fournit pas les services elle-même et est considérée comme un simple intermédiaire technique.",
          "Par conséquent, la plateforme n’assume aucune responsabilité quant à la qualité des travaux, au comportement des artisans, ou à tout dommage matériel ou moral pouvant résulter des échanges entre les parties.",
        ],
      },
      {
        heading: "2. Vérification de l’identité et de l’expérience",
        body: [
          "Il incombe au client seul de vérifier l’identité, l’honnêteté et l’expérience de l’artisan avant tout accord et avant d’approuver un travail. Il incombe également à l’artisan de s’assurer du sérieux du client.",
          "La plateforme n’offre aucune garantie sur les utilisateurs et ne vérifie pas les diplômes, licences ou qualifications professionnelles des prestataires.",
        ],
      },
      {
        heading: "3. Prix, tarification et paiement",
        body: [
          "Tout accord sur le prix, les délais d’exécution ou les modalités de paiement se conclut directement entre l’artisan et le client. La plateforme n’intervient pas dans ces accords et ne garantit le recouvrement d’aucune somme à aucune partie.",
          "L’abonnement mensuel payant de l’artisan concerne uniquement l’accès aux fonctionnalités de la plateforme ; il est totalement distinct des sommes échangées entre utilisateurs pour des prestations.",
        ],
      },
      {
        heading: "4. Responsabilités et conduite de l’utilisateur",
        body: [
          "Chaque utilisateur s’engage à fournir des informations exactes, à respecter les lois en vigueur et à ne publier aucun contenu illégal, offensant, frauduleux ou portant atteinte aux droits d’autrui.",
          "Toute utilisation à des fins illicites est interdite. La plateforme se réserve le droit de suspendre ou de résilier tout compte enfreignant les présentes conditions, sans préavis.",
        ],
      },
      {
        heading: "5. Contenu et propriété intellectuelle",
        body: [
          "Chaque utilisateur conserve la propriété du contenu qu’il publie, mais accorde à la plateforme une licence non exclusive d’affichage de ce contenu dans le cadre de son fonctionnement.",
          "L’utilisateur est seul responsable de détenir les droits nécessaires sur les images, vidéos ou textes qu’il publie.",
        ],
      },
      {
        heading: "6. Limitation de responsabilité",
        body: [
          "La plateforme est fournie « telle quelle », sans garantie expresse ou implicite, et ne garantit pas un service continu ou exempt d’erreurs.",
          "En tout état de cause, la responsabilité de la plateforme se limite à ce que permet la loi et n’inclut aucun dommage indirect résultant des échanges entre utilisateurs.",
        ],
      },
      {
        heading: "7. Modification des conditions",
        body: [
          "La plateforme peut mettre à jour les présentes conditions de temps à autre. La poursuite de votre utilisation après publication des modifications vaut acceptation tacite de celles-ci.",
        ],
      },
      {
        heading: "8. Droit applicable et contact",
        body: [
          "Les présentes conditions sont régies par le droit en vigueur au Royaume du Maroc. Pour toute question, vous pouvez nous contacter via les canaux d’assistance de la plateforme.",
        ],
      },
    ],
  },

  en: {
    title: "Terms of Use",
    lastUpdated: LAST_UPDATED,
    intro:
      "Welcome to the “Chof Khdemti” platform. By using or registering on the platform, you acknowledge that you have read, understood, and fully agreed to these terms. If you do not agree with any clause, please do not use the platform.",
    sections: [
      {
        heading: "1. Nature of the Platform — Intermediary Clause",
        body: [
          "The “Chof Khdemti” platform is an online space that connects service providers (artisans) with those seeking services (customers). The platform does not employ artisans, does not provide the services itself, and is considered a purely technical intermediary.",
          "Accordingly, the platform bears no responsibility whatsoever for the quality of work, the conduct of artisans, or any material or moral damages that may arise from dealings between the parties.",
        ],
      },
      {
        heading: "2. Identity and Experience Verification",
        body: [
          "It is the sole responsibility of the customer to verify the identity, honesty, and experience of the artisan before reaching any agreement and approving work. It is likewise the artisan’s responsibility to confirm the customer’s seriousness.",
          "The platform provides no guarantees regarding any user and does not verify the certificates, licenses, or professional qualifications of service providers.",
        ],
      },
      {
        heading: "3. Prices, Pricing, and Payment",
        body: [
          "Any agreement on price, execution time, or payment terms is made directly between the artisan and the customer. The platform does not intervene in these agreements and does not guarantee the collection of any funds for any party.",
          "The artisan’s paid monthly subscription concerns access to platform features only, and is entirely separate from any amounts paid between users for craft services.",
        ],
      },
      {
        heading: "4. User Responsibilities and Conduct",
        body: [
          "Each user undertakes to provide accurate information, to respect applicable laws, and not to publish any unlawful, offensive, fraudulent content, or content that infringes the rights of others.",
          "Using the platform for any unlawful purpose is prohibited. The platform reserves the right to suspend or terminate any account that violates these terms, without prior notice.",
        ],
      },
      {
        heading: "5. Content and Intellectual Property",
        body: [
          "Each user retains ownership of the content they publish but grants the platform a non-exclusive license to display that content within the platform for operational purposes.",
          "The user is solely responsible for holding the necessary rights to any images, videos, or text they publish.",
        ],
      },
      {
        heading: "6. Limitation of Liability",
        body: [
          "The platform is provided “as is,” without any express or implied warranties, and does not guarantee uninterrupted or error-free service.",
          "In all cases, the platform’s liability — if any — is limited to what the law permits and does not include any indirect or consequential damages arising from dealings between users.",
        ],
      },
      {
        heading: "7. Changes to These Terms",
        body: [
          "The platform may update these terms from time to time. Your continued use of the platform after changes are posted constitutes implied acceptance of them.",
        ],
      },
      {
        heading: "8. Governing Law and Contact",
        body: [
          "These terms are governed by the laws in force in the Kingdom of Morocco. For any question regarding these terms, you may contact us through the in-platform support channels.",
        ],
      },
    ],
  },
};

// ── Privacy Policy ────────────────────────────────────────────────────────────

const privacy: Record<Lang, LegalDoc> = {
  ar: {
    title: "سياسة الخصوصية",
    lastUpdated: LAST_UPDATED,
    intro:
      "تشرح هذه السياسة كيف تجمع منصة «شوف خدمتي» بياناتك وتستخدمها وتحميها. خصوصيتك تهمّنا، ونلتزم بالتعامل مع بياناتك بشفافية ومسؤولية.",
    sections: [
      {
        heading: "1. البيانات التي نجمعها",
        body: [
          "البيانات التي تزوّدنا بها مباشرةً: الاسم، اسم المستخدم، البريد الإلكتروني، نوع الحساب، ومعلومات الملف الشخصي (المدينة، التخصص، النبذة، الصور).",
          "البيانات الناتجة عن استخدامك: المنشورات، التعليقات، الرسائل، التقييمات، والمتابعات.",
        ],
      },
      {
        heading: "2. كيفية استخدام البيانات",
        body: [
          "نستخدم بياناتك لتشغيل المنصة وتقديم خدماتها: إنشاء حسابك، عرض ملفك الشخصي، تمكين التواصل بين المستخدمين، وتحسين تجربة الاستخدام.",
          "لا نبيع بياناتك الشخصية لأي طرف ثالث.",
        ],
      },
      {
        heading: "3. المشاركة مع مزوّدي الخدمات",
        body: [
          "نعتمد على مزوّدين موثوقين لتشغيل المنصة: Supabase لاستضافة قاعدة البيانات والمصادقة، وCloudinary لتخزين الوسائط، وLemon Squeezy لمعالجة مدفوعات الاشتراك.",
          "تُعالَج بياناتك لدى هؤلاء المزوّدين وفق سياسات الخصوصية الخاصة بهم، وبالقدر اللازم لتشغيل الخدمة فقط.",
        ],
      },
      {
        heading: "4. ملفات تعريف الارتباط (Cookies)",
        body: [
          "نستخدم ملفات تعريف ارتباط أساسية لإدارة جلسة الدخول وحفظ تفضيلاتك (مثل اللغة). هذه الملفات ضرورية لعمل المنصة بشكل صحيح.",
        ],
      },
      {
        heading: "5. أمان البيانات",
        body: [
          "نطبّق إجراءات أمنية تقنية وتنظيمية لحماية بياناتك، بما في ذلك التحكم بالوصول على مستوى الصفوف (RLS) والاتصال المشفّر. ومع ذلك، لا يمكن ضمان أمان تام بنسبة 100% لأي نظام عبر الإنترنت.",
        ],
      },
      {
        heading: "6. حقوقك",
        body: [
          "يحق لك الوصول إلى بياناتك وتصحيحها أو تحديثها من خلال إعدادات حسابك. كما يمكنك طلب حذف حسابك وبياناتك المرتبطة به.",
        ],
      },
      {
        heading: "7. الاحتفاظ بالبيانات",
        body: [
          "نحتفظ ببياناتك طالما كان حسابك نشطاً أو بالقدر اللازم لتقديم الخدمة والالتزام بالمتطلبات القانونية. عند حذف حسابك تُحذف بياناتك الشخصية وفق سياساتنا.",
        ],
      },
      {
        heading: "8. التعديلات والتواصل",
        body: [
          "قد نحدّث هذه السياسة من وقت لآخر. سننشر أي تعديلات على هذه الصفحة. لأي استفسار حول خصوصيتك، تواصل معنا عبر قنوات الدعم داخل المنصة.",
        ],
      },
    ],
  },

  fr: {
    title: "Politique de confidentialité",
    lastUpdated: LAST_UPDATED,
    intro:
      "Cette politique explique comment la plateforme « Chof Khdemti » collecte, utilise et protège vos données. Votre vie privée nous importe et nous nous engageons à traiter vos données de manière transparente et responsable.",
    sections: [
      {
        heading: "1. Données que nous collectons",
        body: [
          "Les données que vous nous fournissez directement : nom, nom d’utilisateur, e-mail, type de compte et informations de profil (ville, métier, présentation, photos).",
          "Les données issues de votre utilisation : publications, commentaires, messages, évaluations et abonnements.",
        ],
      },
      {
        heading: "2. Utilisation des données",
        body: [
          "Nous utilisons vos données pour faire fonctionner la plateforme et fournir ses services : créer votre compte, afficher votre profil, permettre la communication entre utilisateurs et améliorer l’expérience.",
          "Nous ne vendons pas vos données personnelles à des tiers.",
        ],
      },
      {
        heading: "3. Partage avec les prestataires",
        body: [
          "Nous nous appuyons sur des prestataires de confiance : Supabase pour l’hébergement de la base de données et l’authentification, Cloudinary pour le stockage des médias, et Lemon Squeezy pour le traitement des paiements d’abonnement.",
          "Vos données sont traitées par ces prestataires conformément à leurs propres politiques de confidentialité, et uniquement dans la mesure nécessaire au fonctionnement du service.",
        ],
      },
      {
        heading: "4. Cookies",
        body: [
          "Nous utilisons des cookies essentiels pour gérer votre session de connexion et enregistrer vos préférences (comme la langue). Ces cookies sont nécessaires au bon fonctionnement de la plateforme.",
        ],
      },
      {
        heading: "5. Sécurité des données",
        body: [
          "Nous appliquons des mesures de sécurité techniques et organisationnelles pour protéger vos données, y compris le contrôle d’accès au niveau des lignes (RLS) et des connexions chiffrées. Toutefois, aucune sécurité à 100 % ne peut être garantie sur Internet.",
        ],
      },
      {
        heading: "6. Vos droits",
        body: [
          "Vous avez le droit d’accéder à vos données, de les corriger ou de les mettre à jour via les paramètres de votre compte. Vous pouvez également demander la suppression de votre compte et des données associées.",
        ],
      },
      {
        heading: "7. Conservation des données",
        body: [
          "Nous conservons vos données tant que votre compte est actif ou dans la mesure nécessaire à la fourniture du service et au respect des obligations légales. À la suppression de votre compte, vos données personnelles sont effacées conformément à nos politiques.",
        ],
      },
      {
        heading: "8. Modifications et contact",
        body: [
          "Nous pouvons mettre à jour cette politique de temps à autre. Toute modification sera publiée sur cette page. Pour toute question relative à votre vie privée, contactez-nous via les canaux d’assistance de la plateforme.",
        ],
      },
    ],
  },

  en: {
    title: "Privacy Policy",
    lastUpdated: LAST_UPDATED,
    intro:
      "This policy explains how the “Chof Khdemti” platform collects, uses, and protects your data. Your privacy matters to us, and we are committed to handling your data transparently and responsibly.",
    sections: [
      {
        heading: "1. Data We Collect",
        body: [
          "Data you provide directly: name, username, email, account type, and profile information (city, craft, bio, images).",
          "Data generated by your use: posts, comments, messages, ratings, and follows.",
        ],
      },
      {
        heading: "2. How We Use Data",
        body: [
          "We use your data to operate the platform and deliver its services: creating your account, displaying your profile, enabling communication between users, and improving the experience.",
          "We do not sell your personal data to any third party.",
        ],
      },
      {
        heading: "3. Sharing with Service Providers",
        body: [
          "We rely on trusted providers to operate the platform: Supabase for database hosting and authentication, Cloudinary for media storage, and Lemon Squeezy for processing subscription payments.",
          "Your data is processed by these providers under their own privacy policies, and only to the extent necessary to operate the service.",
        ],
      },
      {
        heading: "4. Cookies",
        body: [
          "We use essential cookies to manage your login session and store your preferences (such as language). These cookies are necessary for the platform to function correctly.",
        ],
      },
      {
        heading: "5. Data Security",
        body: [
          "We apply technical and organizational security measures to protect your data, including row-level access control (RLS) and encrypted connections. However, no system over the internet can guarantee 100% security.",
        ],
      },
      {
        heading: "6. Your Rights",
        body: [
          "You have the right to access, correct, or update your data through your account settings. You may also request deletion of your account and its associated data.",
        ],
      },
      {
        heading: "7. Data Retention",
        body: [
          "We retain your data while your account is active or as needed to provide the service and comply with legal requirements. When you delete your account, your personal data is erased in accordance with our policies.",
        ],
      },
      {
        heading: "8. Changes and Contact",
        body: [
          "We may update this policy from time to time. Any changes will be posted on this page. For any question about your privacy, contact us through the in-platform support channels.",
        ],
      },
    ],
  },
};

// ── Public accessor ───────────────────────────────────────────────────────────

const DOCS: Record<LegalDocId, Record<Lang, LegalDoc>> = { terms, privacy };

export function getLegalDoc(id: LegalDocId, lang: Lang): LegalDoc {
  return DOCS[id][lang];
}
