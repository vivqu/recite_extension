import { getQuote } from "./quotes.js";
import { GOOGLE_API_KEY } from "./secrets.js";

let sheetsId,
  rowCount = 0;

const syncGoogleSheets = function (spreadsheetId) {
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
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`,
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
          const config = {
            id: spreadsheetId,
            "row-count": rowCount,
            "column-count": columnCount,
            url: spreadsheetUrl,
            title,
          };
          chrome.storage.sync.set(
            {
              "sheets-config": config,
            },
            () => {
              setSpreadsheetConfigDisplay(config);
            }
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

const enableSpreadsheetForm = (enable) => {
  const formSection = document.querySelector(".enter-spreadsheet-section");
  formSection.style.display = enable ? "block" : "none";

  const infoSection = document.querySelector(".saved-spreadsheet-section");
  infoSection.style.display = enable ? "none" : "block";
};

const setSpreadsheetTitleDisplay = (title, url) => {
  if (url == null) {
    return;
  }
  const linkText = document.getElementById("spreadsheet-link");
  linkText.innerHTML = title != null ? title : url;
  linkText.href = url;
};

const setSpreadsheetConfigDisplay = (config) => {
  if (config == null) {
    return;
  }
  // Display info about the sheets if it has been fetched.
  const title = _.get(config, "title");
  const sheetsId = _.get(config, "id");
  const rowCount = _.get(config, "row-count");
  const columnCount = _.get(config, "column-count");
  const spreadsheetURL = _.get(config, "url");
  let sheetsHeader = "";
  if (title) {
    sheetsHeader = `<p><a href=${spreadsheetURL}>${title}</a></p>`;
  }
  document.querySelector(
    ".sheet-config"
  ).innerHTML = `${sheetsHeader}<p>Google Sheet ID: ${sheetsId}</p><p>Number of quotes: ${rowCount}</p><p>Number of columns: ${columnCount}</p>`;
};

const clearSource = () => {
  chrome.storage.sync.remove(["sheets-data", "sheets-config"], () => {
    enableSpreadsheetForm(true);
    document.querySelector(".sheet-config").innerHTML = "";
  });
};

const handleSpreadsheetFormSubmit = () => {
  const urlInput = document.getElementById("source-url-input");
  const url = urlInput.value;
  const regex =
    /https:\/\/docs.google.com\/spreadsheets\/d\/([^\s\/]*)\/[^\s]*/g;
  const matches = regex.exec(url);
  if (matches.length > 1) {
    const spreadsheetId = matches[1];
    const spreadsheetURL =
      "https://docs.google.com/spreadsheets/d/" + spreadsheetId;
    chrome.storage.sync.set(
      {
        "sheets-data": { url: spreadsheetURL, id: spreadsheetId },
      },
      () => {
        enableSpreadsheetForm(false);
        setSpreadsheetTitleDisplay(null, spreadsheetURL);
        syncGoogleSheets(spreadsheetId);
      }
    );
  } else {
    // Error invalid spreadsheet
  }
};

window.onload = function () {
  const form = document.getElementById("spreadsheet-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSpreadsheetFormSubmit();
  });
  const urlInput = document.getElementById("source-url-input");
  urlInput.addEventListener("input", () => {
    const submitButton = document.getElementById("source-save");
    submitButton.disabled = urlInput.value.length == 0;
  });

  document
    .querySelector(".clear-source")
    .addEventListener("click", clearSource);

  document
    .querySelector(".sync-button")
    .addEventListener("click", syncGoogleSheets);

  document
    .querySelector(".test-quote")
    .addEventListener("click", loadExampleQuote);
};

chrome.storage.sync.get(["sheets-data", "sheets-config"], function (result) {
  console.log(result);
  const spreadsheetId = _.get(result, "sheets-data.id");
  const spreadsheetURL = _.get(result, "sheets-data.url");
  if (!spreadsheetId) {
    // No saved sheet or configuration
    enableSpreadsheetForm(true);
  } else {
    enableSpreadsheetForm(false);
    const config = _.get(result, "sheets-config");
    const title = _.get(config, "title");
    setSpreadsheetTitleDisplay(title, spreadsheetURL);

    // If config does not exist, fetch the spreadsheet data
    if (!config) {
      syncGoogleSheets(spreadsheetId);
    } else {
      setSpreadsheetConfigDisplay(config);
    }
  }
});
