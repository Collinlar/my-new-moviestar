-- MuvieStars.com â€” Batch 02 Import
-- 50 Nollywood movies: 2025 (34) and 2026 (16)
-- Prioritised by YouTube popularity and trending status.
-- Run this in the Supabase SQL editor.
-- All poster_url values use YouTube maxresdefault thumbnails.

INSERT INTO movies (
  title, description, synopsis, genre, language,
  release_year, country, poster_url, youtube_url,
  average_rating, review_count, director, original_title,
  keywords, cultural_context, distribution_status, featured
) VALUES

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2025 NOLLYWOOD â€” 34 FILMS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

(
  'I Get to Love You',
  'A heartwarming Nollywood romance following Tiwa, a young woman who leaves her quiet village life for the chaos of Lagos and finds love where she least expects it.',
  'Tiwa has spent her whole life in a small community where everything is familiar and everyone knows her name. When circumstances pull her to Lagos, she discovers not just a new life but a person who sees her clearly from the start.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/vLUv-dqD57c/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=vLUv-dqD57c',
  0, 0, NULL, NULL,
  'Nollywood, romance, Lagos, village, love story, 2025, Nigerian movie',
  'Explores the classic Nigerian narrative of rural-to-urban migration and the experience of young women discovering Lagos for the first time.',
  'streaming', false
),

(
  'Here Comes the Bride',
  'A 2025 Nollywood romantic drama in which celebrity Kamara discovers on her traditional wedding day that her groom has been living a double life. What begins as the biggest day of her life becomes the first day of a harder, more honest story.',
  'Kamara is everything her peers aspire to be. Her traditional wedding is the social event of the season until a revelation moments before the ceremony shatters the image she has carefully built.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/qtj9_Fm3hik/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=qtj9_Fm3hik',
  0, 0, NULL, NULL,
  'Nollywood, romance, wedding, betrayal, traditional marriage, 2025, Nigerian movie',
  'Set against the backdrop of a Nigerian traditional wedding ceremony, engaging with the cultural weight placed on these events and the devastating social consequences of public humiliation.',
  'streaming', false
),

(
  'When Love Returns',
  'A Nollywood romance built around the terrifying possibility of a second chance. Bola Afolabi, a committed health advocate, unexpectedly reunites with Uzor, the first person she ever loved.',
  'Bola has built a full life since Uzor left it. When he walks back in, everything she decided about herself comes under question. When Love Returns is a mature Nollywood romance about whether love deserves a second chapter.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/UIGQtslD-fQ/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=UIGQtslD-fQ',
  0, 0, NULL, NULL,
  'Nollywood, romance, second chance, reunited lovers, health, 2025, Nigerian movie',
  'Reflects the growing Nollywood trend of mature romantic dramas centred on professional Nigerian women navigating career ambition alongside the emotional pull of past relationships.',
  'streaming', false
),

(
  'Promise Me December',
  'A fiercely independent photographer who has sworn off love collides with a celebrated musician in this charming Nollywood holiday romance. The film earns its warmth by letting both characters be fully realised human beings first.',
  'She does not believe in Christmas miracles or love stories. He has heard that line before and chooses not to believe it. Promise Me December is a Nollywood romantic comedy that earns every smile.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/6HrD-lb53vQ/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=6HrD-lb53vQ',
  0, 0, NULL, NULL,
  'Nollywood, romance, holiday, Christmas, musician, photographer, love story, 2025',
  'Part of a growing subgenre of Nigerian festive romance films that use the Christmas season as an emotional backdrop for love stories set in Lagos and Abuja.',
  'streaming', false
),

(
  'Local Love',
  'Maurice Sam and Sarian Martin anchor this warmhearted Nollywood romance that champions love rooted in simplicity over the pressures of class and status. A film that knows exactly what it wants to say and says it with real charm.',
  'Two people from different social worlds find that what they have between them does not care about the gap. Local Love is a Nollywood romance that quietly argues for the kind of connection that survives ambition and expectation.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/Xg6LFtp6TBY/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=Xg6LFtp6TBY',
  0, 0, NULL, NULL,
  'Nollywood, romance, class, society, Maurice Sam, Sarian Martin, 2025, Nigerian movie',
  'Engages with Nigerian class dynamics and the social pressure on young professionals to pursue status-aligned relationships rather than authentic ones.',
  'streaming', false
),

(
  'Act of Love',
  'A tender Nollywood drama in which love is not declared but demonstrated through action. Omeche Oko, Victory Michael, and Sonita Fred deliver quietly assured performances in this grounded story of what love looks like when it costs something.',
  'Love without sacrifice is easy. Act of Love is a 2025 Nollywood drama about what happens when affection is tested by circumstances that demand something real from everyone involved.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/C2zwHfATeIc/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=C2zwHfATeIc',
  0, 0, NULL, NULL,
  'Nollywood, drama, love, sacrifice, Omeche Oko, Victory Michael, Sonita Fred, 2025',
  'Represents a thoughtful strand of Nollywood storytelling that looks at love not as a feeling but as a set of daily choices.',
  'streaming', false
),

(
  'Sweeter Than Ever',
  'Ify believes she has mastered moving on. Then Kelvin walks back into her life and everything she thought she had settled about herself comes undone. A bittersweet 2025 Nollywood romance about feelings we never fully finish.',
  'Getting over someone is not the same as being done with them. Sweeter Than Ever is a Nollywood romance that knows the difference and builds its entire emotional arc on that distinction.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/JwfQxQ-Lz88/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=JwfQxQ-Lz88',
  0, 0, NULL, NULL,
  'Nollywood, romance, rekindled love, moving on, 2025, Nigerian movie',
  'A Nigerian romantic drama reflecting modern dating culture and the emotional complications of reconnecting with a past relationship in the social media age.',
  'streaming', false
),

(
  'Passion and Gain',
  'Maurice Sam, Sonia Uche, and Chinenye Nnebe collide in this 2025 Nollywood drama about three people who want different things from each other and cannot quite make the math work. Smart, emotionally layered, sharply performed.',
  'Three people. Two competing desires. No clean resolution. Passion and Gain is a 2025 Nollywood drama that refuses to make anyone the obvious villain, building a messy, honest portrait of three people caught in each other''s gravitational pull.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/vBgHVg5eXH0/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=vBgHVg5eXH0',
  0, 0, NULL, NULL,
  'Nollywood, drama, romance, love triangle, Maurice Sam, Sonia Uche, Chinenye Nnebe, 2025',
  'Part of the wave of multi-layered Nollywood dramas that give equal emotional weight to all characters rather than structuring the story around a single protagonist.',
  'streaming', false
),

(
  'My New Lover',
  'Maurice Sam and Chinenye Nnebe are at their most effortlessly charming in this 2025 Nollywood romance about the unexpected joy of someone who arrives at exactly the wrong time and turns out to be completely right.',
  'She was not supposed to matter. He was not supposed to stay. My New Lover is a classic Nollywood romance built on the knowledge that the best love stories start as accidents.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/_VfxKZDFi18/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=_VfxKZDFi18',
  0, 0, NULL, NULL,
  'Nollywood, romance, love, accident, Maurice Sam, Chinenye Nnebe, 2025, trending',
  'A popular streaming Nollywood romance from late 2025 benefiting from the enormous digital following of its two lead actors.',
  'streaming', false
),

(
  'Bonds and Break',
  'Maurice Sam, Sonia Uche, and Chinenye Nnebe return together in a 2025 Nollywood drama about the point at which connection becomes constriction. A film that treats its theme with the seriousness it deserves.',
  'The strongest bonds are the ones that take the longest to admit are hurting you. Bonds and Break is a 2025 Nollywood drama that unfolds slowly, watching three people negotiate what they owe each other versus what they owe themselves.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/GKuuKPbL89M/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=GKuuKPbL89M',
  0, 0, NULL, NULL,
  'Nollywood, drama, relationships, freedom, Maurice Sam, Sonia Uche, Chinenye Nnebe, 2025',
  'Explores the Nigerian cultural obligation to maintain bonds with family, friends, and romantic partners even when those bonds have become harmful.',
  'streaming', false
),

(
  'Sparks of Love',
  'Maurice Sam and Stan Nze face off in a 2025 Nollywood drama about the competitive nature of desire. A film that uses the chemistry between its two male leads to drive a story about rivalry, friendship, and the woman both cannot stop thinking about.',
  'Two men who respect each other discover they are both in love with the same person. Sparks of Love is a 2025 Nollywood drama that takes the love triangle seriously and refuses to resolve it the easy way.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/nzqj9GfW0D4/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=nzqj9GfW0D4',
  0, 0, NULL, NULL,
  'Nollywood, romance, love triangle, rivalry, Maurice Sam, Stan Nze, Kenechukwu Eze, 2025',
  'Part of the Nollywood tradition of love triangle dramas, updated for a 2025 audience that expects its male characters to be emotionally complex rather than simply competitive.',
  'streaming', false
),

(
  'Slay Queens with Substance',
  'Uju Okoli, Destiny Etiko, and Georgina Ibe star in a 2025 Nollywood comedy-drama that upends the stereotype of the shallow Lagos socialite. A film that is funnier and sharper than its title suggests.',
  'They look like they have everything figured out. They do not. Slay Queens with Substance is a 2025 Nollywood film that pokes affectionate holes in Lagos image culture while genuinely caring about the women living inside it.',
  'comedy', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/e7MC_Vq4EaE/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=e7MC_Vq4EaE',
  0, 0, NULL, NULL,
  'Nollywood, comedy, drama, Lagos, socialite, Uju Okoli, Destiny Etiko, Georgina Ibe, 2025',
  'Engages directly with Lagos social media culture, the slay queen identity, and the gap between curated online personas and the real pressures of modern Nigerian femininity.',
  'streaming', false
),

(
  'Princesses of Power',
  'Destiny Etiko and Uju Okoli lead this gripping 2025 Nollywood action-drama about women who refuse to be managed by the systems trying to contain them. Two of Nollywood''s most bankable stars at their most compelling.',
  'Power was never supposed to belong to them. Princesses of Power is a 2025 Nollywood production that gives Destiny Etiko and Uju Okoli the kind of full-spectrum roles their talents demand.',
  'action', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/yDMJ29JrKRw/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=yDMJ29JrKRw',
  0, 0, NULL, NULL,
  'Nollywood, action, drama, women, power, Destiny Etiko, Uju Okoli, 2025, trending',
  'Part of a growing wave of Nollywood productions that centre powerful female characters, reflecting increased demand from Nigerian female audiences for stories in which women drive the action.',
  'streaming', false
),

(
  'A Fight for Love',
  'Ruth Kadiri, Deza The Great, and Sonia Uche lead a passionate 2025 Nollywood drama about the kind of love that does not go quietly. A film that earns its emotional heat through strong performances and a story with real stakes.',
  'Some love stories do not end because one person stops caring. A Fight for Love is a 2025 Nollywood drama that understands what it means to lose something you genuinely tried to keep.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/YAF9pKLVtkE/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=YAF9pKLVtkE',
  0, 0, NULL, NULL,
  'Nollywood, drama, love, conflict, Ruth Kadiri, Deza The Great, Sonia Uche, 2025',
  'A Nigerian drama that speaks to the emotional intensity of modern relationships and the real effort required to sustain love against external pressures.',
  'streaming', false
),

(
  'Ladies Beauty',
  'Uju Okoli, Destiny Etiko, and Lizzy Gold deliver a sparkling 2025 Nollywood comedy-drama set in the competitive world of Nigerian beauty culture. Sharp, funny, and surprisingly astute about what the beauty industry asks women to give up.',
  'Behind the glamour and perfectly arched brows is a world of ambition, rivalry, and occasional chaos. Ladies Beauty is a 2025 Nollywood comedy-drama that uses the beauty salon as a social microcosm.',
  'comedy', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/9YXsCO-Gulg/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=9YXsCO-Gulg',
  0, 0, NULL, NULL,
  'Nollywood, comedy, beauty, salon, Uju Okoli, Destiny Etiko, Lizzy Gold, 2025',
  'Set in the Nigerian beauty industry, one of the most vibrant sectors of the Lagos informal economy, where beauty salons serve as hubs of community and social negotiation.',
  'streaming', false
),

(
  'Lagos Liars',
  'Uju Okoli and Destiny Etiko headline this 2025 Nollywood comedy about the elaborate performances Lagos demands from the people who live there. A film that finds real comedy in the city''s particular relationship with truth.',
  'In Lagos, everyone is performing a version of themselves that does not quite match the original. Lagos Liars is a Nollywood comedy that celebrates the city''s theatrical energy while exposing the exhaustion of maintaining a persona that was always a size too large.',
  'comedy', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/HinrcXOqsCs/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=HinrcXOqsCs',
  0, 0, NULL, NULL,
  'Nollywood, comedy, Lagos, lies, performance, identity, Uju Okoli, Destiny Etiko, 2025',
  'Engages with the Lagos culture of social performance, where professional success, relationship status, and financial position are routinely exaggerated for social currency.',
  'streaming', false
),

(
  'Sweet Dija',
  'Maurice Sam and Ruth Kadiri light up the screen in this 2025 Nollywood romantic drama in which the person everyone underestimated turns out to be the person nobody can forget. A film with real warmth and a standout lead performance.',
  'Dija is not the person people see first in a room. That turns out to be their mistake. Sweet Dija is a 2025 Nollywood drama that builds its emotional impact on the pleasure of watching someone be genuinely seen for the first time.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/DQTthAKnbiQ/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=DQTthAKnbiQ',
  0, 0, NULL, NULL,
  'Nollywood, romance, underdog, love, Maurice Sam, Ruth Kadiri, 2025, trending',
  'Draws on the Nigerian storytelling tradition of the overlooked character whose hidden value is ultimately revealed, applied here to the romantic drama format.',
  'streaming', false
),

(
  'I Don''t Need Your Love',
  'Ruth Kadiri leads this 2025 Nollywood drama about a woman who has built her whole identity around not needing what she most wants. Smart, emotionally honest, and anchored by one of Ruth Kadiri''s best recent performances.',
  'She has said the words so many times they have started to feel true. I Don''t Need Your Love peels back the armour of a woman who has been protecting herself so long she has forgotten what she was protecting.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/FQ0QfDkDvVk/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=FQ0QfDkDvVk',
  0, 0, NULL, NULL,
  'Nollywood, drama, independence, love, Ruth Kadiri, Kwasi Blay, Frances Nwabunike, 2025',
  'Reflects the emotional landscape of the modern Nigerian woman navigating independence and vulnerability in a culture with conflicting expectations about both.',
  'streaming', false
),

(
  'Journey of Royalty',
  'Mike Godson and Oma Nnanna anchor this epic 2025 Nollywood royal saga whose third and fourth seasons raise the stakes considerably. A sprawling, handsomely produced story about power, lineage, and the burden of a crown.',
  'The palace intrigue deepens in seasons three and four as threats from within and outside the royal family converge. Journey of Royalty earns its running time through genuine character development and a story that respects its audience''s appetite for complexity.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/RpeygCQfEog/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=RpeygCQfEog',
  0, 0, NULL, NULL,
  'Nollywood, epic, royalty, palace, kingdom, Mike Godson, Oma Nnanna, 2025',
  'Part of Nollywood''s growing royal epic tradition, drawing on Nigerian monarchy and chieftaincy culture to build sprawling multi-season stories of succession and honour.',
  'streaming', false
),

(
  'Secret of Mother and Daughter',
  'Zubby Michael and Sharon Ifedi star in this emotionally complex 2025 Nollywood drama in which a secret shared between a mother and daughter becomes the fault line that threatens to split their family apart.',
  'Some secrets are kept to protect. Others are kept to control. Secret of Mother and Daughter is a 2025 Nollywood drama about the power of concealed knowledge and the damage it does over time.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/Au4qDwBj_sA/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=Au4qDwBj_sA',
  0, 0, NULL, NULL,
  'Nollywood, drama, family, secret, mother, daughter, Zubby Michael, Sharon Ifedi, 2025',
  'Explores the Nigerian family dynamic in which women carry secrets across generations to preserve family stability, and the cost of that emotional labour on both the keeper and the kept.',
  'streaming', false
),

(
  'Royal Deception Part 6',
  'Mike Godson returns in the sixth chapter of this long-running Nollywood royal intrigue saga. The deceptions multiply and the stakes reach a point of no return in a production that delivers everything its loyal audience expects.',
  'Every throne sits on a foundation of compromises and deliberate untruths. Royal Deception Part 6 deepens the political complexity of its fictional kingdom while Mike Godson gives the series its most layered performance to date.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/pWbRESL5fEE/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=pWbRESL5fEE',
  0, 0, NULL, NULL,
  'Nollywood, royal, palace, deception, intrigue, Mike Godson, series, 2025',
  'Belongs to the popular Nollywood palace intrigue subgenre, using fictionalised royal settings to explore timeless themes of greed, betrayal, and the corrupting nature of power.',
  'streaming', false
),

(
  'Marriage Contract',
  'Frederick Leonard and Cynthia Clarke lead this 2025 Nollywood drama about a marriage that began as a business arrangement and the complications that arise when the parties start feeling things they agreed they would not.',
  'They signed a contract, not a love story. Marriage Contract takes the arranged marriage premise and treats it with dramatic intelligence, building its emotional arc through the slow dissolution of professional distance between two people who chose logic over feeling.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/MGfpnthLprA/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=MGfpnthLprA',
  0, 0, NULL, NULL,
  'Nollywood, romance, arranged marriage, contract, Frederick Leonard, Cynthia Clarke, 2025',
  'Reflects Nigerian practices of strategic and family-arranged marriages in upper-middle-class Lagos, where economic compatibility is often prioritised over romantic chemistry.',
  'streaming', false
),

(
  'The Messengers',
  'Mike Godson and Zubby Michael team up in this 2025 Nollywood supernatural action film about two men given a divine mandate they did not ask for and cannot refuse. Kinetic, entertaining, and driven by the undeniable energy of its two leads.',
  'They were chosen without being consulted. The Messengers is a 2025 Nollywood supernatural action film about two men navigating a calling that upends every plan they had for their lives, blending Pentecostal spiritual language with high-stakes thriller plotting.',
  'action', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/W3k7SCW7uOQ/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=W3k7SCW7uOQ',
  0, 0, NULL, NULL,
  'Nollywood, action, supernatural, spiritual, divine, Mike Godson, Zubby Michael, 2025',
  'Draws on Nigerian Pentecostal Christianity''s concept of divine assignment and spiritual warfare, a framework deeply embedded in everyday Nigerian religious experience.',
  'streaming', false
),

(
  'Crazy Girls',
  'Mercy Johnson and Chioma Chukwuka bring their formidable combined charisma to this 2025 Nollywood comedy. Two of Nollywood''s most beloved actresses let their characters make every bad decision the audience is hoping for.',
  'They have both been sensible for too long. Crazy Girls is a 2025 Nollywood comedy in which Mercy Johnson and Chioma Chukwuka let loose in ways that are chaotic, hilarious, and surprisingly touching.',
  'comedy', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/5JjOjfB-GcM/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=5JjOjfB-GcM',
  0, 0, NULL, NULL,
  'Nollywood, comedy, women, friendship, Mercy Johnson, Chioma Chukwuka, 2025, fun',
  'Part of a growing Nollywood subgenre of female friendship comedies that celebrate women making choices outside the roles traditionally assigned to them in Nigerian society.',
  'streaming', false
),

(
  'Ruthless Girls',
  'Mercy Johnson and Chioma Chukwuka reunite in this 2025 Nollywood action-comedy about women who decide the game is rigged and choose to play by entirely different rules. Sharper and more satisfying than its companion film.',
  'When the system will not give you what you deserve, you take it. Ruthless Girls gives Mercy Johnson and Chioma Chukwuka their most assertive roles yet in a film that is genuinely funny about something serious.',
  'action', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/A4-CmvJRWaU/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=A4-CmvJRWaU',
  0, 0, NULL, NULL,
  'Nollywood, action, comedy, women, Mercy Johnson, Chioma Chukwuka, 2025, trending',
  'Reflects the growing demand among Nigerian female audiences for films in which women take active, forceful roles rather than reactive ones.',
  'streaming', false
),

(
  'The Prophecy',
  'Ugezu J Ugezu and Ngozi Ezeonu headline this intense 2025 Nollywood supernatural drama in which a prophetic vision sets off a chain of events no one is prepared for. Atmospheric, culturally grounded, and driven by two imposing performances.',
  'A prophet speaks. Those who hear the words must decide what to do with them. The Prophecy is a 2025 Nollywood supernatural drama that takes Nigerian belief systems seriously and builds its narrative on the real power that prophetic utterance carries.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/wHrJ6jevWhU/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=wHrJ6jevWhU',
  0, 0, 'Ugezu J Ugezu', NULL,
  'Nollywood, supernatural, prophecy, drama, Ugezu J Ugezu, Ngozi Ezeonu, 2025',
  'Engages deeply with the prophetic tradition in Nigerian Christianity and traditional religion, in which spoken prophecy is understood as having genuine power to shape events.',
  'streaming', false
),

(
  'Hurt',
  'Mercy Johnson and Ngozi Ezeonu lead this raw 2025 Nollywood drama about the kind of hurt that does not leave marks you can see. A film about emotional pain told with the unflinching honesty both lead actresses are known for.',
  'The deepest wounds in families are the ones that never get acknowledged. Hurt is a 2025 Nollywood drama in which two generations of women confront a cycle of emotional damage that has been passed down without anyone choosing to name it.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/ookeK1DbyRA/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=ookeK1DbyRA',
  0, 0, NULL, NULL,
  'Nollywood, drama, emotional abuse, family, generational trauma, Mercy Johnson, Ngozi Ezeonu, 2025',
  'Explores intergenerational trauma in Nigerian families, a subject Nollywood is increasingly willing to engage with as mental health conversations become more mainstream in Nigeria.',
  'streaming', false
),

(
  'The Fighter Giver',
  'Mercy Johnson delivers a ferocious 2025 Nollywood performance in this drama about a woman who fights for everyone else and must learn, finally, to fight for herself. Among her strongest recent work.',
  'She has been fighting on other people''s behalf her entire life. The Fighter Giver is a 2025 Nollywood drama that turns its attention to what happens to the woman who gives everything and then has to figure out who she is when there is nothing left to give.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/5Ky9gVXgEdI/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=5Ky9gVXgEdI',
  0, 0, NULL, NULL,
  'Nollywood, drama, sacrifice, selflessness, women, Mercy Johnson, 2025, fighter',
  'Reflects the real emotional cost of the caretaker role that Nollywood has long assigned to Nigerian women, here examined critically rather than celebrated uncritically.',
  'streaming', false
),

(
  'August Visitor',
  'Mercy Johnson and Daniel Lloyd headline this atmospheric 2025 Nollywood drama about a visitor who arrives in August and leaves the household permanently changed. Slow-burning, precise, and full of quiet menace.',
  'The guest arrives unannounced and stays longer than anyone planned. August Visitor uses the classic horror premise of the disruptive outsider to examine what a household was already hiding before the visitor arrived.',
  'thriller', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/vZpgm7tHMhk/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=vZpgm7tHMhk',
  0, 0, NULL, NULL,
  'Nollywood, thriller, drama, visitor, household, Mercy Johnson, Daniel Lloyd, 2025',
  'Uses the Nigerian cultural tradition of extended household visits as the setting for a psychological thriller, exposing what a family was already hiding beneath its carefully maintained normalcy.',
  'streaming', false
),

(
  'The Taxi Driver and the Superstar',
  'Ebube Obio shines in this charming 2025 Nollywood romantic comedy about two people from completely different worlds who find themselves sharing the same journey for longer than either of them planned.',
  'He drives for a living. She is the most recognised face in the country. Their paths cross in the back of his cab and the story that follows is the best argument either of them has had for reconsidering what they thought they needed from life.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/vW3NT-XIJp8/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=vW3NT-XIJp8',
  0, 0, NULL, NULL,
  'Nollywood, romance, comedy, taxi driver, celebrity, class, Ebube Obio, Victory, 2025, trending',
  'A Lagos-set romance that plays with the city''s class divisions, using the intimacy of a car ride to dissolve the social distance between a working-class driver and a wealthy celebrity.',
  'streaming', false
),

(
  'War Front',
  'Patience Ozokwor and Ekene Umenwa lead this 2025 Nollywood drama about a family conflict that escalates well past the point where either side remembers what started it. A film that is blunt about what war within a family actually looks like.',
  'In a family at war, there are no civilians. War Front follows the escalation of a domestic conflict until every person in the household has been forced to choose a side.',
  'drama', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/KppvT6LywZw/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=KppvT6LywZw',
  0, 0, NULL, NULL,
  'Nollywood, drama, family conflict, war, Patience Ozokwor, Ekene Umenwa, 2025',
  'Explores the phenomenon of extended family conflict in Nigerian households, often triggered by inheritance disputes, in-law tensions, or the arrival of a second wife.',
  'streaming', false
),

(
  'Boss Woman 2',
  'Nkem Owoh and Patience Ozokwor reprise their roles in the 2025 sequel to the beloved Nollywood comedy about power, marriage, and who actually runs the household. Better organised and even funnier than the original.',
  'The boss is still in charge. Her husband still has not fully come to terms with that. Boss Woman 2 deepens the dynamic between Nkem Owoh and Patience Ozokwor with more confidence, better jokes, and genuine warmth.',
  'comedy', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/pVcp9Pk57MM/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=pVcp9Pk57MM',
  0, 0, NULL, NULL,
  'Nollywood, comedy, marriage, power, Nkem Owoh, Patience Ozokwor, sequel, 2025',
  'A Nollywood comedy about gender and domestic power that uses humour to examine the real negotiation of authority between husbands and wives in Nigerian households.',
  'streaming', false
),

(
  'Monetized Marriage',
  'Toyin Abraham stars in this 2025 Nollywood comedy-drama about a marriage that has become a content business and the moment when the algorithm demands something neither of them was prepared to give. Timely, funny, and uncomfortably real.',
  'They turned their marriage into content. It worked until real life stopped cooperating with the brand. Monetized Marriage takes Nigeria''s social media couple culture and strips it back to the anxious, performative reality it is built on.',
  'comedy', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/xjOShhmidu0/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=xjOShhmidu0',
  0, 0, NULL, NULL,
  'Nollywood, comedy, marriage, social media, content creator, influencer, Toyin Abraham, 2025',
  'A sharp commentary on the Nigerian influencer couple phenomenon, in which real relationships are packaged as social media content and the performance of happiness becomes more important than its reality.',
  'streaming', false
),

(
  'One More Love',
  'Maurice Sam, Sarian Martin, and Stella Udeze anchor this heartfelt 2025 Nollywood romance that asks whether loving someone again after heartbreak is courage or foolishness. A film that comes down generously on the side of trying.',
  'Once was enough to break something. One More Love is a 2025 Nollywood romance about three people navigating the complicated arithmetic of second chances, past damage, and whether a person who hurt you can also be the one who heals you.',
  'romance', 'english', 2025, 'Nigeria',
  'https://img.youtube.com/vi/CQZLHsyGcVQ/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=CQZLHsyGcVQ',
  0, 0, NULL, NULL,
  'Nollywood, romance, second chance, healing, Maurice Sam, Sarian Martin, Stella Udeze, 2025',
  'Part of the mature Nollywood romantic drama tradition that treats emotional recovery from past relationships as a serious subject worthy of careful, honest storytelling.',
  'streaming', false
),

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2026 NOLLYWOOD â€” 16 FILMS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

(
  'Laughing Hearts',
  'A feel-good 2026 Nollywood romantic comedy pairing Maurice Sam with Ruth Kadiri in a story about two people who discover that laughter is the most honest thing they have ever shared.',
  'Neither of them was looking for what they found. Maurice Sam and Ruth Kadiri trade sharp, warm performances in this breezy 2026 Nollywood production that trusts comedy to say what drama cannot.',
  'romance', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/Frgk7EFKYiM/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=Frgk7EFKYiM',
  0, 0, NULL, NULL,
  'Nollywood, romance, comedy, Maurice Sam, Ruth Kadiri, 2026, Nigerian movie, trending',
  'Part of the dominant Nollywood romantic comedy trend of 2025 to 2026, driven by the bankable chemistry of the Maurice Sam and Ruth Kadiri pairing.',
  'streaming', false
),

(
  'Greener Lawn',
  'Chinenye Nnebe, Clinton Joshua, and Ego Nwosu lead this sharp 2026 Nollywood drama about the human tendency to covet what belongs to someone else. Wry, observant, and harder to shake than it first appears.',
  'A man with a good life cannot stop measuring it against someone else''s better one. Greener Lawn is a 2026 Nollywood comedy-drama that understands exactly how ordinary this impulse is and refuses to judge it.',
  'drama', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/qHDKZuHdtAg/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=qHDKZuHdtAg',
  0, 0, NULL, NULL,
  'Nollywood, drama, envy, ambition, Chinenye Nnebe, Clinton Joshua, Ego Nwosu, 2026, trending',
  'Explores the Nigerian social anxiety around status comparison and the grass-is-greener mentality that drives many middle-class Nigerians.',
  'streaming', false
),

(
  'After My First Date',
  'A lively 2026 Nollywood romantic comedy following the chaotic aftermath of a first date that goes unexpectedly well. Maurice Sam and Chinenye Nnebe are an irresistible pairing in this fizzing, warmhearted film.',
  'The first date went better than either of them planned. Now neither of them knows what to do about it. After My First Date is a charming 2026 Nollywood rom-com that finds its comedy in the anxiety of wanting something to work.',
  'romance', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/BNjysHnvTEY/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=BNjysHnvTEY',
  0, 0, NULL, NULL,
  'Nollywood, romance, comedy, first date, Maurice Sam, Chinenye Nnebe, 2026, trending',
  'Reflects contemporary Lagos dating culture and the uncertainty of navigating new relationships in a city where everyone is performing confidence.',
  'streaming', false
),

(
  'When Love Is No More',
  'A 2026 Nollywood romantic drama that asks what happens when love is genuinely gone and two people must decide what to do with what remains. Maurice Sam and Chinenye Nnebe give career-best work.',
  'They still share a roof, a history, and the careful politeness of people who once loved each other. When Love Is No More is a 2026 Nollywood drama of rare emotional maturity, exploring the quiet devastation of a relationship that has run its course.',
  'drama', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/USYa_xUCOm4/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=USYa_xUCOm4',
  0, 0, NULL, NULL,
  'Nollywood, drama, breakup, relationships, Maurice Sam, Chinenye Nnebe, 2026, trending',
  'Engages with the Nigerian cultural difficulty of ending a relationship, where social pressure and family expectation often keep couples together long after the emotional connection has faded.',
  'streaming', false
),

(
  'Falling for a Realtor',
  'A sharp 2026 Nollywood romantic comedy in which a house-hunting client finds something she was definitely not looking for. Maurice Sam and Chinenye Nnebe bring real playfulness to this witty, charming production.',
  'She came to view a property. She left having viewed something else entirely. Falling for a Realtor is a 2026 Nollywood rom-com that earns its title by building the romance through a specific professional dynamic before letting it tip into something more personal.',
  'romance', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/q9rwFrp_bGI/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=q9rwFrp_bGI',
  0, 0, NULL, NULL,
  'Nollywood, romance, comedy, realtor, property, Maurice Sam, Chinenye Nnebe, 2026',
  'Reflects Lagos''s booming real estate culture and the aspirational homeownership narrative that drives many young Nigerian professionals.',
  'streaming', false
),

(
  'Azaman',
  'A richly titled 2026 Nollywood romance drawing on the Hausa word for the world and all its complexity. Maurice Sam and Chinenye Nnebe anchor a film about how people carry their whole world in the people they love.',
  'Azaman means everything: the world, life, circumstance. This 2026 Nollywood production uses that weight as its thematic spine, telling the story of two people who find in each other the world they had stopped looking for.',
  'romance', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/-PH06vX7iMw/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=-PH06vX7iMw',
  0, 0, NULL, NULL,
  'Nollywood, romance, Hausa, culture, Maurice Sam, Chinenye Nnebe, 2026, trending',
  'The Hausa word azaman evokes life, fate, and the world in its fullness, used here as the emotional frame for a pan-Nigerian romance that speaks across regional identities.',
  'streaming', false
),

(
  'Tout but Romantic',
  'A 2026 Nollywood romantic comedy that plays its French-flavoured title with knowing wit. Chinenye Nnebe and Maurice Sam navigate a love story in which everything is exactly as romantic as its participants insist it is not.',
  'Nobody in this film will admit they are in a love story. Tout but Romantic is a 2026 Nollywood comedy that earns every laugh from that denial, building to a conclusion that both characters and audience can see coming and enjoy arriving at anyway.',
  'romance', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/4FwGJCHUrwg/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=4FwGJCHUrwg',
  0, 0, NULL, NULL,
  'Nollywood, romance, comedy, denial, Chinenye Nnebe, Maurice Sam, 2026, trending',
  'The film''s French-tinged title is a wink at the Nollywood audience''s cosmopolitan cultural literacy, while the story itself is entirely grounded in the Lagos social milieu.',
  'streaming', false
),

(
  'Lasting Love',
  'A 2026 Nollywood romantic drama that argues, convincingly, that the best love stories are not the most dramatic ones. Maurice Sam and Chinenye Nnebe are understated and real in this quiet, lasting film.',
  'Not every love story ends with a dramatic gesture. Some end with two people choosing each other every morning without fanfare. Lasting Love earns its title by making the argument for ordinary devotion.',
  'romance', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/UXTNu2vdT9Y/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=UXTNu2vdT9Y',
  0, 0, NULL, NULL,
  'Nollywood, romance, long-term love, commitment, Maurice Sam, Chinenye Nnebe, 2026',
  'Represents a mature strand of Nollywood romance that celebrates steady, committed love rather than the early passion that dominates most romantic narratives.',
  'streaming', false
),

(
  'Pant Ritual',
  'Zubby Michael stars in this charged 2026 Nollywood supernatural thriller exploring the dark tradition of ritual practices involving women''s undergarments, used here as the engine of a tense, socially revealing crime narrative.',
  'When a series of disturbing thefts points toward ritualistic intent, the investigation pulls back layers of superstition, desperation, and exploitation in a Lagos neighbourhood. Pant Ritual is a bold 2026 Nollywood thriller that takes a taboo subject and turns it into compelling social commentary.',
  'thriller', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/yiMm4p4Bv4I/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=yiMm4p4Bv4I',
  0, 0, NULL, NULL,
  'Nollywood, thriller, juju, supernatural, ritual, Zubby Michael, 2026, crime',
  'Engages with the persistent Nigerian belief in ritual-based power spells, a real social phenomenon that Nollywood has long explored. The film treats the subject as social commentary.',
  'streaming', false
),

(
  'Who Killed the King',
  'Frederick Leonard and Mike Godson lead this gripping 2026 Nollywood mystery thriller in which the death of a powerful man sends shockwaves through everyone who stood to gain or lose by it. Taut, twisting, and compulsively watchable.',
  'The king is dead. Everyone had a reason. Who Killed the King builds its tension through the slow elimination of suspects and the gradual revelation of a truth more complicated and more personal than anyone wanted.',
  'thriller', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/mKz5pJoES54/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=mKz5pJoES54',
  0, 0, NULL, NULL,
  'Nollywood, thriller, mystery, royalty, murder, Frederick Leonard, Mike Godson, 2026',
  'Uses the death of a traditional ruler as the inciting incident, drawing on the real political significance of leadership transitions in Nigerian traditional institutions.',
  'streaming', false
),

(
  'Zubby Michael: Death Sight',
  'Zubby Michael stars in this high-energy 2026 Nollywood supernatural thriller about a man cursed with the ability to see how people will die, and the dangerous territory that gift pulls him into.',
  'Every person he looks at, he can see how they will die. Zubby Michael: Death Sight is a 2026 Nollywood supernatural thriller that takes its central premise seriously, building genuine tension from a protagonist who cannot turn off what he sees.',
  'thriller', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/NshZweA2Kr0/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=NshZweA2Kr0',
  0, 0, NULL, NULL,
  'Nollywood, supernatural, thriller, vision, death, Zubby Michael, 2026, trending',
  'Part of Nollywood''s supernatural thriller tradition, engaging with Nigerian beliefs about spiritual sight, divination, and the thin boundary between the living and the dead.',
  'streaming', false
),

(
  'The Queen Mother',
  'Destiny Etiko and Zubby Michael deliver powerhouse performances in this 2026 Nollywood epic about a woman who rebuilds a dynasty on her own terms. One of the year''s most anticipated streaming Nollywood releases.',
  'She was not born to power. She was forged by it. The Queen Mother is a 2026 Nollywood epic in which Destiny Etiko plays a woman who refuses to let circumstance define the ceiling of her ambition.',
  'drama', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/zMyEVrSTd2s/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=zMyEVrSTd2s',
  0, 0, NULL, NULL,
  'Nollywood, drama, epic, queen, matriarch, Destiny Etiko, Zubby Michael, 2026, trending',
  'Engages with the role of the queen mother figure in Nigerian royal traditions, a position of significant political and social power underrepresented in Nollywood until recently.',
  'streaming', false
),

(
  'Arrival of Trouble',
  'Ebube Obio and Sonia Uche lead this sharp 2026 Nollywood drama about what happens when a new arrival disrupts a carefully balanced household. Tense, well-observed, and anchored by two very committed performances.',
  'Before the arrival, everything was fine. Arrival of Trouble is a 2026 Nollywood drama that works backward from a household in crisis to show precisely how and why balance is always more fragile than it appears.',
  'drama', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/nCQnmc9CpN8/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=nCQnmc9CpN8',
  0, 0, NULL, NULL,
  'Nollywood, drama, household, disruption, family, Ebube Obio, Sonia Uche, 2026',
  'Engages with the Nigerian extended family dynamic in which new arrivals can fundamentally alter the power structure of a household.',
  'streaming', false
),

(
  'Bambi',
  'Ebube Obio, Patience Ozokwo, and Sochi Infiniti headline this emotionally ambitious 2026 Nollywood drama about innocence, loss, and the complicated love between generations. A film of surprising depth and genuine feeling.',
  'The name Bambi carries the weight of everything that is fragile and beautiful and gone too soon. This 2026 Nollywood drama builds an emotional story around that weight, following the relationship between a grandmother, a mother, and the child who connects them.',
  'drama', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/GbHpjLTnahA/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=GbHpjLTnahA',
  0, 0, NULL, NULL,
  'Nollywood, drama, family, generations, innocence, Ebube Obio, Patience Ozokwo, Sochi Infiniti, 2026',
  'A multigenerational Nigerian family drama exploring the relationships between grandmothers, mothers, and children in a culture where grandparents play a central role in upbringing.',
  'streaming', false
),

(
  'The Wife Nobody Wanted',
  'Ebube Obio delivers a brilliantly comedic performance in this 2026 Nollywood comedy about a woman whose repeated rejection at the matrimonial market she was never interested in entering becomes the best thing that ever happened to her.',
  'Everyone around her is determined to find her a husband. She is equally determined to make that impossible. The Wife Nobody Wanted is a 2026 Nollywood comedy that is funnier every time Ebube Obio decides not to cooperate with what her family has planned.',
  'comedy', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/8rtE1sSmLpo/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=8rtE1sSmLpo',
  0, 0, NULL, NULL,
  'Nollywood, comedy, marriage, independence, Ebube Obio, 2026, trending, funny',
  'Engages with the Nigerian cultural pressure on women to marry by a certain age, satirising the institution of matchmaking while remaining affectionate about the families driving it.',
  'streaming', false
),

(
  'The Widow''s Daughter',
  'Sonia Uche, Chinenye Nnebe, and Patience Ozokwor combine in this 2026 Nollywood drama about the peculiar inheritance of growing up in a household shaped by loss. A mature, emotionally honest film about what widowhood costs the whole family.',
  'Her mother has been a widow for as long as she can remember. The Widow''s Daughter is a 2026 Nollywood drama that examines the psychological inheritance of a household built around absence, and the way daughters carry the emotional weight of their mothers'' grief.',
  'drama', 'english', 2026, 'Nigeria',
  'https://img.youtube.com/vi/qEvZ9JOuIHo/maxresdefault.jpg',
  'https://www.youtube.com/watch?v=qEvZ9JOuIHo',
  0, 0, NULL, NULL,
  'Nollywood, drama, widow, mother, daughter, grief, Sonia Uche, Chinenye Nnebe, Patience Ozokwor, 2026',
  'Engages with the Nigerian cultural experience of widowhood, including the rituals, social stigma, and economic vulnerability that shape the lives of widows and their children.',
  'streaming', false
);

-- Verify the import
SELECT
  COUNT(*) AS total_imported,
  COUNT(CASE WHEN release_year = 2025 THEN 1 END) AS year_2025,
  COUNT(CASE WHEN release_year = 2026 THEN 1 END) AS year_2026
FROM movies
WHERE youtube_url LIKE 'https://www.youtube.com/watch?v=%'
  AND created_at >= NOW() - INTERVAL '5 minutes';

