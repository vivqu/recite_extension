import { getQuote, getSpreadsheetConfig } from "./quotes.js";
import { syncGoogleSheets } from "./oauth.js";

const loadExampleQuote = async () => {
  const data = await getQuote();

  const { values } = data;
  const quoteContext = values[0];
  const formattedQuote = quoteContext[0];
  const attrQuote = `\u2014 ${quoteContext[2]}, <i>${quoteContext[1]}</i>`;
  document.querySelector(
    ".example-quote"
  ).innerHTML = `<p>${formattedQuote}</p><p>${attrQuote}</p>`;
};

const clearSource = () => {
  chrome.storage.sync.remove(["sheets-data", "sheets-config"], () => {
    enableSpreadsheetForm(true);
    document.querySelector(".sheet-config").innerHTML = "";
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
  const rowCount = _.get(config, "row-count", 0);
  const columnCount = _.get(config, "column-count", 0);
  let configDisplayHTML = "";
  configDisplayHTML += `<p>Number of rows: ${rowCount}</p>`;
  configDisplayHTML += `<p>Number of columns: ${columnCount}</p>`;
  document.querySelector(".sheet-config").innerHTML = configDisplayHTML;
};

const fetchAndSaveSpreadsheetData = async (spreadsheetId) => {
  const config = await syncGoogleSheets(spreadsheetId);
  if (config == null) {
    return;
  }
  await chrome.storage.sync.set({
    "sheets-config": config,
  });
  setSpreadsheetConfigDisplay(config);
};

const refetchSpreadsheetData = async () => {
  const config = await getSpreadsheetConfig();
  if (_.get(config, "sheetsId", 0) === 0) {
    console.log("No google sheet to sync");
    return;
  }
  const { sheetsId } = config;
  fetchAndSaveSpreadsheetData(sheetsId);
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
        fetchAndSaveSpreadsheetData(spreadsheetId);
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
    .addEventListener("click", refetchSpreadsheetData);

  document
    .querySelector(".test-quote")
    .addEventListener("click", loadExampleQuote);
};

chrome.storage.sync.get(["sheets-data", "sheets-config"], function (result) {
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
      fetchAndSaveSpreadsheetData(spreadsheetId);
    } else {
      setSpreadsheetConfigDisplay(config);
    }
  }
});
