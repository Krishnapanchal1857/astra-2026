-- ASTRA 2026: update an EXISTING database to the new event list WITHOUT losing any data.
-- * Events are renamed/updated IN PLACE (same event id), so every registration, participant and payment stays attached.
-- * Nothing is deleted or truncated. Events that are no longer in the plan are only hidden (is_active=false).
-- * Safe to run more than once.
-- Run db/schema.sql FIRST (it is additive), then run this file in the Neon SQL Editor.

BEGIN;

ALTER TABLE events ADD COLUMN IF NOT EXISTS fee_per_person boolean NOT NULL DEFAULT false;

-- 1) Update existing events in place (old name -> new name and rules)
UPDATE events SET name='Mumbai Idol', category='Performing Arts', subcategory='Music', description='Showcase your singing talent through a song of your choice.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Aamcha Awaaz';
UPDATE events SET name='Dhun Unplugged', category='Performing Arts', subcategory='Music', description='Create a live acoustic musical performance as a team.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=8,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Dhun Unplugged';
UPDATE events SET name='Mumbaiya Mic Drop', category='Performing Arts', subcategory='Music', description='Express Mumbai''s street life, slang and youth culture through rap.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbaiya Mic Drop';
UPDATE events SET name='Aamchi Surmandali', category='Performing Arts', subcategory='Music', description='Bring people together through a coordinated group singing performance.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=8,
  max_substitutes=0, fee_paise=40000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Aamche Sur, Aamchi Jodi';
UPDATE events SET name='War of DJ – 90s Mehfil', category='Performing Arts', subcategory='Music', description='Recreate the musical energy of the 1990s through a DJ performance.', allow_individual=true, allow_team=true, min_team_size=1, max_team_size=2,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'War of DJ – 90s Mehfil';
UPDATE events SET name='Beat pe Bambai', category='Performing Arts', subcategory='Dance', description='Solo performers showcase their dancing skills in a style of their choice.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=20000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Moves';
UPDATE events SET name='Mumbai Groove Crew', category='Performing Arts', subcategory='Dance', description='Teams showcase their skills through a synchronised, choreographed group dance performance.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=12,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Apna Beat Battle';
UPDATE events SET name='Apsara ali', category='Performing Arts', subcategory='Dance', description='Solo performers showcase the traditional Maharashtrian dance form of Lavani.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=20000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Local – Flash Mob';
UPDATE events SET name='Gully Dance Face-Off', category='Performing Arts', subcategory='Dance', description='Dancers compete in an exciting freestyle battle, showcasing their skills through spontaneous moves.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=20000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Dance Adda';
UPDATE events SET name='Mumbai ki Kahani', category='Performing Arts', subcategory='Dance', description='Teams portray Mumbai’s social issues, everyday struggles and real-life stories through dance.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=10,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Ek Mumbai, Anek Chehre' AND subcategory = 'Dance';
UPDATE events SET name='Galli Theatre', category='Performing Arts', subcategory='Drama', description='Teams present a short play based on everyday life, relationships or incidents in Mumbai.', allow_individual=false, allow_team=true, min_team_size=5, max_team_size=12,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "synopsis", "label": "Performance title & short synopsis", "type": "textarea", "required": true}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Galli Theatre';
UPDATE events SET name='Bolti Deewarein', category='Performing Arts', subcategory='Drama', description='Teams use street theatre to highlight a social or civic issue affecting Mumbai.', allow_individual=false, allow_team=true, min_team_size=8, max_team_size=15,
  max_substitutes=0, fee_paise=20000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "synopsis", "label": "Performance title & short synopsis", "type": "textarea", "required": true}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Bolti Deewarein';
UPDATE events SET name='Mime-Bai', category='Performing Arts', subcategory='Drama', description='Teams tell a story through facial expressions and body movements without spoken dialogue.', allow_individual=false, allow_team=true, min_team_size=3, max_team_size=8,
  max_substitutes=0, fee_paise=25000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "synopsis", "label": "Performance title & short synopsis", "type": "textarea", "required": true}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mime-Bai';
UPDATE events SET name='Sabha Sanvad', category='Literary Arts', subcategory='', description='Participants debate opposing viewpoints on issues related to Mumbai.', allow_individual=false, allow_team=true, min_team_size=2, max_team_size=2,
  max_substitutes=0, fee_paise=20000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Sabha Sanvad';
UPDATE events SET name='Yuva Vaani', category='Literary Arts', subcategory='', description='Participants deliver a speech on a Mumbai-related topic given on the spot.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Yuva Vaani';
UPDATE events SET name='Bolo toh Sahi!', category='Literary Arts', subcategory='', description='Teams discuss issues affecting Mumbai’s future and suggest solutions.', allow_individual=false, allow_team=true, min_team_size=2, max_team_size=4,
  max_substitutes=0, fee_paise=30000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Vichar Vimarsh';
UPDATE events SET name='Kisse Mumbai ke', category='Literary Arts', subcategory='', description='Participants write an original piece inspired by everyday experiences in Mumbai.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Diaries';
UPDATE events SET name='Khayalon ki local', category='Literary Arts', subcategory='', description='Participants present original poetry or shayari inspired by Mumbai.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Shayari';
UPDATE events SET name='Mumbai Mastermind', category='Literary Arts', subcategory='', description='Teams compete in a quiz on Mumbai’s history, culture and landmarks.', allow_individual=false, allow_team=true, min_team_size=2, max_team_size=3,
  max_substitutes=0, fee_paise=30000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Mastermind';
UPDATE events SET name='Canvas pe Bambai', category='Fine Arts', subcategory='', description='Participants create an artwork depicting Mumbai’s landmarks, people or everyday life.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Canvas of Mumbai';
UPDATE events SET name='Pixel dhamaka', category='Fine Arts', subcategory='', description='Participants create a digital illustration or graphic artwork based on Mumbai.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Digital Mumbai';
UPDATE events SET name='Rang Mumbai Ke', category='Fine Arts', subcategory='', description='Participants create a rangoli design inspired by Mumbai’s culture and festivals.', allow_individual=true, allow_team=true, min_team_size=1, max_team_size=2,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Rang Mumbai Ke';
UPDATE events SET name='Potrait mein twist', category='Fine Arts', subcategory='', description='Participants draw humorous caricatures of famous personalities or recognisable characters associated with Mumbai.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Icons';
UPDATE events SET name='Blockbuster ka poster', category='Fine Arts', subcategory='', description='Participants design a poster for an imaginary film set in Mumbai.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai on Screen';
UPDATE events SET name='Mumbai Through My Lens', category='Tech Arts', subcategory='', description='Participants capture photographs showcasing Mumbai’s people, places and everyday life.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Through My Lens';
UPDATE events SET name='Reel bana dala', category='Tech Arts', subcategory='', description='Participants create engaging short videos based on Mumbai.', allow_individual=true, allow_team=true, min_team_size=1, max_team_size=3,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Creator Clash: Mumbai';
UPDATE events SET name='Mumbai in Motion', category='Tech Arts', subcategory='', description='Teams create a short film portraying a story or experience related to Mumbai.', allow_individual=false, allow_team=true, min_team_size=3, max_team_size=8,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai in Motion';
UPDATE events SET name='Sell it, Bambai style', category='Tech Arts', subcategory='', description='Teams create an advertisement promoting Mumbai, its culture or a Mumbai-inspired product.', allow_individual=false, allow_team=true, min_team_size=3, max_team_size=6,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai AdWorks';
UPDATE events SET name='Rink Clash (Football)', category='Sports', subcategory='', description='A fast-paced 7-a-side football showdown testing teamwork, speed and strategy.', allow_individual=false, allow_team=true, min_team_size=7, max_team_size=7,
  max_substitutes=3, fee_paise=100000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Rink Clash (Football)';
UPDATE events SET name='Gully Cricket (Box Cricket)', category='Sports', subcategory='', description='A high-energy box cricket competition inspired by Mumbai’s famous gully cricket culture.', allow_individual=false, allow_team=true, min_team_size=7, max_team_size=7,
  max_substitutes=2, fee_paise=100000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Gully Cricket (Box Cricket)';
UPDATE events SET name='Paddle Pe Charcha (Table Tennis)', category='Sports', subcategory='', description='A quick-reflex table tennis contest where precision and control determine the champion.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Paddle Pe Charcha (Table Tennis)';
UPDATE events SET name='Master Stroke (Chess)', category='Sports', subcategory='', description='A battle of strategy and foresight where every move counts.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Master Stroke (Chess)';
UPDATE events SET name='Mumbai Carrom Cup (Carrom)', category='Sports', subcategory='', description='A classic indoor contest testing accuracy, concentration and tactical play.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Carrom Cup (Carrom)';
UPDATE events SET name='Hoop Clash (Basketball)', category='Sports', subcategory='', description='An intense basketball showdown combining teamwork, speed and scoring precision.', allow_individual=false, allow_team=true, min_team_size=NULL, max_team_size=NULL,
  max_substitutes=0, fee_paise=100000, fee_per_person=false, registration_status='closed', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Hoop Clash (Basketball)';
UPDATE events SET name='Smash It Yaar (Pickleball)', category='Sports', subcategory='', description='A lively paddle-sport competition demanding agility, coordination and smart shot-making.', allow_individual=true, allow_team=true, min_team_size=1, max_team_size=2,
  max_substitutes=0, fee_paise=30000, fee_per_person=false, registration_status='closed', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Smash It Yaar (Pickleball)';
UPDATE events SET name='Aakhri khiladi', category='Gaming', subcategory='', description='BGMI players compete in an intense battle royale representing the competitive spirit of Mumbai''s youth.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=4,
  max_substitutes=0, fee_paise=60000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Mayhem';
UPDATE events SET name='Jungbaaz', category='Gaming', subcategory='', description='Teams compete in Call Of Duty matches where strategy, communication and quick reflexes determine the winner.', allow_individual=false, allow_team=true, min_team_size=5, max_team_size=5,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Warfare';
UPDATE events SET name='Goal ke sikander', category='Gaming', subcategory='', description='FC Mobile players compete to prove who can build and manage the ultimate virtual football team.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Goal';
UPDATE events SET name='Mumbai Royale', category='Gaming', subcategory='', description='Free Fire MAX players compete in a fast-paced battle royale where survival, strategy, team coordination and quick decision-making determine the winning squad.', allow_individual=false, allow_team=true, min_team_size=5, max_team_size=5,
  max_substitutes=0, fee_paise=60000, fee_per_person=false, registration_status='open', extra_fields='[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Royale';
UPDATE events SET name='Local Se Landmark', category='Fun & Games', subcategory='', description='Teams solve clues and race through a Mumbai-themed treasure hunt.', allow_individual=false, allow_team=true, min_team_size=3, max_team_size=5,
  max_substitutes=0, fee_paise=40000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Local Se Landmark';
UPDATE events SET name='Mumbai Escape', category='Fun & Games', subcategory='', description='Teams solve Mumbai-themed puzzles and challenges before time runs out.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=6,
  max_substitutes=0, fee_paise=30000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Escape';
UPDATE events SET name='Bollywood Meri Jaan Quiz', category='Fun & Games', subcategory='', description='Teams compete in a quiz on Bollywood industry knowledge', allow_individual=false, allow_team=true, min_team_size=2, max_team_size=4,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Meri Jaan Quiz';
UPDATE events SET name='Bambaiyya Charades', category='Fun & Games', subcategory='', description='Teams guess Mumbai-themed words, personalities, films and places through acting and gestures.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=6,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Bambaiyya Charades';
UPDATE events SET name='Aamchi Antakshari', category='Fun & Games', subcategory='', description='Teams compete in a music battle featuring Bollywood, Marathi and Mumbai-themed songs.', allow_individual=false, allow_team=true, min_team_size=4, max_team_size=6,
  max_substitutes=0, fee_paise=10000, fee_per_person=true, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Aamchi Antakshari';
UPDATE events SET name='Shaan -e - Mumbai', category='Informal Events', subcategory='', description='A fashion showcase celebrating Mumbai’s diverse styles, cultures and professions.', allow_individual=false, allow_team=true, min_team_size=8, max_team_size=10,
  max_substitutes=0, fee_paise=70000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Mumbai Street Style';
UPDATE events SET name='Faces of Mumbai – Mr. & Ms. ASTRA', category='Informal Events', subcategory='', description='A personality-based competition celebrating confidence, talent and intelligence.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=50000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'Faces of Mumbai – Mr. & Ms. ASTRA';
UPDATE events SET name='War of CL – Haar Ya Jeet', category='Informal Events', subcategory='', description='CLs compete in fun challenges to find the ultimate college champion.', allow_individual=true, allow_team=false, min_team_size=1, max_team_size=1,
  max_substitutes=0, fee_paise=10000, fee_per_person=false, registration_status='open', extra_fields='[]'::jsonb, is_active=true, updated_at=now()
  WHERE name = 'War of CL – Haar Ya Jeet';

-- 2) Events no longer in the plan: hide, never delete (registrations stay intact)
UPDATE events SET is_active=false, registration_status='closed', updated_at=now()
 WHERE name IN ('The Last Local','Mumbai Rush','Mumbai Digital Dhamaka','Awaaz Mumbai Ki – PR Rally') OR category='Public Relations';

-- 3) Add events that did not exist before (and everything, if the table was empty)
INSERT INTO events (name, category, subcategory, description, allow_individual, allow_team, min_team_size, max_team_size, max_substitutes, fee_paise, fee_per_person, registration_status, extra_fields)
VALUES
  ('Mumbai Idol', 'Performing Arts', 'Music', 'Showcase your singing talent through a song of your choice.', true, false, 1, 1, 0, 10000, true, 'open', '[]'::jsonb),
  ('Dhun Unplugged', 'Performing Arts', 'Music', 'Create a live acoustic musical performance as a team.', false, true, 4, 8, 0, 50000, false, 'open', '[]'::jsonb),
  ('Mumbaiya Mic Drop', 'Performing Arts', 'Music', 'Express Mumbai''s street life, slang and youth culture through rap.', true, false, 1, 1, 0, 10000, true, 'open', '[]'::jsonb),
  ('Aamchi Surmandali', 'Performing Arts', 'Music', 'Bring people together through a coordinated group singing performance.', false, true, 4, 8, 0, 40000, false, 'open', '[]'::jsonb),
  ('War of DJ – 90s Mehfil', 'Performing Arts', 'Music', 'Recreate the musical energy of the 1990s through a DJ performance.', true, true, 1, 2, 0, 50000, false, 'open', '[]'::jsonb),
  ('Beat pe Bambai', 'Performing Arts', 'Dance', 'Solo performers showcase their dancing skills in a style of their choice.', true, false, 1, 1, 0, 20000, false, 'open', '[]'::jsonb),
  ('Mumbai Groove Crew', 'Performing Arts', 'Dance', 'Teams showcase their skills through a synchronised, choreographed group dance performance.', false, true, 4, 12, 0, 50000, false, 'open', '[]'::jsonb),
  ('Apsara ali', 'Performing Arts', 'Dance', 'Solo performers showcase the traditional Maharashtrian dance form of Lavani.', true, false, 1, 1, 0, 20000, false, 'open', '[]'::jsonb),
  ('Gully Dance Face-Off', 'Performing Arts', 'Dance', 'Dancers compete in an exciting freestyle battle, showcasing their skills through spontaneous moves.', true, false, 1, 1, 0, 20000, true, 'open', '[]'::jsonb),
  ('Mumbai ki Kahani', 'Performing Arts', 'Dance', 'Teams portray Mumbai’s social issues, everyday struggles and real-life stories through dance.', false, true, 4, 10, 0, 50000, false, 'open', '[]'::jsonb),
  ('Ek Mumbai, Anek Chehre', 'Performing Arts', 'Drama', 'Perform a solo act portraying a recognisable character from Mumbai’s everyday life.', true, false, 1, 1, 0, 10000, false, 'open', '[{"key": "synopsis", "label": "Performance title & short synopsis", "type": "textarea", "required": true}]'::jsonb),
  ('Galli Theatre', 'Performing Arts', 'Drama', 'Teams present a short play based on everyday life, relationships or incidents in Mumbai.', false, true, 5, 12, 0, 50000, false, 'open', '[{"key": "synopsis", "label": "Performance title & short synopsis", "type": "textarea", "required": true}]'::jsonb),
  ('Bolti Deewarein', 'Performing Arts', 'Drama', 'Teams use street theatre to highlight a social or civic issue affecting Mumbai.', false, true, 8, 15, 0, 20000, false, 'open', '[{"key": "synopsis", "label": "Performance title & short synopsis", "type": "textarea", "required": true}]'::jsonb),
  ('Mime-Bai', 'Performing Arts', 'Drama', 'Teams tell a story through facial expressions and body movements without spoken dialogue.', false, true, 3, 8, 0, 25000, false, 'open', '[{"key": "synopsis", "label": "Performance title & short synopsis", "type": "textarea", "required": true}]'::jsonb),
  ('Sabha Sanvad', 'Literary Arts', '', 'Participants debate opposing viewpoints on issues related to Mumbai.', false, true, 2, 2, 0, 20000, false, 'open', '[]'::jsonb),
  ('Yuva Vaani', 'Literary Arts', '', 'Participants deliver a speech on a Mumbai-related topic given on the spot.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb),
  ('Bolo toh Sahi!', 'Literary Arts', '', 'Teams discuss issues affecting Mumbai’s future and suggest solutions.', false, true, 2, 4, 0, 30000, false, 'open', '[]'::jsonb),
  ('Kisse Mumbai ke', 'Literary Arts', '', 'Participants write an original piece inspired by everyday experiences in Mumbai.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb),
  ('Khayalon ki local', 'Literary Arts', '', 'Participants present original poetry or shayari inspired by Mumbai.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb),
  ('Mumbai Mastermind', 'Literary Arts', '', 'Teams compete in a quiz on Mumbai’s history, culture and landmarks.', false, true, 2, 3, 0, 30000, false, 'open', '[]'::jsonb),
  ('Canvas pe Bambai', 'Fine Arts', '', 'Participants create an artwork depicting Mumbai’s landmarks, people or everyday life.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb),
  ('Pixel dhamaka', 'Fine Arts', '', 'Participants create a digital illustration or graphic artwork based on Mumbai.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb),
  ('Rang Mumbai Ke', 'Fine Arts', '', 'Participants create a rangoli design inspired by Mumbai’s culture and festivals.', true, true, 1, 2, 0, 10000, false, 'open', '[]'::jsonb),
  ('Potrait mein twist', 'Fine Arts', '', 'Participants draw humorous caricatures of famous personalities or recognisable characters associated with Mumbai.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb),
  ('Blockbuster ka poster', 'Fine Arts', '', 'Participants design a poster for an imaginary film set in Mumbai.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb),
  ('Mumbai Through My Lens', 'Tech Arts', '', 'Participants capture photographs showcasing Mumbai’s people, places and everyday life.', true, false, 1, 1, 0, 10000, false, 'open', '[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb),
  ('Reel bana dala', 'Tech Arts', '', 'Participants create engaging short videos based on Mumbai.', true, true, 1, 3, 0, 10000, false, 'open', '[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb),
  ('Mumbai in Motion', 'Tech Arts', '', 'Teams create a short film portraying a story or experience related to Mumbai.', false, true, 3, 8, 0, 50000, false, 'open', '[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb),
  ('Sell it, Bambai style', 'Tech Arts', '', 'Teams create an advertisement promoting Mumbai, its culture or a Mumbai-inspired product.', false, true, 3, 6, 0, 50000, false, 'open', '[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb),
  ('Meme- baazi', 'Tech Arts', '', 'Participants create an original meme based on Mumbai and its everyday experiences.', true, false, 1, 1, 0, 10000, false, 'open', '[{"key": "portfolio_url", "label": "Portfolio / submission URL", "type": "url", "required": false}]'::jsonb),
  ('Rink Clash (Football)', 'Sports', '', 'A fast-paced 7-a-side football showdown testing teamwork, speed and strategy.', false, true, 7, 7, 3, 100000, false, 'open', '[]'::jsonb),
  ('Gully Cricket (Box Cricket)', 'Sports', '', 'A high-energy box cricket competition inspired by Mumbai’s famous gully cricket culture.', false, true, 7, 7, 2, 100000, false, 'open', '[]'::jsonb),
  ('Paddle Pe Charcha (Table Tennis)', 'Sports', '', 'A quick-reflex table tennis contest where precision and control determine the champion.', true, false, 1, 1, 0, 10000, true, 'open', '[]'::jsonb),
  ('Master Stroke (Chess)', 'Sports', '', 'A battle of strategy and foresight where every move counts.', true, false, 1, 1, 0, 10000, true, 'open', '[]'::jsonb),
  ('Mumbai Carrom Cup (Carrom)', 'Sports', '', 'A classic indoor contest testing accuracy, concentration and tactical play.', true, false, 1, 1, 0, 10000, true, 'open', '[]'::jsonb),
  ('Hoop Clash (Basketball)', 'Sports', '', 'An intense basketball showdown combining teamwork, speed and scoring precision.', false, true, NULL, NULL, 0, 100000, false, 'closed', '[]'::jsonb),
  ('Smash It Yaar (Pickleball)', 'Sports', '', 'A lively paddle-sport competition demanding agility, coordination and smart shot-making.', true, true, 1, 2, 0, 30000, false, 'closed', '[]'::jsonb),
  ('Aakhri khiladi', 'Gaming', '', 'BGMI players compete in an intense battle royale representing the competitive spirit of Mumbai''s youth.', false, true, 4, 4, 0, 60000, false, 'open', '[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb),
  ('Jungbaaz', 'Gaming', '', 'Teams compete in Call Of Duty matches where strategy, communication and quick reflexes determine the winner.', false, true, 5, 5, 0, 50000, false, 'open', '[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb),
  ('Goal ke sikander', 'Gaming', '', 'FC Mobile players compete to prove who can build and manage the ultimate virtual football team.', true, false, 1, 1, 0, 50000, false, 'open', '[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb),
  ('Mumbai Royale', 'Gaming', '', 'Free Fire MAX players compete in a fast-paced battle royale where survival, strategy, team coordination and quick decision-making determine the winning squad.', false, true, 5, 5, 0, 60000, false, 'open', '[{"key": "ingame_username", "label": "In-game username", "type": "text", "required": true}]'::jsonb),
  ('Local Se Landmark', 'Fun & Games', '', 'Teams solve clues and race through a Mumbai-themed treasure hunt.', false, true, 3, 5, 0, 40000, false, 'open', '[]'::jsonb),
  ('Mumbai Escape', 'Fun & Games', '', 'Teams solve Mumbai-themed puzzles and challenges before time runs out.', false, true, 4, 6, 0, 30000, false, 'open', '[]'::jsonb),
  ('Bollywood Meri Jaan Quiz', 'Fun & Games', '', 'Teams compete in a quiz on Bollywood industry knowledge', false, true, 2, 4, 0, 10000, true, 'open', '[]'::jsonb),
  ('Bambaiyya Charades', 'Fun & Games', '', 'Teams guess Mumbai-themed words, personalities, films and places through acting and gestures.', false, true, 4, 6, 0, 10000, true, 'open', '[]'::jsonb),
  ('Aamchi Antakshari', 'Fun & Games', '', 'Teams compete in a music battle featuring Bollywood, Marathi and Mumbai-themed songs.', false, true, 4, 6, 0, 10000, true, 'open', '[]'::jsonb),
  ('Emoji Se Picture Tak', 'Fun & Games', '', 'Participants decode Bollywood movie titles represented by emoji combinations.', true, true, 1, 2, 0, 10000, false, 'open', '[]'::jsonb),
  ('Shaan -e - Mumbai', 'Informal Events', '', 'A fashion showcase celebrating Mumbai’s diverse styles, cultures and professions.', false, true, 8, 10, 0, 70000, false, 'open', '[]'::jsonb),
  ('Faces of Mumbai – Mr. & Ms. ASTRA', 'Informal Events', '', 'A personality-based competition celebrating confidence, talent and intelligence.', true, false, 1, 1, 0, 50000, false, 'open', '[]'::jsonb),
  ('War of CL – Haar Ya Jeet', 'Informal Events', '', 'CLs compete in fun challenges to find the ultimate college champion.', true, false, 1, 1, 0, 10000, false, 'open', '[]'::jsonb)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- 4) Check: should list 50 active events, and nothing under 'still active but not in plan'
SELECT category, count(*) AS active_events FROM events WHERE is_active GROUP BY category ORDER BY min(id);
SELECT id, name, category FROM events WHERE is_active AND name NOT IN ('Mumbai Idol', 'Dhun Unplugged', 'Mumbaiya Mic Drop', 'Aamchi Surmandali', 'War of DJ – 90s Mehfil', 'Beat pe Bambai', 'Mumbai Groove Crew', 'Apsara ali', 'Gully Dance Face-Off', 'Mumbai ki Kahani', 'Ek Mumbai, Anek Chehre', 'Galli Theatre', 'Bolti Deewarein', 'Mime-Bai', 'Sabha Sanvad', 'Yuva Vaani', 'Bolo toh Sahi!', 'Kisse Mumbai ke', 'Khayalon ki local', 'Mumbai Mastermind', 'Canvas pe Bambai', 'Pixel dhamaka', 'Rang Mumbai Ke', 'Potrait mein twist', 'Blockbuster ka poster', 'Mumbai Through My Lens', 'Reel bana dala', 'Mumbai in Motion', 'Sell it, Bambai style', 'Meme- baazi', 'Rink Clash (Football)', 'Gully Cricket (Box Cricket)', 'Paddle Pe Charcha (Table Tennis)', 'Master Stroke (Chess)', 'Mumbai Carrom Cup (Carrom)', 'Hoop Clash (Basketball)', 'Smash It Yaar (Pickleball)', 'Aakhri khiladi', 'Jungbaaz', 'Goal ke sikander', 'Mumbai Royale', 'Local Se Landmark', 'Mumbai Escape', 'Bollywood Meri Jaan Quiz', 'Bambaiyya Charades', 'Aamchi Antakshari', 'Emoji Se Picture Tak', 'Shaan -e - Mumbai', 'Faces of Mumbai – Mr. & Ms. ASTRA', 'War of CL – Haar Ya Jeet') ORDER BY id;
