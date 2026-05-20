-- =====================================================================
-- 0036_craft_keywords.sql — Keyword-based craft mention notifications
-- Requires 0035_add_craft_mention_type.sql to be committed first.
-- =====================================================================

-- 1. Keyword lookup table (pre-seeded, one row per keyword per craft)
create table if not exists public.craft_keywords (
  id         serial       primary key,
  craft_id   text         not null,
  keyword    text         not null,
  created_at timestamptz  not null default now(),
  unique (craft_id, keyword)
);

-- RLS: read-only public, writes via service role only
alter table public.craft_keywords enable row level security;
create policy "craft_keywords_public_read"
  on public.craft_keywords for select using (true);

-- 2. Seed keywords (Arabic + French, lowercase, craft-specific signal words)

-- carpentry
insert into public.craft_keywords (craft_id, keyword) values
  ('carpentry', 'نجار'), ('carpentry', 'نجارة'), ('carpentry', 'خزانة خشب'),
  ('carpentry', 'باب خشب'), ('carpentry', 'مطبخ خشبي'), ('carpentry', 'غرفة نوم خشب'),
  ('carpentry', 'ديكور خشبي'), ('carpentry', 'menuisier'), ('carpentry', 'menuiserie')
on conflict do nothing;

-- plumbing
insert into public.craft_keywords (craft_id, keyword) values
  ('plumbing', 'سباك'), ('plumbing', 'سباكة'), ('plumbing', 'تسريب مياه'),
  ('plumbing', 'تسرب ماء'), ('plumbing', 'صنبور'), ('plumbing', 'أنابيب ماء'),
  ('plumbing', 'تصريف مياه'), ('plumbing', 'plombier'), ('plumbing', 'plomberie'),
  ('plumbing', 'fuite d''eau')
on conflict do nothing;

-- electricity
insert into public.craft_keywords (craft_id, keyword) values
  ('electricity', 'كهربائي'), ('electricity', 'تمديدات كهربائية'), ('electricity', 'لوحة كهربائية'),
  ('electricity', 'قاطع كهربائي'), ('electricity', 'إضاءة'), ('electricity', 'تأريض'),
  ('electricity', 'électricien'), ('electricity', 'installation électrique')
on conflict do nothing;

-- painting
insert into public.craft_keywords (craft_id, keyword) values
  ('painting', 'دهان'), ('painting', 'دهانة'), ('painting', 'صبغ جدران'),
  ('painting', 'طلاء جدران'), ('painting', 'دهن سقف'), ('painting', 'peintre'),
  ('painting', 'peinture murs'), ('painting', 'ravalement')
on conflict do nothing;

-- tiling
insert into public.craft_keywords (craft_id, keyword) values
  ('tiling', 'بلاط'), ('tiling', 'بلاطة'), ('tiling', 'تبليط'),
  ('tiling', 'سيراميك'), ('tiling', 'أرضية'), ('tiling', 'رخام'),
  ('tiling', 'غرانيت'), ('tiling', 'carreleur'), ('tiling', 'carrelage')
on conflict do nothing;

-- mechanic
insert into public.craft_keywords (craft_id, keyword) values
  ('mechanic', 'ميكانيكي'), ('mechanic', 'تصليح سيارة'), ('mechanic', 'عطل سيارة'),
  ('mechanic', 'غيار زيت'), ('mechanic', 'فرامل'), ('mechanic', 'إطارات'),
  ('mechanic', 'محرك سيارة'), ('mechanic', 'mécanicien'), ('mechanic', 'réparation voiture'),
  ('mechanic', 'panne voiture')
on conflict do nothing;

-- tailoring
insert into public.craft_keywords (craft_id, keyword) values
  ('tailoring', 'خياط'), ('tailoring', 'خياطة'), ('tailoring', 'تفصيل ملابس'),
  ('tailoring', 'تعديل ملابس'), ('tailoring', 'بدلة مفصلة'), ('tailoring', 'فستان مفصل'),
  ('tailoring', 'couturier'), ('tailoring', 'couturière'), ('tailoring', 'retouche')
on conflict do nothing;

-- barber
insert into public.craft_keywords (craft_id, keyword) values
  ('barber', 'حلاق'), ('barber', 'قصة شعر رجالي'), ('barber', 'حلاقة رجال'),
  ('barber', 'لحية'), ('barber', 'تشكيل لحية'), ('barber', 'coiffeur homme'),
  ('barber', 'barbier'), ('barber', 'coupe homme')
on conflict do nothing;

-- hairdresser
insert into public.craft_keywords (craft_id, keyword) values
  ('hairdresser', 'كوافير'), ('hairdresser', 'تصفيف شعر'), ('hairdresser', 'صبغة شعر'),
  ('hairdresser', 'حلاقة نساء'), ('hairdresser', 'كيراتين'), ('hairdresser', 'بروتين شعر'),
  ('hairdresser', 'coiffeuse'), ('hairdresser', 'coloration'), ('hairdresser', 'lissage')
on conflict do nothing;

-- cooking
insert into public.craft_keywords (craft_id, keyword) values
  ('cooking', 'طباخ'), ('cooking', 'طباخة'), ('cooking', 'وليمة'), ('cooking', 'طعام حفلة'),
  ('cooking', 'أكل خارجي'), ('cooking', 'ترايتور'), ('cooking', 'cuisinier'),
  ('cooking', 'traiteur'), ('cooking', 'repas mariage')
on conflict do nothing;

-- photography
insert into public.craft_keywords (craft_id, keyword) values
  ('photography', 'مصور'), ('photography', 'تصوير'), ('photography', 'جلسة تصوير'),
  ('photography', 'تصوير حفل'), ('photography', 'تصوير زفاف'), ('photography', 'فيديو احترافي'),
  ('photography', 'photographe'), ('photography', 'shooting photo'), ('photography', 'vidéaste')
on conflict do nothing;

-- graphic-design
insert into public.craft_keywords (craft_id, keyword) values
  ('graphic-design', 'مصمم جرافيك'), ('graphic-design', 'تصميم لوغو'), ('graphic-design', 'تصميم شعار'),
  ('graphic-design', 'هوية بصرية'), ('graphic-design', 'تصميم إعلان'), ('graphic-design', 'graphiste'),
  ('graphic-design', 'logo'), ('graphic-design', 'identité visuelle')
on conflict do nothing;

-- ac-repair
insert into public.craft_keywords (craft_id, keyword) values
  ('ac-repair', 'مكيف'), ('ac-repair', 'تكييف'), ('ac-repair', 'تصليح مكيف'),
  ('ac-repair', 'صيانة مكيف'), ('ac-repair', 'تنظيف مكيف'), ('ac-repair', 'مكيف لا يبرد'),
  ('ac-repair', 'climatiseur'), ('ac-repair', 'clim en panne'), ('ac-repair', 'réparation clim')
on conflict do nothing;

-- construction
insert into public.craft_keywords (craft_id, keyword) values
  ('construction', 'مقاول بناء'), ('construction', 'بناء غرفة'), ('construction', 'بناء سور'),
  ('construction', 'إسمنت'), ('construction', 'تشييد'), ('construction', 'ترميم منزل'),
  ('construction', 'maçon'), ('construction', 'maçonnerie'), ('construction', 'rénovation')
on conflict do nothing;

-- phone-repair
insert into public.craft_keywords (craft_id, keyword) values
  ('phone-repair', 'تصليح هاتف'), ('phone-repair', 'شاشة مكسورة'), ('phone-repair', 'بطارية هاتف'),
  ('phone-repair', 'هاتف لا يشتغل'), ('phone-repair', 'آيفون تالف'), ('phone-repair', 'أندرويد عطل'),
  ('phone-repair', 'réparation téléphone'), ('phone-repair', 'écran cassé')
on conflict do nothing;

-- gardening
insert into public.craft_keywords (craft_id, keyword) values
  ('gardening', 'بستاني'), ('gardening', 'تقليم أشجار'), ('gardening', 'رش حديقة'),
  ('gardening', 'تنسيق حديقة'), ('gardening', 'زراعة نباتات'), ('gardening', 'عشب حديقة'),
  ('gardening', 'jardinier'), ('gardening', 'entretien jardin'), ('gardening', 'taille arbres')
on conflict do nothing;

-- interior-design
insert into public.craft_keywords (craft_id, keyword) values
  ('interior-design', 'ديكور منزل'), ('interior-design', 'ديكور مكتب'), ('interior-design', 'تصميم داخلي'),
  ('interior-design', 'تجديد منزل'), ('interior-design', 'ترتيب غرف'), ('interior-design', 'décorateur'),
  ('interior-design', 'aménagement intérieur'), ('interior-design', 'décoration maison')
on conflict do nothing;

-- driving
insert into public.craft_keywords (craft_id, keyword) values
  ('driving', 'سائق خاص'), ('driving', 'توصيل مطار'), ('driving', 'نقل أشخاص'),
  ('driving', 'رحلة مدينة'), ('driving', 'chauffeur privé'), ('driving', 'transport aéroport'),
  ('driving', 'vtc')
on conflict do nothing;

-- tutoring
insert into public.craft_keywords (craft_id, keyword) values
  ('tutoring', 'مدرس خصوصي'), ('tutoring', 'دروس خصوصية'), ('tutoring', 'دعم مدرسي'),
  ('tutoring', 'تقوية'), ('tutoring', 'cours particuliers'), ('tutoring', 'soutien scolaire'),
  ('tutoring', 'professeur particulier')
on conflict do nothing;

-- yard-work
insert into public.craft_keywords (craft_id, keyword) values
  ('yard-work', 'تنظيف ساحة'), ('yard-work', 'فرش ياردة'), ('yard-work', 'تبليط ساحة'),
  ('yard-work', 'تنظيف حوش'), ('yard-work', 'nettoyage cour'), ('yard-work', 'dallage')
on conflict do nothing;

-- pastry
insert into public.craft_keywords (craft_id, keyword) values
  ('pastry', 'حلواني'), ('pastry', 'تورتة'), ('pastry', 'كعكة عيد ميلاد'),
  ('pastry', 'حلويات مجلس'), ('pastry', 'حلويات عرس'), ('pastry', 'pâtissier'),
  ('pastry', 'gâteau mariage'), ('pastry', 'gâteau anniversaire')
on conflict do nothing;

-- bakery
insert into public.craft_keywords (craft_id, keyword) values
  ('bakery', 'خبّاز'), ('bakery', 'خبز طازج'), ('bakery', 'معجنات'), ('bakery', 'فطائر'),
  ('bakery', 'boulanger'), ('bakery', 'pain maison'), ('bakery', 'viennoiserie')
on conflict do nothing;

-- skincare
insert into public.craft_keywords (craft_id, keyword) values
  ('skincare', 'عناية بشرة'), ('skincare', 'تنظيف وجه'), ('skincare', 'جلسة بشرة'),
  ('skincare', 'مساج وجه'), ('skincare', 'esthéticienne'), ('skincare', 'soin du visage'),
  ('skincare', 'peeling')
on conflict do nothing;

-- childcare
insert into public.craft_keywords (craft_id, keyword) values
  ('childcare', 'مربية أطفال'), ('childcare', 'حضانة'), ('childcare', 'حراسة أطفال'),
  ('childcare', 'babysitter'), ('childcare', 'garde d''enfants'), ('childcare', 'nounou')
on conflict do nothing;

-- 3. Partial unique index to prevent duplicate craft_mention per (artisan, post)
create unique index if not exists notifications_craft_mention_unique
  on public.notifications (user_id, post_id)
  where type = 'craft_mention';

-- 4. Trigger function
create or replace function public.notify_on_craft_mention()
returns trigger language plpgsql security definer as $$
declare
  v_content text;
begin
  -- Only process posts that have text content (3+ chars)
  if new.content is null or length(trim(new.content)) < 3 then
    return new;
  end if;

  v_content := lower(new.content);

  -- For each artisan whose craft keywords appear in the post content:
  --   • Must not be the post author
  --   • Must not already have a craft_mention notification for this post
  --   • Must not have exceeded 5 craft_mention notifications in the last 24 hours (anti-spam)
  insert into public.notifications (user_id, actor_id, type, post_id)
  select distinct on (u.id)
    u.id,
    new.author_id,
    'craft_mention',
    new.id
  from   public.users         u
  join   public.profiles      pr  on pr.user_id  = u.id
  join   public.craft_keywords ck on ck.craft_id = pr.craft_category
                                 and position(ck.keyword in v_content) > 0
  where  u.account_type = 'artisan'
    and  u.id           <> new.author_id
    -- No duplicate per artisan + post
    and  not exists (
           select 1 from public.notifications nd
           where  nd.user_id = u.id
             and  nd.post_id = new.id
             and  nd.type    = 'craft_mention'
         )
    -- Anti-spam: max 5 craft_mention per artisan per 24 hours
    and  (
           select count(*) from public.notifications ns
           where  ns.user_id    = u.id
             and  ns.type       = 'craft_mention'
             and  ns.created_at > now() - interval '24 hours'
         ) < 5;

  return new;
end;
$$;

-- 5. Attach trigger to posts (after insert only — edits don't re-notify)
drop trigger if exists trg_notify_craft_mention on public.posts;
create trigger trg_notify_craft_mention
  after insert on public.posts
  for each row execute function public.notify_on_craft_mention();
