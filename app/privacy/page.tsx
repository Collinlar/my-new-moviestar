import type { Metadata } from 'next'
import { LegalPage, P, UL, type LegalSection } from '@/components/LegalPage'
import { SITE_URL } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Privacy: What MuvieStars Keeps About You',
  description: 'What MuvieStars collects, what is public, how awards votes are protected, how long we keep things, and how to have your data deleted.',
  alternates: { canonical: `${SITE_URL}/privacy` },
}

const SECTIONS: LegalSection[] = [
  {
    id: 'who',
    title: 'Who is responsible for your data',
    body: (
      <>
        <P>MuvieStars, based in Accra, Ghana, decides what is collected on this site and why. We handle personal data under the Data Protection Act, 2012 (Act 843) of Ghana.</P>
        <P>For anything in this page, write to hello@muviestars.com. A person reads it.</P>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <>
        <P>Only what the site needs to work. Here is the full list.</P>
        <UL>
          <li><strong>Your account.</strong> Your email address. If you sign in with Google, the name and picture Google shares with us. The display name, username, bio and picture you choose to put on your profile.</li>
          <li><strong>What you do on the site.</strong> Your ratings, takes and reviews, the performance or direction you said stood out, your watchlist and lists, your Swipe and mood choices, your decks, Club and challenge activity, and your votes in the awards.</li>
          <li><strong>Films you submit or nominate.</strong> The details you type in, including the contact email on a submission and the link you give as proof the film exists.</li>
          <li><strong>Shared links.</strong> When someone opens a take card or laurel link you shared, we record the visit. If they are signed in, we record which account.</li>
          <li><strong>Awards votes.</strong> One scrambled version of the connection address each vote came from. See the awards section below.</li>
          <li><strong>Laurel downloads.</strong> Which account downloaded which file, and when.</li>
          <li><strong>Visits.</strong> We use Google Analytics to see which pages are read, on what kind of device, and roughly where from. Our host keeps ordinary server logs.</li>
        </UL>
        <P>We do not collect payment details, phone numbers, government ID numbers or your exact location. MuvieStars does not take payments.</P>
      </>
    ),
  },
  {
    id: 'public',
    title: 'What other people can see',
    body: (
      <>
        <UL>
          <li>Your display name, username, picture and bio, on your profile page.</li>
          <li>Your takes and reviews, with your display name, on the film pages they belong to and on your profile.</li>
          <li>On a take card or laurel you share, your name appears only if you tick the box to show it. It starts switched off.</li>
        </UL>
        <P>How you voted in the awards is not public. Nobody sees a live count while voting is open. Awards administrators can see votes when they check for fraud, and nobody else can.</P>
      </>
    ),
  },
  {
    id: 'why',
    title: 'Why we use it',
    body: (
      <>
        <UL>
          <li>To run your account and show your takes where you meant them to appear.</li>
          <li>To recommend films, build your Movie DNA and keep your watchlist.</li>
          <li>To run the awards fairly, and to spot people gaming them.</li>
          <li>To decide whether a submitted film can be listed, and to tell the submitter what happened.</li>
          <li>To see what is read and what is broken, so we can improve the site.</li>
          <li>To meet the law when it requires something of us.</li>
        </UL>
        <P>We rely on your agreement when you create an account or tick a box, on running the service you asked for, and on our legitimate interest in keeping the site honest and working. We do not sell your data and we do not show advertising.</P>
      </>
    ),
  },
  {
    id: 'awards',
    title: 'The awards and your connection address',
    body: (
      <>
        <P>To catch one person voting many times, each vote keeps a scrambled version of the connection address it came from. It is a one-way scramble with a secret key. We cannot turn it back into the address. We only compare scrambles to see whether many votes share one.</P>
        <UL>
          <li>It is kept for up to 90 days, then removed. A daily clean-up does this, and any vote cast also triggers it.</li>
          <li>It is used for fraud checks and nothing else.</li>
          <li>A flag never removes a vote by itself. A person looks at it and has to write down why before a vote is set aside.</li>
        </UL>
        <P>Judges’ scores are private to the judge and the awards team. The record of awards decisions notes that a vote was cast, and which account cast it. If you delete your account, it is detached from that entry. The entry stays, so the record of how the awards were run stays whole.</P>
      </>
    ),
  },
  {
    id: 'share',
    title: 'Who we share it with',
    body: (
      <>
        <P>We use a few services to run MuvieStars. They handle data for us and only for that purpose.</P>
        <UL>
          <li><strong>Supabase</strong> keeps our database and handles sign-in.</li>
          <li><strong>Vercel</strong> hosts the site.</li>
          <li><strong>Google</strong> provides sign-in if you choose it, and Analytics if you say yes to the cookie question.</li>
          <li><strong>YouTube</strong> plays films and trailers we embed. YouTube may set its own cookies when you press play.</li>
        </UL>
        <P>These services keep data on servers outside Ghana. We also share information when the law requires it, for example a valid order from a court.</P>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: (
      <>
        <P>An essential cookie keeps you signed in. It needs no yes from you. Google Analytics sets cookies to count visits, and it only loads after you say yes in the cookie question. If you say no, nothing from Google Analytics loads.</P>
        <P>You can change your answer any time with “Cookie choices” at the bottom of any page. Saying no after a yes clears the Google Analytics cookies we can reach. YouTube may set its own cookies when you play an embedded film. The site’s fonts are kept on our own servers, so opening a page sends nothing to Google unless you chose Google sign-in or said yes to Analytics.</P>
        <P>You can also block or clear cookies in your browser settings. The site still works if you do, apart from staying signed in.</P>
      </>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    body: (
      <UL>
        <li>Account, profile, takes, lists and activity: until you ask us to delete them.</li>
        <li>Connection scrambles on awards votes: up to 90 days.</li>
        <li>Film submissions: while your account exists, so a listing can be traced to the person who asked for it. They go when you delete your account, and the film stays.</li>
        <li>Laurel download log: as long as the honour it belongs to exists. Your account is detached from it if you delete your account.</li>
        <li>Published honours and their verification pages: permanently. They are public records about films and people’s work, not about visitors.</li>
      </UL>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights, and how to use them',
    body: (
      <>
        <P>You can ask to see what we hold about you, have something corrected, object to how we use it, take back an agreement you gave, or have your data deleted.</P>
        <P>To delete your account, use the button at the bottom of your account page. It works at once and cannot be undone. For anything else, or if you cannot sign in, write to hello@muviestars.com from the email address on your account. We reply within 30 days.</P>
        <P>Deleting your account removes your profile, takes, reviews, lists, watchlist, votes and activity. Films you got listed stay on MuvieStars, because a film is not personal data. If you are unhappy with how we handled your request, you can complain to the Data Protection Commission of Ghana.</P>
      </>
    ),
  },
  {
    id: 'age',
    title: 'Age',
    body: <P>MuvieStars is for people aged 16 and over. If you think a younger person has made an account, tell us and we will remove it.</P>,
  },
  {
    id: 'safe',
    title: 'Keeping it safe',
    body: (
      <>
        <P>Data is encrypted as it travels between you and the site. Our database applies access rules, so private records can be read only by their owner and the few staff who need them, and the awards tools are open to administrators only. No system is perfect. If we ever learn that your data was exposed, we will tell you and say what happened.</P>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'When this changes',
    body: <P>We change this page when what we do changes. The date at the top says when. If a change affects how your data is used, we say so on the site before it takes effect.</P>,
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="What MuvieStars keeps about you, and what it does with it."
      intro="You take films. We keep what you gave us to do that, and nothing more. This page says what that is, who can see it, and how to have it removed."
      updated="4 October 2026"
      summary={[
        'We collect your email, your profile, and what you do on the site: ratings, takes, lists and votes.',
        'Your takes show your display name. How you voted in the awards is never public.',
        'Each awards vote keeps a scrambled connection address for up to 90 days, only to catch cheating.',
        'We do not sell your data and we do not run ads.',
        'You can delete your account yourself from your account page. Other requests go to hello@muviestars.com, and we reply within 30 days.',
      ]}
      sections={SECTIONS}
      otherPage={{ href: '/terms', label: 'Terms of use' }}
    />
  )
}
