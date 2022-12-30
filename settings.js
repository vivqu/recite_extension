import {
  formatQuote,
  getQuote,
  getSpreadsheetConfig,
  saveSpreadsheetConfig,
  getQuoteFormatConfig,
} from "./quotes.js";
import { syncGoogleSheets } from "./oauth.js";

const DO_NOT_DISPLAY_LABEL = "none";
const DO_NOT_DISPLAY_OPTION = -1;

const loadExampleQuote = async () => {
  const data = await getQuote();
  const formattedQuote = await formatQuote(data);
  if (formattedQuote) {
    document.querySelector(".example-quote").innerHTML = `<p>${_.get(
      formattedQuote,
      "quote",
      ""
    )}</p><p>${_.get(formattedQuote, "attribution", "")}</p>`;
  }
};

const clearSource = () => {
  chrome.storage.sync.remove(["sheets-data", "sheets-config"], () => {
    enableSpreadsheetForm(true);
    document.querySelector(".sheet-config").innerHTML = "";
  });
};

const setColumnConfig = async (config) => {
  const columnFormat = getQuoteFormatConfig(config);
  const headers = columnFormat.headers;

  const settingsContainer = document.querySelector(
    ".spreadsheet-column-settings"
  );
  settingsContainer.style.display = "block";

  const errorContainer = document.getElementById("column-settings-error");
  errorContainer.style.display = "none";

  const settingsBlock = document.getElementById("column-settings");
  let configDisplay = "";
  if (columnFormat.quote != null) {
    let columnTitle;
    const quoteIndex = columnFormat.quote;
    if (quoteIndex == DO_NOT_DISPLAY_OPTION) {
      console.error("Invalid column index: must always display quote.");
    }
    if (headers.length > quoteIndex) {
      columnTitle = headers[quoteIndex];
    }
    configDisplay += `<div id="quote-column" class="settings-row"><p>Quote: Column ${
      quoteIndex + 1
    }${columnTitle ? ` ("${columnTitle}")` : ""}</p></div>`;
  }
  if (columnFormat.author != null) {
    let columnTitle;
    const authorIndex = columnFormat.author;
    if (authorIndex == DO_NOT_DISPLAY_OPTION) {
      configDisplay += `<div id="author-column" class="settings-row"><p>Author: Do not show</p></div>`;
    } else {
      if (headers.length > authorIndex) {
        columnTitle = headers[authorIndex];
      }
      configDisplay += `<div id="author-column" class="settings-row"><p>Author: Column ${
        authorIndex + 1
      }${columnTitle ? ` ("${columnTitle}")` : ""}</p></div>`;
    }
  }
  if (columnFormat.source != null) {
    let columnTitle;
    const sourceIndex = columnFormat.source;
    if (sourceIndex == DO_NOT_DISPLAY_OPTION) {
      configDisplay += `<div id="source-column" class="settings-row"><p>Source: Do not show</p></div>`;
    } else {
      if (headers.length > sourceIndex) {
        columnTitle = headers[sourceIndex];
      }
      configDisplay += `<div id="source-column" class="settings-row"><p>Source: Column ${
        sourceIndex + 1
      }${columnTitle ? ` ("${columnTitle}")` : ""}</p></div>`;
    }
  }
  settingsBlock.innerHTML = configDisplay;
};

const saveColumnConfig = async () => {
  // Add validation
  let quoteIndex, authorIndex, sourceIndex;

  const colRegex = /^col-([^ ]+)$/;
  const columnNames = ["quote", "author", "source"];
  for (const name of columnNames) {
    const selectComponent = document.getElementById(`${name}-column`);
    const value = selectComponent.value;
    let colIndex = null;
    if (value == DO_NOT_DISPLAY_LABEL) {
      // Set index to "do not display" to indicate that this is a hidden attribute.
      colIndex = DO_NOT_DISPLAY_OPTION;
    } else {
      // Get the index of the column
      const match = value.match(colRegex);
      if (match) {
        colIndex = parseInt(match[1]);
      }
    }
    switch (name) {
      case "quote":
        quoteIndex = colIndex;
        break;
      case "author":
        authorIndex = colIndex;
        break;
      case "source":
        sourceIndex = colIndex;
        break;
    }
  }

  if (quoteIndex == null || quoteIndex == -1) {
    console.log("Quote index not selected");
    const errorContainer = document.getElementById("column-settings-error");
    errorContainer.style.display = "block";
    errorContainer.innerHTML =
      "<p>Please correct the following error: must select a column for quote text</p>";
    return;
  } else if (
    quoteIndex == authorIndex ||
    quoteIndex == sourceIndex ||
    (authorIndex == sourceIndex && authorIndex != DO_NOT_DISPLAY_OPTION)
  ) {
    console.log("Not enough options selected");
    const errorContainer = document.getElementById("column-settings-error");
    errorContainer.style.display = "block";
    errorContainer.innerHTML =
      "<p>Please correct the following error: duplicate columns selected.</p>";
    return;
  }

  // Save
  const config = await getSpreadsheetConfig();
  let newColumnConfig = { ...config["column-config"] };
  newColumnConfig.mapping = {
    author: authorIndex,
    quote: quoteIndex,
    source: sourceIndex,
  };
  if (!_.isEqual(newColumnConfig.mapping, config["column-config"].mapping)) {
    // Skip saving if the indices do not change.
    const updatedConfig = { ...config, "column-config": newColumnConfig };
    await saveSpreadsheetConfig(updatedConfig);
    setColumnConfig(updatedConfig);
  } else {
    console.log("Config not changed: skipping save.");
    setColumnConfig(config);
  }

  // Restore edit button
  const editButton = document.querySelector(".edit-columns");
  editButton.style.display = "block";
  const saveButton = document.querySelector(".save-columns");
  saveButton.style.display = "none";
};

const editColumnConfig = async () => {
  // Make each of the items configurable.
  const settingsBlock = document.getElementById("column-settings");

  // Show save button
  const editButton = document.querySelector(".edit-columns");
  editButton.style.display = "none";
  const saveButton = document.querySelector(".save-columns");
  saveButton.style.display = "block";

  // Add each of the columns here
  const config = await getSpreadsheetConfig();
  const columnFormat = getQuoteFormatConfig(config);
  const { quote, author, source, headers } = columnFormat;
  const createOptions = (index, includeNone = false) => {
    let options;
    if (index != null) {
      if (index !== DO_NOT_DISPLAY_OPTION) {
        options = `<option selected value="col-${index}">${headers[index]}</option>`;
      }
      for (let i = 0; i < headers.length; i++) {
        if (i === index) {
          continue;
        }
        options += `<option value="col-${i}">${headers[i]}</option>`;
      }
    } else {
      options = "";
      for (let i = 0; i < headers.length; i++) {
        options += `<option value="col-${i}">${headers[i]}</option>`;
      }
    }
    // Add empty option
    if (includeNone) {
      options += `<option ${
        index === DO_NOT_DISPLAY_OPTION ? "selected" : ""
      } value="${DO_NOT_DISPLAY_LABEL}">Do not show</option>`;
    }
    return options;
  };

  const quoteOptions = createOptions(quote);
  let configDisplay = `<div class="settings-row">
  <div class="settings-row-title"><p>Quote</p></div>
  <select name="quote-column" id="quote-column">
      ${
        quote == null
          ? `<option value="none" selected disabled hidden>Select a column</option>`
          : null
      }
     ${quoteOptions}
  </select>
</div>`;

  const authorOptions = createOptions(author, true);
  configDisplay += `<div class="settings-row">
<div class="settings-row-title"><p>Author</p></div>
<select name="author-column" id="author-column">
    ${
      author == null
        ? `<option value="none" selected disabled hidden>Select a column</option>`
        : null
    }
  ${authorOptions}
</select>
</div>`;

  const sourceOptions = createOptions(source, true);
  configDisplay += `<div class="settings-row">
<div class="settings-row-title"><p>Source</p></div>
<select name="source-column" id="source-column">
    ${
      source == null
        ? `<option value="none" selected disabled hidden>Select a column</option>`
        : null
    }
    ${sourceOptions}
</select>
</div>`;
  settingsBlock.innerHTML = configDisplay;
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
  const title = _.get(config, "title");
  const url = _.get(config, "url");
  if (title && url) {
    setSpreadsheetTitleDisplay(title, url);
  }
  // Display info about the sheets if it has been fetched.
  const rowCount = _.get(config, "row-count", 0);
  const columnCount = _.get(config, "column-count", 0);
  let configDisplayHTML = "";
  if (_.get(config, "sheet-title")) {
    configDisplayHTML += `<p>Sheet title: ${config["sheet-title"]}</p>`;
  }
  configDisplayHTML += `<p>Number of rows: ${rowCount}</p>`;
  configDisplayHTML += `<p>Number of columns: ${columnCount}</p>`;
  document.querySelector(".sheet-config").innerHTML = configDisplayHTML;
};

const fetchAndSaveSpreadsheetData = async (spreadsheetId) => {
  const config = await syncGoogleSheets(spreadsheetId);
  if (config == null) {
    return;
  }
  await saveSpreadsheetConfig(config);
  setSpreadsheetConfigDisplay(config);
  setColumnConfig(config);
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
    // TODO: Error invalid spreadsheet
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

  document
    .querySelector(".edit-columns")
    .addEventListener("click", editColumnConfig);

  document
    .querySelector(".save-columns")
    .addEventListener("click", saveColumnConfig);
};

chrome.storage.sync.get(["sheets-data", "sheets-config"], function (result) {
  const spreadsheetId = _.get(result, "sheets-data.id");
  const spreadsheetURL = _.get(result, "sheets-data.url");
  console.log("-------- stored data");
  console.log(_.get(result, "sheets-data"));
  console.log(_.get(result, "sheets-config"));
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
      setColumnConfig(config);
    }
  }
});
