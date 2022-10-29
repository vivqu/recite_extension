import { getQuote } from "./quotes.js";

const DEFAULT_QUOTES = [
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
    author: "Albert Einsteins",
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
    text: "In the case of good books, the point is not to see how many of them you can get through, but rather how many can get through to you",
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
  if (_.get(dict, "text") == null) {
    return;
  }
  const { text, source, author } = dict;
  document.getElementsByClassName("quote-container")[0].style.display = "block";
  document.querySelector(".quote-text").innerHTML = text;
  let attribution = "";
  if (source && author) {
    attribution = `\u2014 ${author}, <i>${source}</i>`;
  } else if (author || source) {
    attribution = author ? `\u2014 ${author}` : `\u2014 <i>${source}</i>`;
  }
  document.querySelector(".attr-text").innerHTML = attribution;
};

const loadQuotes = (config) => {
  if (config == null) {
    return;
  }
  const sheetsId = config["id"];
  const rowCount = config["row-count"];
  if (sheetsId == null || rowCount === 0) {
    return;
  }
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    getQuote(sheetsId, token, rowCount).then((data) => {
      const { values } = data;
      const quoteContext = values[0];
      const quoteDict = {
        text: quoteContext[0],
        source: quoteContext[1],
        author: quoteContext[2],
      };
      renderQuote(quoteDict);
    });
  });
};

chrome.storage.sync.get("sheets-config", function (result) {
  if (result["sheets-config"]) {
    const config = result["sheets-config"];
    if (config) {
      loadQuotes(config);
      return;
    }
  }
  // Render default set of quotes
  const index = _.random(0, DEFAULT_QUOTES.length - 1);
  renderQuote(DEFAULT_QUOTES[index]);
});
