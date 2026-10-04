import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, P, UL, type LegalSection } from '@/components/LegalPage'
import { SITE_URL } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Terms: Using MuvieStars',
  description: 'The rules for using MuvieStars: what you post, how ratings and votes must be honest, submitting films, how honours and laurels work, and what we promise in return.',
  alternates: { canonical: `${SITE_URL}/terms` },
}

const SECTIONS: LegalSection[] = [
  {
    id: 'using',
    title: 'Using MuvieStars',
    body: (
      <>
        <P>By making an account or using the site, you agree to these terms. If you do not agree, please do not use MuvieStars.</P>
        <UL>
          <li>You must be 16 or older.</li>
          <li>Give true details, and keep your sign-in to yourself.</li>
          <li>One person, one account. You are responsible for what happens on yours.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'posting',
    title: 'What you post',
    body: (
      <>
        <P>Your takes, reviews, lists, bio and picture belong to you. By posting them you let MuvieStars store them, show them on the site and quote them on take cards and in search results, with your display name unless you chose otherwise. This permission is not exclusive, and it ends for anything you delete, apart from copies already shared by other people.</P>
        <P>Post your own honest opinion. Do not post anything that:</P>
        <UL>
          <li>attacks someone for who they are, or threatens or harasses them;</li>
          <li>states false facts that could harm a real person’s name;</li>
          <li>is spam, an advert, or copied from somebody else;</li>
          <li>reviews a film you made or worked on without saying so;</li>
          <li>you were paid or rewarded to say.</li>
        </UL>
        <P>We can remove content that breaks these rules, and we may suspend accounts that keep breaking them.</P>
      </>
    ),
  },
  {
    id: 'honest',
    title: 'Ratings and votes must be real',
    body: (
      <>
        <P>MuvieStars is only worth anything if the numbers are honest. So:</P>
        <UL>
          <li>Do not make extra accounts, or use someone else’s, to rate, take or vote.</li>
          <li>Do not buy, sell, trade or organise votes or ratings, and do not ask a crowd to pile onto a film.</li>
          <li>Do not use scripts or tools to rate or vote in bulk.</li>
        </UL>
        <P>We check for this. If we find it, we can set the votes aside, remove the ratings, suspend the accounts, and disqualify a film or person from an honour. When a vote is set aside by a person, the reason is written down.</P>
      </>
    ),
  },
  {
    id: 'submit',
    title: 'Submitting and nominating films',
    body: (
      <>
        <P>Anyone can nominate a film. To submit one, you confirm that you made it, own the rights to it, or are authorised to speak for the people who do. If that is not true, do not submit it.</P>
        <UL>
          <li>Keep your details accurate, including the link that shows the film exists.</li>
          <li>You let MuvieStars show the film’s title, synopsis, poster and links on the site.</li>
          <li>We decide what is listed, using the standard on the <Link href="/how-listing-works" style={{ color: '#C8963E' }}>how listing works</Link> page. We may ask for more, decline, or remove a listing that turns out to be wrong.</li>
          <li>Money cannot get a film listed, ranked or recognised. Sponsors, if there ever are any, are named as sponsors and have no say in any decision.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'honours',
    title: 'Honours and Selections',
    body: (
      <>
        <P>Each honour is decided by the rules published on its page before voting starts. Judges are named. Anyone connected to a nominee steps out of judging it.</P>
        <P>Winning is not owed to anyone. We can disqualify a nominee who broke the rules, and a result we got wrong will be corrected in the open. When that happens, the old record stays on the site with an explanation, and a corrected winner gets a new verification ID. Nothing is changed in silence.</P>
      </>
    ),
  },
  {
    id: 'laurels',
    title: 'Using a laurel',
    body: (
      <>
        <P>A laurel is MuvieStars’ mark of a real honour. If your film or work has won one, you may use it, with these conditions.</P>
        <UL>
          <li>Use it only for the film or person named on it, and leave the wording and the verification ID as they are.</li>
          <li>Do not draw a new one, or use the MuvieStars name to suggest we back something else.</li>
          <li>If the honour is corrected or withdrawn, take the laurel down. Its record page will say if that has happened.</li>
          <li>The production files go to MuvieStars’ awards team and the account that got the film listed. Do not pass them on to people who have no right to them.</li>
        </UL>
        <P>We can withdraw permission to use a laurel if these conditions are broken.</P>
      </>
    ),
  },
  {
    id: 'films',
    title: 'Films, links and information',
    body: (
      <>
        <P>Film details come from filmmakers, public sources and our editors. We work to get them right, and we will fix what we are told is wrong. Films play from other platforms, such as YouTube, which belong to other people and have their own rules. We do not host the films and we do not control those platforms.</P>
        <P>If something on MuvieStars infringes your rights, or a film’s details are wrong, write to hello@muviestars.com with the page address and what needs to change.</P>
      </>
    ),
  },
  {
    id: 'ours',
    title: 'What belongs to MuvieStars',
    body: (
      <P>The site’s design, code, text and the way its data is organised belong to MuvieStars. You may read it, share links to it and quote it fairly with credit. Do not copy the site in bulk, scrape it, or use it to build a competing database of our data without asking us first.</P>
    ),
  },
  {
    id: 'ending',
    title: 'Stopping',
    body: (
      <P>You can stop using MuvieStars whenever you like and ask us to delete your account, as the <Link href="/privacy" style={{ color: '#C8963E' }}>privacy page</Link> explains. We can suspend or close an account that breaks these terms, and we will tell you why unless the law stops us.</P>
    ),
  },
  {
    id: 'promise',
    title: 'What we promise, and what we cannot',
    body: (
      <>
        <P>We run MuvieStars with care, but the site is free and comes as it is. It may go down, change or lose a feature, and we cannot promise that every film detail is complete or that a link will keep working.</P>
        <P>As far as the law of Ghana allows, MuvieStars is not responsible for losses that come from using the site, from what other users post, or from the platforms films play on. Nothing here limits any right you have under the law that cannot be limited.</P>
      </>
    ),
  },
  {
    id: 'law',
    title: 'The law that applies',
    body: <P>These terms are governed by the laws of Ghana. If we disagree about anything, write to us first and we will try to settle it. If that fails, the courts of Ghana decide.</P>,
  },
  {
    id: 'changes',
    title: 'When these terms change',
    body: <P>We update these terms when the site changes. The date at the top says when. If a change matters to how you use MuvieStars, we say so on the site before it starts. Using the site after that means you accept the change.</P>,
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="The rules for using MuvieStars, written to be read."
      intro="MuvieStars only works if the ratings, takes and votes on it are honest. These terms are mostly about keeping them that way, and about what you can count on from us."
      updated="4 October 2026"
      summary={[
        'You must be 16 or older. One person, one account.',
        'Your takes are yours. You let us show them on the site, and you can delete them.',
        'Do not fake ratings or votes. We check, and we act on what we find.',
        'Nobody can pay to be listed, ranked or honoured. Mistakes in an honour are corrected in the open.',
        'A laurel may be used for the work it names, exactly as issued, until the honour is withdrawn.',
      ]}
      sections={SECTIONS}
      otherPage={{ href: '/privacy', label: 'Privacy page' }}
    />
  )
}
