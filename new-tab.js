import { getQuote } from "./quotes.js";

chrome.storage.sync.get("sheets-config", function (result) {
  if (result["sheets-config"]) {
    const config = result["sheets-config"];
    if (config) {
      const sheetsId = config["id"];
      const rowCount = config["row-count"];
      if (sheetsId == null || rowCount === 0) {
        return;
      }
      chrome.identity.getAuthToken({ interactive: true }, function (token) {
        getQuote(sheetsId, token, rowCount).then((data) => {
          const { values } = data;
          const quoteContext = values[0];
          const formattedQuote = quoteContext[0];
          const attrQuote = `\u2014 ${quoteContext[2]}, <i>${quoteContext[1]}</i>`;
          document.getElementsByClassName("quote-container")[0].style.display = 'block';
          document.querySelector(".quote-text").innerHTML = formattedQuote;
          document.querySelector(".attr-text").innerHTML = attrQuote;
        });
      });
    }
  }
});
