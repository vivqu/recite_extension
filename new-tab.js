import { getQuote, formatQuote } from "./quotes.js";
import { DEFAULT_COLOR_OPTIONS } from "./colors.js";

const DEFAULT_QUOTES = [
  {
    text: "So many things are possible just as long as you don't know they're impossible",
    author: "Norton Juster",
    source: "The Phantom Tollbooth",
  },
  {
    text: "All truly wise thoughts have been thought already thousands of times; but to make them truly ours, we must think them over again honestly, till they take root in our personal experience.",
    author: "Johann Wolfgang von Goethe",
  },
  {
    text: "Once you have read a book you care about, some part of it is always with you.",
    author: "Louis L’Amour",
  },
  {
    text: "Books serve to show a man that those original thoughts of his aren’t very new after all.",
    author: "Abraham Lincoln",
  },
  {
    text: "To observe attentively is to remember distinctly.",
    author: "Edgar Allen Poe",
  },
  {
    text: "The possession of knowledge does not kill the sense of wonder and mystery. There is always more mystery.",
    author: "Anais Nin",
  },
  {
    text: "Great things are done by a series of small things brought together.",
    author: "Vincent Van Gogh",
  },
  {
    text: "There is no such thing as a new idea. We simply take a lot of old ideas and put them into a sort of mental kaleidoscope.",
    author: "Mark Twain",
  },
  {
    text: "Creativity is seeing what others see and thinking what no one else ever thought.",
    author: "Albert Einstein",
  },
  {
    text: "No matter what people tell you, words and ideas can change the world.",
    author: "Robin Williams",
  },
  {
    text: "I cannot remember the books I've read any more than the meals I have eaten; even so, they have made me.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "In the case of good books, the point is not to see how many of them you can get through, but rather how many can get through to you.",
    author: "Mortimer J. Adler",
  },
  {
    text: "Reading furnishes the mind only with materials of knowledge. It is thinking that makes what we read ours.",
    author: "John Locke",
  },
  {
    text: "Reading without thinking will confuse you. Thinking without reading will place you in danger.",
    author: "Confucius",
  },
];

const renderQuote = (dict) => {
  if (_.get(dict, "quote") == null) {
    return;
  }
  const { quote, attribution } = dict;
  document.getElementsByClassName("quote-container")[0].style.display = "block";
  document.querySelector(".quote-text").innerHTML = quote;
  if (attribution) {
    document.querySelector(".attr-text").innerHTML = attribution;
  }
};

const loadColors = async () => {
  chrome.storage.sync.get(["color-config"]).then((result) => {
    const colors = _.get(result, "color-config.colors", DEFAULT_COLOR_OPTIONS);
    const { text, icon, background, quote } = colors;
    const attrColor = _.get(colors, "attrText") || text;

    const container = _.first(document.getElementsByClassName("container"));
    container.style["background-color"] = background;

    const quoteText = _.first(document.getElementsByClassName("quote-text"));
    quoteText.style.color = text;
    quoteText.style["background-color"] = quote;

    const attrText = _.first(document.getElementsByClassName("attr-text"));
    attrText.style.color = attrColor;

    const quoteIcons = document.getElementsByClassName("quote-icon");
    for (const quoteIcon of quoteIcons) {
      quoteIcon.style.color = icon;
    }
  });
};

const loadDefaultQuote = () => {
  const index = _.random(0, DEFAULT_QUOTES.length - 1);
  const { text, author, source } = DEFAULT_QUOTES[index];
  let attribution = `\u2014 ${author}`;
  if (source) {
    attribution += `, ${source}`;
  }
  const formattedQuote = { quote: text, attribution };
  renderQuote(formattedQuote);
};

const loadQuote = async () => {
  try {
    const data = await getQuote();
    const formattedQuote = await formatQuote(data);
    if (formattedQuote == null) {
      console.error("Empty quote fetched");
      loadDefaultQuote();
      return;
    }
    renderQuote(formattedQuote);
  } catch (e) {
    // Render default set of quotes if no saved configuration
    // is available.
    console.log(e);
    loadDefaultQuote();
  }
};

loadColors();
loadQuote();
