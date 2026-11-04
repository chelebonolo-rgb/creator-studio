import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Content from './models/Content.js';

const { MONGODB_URI, CREATOR_EMAIL } = process.env;
const day = 24 * 60 * 60 * 1000;

const sampleStories = [
  {
    title: 'Make room for the first draft',
    description: 'A gentle reminder that good work rarely arrives fully formed—and why starting messy is a creative skill.',
    category: 'Education',
    contentType: 'Article',
    articleContent: `The first version of an idea has one job: to exist. It does not need to be elegant, complete, or ready for anyone else to see. It only needs to give you something real to work with.\n\nWhen a blank page feels intimidating, make the task smaller. Write one sentence about what you are trying to say. Sketch the rough shape of a project. Record a voice note while you take a walk. A small beginning is still a beginning.\n\nThen give yourself permission to revise. The useful questions—what is clear, what is missing, what can go—are much easier to answer when there is already something on the page.\n\nMake a little room for the imperfect first try. It is not evidence that you are behind; it is how the work gets moving.`,
    publishedDaysAgo: 3,
  },
  {
    title: 'A calmer way to plan your week',
    description: 'A simple weekly reset for choosing what matters, leaving breathing room, and making plans you can actually keep.',
    category: 'Lifestyle',
    contentType: 'Article',
    articleContent: `A useful plan is not a list of everything you might possibly do. It is a short promise to your future self about what deserves your attention.\n\nAt the start of the week, write down the few things that would make it feel meaningful. Choose one priority for work, one practical task, and one thing you want to make time for because it feels good. Put those on the calendar before filling the remaining space.\n\nLeave some blank space, too. Errands take longer than expected, energy changes, and good ideas often need an unhurried hour. A plan with room to breathe is easier to return to when the week gets busy.\n\nOn Friday, notice what worked without turning the review into a scorecard. Keep the helpful parts, let go of the rest, and begin again.`,
    publishedDaysAgo: 1,
  },
  {
    title: 'Small tools, better ideas',
    description: 'A practical approach to choosing creative tools: start with the habit you want to support, not the newest feature.',
    category: 'Technology',
    contentType: 'Article',
    articleContent: `The best creative tool is often the one that makes it easier to come back tomorrow. Before trying another app, notice where your current process gets stuck. Do ideas disappear before you can capture them? Is it hard to find the latest draft? Does getting started take too many steps?\n\nChoose one small friction point and look for the simplest tool that solves it. A notes app can be enough for collecting ideas. A calendar reminder can protect an hour for making. A clearly named folder can save more time than a complicated workflow.\n\nTry the new setup for a week before adding anything else. If it helps you make or finish something, keep it. If it becomes another thing to manage, let it go.\n\nA thoughtful process is built from tools that serve the work—not work that serves the tools.`,
    publishedDaysAgo: 7,
  },
  {
    title: 'The joy of making a tiny playlist',
    description: 'A few songs can turn an ordinary walk or slow afternoon into a small ritual worth looking forward to.',
    category: 'Entertainment',
    contentType: 'Article',
    articleContent: `A playlist does not need a grand concept or a perfect running order. Sometimes it is enough to gather five songs that belong to a particular mood: the walk home at sunset, the first cup of coffee, or the hour when you want to focus.\n\nStart with one song you already love. Add a couple that share its feeling, then one that changes the pace just enough to keep things interesting. The little surprises are often what make a collection feel personal.\n\nGive it a name that will make sense to you later. It can be a place, a season, or a sentence you heard during the week. The point is not to make a definitive list; it is to make something you will enjoy pressing play on.\n\nNext time the day feels a little too ordinary, take the playlist with you. Small rituals have a way of making familiar moments feel newly noticed.`,
    publishedDaysAgo: 0,
  },
  {
    title: 'A kinder measure of progress',
    description: 'Look beyond the finished checklist and notice the small signs that your work, skills, and confidence are growing.',
    category: 'Business',
    contentType: 'Article',
    articleContent: `It is easy to measure progress only by what is finished. But the work that leads to a finished thing is full of quieter signs: a question you can answer more clearly, a task that takes less effort than it used to, or the confidence to ask for useful feedback sooner.\n\nTry keeping a short weekly note with three prompts: What moved forward? What did I learn? What would make next week easier? A few honest lines are enough. Over time, these notes create a record that is more generous and more useful than memory alone.\n\nThis is not a reason to ignore goals. It is a way to see the path between where you are and where you want to go. If the same obstacle appears repeatedly, you can respond to it. If something is working, you can make room for more of it.\n\nProgress is still progress when it is quiet. Give yourself a way to notice it.`,
    publishedDaysAgo: 2,
  },
  {
    title: 'Bring curiosity to the everyday',
    description: 'A small field guide to noticing familiar places again, from the corner shop to the route you take every morning.',
    category: 'Other',
    contentType: 'Article',
    articleContent: `Familiarity is comfortable, but it can make a place disappear into the background. The same street becomes a shortcut, the same cafe becomes a routine, and the details that once caught your eye are easy to miss.\n\nTry taking one ordinary route with a simple question in mind. What is changing? Which window has the best light? What sounds are usually here that you rarely stop to notice? You do not need to turn the walk into a project. Let the question make you a little more attentive.\n\nIf something catches your interest, write down a few words or take a picture for yourself. A tiny collection of observations can become the beginning of a story, a sketch, or simply a better memory of the day.\n\nCuriosity does not always ask us to go somewhere new. Sometimes it helps us arrive more fully where we already are.`,
    publishedDaysAgo: 4,
  },
  {
    title: 'Make an evening that feels like yours',
    description: 'A low-pressure reset for ending the day with a little more intention and a little less scrolling.',
    category: 'Lifestyle',
    contentType: 'Article',
    articleContent: `A good evening routine does not need a dozen steps or an ideal version of you. It can be a small transition that helps the day feel complete. Choose one cue you can repeat: put the kettle on, set out a book, or take five minutes to clear the table.\n\nThen decide what you want the next half hour to feel like. Restful might mean a familiar show and a comfortable chair. Connected might mean calling someone you miss. Creative might mean making a few notes without worrying whether they lead anywhere.\n\nLeave your phone somewhere slightly less convenient if it tends to pull you away from the thing you chose. You are not trying to win against technology; you are making it easier to follow through on your own small plan.\n\nSome evenings will go differently, and that is fine. A routine is an invitation, not a test. Keep the parts that help you feel more at home in your time.`,
    publishedDaysAgo: 5,
  },
  {
    title: 'A simple way to learn something new',
    description: 'Trade the pressure to master a topic for a small weekly practice that turns curiosity into steady learning.',
    category: 'Education',
    contentType: 'Article',
    articleContent: `When a subject interests us, it is tempting to collect resources faster than we can use them. A more useful start is to choose one small question and stay with it long enough to make something of what you find.\n\nSet aside a short, repeatable block of time. Read one chapter, watch one lesson, or ask someone knowledgeable a thoughtful question. Afterward, write a few lines in your own words: what surprised you, what still feels unclear, and where you might use the idea.\n\nAt the end of the week, explain one thing you learned to a friend or to a page in your notebook. Teaching does not require expertise. The effort of making an idea understandable helps you see what you really know and what you want to explore next.\n\nLearning grows through return visits. A little attention, repeated often, can take you further than a perfect plan you never begin.`,
    publishedDaysAgo: 6,
  },
];

if (!MONGODB_URI || !CREATOR_EMAIL) {
  console.error('Set MONGODB_URI and CREATOR_EMAIL before seeding sample content.');
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(MONGODB_URI);
    const creator = await User.findOne({ email: CREATOR_EMAIL.trim().toLowerCase() }).select('_id');
    if (!creator) {
      throw new Error('Creator account was not found. Run the creator seed command first.');
    }

    let created = 0;
    let skipped = 0;
    for (const story of sampleStories) {
      const existing = await Content.findOne({ creator: creator._id, title: story.title }).select('_id');
      if (existing) {
        skipped += 1;
        continue;
      }

      const { publishedDaysAgo, ...content } = story;
      await Content.create({
        ...content,
        creator: creator._id,
        status: 'published',
        publishedAt: new Date(Date.now() - publishedDaysAgo * day),
      });
      created += 1;
    }

    console.log(`Sample content seed complete: ${created} created, ${skipped} already existed.`);
  } catch (error) {
    console.error('Sample content seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
