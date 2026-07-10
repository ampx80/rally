// templates dataset - real, usable sales templates, scripts, and frameworks.
// Rendered by the SeoPage `template` template. NO em-dash / en-dash. ASCII hyphen only.
// Compact source rows are mapped into full page entries (see comparisons.js exemplar).

const YEAR = 2026;

const TEMPLATES = [
  {
    slug: `cold-email-templates`,
    title: `Cold email templates for sales`,
    kw: `cold outreach examples, subject lines, best practices`,
    desc: `7 cold email templates that get replies in 2026, with real subject lines, opener copy, and a one-line ask you can paste and send.`,
    shortAnswer: `The best cold emails are short (under 120 words), lead with a specific reason you reached out, tie one relevant insight to the prospect's world, and end with a single low-friction ask. Below are proven templates you can paste and personalize in under two minutes each.`,
    intro: [
      `A cold email has one job: earn a reply, not close a deal. That means relevance over polish. Each template below opens with a trigger or observation, makes one point, and asks for a small yes.`,
      `Personalize the first line and the CTA. Everything else can stay close to the template.`,
    ],
    sections: [
      { h: `The trigger-event template`, body: `Best when something changed at the account (funding, hire, launch, expansion).`, bullets: [
        `Subject: congrats on the {round/role/launch}`,
        `Hi {First}, saw {company} just {trigger}. Teams hitting that stage usually run into {specific problem} fast.`,
        `We help {similar company type} {outcome} without {common pain}. {Peer} cut {metric} by {number} doing this.`,
        `Worth a 15-minute look next week? Happy to send a 2-minute Loom first if that is easier.`,
      ] },
      { h: `The one-metric template`, body: `Best for a cold, no-trigger prospect. Lead with a number.`, bullets: [
        `Subject: {number} for {company}?`,
        `Hi {First}, most {role} we work with lose about {number}% of {thing} to {problem}.`,
        `We fixed that for {peer} in under {timeframe}. Curious if it is on your radar this quarter.`,
        `Open to a quick call? Or reply "send info" and I will keep it to email.`,
      ] },
      { h: `The question template`, body: `Best for a soft, human open that lowers the guard.`, bullets: [
        `Subject: quick question, {First}`,
        `Hi {First}, how is your team handling {specific workflow} today?`,
        `Ask because {peers} kept telling us {old way} was costing them {pain}. We built something for exactly that.`,
        `If it is a priority, I can show you in 15 minutes. If not, no worries at all.`,
      ] },
    ],
    keyPoints: [
      `Keep it under 120 words and to one point. Reps who cut length see reply rates climb.`,
      `Personalize only two lines: the opener and the CTA. Do not rewrite the whole email.`,
      `Ask for a small yes ("worth a look?", "send info?"), not a 30-minute meeting up front.`,
      `Send a 3 to 5 email sequence, not one email. Most replies come from touch 2 through 4.`,
    ],
    faqs: [
      { q: `How long should a cold email be?`, a: `Under 120 words, ideally 50 to 90. A prospect decides in seconds whether to reply, and long emails read like work. Make one point, personalize the opener, and end with a single low-friction ask.` },
      { q: `What is the best cold email subject line?`, a: `Short, specific, and lowercase, like "quick question, {First}" or "{number} for {company}?". Avoid salesy phrases and ALL CAPS. Subject lines that look like a note from a colleague beat marketing copy nearly every time.` },
      { q: `How many follow-ups should a cold sequence have?`, a: `Three to five touches over two to three weeks. Most positive replies land on the second through fourth message, so a one-and-done email leaves most of your responses on the table.` },
    ],
  },
  {
    slug: `sales-follow-up-email-templates`,
    title: `Sales follow-up email templates`,
    kw: `after no response, after meeting, after demo`,
    desc: `6 follow-up email templates for every stage: after no reply, after a meeting, after a demo, after a proposal. Real copy, ready to send.`,
    shortAnswer: `A good follow-up adds value or context instead of just "checking in." Reference the last touch, give the prospect a reason to reply now, and make the next step obvious. Below are templates for the moments that matter most: no response, post-meeting, post-demo, and post-proposal.`,
    intro: [
      `Most deals need five or more touches, yet many reps stop after one. The difference between a nag and a helpful follow-up is that the helpful one moves the deal forward with new value.`,
      `Use these after the specific moment they name, and always end with a concrete next step.`,
    ],
    sections: [
      { h: `After no response`, body: `Do not say "just following up." Add a reason to reply.`, bullets: [
        `Subject: re: {original subject}`,
        `Hi {First}, floating this back up. Since I wrote, {new proof point or resource}.`,
        `Still worth a quick look? If the timing is off, tell me when to circle back and I will get out of your inbox.`,
      ] },
      { h: `After a discovery meeting`, body: `Send within 24 hours. Recap, confirm, lock the next step.`, bullets: [
        `Subject: recap + next steps from today`,
        `Hi {First}, thanks for the time. Quick recap of what I heard: {problem 1}, {problem 2}, and a goal of {outcome} by {date}.`,
        `Next step we agreed on: {action} by {date}. I have also attached {resource}. Anything I missed?`,
      ] },
      { h: `After a demo, after a proposal`, body: `Reinforce what landed, remove the last blocker, create gentle urgency.`, bullets: [
        `Demo: "Glad {feature} resonated. To your question about {objection}, here is how {peer} handled it: {answer}. Ready to trial it, or loop in {stakeholder} first?"`,
        `Proposal: "Want to make sure the proposal is clear before {decision date}. Happy to walk through pricing on 15 minutes, or if you are ready I can send the agreement today."`,
      ] },
    ],
    keyPoints: [
      `Never write "just checking in." Add a resource, proof point, or recap every time.`,
      `Send the post-meeting recap within 24 hours while the conversation is fresh.`,
      `Always end with one specific next step and a date, not an open-ended "let me know."`,
      `Space follow-ups 2 to 4 days early, then widen to weekly. Give a clear off-ramp.`,
    ],
    faqs: [
      { q: `How long should I wait to follow up?`, a: `Two to three business days after the first email, then widen the gap: day 2, day 5, day 10, day 17. After a meeting, follow up within 24 hours while it is fresh. Consistent spacing beats random bursts.` },
      { q: `What should I say instead of "just checking in"?`, a: `Give a reason to reply: share a new resource, reference a trigger event, recap what you discussed, or ask a specific question. "Checking in" puts the work on the prospect. Adding value earns the reply.` },
      { q: `How many times can I follow up before it is annoying?`, a: `Five to seven touches is normal in B2B, as long as each adds something and you offer an off-ramp. Always include a line like "tell me when to circle back" so the prospect can redirect you instead of ignoring you.` },
    ],
  },
  {
    slug: `break-up-email-template`,
    title: `Break-up email template`,
    kw: `closing the loop, final follow-up, examples`,
    desc: `A proven break-up email template to end a stalled thread and often revive it. Real copy plus 3 variations that get high reply rates.`,
    shortAnswer: `A break-up email is the last message in a sequence that politely closes the loop when a prospect has gone silent. Counterintuitively it often gets the highest reply rate because it removes pressure and triggers loss aversion. Keep it short, warm, and genuinely final. Below are the template and three variations.`,
    intro: [
      `The break-up email works because it flips the dynamic: instead of chasing, you are walking away. That lowers the prospect's guard and often surfaces the real reason for silence.`,
      `Be sincere. If it reads like a manipulation tactic, it fails. If it reads like a respectful goodbye, it converts.`,
    ],
    sections: [
      { h: `The core template`, body: `Short, no guilt, easy to reply to.`, bullets: [
        `Subject: closing the loop`,
        `Hi {First}, I have reached out a few times about {topic} and have not heard back, which usually means one of three things: it is not a priority right now, the timing is off, or I have landed in the wrong inbox.`,
        `Totally fine either way. If you want me to close this out, just ignore this note and I will stop reaching out. If it is worth revisiting, reply with one word and I will pick it back up.`,
        `Either way, thanks for your time.`,
      ] },
      { h: `Two variations`, body: `Swap the angle to fit the situation.`, bullets: [
        `Wrong person: "This is my last email. If {topic} is not yours to own, could you point me to the right person? If it is just bad timing, tell me when to check back."`,
        `Give value and go: "I will stop reaching out after this. Before I go, here is {resource} that {peers} found useful for {problem}, no strings attached."`,
      ] },
    ],
    keyPoints: [
      `Send it as the final touch of a sequence, after 4 to 6 prior attempts.`,
      `Make it genuinely final. Following up after a break-up email kills the tactic.`,
      `Give an easy, low-effort way to re-engage ("reply with one word").`,
      `Keep the tone warm and free of guilt. Loss aversion works; guilt-tripping backfires.`,
    ],
    faqs: [
      { q: `Why do break-up emails get so many replies?`, a: `They trigger loss aversion. The prospect realizes the option is about to disappear, and the lack of pressure makes replying feel safe. Many reps see break-up emails outperform every other touch in a sequence.` },
      { q: `Should I actually stop reaching out after a break-up email?`, a: `Yes, for that sequence. The email only works because it is sincere. You can re-enroll the contact in a new campaign months later around a fresh trigger, but chasing them the week after undercuts the whole tactic.` },
      { q: `When should I send a break-up email?`, a: `As the last message after four to six unanswered touches over two to three weeks. Sending it too early wastes the strongest card in your deck before you have earned the right to play it.` },
    ],
  },
  {
    slug: `meeting-request-email-template`,
    title: `Meeting request email template`,
    kw: `how to ask for a meeting, examples, subject lines`,
    desc: `Meeting request email templates that book the call: give a reason, propose specific times, keep it under 90 words. Copy and send.`,
    shortAnswer: `A strong meeting request states why the meeting matters to the prospect, proposes two or three specific time slots, and keeps the ask small and easy to accept. Vague "do you have time to chat?" emails stall; specific ones book. Below are templates for cold, warm, and internal meeting requests.`,
    intro: [
      `The fastest way to kill a meeting request is to make the reader do the scheduling math. Propose concrete times and a clear agenda, and you remove the friction.`,
      `Lead with their benefit, not your desire to "connect."`,
    ],
    sections: [
      { h: `Cold and warm requests`, body: `Reason first, then two specific slots.`, bullets: [
        `Cold: "Hi {First}, I work with {role} at {similar companies} on {problem}. Based on {trigger}, there may be a quick win for {company}. Would Tuesday at 10am or Thursday at 2pm work for a focused 15 minutes?"`,
        `Warm: "Hi {First}, {referrer} mentioned you are looking at {problem}. I have helped a few teams with exactly that. Are you free Wednesday at 11am or Friday at 9am for 20 minutes?"`,
      ] },
      { h: `Internal or stakeholder request`, body: `State the decision and who should attend.`, bullets: [
        `Subject: 30 min to decide on {topic}`,
        `Hi team, we need to align on {decision} before {deadline}. I will bring {materials} and we will leave with a go / no-go.`,
        `Proposing Thursday at 1pm. Reply if that does not work and I will find another slot.`,
      ] },
    ],
    keyPoints: [
      `Propose two or three specific times so the prospect picks instead of scheduling from scratch.`,
      `State the outcome or agenda in the subject line, not just "meeting" or "chat."`,
      `Keep it under 90 words and specify the exact length (15, 20, or 30 minutes).`,
      `Offer an easy fallback: "if none of these work, send a time that does."`,
    ],
    faqs: [
      { q: `Should I include a scheduling link or propose times?`, a: `For cold outreach, propose two or three specific times. A booking link can feel presumptuous before there is any relationship. Once the prospect is engaged, a scheduling link removes back-and-forth and is welcome.` },
      { q: `How do I ask for a meeting without sounding pushy?`, a: `Lead with the prospect's benefit, keep the ask small (15 minutes), and give an easy out. "Worth 15 minutes to see if this is relevant?" respects their time more than "I would love to get on your calendar."` },
      { q: `What is the ideal length to request?`, a: `Fifteen minutes for a cold first call. It is a low commitment and easy to say yes to. Reserve 30 or 45 minutes for warm prospects or demos where you have already earned the time.` },
    ],
  },
  {
    slug: `sales-email-subject-lines`,
    title: `Sales email subject lines that get opened`,
    kw: `cold email, follow-up, best examples`,
    desc: `50+ sales email subject lines proven to lift open rates, sorted by scenario: cold, follow-up, break-up, re-engagement. Copy and test.`,
    shortAnswer: `The best sales subject lines are short (3 to 6 words), specific, lowercase, and look like a note from a colleague rather than a marketing blast. Avoid spammy words and clickbait. Below are subject lines sorted by scenario, plus the formula for writing your own.`,
    intro: [
      `Your subject line has one job: earn the open. It should create curiosity or relevance without overpromising, because a misleading subject that gets opened still gets deleted.`,
      `Test in small batches. Two subject lines on 50 sends each will teach you more than guessing.`,
    ],
    sections: [
      { h: `Cold outreach subject lines`, body: `Short, specific, human.`, bullets: [
        `quick question, {First}`,
        `{number} for {company}?`,
        `idea for {team} at {company}`,
        `congrats on {trigger}`,
        `{peer company} + {their goal}`,
        `re: {their initiative}`,
      ] },
      { h: `Follow-up subject lines`, body: `Reuse the thread or add a hook.`, bullets: [
        `re: {original subject}`,
        `one more thing on {topic}`,
        `should I close this out?`,
        `{First}, still worth a look?`,
        `thought of you when I saw this`,
      ] },
      { h: `Break-up and re-engagement subject lines`, body: `Trigger loss aversion or restart cleanly.`, bullets: [
        `closing the loop`,
        `last note from me`,
        `permission to close your file?`,
        `is {problem} still a priority?`,
        `it has been a minute, {First}`,
      ] },
    ],
    keyPoints: [
      `Keep subject lines to 3 to 6 words so they fully display on mobile.`,
      `Lowercase and no punctuation gimmicks read as personal, not promotional.`,
      `Never mislead. A clickbait subject earns the open and loses the reply.`,
      `A/B test two lines per campaign and keep the winner in your library.`,
    ],
    faqs: [
      { q: `What makes a subject line spammy?`, a: `ALL CAPS, exclamation points, "free," "guaranteed," "act now," and money symbols trip spam filters and pattern-match as marketing. Write the way you would email a colleague: lowercase, short, specific, and free of hype.` },
      { q: `Should subject lines be personalized?`, a: `When you can do it authentically, yes. A company name, a trigger event, or a first name lifts opens. But a generic-but-relevant line beats a personalized-but-forced one, so never stuff in a token just to have it.` },
      { q: `Do questions work well as subject lines?`, a: `Yes. A specific, relevant question ("is {problem} still a priority?") creates an open loop the brain wants to close. Keep it genuine and tied to the prospect's world, not a rhetorical gimmick.` },
    ],
  },
  {
    slug: `linkedin-connection-message-templates`,
    title: `LinkedIn connection message templates`,
    kw: `connection request, note examples, that get accepted`,
    desc: `LinkedIn connection request templates under 300 characters that get accepted and start conversations without pitching. Copy and send.`,
    shortAnswer: `A LinkedIn connection request works best under 300 characters, personalized to something real about the person, and free of any pitch. The templates below cover a shared connection, a shared interest, a trigger event, and a post they wrote, each designed to get accepted without triggering the spammer reflex.`,
    intro: [
      `The mistake is pitching in the connection note. Get accepted first, build a little rapport, then earn the conversation.`,
      `Keep the note human and specific. Never sell on the invite.`,
    ],
    sections: [
      { h: `Warm-angle connection notes`, body: `Lead with the thing you have in common.`, bullets: [
        `Shared connection: "Hi {First}, we are both connected to {Mutual} and I have enjoyed your posts on {topic}. Would love to stay in touch."`,
        `Shared interest: "Hi {First}, fellow {industry/role} here. I liked your take on {topic} and thought it would be good to connect."`,
        `Same event: "Hi {First}, we both attended {event}. Wish we had met in person. Connecting to keep the conversation going."`,
      ] },
      { h: `Trigger, content, and the follow-up`, body: `Reference what just happened, then a no-pitch message once accepted.`, bullets: [
        `Trigger: "Hi {First}, congrats on {new role / funding / launch}. I work with {role}s navigating that stage and would love to connect."`,
        `Their post: "Hi {First}, your post on {topic} resonated, especially the point about {detail}. Connecting to follow more of your thinking."`,
        `After they accept: "Thanks for connecting, {First}. Genuinely curious, how are you handling {relevant challenge} these days?"`,
      ] },
    ],
    keyPoints: [
      `Stay under 300 characters, the limit for a connection-request note.`,
      `Reference something real about the person; blank requests get accepted far less.`,
      `Never pitch on the invite. Get accepted, build rapport, then earn the conversation.`,
      `Wait a day or two after acceptance before any value-add message.`,
    ],
    faqs: [
      { q: `Should I include a note with a LinkedIn connection request?`, a: `Yes, a short personalized one. Notes referencing something real about the person get accepted far more than blank requests, and they set up a natural follow-up.` },
      { q: `How long should a LinkedIn connection message be?`, a: `Under 300 characters, which is the limit for a note on a connection request. One or two sentences that reference the person and ask for nothing is ideal.` },
      { q: `Should I pitch in the connection request?`, a: `No. Pitching on the invite is the fastest way to get ignored or reported. Get accepted, build rapport, then earn the conversation.` },
    ],
  },
  {
    slug: `linkedin-inmail-templates`,
    title: `LinkedIn InMail templates`,
    kw: `cold InMail, subject lines, that get replies`,
    desc: `LinkedIn InMail templates with strong subject lines and short bodies that earn replies from cold prospects. Personalized, mobile-first copy.`,
    shortAnswer: `A LinkedIn InMail is a paid cold message, so it must earn its cost with a specific subject line, a personalized first line, and one clear ask. The templates below cover a trigger event, a mutual interest, a problem hook, and a re-engagement, all short enough to read on mobile.`,
    intro: [
      `InMail reaches people who have not connected, but the credit is wasted if the message reads like a template. Personalize the opener and keep the body to three or four sentences.`,
      `Ask for a small next step, not a full meeting up front.`,
    ],
    sections: [
      { h: `Subject lines that get opened`, body: `The subject decides whether the InMail is read at all.`, bullets: [
        `quick question about {their team/process}`,
        `congrats on {event} + one idea`,
        `the {metric} problem most {role}s have`,
        `{Mutual} thought we should talk`,
      ] },
      { h: `Two ready InMails`, body: `Trigger-based and problem-based.`, bullets: [
        `Trigger: "Hi {First}, saw {company} just {trigger}. Teams at that stage usually hit {problem}. We helped {peer} {result}, and I had one idea that might apply. Worth a quick 15 minutes?"`,
        `Problem hook: "Hi {First}, most {role}s I talk to are losing {time/money} to {problem}. If that is on your radar, I would love to share how {peer} fixed it. If not, I will get out of your inbox."`,
      ] },
    ],
    keyPoints: [
      `Personalized InMails commonly see 10 to 25 percent reply rates, several times generic ones.`,
      `Keep the body to three or four sentences; it is read on mobile.`,
      `Spend the credit only on well-fit prospects; InMail is not for spray-and-pray.`,
      `Make one small ask and offer an easy out to lift replies.`,
    ],
    faqs: [
      { q: `What is a good InMail response rate?`, a: `Personalized InMails typically see 10 to 25 percent reply rates, several times higher than generic ones. The subject line and first sentence do most of the work.` },
      { q: `How long should a LinkedIn InMail be?`, a: `Three to four sentences. InMail is read on mobile; a wall of text gets archived. Personalize the opener, state the value, and make one small ask.` },
      { q: `How is InMail different from a connection request?`, a: `InMail reaches people you are not connected to and costs a credit, so it can carry a light pitch. A connection request should carry no pitch at all, just a reason to connect.` },
    ],
  },
  {
    slug: `referral-request-email-template`,
    title: `Referral request email template`,
    kw: `ask for a referral, introduction email, examples`,
    desc: `Referral request email templates for happy customers and network contacts that generate warm introductions. Includes a forwardable blurb.`,
    shortAnswer: `The best referral requests are specific: they name the type of person you want to meet and make the introduction effortless to forward. The templates below cover asking a happy customer, a network contact, and a new closed-won buyer, plus a forwardable blurb they can pass along verbatim.`,
    intro: [
      `Referrals convert several times better than cold outreach, but most reps never ask, or ask so vaguely that nothing happens.`,
      `Make it specific, make it easy, and give them a message they can forward without thinking.`,
    ],
    sections: [
      { h: `Asking a happy customer`, body: `Ask right after a win, and name the ideal referral.`, bullets: [
        `Subject: a quick favor`,
        `Hi {First}, thrilled that {result} is landing for your team. Is there one person you respect at another company wrestling with {problem}? A quick intro would mean a lot, and I promise to make you look good.`,
        `If it helps, here is a short blurb you can just forward.`,
      ] },
      { h: `The forwardable intro blurb`, body: `Give them copy they can paste, no editing needed.`, bullets: [
        `"Hi {Name}, I have been using {product} to {result} and thought of you given {their situation}. Worth a quick look. I will connect you with {Your name}, who runs point. No pressure at all."`,
      ] },
    ],
    keyPoints: [
      `Ask when the customer is happiest, right after a win or positive feedback.`,
      `Name the ideal referral ("a VP of Sales at a growing SaaS company"), not "anyone."`,
      `Provide a forwardable blurb so the referrer does zero writing.`,
      `Tag the referral source on the new lead so you can thank your best introducers.`,
    ],
    faqs: [
      { q: `When is the best time to ask for a referral?`, a: `Right after a customer experiences a win or gives positive feedback. Their enthusiasm is highest, and the ask feels natural rather than transactional.` },
      { q: `How do I make a referral easy to give?`, a: `Be specific about who you want to meet and provide a short, forwardable blurb they can paste without editing. The less work for the referrer, the more referrals you get.` },
      { q: `How do I track referrals?`, a: `Tag the referral source on the new lead in your CRM so you can see who sends your best pipeline and thank them. Rally links the referred deal back to the introducer automatically.` },
    ],
  },
  {
    slug: `renewal-email-template`,
    title: `Renewal email template`,
    kw: `contract renewal, subscription renewal, examples`,
    desc: `Renewal email templates that secure the resign early: lead with value delivered, confirm terms, and make renewing a one-click yes. Copy and send.`,
    shortAnswer: `A strong renewal email reminds the customer of the value they got, states the renewal terms clearly, and makes saying yes effortless. Start 60 to 90 days before the renewal date so there is room to handle questions. Below are templates for an on-track renewal, an at-risk account, and an upsell-at-renewal.`,
    intro: [
      `Renewals are won long before the email, but the email still matters. Lead with outcomes delivered, not "your contract is expiring."`,
      `Send early, be specific about value, and remove friction from the resign.`,
    ],
    sections: [
      { h: `On-track renewal`, body: `Lead with value, then confirm terms.`, bullets: [
        `Subject: your renewal + a quick recap of this year`,
        `Hi {First}, ahead of your {date} renewal, a quick recap: this year your team {result 1} and {result 2}. To keep that going, your renewal is {terms} starting {date}.`,
        `Reply "good to go" and I will send the paperwork, or grab 15 minutes if you want to review anything.`,
      ] },
      { h: `At-risk and upsell-at-renewal`, body: `Rebuild value or expand thoughtfully.`, bullets: [
        `At risk: "I want to make sure we have earned the renewal. Where has {product} fallen short, and what would make next year a clear win? Let us fix it before we talk terms."`,
        `Upsell: "Your usage grew {number}% this year. Moving to {tier/seats} would cover the whole team and unlock {feature}. Want me to include both options in the renewal?"`,
      ] },
    ],
    keyPoints: [
      `Start 60 to 90 days before the renewal date so there is room for questions.`,
      `Lead with value delivered, not "your contract is expiring."`,
      `Make the resign one click: "reply good to go and I will send paperwork."`,
      `Flag at-risk accounts early and fix the problem before discussing terms.`,
    ],
    faqs: [
      { q: `When should I send a renewal email?`, a: `Start 60 to 90 days before the renewal date for annual contracts. Early outreach leaves room to address concerns, handle procurement, and avoid a last-minute scramble that puts the renewal at risk.` },
      { q: `How do I renew an at-risk account?`, a: `Do not lead with terms. Ask where the product has fallen short and what would make next year a clear win, fix that first, then talk renewal. A renewal email cannot paper over a value gap.` },
      { q: `Should I upsell at renewal?`, a: `Only when usage or outcomes justify it. If the account grew or hit limits, present an expansion option alongside the flat renewal so the customer chooses. Forced upsells at renewal create churn risk.` },
    ],
  },
  {
    slug: `win-back-email-template`,
    title: `Win-back email template`,
    kw: `re-engage churned customers, lost deals, examples`,
    desc: `Win-back email templates to revive churned customers and closed-lost deals with a fresh reason to return. Real copy that reopens conversations.`,
    shortAnswer: `A win-back email revives a customer who left or a deal that went cold by leading with what changed: a new feature they wanted, a fixed problem, or a fresh offer. Acknowledge the gap honestly, then give a concrete reason to look again. Below are templates for churned customers and closed-lost deals.`,
    intro: [
      `Winning back a former customer is cheaper than finding a new one, and they already know your product. The key is honesty about why they left plus proof it is different now.`,
      `Do not pretend nothing happened. Name it, then move forward.`,
    ],
    sections: [
      { h: `Churned customer win-back`, body: `Acknowledge, show what changed, make it easy to return.`, bullets: [
        `Subject: what has changed since you left`,
        `Hi {First}, when your team moved off {product}, the sticking point was {reason}. That is fixed now: {specific change}.`,
        `I would love to earn you back. Want a quick look at what is new, or should I set up a fresh trial so you can see for yourself?`,
      ] },
      { h: `Closed-lost deal win-back`, body: `Revisit when the blocker changed.`, bullets: [
        `Subject: was the timing just off?`,
        `Hi {First}, we did not end up working together last {period}, and I always wondered if timing beat us. A lot has changed since: {1 line}. If {problem} is still around, I would love a second look.`,
      ] },
    ],
    keyPoints: [
      `Lead with what changed, not "we miss you." Give a concrete reason to return.`,
      `Name the original reason they left; honesty rebuilds trust faster than a discount.`,
      `Offer a low-friction re-entry: a fresh trial, a short call, or a migration hand.`,
      `Time it to a trigger (new feature shipped, their new fiscal year, a champion's new role).`,
    ],
    faqs: [
      { q: `How do I win back a churned customer?`, a: `Acknowledge why they left, show the specific thing that changed, and offer a low-friction way back like a fresh trial. Former customers already know your product, so proof it is different now does most of the work.` },
      { q: `Are closed-lost deals worth revisiting?`, a: `Yes. Many closed-lost deals lost on timing or a missing feature, not a hard no. Revisit them when the blocker changes or the account hits a trigger like funding or a leadership change.` },
      { q: `Should a win-back email include a discount?`, a: `Only if price was the real reason they left. Leading with a discount can cheapen the relationship and train customers to churn for deals. Lead with value and changed circumstances first.` },
    ],
  },
  {
    slug: `introduction-email-template`,
    title: `Introduction email template`,
    kw: `intro to a prospect, new account owner, examples`,
    desc: `Introduction email templates for new prospects, warm intros, and new account owners. Clear, brief copy that starts the relationship right.`,
    shortAnswer: `A good introduction email quickly says who you are, why you are relevant to the reader, and what you would like to happen next. Keep it warm and brief. Below are templates for introducing yourself to a cold prospect, following up on a mutual introduction, and taking over an account as the new owner.`,
    intro: [
      `First impressions compound. A clear, low-pressure intro sets up every message that follows.`,
      `Say who you are, why it matters to them, and one simple next step.`,
    ],
    sections: [
      { h: `Cold and warm-intro versions`, body: `Match the level of warmth.`, bullets: [
        `Cold: "Hi {First}, I lead {area} at {company} and work with {role}s on {problem}. Based on {trigger}, I thought it was worth introducing myself. Open to a quick 15 minutes to see if we can help?"`,
        `After a mutual intro: "Hi {First}, thanks to {Mutual} for connecting us. {Mutual} mentioned you are focused on {goal}. I have helped a few teams there and would love to compare notes. Does {time} or {time} work?"`,
      ] },
      { h: `New account owner intro`, body: `Reassure continuity, offer a fresh start.`, bullets: [
        `Subject: your new point of contact at {company}`,
        `Hi {First}, I am taking over as your main contact from {predecessor}, and I have read up on your account so nothing gets dropped. I would love a quick call to hear what is working and where I can help.`,
        `Are you free {time} or {time} next week?`,
      ] },
    ],
    keyPoints: [
      `Say who you are and why you are relevant in the first two sentences.`,
      `Keep it brief and low-pressure; the goal is a first reply, not a sale.`,
      `For account handoffs, reassure continuity and reference their history.`,
      `Always end with one simple next step or a light question.`,
    ],
    faqs: [
      { q: `How do I introduce myself in a sales email?`, a: `State your role, why you are relevant to the reader, and a light next step, all in under 90 words. Lead with their world, not your company history, and keep the pressure low.` },
      { q: `How do I follow up on a mutual introduction?`, a: `Thank the connector, reference what they told you about the prospect's goal, and propose two specific times. A warm intro converts best when you move quickly and keep the momentum from the referral.` },
      { q: `What should a new account owner say in an intro email?`, a: `Reassure continuity ("I have read up on your account so nothing gets dropped"), show you know their history, and ask for a short call to hear what is working. Handoffs are a churn-risk moment; a strong intro steadies it.` },
    ],
  },
  {
    slug: `re-engagement-email-template`,
    title: `Re-engagement email template`,
    kw: `reactivate cold leads, dormant contacts, examples`,
    desc: `Re-engagement email templates that wake up dormant leads with a fresh reason to talk: a shipped feature, a trigger event, or a new resource.`,
    shortAnswer: `A re-engagement email revives a lead who once showed interest but went cold. The key is a new reason to reconnect: a product update, a trigger event, a new resource, or a changed circumstance. Below are templates for dormant leads, old trials, and past champions who changed jobs.`,
    intro: [
      `Your best pipeline is often hiding in old, cold records. Re-engagement works when you lead with something new, not "just circling back."`,
      `Give a genuine reason and it reads as helpful, not as pressure.`,
    ],
    sections: [
      { h: `Product-update and trigger versions`, body: `Lead with what is new for them.`, bullets: [
        `Product update: "Hi {First}, when we last spoke you wanted {feature} before moving forward. It just shipped. Given {their goal}, thought you would want to know first. Worth 15 minutes to see the part you were waiting on?"`,
        `Trigger event: "Hi {First}, congrats on {funding / new role / launch}. Last time the timing was not right, but a move like that usually changes the math on {problem}. Worth revisiting?"`,
      ] },
      { h: `Past-champion (new job) version`, body: `The strongest re-engagement trigger.`, bullets: [
        `Subject: congrats on the new role`,
        `Hi {First}, congrats on joining {new company}. You were a fan of what we did at {old company}, and I would love to help you get the same result here. Open to a quick chat?`,
      ] },
    ],
    keyPoints: [
      `Lead with a shipped feature, trigger event, or fresh resource, never "circling back."`,
      `Quarterly is a safe cadence for dormant leads, or event-driven when a trigger fires.`,
      `A champion changing jobs is the single strongest re-engagement signal; set an alert.`,
      `Keep the ask small and give an easy out so it never reads as nagging.`,
    ],
    faqs: [
      { q: `How do I re-engage a cold lead without being annoying?`, a: `Lead with something new and relevant: a shipped feature they wanted, a trigger event, or a fresh resource. "Just circling back" reads as pressure; a genuine new reason reads as helpful.` },
      { q: `How often should I re-engage dormant leads?`, a: `Quarterly is a safe cadence, or event-driven when a trigger fires. Any more frequent without a new reason and you train them to ignore you.` },
      { q: `What is the best re-engagement trigger?`, a: `A champion changing jobs is the strongest: they already trust you and now have a new problem to solve. Set an alert so you catch the move early and reach out while the role is fresh.` },
    ],
  },
  {
    slug: `thank-you-email-after-meeting`,
    title: `Thank you email after a sales meeting`,
    kw: `follow-up recap, after a call, examples`,
    desc: `Thank you email templates to send after a sales meeting: recap the discussion, confirm next steps, and keep momentum. Send within 24 hours.`,
    shortAnswer: `A thank-you email after a sales meeting does more than express gratitude: it recaps what was discussed, confirms the agreed next step, and keeps momentum. Send it within 24 hours while the conversation is fresh. Below are templates for after a discovery call, after a demo, and after an executive meeting.`,
    intro: [
      `The follow-up recap is where deals are quietly won or lost. A clear one aligns everyone on what happens next and gives your champion something to forward.`,
      `Keep it short, specific, and action-oriented.`,
    ],
    sections: [
      { h: `After a discovery call`, body: `Recap, confirm priorities, lock the next step.`, bullets: [
        `Subject: thanks + recap from today`,
        `Hi {First}, thanks for the time today. What I heard: {problem 1}, {problem 2}, with a goal of {outcome} by {date}. You said {priority} matters most.`,
        `Next step we agreed on: {action} by {date}. I have attached {resource}. Anything I missed?`,
      ] },
      { h: `After a demo or exec meeting`, body: `Reinforce value, arm your champion.`, bullets: [
        `Demo: "Glad {feature} landed. Here is the {metric} for a team your size, plus the answer to {objection}. Next step: {action}. Can we lock {date}?"`,
        `Exec meeting: "Thank you for the time. To recap the business case: {problem} is costing ~{figure}, and we can return {ROI} in {timeframe}. I have attached a one-page summary you can share internally."`,
      ] },
    ],
    keyPoints: [
      `Send within 24 hours while the conversation is fresh.`,
      `Recap the buyer's priorities in their words to prove you listened.`,
      `Confirm one specific next step with a date, not "let me know."`,
      `Attach something forwardable so your champion can sell internally.`,
    ],
    faqs: [
      { q: `How soon should I send a thank-you email after a meeting?`, a: `Within 24 hours, ideally the same day. The recap is most useful while the discussion is fresh in everyone's mind, and a fast follow-up signals you are organized and easy to work with.` },
      { q: `What should a post-meeting recap include?`, a: `The problems you heard, the goal and its deadline, the agreed next step with a date, and any resources. Restating their priorities in their own words proves you listened and aligns the next conversation.` },
      { q: `Should a thank-you email be short or detailed?`, a: `Short and structured. A few crisp lines covering recap, next step, and an attachment beat a long essay. Your champion should be able to forward it internally without editing.` },
    ],
  },
  {
    slug: `proposal-follow-up-email-template`,
    title: `Proposal follow-up email template`,
    kw: `after sending a proposal, checking status, examples`,
    desc: `Proposal follow-up email templates that move a deal from sent to signed: surface blockers, offer to walk it through, and create gentle urgency.`,
    shortAnswer: `A proposal follow-up should make it easy to move forward, not just ask "did you see it?" Offer to walk it through, surface the likely blocker (budget, legal, a stakeholder), and remind them of the timeline. Below are templates for the first check-in, a stalled proposal, and a decision-deadline nudge.`,
    intro: [
      `Once a proposal is out, silence usually means an internal process, not a no. Your job is to help it move through that process.`,
      `Name the gating step and offer to help clear it.`,
    ],
    sections: [
      { h: `First check-in`, body: `Offer to clarify, surface the gating step.`, bullets: [
        `Subject: questions on the proposal?`,
        `Hi {First}, want to make sure the proposal is clear before {their decision date}. Happy to jump on 15 minutes to walk through pricing or the rollout plan.`,
        `One question that usually decides timing: is {budget/legal/approval} the gating step, or something on our side?`,
      ] },
      { h: `Stalled proposal and deadline nudge`, body: `Reduce friction or add gentle urgency.`, bullets: [
        `Stalled: "Hi {First}, checking whether the proposal is stuck on something I can help with. If it would help to adjust scope or terms, I have room to work with you. What is the holdup?"`,
        `Deadline: "To hit your target of {date}, we would need to sign by {date}. I have attached the agreement so it is ready when you are. Anything left to resolve?"`,
      ] },
    ],
    keyPoints: [
      `Do not just ask "did you see it?" Offer to walk it through live.`,
      `Name the likely gating step (budget, legal, a stakeholder) and offer to help clear it.`,
      `Tie the follow-up to the buyer's own target date to create real urgency.`,
      `Attach the agreement early so signing is one step away.`,
    ],
    faqs: [
      { q: `How long should I wait to follow up on a proposal?`, a: `24 to 48 hours for a first check-in, then every three to five days tied to their decision date. Proposals stall on internal process, not disinterest, so persistent-but-helpful follow-up moves them along.` },
      { q: `What do I say when a proposal goes silent?`, a: `Surface the blocker directly: "Is it stuck on budget, legal, or a stakeholder I can help with?" Offering to adjust scope or terms and to help sell internally does more than another "just checking in."` },
      { q: `How do I create urgency without pressure?`, a: `Anchor to the buyer's own timeline: "To hit your target of {date}, we would sign by {date}." Their deadline is more persuasive than an artificial one you invent.` },
    ],
  },
  {
    slug: `demo-follow-up-email-template`,
    title: `Demo follow-up email template`,
    kw: `after a product demo, recap, next steps`,
    desc: `Demo follow-up email templates that convert interest into a next step: recap the feature that landed, answer the open question, and propose a trial.`,
    shortAnswer: `A demo follow-up should reinforce the one capability that resonated, answer any open question, and propose a concrete next step like a trial or a stakeholder meeting. Send it the same day. Below are templates for a strong demo, a demo with an unresolved objection, and a multi-stakeholder demo.`,
    intro: [
      `Momentum fades fast after a demo. A same-day follow-up that reinforces value and names the next step keeps the deal moving.`,
      `Lead with what they reacted to, not a full feature list.`,
    ],
    sections: [
      { h: `Strong demo`, body: `Reinforce, quantify, propose the next step.`, bullets: [
        `Subject: the {feature} you liked`,
        `Hi {First}, glad {feature} resonated. For a team your size that usually means {quantified outcome}.`,
        `Logical next step is a {14-day trial / pilot}. Want me to set it up, or should we loop in {stakeholder} first?`,
      ] },
      { h: `Unresolved objection and multi-stakeholder`, body: `Close the gap or arm the champion.`, bullets: [
        `Objection: "You raised {concern} on the demo. Here is exactly how {peer} handled it: {answer}. Does that put it to rest, or is there more to work through?"`,
        `Multi-stakeholder: "Attached is a short recording of the demo and a one-pager for the folks who could not join. Happy to run a focused 20-minute session for {stakeholder}."`,
      ] },
    ],
    keyPoints: [
      `Send it the same day while the demo is fresh.`,
      `Lead with the single capability they reacted to, not a feature recap.`,
      `Quantify the outcome for a team their size to make value concrete.`,
      `Propose a specific next step: a trial, a pilot, or a stakeholder session.`,
    ],
    faqs: [
      { q: `When should I send a demo follow-up?`, a: `The same day, within a few hours if possible. Interest peaks right after the demo and fades quickly, so a fast, specific follow-up captures the momentum before competing priorities crowd it out.` },
      { q: `What should a demo follow-up focus on?`, a: `The one capability the buyer reacted to most, the answer to any open question, and a concrete next step. Re-listing every feature dilutes the message; reinforcing the moment that landed advances the deal.` },
      { q: `How do I follow up after a demo with multiple stakeholders?`, a: `Send a short recording and a one-page summary the champion can forward, then offer a focused session for the stakeholders who could not attend or who own a specific concern.` },
    ],
  },
  {
    slug: `upsell-email-template`,
    title: `Upsell email template`,
    kw: `expansion, upgrade tier, examples`,
    desc: `Upsell email templates that expand accounts by tying the upgrade to real usage and outcomes, not a quota. Copy that customers actually accept.`,
    shortAnswer: `A good upsell email ties the upgrade to something the customer is already experiencing: hitting a limit, growing usage, or an unmet goal. Lead with their outcome, show what the next tier unlocks, and make the math obvious. Below are templates for a usage-based upsell, a feature-gap upsell, and a seat expansion.`,
    intro: [
      `Upsells land when they feel like help, not a quota grab. The trigger should come from the customer's own data.`,
      `Show the value of the upgrade before the price of it.`,
    ],
    sections: [
      { h: `Usage-based and feature-gap upsells`, body: `Let their data make the case.`, bullets: [
        `Usage: "Hi {First}, your team's usage grew {number}% this quarter and you are close to the {limit}. Moving to {tier} removes the ceiling and adds {feature}. Want the numbers?"`,
        `Feature gap: "You mentioned wanting {capability}. It lives in {tier}. Given {their goal}, the upgrade would pay for itself by {outcome}. Worth a quick look?"`,
      ] },
      { h: `Seat expansion`, body: `Tie new seats to team growth.`, bullets: [
        `Subject: covering your whole team`,
        `Hi {First}, {number} of your teammates have requested access this month. Adding {n} seats brings everyone in at {per-seat price}, and I can prorate it to your current term so billing stays simple.`,
      ] },
    ],
    keyPoints: [
      `Trigger the upsell from the customer's real usage or a stated goal, not a quota.`,
      `Lead with the outcome the upgrade unlocks, then the price.`,
      `Make the math obvious and offer to prorate to the current term.`,
      `Never upsell an unhappy account; fix value first, expand second.`,
    ],
    faqs: [
      { q: `When should I send an upsell email?`, a: `When the customer's data signals it: they are near a limit, usage jumped, or they asked for a feature in a higher tier. Upsells tied to real signals convert; calendar-driven upsells with no trigger annoy.` },
      { q: `How do I upsell without seeming pushy?`, a: `Frame it as solving something they are already feeling, like a usage ceiling or an unmet goal. Lead with their outcome, show the math, and let them decide. Pushiness comes from selling a tier they have no reason to want.` },
      { q: `Should I upsell an account that is unhappy?`, a: `No. Fix the value gap first. Upselling a struggling account accelerates churn. Confirm the customer is getting results, then expand where their own growth justifies it.` },
    ],
  },
  {
    slug: `cross-sell-email-template`,
    title: `Cross-sell email template`,
    kw: `add-on product, related module, examples`,
    desc: `Cross-sell email templates that introduce a complementary product by connecting it to a goal the customer already has. Natural, low-pressure copy.`,
    shortAnswer: `A cross-sell email introduces a complementary product by connecting it to a goal or workflow the customer already cares about. The best ones feel like a natural next step, not a new pitch. Below are templates for a workflow-adjacent cross-sell, a results-based cross-sell, and a bundle offer.`,
    intro: [
      `Cross-selling works when the second product obviously completes the first. Anchor it to something the customer is already doing.`,
      `Keep it low-pressure and specific to their use case.`,
    ],
    sections: [
      { h: `Workflow-adjacent and results-based`, body: `Connect to what they already use.`, bullets: [
        `Workflow: "Hi {First}, since your team runs {workflow} in {product}, {add-on} would close the loop by {benefit}. Most teams using both cut {metric} by {number}. Want a quick look?"`,
        `Results-based: "You hit {result} with {product}. Teams that added {second product} pushed that further to {bigger result}. Given {their goal}, it might be the natural next step."`,
      ] },
      { h: `Bundle offer`, body: `Make combining simple and worthwhile.`, bullets: [
        `Subject: pairing {product} with {add-on}`,
        `Hi {First}, since you already rely on {product}, adding {add-on} at a bundled rate would {benefit} and keep everything in one place and one invoice. Happy to walk through how they fit together.`,
      ] },
    ],
    keyPoints: [
      `Anchor the cross-sell to a workflow or result the customer already has.`,
      `Show how the second product completes the first, not a fresh cold pitch.`,
      `Quantify the combined benefit where you can.`,
      `Bundling and one invoice reduce friction for the buyer and procurement.`,
    ],
    faqs: [
      { q: `What is the difference between upselling and cross-selling?`, a: `Upselling moves a customer to a higher tier or more of the same product; cross-selling adds a complementary product. Both should be triggered by the customer's real needs, framed around their outcomes.` },
      { q: `How do I cross-sell without overwhelming the customer?`, a: `Introduce one complementary product tied to a goal they already have, and keep it low-pressure. A single relevant suggestion lands; a menu of add-ons reads as a quota push and gets ignored.` },
      { q: `When is the best time to cross-sell?`, a: `After the customer has seen results with the first product and there is a clear adjacent need. Success with product one earns the credibility to suggest product two.` },
    ],
  },
  {
    slug: `webinar-invitation-email-template`,
    title: `Webinar invitation email template`,
    kw: `event invite, registration, examples`,
    desc: `Webinar invitation email templates that drive registrations: lead with the takeaway, keep it scannable, and make signing up one click. Copy and send.`,
    shortAnswer: `A webinar invitation email should lead with the single takeaway attendees will walk away with, name the speaker and time, and make registering one click. Keep it scannable. Below are templates for the initial invite, a reminder, and a last-chance send, plus a subject-line set.`,
    intro: [
      `People register for the outcome, not the event. Put the takeaway in the subject line and the first sentence.`,
      `Make the value obvious and the registration effortless.`,
    ],
    sections: [
      { h: `The initial invite`, body: `Takeaway first, details second.`, bullets: [
        `Subject: how {peers} {achieve outcome} (live, {date})`,
        `Hi {First}, on {date} at {time}, {speaker} is walking through exactly how {companies} {achieve outcome}. You will leave with {specific takeaway 1} and {takeaway 2}.`,
        `It is 30 minutes, live, with Q&A. Save your seat: {link}. Cannot make it? Register anyway and we will send the recording.`,
      ] },
      { h: `Reminder and last-chance`, body: `Short nudges tied to the value.`, bullets: [
        `Reminder (day before): "Quick reminder, {First}: {webinar} is tomorrow at {time}. Here is the one thing you will walk away with: {takeaway}. Add to calendar: {link}."`,
        `Last chance (1 hour before): "Starting in an hour, {First}. Last call to grab your seat for {takeaway}. Join here: {link}."`,
      ] },
    ],
    keyPoints: [
      `Lead with the takeaway in the subject line and opening sentence.`,
      `Keep the body scannable: what, when, who, and one-click register.`,
      `Send at least three touches: invite, day-before reminder, and last-chance.`,
      `Offer the recording so non-attendees still register and stay engaged.`,
    ],
    faqs: [
      { q: `What should a webinar invitation email include?`, a: `The takeaway attendees get, the speaker, the date and time, the format and length, and a one-click registration link. Lead with the outcome; the logistics are secondary to why they should show up.` },
      { q: `How many reminder emails should I send?`, a: `At least two: a day-before reminder and a last-chance send about an hour before start. Registrants forget, so reminders often drive as much attendance as the original invite.` },
      { q: `Should I offer the recording to non-attendees?`, a: `Yes. Offering the recording lifts registrations and keeps no-shows engaged. The follow-up recording email is also a natural reason to reopen the conversation with a sales prospect.` },
    ],
  },
  {
    slug: `case-study-email-template`,
    title: `Case study email template`,
    kw: `share a customer story, social proof, examples`,
    desc: `Case study email templates that turn a customer win into a reason to talk. Lead with the result, connect it to the prospect, and ask for the meeting.`,
    shortAnswer: `A case study email uses a relevant customer result to earn a conversation. Lead with the number, name a peer the prospect respects, and connect the win to the prospect's own goal. Below are templates for a cold case-study touch, a mid-sequence proof point, and a stalled-deal nudge.`,
    intro: [
      `A case study is proof, but only if it is relevant. Pick a customer that looks like the prospect and lead with the outcome.`,
      `The story is the hook; the ask is still a short meeting.`,
    ],
    sections: [
      { h: `Cold case-study touch`, body: `Peer + result + connection to them.`, bullets: [
        `Subject: how {peer} {achieved result}`,
        `Hi {First}, {peer}, a {similar company type}, was struggling with {problem} just like a lot of {their industry} teams. They used us to {result} in {timeframe}.`,
        `Given {company}'s focus on {goal}, I thought the story might be useful. Worth 15 minutes to see if the same applies?`,
      ] },
      { h: `Mid-sequence and stalled-deal use`, body: `Deploy proof at the right moment.`, bullets: [
        `Mid-sequence: "Adding one proof point, {First}: {peer} saw {result}. Here is the two-minute version: {link}. Still worth a conversation?"`,
        `Stalled deal: "While things are quiet, thought this might help: {peer}, who had the same {concern} you raised, went ahead and got {result}. Happy to connect you with them as a reference."`,
      ] },
    ],
    keyPoints: [
      `Lead with the result and a peer the prospect will recognize.`,
      `Match the case study to the prospect's industry, size, or problem.`,
      `Keep it to one story and one number; do not stack logos.`,
      `Offer a reference call to defuse a specific objection on a stalled deal.`,
    ],
    faqs: [
      { q: `How do I use a case study in a sales email?`, a: `Lead with the result, name a peer the prospect respects, and connect the win to the prospect's own goal. One relevant story with a specific number beats a page of logos or a generic testimonial.` },
      { q: `Which case study should I send?`, a: `The one that most resembles the prospect: same industry, size, or problem. Relevance is what makes proof persuasive. A famous logo in an unrelated space does far less than a lookalike peer.` },
      { q: `Can a case study reopen a stalled deal?`, a: `Yes, especially a story that addresses the exact concern that stalled it. Offering a reference call with that customer turns abstract proof into a conversation the prospect trusts.` },
    ],
  },
  {
    slug: `trigger-event-email-template`,
    title: `Trigger event email template`,
    kw: `funding, new hire, expansion outreach`,
    desc: `Trigger event email templates that turn a funding round, exec hire, or launch into timely, relevant outreach. High-reply copy you can send fast.`,
    shortAnswer: `A trigger event email uses a real change at the account (funding, a new executive, a launch, an expansion) as the reason for reaching out now. Timeliness plus relevance is why these outperform generic cold emails. Below are templates for funding, a new hire, and an expansion or launch.`,
    intro: [
      `Trigger events give you permission to reach out and a reason the prospect will care. Speed matters: send within days of the event.`,
      `Connect the trigger to a problem it predictably creates.`,
    ],
    sections: [
      { h: `Funding and new-hire triggers`, body: `Congratulate, then connect to a predictable need.`, bullets: [
        `Funding: "Hi {First}, congrats on the {round}. Teams that just raised usually get pressure to {scale / hit new targets} fast, which strains {process}. We help with exactly that. Worth 15 minutes?"`,
        `New exec: "Hi {First}, congrats on joining {company} as {role}. New {role}s often inherit {problem} in the first 90 days. We have helped a few move quickly on it. Open to a quick call?"`,
      ] },
      { h: `Expansion or launch trigger`, body: `Tie growth to the strain it creates.`, bullets: [
        `Subject: congrats on {expansion/launch}`,
        `Hi {First}, saw {company} just {opened {market} / launched {product}}. That kind of growth usually stretches {process} until something breaks. We help teams keep up without adding headcount. Worth comparing notes?`,
      ] },
    ],
    keyPoints: [
      `Send within days of the trigger; timeliness is the whole advantage.`,
      `Connect the event to a problem it predictably creates, then to your fix.`,
      `Congratulate genuinely before pivoting to the ask.`,
      `Set alerts for funding, hires, and launches so you catch triggers early.`,
    ],
    faqs: [
      { q: `What counts as a good trigger event for outreach?`, a: `Funding rounds, executive hires, product launches, expansions, new offices, mergers, and hiring sprees. Each predictably creates a problem, which gives your outreach both timeliness and relevance.` },
      { q: `How fast should I act on a trigger event?`, a: `Within days. The value of a trigger decays quickly, and you are competing with every other vendor watching the same signal. Speed plus a relevant angle wins the reply.` },
      { q: `How do I find trigger events at scale?`, a: `Set up alerts for funding, leadership changes, and launches across your target accounts. In Rally, Rook can surface accounts that just hit a trigger and draft the outreach so you act while it is fresh.` },
    ],
  },
  {
    slug: `networking-email-template`,
    title: `Networking email template`,
    kw: `professional outreach, reconnect, examples`,
    desc: `Networking email templates for reaching new contacts, reconnecting with old ones, and asking for advice. Warm, no-pressure copy that gets replies.`,
    shortAnswer: `A good networking email is warm, specific, and asks for something small: advice, a quick chat, or a reconnect. It leads with genuine interest, not an agenda. Below are templates for reaching a new contact, reconnecting with a dormant one, and asking for advice or an introduction.`,
    intro: [
      `Networking emails fail when they feel transactional. Lead with something real about the person and keep the ask light.`,
      `Give before you ask when you can.`,
    ],
    sections: [
      { h: `New contact and reconnect`, body: `Specific hook, small ask.`, bullets: [
        `New contact: "Hi {First}, I have followed your work on {topic} and really admired {specific}. I am building in the same space and would love 15 minutes to learn from your experience. No agenda beyond that."`,
        `Reconnect: "Hi {First}, it has been too long since {shared context}. I saw {their recent news} and wanted to reach out and congratulate you. Would love to catch up if you are open to it."`,
      ] },
      { h: `Asking for advice or an intro`, body: `Make it easy and give an out.`, bullets: [
        `Advice: "Hi {First}, I am working through {challenge} and you have clearly solved it well at {company}. Could I ask you two quick questions by email, or grab 15 minutes if that is easier?"`,
        `Intro: "Hi {First}, I am hoping to connect with {role} at {type of company}. If anyone comes to mind, an intro would mean a lot. No worries at all if not."`,
      ] },
    ],
    keyPoints: [
      `Lead with a specific, genuine hook about the person, not your agenda.`,
      `Keep the ask small: advice, 15 minutes, or a single introduction.`,
      `Give an easy out so the email never feels like an obligation.`,
      `Offer to give back; reciprocity makes people say yes.`,
    ],
    faqs: [
      { q: `How do I write a networking email that gets a reply?`, a: `Lead with something specific and genuine about the person, keep the ask small, and give an easy out. People respond to sincere interest and a light request far more than to a transactional pitch.` },
      { q: `How do I reconnect with a contact I have not spoken to in years?`, a: `Acknowledge the gap without over-apologizing, reference their recent news or your shared history, and suggest a low-pressure catch-up. A warm, specific note reopens the relationship naturally.` },
      { q: `Is it okay to ask for a favor in a networking email?`, a: `Yes, if the ask is small and you make it easy to say no. Asking for two quick questions or a single introduction respects their time. Give back when you can so the relationship stays balanced.` },
    ],
  },
  {
    slug: `price-increase-email-template`,
    title: `Price increase email template`,
    kw: `announce a price change, notify customers, examples`,
    desc: `Price increase email templates that hold retention: give notice, explain the value, and offer a path. Clear, respectful copy customers accept.`,
    shortAnswer: `A price increase email should give ample notice, explain the added value simply, be transparent about the new price and effective date, and offer a path (lock in the current rate, upgrade, or talk). Respect and clarity protect retention. Below are templates for a standard increase, a loyal-customer version, and a lock-in offer.`,
    intro: [
      `Price increases are a trust moment. Handle them with notice, honesty, and a clear reason, and most customers stay.`,
      `Lead with value and be direct about the number and the date.`,
    ],
    sections: [
      { h: `Standard price increase`, body: `Notice, value, clear numbers.`, bullets: [
        `Subject: an update to your pricing, effective {date}`,
        `Hi {First}, I want to give you plenty of notice: on {date}, your plan moves from {old price} to {new price}. Over the past year we added {improvement 1} and {improvement 2}, and this keeps us investing in the product you rely on.`,
        `Nothing changes before {date}, and I am happy to walk through what is new. Thank you for being a customer.`,
      ] },
      { h: `Loyal-customer and lock-in versions`, body: `Reward tenure, offer a path.`, bullets: [
        `Loyal customer: "Because you have been with us since {year}, I have held your increase to {smaller amount} and it will not take effect until {later date}."`,
        `Lock-in: "If you would like, you can lock in your current rate by moving to an annual term before {date}. Just reply and I will set it up."`,
      ] },
    ],
    keyPoints: [
      `Give generous notice, ideally 30 to 90 days before the effective date.`,
      `Explain the value added since the last price, simply and honestly.`,
      `State the old price, new price, and effective date plainly. No burying it.`,
      `Offer a path: lock in the current rate, move annual, or talk it through.`,
    ],
    faqs: [
      { q: `How much notice should I give for a price increase?`, a: `Thirty to ninety days for most subscriptions, and check the contract for any required notice period. Ample notice signals respect and gives customers time to plan or lock in the current rate.` },
      { q: `How do I announce a price increase without losing customers?`, a: `Lead with the value added, be transparent about the number and date, and offer a path like locking in the current rate on an annual term. Retention holds when the increase feels fair and well communicated.` },
      { q: `Should I offer loyal customers a smaller increase?`, a: `Often yes. A reduced increase or a later effective date for long-tenured customers rewards loyalty and protects your most valuable relationships. Personalize the note so it does not read as a mass email.` },
    ],
  },
  {
    slug: `contract-renewal-reminder-email`,
    title: `Contract renewal reminder email template`,
    kw: `upcoming renewal, expiration notice, examples`,
    desc: `Contract renewal reminder email templates that prompt an early resign: state the date, confirm terms, and make continuing effortless. Copy and send.`,
    shortAnswer: `A contract renewal reminder gives clear notice of the upcoming date, confirms the terms, and makes continuing effortless. Send the first reminder 60 to 90 days out and a second closer in. Below are templates for the first reminder, a second nudge, and an auto-renewal notice.`,
    intro: [
      `A renewal reminder is administrative, but it is also a retention touch. Keep it clear and friendly, and pair it with a value recap when you can.`,
      `Never let a renewal surprise a customer; surprises breed churn.`,
    ],
    sections: [
      { h: `First and second reminders`, body: `Clear date, clear terms, easy yes.`, bullets: [
        `First (60 to 90 days): "Hi {First}, a heads-up that your contract renews on {date}. Terms stay {terms}. Reply and I will send the paperwork, or let me know if you want to review anything first."`,
        `Second (30 days): "Hi {First}, following up on your {date} renewal. To keep things seamless, I can send the agreement now so there is no gap in service. Anything you would like to discuss?"`,
      ] },
      { h: `Auto-renewal notice`, body: `Transparency prevents disputes.`, bullets: [
        `Subject: your plan renews automatically on {date}`,
        `Hi {First}, per your agreement, your plan will automatically renew on {date} at {terms}. No action is needed to continue. If you would like to make any changes, just reply before {date} and I will take care of it.`,
      ] },
    ],
    keyPoints: [
      `Send the first reminder 60 to 90 days out, a second around 30 days.`,
      `State the renewal date and terms plainly; never let it surprise them.`,
      `Offer to send paperwork early so there is no gap in service.`,
      `For auto-renewals, be transparent about the date and how to make changes.`,
    ],
    faqs: [
      { q: `When should I send a contract renewal reminder?`, a: `Send the first 60 to 90 days before the renewal date and a second around 30 days out. Early notice leaves room for questions, procurement, and a value conversation before the deadline.` },
      { q: `How do I make renewing effortless?`, a: `Confirm the terms, offer to send the agreement now so there is no gap, and reduce the customer's action to a single reply. The easier the resign, the higher your on-time renewal rate.` },
      { q: `Should I remind customers about auto-renewals?`, a: `Yes. A transparent auto-renewal notice with the date, terms, and how to make changes prevents disputes and chargebacks, and it protects trust even though no action is required to continue.` },
    ],
  },
  {
    slug: `check-in-email-template`,
    title: `Customer check-in email template`,
    kw: `account health, stay in touch, examples`,
    desc: `Customer check-in email templates that add value instead of just touching base: share a tip, review results, or surface a risk. Copy and send.`,
    shortAnswer: `A useful check-in email gives the customer something: a relevant tip, a results review, or a heads-up, rather than a hollow "touching base." Tie it to their goals and keep it short. Below are templates for a value-add check-in, a results review, and a re-engaging a quiet account.`,
    intro: [
      `A check-in with no value trains customers to ignore you. Bring a tip, a number, or a risk worth flagging.`,
      `Anchor every check-in to the outcome the customer is chasing.`,
    ],
    sections: [
      { h: `Value-add and results-review check-ins`, body: `Give first, ask second.`, bullets: [
        `Value-add: "Hi {First}, saw your team is using {feature} a lot. A quick tip that gets teams like yours {benefit}: {tip}. Happy to set it up if useful."`,
        `Results review: "Hi {First}, quick pulse on your account: you hit {result} this quarter, up {number}% from last. One area with room to grow is {area}. Want 15 minutes to map it out?"`,
      ] },
      { h: `Re-engaging a quiet account`, body: `Surface risk gently, offer help.`, bullets: [
        `Subject: making sure you are getting value`,
        `Hi {First}, I noticed usage has dipped over the last few weeks and want to make sure nothing is getting in the way. Is there a workflow that is not clicking, or a goal we should refocus on? Happy to jump on a quick call.`,
      ] },
    ],
    keyPoints: [
      `Never send a check-in with no value; bring a tip, a number, or a risk.`,
      `Anchor the note to the customer's own goals and outcomes.`,
      `Watch usage dips as an early churn signal and reach out before renewal.`,
      `Keep it short and end with one specific, helpful offer.`,
    ],
    faqs: [
      { q: `What should a customer check-in email say?`, a: `Something useful: a relevant tip, a results snapshot, or a flagged risk, tied to the customer's goals. A check-in that only says "touching base" adds nothing and gets ignored.` },
      { q: `How often should I check in with customers?`, a: `Cadence depends on account size, but tie check-ins to value moments and usage signals rather than a rigid calendar. A well-timed, useful check-in beats a monthly one that says nothing.` },
      { q: `How do I re-engage a customer who has gone quiet?`, a: `Lead with concern, not a pitch. Note the usage dip, ask what is getting in the way, and offer to refocus on a goal. Catching disengagement early is the best defense against a surprise churn at renewal.` },
    ],
  },
  {
    slug: `reference-request-email-template`,
    title: `Reference request email template`,
    kw: `ask a customer to be a reference, examples`,
    desc: `Reference request email templates that get a yes: make it low-effort, specific, and worth their time. Copy for calls, quotes, and case studies.`,
    shortAnswer: `A reference request should make it easy and worthwhile for a happy customer to help. Be specific about what you need (a short call, a quote, a logo), keep the time commitment small, and offer something in return. Below are templates for a reference call, a written quote, and a case study.`,
    intro: [
      `Customers say yes to references when the ask is clear and small. Vague requests ("would you be a reference?") stall; specific ones convert.`,
      `Respect their time and give them an easy out.`,
    ],
    sections: [
      { h: `Reference call and written quote`, body: `Name the format and the effort.`, bullets: [
        `Call: "Hi {First}, I have a prospect who reminds me a lot of your team and would love to hear a real story. Would you be open to a 15-minute reference call in the next couple of weeks? I will prep them so it is a good use of your time."`,
        `Quote: "Hi {First}, could I use a short quote from you on {result} for our site? Even one or two sentences would help. I am happy to draft something you can edit so it takes you 30 seconds."`,
      ] },
      { h: `Case study ask`, body: `Bigger ask, bigger value exchange.`, bullets: [
        `Subject: featuring your team's success`,
        `Hi {First}, your results with {product} are exactly the story others need to hear. Would you be open to a short case study? We do all the writing from a 30-minute interview, you approve every word, and you get a polished asset to share internally too.`,
      ] },
    ],
    keyPoints: [
      `Be specific: name the format (call, quote, logo, case study) and the time it takes.`,
      `Keep the effort tiny; offer to draft quotes they can edit.`,
      `Ask your happiest customers, ideally right after a win.`,
      `Offer something back: a polished asset, exposure, or a thank-you.`,
    ],
    faqs: [
      { q: `How do I ask a customer to be a reference?`, a: `Be specific about the format and time, keep the effort small, and offer value back. "A 15-minute reference call I will fully prep" gets a yes far more than a vague "would you be a reference?"` },
      { q: `When should I ask for a reference?`, a: `Right after a measurable win or positive feedback, when the customer is happiest. Reference requests tied to a fresh success feel natural and are much more likely to be granted.` },
      { q: `How do I make a case study easy to say yes to?`, a: `Do the work for them: a short interview, you write it, they approve every word, and they get an asset to share internally. Removing the writing burden is what turns a maybe into a yes.` },
    ],
  },
  {
    slug: `event-invitation-email-template`,
    title: `Event invitation email template`,
    kw: `dinner, conference, field event invite`,
    desc: `Event invitation email templates for dinners, conferences, and field events that drive RSVPs. Lead with the experience and make replying easy.`,
    shortAnswer: `An event invitation email should convey who will be there and why it is worth their time, keep logistics clear, and make RSVPing effortless. For sales events, exclusivity and peer presence matter more than the agenda. Below are templates for an executive dinner, a conference meetup, and a webinar-to-event follow-up.`,
    intro: [
      `People attend events for the room, not the slides. Sell the company and the experience.`,
      `Keep the details tight and the RSVP one click.`,
    ],
    sections: [
      { h: `Executive dinner and conference meetup`, body: `Lead with the room and the value.`, bullets: [
        `Dinner: "Hi {First}, we are hosting a small dinner for {role}s in {city} on {date}. It is an intimate group of {peer type} swapping notes on {topic}, no pitch, just good conversation and a great meal. Would you like a seat?"`,
        `Conference meetup: "Hi {First}, I will be at {conference} on {dates}. We are gathering a few {role}s for {coffee / a happy hour} on {date}. Would love for you to join. Can I save you a spot?"`,
      ] },
      { h: `Webinar-to-event follow-up`, body: `Convert virtual interest into in-person.`, bullets: [
        `Subject: since you joined {webinar}`,
        `Hi {First}, glad you joined our session on {topic}. We are taking the conversation live at {event} on {date} with a smaller group going deeper on it. Given your interest, thought you would want first dibs on a spot.`,
      ] },
    ],
    keyPoints: [
      `Sell the room and the experience, not the agenda.`,
      `Signal exclusivity and peer presence for executive events.`,
      `Keep logistics (date, place, format) clear and the RSVP one click.`,
      `Use webinar and content engagement to source warm event invites.`,
    ],
    faqs: [
      { q: `What makes an event invitation email effective?`, a: `Conveying who will be in the room and why it is worth the time, with clear logistics and an easy RSVP. For sales events, peer presence and exclusivity drive attendance more than the formal agenda.` },
      { q: `How do I invite executives to a dinner or field event?`, a: `Emphasize the intimate, peer-only nature and the no-pitch promise. Executives value the room and the conversation, so lead with who else will be there and keep the ask to a simple yes.` },
      { q: `How do I follow up with event no-shows?`, a: `Send the highlights or recording and offer a one-on-one to cover what they missed. A no-show is still an engaged contact, and the follow-up is a natural reason to open a sales conversation.` },
    ],
  },
  {
    slug: `discount-response-email-template`,
    title: `Discount request response email template`,
    kw: `handle a discount ask, protect margin, examples`,
    desc: `Discount response email templates that protect margin: trade concessions for commitments, reframe on value, and never discount for free. Copy and send.`,
    shortAnswer: `When a prospect asks for a discount, never give it for free. Respond by exploring the real concern, reframing on value, and if you do concede, trading the discount for something (a longer term, faster signature, a case study). Below are templates for a value reframe, a conditional discount, and a firm-but-warm hold.`,
    intro: [
      `A discount given without a trade teaches the buyer your price is soft and shrinks the deal for nothing.`,
      `Every concession should buy you something in return.`,
    ],
    sections: [
      { h: `Value reframe and conditional discount`, body: `Explore first, trade if you concede.`, bullets: [
        `Reframe: "Hi {First}, happy to talk numbers. Before we do, help me understand: is it above budget, or above the value you see so far? If it is value, let us make sure the ROI is clear, because on {savings/gain} this pays back in {timeframe}."`,
        `Conditional: "I can get you to {discounted price} if we move to a {2-year term / annual prepay / signature by {date}}. That trade lets me justify it internally. Does that work?"`,
      ] },
      { h: `Firm-but-warm hold`, body: `Hold the line without losing the deal.`, bullets: [
        `Subject: on pricing`,
        `Hi {First}, I want to be straight with you: the price reflects the value and I would rather stand behind it than discount and cut corners. What I can do is {added value: onboarding, extra seats, priority support}. Would that help make this an easy yes?`,
      ] },
    ],
    keyPoints: [
      `Never discount for free; trade every concession for a commitment.`,
      `Diagnose whether it is a budget gap or a value gap before responding.`,
      `Offer added value (support, onboarding, seats) instead of a price cut when you can.`,
      `Hold the line warmly; a soft price signals a soft product.`,
    ],
    faqs: [
      { q: `How do I respond to a discount request?`, a: `Explore the real concern first, reframe on value, and if you concede, trade the discount for a longer term, faster signature, or a reference. A discount given for nothing shrinks the deal and weakens your pricing.` },
      { q: `Should I ever give a discount?`, a: `Yes, when it is traded for something that improves the deal: multi-year commitment, annual prepay, a signature by a date, or a case study. Structured discounts protect margin; reflexive ones erode it.` },
      { q: `How do I hold my price without losing the deal?`, a: `Be transparent that the price reflects the value, then offer added value like onboarding, extra seats, or priority support instead of a cut. Buyers respect a confident, fair hold more than a scramble to discount.` },
    ],
  },
  {
    slug: `onboarding-welcome-email-template`,
    title: `Customer onboarding welcome email template`,
    kw: `new customer, kickoff, first steps`,
    desc: `Onboarding welcome email templates that start customers strong: set expectations, give the first step, and name their point of contact. Copy and send.`,
    shortAnswer: `A welcome email sets the tone for the whole relationship. It should thank the customer, name their point of contact, give one clear first step, and set expectations for what happens next. Below are templates for a self-serve welcome, a guided kickoff, and a first-value nudge.`,
    intro: [
      `The moment a deal closes, momentum is highest and expectations are fragile. A strong welcome email converts a signature into an active user.`,
      `One clear next step beats a long checklist.`,
    ],
    sections: [
      { h: `Self-serve and guided welcomes`, body: `Thank, orient, give the first step.`, bullets: [
        `Self-serve: "Welcome to {product}, {First}. You are all set. The fastest path to your first win is {single first step}: {link}. I am {name}, your point of contact, and I will check in on {date} to see how it is going."`,
        `Guided kickoff: "Welcome aboard, {First}. Next step is a 30-minute kickoff to set up {outcome} for your team. Here are two times: {time} or {time}. Before then, it helps to have {one prep item} ready."`,
      ] },
      { h: `First-value nudge`, body: `Push toward the aha moment fast.`, bullets: [
        `Subject: your first win in {product}`,
        `Hi {First}, teams that {do first key action} in their first week get the most out of {product}. It takes about {time}. Here is exactly how: {link}. Reply if you hit any snag and I will jump in.`,
      ] },
    ],
    keyPoints: [
      `Thank the customer, name their point of contact, and give one clear first step.`,
      `Set expectations for what happens next and when you will follow up.`,
      `Drive toward the first value moment fast; early activation predicts retention.`,
      `Keep it to a single next action, not an overwhelming checklist.`,
    ],
    faqs: [
      { q: `What should a customer welcome email include?`, a: `A thank-you, the customer's point of contact, one clear first step, and expectations for what happens next. The goal is to convert a signature into an active user before momentum fades.` },
      { q: `How do I onboard a customer to first value fast?`, a: `Identify the single action that delivers the first win and drive the welcome email toward it with a direct link and a short time estimate. Early activation is the strongest predictor of retention.` },
      { q: `Should onboarding be self-serve or guided?`, a: `It depends on deal size and complexity. Smaller accounts do well with a self-serve first step and a check-in; larger ones benefit from a guided kickoff call. Either way, keep the first action singular and clear.` },
    ],
  },
  {
    slug: `quarterly-check-in-email-template`,
    title: `Quarterly check-in email template`,
    kw: `account review, QBR request, examples`,
    desc: `Quarterly check-in email templates that turn a routine touch into a value conversation: share results, surface goals, and set the review. Copy and send.`,
    shortAnswer: `A quarterly check-in should summarize the value delivered, surface the customer's next goals, and propose a short review. Done well it drives expansion and heads off churn. Below are templates for a results-forward check-in, a QBR scheduling request, and a goal-alignment note.`,
    intro: [
      `A quarterly rhythm keeps the relationship proactive instead of reactive. Lead with what the customer got, not what you want.`,
      `Use the check-in to align on the next quarter's goals.`,
    ],
    sections: [
      { h: `Results-forward and QBR request`, body: `Show value, then propose the review.`, bullets: [
        `Results: "Hi {First}, quick quarter recap: your team {result 1} and {result 2}, up {number}% from last quarter. I would love 30 minutes to review it and plan the next one. Does {time} or {time} work?"`,
        `QBR: "Hi {First}, time for our quarterly review. I will bring your usage, results, and a couple of ideas to get more value next quarter. Who else on your side should join?"`,
      ] },
      { h: `Goal-alignment note`, body: `Reset priorities for the quarter ahead.`, bullets: [
        `Subject: your goals for {quarter}`,
        `Hi {First}, as we head into {quarter}, I want to make sure {product} is pointed at what matters most to you. What are your top one or two goals this quarter? I will tailor our plan and check-ins around them.`,
      ] },
    ],
    keyPoints: [
      `Lead with results delivered, then propose the review.`,
      `Use the check-in to align on the customer's next-quarter goals.`,
      `Bring usage and ideas to a QBR; do not make it a status meeting.`,
      `A steady quarterly rhythm surfaces expansion and heads off churn early.`,
    ],
    faqs: [
      { q: `What should a quarterly check-in email cover?`, a: `The value delivered last quarter, the customer's goals for the next one, and a proposal to meet. Leading with results earns the meeting; making it about their goals earns the expansion.` },
      { q: `How do I run a good QBR?`, a: `Bring the customer's usage, results against their goals, and one or two concrete ideas to get more value. A QBR that is a status readout wastes their time; one that plans the next quarter drives renewal and growth.` },
      { q: `How often should I formally review an account?`, a: `Quarterly for most meaningful accounts, more often for large or strategic ones. A consistent cadence keeps you proactive, surfaces expansion signals, and catches churn risk while there is still time to act.` },
    ],
  },
  {
    slug: `lost-deal-follow-up-email-template`,
    title: `Lost deal follow-up email template`,
    kw: `after losing a deal, stay in touch, examples`,
    desc: `Lost deal follow-up email templates that keep the door open and set up a future win. Gracious copy for the loss, the check-back, and the comeback.`,
    shortAnswer: `A gracious follow-up after losing a deal preserves the relationship and often sets up a future win, because many "losses" are timing or a bet on a competitor that may not pan out. Thank them, leave the door open, and schedule a check-back. Below are templates for the loss, the periodic check-back, and the comeback when the competitor stumbles.`,
    intro: [
      `A lost deal is rarely permanent. How you handle the loss determines whether you get a second shot.`,
      `Be gracious, stay in touch, and be ready when the situation changes.`,
    ],
    sections: [
      { h: `The gracious loss and the check-back`, body: `Keep the relationship warm.`, bullets: [
        `Loss: "Hi {First}, thanks for considering us, and congratulations on your decision. I genuinely hope {chosen solution} works out. If anything changes or you want a second opinion down the road, I am one email away. No hard feelings at all."`,
        `Check-back (90 days): "Hi {First}, it has been about a quarter since you went with {competitor}. How is it going? If it is delivering, that is great. If any gaps have shown up, I would be glad to help."`,
      ] },
      { h: `The comeback`, body: `Move when the competitor stumbles.`, bullets: [
        `Subject: still here if you need us`,
        `Hi {First}, I heard {signal: a support issue, a price hike, a missing feature} has been frustrating for teams on {competitor}. If that is your experience too, the offer stands and I can make a switch painless. Worth a quick call?`,
      ] },
    ],
    keyPoints: [
      `Be genuinely gracious; the tone of the loss sets up the comeback.`,
      `Schedule a check-back 60 to 90 days out; many losses are timing bets.`,
      `Watch for competitor stumbles (price hikes, outages, churn) as re-entry signals.`,
      `Keep notes on why you lost so the next attempt addresses it directly.`,
    ],
    faqs: [
      { q: `What should I say after losing a deal?`, a: `Thank the buyer, congratulate their decision genuinely, and leave the door open for a second look. Grace after a loss preserves the relationship, and many losses reverse when timing or the competitor changes.` },
      { q: `When should I follow up on a lost deal?`, a: `Set a check-back for 60 to 90 days out, and re-engage sooner if the competitor stumbles. Losses driven by timing or a risky bet on another vendor often become winnable within a quarter or two.` },
      { q: `How do I win back a deal I lost to a competitor?`, a: `Watch for signals the competitor is disappointing them, a price hike, an outage, a missing feature, then reach out offering a painless switch. Address the reason you lost the first time, directly and specifically.` },
    ],
  },
  {
    slug: `discovery-call-script`,
    title: `Discovery call script`,
    kw: `structure, agenda, questions to ask`,
    desc: `A full discovery call script: opener, agenda, question flow, and close. Run a structured 30-minute call that qualifies and advances the deal.`,
    shortAnswer: `A discovery call script gives you a repeatable flow: set the agenda, understand the current state, dig into the problem and its impact, map the decision process and timeline, then agree on a next step. Aim to listen 70 percent of the time. Below is a full script you can run on your next call.`,
    intro: [
      `Discovery is a diagnosis, not a pitch. The script keeps you asking instead of talking, so you leave with the information a deal actually needs.`,
      `Follow the flow, but stay conversational.`,
    ],
    sections: [
      { h: `Opener and agenda`, body: `Set expectations and earn permission.`, bullets: [
        `"Thanks for the time, {First}. Here is what I had in mind: I will ask about how you handle {area} today and what is not working, and if it makes sense, we will talk next steps. I will leave time for your questions too. Sound good?"`,
        `"Before I dive in, what made you take this call? I want to spend the time on what matters to you."`,
      ] },
      { h: `Problem, impact, and process`, body: `Move from symptom to business case.`, bullets: [
        `Problem: "Walk me through how you handle {process} today. Where does it break down?"`,
        `Impact: "How much time or money does that cost per {week/month}? How does it affect your numbers?"`,
        `Process: "How does a decision like this usually get made here? Who else weighs in? What is your timeline, and what is driving it?"`,
      ] },
      { h: `Close the call`, body: `Summarize and agree on the next step.`, bullets: [
        `"Let me play back what I heard: {problem}, costing {impact}, and you want it solved by {date}. Did I get that right?"`,
        `"Based on that, the next step I would suggest is {demo / pilot / stakeholder call}. Does that make sense? Great, does {time} or {time} work?"`,
      ] },
    ],
    keyPoints: [
      `Set the agenda up front and ask permission; it earns you the tough questions later.`,
      `Aim for a 30/70 talk-to-listen ratio; if you are talking more, you are pitching.`,
      `Quantify the pain in time or money before you leave the call.`,
      `Never end discovery without a specific, dated next step.`,
    ],
    faqs: [
      { q: `How long should a discovery call be?`, a: `Thirty minutes for most first calls, with the majority spent listening. Reserve the last five minutes to summarize and agree on a next step. Longer calls tend to drift into premature pitching.` },
      { q: `What is the goal of a discovery call?`, a: `To diagnose the prospect's problem, its business impact, the decision process, and the timeline, and to agree on a next step. It is qualification and problem-mapping, not a demo or a close.` },
      { q: `How do I avoid pitching too early on discovery?`, a: `Follow a question-led script and hold a 30/70 talk ratio. If a buyer asks about the product early, give a one-line answer and return to a question. You cannot prescribe before you diagnose.` },
    ],
  },
  {
    slug: `discovery-call-questions`,
    title: `Discovery call questions`,
    kw: `30 questions, qualify, examples`,
    desc: `30 discovery call questions organized by problem, impact, decision process, and timeline. A ready question bank to run structured, high-signal calls.`,
    shortAnswer: `Great discovery uncovers the problem, its business impact, who decides, and the timeline. The question bank below is organized into those four buckets so you can run a structured call and leave knowing exactly why and how this prospect will buy. Pick 10 to 15, do not machine-gun all 30.`,
    intro: [
      `Questions are the whole job on discovery. The right ones turn a nice-to-have into a must-fix and reveal how a yes actually happens.`,
      `Choose the highest-signal questions for the buyer in front of you.`,
    ],
    sections: [
      { h: `Problem and current-state questions`, body: `Understand how it works and where it hurts.`, bullets: [
        `"Walk me through how you handle {process} today."`,
        `"Where does that break down or slow you down?"`,
        `"How long has that been a problem, and what have you tried?"`,
        `"If you did nothing, what happens over the next six months?"`,
      ] },
      { h: `Impact and metrics questions`, body: `Quantify the cost of the problem.`, bullets: [
        `"How much time or money does that cost per week or month?"`,
        `"How does it affect your team's numbers, or your own goals?"`,
        `"Who else feels this pain, and how loudly?"`,
        `"What would solving it be worth to you?"`,
      ] },
      { h: `Decision and timeline questions`, body: `Learn how a yes happens.`, bullets: [
        `"How does a decision like this usually get made here?"`,
        `"Besides you, who needs to weigh in or sign off?"`,
        `"What is your timeline to solve this, and what is driving that date?"`,
        `"What could get in the way between now and then?"`,
      ] },
    ],
    keyPoints: [
      `Pick 10 to 15 questions; a 30-question interrogation kills rapport.`,
      `Always quantify the pain in dollars or hours before moving on.`,
      `Never leave discovery without knowing the decision process and timeline.`,
      `Log answers as structured fields so the deal record shows why they will buy.`,
    ],
    faqs: [
      { q: `How many questions should I ask on a discovery call?`, a: `Ten to fifteen well-chosen open questions across problem, impact, decision, and timeline. Quality beats quantity; a 30-question checklist turns the call into an interrogation and breaks rapport.` },
      { q: `What are the most important discovery questions?`, a: `The ones that quantify impact ("what does this cost you?") and map the decision ("who signs off, and by when?"). Those two threads turn interest into a qualified, forecastable deal.` },
      { q: `Should I use a framework like MEDDIC for discovery?`, a: `A framework keeps you honest about what you still need to learn. MEDDIC, BANT, or SPICED all work; the point is to leave discovery knowing metrics, decision process, and timeline.` },
    ],
  },
  {
    slug: `sales-call-script`,
    title: `Sales call script`,
    kw: `structure, opener, closing`,
    desc: `A complete sales call script with opener, value framing, discovery, and close. A flexible structure for booked calls that keeps you in control.`,
    shortAnswer: `A sales call script gives structure to a booked call: a warm opener, a shared agenda, value framing tied to their world, a few discovery questions, and a clear close. It is a frame to flex, not a monologue to read. Below is a full script for a first sales call.`,
    intro: [
      `A script is scaffolding for confidence. It keeps a booked call on track toward a next step instead of meandering.`,
      `Let the buyer talk; your job is to steer, not to fill the silence.`,
    ],
    sections: [
      { h: `Opener and agenda`, body: `Build rapport, then frame the call.`, bullets: [
        `"Hi {First}, good to meet you. Before we start, how is your {day / week} going? ... Great. Here is my plan for our time: I will ask a bit about {area}, share how we help teams like yours, and we can decide together if a next step makes sense. Anything you want to be sure we cover?"`,
      ] },
      { h: `Value framing and discovery`, body: `Tie your story to their situation.`, bullets: [
        `"Most {role}s we work with are dealing with {problem}. Is that on your radar too?"`,
        `"When that is happening, it usually costs {impact}. What does it look like for you?"`,
        `"Here is how we help: {one-line value}. For {peer}, that meant {result}."`,
      ] },
      { h: `Close`, body: `Test interest and lock the next step.`, bullets: [
        `"Based on what we covered, what is your gut reaction?"`,
        `"The logical next step is {demo / proposal / stakeholder call}. Should we get {time} on the calendar now?"`,
      ] },
    ],
    keyPoints: [
      `Open with brief rapport, then set a shared agenda to stay in control.`,
      `Frame value against a problem you confirm the buyer actually has.`,
      `Ask before you tell; a call that is all monologue does not convert.`,
      `Always close on a specific, dated next step.`,
    ],
    faqs: [
      { q: `Should I read a sales call script word for word?`, a: `No. Learn it until it becomes a natural frame you flex to the conversation. A rigidly read script sounds robotic; an internalized one keeps you confident and on track toward the next step.` },
      { q: `What is the structure of a good sales call?`, a: `Opener and rapport, a shared agenda, value framing tied to a confirmed problem, a few discovery questions, and a close on a specific next step. Structure keeps the call moving without feeling scripted.` },
      { q: `How do I stay in control of a sales call?`, a: `Set the agenda up front, ask questions that guide the conversation, and always steer toward a next step. Control comes from direction, not from talking the most.` },
    ],
  },
  {
    slug: `cold-call-script`,
    title: `Cold call script`,
    kw: `opener, permission, objection rebuttals`,
    desc: `A cold call script with a proven opener, permission line, value pitch, and rebuttals for the common brush-offs. Read it verbatim on your next dial.`,
    shortAnswer: `A cold call script gives you a confident opener, a permission-based transition, a one-sentence value pitch, and rebuttals for common brush-offs. The goal is a meeting, not a sale. Below is a full flow you can read on your next dial, plus rebuttals for the objections you will actually hear.`,
    intro: [
      `The best cold callers always have a script; it removes the "um" and keeps you aiming at the ask.`,
      `Name the cold call, earn 30 seconds, and go for the meeting.`,
    ],
    sections: [
      { h: `Opener and permission`, body: `Disarm, then earn a moment.`, bullets: [
        `"Hi {First}, this is {you} from {company}. I know I am calling out of the blue, do you have 30 seconds and I will tell you why, then you can decide if it is worth continuing?"`,
        `(Pause. Most people grant 30 seconds.)`,
        `"Thanks. I work with {role}s who are frustrated that {pain}. We usually help them {outcome}. Is that anything you are wrestling with?"`,
      ] },
      { h: `Value and the ask`, body: `One proof point, then the meeting.`, bullets: [
        `"Teams switch to us because {differentiator}. {Peer} went from {before} to {after}."`,
        `"I will not sell you anything on this call. I would just love 15 minutes later this week to see if it fits. Thursday morning or Friday afternoon?"`,
      ] },
      { h: `Rebuttals`, body: `Keep short, always re-ask for the meeting.`, bullets: [
        `"Send me info." -> "Happy to. So I send the right thing, can I ask two quick questions?"`,
        `"We use {competitor}." -> "Most of our customers did too, then switched because {reason}. Worth 15 minutes to compare?"`,
        `"Not interested." -> "Fair, I caught you cold. Is {problem} handled, or just not a priority right now?"`,
        `"I am busy." -> "Figured, that is why I am asking for 15 minutes later, not now. Thursday or Friday?"`,
      ] },
    ],
    keyPoints: [
      `Name the cold call openly; it disarms better than pretending it is warm.`,
      `Frame 30 seconds to lower commitment and raise the yes rate.`,
      `The goal is a booked meeting, never a sale on the first dial.`,
      `End every rebuttal by re-asking for the 15-minute meeting.`,
    ],
    faqs: [
      { q: `What is the goal of a cold call?`, a: `To earn a meeting, not to close. Every line should move toward booking 15 minutes. Trying to sell the product on a cold dial overwhelms the prospect and tanks conversion.` },
      { q: `How do I open a cold call?`, a: `Name that it is a cold call, ask for 30 seconds, then give a one-line reason tied to a problem the prospect likely has. Honesty about the interruption plus a small ask disarms the reflex to hang up.` },
      { q: `What is a good cold call conversion rate?`, a: `Booking a meeting on 15 to 20 percent of live connects is strong. Track connects and outcomes so you can tune the opener and the times of day that work.` },
    ],
  },
  {
    slug: `voicemail-script`,
    title: `Sales voicemail script`,
    kw: `get callbacks, short scripts, examples`,
    desc: `Sales voicemail scripts under 20 seconds built to earn callbacks and pair with a same-minute email. Three versions you can read on the next dial.`,
    shortAnswer: `A sales voicemail should be under 20 seconds, name a specific reason for the call, say your number slowly twice, and tell them you will follow up by email. Pair every voicemail with an email sent the same minute. Below are three versions: curiosity, referral, and value.`,
    intro: [
      `Most voicemails are too long and too vague. Keep it short and always pair it with an email so the prospect has two ways back to you.`,
      `Leave no more than two across a whole sequence.`,
    ],
    sections: [
      { h: `Curiosity and value voicemails`, body: `About 15 seconds each.`, bullets: [
        `Curiosity: "Hi {First}, it is {you} at {company}, my number is {number}. I am calling because we helped {peer} {result} and I had one idea that might apply to {company}. I will send a quick email so you have it in writing. Again, {you}, {number}. Thanks."`,
        `Value: "Hi {First}, {you} from {company}, {number}. Most {role}s I talk to are frustrated that {pain}. We fixed that for {peer} and I would love 15 minutes to show you. Watch for my email. {number}. Thanks, {First}."`,
      ] },
      { h: `Referral voicemail and the paired email`, body: `Warm angle plus the follow-up.`, bullets: [
        `Referral: "Hi {First}, {you} at {company}, {number}. {Mutual} suggested I reach out about {topic}. I will follow up by email with details, but wanted to put a voice to the name. {you}, {number}."`,
        `Paired email (send immediately), subject: "just left you a voicemail" - two lines repeating the reason and the ask.`,
      ] },
    ],
    keyPoints: [
      `Keep it under 20 seconds; say your number slowly at the start and end.`,
      `Always pair the voicemail with an email sent the same minute.`,
      `Leave no more than two voicemails across a whole sequence.`,
      `Name one specific reason for the call, not a generic "touching base."`,
    ],
    faqs: [
      { q: `How long should a sales voicemail be?`, a: `Under 20 seconds. Longer and the prospect deletes it before the ask. Say your name and number at the start and again at the end, and keep the reason to one sentence.` },
      { q: `Should I leave a voicemail or just hang up?`, a: `Leave one, paired with an email. Even unreturned, a voicemail builds name recognition so your follow-up email and next dial land warmer.` },
      { q: `How many voicemails should I leave?`, a: `One or two across the whole sequence. After that, voicemails hit diminishing returns; put your energy into email and trying a different call time.` },
    ],
  },
  {
    slug: `cold-call-opening-lines`,
    title: `Cold call opening lines`,
    kw: `first 10 seconds, hooks, examples`,
    desc: `Cold call opening lines that survive the first 10 seconds: permission openers, pattern interrupts, and reason-for-calling hooks. Copy and dial.`,
    shortAnswer: `The first ten seconds of a cold call decide everything. The strongest openers are honest about the interruption, earn a small permission, and give a concrete reason for calling. Below are opening lines across three styles: the permission opener, the pattern interrupt, and the direct reason-for-calling.`,
    intro: [
      `You cannot pitch through a hang-up. The opener's only job is to buy you the next 20 seconds.`,
      `Pick the style that fits your voice and the persona you are calling.`,
    ],
    sections: [
      { h: `Permission and honesty openers`, body: `Disarm the reflex to hang up.`, bullets: [
        `"Hi {First}, I know you are not expecting my call, do you have 30 seconds for me to explain why I called, and then you can hang up on me?"`,
        `"{First}, I will be honest, this is a cold call. Want to give me 20 seconds to earn the next minute?"`,
      ] },
      { h: `Pattern interrupt and reason-for-calling`, body: `Break the script they expect.`, bullets: [
        `Pattern interrupt: "Hi {First}, this is going to sound random, but do you still own {area} at {company}?"`,
        `Reason: "Hi {First}, the reason I am calling specifically is {trigger or observation about their company}. Figured it was worth 30 seconds."`,
        `Humor: "Hi {First}, you have never heard of me and I have interrupted your day, so I will be quick and useful."`,
      ] },
    ],
    keyPoints: [
      `Acknowledge the interruption; honesty disarms the hang-up reflex.`,
      `Ask for a tiny commitment (20 to 30 seconds) before saying anything else.`,
      `Give a specific reason for calling this company, not a generic pitch.`,
      `Test a few openers and keep the one that earns you the most second sentences.`,
    ],
    faqs: [
      { q: `What is the best cold call opening line?`, a: `A permission opener that names the interruption and asks for 30 seconds, like "I know you are not expecting my call, do you have 30 seconds for me to explain why?" Honesty plus a small ask outperforms clever hooks.` },
      { q: `How do I keep someone on the phone past the first line?`, a: `Earn a micro-commitment, then immediately give a specific, relevant reason for calling their company. Vague value statements lose the prospect; a concrete trigger or observation holds them.` },
      { q: `Do pattern interrupts work on cold calls?`, a: `They can, because they break the salesy cadence a prospect expects. A simple "this will sound random, but do you still own {area}?" often gets an honest answer and opens the conversation.` },
    ],
  },
  {
    slug: `gatekeeper-script`,
    title: `Gatekeeper script for sales calls`,
    kw: `get past reception, reach the decision maker, examples`,
    desc: `Gatekeeper scripts that earn a transfer with respect, not tricks: be direct, enlist their help, and handle the common screens. Copy and dial.`,
    shortAnswer: `The best way past a gatekeeper is respect and directness, not tricks. State who you are, who you are trying to reach, and ask for their help. Gatekeepers screen for evasiveness, so confidence and honesty work better than gimmicks. Below are scripts for the transfer ask and the common screens.`,
    intro: [
      `Gatekeepers are allies, not obstacles. Treat them as people who can help you, and many will.`,
      `Be direct, be human, and never sound like you are hiding something.`,
    ],
    sections: [
      { h: `The direct transfer ask`, body: `Confident, honest, brief.`, bullets: [
        `"Hi, this is {you} from {company}. I am trying to reach {name} about {topic}. Are they available, or is there a better time to catch them?"`,
        `Enlist help: "You probably know their schedule better than anyone, when is the best time to reach {name}?"`,
      ] },
      { h: `Handling the common screens`, body: `Answer plainly and re-ask.`, bullets: [
        `"What is this regarding?" -> "I am helping {role}s with {problem}. I have a specific idea for {name} and wanted 15 minutes. Can you point me their way?"`,
        `"Are they expecting your call?" -> "No, this is the first time I am reaching out. That is why I would value your help getting to the right person."`,
        `"Send an email." -> "Happy to, and I will. What is the best address? And is there a day they tend to be reachable by phone?"`,
      ] },
    ],
    keyPoints: [
      `Be direct and respectful; gatekeepers screen for evasiveness.`,
      `Ask for their help explicitly; people like to be helpful when asked well.`,
      `Answer "what is this about?" plainly, then re-ask for the transfer or timing.`,
      `Never use tricks or pretend a relationship; it burns the account.`,
    ],
    faqs: [
      { q: `How do I get past a gatekeeper?`, a: `Be honest and direct: state your name, who you want to reach, and what it is about, then ask for their help. Gatekeepers block evasiveness and gimmicks; confidence and respect earn transfers.` },
      { q: `Should I tell the gatekeeper what the call is about?`, a: `Yes, plainly. Dodging the question is the fastest way to get screened out. Give a one-line reason tied to the decision maker's problem, then ask for the transfer or the best time to call.` },
      { q: `What should I do if the gatekeeper insists on email?`, a: `Comply and get the best address, but also ask when the person is typically reachable by phone. You gain a channel now and a better calling window later, without antagonizing your ally.` },
    ],
  },
  {
    slug: `product-demo-script`,
    title: `Product demo script`,
    kw: `tell-show-tell, tailored demo, closing`,
    desc: `A product demo script using tell-show-tell tied to the buyer's problems, plus a strong next-step close. Run a 30-minute demo that advances the deal.`,
    shortAnswer: `A winning demo shows the three things the buyer said matter, not a feature tour. The script below opens by recapping their problems, demos each solution as tell-show-tell tied to their pain, and closes on a concrete next step. Keep it to 30 minutes and let them react.`,
    intro: [
      `The worst demos are feature parades; the best are tailored. Demo only what maps to the pain you heard in discovery.`,
      `Pause for reactions; a demo is a conversation, not a presentation.`,
    ],
    sections: [
      { h: `Open by reframing on their problems`, body: `Earn permission and set scope.`, bullets: [
        `"Before I share my screen, let me play back what I heard: {problem 1}, {problem 2}, {problem 3}, costing you {impact}. Did I get that right?"`,
        `"I will show you exactly how we handle those three and skip everything else. Stop me anytime."`,
      ] },
      { h: `Tell-show-tell for each priority`, body: `Run the same loop three times.`, bullets: [
        `Tell: "You said {problem}. Here is how we solve it."`,
        `Show: demo the single flow, narrate it, keep it under three minutes.`,
        `Tell: "So instead of {old way}, your team does {new way}, which gets you {outcome}. How would that land?"`,
      ] },
      { h: `Close on a next step`, body: `Test reaction, then advance.`, bullets: [
        `"That is the core of it. What is your gut reaction?"`,
        `(Handle any objection, then:) "The logical next step is {pilot / stakeholder call / pricing}. Can we get {time} on the calendar now?"`,
      ] },
    ],
    keyPoints: [
      `Keep it to 30 minutes; reserve a third for questions and next steps.`,
      `Demo only what maps to a problem the buyer named in discovery.`,
      `Use tell-show-tell so every screen connects to an outcome.`,
      `Close on a specific, dated next step, not "let me know what you think."`,
    ],
    faqs: [
      { q: `How long should a product demo be?`, a: `Thirty minutes for most B2B demos, with at least a third reserved for questions and next steps. A 60-minute feature tour loses the room; a focused, tailored demo often outperforms it.` },
      { q: `What is the biggest demo mistake?`, a: `Demoing features nobody asked about. Every screen should map to a problem the buyer named. If it does not connect to their pain, skip it and keep the demo tight.` },
      { q: `How do I end a demo?`, a: `Ask for their gut reaction, handle any objection, then propose a specific next step and get it on the calendar. Ending with "let me know what you think" lets momentum leak away.` },
    ],
  },
  {
    slug: `closing-call-script`,
    title: `Closing call script`,
    kw: `ask for the business, trial close, examples`,
    desc: `A closing call script that asks for the business cleanly: confirm value, trial close, handle the last objection, and finalize terms. Copy and run.`,
    shortAnswer: `A closing call script helps you ask for the business without fumbling: recap the agreed value, run a trial close to surface any hesitation, handle the last objection, and confirm the terms and start date. Below is a full script plus the closing questions that work.`,
    intro: [
      `Closing is not a trick; it is a clean ask after the value is established. The script keeps you from talking past the yes.`,
      `Ask, then stay quiet and let them answer.`,
    ],
    sections: [
      { h: `Recap and trial close`, body: `Confirm alignment before you ask.`, bullets: [
        `"Before we finalize, let me recap: this solves {problem}, gets you {outcome}, and the investment is {price}. Are we aligned on that?"`,
        `Trial close: "On a scale of 1 to 10, how ready are you to move forward? ... What would make it a 10?"`,
      ] },
      { h: `Ask for the business`, body: `Direct, then silent.`, bullets: [
        `Assumptive: "Sounds like we are there. I will send the agreement now, and we can kick off {date}. Does that work?"`,
        `Direct: "Are you ready to move forward?"`,
        `(Then stop talking. Let them respond.)`,
      ] },
      { h: `Handle the last objection and confirm`, body: `Clear the final blocker, lock details.`, bullets: [
        `"You mentioned {concern}. Here is how we handle it: {answer}. Does that clear the path?"`,
        `Confirm: "Great. To finalize: {terms}, starting {date}, signed by {date}. I will send the paperwork in the next few minutes."`,
      ] },
    ],
    keyPoints: [
      `Recap the agreed value before you ask so the yes feels earned.`,
      `Use a trial close (1-to-10) to surface hidden hesitation early.`,
      `Ask directly, then go silent; do not talk past the close.`,
      `Confirm terms, start date, and signing date so nothing slips after the yes.`,
    ],
    faqs: [
      { q: `How do I ask for the business on a closing call?`, a: `Recap the value, run a trial close to surface hesitation, then ask directly or assumptively and stay silent. The most common closing mistake is talking past the ask and re-opening a decided deal.` },
      { q: `What is a trial close?`, a: `A soft question that gauges readiness without demanding a final commitment, like "on a scale of 1 to 10, how ready are you?" It surfaces objections while there is still time to handle them.` },
      { q: `What do I do after the prospect says yes?`, a: `Confirm the terms, start date, and signing date, then send the paperwork immediately. Momentum is highest right after the yes, so remove every step between agreement and signature.` },
    ],
  },
  {
    slug: `objection-handling-scripts`,
    title: `Objection handling scripts`,
    kw: `price, timing, competitor rebuttals`,
    desc: `Objection handling scripts for the big six: price, budget, timing, competitor, authority, and stalls. A proven acknowledge-explore-respond flow.`,
    shortAnswer: `Every objection deserves the same flow: acknowledge, explore, respond, confirm. The scripts below handle the six most common objections (price, no budget, timing, "we use a competitor", "I need to talk to my team", and "just send info") with exact language you can say on the next call.`,
    intro: [
      `Objections are buying signals, not walls. They mean the prospect is engaged enough to push back.`,
      `Never argue. Acknowledge, get curious, then respond to the real issue.`,
    ],
    sections: [
      { h: `Price and budget`, body: `Separate a value gap from a timing gap.`, bullets: [
        `Too expensive: "When you say expensive, is it more than you expected, or more than the budget you have? ... It replaces {cost/tools} and saves {amount}. On that math, how does it look?"`,
        `No budget: "Understood. If we could show this pays for itself in {timeframe}, would it be worth finding budget, or is it truly off the table this year?"`,
      ] },
      { h: `Timing and competitor`, body: `Explore, do not push.`, bullets: [
        `Bad timing: "What would need to change for the timing to be right? ... The reason I ask is {problem} usually gets more expensive the longer it waits."`,
        `We use {competitor}: "Many of our customers did too. What is working well and what is not? ... Switchers usually move because {differentiator}. Worth a side-by-side?"`,
      ] },
      { h: `Authority and stall`, body: `Enlist them, surface the real reason.`, bullets: [
        `Need to talk to my team: "Makes sense. Who else needs to be comfortable, and what will they want to see? I can build a summary or join a call so it is not all on you."`,
        `Send me info: "Happy to. So I send the right thing, can I ask what specifically you want to evaluate?"`,
      ] },
    ],
    keyPoints: [
      `Use acknowledge, explore, respond, confirm on every objection.`,
      `Always separate "too expensive" (value gap) from "no budget" (timing gap).`,
      `Never argue; questions persuade better than rebuttals.`,
      `Log objection types so you can coach against the ones that stall deals.`,
    ],
    faqs: [
      { q: `What is the best objection handling framework?`, a: `Acknowledge, explore, respond, confirm. Acknowledge so they feel heard, ask a question to find the real issue, respond to that, then confirm you resolved it before moving on.` },
      { q: `How do I handle a price objection?`, a: `First find out whether it is a value gap ("too expensive") or a budget gap ("no budget"). For value, reframe against cost and savings. For budget, explore payback period and timing.` },
      { q: `Should I ever argue with an objection?`, a: `Never. Arguing puts the buyer on the defensive. Acknowledge first, get curious about the real concern, and let questions do the persuading.` },
    ],
  },
  {
    slug: `pricing-negotiation-script`,
    title: `Pricing negotiation script`,
    kw: `hold margin, trade concessions, examples`,
    desc: `A pricing negotiation script that protects margin: anchor value, trade every concession, and use planned give-gets. Copy for the next negotiation.`,
    shortAnswer: `A pricing negotiation script keeps you from discounting on reflex. Anchor on value before price, never give a concession without getting something in return, and prepare your give-gets in advance. Below is a script for the discount ask, the trade, and the walk-away line.`,
    intro: [
      `Negotiation is not about caving; it is about trading. Every concession you give should buy you a better deal.`,
      `Plan your give-gets before the call so you never improvise a discount.`,
    ],
    sections: [
      { h: `Anchor on value and diagnose`, body: `Slow the discount reflex.`, bullets: [
        `"Before we talk price, let us make sure the value is clear. This gets you {outcome} worth {figure}. Agreed?"`,
        `"When you say the price is high, is it above budget, or above the value you see so far?"`,
      ] },
      { h: `Trade concessions with give-gets`, body: `Never concede for free.`, bullets: [
        `"I can move on price if we adjust the deal. For example: {discount} in exchange for a {2-year term / annual prepay / signature by {date}}."`,
        `"I do not have room on price, but I can add {onboarding / seats / support}. Would that make this work?"`,
      ] },
      { h: `Hold the line and walk-away`, body: `Confidence protects the deal.`, bullets: [
        `Hold: "I would rather stand behind the price than discount and cut corners. Here is the value again: {recap}."`,
        `Walk-away: "It sounds like we may be too far apart on budget. I do not want to sell you something that does not fit. Should we pause, or is there a version of this that works?"`,
      ] },
    ],
    keyPoints: [
      `Anchor on value before any price discussion.`,
      `Trade every concession for a term, prepay, signature date, or reference.`,
      `Prepare give-gets in advance so you never improvise a discount.`,
      `Be willing to hold the line or pause; a soft price signals a soft product.`,
    ],
    faqs: [
      { q: `How do I negotiate price without losing the deal?`, a: `Anchor on value first, diagnose whether it is a budget or value gap, and trade any concession for something like a longer term or faster signature. Confident, structured trading protects both margin and the relationship.` },
      { q: `What is a give-get in negotiation?`, a: `A concession you offer only in exchange for something of value, such as a discount for an annual prepay or a multi-year term. Give-gets keep every concession earning its way into the deal.` },
      { q: `When should I walk away from a negotiation?`, a: `When the buyer's budget cannot support a version that delivers value, or when concessions would make the deal unprofitable to serve. A calm willingness to pause often unlocks a better structure than caving would.` },
    ],
  },
  {
    slug: `qualification-call-script`,
    title: `Qualification call script`,
    kw: `qualify fast, BANT, disqualify politely`,
    desc: `A qualification call script that qualifies or disqualifies fast: confirm fit, need, budget, authority, and timing without wasting anyone's time.`,
    shortAnswer: `A qualification call script helps you decide fast whether a deal is worth pursuing. Confirm fit and need, then check budget, authority, and timing, and disqualify politely when it is not a match. Below is a script that respects everyone's time and keeps your pipeline clean.`,
    intro: [
      `Qualification protects your calendar. The goal is a fast, honest read, not a forced yes.`,
      `Disqualifying a bad fit early is a win, not a loss.`,
    ],
    sections: [
      { h: `Confirm fit and need`, body: `Establish there is a real problem.`, bullets: [
        `"To make sure I do not waste your time, can I ask a couple of quick questions? ... What prompted you to look at this now?"`,
        `"How are you handling {problem} today, and how much of an issue is it, honestly?"`,
      ] },
      { h: `Check budget, authority, timing`, body: `The practical gates.`, bullets: [
        `Budget: "Do you have budget set aside for this, or would we need to build the case?"`,
        `Authority: "Besides you, who would be involved in a decision like this?"`,
        `Timing: "If it is a fit, when would you want it in place, and what is driving that?"`,
      ] },
      { h: `Advance or disqualify`, body: `Be honest either way.`, bullets: [
        `Advance: "This sounds like a strong fit. The next step is {demo / deeper call}. Does {time} work?"`,
        `Disqualify: "Being candid, I am not sure we are the right fit right now because {reason}. I would rather tell you that than waste your time. If {condition} changes, I would love to reconnect."`,
      ] },
    ],
    keyPoints: [
      `Ask permission to qualify; it frames the direct questions as respectful.`,
      `Confirm need first, then budget, authority, and timing.`,
      `Disqualify politely and early; a clean pipeline forecasts better.`,
      `Leave the door open when you disqualify, in case the situation changes.`,
    ],
    faqs: [
      { q: `What is the goal of a qualification call?`, a: `To decide quickly whether a deal is worth pursuing by confirming fit, need, budget, authority, and timing. A good qualification call is as willing to disqualify a bad fit as to advance a good one.` },
      { q: `How do I disqualify a prospect politely?`, a: `Be candid and respectful: name why it is not a fit right now, say you would rather not waste their time, and leave the door open if the situation changes. Honesty preserves the relationship and your reputation.` },
      { q: `Which qualification framework should I use?`, a: `BANT, MEDDIC, or a simple fit-need-timing check all work. The framework matters less than actually asking the hard questions early so your pipeline reflects real, winnable deals.` },
    ],
  },
  {
    slug: `elevator-pitch-template`,
    title: `Elevator pitch template`,
    kw: `30-second pitch, formula, examples`,
    desc: `Elevator pitch templates you can deliver in 30 seconds for sales, networking, and investors. A fill-in formula plus three ready versions.`,
    shortAnswer: `An elevator pitch answers "what do you do?" in 30 seconds by naming who you help, the problem you solve, and the result, without jargon. Below is a fill-in formula plus three ready versions for a sales prospect, a networking event, and an executive or investor.`,
    intro: [
      `The test of an elevator pitch is whether the listener can repeat it. Keep it concrete and name a result.`,
      `End on a hook that invites a follow-up question.`,
    ],
    sections: [
      { h: `The fill-in formula`, body: `Plain language, real outcome.`, bullets: [
        `"We help {target customer} {achieve outcome} by {how}, so they {benefit}."`,
        `Example: "We help revenue teams hit forecast by giving them a CRM that is alive with data on day one and an AI operator that does the busywork, so reps sell instead of doing data entry."`,
      ] },
      { h: `Three ready versions`, body: `Shift the emphasis for the setting.`, bullets: [
        `Sales prospect: "You know how most CRMs take months to set up and reps still hate them? We built one that is useful the minute you log in and runs the busywork for you."`,
        `Networking: "I help sales teams actually enjoy their CRM. Ours does the admin so people can sell. What do you use today?"`,
        `Investor/exec: "We are building the AI-native CRM. Legacy tools are databases you feed; ours is an operator that works your pipeline, alive with data on first load, one price, no add-ons."`,
      ] },
    ],
    keyPoints: [
      `Keep it to about 30 seconds, 60 to 75 spoken words.`,
      `Cut every acronym; say it like you would to a friend.`,
      `Name a concrete result the listener can picture.`,
      `End with a hook or question that invites more conversation.`,
    ],
    faqs: [
      { q: `How long should an elevator pitch be?`, a: `About 30 seconds, or 60 to 75 spoken words, short enough to deliver before an elevator reaches its floor. Anything longer stops being an elevator pitch and starts being a monologue.` },
      { q: `What should an elevator pitch include?`, a: `Who you help, the problem you solve, and the result, in plain language, ending with a hook that invites the listener to ask for more. Lead with their world, not your company history.` },
      { q: `How do I make an elevator pitch memorable?`, a: `Use concrete language and a specific result the listener can picture, cut every acronym, and make it easy to repeat. If they can retell it to someone else, it will spread.` },
    ],
  },
  {
    slug: `sales-pitch-script`,
    title: `Sales pitch script`,
    kw: `problem-solution-proof-ask, framework, examples`,
    desc: `A sales pitch script using problem-solution-proof-ask, with versions for cold, executive, and warm audiences. A tight story that lands in under a minute.`,
    shortAnswer: `A sales pitch is a tight story: the problem your buyer has, how you solve it, proof it works, and a clear ask. The script below gives you that four-part spine plus versions for cold outreach, an executive audience, and a warm lead who already knows the problem.`,
    intro: [
      `Skip the company-history intro. A great pitch starts with the buyer's problem and earns the right to talk about you by the third sentence.`,
      `Adjust the altitude for the audience, keep the spine.`,
    ],
    sections: [
      { h: `The problem-solution-proof-ask spine`, body: `Under 60 seconds spoken.`, bullets: [
        `Problem: "Most {role}s struggle with {problem}, which means {consequence}."`,
        `Solution: "We fix that by {how}, so instead of {old way} you get {new way}."`,
        `Proof: "{Peer} used it to go from {before} to {after} in {timeframe}."`,
        `Ask: "Worth 15 minutes to see if the same applies to you?"`,
      ] },
      { h: `Executive and warm-lead versions`, body: `Change the emphasis.`, bullets: [
        `Executive: "{Company} is trying to {strategic goal}. The blocker is {problem}, costing about {figure} a year. We remove it in {timeframe} and typically return {ROI}. The risk of waiting is {cost of inaction}. I would like {ask}."`,
        `Warm lead: "You already know {problem} is hurting {metric}. Teams like yours are solving it with {approach} and getting {result}. Here is what that looks like for you: {one line}. Should we map it out?"`,
      ] },
    ],
    keyPoints: [
      `Start with the buyer's problem, not your product.`,
      `Keep the whole pitch under 60 seconds spoken.`,
      `Make the proof specific and relevant, not a generic logo.`,
      `For executives, lead with the dollar impact and the risk of inaction.`,
    ],
    faqs: [
      { q: `What makes a sales pitch effective?`, a: `Starting with the buyer's problem, delivering the strongest structure, problem, solution, proof, ask, in under a minute, and tailoring it to what the buyer cares about. Feature-first pitches lose; problem-first pitches land.` },
      { q: `How is a pitch different for executives?`, a: `Executives buy outcomes and reduced risk. Lead with the dollar impact and strategic goal, keep it short, and make a clear ask. Skip the feature detail; they will delegate that.` },
      { q: `How long should a sales pitch be?`, a: `A cold or elevator pitch should be under 60 seconds. A meeting pitch can run a few minutes but should still follow the problem-solution-proof-ask spine rather than wandering into a feature tour.` },
    ],
  },
  {
    slug: `referral-ask-script`,
    title: `Referral ask script`,
    kw: `ask for referrals on a call, examples`,
    desc: `A referral ask script for live calls: time it to a win, be specific about who you want, and make the intro effortless. Copy for your next check-in.`,
    shortAnswer: `A referral ask script helps you request introductions naturally on a call, right after a customer expresses satisfaction. Be specific about the ideal referral, make the introduction effortless, and offer to do the work. Below is a script for the ask, the specificity, and the follow-through.`,
    intro: [
      `The best referrals come from a live ask at a moment of happiness, not a mass email. A script keeps you from fumbling the moment.`,
      `Be specific and make it easy.`,
    ],
    sections: [
      { h: `Time it and make the ask`, body: `Right after a win or praise.`, bullets: [
        `"It means a lot to hear {product} is working so well for you. Can I ask a favor? ... When something is landing like this, I like to ask who else you respect who might be dealing with {problem}."`,
      ] },
      { h: `Be specific and make it effortless`, body: `Narrow the ask, remove the work.`, bullets: [
        `Specific: "Ideally someone like a {role} at a {company type}. Anyone come to mind?"`,
        `Effortless: "No pressure to sell it for me. If you are comfortable, I can draft a short intro you just forward, or you can pass along my name and I will take it from there."`,
      ] },
    ],
    keyPoints: [
      `Ask live, right after the customer expresses satisfaction.`,
      `Name the ideal referral profile so their mind has something to match.`,
      `Offer to draft the intro so the referrer does no writing.`,
      `Thank them and close the loop so they see their referral valued.`,
    ],
    faqs: [
      { q: `When should I ask for a referral on a call?`, a: `Right after the customer expresses satisfaction or reports a win. That moment of goodwill makes the ask feel natural, and a specific, well-timed request converts far better than a generic email later.` },
      { q: `How do I make a referral ask specific?`, a: `Describe the ideal referral by role and company type so the customer's mind has a concrete pattern to match. "A VP of Sales at a growing SaaS company" surfaces names; "anyone you know" surfaces nothing.` },
      { q: `How do I make it easy for someone to refer me?`, a: `Offer to draft a short introduction they can simply forward, or ask them to pass along your name so you do the outreach. Removing the writing burden is what turns willingness into an actual introduction.` },
    ],
  },
  {
    slug: `renewal-call-script`,
    title: `Renewal call script`,
    kw: `secure the renewal, expansion, at-risk`,
    desc: `A renewal call script that secures the resign and surfaces expansion: recap value, confirm goals, handle risk, and lock terms. Copy for the call.`,
    shortAnswer: `A renewal call script helps you secure the renewal by leading with value delivered, confirming the customer's goals for next year, handling any risk, and locking the terms. Below is a script for an on-track renewal, an at-risk account, and an expansion conversation.`,
    intro: [
      `Renewals are won through the year, but the call still matters. Lead with outcomes, not the contract date.`,
      `Surface risk early and address it before talking terms.`,
    ],
    sections: [
      { h: `Recap value and confirm goals`, body: `Anchor on results.`, bullets: [
        `"Ahead of your renewal, let me recap the year: you {result 1} and {result 2}, up {number}% from last year. Does that match how it feels on your side?"`,
        `"Looking ahead, what are your top goals for next year? I want to make sure we are pointed at them."`,
      ] },
      { h: `Handle risk and lock terms`, body: `Fix concerns, then finalize.`, bullets: [
        `At risk: "I want to earn this renewal. Where have we fallen short, and what would make next year a clear win? Let us fix that before we talk terms."`,
        `Lock: "Your renewal is {terms} starting {date}. I can send the paperwork now so there is no gap. Anything you want to review first?"`,
        `Expansion: "Your usage grew {number}%. Moving to {tier/seats} would cover the whole team and unlock {feature}. Want both options in the renewal?"`,
      ] },
    ],
    keyPoints: [
      `Lead with value delivered, not "your contract is expiring."`,
      `Confirm next-year goals to keep the relationship forward-looking.`,
      `Address at-risk concerns before discussing terms.`,
      `Offer expansion only when usage or outcomes justify it.`,
    ],
    faqs: [
      { q: `How do I run a renewal call?`, a: `Recap the value delivered, confirm the customer's goals for next year, handle any concerns, then lock the terms and offer to send paperwork now. Leading with results earns the renewal before price ever comes up.` },
      { q: `How do I handle an at-risk renewal?`, a: `Do not lead with terms. Ask where you have fallen short and what would make next year a clear win, fix that first, then talk renewal. A call cannot paper over a value gap that built up all year.` },
      { q: `When should I bring up expansion on a renewal call?`, a: `Only when the customer's usage or results justify it. If they grew or hit limits, present an expansion option alongside the flat renewal so they choose. Forced upsells at renewal create churn risk.` },
    ],
  },
  {
    slug: `sales-pitch-template`,
    title: `Sales pitch template`,
    kw: `deck structure, framework, examples`,
    desc: `A sales pitch template with the slide-by-slide structure that closes: problem, cost, solution, proof, and ask. Build a pitch that lands in 10 slides.`,
    shortAnswer: `A sales pitch template gives you the structure of a persuasive pitch: open on the buyer's problem, quantify its cost, present your solution and proof, then make a clear ask. Below is a slide-by-slide framework and the fill-in language for each section, usable as a deck or a spoken pitch.`,
    intro: [
      `A pitch is a story with a spine. This template keeps you from opening on your logo and burying the value.`,
      `Lead with their world; earn the right to talk about you.`,
    ],
    sections: [
      { h: `The slide-by-slide structure`, body: `Ten sections, value before product.`, bullets: [
        `1. The problem: name the pain your buyer feels, in their words.`,
        `2. The cost: quantify what the problem costs in time or money.`,
        `3. The world with it solved: paint the after state.`,
        `4. Your solution: how you get them there, in one clear idea.`,
        `5. Proof: a peer result with a specific number.`,
        `6. How it works: the three-step "how", not a feature list.`,
        `7. Why you: the one differentiator that matters here.`,
        `8. The ask: the specific next step.`,
      ] },
      { h: `The opening and closing language`, body: `Bookend the pitch.`, bullets: [
        `Open: "Most {role}s we work with are stuck with {problem}, and it is costing them {figure}. We think that is fixable."`,
        `Close: "The next step I would suggest is {action}. Can we get {time} on the calendar?"`,
      ] },
    ],
    keyPoints: [
      `Open on the problem and its cost, not your company.`,
      `Keep it to one core idea and one proof point; do not overload slides.`,
      `Make the differentiator specific to this buyer's situation.`,
      `End every pitch with one clear, dated ask.`,
    ],
    faqs: [
      { q: `What should a sales pitch deck include?`, a: `The problem, its cost, the solved-world vision, your solution, proof, how it works, why you, and the ask. Lead with the buyer's problem and put proof before you list any features.` },
      { q: `How many slides should a sales pitch have?`, a: `Roughly eight to twelve. Enough to tell the story, few enough to keep it tight. One idea per slide, value up front, and a single clear ask at the end.` },
      { q: `What is the difference between a pitch and a proposal?`, a: `A pitch is the persuasive story that creates desire; a proposal is the detailed document that formalizes scope, terms, and price. The pitch earns the meeting where the proposal gets signed.` },
    ],
  },
  {
    slug: `sales-proposal-template`,
    title: `Sales proposal template`,
    kw: `structure, sections, examples`,
    desc: `A sales proposal template with the 7 sections buyers actually read, in order, plus an executive summary formula. Build a proposal that closes.`,
    shortAnswer: `A winning proposal restates the buyer's problem before it pitches a solution, quantifies the ROI, and makes the next step obvious. The template below gives you the seven sections buyers actually read, in order, with fill-in language and an executive summary formula.`,
    intro: [
      `A proposal is a decision document, not a brochure. Executives read the summary and the price, so make both airtight.`,
      `Front-load value so a skimmer still gets the point.`,
    ],
    sections: [
      { h: `The executive summary formula`, body: `The one section everyone reads.`, bullets: [
        `"{Company} is working to {goal} but is held back by {problem}, costing {impact}. This proposal outlines how {product} delivers {outcome} within {timeframe}, for {price}, with an expected return of {ROI}."`,
        `Keep it to one paragraph with a number in the first three sentences.`,
      ] },
      { h: `The seven sections in order`, body: `Value comes before price.`, bullets: [
        `1. Executive summary (problem, solution, cost, ROI).`,
        `2. Current situation and challenges.`,
        `3. Goals and success criteria, in their words.`,
        `4. Proposed solution, tied line by line to their goals.`,
        `5. Timeline and milestones.`,
        `6. Investment and ROI, with the payback math.`,
        `7. Next steps: one clear action with a date.`,
      ] },
      { h: `Pricing and next-steps language`, body: `Make the yes easy.`, bullets: [
        `Investment: "{Package} is {price} per {period}. Based on {savings/gain}, it pays for itself in {timeframe}." Offer good/better/best to shift "if" to "which".`,
        `Next steps: "To hit {date}, we would sign by {date} and kick off {date}. The agreement is attached."`,
      ] },
    ],
    keyPoints: [
      `Lead with the buyer's problem; put value before price.`,
      `The executive summary must stand alone for skimmers.`,
      `Offer two or three pricing tiers to shift the decision to "which".`,
      `End with one specific next step and attach the agreement.`,
    ],
    faqs: [
      { q: `What should a sales proposal include?`, a: `Seven sections: executive summary, current situation, goals, proposed solution, timeline, investment and ROI, and next steps. Lead with the buyer's problem and keep value ahead of price throughout.` },
      { q: `How long should a sales proposal be?`, a: `As short as possible while covering the seven sections, usually three to eight pages. The executive summary should stand alone so a busy exec who reads only that still gets the full picture.` },
      { q: `Should a proposal include pricing options?`, a: `Yes. Two or three tiers move the buyer from deciding whether to buy to deciding which to buy, and often lift the average deal size. Anchor each tier to the value it unlocks.` },
    ],
  },
  {
    slug: `business-proposal-template`,
    title: `Business proposal template`,
    kw: `solicited, unsolicited, structure`,
    desc: `A business proposal template for solicited and unsolicited proposals: problem, approach, deliverables, pricing, and terms. Structure that wins work.`,
    shortAnswer: `A business proposal template structures a formal offer to do work: the problem or opportunity, your approach, deliverables, timeline, pricing, and terms. Solicited proposals answer a specific request; unsolicited ones must first prove the problem is worth solving. Below is the full structure for both.`,
    intro: [
      `A business proposal is a persuasive and a practical document. It has to sell the idea and spell out the commitment.`,
      `For unsolicited proposals, spend extra effort establishing the problem before the solution.`,
    ],
    sections: [
      { h: `The standard structure`, body: `Cover the essentials in order.`, bullets: [
        `1. Title page and cover letter.`,
        `2. Executive summary: problem, approach, outcome, price.`,
        `3. Problem or opportunity statement.`,
        `4. Proposed approach and scope.`,
        `5. Deliverables and timeline.`,
        `6. Pricing and payment terms.`,
        `7. About us and relevant proof.`,
        `8. Terms, assumptions, and acceptance.`,
      ] },
      { h: `Solicited vs unsolicited language`, body: `Match the opening to the context.`, bullets: [
        `Solicited: "In response to your request for {scope}, this proposal outlines how we will deliver {outcome} by {date}."`,
        `Unsolicited: "We noticed {observation about their business} and believe there is an opportunity to {outcome}. This proposal outlines a low-risk way to capture it."`,
      ] },
    ],
    keyPoints: [
      `Lead with the executive summary; many readers stop there.`,
      `Spell out deliverables, timeline, and terms so scope is unambiguous.`,
      `For unsolicited proposals, prove the problem before pitching the solution.`,
      `Include an acceptance section so approval is a signature, not another email.`,
    ],
    faqs: [
      { q: `What is the difference between a solicited and unsolicited business proposal?`, a: `A solicited proposal responds to a specific request like an RFP, so it answers stated requirements. An unsolicited proposal is proactive and must first establish that the problem is real and worth solving before pitching the approach.` },
      { q: `What should a business proposal include?`, a: `An executive summary, the problem or opportunity, your approach and scope, deliverables and timeline, pricing and terms, relevant proof, and an acceptance section. Clarity on scope and terms prevents disputes later.` },
      { q: `How is a business proposal different from a quote?`, a: `A business proposal sells the approach and context; a quote states the price and terms for agreed work. Proposals persuade; quotes formalize. Larger or complex engagements usually need both.` },
    ],
  },
  {
    slug: `quote-template`,
    title: `Sales quote template`,
    kw: `line items, terms, validity`,
    desc: `A sales quote template with clean line items, terms, and validity that gets approved faster. Includes the fields procurement expects. Copy and send.`,
    shortAnswer: `A clean sales quote lists exactly what the buyer gets, itemized with quantities and prices, plus terms, validity, and a clear total. The template below gives you the standard structure, the fields procurement expects, and language for discounts and expiration that speed approval.`,
    intro: [
      `A quote often goes to procurement, so clarity beats persuasion. List items plainly and make the total unmissable.`,
      `Generate the quote from your deal line items so it matches the contract.`,
    ],
    sections: [
      { h: `The standard quote fields`, body: `Top to bottom.`, bullets: [
        `Header: your company, buyer, quote number, date, expiration date.`,
        `Line items: description, quantity, unit price, line total.`,
        `Subtotal, discount (as a line, with reason), tax, grand total.`,
        `Terms: payment terms (Net 30), contract length, what is included.`,
        `Validity and an acceptance line with name, title, date.`,
      ] },
      { h: `Example line items`, body: `A simple three-line quote.`, table: {
        columns: [`Item`, `Qty`, `Unit price`, `Line total`],
        rows: [
          [`Rally platform, annual (per seat)`, `10`, `$1,200`, `$12,000`],
          [`Onboarding and migration (one-time)`, `1`, `$2,500`, `$2,500`],
          [`Launch discount (15%)`, ``, ``, `-$2,175`],
        ],
      } },
      { h: `Discount and validity language`, body: `Frame the discount, hold the price.`, bullets: [
        `Discount: "Launch discount (15%) applied through {date}: -{amount}." Attach a reason and a deadline.`,
        `Validity: "Pricing above is held through {date}. Standard rates apply after."`,
      ] },
    ],
    keyPoints: [
      `Include every field procurement expects: quote number, dates, terms, totals.`,
      `Show discounts as their own line with a reason and a deadline.`,
      `Always set an expiration date to protect pricing and create urgency.`,
      `Generate quotes from deal line items so scope never drifts from the contract.`,
    ],
    faqs: [
      { q: `What is the difference between a quote and a proposal?`, a: `A proposal sells the solution with context and ROI; a quote states the price and terms for what was agreed. The quote is usually the document procurement processes into a purchase order.` },
      { q: `Should a quote have an expiration date?`, a: `Yes. A validity date protects your pricing and creates gentle urgency. State it clearly: "valid through {date}, standard rates apply after," so the buyer knows the window.` },
      { q: `How do I keep quotes consistent with the contract?`, a: `Generate the quote from the same deal line items that feed the order and contract. Rally does this automatically, so scope and pricing never drift between the quote, the order, and the invoice.` },
    ],
  },
  {
    slug: `rfp-response-template`,
    title: `RFP response template`,
    kw: `proposal, win themes, structure`,
    desc: `An RFP response template that wins: answer every requirement, weave in win themes, and prove compliance. Structure plus a reusable answer library approach.`,
    shortAnswer: `An RFP response must answer every stated requirement precisely, weave in a few win themes, and make evaluation easy with clear compliance. The template below gives you the standard structure, how to build a reusable answer library, and language for the executive summary and win themes that separate you from competitors.`,
    intro: [
      `RFPs are scored, so precision and completeness beat prose. Answer exactly what is asked, in the order asked.`,
      `Differentiate with two or three win themes threaded throughout.`,
    ],
    sections: [
      { h: `The standard structure`, body: `Follow the RFP's own order.`, bullets: [
        `1. Cover letter and executive summary.`,
        `2. Company overview and relevant experience.`,
        `3. Point-by-point response to every requirement.`,
        `4. Proposed solution and approach.`,
        `5. Implementation plan and timeline.`,
        `6. Pricing, per their required format.`,
        `7. References and compliance matrix.`,
      ] },
      { h: `Win themes and executive summary`, body: `Give them a reason to pick you.`, bullets: [
        `Pick two or three win themes (for example: fastest time to value, one flat price, an AI operator that does the work) and reinforce them in the summary and throughout.`,
        `Exec summary: "We understand {buyer} needs {top requirement}. Our solution delivers it through {approach}, and unlike alternatives, {differentiator}."`,
      ] },
    ],
    keyPoints: [
      `Answer every requirement in the RFP's own order; scorers check for completeness.`,
      `Thread two or three win themes throughout, not just in the intro.`,
      `Maintain a reusable answer library so future RFPs assemble faster.`,
      `Include a compliance matrix so evaluators can score you quickly.`,
    ],
    faqs: [
      { q: `How do I write a winning RFP response?`, a: `Answer every requirement precisely and in the order asked, thread two or three differentiating win themes throughout, and make scoring easy with a compliance matrix. Completeness and clarity beat clever prose in a scored evaluation.` },
      { q: `What are win themes in an RFP?`, a: `Two or three differentiators you reinforce throughout the response, such as fastest time to value or one flat price. They give evaluators a reason to remember and prefer you over technically compliant competitors.` },
      { q: `How can I respond to RFPs faster?`, a: `Build a reusable answer library of approved responses to common questions, then tailor them per RFP. Most questions repeat across RFPs, so a maintained library turns weeks of writing into days of assembly.` },
    ],
  },
  {
    slug: `statement-of-work-template`,
    title: `Statement of work (SOW) template`,
    kw: `scope, deliverables, acceptance`,
    desc: `A statement of work template that prevents scope creep: deliverables, timeline, acceptance criteria, and change control. Structure that protects both sides.`,
    shortAnswer: `A statement of work defines exactly what will be delivered, by when, for how much, and how it gets accepted. A good SOW prevents scope creep with clear deliverables, acceptance criteria, and a change-control process. Below is the full structure and the sections that protect both sides.`,
    intro: [
      `The SOW is where fuzzy expectations become concrete commitments. Ambiguity here becomes conflict later.`,
      `Define acceptance and change control explicitly.`,
    ],
    sections: [
      { h: `The standard SOW structure`, body: `Nine sections that leave no gaps.`, bullets: [
        `1. Project overview and objectives.`,
        `2. Scope of work: what is and is not included.`,
        `3. Deliverables, each defined and dated.`,
        `4. Timeline and milestones.`,
        `5. Roles and responsibilities, both sides.`,
        `6. Acceptance criteria for each deliverable.`,
        `7. Pricing and payment schedule.`,
        `8. Change-control process.`,
        `9. Assumptions, dependencies, and sign-off.`,
      ] },
      { h: `Scope and change-control language`, body: `The two sections that prevent disputes.`, bullets: [
        `Scope boundary: "In scope: {list}. Out of scope: {list}. Out-of-scope work requires a change order."`,
        `Change control: "Any change to scope, timeline, or cost is documented in a written change order, signed by both parties, before work proceeds."`,
      ] },
    ],
    keyPoints: [
      `Define both what is in scope and what is explicitly out of scope.`,
      `Give every deliverable a definition, a date, and acceptance criteria.`,
      `Include a written change-control process to stop scope creep.`,
      `Name roles and responsibilities for both sides to avoid gaps.`,
    ],
    faqs: [
      { q: `What is a statement of work?`, a: `A document that defines exactly what will be delivered, by when, for how much, and how it is accepted. It turns a proposal's intent into concrete, agreed commitments and governs how the work is executed.` },
      { q: `How does an SOW prevent scope creep?`, a: `By stating what is out of scope as clearly as what is in, defining acceptance criteria per deliverable, and requiring a signed change order for any change. Ambiguity is what lets scope creep in; specificity closes the door.` },
      { q: `What is the difference between an SOW and a contract?`, a: `A master contract or MSA sets the overarching legal terms; the SOW defines the specific work, deliverables, and price for an engagement under it. Many relationships pair one MSA with multiple SOWs.` },
    ],
  },
  {
    slug: `sales-one-pager-template`,
    title: `Sales one-pager template`,
    kw: `leave-behind, one sheet, structure`,
    desc: `A sales one-pager template your champion can forward internally: problem, solution, proof, and ROI on a single page. Structure plus fill-in copy.`,
    shortAnswer: `A sales one-pager is a single-page summary your champion forwards to sell internally on your behalf. It covers the problem, your solution, proof, and ROI in a scannable layout. Below is the structure and the fill-in copy for each block, sized to fit on one page.`,
    intro: [
      `Champions rarely repitch you accurately. A one-pager arms them with your best words.`,
      `Make it scannable: headers, short blocks, one number that matters.`,
    ],
    sections: [
      { h: `The one-page blocks`, body: `Fits on a single sheet.`, bullets: [
        `Headline: the outcome, in one line ("Hit forecast without the busywork").`,
        `The problem: two sentences on the pain and its cost.`,
        `The solution: three bullets on how you solve it.`,
        `Proof: one peer result with a number, plus a logo or two.`,
        `ROI: the payback in one line.`,
        `Next step and contact: how to move forward.`,
      ] },
      { h: `Fill-in copy`, body: `Language for each block.`, bullets: [
        `Problem: "{Role}s lose {figure} a year to {problem}. Most tools make it worse by {reason}."`,
        `Solution: "{Product} fixes it by {how}, {benefit}, and {benefit}."`,
        `ROI: "Teams see {result} and payback in {timeframe}."`,
      ] },
    ],
    keyPoints: [
      `Keep it to a single page; a one-pager that spills over is not a one-pager.`,
      `Write it for the champion to forward, in your best language.`,
      `Lead with the outcome headline, not your product name.`,
      `Include one number and one clear next step.`,
    ],
    faqs: [
      { q: `What is a sales one-pager?`, a: `A single-page summary of the problem, solution, proof, and ROI that a champion can forward to sell internally on your behalf. It arms the buyer's advocate with your strongest, most accurate messaging.` },
      { q: `What should a sales one-pager include?`, a: `An outcome headline, the problem and its cost, your solution in three bullets, one proof point with a number, the ROI, and a next step with contact info. Everything scannable, on one page.` },
      { q: `When do I use a one-pager versus a full proposal?`, a: `Use a one-pager to arm a champion or leave behind after a meeting; use a full proposal to formalize scope, terms, and price. The one-pager spreads the story; the proposal closes the deal.` },
    ],
  },
  {
    slug: `sales-deck-template`,
    title: `Sales deck template`,
    kw: `pitch deck, slide structure, examples`,
    desc: `A sales deck template with a proven slide order: hook, problem, stakes, solution, proof, and ask. Build a deck that tells a story instead of listing features.`,
    shortAnswer: `A great sales deck tells a story, not a feature list. The proven structure opens with a hook and the buyer's problem, raises the stakes, introduces your solution as the answer, backs it with proof, and ends with a clear ask. Below is the slide-by-slide order and what goes on each.`,
    intro: [
      `Decks fail when they are about the seller. Reframe every slide around the buyer's world.`,
      `One idea per slide; the deck supports the conversation, it is not the conversation.`,
    ],
    sections: [
      { h: `The slide order`, body: `Story arc, not feature dump.`, bullets: [
        `1. Hook: a provocative insight or a shift in their world.`,
        `2. The problem: the pain the shift creates.`,
        `3. The stakes: what it costs to ignore it.`,
        `4. The promised land: the after state.`,
        `5. The solution: how you get them there.`,
        `6. Proof: peer results and evidence.`,
        `7. How it works: three steps.`,
        `8. Why now and the ask.`,
      ] },
      { h: `Slide design rules`, body: `Keep it clean and scannable.`, bullets: [
        `One idea and one headline per slide; the headline states the takeaway.`,
        `Use the buyer's language and one real number over generic claims.`,
        `Talk to the deck, do not read it; leave whitespace for the conversation.`,
      ] },
    ],
    keyPoints: [
      `Structure the deck as a story arc, not a feature tour.`,
      `Open with a hook and the buyer's problem before any product.`,
      `One idea per slide, with the headline stating the takeaway.`,
      `Close on why-now and a single clear ask.`,
    ],
    faqs: [
      { q: `How many slides should a sales deck have?`, a: `Around ten to fifteen for a first meeting. Enough to tell the story with one idea per slide, few enough to leave room for conversation. A 40-slide feature deck loses the room.` },
      { q: `What makes a sales deck effective?`, a: `A story arc that centers the buyer: a hook, their problem, the stakes, your solution, and proof, ending with a clear ask. Decks that are about the seller's features rather than the buyer's world do not persuade.` },
      { q: `Should I read from my sales deck?`, a: `No. The deck supports the conversation; you talk to it. Headlines carry the takeaways, slides stay scannable, and you leave whitespace so the meeting is a dialogue, not a recital.` },
    ],
  },
  {
    slug: `executive-summary-template`,
    title: `Executive summary template`,
    kw: `proposal summary, one paragraph, formula`,
    desc: `An executive summary template and formula: problem, solution, cost, and ROI in one tight paragraph busy executives actually read. Copy and adapt.`,
    shortAnswer: `An executive summary is the one section every decision-maker reads, so it must stand alone: the buyer's problem, its cost, your solution, the price, and the expected return, in a single tight paragraph. Below is the formula, a worked example, and the rules that keep it skimmable.`,
    intro: [
      `Executives read the summary and the price, then decide whether to read more. Make it self-contained.`,
      `Lead with their problem and put a number in the first three sentences.`,
    ],
    sections: [
      { h: `The formula`, body: `Five beats, one paragraph.`, bullets: [
        `Problem: what the buyer is trying to do and what blocks it.`,
        `Cost: what the problem is costing, quantified.`,
        `Solution: how you solve it, in one clear idea.`,
        `Proof: one line of evidence it works.`,
        `Ask and ROI: the investment and the expected return.`,
      ] },
      { h: `Worked example`, body: `Fill-in language.`, bullets: [
        `"{Company} wants to {goal} but {problem} is costing about {figure} a year. This proposal outlines how {product} delivers {outcome} in {timeframe}. {Peer} saw {result} doing this. The investment is {price}, with an expected return of {ROI}."`,
      ] },
    ],
    keyPoints: [
      `Make it stand alone; assume it is the only section they read.`,
      `Lead with the buyer's problem, not your company.`,
      `Put a number in the first three sentences.`,
      `Keep it to one paragraph; write it last, once the details are set.`,
    ],
    faqs: [
      { q: `What is an executive summary?`, a: `A one-paragraph overview of a proposal that covers the problem, its cost, the solution, proof, and the ROI. It is written for busy decision-makers who may read only that section, so it must be self-contained.` },
      { q: `How long should an executive summary be?`, a: `One paragraph, or a few short ones at most. If it runs a full page it stops being a summary. Every sentence should earn its place, with a number early to establish the stakes.` },
      { q: `When should I write the executive summary?`, a: `Last, after the rest of the proposal is complete. You can only distill the strongest points into a tight paragraph once you know exactly what the full document says.` },
    ],
  },
  {
    slug: `sales-email-signature-templates`,
    title: `Sales email signature templates`,
    kw: `professional signature, examples, best practices`,
    desc: `Sales email signature templates that build trust and drive action: name, title, one link, and a subtle CTA. Clean examples that render on mobile.`,
    shortAnswer: `A good sales email signature is clean, credible, and includes one purposeful call to action, not a wall of links and social icons. Name, title, company, one contact method, and a single CTA is enough. Below are signature templates for reps, managers, and a version optimized for booking meetings.`,
    intro: [
      `Your signature appears on every email you send, so it is quiet real estate that compounds. Keep it minimal and let one CTA do work.`,
      `Cluttered signatures read as spammy and break on mobile.`,
    ],
    sections: [
      { h: `Clean rep and manager signatures`, body: `Minimal and credible.`, bullets: [
        `Rep: "{Name} | {Title}, {Company}" then "{phone} - {book a call link}"`,
        `Manager: "{Name} | {Title}, {Company}" then "{phone}" then a one-line proof: "Helping {audience} {outcome}."`,
      ] },
      { h: `Meeting-booking and CTA signatures`, body: `One purposeful call to action.`, bullets: [
        `Booking: "{Name}, {Title} at {Company}" then "Grab 15 minutes: {scheduling link}"`,
        `Content CTA: add a single line like "New: {resource title} -> {link}" and rotate it, never stack multiple CTAs.`,
      ] },
    ],
    keyPoints: [
      `Keep it minimal: name, title, company, one contact method, one CTA.`,
      `Use a single purposeful CTA (book a call or one resource), never several.`,
      `Avoid heavy images and rows of social icons; they break and read as spam.`,
      `Make sure it renders cleanly on mobile, where most email is read.`,
    ],
    faqs: [
      { q: `What should a sales email signature include?`, a: `Your name, title, company, one contact method, and a single call to action such as a scheduling link. Keep it clean; a signature crowded with links and icons undercuts trust and breaks on mobile.` },
      { q: `Should my signature have a call to action?`, a: `Yes, one. A single CTA like "Grab 15 minutes: {link}" quietly drives meetings across every email you send. Multiple competing CTAs dilute the effect and look promotional.` },
      { q: `Are images and social icons a good idea in signatures?`, a: `Use them sparingly. Heavy images can trip spam filters and often fail to load, and rows of social icons add clutter without value. A clean, mostly-text signature renders reliably and reads as professional.` },
    ],
  },
  {
    slug: `sales-meeting-agenda-template`,
    title: `Sales meeting agenda template`,
    kw: `call agenda, structure, examples`,
    desc: `A sales meeting agenda template that keeps calls on track: objective, topics, timeboxes, and next steps. Send it before the call to set expectations.`,
    shortAnswer: `A sales meeting agenda sent in advance sets expectations, keeps the call on track, and signals professionalism. It states the objective, the topics with rough timeboxes, and the intended outcome. Below are agenda templates for a discovery call, a demo, and an internal deal review.`,
    intro: [
      `A shared agenda turns a meeting from a chat into a working session with a purpose.`,
      `Send it the day before so the buyer can add topics and come prepared.`,
    ],
    sections: [
      { h: `Discovery and demo agendas`, body: `Objective, topics, outcome.`, bullets: [
        `Discovery: "Objective: understand your {area} and see if there is a fit. 1) Your goals and challenges (15 min) 2) How we help teams like yours (5 min) 3) Questions and next steps (10 min)."`,
        `Demo: "Objective: show how we solve the three priorities you shared. 1) Recap of your goals (5) 2) Live walkthrough of {priority 1, 2, 3} (20) 3) Q&A and next steps (5)."`,
      ] },
      { h: `Internal deal review agenda`, body: `Keep pipeline reviews tight.`, bullets: [
        `"Objective: decide on next steps for {deal}. 1) Where it stands and the number (3) 2) Risks and blockers (5) 3) The plan to close and who owns what (7)."`,
        `Send with the note: "Add anything you want to cover, and I will send a recap with next steps after."`,
      ] },
    ],
    keyPoints: [
      `State the objective and intended outcome at the top.`,
      `List topics with rough timeboxes so the call stays on track.`,
      `Send it a day ahead so the buyer can add items and prepare.`,
      `Always end the agenda (and the meeting) with next steps.`,
    ],
    faqs: [
      { q: `Why send an agenda before a sales meeting?`, a: `It sets expectations, keeps the call focused, and signals professionalism. Sending it a day ahead also lets the buyer add topics and come prepared, which makes the meeting more productive for both sides.` },
      { q: `What should a sales meeting agenda include?`, a: `The objective, the topics with rough timeboxes, and the intended outcome or next step. A tight agenda prevents the meeting from drifting and ensures you cover what matters in the time you have.` },
      { q: `How detailed should a meeting agenda be?`, a: `Detailed enough to guide the conversation, brief enough to stay flexible. Three or four topics with time estimates and a clear objective is usually right; an overly rigid agenda can stifle a productive tangent.` },
    ],
  },
  {
    slug: `cover-email-for-proposal-template`,
    title: `Cover email for a proposal template`,
    kw: `proposal delivery email, examples`,
    desc: `A cover email template for sending a proposal: recap the value, point to what matters, and set the next step. The email that frames how they read it.`,
    shortAnswer: `The email that delivers a proposal frames how it gets read. A good cover email recaps the value in two lines, points the reader to the sections that matter, and proposes a next step like a walkthrough. Below are templates for sending a proposal to a champion and to an executive.`,
    intro: [
      `A proposal attached with "here you go" wastes the moment. The cover email primes the reader and sets the next step.`,
      `Keep it short and forwardable.`,
    ],
    sections: [
      { h: `Champion and executive cover emails`, body: `Frame the read, set the step.`, bullets: [
        `Champion: "Hi {First}, attached is the proposal we shaped around {their goal}. The key parts are the {approach} on page {n} and the ROI on page {n}. Happy to walk your team through it, does {time} work? I have also included a one-pager you can forward internally."`,
        `Executive: "Hi {First}, attached is our proposal. The executive summary on page 1 covers the problem, the outcome, and the investment. Bottom line: {ROI} in {timeframe}. Glad to answer anything directly."`,
      ] },
    ],
    keyPoints: [
      `Recap the value in two lines; do not just say "attached."`,
      `Point the reader to the two or three sections that matter most.`,
      `Propose a next step, usually a walkthrough, with specific times.`,
      `Include a forwardable one-pager so the champion can sell internally.`,
    ],
    faqs: [
      { q: `What should the email sending a proposal say?`, a: `Recap the value in two lines, point the reader to the sections that matter, and propose a next step like a walkthrough. The cover email frames how the proposal gets read, so "here you go" wastes the moment.` },
      { q: `Should I attach the proposal or link to it?`, a: `Either works, but a link lets you see when it is opened and update it without resending. Whichever you choose, put the key value and the next step in the email body, not just in the attachment.` },
      { q: `How do I follow up after sending a proposal?`, a: `Give it a day or two, then offer to walk it through and surface the likely gating step (budget, legal, a stakeholder). See a proposal follow-up email template for the exact language.` },
    ],
  },
  {
    slug: `meddic-template`,
    title: `MEDDIC template`,
    kw: `qualification framework, checklist, examples`,
    desc: `A MEDDIC template that qualifies enterprise deals: Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion. Fill-in prompts included.`,
    shortAnswer: `MEDDIC qualifies complex deals across six elements: Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, and Champion. Scoring a deal against each exposes the gaps that stall or lose it. Below is the template with the question to answer for each element and a quick scoring approach.`,
    intro: [
      `MEDDIC is a checklist for deal health. If you cannot fill in an element, that is your next action, not a guess to paper over.`,
      `Score each element and let the weakest drive your plan.`,
    ],
    sections: [
      { h: `The six elements`, body: `What to capture for each.`, table: {
        columns: [`Element`, `The question to answer`],
        rows: [
          [`Metrics`, `What quantified outcome does the buyer want, and what is it worth?`],
          [`Economic buyer`, `Who controls the budget and can say yes? Have you met them?`],
          [`Decision criteria`, `What formal and informal criteria will they judge options on?`],
          [`Decision process`, `What are the exact steps, approvals, and dates to a signature?`],
          [`Identify pain`, `What is the compelling problem and the cost of inaction?`],
          [`Champion`, `Who sells for you internally and has real influence?`],
        ],
      } },
      { h: `Scoring and using it`, body: `Turn the checklist into action.`, bullets: [
        `Score each element 0 to 2 (unknown, partial, solid). A deal with any zero on Economic buyer, Pain, or Champion is at real risk.`,
        `Your next action is always to close the biggest gap, not to advance the stage.`,
      ] },
    ],
    keyPoints: [
      `A blank element is a to-do, not something to assume.`,
      `Economic buyer, Pain, and Champion are the make-or-break three.`,
      `Score each element so deal reviews focus on the real gap.`,
      `Update MEDDIC live as you learn, not once at the end.`,
    ],
    faqs: [
      { q: `What does MEDDIC stand for?`, a: `Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, and Champion. It is a qualification framework for complex B2B deals that exposes the gaps most likely to stall or lose an opportunity.` },
      { q: `What is the difference between MEDDIC and MEDDPICC?`, a: `MEDDPICC adds Paper process (legal and procurement) and Competition to MEDDIC. The extra two elements matter most in large enterprise deals where contracts and competitive dynamics decide the outcome.` },
      { q: `How do I use MEDDIC in deal reviews?`, a: `Score each element, then focus the review on the weakest one, especially Economic buyer, Pain, or Champion. The framework turns "how is the deal feeling?" into "which specific gap are we closing next?"` },
    ],
  },
  {
    slug: `meddpicc-template`,
    title: `MEDDPICC template`,
    kw: `enterprise qualification, paper process, competition`,
    desc: `A MEDDPICC template for enterprise deals: adds Paper process and Competition to MEDDIC. Fill-in prompts and a scorecard to find deal risk early.`,
    shortAnswer: `MEDDPICC extends MEDDIC with two elements that decide large deals: Paper process (legal and procurement steps) and Competition. Scoring all eight exposes where an enterprise deal will stall. Below is the template with the question for each element and how to score deal health.`,
    intro: [
      `In enterprise deals, contracts and competitors sink more opportunities than product fit. MEDDPICC forces you to face both early.`,
      `Score all eight and manage to the weakest.`,
    ],
    sections: [
      { h: `The eight elements`, body: `MEDDIC plus two.`, table: {
        columns: [`Element`, `The question to answer`],
        rows: [
          [`Metrics`, `What quantified outcome does the buyer want?`],
          [`Economic buyer`, `Who owns the budget and the final yes?`],
          [`Decision criteria`, `How will they judge the options?`],
          [`Decision process`, `What are the steps and dates to a signature?`],
          [`Paper process`, `What legal, security, and procurement steps are required, and how long do they take?`],
          [`Identify pain`, `What is the compelling problem and cost of inaction?`],
          [`Champion`, `Who sells internally and has influence?`],
          [`Competition`, `Who or what else are they considering, including status quo?`],
        ],
      } },
      { h: `Working the paper process early`, body: `The element reps forget.`, bullets: [
        `Ask about security review, legal redlines, and procurement lead times during, not after, the sales process.`,
        `Map the paper process to a date so a 60-day legal cycle does not blow your quarter.`,
      ] },
    ],
    keyPoints: [
      `Paper process and Competition are what MEDDPICC adds; both decide enterprise deals.`,
      `Surface legal, security, and procurement timelines early, not at signature.`,
      `Always account for the status quo as a competitor.`,
      `Score all eight and drive the deal plan from the weakest element.`,
    ],
    faqs: [
      { q: `What does MEDDPICC stand for?`, a: `Metrics, Economic buyer, Decision criteria, Decision process, Paper process, Identify pain, Champion, and Competition. It extends MEDDIC with the paper process and competitive dynamics that decide large enterprise deals.` },
      { q: `Why does the paper process matter?`, a: `Legal redlines, security reviews, and procurement can add weeks or months to a deal. Surfacing and dating those steps early prevents a "verbally closed" deal from slipping a quarter on paperwork nobody planned for.` },
      { q: `Should I use MEDDIC or MEDDPICC?`, a: `Use MEDDIC for mid-market deals and MEDDPICC for enterprise, where contracts and competition are decisive. The extra two elements add overhead that pays off most in large, multi-stakeholder opportunities.` },
    ],
  },
  {
    slug: `bant-qualification-template`,
    title: `BANT qualification template`,
    kw: `budget, authority, need, timing`,
    desc: `A BANT qualification template: Budget, Authority, Need, Timing. Fill-in questions and a simple scorecard to qualify leads fast without over-engineering.`,
    shortAnswer: `BANT qualifies a lead on four practical dimensions: Budget, Authority, Need, and Timing. It is fast and works well for transactional and mid-market deals. Below is the template with the questions to ask for each dimension and a simple way to score whether a lead is ready to pursue.`,
    intro: [
      `BANT is the quickest qualification framework. It is not as deep as MEDDIC, but for many deals it is exactly enough.`,
      `Lead with Need; budget and authority mean nothing without a real problem.`,
    ],
    sections: [
      { h: `The four dimensions`, body: `What to ask for each.`, table: {
        columns: [`Dimension`, `Question to ask`],
        rows: [
          [`Budget`, `Is there budget allocated, or would we need to build the case?`],
          [`Authority`, `Who is involved in a decision like this besides you?`],
          [`Need`, `What problem is driving this, and how big is it?`],
          [`Timing`, `When do you want this solved, and what is driving that date?`],
        ],
      } },
      { h: `Scoring a BANT lead`, body: `Decide fast, honestly.`, bullets: [
        `Strong lead: clear Need plus at least two of Budget, Authority, Timing confirmed.`,
        `Nurture: real Need but no budget or timing yet. Stay in touch, do not force it.`,
        `Disqualify: no compelling Need. Everything else is irrelevant without it.`,
      ] },
    ],
    keyPoints: [
      `Lead with Need; budget and authority are meaningless without a real problem.`,
      `Use BANT for fast, transactional, or mid-market qualification.`,
      `Score honestly and be willing to nurture or disqualify.`,
      `For complex enterprise deals, step up to MEDDIC or MEDDPICC.`,
    ],
    faqs: [
      { q: `What does BANT stand for?`, a: `Budget, Authority, Need, and Timing. It is a fast qualification framework that checks whether a lead has the money, the decision power, a real problem, and a timeline worth pursuing now.` },
      { q: `Is BANT still relevant?`, a: `Yes, for transactional and mid-market deals where speed matters. For complex, multi-stakeholder enterprise deals, a deeper framework like MEDDIC captures the decision process and champion that BANT glosses over.` },
      { q: `What is the most important part of BANT?`, a: `Need. Without a compelling problem, budget, authority, and timing do not matter. Qualify the pain first, then confirm the practical gates of budget, authority, and timing.` },
    ],
  },
  {
    slug: `spin-selling-questions`,
    title: `SPIN selling questions`,
    kw: `Situation, Problem, Implication, Need-payoff`,
    desc: `A SPIN selling question template: Situation, Problem, Implication, Need-payoff. Real example questions for each stage to run consultative discovery.`,
    shortAnswer: `SPIN selling structures discovery into four question types: Situation, Problem, Implication, and Need-payoff. The sequence moves a buyer from describing their world to feeling the cost of a problem and articulating the value of solving it. Below are real example questions for each stage.`,
    intro: [
      `SPIN works because the buyer talks themselves into the need. Your job is to ask, in the right order, and listen.`,
      `Spend the least time on Situation and the most on Implication.`,
    ],
    sections: [
      { h: `Situation and Problem questions`, body: `Understand the world, then the pain.`, bullets: [
        `Situation: "How does your team handle {process} today? What tools do you use?" (Ask few; do your homework first.)`,
        `Problem: "Where does that process break down? What frustrates your team about it?"`,
      ] },
      { h: `Implication and Need-payoff questions`, body: `Where the deal is really made.`, bullets: [
        `Implication: "What does that problem cost you in time or revenue? How does it affect your targets? What happens if it continues?"`,
        `Need-payoff: "If you could solve that, what would it be worth? How would your team feel with that off their plate?"`,
      ] },
    ],
    keyPoints: [
      `Ask few Situation questions; research beforehand so you do not waste them.`,
      `Implication questions do the persuading by surfacing the cost of the problem.`,
      `Need-payoff questions let the buyer state the value themselves.`,
      `Follow the order; jumping to solutions before Implication weakens the case.`,
    ],
    faqs: [
      { q: `What does SPIN stand for?`, a: `Situation, Problem, Implication, and Need-payoff. It is a consultative questioning sequence that moves a buyer from describing their situation to feeling a problem's cost and articulating the value of solving it.` },
      { q: `Which SPIN questions matter most?`, a: `Implication and Need-payoff. Implication questions surface the cost of the problem, and Need-payoff questions get the buyer to state the value of a solution, which is far more persuasive than you asserting it.` },
      { q: `How is SPIN different from BANT?`, a: `SPIN is a questioning technique for consultative discovery; BANT is a qualification checklist. SPIN helps you develop the need and value on a call, while BANT screens whether a lead is worth pursuing at all.` },
    ],
  },
  {
    slug: `mutual-action-plan-template`,
    title: `Mutual action plan template`,
    kw: `MAP, close plan, joint steps`,
    desc: `A mutual action plan template that aligns buyer and seller on the steps to a decision: milestones, owners, and dates. Structure that keeps deals on track.`,
    shortAnswer: `A mutual action plan (MAP) is a shared, dated list of the steps both buyer and seller will take to reach a decision by a target date. Building it with the buyer creates commitment and surfaces hidden steps. Below is the template with the milestones to include and how to run it.`,
    intro: [
      `A MAP turns a hopeful timeline into a joint commitment. Building it with the buyer is itself a qualification event.`,
      `Work backward from their go-live or decision date.`,
    ],
    sections: [
      { h: `The milestones to include`, body: `Work backward from the goal.`, table: {
        columns: [`Milestone`, `Owner`, `Target date`],
        rows: [
          [`Discovery and requirements confirmed`, `Both`, `{date}`],
          [`Solution demo to stakeholders`, `Seller`, `{date}`],
          [`Business case and ROI reviewed`, `Both`, `{date}`],
          [`Technical and security review`, `Buyer`, `{date}`],
          [`Proposal and pricing agreed`, `Both`, `{date}`],
          [`Legal and procurement complete`, `Buyer`, `{date}`],
          [`Signature and kickoff`, `Both`, `{date}`],
        ],
      } },
      { h: `How to run the MAP`, body: `Make it a shared, living document.`, bullets: [
        `Build it live with your champion so they own the dates.`,
        `Share it, review it in every meeting, and update it as steps complete.`,
        `Watch for a buyer who will not commit to dates; that is a qualification signal.`,
      ] },
    ],
    keyPoints: [
      `Build the plan with the buyer so they own the commitments.`,
      `Work backward from the buyer's target go-live or decision date.`,
      `Assign an owner and a date to every milestone, including buyer-side steps.`,
      `A buyer unwilling to commit to dates is telling you the deal is not real yet.`,
    ],
    faqs: [
      { q: `What is a mutual action plan?`, a: `A shared, dated list of the steps both buyer and seller will take to reach a decision by a target date. Also called a close plan, it aligns everyone on the path to signature and surfaces hidden steps early.` },
      { q: `Why build a mutual action plan with the buyer?`, a: `Building it together creates commitment, surfaces steps you did not know about like security reviews, and tests how serious the buyer is. A buyer who engages with the plan is far more likely to close on time.` },
      { q: `When should I introduce a mutual action plan?`, a: `After discovery, once there is genuine interest and a target date. Introducing it too early feels presumptuous; introducing it once the deal is real turns a vague timeline into a managed path to close.` },
    ],
  },
  {
    slug: `account-plan-template`,
    title: `Account plan template`,
    kw: `strategic account, whitespace, growth`,
    desc: `An account plan template for strategic accounts: goals, stakeholder map, whitespace, risks, and an action plan. Structure to grow key accounts deliberately.`,
    shortAnswer: `An account plan is a strategy for growing and retaining a key account: the customer's goals, the stakeholder map, the whitespace for expansion, the risks, and a dated action plan. Below is the template with each section and the questions it should answer.`,
    intro: [
      `Account planning turns a customer into a portfolio you grow deliberately instead of reacting to renewals.`,
      `Center it on the customer's goals, not your quota.`,
    ],
    sections: [
      { h: `The core sections`, body: `What each should capture.`, bullets: [
        `Account overview: their business, goals, and priorities this year.`,
        `Relationship map: key stakeholders, their goals, and your standing with each.`,
        `Current footprint: what they buy today and the value delivered.`,
        `Whitespace: products, teams, or regions you have not sold into.`,
        `Risks: churn signals, single-threaded relationships, competitor presence.`,
        `Action plan: dated plays to expand, deepen relationships, and de-risk.`,
      ] },
      { h: `Working the plan`, body: `Keep it alive.`, bullets: [
        `Map relationships honestly: a single champion is a risk, not a strength.`,
        `Tie every expansion play to a customer goal, not just an upsell target.`,
        `Review quarterly and update after every major interaction.`,
      ] },
    ],
    keyPoints: [
      `Center the plan on the customer's goals, then find where you help.`,
      `Map stakeholders; being single-threaded is a top account risk.`,
      `Identify whitespace so expansion is deliberate, not accidental.`,
      `Review quarterly and keep the action plan dated and owned.`,
    ],
    faqs: [
      { q: `What is an account plan?`, a: `A strategy document for growing and retaining a key account, covering the customer's goals, stakeholder map, current footprint, whitespace for expansion, risks, and a dated action plan. It makes account growth deliberate rather than reactive.` },
      { q: `Which accounts need a formal account plan?`, a: `Your largest and most strategic accounts, where expansion potential and churn risk are both high. Smaller accounts can be managed with lighter touch; the planning effort should match the account's value.` },
      { q: `How often should I update an account plan?`, a: `Review it quarterly and update it after any major interaction or change in the account. A stale account plan is worse than none because it creates false confidence about relationships and risks.` },
    ],
  },
  {
    slug: `territory-plan-template`,
    title: `Territory plan template`,
    kw: `patch planning, segmentation, targets`,
    desc: `A territory plan template for reps: segment the patch, prioritize accounts, set targets, and build a time plan. Structure to hit quota deliberately.`,
    shortAnswer: `A territory plan turns a patch of accounts into a deliberate path to quota. It segments accounts, prioritizes where to spend time, sets targets, and lays out a coverage rhythm. Below is the template with each section and how to prioritize accounts for the highest return.`,
    intro: [
      `A territory without a plan gets worked by whoever emails last. A plan directs your time to where the pipeline is.`,
      `Prioritize by potential and propensity, not by who is loudest.`,
    ],
    sections: [
      { h: `The core sections`, body: `Build the plan in order.`, bullets: [
        `Territory overview: total accounts, segments, and market potential.`,
        `Segmentation: tier accounts by potential value and fit.`,
        `Prioritization: name your top target accounts and why.`,
        `Targets: pipeline and revenue goals by segment.`,
        `Coverage plan: how often you touch each tier, and through what channels.`,
        `Action plan: the plays and time allocation per week.`,
      ] },
      { h: `Prioritizing accounts`, body: `Spend time where it pays.`, bullets: [
        `Score accounts on potential value and propensity to buy; work the top-right quadrant first.`,
        `Protect existing customers (retention and expansion) as deliberately as you chase new logos.`,
        `Reserve time blocks for each tier so top accounts never get crowded out by busywork.`,
      ] },
    ],
    keyPoints: [
      `Segment and tier accounts by potential value and fit.`,
      `Prioritize the highest potential-plus-propensity accounts first.`,
      `Set a coverage rhythm so top accounts get consistent attention.`,
      `Balance new-logo hunting with retention and expansion of current customers.`,
    ],
    faqs: [
      { q: `What is a territory plan?`, a: `A rep's strategy for a patch of accounts: how to segment them, which to prioritize, what targets to hit, and how to allocate time across tiers. It directs limited selling time toward the accounts most likely to produce pipeline.` },
      { q: `How do I prioritize accounts in my territory?`, a: `Score each account on potential value and propensity to buy, then focus on the accounts high in both. Reserve time blocks per tier so your best accounts get consistent coverage instead of being crowded out.` },
      { q: `How often should I revisit my territory plan?`, a: `Quarterly, and whenever the territory or targets change. Markets, account priorities, and your own pipeline shift, so a territory plan should be a living document that guides where your time goes each week.` },
    ],
  },
  {
    slug: `sales-forecast-template`,
    title: `Sales forecast template`,
    kw: `pipeline forecast, categories, methods`,
    desc: `A sales forecast template with forecast categories, weighting, and a roll-up method. Structure to produce a number your leadership can actually trust.`,
    shortAnswer: `A sales forecast template turns your pipeline into a trustworthy number using forecast categories (commit, best case, pipeline) or stage-weighted probabilities. Below is the template with the categories, an example roll-up, and the discipline that keeps a forecast honest.`,
    intro: [
      `A forecast is a commitment, not a wish. Categories force reps to distinguish what they will close from what they hope to.`,
      `Consistency matters more than the method; pick one and apply it the same way every week.`,
    ],
    sections: [
      { h: `Forecast categories`, body: `The category discipline.`, table: {
        columns: [`Category`, `Meaning`, `Typical close likelihood`],
        rows: [
          [`Commit`, `You will close this; you would bet on it`, `90%+`],
          [`Best case`, `Realistic upside if things go well`, `50 to 75%`],
          [`Pipeline`, `Qualified but not yet dependable`, `20 to 40%`],
          [`Omitted`, `In pipeline but not this period`, `n/a`],
        ],
      } },
      { h: `Example roll-up and discipline`, body: `From deals to a number.`, bullets: [
        `Sum Commit as your floor, add a realistic slice of Best case for the forecast.`,
        `Every deal in Commit needs a next step, a date, and no open red flags.`,
        `Review weekly: what moved in, what moved out, and why. Slippage is the metric to watch.`,
      ] },
    ],
    keyPoints: [
      `Use categories (commit, best case, pipeline) to separate will-close from hope.`,
      `Require a next step and a date for every deal in commit.`,
      `Pick one method and apply it identically every week; consistency beats precision.`,
      `Track slippage (deals moving out) as the leading forecast-accuracy signal.`,
    ],
    faqs: [
      { q: `What are sales forecast categories?`, a: `Labels that separate deals by confidence: commit (you will close it), best case (realistic upside), and pipeline (qualified but not dependable). Categories force honest distinctions and produce a floor plus an upside number.` },
      { q: `How do I make a sales forecast accurate?`, a: `Apply one method consistently, require a next step and date for every commit deal, and review slippage weekly. Accuracy comes from disciplined, repeatable categorization, not from a clever formula applied unevenly.` },
      { q: `What is the difference between weighted and category forecasting?`, a: `Weighted forecasting multiplies each deal by a stage probability; category forecasting sorts deals into commit, best case, and pipeline buckets. Categories rely on rep judgment; weighting relies on historical stage conversion. Many teams use both.` },
    ],
  },
  {
    slug: `commission-plan-template`,
    title: `Sales commission plan template`,
    kw: `comp plan, quota, accelerators`,
    desc: `A sales commission plan template with base, variable, quota, rate, and accelerators. Structure a comp plan that motivates the right behavior. Example included.`,
    shortAnswer: `A commission plan template defines how reps are paid: base salary, on-target variable, quota, commission rate, and accelerators for overperformance. A good plan is simple, aligned to company goals, and motivating. Below is the template with each component and a worked example.`,
    intro: [
      `Comp plans drive behavior more than any pep talk. Keep them simple enough that a rep can calculate their own paycheck.`,
      `Reward the outcomes the business actually needs.`,
    ],
    sections: [
      { h: `The components`, body: `What a comp plan defines.`, table: {
        columns: [`Component`, `Definition`, `Example`],
        rows: [
          [`Base salary`, `Fixed pay`, `$70,000`],
          [`On-target variable`, `Commission at 100% of quota`, `$70,000`],
          [`OTE`, `Base plus on-target variable`, `$140,000`],
          [`Quota`, `The number to hit`, `$700,000 / year`],
          [`Commission rate`, `Variable divided by quota`, `10%`],
          [`Accelerator`, `Higher rate above quota`, `15% over 100%`],
        ],
      } },
      { h: `Design principles`, body: `Keep it clean and fair.`, bullets: [
        `Simplicity: a rep should be able to compute their commission in their head.`,
        `Alignment: pay more for the deals the business values (new logo, multi-year, strategic products).`,
        `Accelerators reward overperformance; avoid caps, which cap effort.`,
      ] },
    ],
    keyPoints: [
      `Keep the plan simple enough for reps to self-calculate.`,
      `Align payouts to the outcomes the business needs most.`,
      `Use accelerators above quota; avoid commission caps.`,
      `Set OTE and quota so a typical strong rep can realistically hit it.`,
    ],
    faqs: [
      { q: `What is OTE in a commission plan?`, a: `On-target earnings: the total a rep makes at 100 percent of quota, combining base salary and on-target variable commission. A 50/50 split between base and variable is common for full-cycle sales roles.` },
      { q: `How do I calculate a commission rate?`, a: `Divide the on-target variable pay by the annual quota. If variable is $70,000 and quota is $700,000, the base commission rate is 10 percent. Accelerators then raise the rate on revenue above quota.` },
      { q: `Should a commission plan have a cap?`, a: `Generally no. Caps tell your best reps to stop selling once they hit the ceiling. Accelerators above quota do the opposite, rewarding overperformance and keeping top performers motivated all period.` },
    ],
  },
  {
    slug: `sales-onboarding-checklist`,
    title: `Sales onboarding checklist`,
    kw: `new rep ramp, 30-60-90, template`,
    desc: `A sales onboarding checklist that ramps new reps faster: week-one setup, product and pitch certification, and 30-60-90 milestones. Copy and adapt.`,
    shortAnswer: `A sales onboarding checklist gets a new rep productive faster by sequencing what to learn and do across the first 90 days: tools and setup, product and pitch certification, shadowing, then live selling with milestones. Below is the checklist organized by phase.`,
    intro: [
      `Ramp time is expensive. A structured checklist replaces "figure it out" with a clear path to first deal.`,
      `Certify on pitch and product before a rep goes live, not after.`,
    ],
    sections: [
      { h: `Week one and first 30 days`, body: `Setup and foundations.`, bullets: [
        `Week 1: accounts and tools set up, CRM access, comp plan reviewed, team intros, ICP and product overview.`,
        `Days 1 to 30: product certification, pitch certification (role-play passed), shadow 5 calls, learn the sales process and CRM hygiene.`,
      ] },
      { h: `Days 30 to 90`, body: `From learning to producing.`, bullets: [
        `Days 30 to 60: run discovery calls with a coach, build first pipeline, get reverse-shadowed and coached.`,
        `Days 60 to 90: own the full cycle, hit a ramped pipeline target, first closed deal, certified on objection handling.`,
        `Milestone check: is the rep hitting activity and pipeline ramp targets? If not, diagnose and adjust.`,
      ] },
    ],
    keyPoints: [
      `Sequence onboarding by phase: setup, certify, shadow, then sell live.`,
      `Certify on product and pitch via role-play before live calls.`,
      `Set 30-60-90 milestones so ramp is measured, not assumed.`,
      `Diagnose early if a rep misses ramp targets; do not wait for quarter end.`,
    ],
    faqs: [
      { q: `What should a sales onboarding checklist include?`, a: `Tools and setup, product and pitch certification, sales-process training, call shadowing, and live selling with 30-60-90 milestones. Sequencing the ramp turns a vague first quarter into a measurable path to first deal.` },
      { q: `How long should sales onboarding take?`, a: `The structured program usually runs 90 days, though full ramp to quota varies by deal complexity. Certifying reps on pitch and product in the first 30 days lets them start building real pipeline sooner.` },
      { q: `How do I know if a new rep is ramping well?`, a: `Measure against 30-60-90 milestones: certifications passed, activity levels, pipeline built, and first deals. Missing a milestone is a signal to coach immediately rather than hope the next month improves on its own.` },
    ],
  },
  {
    slug: `qbr-template`,
    title: `QBR template (quarterly business review)`,
    kw: `customer review, agenda, structure`,
    desc: `A QBR template that drives renewal and expansion: results vs goals, usage, roadmap, and a plan for next quarter. Agenda and structure included.`,
    shortAnswer: `A quarterly business review (QBR) is a strategic check-in that reviews results against the customer's goals, shows value delivered, and plans the next quarter. Done well it drives renewal and expansion. Below is the QBR template with the agenda and what each section should cover.`,
    intro: [
      `A QBR is not a status meeting; it is where you prove value and shape the next quarter's plan.`,
      `Bring data and a point of view, not just a recap.`,
    ],
    sections: [
      { h: `The QBR agenda`, body: `Value first, plan second.`, bullets: [
        `1. Recap the customer's goals set last quarter.`,
        `2. Results vs goals, with usage and outcome data.`,
        `3. Wins and value delivered, in their metrics.`,
        `4. Challenges and areas to improve.`,
        `5. Roadmap and what is coming that helps them.`,
        `6. Plan and goals for next quarter, with owners.`,
      ] },
      { h: `Running a QBR that lands`, body: `Make it strategic.`, bullets: [
        `Tie every number to the customer's own goals, not your product usage for its own sake.`,
        `Bring one or two ideas to get more value next quarter; a QBR should move the account forward.`,
        `Include the economic buyer when you can; QBRs are a natural expansion and renewal moment.`,
      ] },
    ],
    keyPoints: [
      `Anchor the QBR on the customer's goals and results, not feature usage.`,
      `Bring data and a point of view, not a passive status recap.`,
      `Use it to plan next quarter with clear owners and goals.`,
      `Invite the economic buyer; QBRs drive renewal and expansion.`,
    ],
    faqs: [
      { q: `What is a QBR?`, a: `A quarterly business review: a strategic meeting with a customer to review results against their goals, demonstrate value delivered, and plan the next quarter. It is a retention and expansion tool, not a routine status update.` },
      { q: `What should a QBR cover?`, a: `The customer's goals, results and usage against them, wins delivered in their metrics, challenges, relevant roadmap, and a plan for next quarter with owners. Every section should connect to what the customer is trying to achieve.` },
      { q: `Who should attend a QBR?`, a: `Your champion and, when possible, the economic buyer, alongside your account team. Having the budget owner in the room makes the QBR a natural moment to discuss expansion and secure the next renewal.` },
    ],
  },
  {
    slug: `sales-report-template`,
    title: `Sales report template`,
    kw: `weekly, monthly, metrics to include`,
    desc: `A sales report template with the metrics that matter: pipeline, conversion, forecast, and activity. Weekly and monthly structures leaders can act on.`,
    shortAnswer: `A useful sales report shows the few metrics leaders act on: pipeline created and coverage, conversion by stage, forecast vs quota, and key activity. It highlights change and next actions, not a data dump. Below are weekly and monthly report structures and the metrics each should carry.`,
    intro: [
      `A report that lists every number gets ignored. A report that highlights what changed and what to do gets read.`,
      `Lead with the number vs the goal, then the story behind it.`,
    ],
    sections: [
      { h: `Weekly report structure`, body: `Operational and short.`, bullets: [
        `Number vs target for the period, and pace to goal.`,
        `Pipeline created this week and total coverage (pipeline / quota).`,
        `Deals that moved forward, slipped, or were lost, and why.`,
        `Top risks and the actions planned this week.`,
      ] },
      { h: `Monthly report structure`, body: `Strategic and trend-focused.`, bullets: [
        `Revenue vs quota, and trend over recent months.`,
        `Conversion rate by stage, flagging the weakest.`,
        `Win rate, average deal size, and sales cycle length.`,
        `Forecast for next period with confidence and key assumptions.`,
      ] },
    ],
    keyPoints: [
      `Report the few metrics leaders act on, not every available number.`,
      `Lead with actual vs goal, then the change and the reason.`,
      `Always include next actions and risks, not just status.`,
      `Keep weekly reports operational and monthly reports trend-focused.`,
    ],
    faqs: [
      { q: `What metrics should a sales report include?`, a: `Pipeline created and coverage, conversion by stage, win rate, average deal size, cycle length, and forecast vs quota. Choose the handful leaders act on and highlight change rather than dumping every metric.` },
      { q: `How often should I send a sales report?`, a: `Weekly for operational reports focused on this period's deals and actions, and monthly for strategic reports focused on trends and forecast. Match the cadence to the decisions the audience needs to make.` },
      { q: `What makes a sales report actually useful?`, a: `Highlighting what changed and what to do about it. A report that leads with actual-versus-goal, explains slippage, and names next actions drives decisions; a passive table of numbers gets skimmed and forgotten.` },
    ],
  },
  {
    slug: `icp-template`,
    title: `Ideal customer profile (ICP) template`,
    kw: `ICP, firmographics, fit criteria`,
    desc: `An ideal customer profile template: firmographics, triggers, pain, and disqualifiers. Define the accounts worth pursuing so the team targets the right ones.`,
    shortAnswer: `An ideal customer profile (ICP) defines the accounts most likely to buy, stay, and expand: firmographics, the pain you solve, buying triggers, and clear disqualifiers. A sharp ICP focuses the whole team's time. Below is the template with each dimension and how to build it from your best customers.`,
    intro: [
      `An ICP is about the account, not the person. Build it from your best current customers, not your aspirations.`,
      `Disqualifiers are as valuable as qualifiers; they save wasted effort.`,
    ],
    sections: [
      { h: `The ICP dimensions`, body: `What to define.`, bullets: [
        `Firmographics: industry, company size, revenue, geography.`,
        `Technographics and context: tools they use, team structure, maturity.`,
        `Pain: the specific problem you solve better than anyone.`,
        `Triggers: events that create urgency (growth, funding, new leadership).`,
        `Value fit: why they get outsized value and stay.`,
        `Disqualifiers: traits that predict churn or a bad fit.`,
      ] },
      { h: `Building it from your best customers`, body: `Data over guesswork.`, bullets: [
        `List your happiest, highest-value, longest-tenured customers and find the common traits.`,
        `Cross-check against churned or unhappy accounts to define disqualifiers.`,
        `Keep the ICP tight; a broad ICP is the same as no ICP.`,
      ] },
    ],
    keyPoints: [
      `Define the account, then layer personas on top for individuals.`,
      `Build the ICP from your best real customers, not aspirations.`,
      `Include disqualifiers; knowing who to avoid saves as much time as knowing who to chase.`,
      `Keep it tight so it actually focuses targeting.`,
    ],
    faqs: [
      { q: `What is an ideal customer profile?`, a: `A definition of the accounts most likely to buy, succeed, and expand, based on firmographics, the pain you solve, buying triggers, and disqualifiers. It focuses prospecting and marketing on the accounts worth pursuing.` },
      { q: `What is the difference between an ICP and a buyer persona?`, a: `An ICP describes the ideal account (company-level traits); a buyer persona describes the individuals within it (roles, goals, objections). You target accounts that fit the ICP and message the personas inside them.` },
      { q: `How do I build an ICP?`, a: `Analyze your best current customers for shared traits, cross-check against churned accounts to define disqualifiers, and keep the profile tight. Grounding the ICP in real outcomes beats defining it from who you wish you sold to.` },
    ],
  },
  {
    slug: `buyer-persona-template`,
    title: `Buyer persona template`,
    kw: `persona, goals, objections`,
    desc: `A buyer persona template: role, goals, pains, objections, and where they get information. Structure your messaging around the people who actually decide.`,
    shortAnswer: `A buyer persona captures the person you sell to: their role and goals, the pains they feel, their objections, what they value, and where they get information. Personas sharpen messaging and discovery. Below is the template with each field and how to build personas from real conversations.`,
    intro: [
      `Personas make your outreach specific. A message written for "everyone" persuades no one.`,
      `Build them from real buyer conversations, not internal assumptions.`,
    ],
    sections: [
      { h: `The persona fields`, body: `Capture what changes how you sell.`, bullets: [
        `Role and seniority: title, who they report to, what they own.`,
        `Goals: what success looks like for them personally and professionally.`,
        `Pains: the problems that keep them up at night.`,
        `Objections: what makes them hesitate to buy.`,
        `Value drivers: what they care about most (time, risk, growth, cost).`,
        `Information sources: where they learn and who they trust.`,
      ] },
      { h: `Building personas from real data`, body: `Interviews beat assumptions.`, bullets: [
        `Interview real buyers and users; note the language they use for their problems.`,
        `Distinguish the economic buyer, the champion, and the user; each needs different messaging.`,
        `Keep two to four personas; more than that dilutes focus.`,
      ] },
    ],
    keyPoints: [
      `Build personas from real buyer interviews, not internal guesses.`,
      `Separate the economic buyer, champion, and user; message each differently.`,
      `Capture objections and value drivers, not just demographics.`,
      `Keep to a handful of personas so the team can actually use them.`,
    ],
    faqs: [
      { q: `What is a buyer persona?`, a: `A profile of a person you sell to, covering their role, goals, pains, objections, value drivers, and information sources. Personas sharpen messaging and discovery by grounding them in what a specific buyer actually cares about.` },
      { q: `How many buyer personas should I have?`, a: `Two to four for most B2B products, typically the economic buyer, the champion, and the end user. More than that dilutes focus; the goal is enough distinction to tailor messaging, not a persona for every job title.` },
      { q: `How do I create accurate buyer personas?`, a: `Interview real buyers and users and capture the exact language they use for their problems. Personas built from real conversations reflect true objections and motivations, while ones invented internally tend to flatter the product.` },
    ],
  },
  {
    slug: `sales-cadence-template`,
    title: `Sales cadence template`,
    kw: `outreach rhythm, multi-touch, examples`,
    desc: `A sales cadence template with a proven multi-touch, multi-channel rhythm over 2 to 3 weeks. Day-by-day steps across email, call, and social. Copy and run.`,
    shortAnswer: `A sales cadence is the scheduled rhythm of touches you make to reach a prospect across channels: email, phone, and social, over two to three weeks. A good cadence mixes channels and spaces touches deliberately. Below is a day-by-day cadence you can run and adapt.`,
    intro: [
      `Consistency is what a cadence buys you. Most replies come after several touches, so a defined rhythm beats sporadic effort.`,
      `Mix channels; a prospect who ignores email may answer a call.`,
    ],
    sections: [
      { h: `A proven 8-touch cadence`, body: `Over roughly two to three weeks.`, bullets: [
        `Day 1: email 1 (intro) + connect on LinkedIn.`,
        `Day 3: call 1 + voicemail, then email 2 (value).`,
        `Day 5: email 3 (case study or resource).`,
        `Day 8: call 2 + voicemail.`,
        `Day 11: LinkedIn message or engage with their content.`,
        `Day 14: email 4 (different angle).`,
        `Day 18: call 3.`,
        `Day 21: break-up email.`,
      ] },
      { h: `Cadence design rules`, body: `Keep it effective and human.`, bullets: [
        `Mix at least two channels; email-only cadences underperform.`,
        `Space touches so you are persistent, not a pest; widen the gaps over time.`,
        `Every touch should add value or a new angle, never just "following up."`,
      ] },
    ],
    keyPoints: [
      `Run 6 to 10 touches over 2 to 3 weeks; most replies come mid-cadence.`,
      `Mix email, phone, and social; single-channel cadences underperform.`,
      `Give each touch a distinct angle, not a repeated "checking in."`,
      `End with a break-up touch to capture the loss-aversion reply.`,
    ],
    faqs: [
      { q: `What is a sales cadence?`, a: `The scheduled sequence of outreach touches, across email, phone, and social, that you make to reach a prospect over a set period, usually two to three weeks. It replaces sporadic follow-up with a deliberate, repeatable rhythm.` },
      { q: `How many touches should a sales cadence have?`, a: `Six to ten across two to three weeks for cold outreach. Most positive replies come in the middle of the cadence, so stopping after one or two touches leaves the majority of responses uncaptured.` },
      { q: `What is the difference between a cadence and a sequence?`, a: `The terms are often used interchangeably. When distinguished, a cadence is the overall multi-channel rhythm and a sequence is the specific automated series of steps, often email-focused, inside a sales engagement tool.` },
    ],
  },
  {
    slug: `sales-sequence-template`,
    title: `Sales sequence template`,
    kw: `email sequence, steps, automation`,
    desc: `A sales sequence template with a step-by-step automated series that pauses on reply. Cold, inbound, and re-engagement sequences you can build and run.`,
    shortAnswer: `A sales sequence is an automated series of steps, mostly emails with calls and social touches, that runs until a prospect replies. The best sequences pause on reply, personalize the opener, and vary the angle each step. Below are templates for a cold, an inbound, and a re-engagement sequence.`,
    intro: [
      `A sequence is a cadence you automate. The automation only works if it pauses the moment a prospect responds.`,
      `Personalize the first line of each email even when the rest is templated.`,
    ],
    sections: [
      { h: `A cold outbound sequence`, body: `Five steps over two weeks.`, bullets: [
        `Step 1 (day 1): trigger or insight email.`,
        `Step 2 (day 3): call + voicemail.`,
        `Step 3 (day 5): value email with a proof point.`,
        `Step 4 (day 9): different-angle email or a resource.`,
        `Step 5 (day 14): break-up email.`,
      ] },
      { h: `Inbound and re-engagement sequences`, body: `Match the intent.`, bullets: [
        `Inbound (fast, warm): reply within minutes, then day 1 call, day 2 value email, day 4 call, day 6 recap. Speed to lead is the biggest lever.`,
        `Re-engagement: day 1 "what changed" email, day 4 trigger-based email, day 8 break-up. Lead every step with something new.`,
      ] },
    ],
    keyPoints: [
      `Automate the rhythm but pause the sequence the instant a prospect replies.`,
      `Personalize each email's opener even when the body is templated.`,
      `Vary the angle per step; do not send the same message five times.`,
      `Match the sequence to intent: fast for inbound, patient for cold.`,
    ],
    faqs: [
      { q: `What is a sales sequence?`, a: `An automated series of outreach steps, mostly emails with calls and social touches, that runs on a schedule until a prospect replies. It lets a rep run consistent, multi-touch outreach across many prospects without manual tracking.` },
      { q: `Should sequences be automated?`, a: `The scheduling and reminders, yes, but each email's opener should be personalized and the sequence must pause on reply. Fully generic automation that keeps sending after a prospect answers reads as robotic and damages trust.` },
      { q: `How is speed-to-lead relevant to inbound sequences?`, a: `For inbound leads, responding within minutes dramatically raises connect and conversion rates. An inbound sequence should trigger an immediate reply or call, because the value of a fresh inbound lead decays by the hour.` },
    ],
  },
  {
    slug: `sales-battlecard-template`,
    title: `Sales battlecard template`,
    kw: `competitor card, objections, positioning`,
    desc: `A sales battlecard template that arms reps against a competitor: positioning, strengths, weaknesses, traps, and objection responses. One-page structure.`,
    shortAnswer: `A sales battlecard is a one-page reference that helps reps win against a specific competitor: how to position against them, their strengths and weaknesses, landmines to set, and responses to their claims. Below is the template with each section and how to keep battlecards current.`,
    intro: [
      `A battlecard turns competitive knowledge into something a rep can use live on a call.`,
      `Be honest about competitor strengths; reps who overclaim lose credibility.`,
    ],
    sections: [
      { h: `The one-page battlecard sections`, body: `What a rep needs at a glance.`, bullets: [
        `Positioning: one line on how you win against this competitor.`,
        `Their strengths: where they genuinely do well (acknowledge honestly).`,
        `Their weaknesses: gaps that matter to your buyers.`,
        `Landmines: questions to plant that expose their weaknesses.`,
        `Their claims and your responses: how to answer their pitch.`,
        `Proof: a win against them, with the reason you won.`,
      ] },
      { h: `Landmine and response examples`, body: `Turn knowledge into questions.`, bullets: [
        `Landmine: "When you evaluate options, ask how long until you are actually live with real data. That trips up a lot of tools."`,
        `Response to "they are cheaper": "On the sticker, yes. Ask what the add-ons and premium AI tiers cost once you scale; the all-in number usually flips."`,
      ] },
    ],
    keyPoints: [
      `Keep it to one page a rep can scan mid-call.`,
      `Acknowledge competitor strengths honestly to protect credibility.`,
      `Plant landmines as questions that surface competitor weaknesses.`,
      `Update battlecards from won and lost deals as the market shifts.`,
    ],
    faqs: [
      { q: `What is a sales battlecard?`, a: `A one-page reference that arms reps to win against a specific competitor, covering positioning, the competitor's strengths and weaknesses, landmines to plant, and responses to their claims. It makes competitive knowledge usable live on a call.` },
      { q: `What should a competitive battlecard include?`, a: `How you position against the competitor, their honest strengths and weaknesses, questions that expose their gaps, responses to their common claims, and proof from a real win. Keep it to one scannable page.` },
      { q: `How often should battlecards be updated?`, a: `Whenever the competitor changes pricing, features, or positioning, and continuously from your own win-loss data. A stale battlecard is dangerous because it gives reps outdated claims that a well-informed buyer can dismantle.` },
    ],
  },
  {
    slug: `win-loss-analysis-template`,
    title: `Win-loss analysis template`,
    kw: `deal review, interview questions, patterns`,
    desc: `A win-loss analysis template with interview questions and a scoring structure to learn why deals are really won and lost. Turn outcomes into a playbook.`,
    shortAnswer: `A win-loss analysis systematically studies why deals are won and lost by interviewing buyers and reviewing the deal, then finding patterns to act on. Below is the template with the interview questions for wins and losses and the factors to track so the findings improve your playbook.`,
    intro: [
      `Reps rationalize losses ("price") that were really something else. Structured win-loss analysis finds the truth.`,
      `Interview the buyer when you can; their reasons differ from the rep's.`,
    ],
    sections: [
      { h: `Win and loss interview questions`, body: `Ask the buyer, not just the rep.`, bullets: [
        `Why did you decide to make a change at all?`,
        `What criteria mattered most in your decision?`,
        `Why did you choose us / the other option?`,
        `Where did our process help or hurt?`,
        `What almost changed your mind?`,
      ] },
      { h: `Factors to track and act on`, body: `Turn stories into patterns.`, bullets: [
        `Tag each deal with the primary win or loss reason (product, price, process, relationship, timing, competitor).`,
        `Look for patterns by segment, competitor, and rep.`,
        `Feed findings into battlecards, messaging, and product priorities.`,
      ] },
    ],
    keyPoints: [
      `Interview the buyer; their real reasons differ from the rep's rationalization.`,
      `Tag every deal with a primary win or loss reason for pattern analysis.`,
      `Look for patterns by segment, competitor, and stage.`,
      `Feed findings back into battlecards, messaging, and the product roadmap.`,
    ],
    faqs: [
      { q: `What is win-loss analysis?`, a: `A structured study of why deals are won and lost, based on buyer interviews and deal review, used to find actionable patterns. It replaces reps' anecdotal explanations with evidence you can act on across the go-to-market.` },
      { q: `Who should conduct win-loss interviews?`, a: `Ideally someone other than the deal's rep, so buyers speak candidly, whether an enablement lead, a product marketer, or a third party. Buyers often share the real reason with a neutral interviewer that they would not tell the seller.` },
      { q: `What do I do with win-loss findings?`, a: `Feed them into battlecards, messaging, sales training, and product priorities. The value of win-loss analysis is in acting on the patterns, closing the gaps that cost you deals and doubling down on what wins them.` },
    ],
  },
  {
    slug: `sales-playbook-template`,
    title: `Sales playbook template`,
    kw: `process, plays, enablement`,
    desc: `A sales playbook template that documents how your team sells: process, personas, plays, messaging, and objection handling in one place. Structure included.`,
    shortAnswer: `A sales playbook documents how your team sells so results stop depending on which rep caught the deal: the process, personas, plays by stage, messaging, and objection handling in one place. Below is the template with each section and how to keep the playbook a living tool reps actually use.`,
    intro: [
      `A playbook turns your best reps' instincts into a repeatable system everyone can follow.`,
      `It must live where reps work, or it becomes a document no one opens.`,
    ],
    sections: [
      { h: `The core sections`, body: `What a playbook contains.`, bullets: [
        `Sales process: stages, exit criteria, and required actions.`,
        `ICP and personas: who to target and how they think.`,
        `Value proposition and messaging: how to talk about the product.`,
        `Plays by stage: the exact actions, scripts, and assets for each step.`,
        `Objection handling: responses to the common objections.`,
        `Tools and hygiene: how to run the CRM and what "good" looks like.`,
      ] },
      { h: `Keeping it alive`, body: `Make it used, not shelved.`, bullets: [
        `Embed plays in the CRM at the relevant stage so reps see them in context.`,
        `Update from win-loss analysis and what top reps actually do.`,
        `Coach to the playbook in deal reviews so it becomes the standard.`,
      ] },
    ],
    keyPoints: [
      `Document the process, personas, plays, messaging, and objections in one place.`,
      `Embed plays in the CRM where reps work, not in a static doc.`,
      `Build it from what your best reps actually do, then standardize it.`,
      `Update it continuously and coach to it in every deal review.`,
    ],
    faqs: [
      { q: `What is a sales playbook?`, a: `A document or system that captures how your team sells: the process, personas, plays by stage, messaging, and objection handling. It makes success repeatable so outcomes depend on the method, not on which rep happened to catch the deal.` },
      { q: `What should a sales playbook include?`, a: `The sales process with exit criteria, the ICP and personas, value messaging, specific plays and scripts by stage, objection responses, and CRM hygiene standards. Everything a rep needs to run a deal the way your best reps do.` },
      { q: `How do I get reps to use the playbook?`, a: `Embed the plays in the CRM at the relevant stage, keep it current from real deal data, and coach to it in reviews. Playbooks that live only in a slide deck get ignored; ones embedded in the workflow get used.` },
    ],
  },
  {
    slug: `deal-review-template`,
    title: `Deal review template`,
    kw: `opportunity review, questions, structure`,
    desc: `A deal review template with the questions that expose risk: qualification gaps, next steps, and the path to close. Structure for productive one-on-ones.`,
    shortAnswer: `A deal review inspects a single opportunity to find risk and decide the next move. A good one asks about qualification gaps, the decision process, and the close plan, not just "how does it feel?" Below is the template with the questions to ask and how to run a review that advances the deal.`,
    intro: [
      `Deal reviews go wrong when they become status updates. The goal is to find the one gap that could lose the deal.`,
      `Ask questions that expose risk, not ones that let the rep sound optimistic.`,
    ],
    sections: [
      { h: `The questions that expose risk`, body: `Inspect, do not narrate.`, bullets: [
        `What is the compelling reason to buy, and what does inaction cost them?`,
        `Have you met the economic buyer? What do they care about?`,
        `Who is your champion, and can they sell this internally?`,
        `What is the exact decision and paper process, with dates?`,
        `What is the single biggest risk to this deal right now?`,
      ] },
      { h: `Running a productive review`, body: `Leave with actions.`, bullets: [
        `Focus on the weakest qualification element; that is the next action.`,
        `End with a specific, owned next step and a date, not a vibe.`,
        `Skip deals that are healthy and on track; spend time on the ones at risk.`,
      ] },
    ],
    keyPoints: [
      `Inspect qualification gaps and the close plan, not the rep's optimism.`,
      `Always identify the single biggest risk to the deal.`,
      `End every review with a specific, owned, dated next action.`,
      `Spend time on at-risk deals, not the ones already on track.`,
    ],
    faqs: [
      { q: `What is a deal review?`, a: `A focused inspection of a single opportunity to surface risk and decide the next move. Unlike a pipeline review, which scans many deals, a deal review goes deep on one to test qualification and the path to close.` },
      { q: `What questions should I ask in a deal review?`, a: `Ones that expose risk: the compelling reason to buy, whether you have met the economic buyer, the strength of the champion, the exact decision and paper process, and the single biggest risk. Avoid questions that let the rep just sound confident.` },
      { q: `How is a deal review different from a pipeline review?`, a: `A deal review inspects one opportunity in depth; a pipeline review scans the whole pipeline for movement, coverage, and stalled deals. Use pipeline reviews to spot problems and deal reviews to solve them.` },
    ],
  },
  {
    slug: `pipeline-review-template`,
    title: `Pipeline review template`,
    kw: `pipeline meeting, agenda, questions`,
    desc: `A pipeline review template that keeps deals moving: coverage, stalled deals, movement, and forecast. Agenda and questions for a tight weekly review.`,
    shortAnswer: `A pipeline review inspects the whole pipeline for health: coverage against quota, deals that moved or stalled, and forecast confidence. A good one focuses on movement, not deal count. Below is the template with the agenda, the metrics to check, and the questions that keep reps honest.`,
    intro: [
      `A pipeline review is about the system, not one deal. Look for stalls, thin coverage, and slippage.`,
      `Keep it to 30 minutes and focus on what is not moving.`,
    ],
    sections: [
      { h: `The review agenda`, body: `Health, then action.`, bullets: [
        `Coverage: is qualified pipeline at least 3x the quota gap?`,
        `Movement: what advanced, what slipped, what was lost this week?`,
        `Stalled deals: which have no next step or no activity in 30-plus days?`,
        `Forecast: what is commit vs best case, and did it change?`,
        `Actions: the top plays for the week.`,
      ] },
      { h: `Questions that keep it honest`, body: `Focus on the stuck.`, bullets: [
        `"This deal has not moved in three weeks. What is the actual blocker?"`,
        `"What is the next step and its date? If there is not one, why is this still open?"`,
        `"What would have to be true for this to close this quarter?"`,
      ] },
    ],
    keyPoints: [
      `Focus on movement and stalls, not the raw count of deals.`,
      `Check coverage (roughly 3x the quota gap) every review.`,
      `Flag any deal with no next step or no recent activity.`,
      `Keep it to 30 minutes and leave with owned actions.`,
    ],
    faqs: [
      { q: `What is a pipeline review?`, a: `A recurring meeting that inspects the whole pipeline for health: coverage against quota, deal movement, stalled opportunities, and forecast confidence. It catches systemic problems like thin coverage or widespread slippage early.` },
      { q: `How often should I run a pipeline review?`, a: `Weekly for most sales teams. A weekly rhythm catches stalls and slippage while there is still time to act, and it keeps reps accountable for moving deals forward rather than letting them age quietly.` },
      { q: `What should a pipeline review focus on?`, a: `Movement and health, not deal count. Look at coverage, what advanced or slipped, deals with no next step, and forecast changes. A review that just reads the list without probing stalls does not improve outcomes.` },
    ],
  },
  {
    slug: `30-60-90-day-sales-plan-template`,
    title: `30-60-90 day sales plan template`,
    kw: `new rep plan, onboarding, interview`,
    desc: `A 30-60-90 day sales plan template for new reps and interviews: learn, then contribute, then own. Milestones for each phase you can copy and adapt.`,
    shortAnswer: `A 30-60-90 day sales plan lays out a new rep's first three months in three phases: learn (days 1 to 30), contribute (31 to 60), and own (61 to 90). It is used for onboarding and to stand out in interviews. Below is the template with goals and milestones for each phase.`,
    intro: [
      `A clear 30-60-90 plan turns an overwhelming first quarter into a sequence of achievable goals.`,
      `In interviews, presenting one signals you think like an owner.`,
    ],
    sections: [
      { h: `Days 1 to 30: learn`, body: `Absorb the product, market, and process.`, bullets: [
        `Complete product and pitch certification.`,
        `Learn the ICP, personas, and competitive landscape.`,
        `Shadow calls and study the sales process and CRM.`,
        `Meet the team and key cross-functional partners.`,
      ] },
      { h: `Days 31 to 60: contribute`, body: `Start doing the work with support.`, bullets: [
        `Run discovery calls with coaching and build first pipeline.`,
        `Hit ramped activity targets and get feedback loops going.`,
        `Own a small set of accounts or leads end to end.`,
      ] },
      { h: `Days 61 to 90: own`, body: `Operate independently and produce.`, bullets: [
        `Run the full cycle solo and hit a ramped pipeline or revenue target.`,
        `Close a first deal and refine what is working.`,
        `Set goals for the next quarter based on early data.`,
      ] },
    ],
    keyPoints: [
      `Structure the first quarter as learn, contribute, own.`,
      `Attach concrete milestones to each phase, not vague intentions.`,
      `Certify on product and pitch in the first 30 days to start producing sooner.`,
      `In interviews, a specific 30-60-90 plan signals ownership and preparation.`,
    ],
    faqs: [
      { q: `What is a 30-60-90 day sales plan?`, a: `A structured plan for a rep's first three months, split into learning (days 1 to 30), contributing (31 to 60), and owning (61 to 90). It gives a new hire a clear path from ramp to independent production.` },
      { q: `How do I use a 30-60-90 plan in an interview?`, a: `Present a specific plan for how you would ramp in the role: what you would learn first, how you would start contributing, and what you would own by day 90. It signals ownership and preparation that generic answers do not.` },
      { q: `What should a new rep achieve by day 90?`, a: `Independent operation of the full sales cycle, a ramped pipeline or revenue target, and ideally a first closed deal. Day 90 is where a rep transitions from supported learning to accountable production.` },
    ],
  },
  {
    slug: `value-proposition-template`,
    title: `Value proposition template`,
    kw: `positioning, formula, examples`,
    desc: `A value proposition template and formula: for a target customer, the outcome you deliver, and why you are different. Build messaging that actually lands.`,
    shortAnswer: `A value proposition states, in one clear statement, who you help, the outcome you deliver, and why you are different or better. The template below gives you a fill-in formula, a worked example, and the test that separates a real value proposition from a vague slogan.`,
    intro: [
      `A value proposition is not a tagline; it is a claim about the outcome you deliver for a specific customer.`,
      `If a competitor could say the same sentence, it is not sharp enough.`,
    ],
    sections: [
      { h: `The formula`, body: `Specific, outcome-led, differentiated.`, bullets: [
        `"For {target customer} who {need}, {product} is a {category} that {key benefit}. Unlike {alternative}, we {differentiator}."`,
        `Example: "For revenue teams who are tired of CRMs that take months to set up, Rally is an AI-native CRM that is alive with data on day one. Unlike legacy tools, our operator does the work instead of just storing it."`,
      ] },
      { h: `The test`, body: `Is it real or a slogan?`, bullets: [
        `Specific: names a real customer and a real outcome, not "the best solution."`,
        `Differentiated: a competitor could not honestly claim the same thing.`,
        `Provable: you can back it with evidence, not adjectives.`,
      ] },
    ],
    keyPoints: [
      `Name the target customer and the outcome, not just the product category.`,
      `Include a differentiator a competitor could not honestly claim.`,
      `Make it provable with evidence, not adjectives.`,
      `Test it against every competitor; sameness means it is too vague.`,
    ],
    faqs: [
      { q: `What is a value proposition?`, a: `A clear statement of who you help, the outcome you deliver, and why you are different or better. It is the core of your positioning and messaging, and it should be specific enough that a competitor could not honestly say the same thing.` },
      { q: `How is a value proposition different from a tagline?`, a: `A tagline is a memorable phrase for brand recall; a value proposition is a specific, provable claim about the outcome you deliver for a target customer. Taglines evoke; value propositions persuade and can be backed with evidence.` },
      { q: `How do I know if my value proposition is strong?`, a: `Test whether it is specific, differentiated, and provable. If it names a real customer and outcome, a competitor could not honestly claim it, and you can back it with evidence, it is strong. If it is interchangeable with rivals, sharpen it.` },
    ],
  },
  {
    slug: `lead-scoring-template`,
    title: `Lead scoring template`,
    kw: `fit and engagement, model, thresholds`,
    desc: `A lead scoring template that prioritizes the right leads: fit points plus engagement points, with thresholds for MQL and SQL. Example model included.`,
    shortAnswer: `A lead scoring model ranks leads by combining fit (how well they match your ICP) and engagement (how much interest they show). Scoring both dimensions tells reps who to call first. Below is the template with example point values and the thresholds for marketing- and sales-qualified leads.`,
    intro: [
      `Lead scoring answers one question: who do I work first? Score fit and engagement separately so a high-interest bad-fit lead does not jump the queue.`,
      `Start simple and tune from real conversion data.`,
    ],
    sections: [
      { h: `Example scoring model`, body: `Fit points plus engagement points.`, table: {
        columns: [`Signal`, `Type`, `Points`],
        rows: [
          [`Title matches buyer persona`, `Fit`, `+20`],
          [`Company size in ICP range`, `Fit`, `+15`],
          [`Industry in ICP`, `Fit`, `+10`],
          [`Out-of-ICP industry`, `Fit`, `-15`],
          [`Requested a demo`, `Engagement`, `+30`],
          [`Opened 3+ emails / visited pricing`, `Engagement`, `+15`],
          [`No activity in 30 days`, `Engagement`, `-10`],
        ],
      } },
      { h: `Thresholds and use`, body: `Turn scores into action.`, bullets: [
        `MQL: fit is acceptable and engagement crosses a set bar (for example, 40+ total).`,
        `SQL: strong fit plus a high-intent action like a demo request.`,
        `Route the highest fit-plus-engagement leads to reps first; nurture the rest.`,
      ] },
    ],
    keyPoints: [
      `Score fit and engagement separately so a bad-fit lead cannot jump the queue.`,
      `Use negative points for disqualifying signals, not just positive ones.`,
      `Set clear MQL and SQL thresholds to hand off leads consistently.`,
      `Tune the model from real conversion data over time.`,
    ],
    faqs: [
      { q: `What is lead scoring?`, a: `A method of ranking leads by combining fit (match to your ICP) and engagement (interest shown), so reps work the most promising leads first. Scoring both dimensions prevents a high-interest but poor-fit lead from being over-prioritized.` },
      { q: `What signals should a lead scoring model use?`, a: `Fit signals like title, company size, and industry, plus engagement signals like demo requests, pricing-page visits, and email opens. Include negative points for disqualifiers such as out-of-ICP industry or long inactivity.` },
      { q: `What is the difference between an MQL and an SQL?`, a: `A marketing-qualified lead has enough fit and engagement to warrant sales attention; a sales-qualified lead has been vetted by a rep as a real opportunity worth pursuing. Clear score thresholds keep the handoff between the two consistent.` },
    ],
  },
  {
    slug: `close-plan-template`,
    title: `Close plan template`,
    kw: `path to signature, steps, dates`,
    desc: `A close plan template that maps the exact steps to signature: milestones, owners, and dates working back from the go-live date. Keep deals on track.`,
    shortAnswer: `A close plan is the seller's map of the exact steps, owners, and dates required to get a specific deal from where it is now to signature. Built backward from the buyer's target date, it exposes risk and keeps momentum. Below is the template and how it differs from a mutual action plan.`,
    intro: [
      `A close plan is how a rep de-risks a deal in the final stretch. Every step gets an owner and a date.`,
      `Share it with the buyer to turn it into a mutual commitment.`,
    ],
    sections: [
      { h: `The steps to signature`, body: `Work backward from the target date.`, table: {
        columns: [`Step`, `Owner`, `Target date`],
        rows: [
          [`Final proposal reviewed`, `Both`, `{date}`],
          [`Business case approved by economic buyer`, `Buyer`, `{date}`],
          [`Security and technical review`, `Buyer`, `{date}`],
          [`Legal redlines resolved`, `Both`, `{date}`],
          [`Procurement and PO issued`, `Buyer`, `{date}`],
          [`Signature`, `Buyer`, `{date}`],
          [`Kickoff and go-live`, `Both`, `{date}`],
        ],
      } },
      { h: `Working the close plan`, body: `Keep it honest and shared.`, bullets: [
        `Work backward from the buyer's go-live date so the dates are real.`,
        `Assign an owner to every step, including buyer-side ones.`,
        `A buyer who will not engage with the dates is signaling the deal is not ready.`,
      ] },
    ],
    keyPoints: [
      `Map every step to signature with an owner and a date.`,
      `Build the plan backward from the buyer's target go-live date.`,
      `Include buyer-side steps like security, legal, and procurement.`,
      `Share it with the buyer to convert it into a joint commitment.`,
    ],
    faqs: [
      { q: `What is a close plan?`, a: `A seller's map of the specific steps, owners, and dates needed to move a deal from its current stage to signature, built backward from the buyer's target date. It exposes hidden steps and keeps a late-stage deal from slipping.` },
      { q: `What is the difference between a close plan and a mutual action plan?`, a: `They are closely related. A close plan is often the seller's internal view of the path to signature, while a mutual action plan is the same plan built and shared jointly with the buyer. Sharing a close plan effectively turns it into a mutual action plan.` },
      { q: `When should I build a close plan?`, a: `Once a deal is qualified and there is a target date, typically in the proposal or negotiation stage. Building it surfaces buyer-side steps like legal and procurement early, so a verbally-closed deal does not slip on paperwork.` },
    ],
  },
  {
    slug: `negotiation-planning-template`,
    title: `Negotiation planning template`,
    kw: `prepare to negotiate, BATNA, give-gets`,
    desc: `A negotiation planning template: goals, walk-away, BATNA, tradeables, and give-gets. Prepare before the call so you never improvise a concession.`,
    shortAnswer: `A negotiation planning template forces you to prepare before the conversation: your target and walk-away, your BATNA, the other side's likely position, and your planned give-gets. Preparation is what keeps you from conceding on reflex. Below is the template and how to use each part.`,
    intro: [
      `Most bad negotiation outcomes are decided before the call, by failing to prepare. This template fixes that.`,
      `Know your walk-away and your trades before you pick up the phone.`,
    ],
    sections: [
      { h: `What to plan`, body: `Fill this in before you negotiate.`, bullets: [
        `Target: the outcome you want (price, terms, timeline).`,
        `Walk-away: the point past which no deal is better than this deal.`,
        `BATNA: your best alternative if this deal falls through.`,
        `Their position: their likely goals, pressures, and constraints.`,
        `Tradeables: what you can give that costs you little but they value.`,
        `Give-gets: each concession paired with what you will ask in return.`,
      ] },
      { h: `Using the plan`, body: `Trade, do not cave.`, bullets: [
        `Never give a concession without getting something; consult your give-get list.`,
        `Anchor first when you have information; it frames the range.`,
        `If you hit your walk-away, be willing to pause or exit calmly.`,
      ] },
    ],
    keyPoints: [
      `Set your target and walk-away before the conversation.`,
      `Know your BATNA; it is your real source of leverage.`,
      `List tradeables that cost you little but the buyer values.`,
      `Pair every concession with a give-get so you never cave for free.`,
    ],
    faqs: [
      { q: `What is a BATNA?`, a: `Your best alternative to a negotiated agreement, the option you would take if this deal fell through. A strong BATNA is your real leverage: it lets you walk away, which prevents you from accepting terms worse than your alternatives.` },
      { q: `How do I prepare for a sales negotiation?`, a: `Define your target and walk-away, know your BATNA, anticipate the other side's position, and plan your tradeables and give-gets in advance. Most negotiation outcomes are decided by preparation, not by improvisation on the call.` },
      { q: `What is a give-get in negotiation?`, a: `A concession offered only in exchange for something of value, like a discount for a longer term or faster signature. Planning give-gets ahead of time keeps every concession earning its way into a better overall deal.` },
    ],
  },
  {
    slug: `sales-kpi-dashboard-template`,
    title: `Sales KPI dashboard template`,
    kw: `metrics, dashboard, what to track`,
    desc: `A sales KPI dashboard template with the metrics that matter: pipeline, conversion, velocity, and forecast. What to track by role and how to read it.`,
    shortAnswer: `A sales KPI dashboard shows the handful of metrics a team steers by: pipeline coverage, conversion rates, win rate, sales velocity, and forecast attainment. Tracking too many metrics buries the signal. Below is the template with the core KPIs, how each is calculated, and which role watches which.`,
    intro: [
      `A dashboard is for decisions, not decoration. Track the metrics you would actually change behavior over.`,
      `Different roles need different views; do not show a rep the board's metrics.`,
    ],
    sections: [
      { h: `The core KPIs`, body: `What to track and how it is calculated.`, table: {
        columns: [`KPI`, `How it is calculated`, `Watched by`],
        rows: [
          [`Pipeline coverage`, `Open pipeline / quota gap`, `Manager, rep`],
          [`Win rate`, `Won deals / total closed`, `Manager, leader`],
          [`Conversion by stage`, `Deals advancing / entering each stage`, `Manager`],
          [`Sales velocity`, `Deals x win rate x deal size / cycle length`, `Leader`],
          [`Average deal size`, `Total revenue / deals won`, `Leader`],
          [`Forecast attainment`, `Actual / forecast`, `Leader`],
        ],
      } },
      { h: `Designing the dashboard`, body: `Signal over noise.`, bullets: [
        `Show each metric against a goal or trend, not just a raw value.`,
        `Give reps activity and pipeline views; give leaders trend and forecast views.`,
        `Limit the top-level dashboard to five or six KPIs; drill-downs for the rest.`,
      ] },
    ],
    keyPoints: [
      `Track the few KPIs you would actually change behavior over.`,
      `Show every metric against a goal or trend, not in isolation.`,
      `Tailor the view to the role; reps and leaders need different metrics.`,
      `Cap the top-level dashboard at five or six KPIs to protect the signal.`,
    ],
    faqs: [
      { q: `What KPIs should a sales dashboard track?`, a: `The core set is pipeline coverage, win rate, conversion by stage, sales velocity, average deal size, and forecast attainment. These few metrics let a team steer; adding dozens more buries the signal that drives decisions.` },
      { q: `What is sales velocity?`, a: `A measure of how fast revenue moves through your pipeline, calculated as the number of deals times win rate times average deal size, divided by the average sales cycle length. Improving any input raises velocity.` },
      { q: `How many metrics should a sales dashboard show?`, a: `Five or six at the top level, with drill-downs for detail. A dashboard is for decisions, so it should surface the metrics a team acts on and push everything else into secondary views to keep the main view readable.` },
    ],
  },
];

const RALLY_NOTE = (t) => ({
  h: `Generate and send this with Rally`,
  body: `You do not have to start from a blank page. Tell Rook, Rally's AI operator, what you need (for example, "${t.rookAsk || t.title.toLowerCase()}") and it drafts a version grounded in your real pipeline data, personalizes it for the specific contact or deal, and can send it or attach it to the record in one step. Every template lives in one shared library, so your whole team stays on message and nothing gets rewritten from scratch.`,
});

export default TEMPLATES.map((t) => ({
  slug: t.slug,
  type: `template`,
  title: t.title,
  metaTitle: t.metaTitle || `${t.title}: ${t.kw} (${YEAR}) | Rally`,
  metaDescription: t.desc,
  eyebrow: `Templates and scripts`,
  h1: t.h1 || t.title,
  shortAnswer: t.shortAnswer,
  intro: t.intro,
  sections: [...(t.sections || []), RALLY_NOTE(t)],
  keyPoints: t.keyPoints,
  faqs: t.faqs,
  published: `2026-07-10`,
  updated: `2026-07-10`,
}));
