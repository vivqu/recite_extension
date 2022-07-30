import { getQuote } from "./quotes.js";
import { GOOGLE_API_KEY } from "./secrets.js";

let sheetsId,
  rowCount = 0;

const syncGoogleSheets = function () {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    let init = {
      method: "GET",
      async: true,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      mode: "cors",
      contentType: "json",
    };
    const sheetsId = "1NqpTHzTpNKNaTHqNd5bjWjAnD75693V6prcqpIIihE8";
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}?key=${GOOGLE_API_KEY}`,
      init
    )
      .then((response) => response.json())
      .then(function (data) {
        console.log(data);
        const {
          sheets,
          spreadsheetUrl,
          properties: { title },
        } = data;
        if (sheets != null && sheets.length > 0) {
          const {
            properties: { gridProperties },
          } = sheets[0];
          const { rowCount, columnCount } = gridProperties;
          console.log("Grid properties: ", gridProperties);
          chrome.storage.sync.set(
            {
              "sheets-config": {
                id: sheetsId,
                "row-count": rowCount,
                "column-count": columnCount,
                url: spreadsheetUrl,
                title,
              },
            },
            function () {}
          );
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

const loadExampleQuote = function () {
  // Fetch random quote
  if (sheetsId == null || rowCount === 0) {
    console.log("No google sheets ID synced or rows available");
    return;
  }
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    getQuote(sheetsId, token, rowCount).then((data) => {
      console.log(data);
      const { values } = data;
      const quoteContext = values[0];
      const formattedQuote = quoteContext[0];
      const attrQuote = `\u2014 ${quoteContext[2]}, <i>${quoteContext[1]}</i>`;
      document.querySelector(
        ".example-quote"
      ).innerHTML = `<p>${formattedQuote}</p><p>${attrQuote}</p>`;
    });
  });
};

window.onload = function () {
  document
    .querySelector(".sync-button")
    .addEventListener("click", syncGoogleSheets);

  document
    .querySelector(".test-quote")
    .addEventListener("click", loadExampleQuote);
};

chrome.storage.sync.get("sheets-config", function (result) {
  if (result["sheets-config"]) {
    const config = result["sheets-config"];
    if (config) {
      const title = config["title"];
      const url = config["url"];
      sheetsId = config["id"];
      rowCount = config["row-count"];
      const columnCount = config["column-count"];

      let sheetsHeader = "";
      if (title && url) {
        sheetsHeader = `<p><a href=${url}>${title}</a></p>`;
      }
      document.querySelector(
        ".sheet-config"
      ).innerHTML = `${sheetsHeader}<p>Google Sheet ID: ${sheetsId}</p><p>Row count: ${rowCount}</p><p>Column count: ${columnCount}</p>`;
    }
  }
});
