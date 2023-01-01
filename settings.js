import {
  formatQuote,
  getQuote,
  getSpreadsheetConfig,
  saveSpreadsheetConfig,
  getQuoteFormatConfig,
} from "./quotes.js";
import { syncGoogleSheets } from "./oauth.js";
import { COLOR_OPTIONS, DEFAULT_COLOR_OPTIONS } from "./colors.js";

const DO_NOT_DISPLAY_LABEL = "none";
const DO_NOT_DISPLAY_OPTION = -1;

const loadExampleQuote = async () => {
  const data = await getQuote();
  const formattedQuote = await formatQuote(data);
  if (formattedQuote) {
    const textContainer = document.querySelector(".quote-example-text");
    if (textContainer) {
      textContainer.innerHTML = `<p>${_.get(formattedQuote, "quote", "")}</p>`;
    }
    const attrContainer = document.querySelector(".quote-example-attr-text");
    if (attrContainer) {
      attrContainer.innerHTML = _.get(formattedQuote, "attribution", "");
    }
  }
};

const clearSource = () => {
  chrome.storage.sync.remove(["sheets-data", "sheets-config"], () => {
    displaySpreadsheetInputForm(true);
    displaySpreadsheetDetailSettings(false);
    const errorDisplay = document.querySelector(".spreadsheet-form-error");
    if (errorDisplay.style.display !== "none") {
      errorDisplay.style.display = "none";
    }
  });
};

const setColorConfig = (colors) => {
  const grayButton = document.getElementById("color-gray");
  const blueButton = document.getElementById("color-blue");
  const purpleButton = document.getElementById("color-purple");
  const greenButton = document.getElementById("color-green");
  const peachButton = document.getElementById("color-peach");

  const resetButtons = () => {
    const buttons = [
      grayButton,
      blueButton,
      purpleButton,
      greenButton,
      peachButton,
    ];
    for (const button of buttons) {
      button.style["border-width"] = "0px";
      button.style["margin-left"] = "4px";
      button.style["margin-right"] = "4px";
    }
  };

  resetButtons();
  let selectedButton;
  switch (colors.key) {
    case "GRAY":
      selectedButton = grayButton;
      break;
    case "BLUE":
      selectedButton = blueButton;
      break;
    case "PURPLE":
      selectedButton = purpleButton;
      break;
    case "GREEN":
      selectedButton = greenButton;
      break;
    case "PEACH":
      selectedButton = peachButton;
      break;
  }
  if (selectedButton) {
    selectedButton.style["border-width"] = "4px";
    selectedButton.style["margin-left"] = "0px";
    selectedButton.style["margin-right"] = "0px";
  }

  // Update the colors for the example quote
  const { text, icon, background, quote } = colors;
  const attrColor = _.get(colors, "attrText") || text;

  const container = _.first(
    document.getElementsByClassName("color-settings-example")
  );
  container.style["background-color"] = background;

  const quoteText = _.first(
    document.getElementsByClassName("quote-example-text")
  );
  quoteText.style.color = text;
  quoteText.style["background-color"] = quote;

  const attrText = _.first(
    document.getElementsByClassName("quote-example-attr-text")
  );
  attrText.style.color = attrColor;

  const quoteIcons = document.getElementsByClassName("quote-example-icon");
  for (const quoteIcon of quoteIcons) {
    quoteIcon.style.color = icon;
  }
};

const updateColorConfig = ({ srcElement }) => {
  const COLOR_ID_TO_OPTION_MAPPING = {
    "color-gray": COLOR_OPTIONS.GRAY,
    "color-blue": COLOR_OPTIONS.BLUE,
    "color-purple": COLOR_OPTIONS.PURPLE,
    "color-green": COLOR_OPTIONS.GREEN,
    "color-peach": COLOR_OPTIONS.PEACH,
  };
  const colorId = srcElement.id;
  if (colorId in COLOR_ID_TO_OPTION_MAPPING) {
    const option = COLOR_ID_TO_OPTION_MAPPING[colorId];
    chrome.storage.sync.set({ "color-config": { colors: option } }).then(() => {
      setColorConfig(option);
    });
  } else {
    console.error(`Error: color ID (${colorId}) not found`);
  }
};

const setColumnConfig = async (config) => {
  const columnFormat = getQuoteFormatConfig(config);
  const headers = columnFormat.headers;

  const settingsContainer = document.querySelector(
    ".spreadsheet-column-settings"
  );
  settingsContainer.style.display = "block";

  const errorContainer = document.getElementById("spreadsheet-column-error");
  errorContainer.style.display = "none";

  const settingsBlock = document.getElementById("column-settings");
  if (columnFormat.quote != null) {
    let columnTitle;
    const quoteIndex = columnFormat.quote;
    if (quoteIndex == DO_NOT_DISPLAY_OPTION) {
      console.error("Invalid column index: must always display quote.");
    }
    if (headers.length > quoteIndex) {
      columnTitle = headers[quoteIndex];
    }
    const quoteDisplay = document.getElementById("spreadsheet-column-quote");
    if (quoteDisplay) {
      quoteDisplay.innerHTML = `<p>Column ${quoteIndex + 1}${
        columnTitle ? ` ("${columnTitle}")` : ""
      }</p>`;
    }
  }
  if (columnFormat.author != null) {
    let columnTitle;
    const authorIndex = columnFormat.author;
    const authorDisplay = document.getElementById("spreadsheet-column-author");
    if (authorIndex == DO_NOT_DISPLAY_OPTION) {
      authorDisplay.innerHTML = "<p>Do not show</p>";
    } else {
      if (headers.length > authorIndex) {
        columnTitle = headers[authorIndex];
      }
      authorDisplay.innerHTML = `<p>Column ${authorIndex + 1}${
        columnTitle ? ` ("${columnTitle}")` : ""
      }</p>`;
    }
  }
  if (columnFormat.source != null) {
    let columnTitle;
    const sourceIndex = columnFormat.source;
    const sourceDisplay = document.getElementById("spreadsheet-column-source");
    if (sourceIndex == DO_NOT_DISPLAY_OPTION) {
      sourceDisplay.innerHTML = "<p>Do not show</p>";
    } else {
      if (headers.length > sourceIndex) {
        columnTitle = headers[sourceIndex];
      }
      sourceDisplay.innerHTML = `<p>Column ${sourceIndex + 1}${
        columnTitle ? ` ("${columnTitle}")` : ""
      }</p>`;
    }
  }

  if (columnFormat.link != null) {
    let columnTitle;
    const linkIndex = columnFormat.link;
    const linkDisplay = document.getElementById("spreadsheet-column-link");
    if (linkIndex == DO_NOT_DISPLAY_OPTION) {
      linkDisplay.innerHTML = "<p>Do not show</p>";
    } else {
      if (headers.length > linkIndex) {
        columnTitle = headers[linkIndex];
      }
      linkDisplay.innerHTML = `<p>Column ${linkIndex + 1}${
        columnTitle ? ` ("${columnTitle}")` : ""
      }</p>`;
    }
  }
};

const saveColumnConfig = async () => {
  // Add validation
  let quoteIndex, authorIndex, sourceIndex, linkIndex;

  const colRegex = /^col-([^ ]+)$/;
  const columnNames = ["quote", "author", "source", "link"];
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
      case "link":
        linkIndex = colIndex;
        break;
    }
  }

  if (quoteIndex == null || quoteIndex === -1) {
    console.log("Quote index not selected");
    const errorContainer = document.getElementById("column-settings-error");
    errorContainer.style.display = "block";
    errorContainer.innerHTML =
      "<p>Please correct the following error: must select a column for quote text</p>";
    return;
  } else if (
    quoteIndex === authorIndex ||
    quoteIndex === sourceIndex ||
    quoteIndex === linkIndex ||
    (authorIndex === sourceIndex && authorIndex !== DO_NOT_DISPLAY_OPTION) ||
    (authorIndex === linkIndex && authorIndex !== DO_NOT_DISPLAY_OPTION) ||
    (sourceIndex === linkIndex && sourceIndex !== DO_NOT_DISPLAY_OPTION)
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
    link: linkIndex,
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
  const { quote, author, source, link, headers } = columnFormat;
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
  const quoteDisplay = document.getElementById("spreadsheet-column-quote");
  quoteDisplay.innerHTML = `<select name="quote-column" id="quote-column">
      ${
        quote == null
          ? `<option value="none" selected disabled hidden>Select a column</option>`
          : null
      }
     ${quoteOptions}
  </select>`;

  const authorOptions = createOptions(author, true);
  const authorDisplay = document.getElementById("spreadsheet-column-author");
  authorDisplay.innerHTML = `<select name="author-column" id="author-column">
    ${
      author == null
        ? `<option value="none" selected disabled hidden>Select a column</option>`
        : null
    }
  ${authorOptions}
</select>`;

  const sourceOptions = createOptions(source, true);
  const sourceDisplay = document.getElementById("spreadsheet-column-source");
  sourceDisplay.innerHTML = `<select name="source-column" id="source-column">
    ${
      source == null
        ? `<option value="none" selected disabled hidden>Select a column</option>`
        : null
    }
    ${sourceOptions}
</select>`;

  const linkOptions = createOptions(link, true);
  const linkDisplay = document.getElementById("spreadsheet-column-link");
  linkDisplay.innerHTML = `<select name="link-column" id="link-column">
  ${
    link == null
      ? `<option value="none" selected disabled hidden>Select a column</option>`
      : null
  }
  ${linkOptions}
</select>`;
};

const displaySpreadsheetInputForm = (show) => {
  // Hides the URL input form and shows the saved spreadsheet URL section.
  // We do not show the detail settings until the spreadsheet data is
  // successfully fetched.
  const formSection = document.querySelector(".enter-spreadsheet-section");
  formSection.style.display = show ? "block" : "none";

  const infoSection = document.querySelector(".saved-spreadsheet-section");
  infoSection.style.display = show ? "none" : "block";
};

const displaySpreadsheetDetailSettings = (show) => {
  // Detail settings for the spreadsheet
  const loadQuoteSection = document.querySelector(
    ".color-settings-test-spreadsheet"
  );
  loadQuoteSection.style.display = show ? "block" : "none";

  const syncSection = document.querySelector(".spreadsheet-sync-settings");
  syncSection.style.display = show ? "block" : "none";

  const columnSection = document.querySelector(".spreadsheet-column-settings");
  columnSection.style.display = show ? "block" : "none";

  if (!show) {
    // Also clears any existing data for the detail and columns sections
    const selectorIds = [
      "spreadsheet-detail-title",
      "spreadsheet-detail-rows",
      "spreadsheet-detail-columns",
      "spreadsheet-column-quote",
      "spreadsheet-column-author",
      "spreadsheet-column-source",
      "spreadsheet-column-link",
    ];
    for (const selectorId of selectorIds) {
      const display = document.getElementById(selectorId);
      display.innerHTML = "<p>None</p>";
    }
    const errorDisplay = document.getElementById("spreadsheet-column-error");
    errorDisplay.style.display = "none";
  }
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
  if (_.get(config, "sheet-title")) {
    const titleDetail = document.getElementById("spreadsheet-detail-title");
    titleDetail.innerHTML = config["sheet-title"];
  }
  const rowDetail = document.getElementById("spreadsheet-detail-rows");
  rowDetail.innerHTML = rowCount;

  const columnDetail = document.getElementById("spreadsheet-detail-columns");
  columnDetail.innerHTML = columnCount;
};

const fetchAndSaveSpreadsheetData = async (spreadsheetId) => {
  const config = await syncGoogleSheets(spreadsheetId);
  if (_.get(config, "error")) {
    // Set an error state for the form
    const errorDisplay = document.querySelector(".spreadsheet-form-error");
    if (errorDisplay) {
      let message =
        "Oops! Something went wrong. We could not load this spreadsheet, please try a different spreadsheet URL.";
      switch (config.error.code) {
        case 403:
          message =
            'Recite extension does not have permission to read this spreadsheet. Please make the spreadsheet public by going to Settings > General Access and choose "Anyone with the link" for view permissions.';
          break;
        case 404:
          message =
            "This spreadsheet URL could not be found. Make sure that you have the correct URL and the file exists.";
          break;
      }
      errorDisplay.innerHTML = message;
      errorDisplay.style.display = "block";
    }
    return false;
  } else if (config == null) {
    return false;
  }
  await saveSpreadsheetConfig(config);
  setSpreadsheetConfigDisplay(config);
  setColumnConfig(config);
  return true;
};

const refetchSpreadsheetData = async () => {
  const config = await getSpreadsheetConfig();
  if (_.get(config, "sheetsId", 0) === 0) {
    console.log("No google sheet to sync");
    return;
  }
  const { sheetsId } = config;
  fetchAndSaveSpreadsheetData(sheetsId).then((success) => {
    if (!success) {
      displaySpreadsheetDetailSettings(false);
    }
  });
};

const handleSpreadsheetFormSubmit = () => {
  const urlInput = document.getElementById("source-url-input");
  const url = urlInput.value;
  const regex = /https:\/\/docs.google.com\/spreadsheets\/d\/([^\s\/]*)/g;
  const matches = regex.exec(url);
  if (matches != null && matches.length > 1) {
    const errorDisplay = document.querySelector(".spreadsheet-form-error");
    if (errorDisplay.style.display !== "none") {
      // Clear any existing errors
      errorDisplay.style.display = "none";
    }
    const spreadsheetId = matches[1];
    const spreadsheetURL =
      "https://docs.google.com/spreadsheets/d/" + spreadsheetId;
    chrome.storage.sync.set(
      {
        "sheets-data": { url: spreadsheetURL, id: spreadsheetId },
      },
      () => {
        displaySpreadsheetInputForm(false);
        setSpreadsheetTitleDisplay(null, spreadsheetURL);
        fetchAndSaveSpreadsheetData(spreadsheetId).then((success) => {
          if (success) {
            displaySpreadsheetDetailSettings(true);
          } else {
            displaySpreadsheetDetailSettings(false);
          }
        });
      }
    );
  } else {
    const errorDisplay = document.querySelector(".spreadsheet-input-error");
    errorDisplay.innerHTML =
      "You have entered an invalid link. Make sure that you have the correct Google spreadsheet URL and the file exists.";
    errorDisplay.style.display = "block";
  }
};

window.onload = function () {
  const form = document.getElementById("spreadsheet-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handleSpreadsheetFormSubmit();
    });
  }
  const urlInput = document.getElementById("source-url-input");
  if (urlInput) {
    urlInput.addEventListener("input", () => {
      const submitButton = document.getElementById("source-save");
      submitButton.disabled = urlInput.value.length == 0;
    });
  }

  const clearSourceButton = document.querySelector(".clear-source");
  if (clearSourceButton) {
    clearSourceButton.addEventListener("click", clearSource);
  }

  const syncButton = document.querySelector(".sync-button");
  if (syncButton) {
    syncButton.addEventListener("click", refetchSpreadsheetData);
  }

  const testQuoteButton = document.querySelector(".test-quote");
  if (testQuoteButton) {
    testQuoteButton.addEventListener("click", loadExampleQuote);
  }

  const editButton = document.querySelector(".edit-columns");
  if (editButton) {
    editButton.addEventListener("click", editColumnConfig);
  }

  const saveButton = document.querySelector(".save-columns");
  if (saveButton) {
    saveButton.addEventListener("click", saveColumnConfig);
  }

  const colorButtons = document.querySelectorAll(".color-button");
  for (const button of colorButtons) {
    button.addEventListener("click", updateColorConfig);
  }
};

chrome.storage.sync.get(
  ["sheets-data", "sheets-config", "color-config"],
  function (result) {
    const spreadsheetId = _.get(result, "sheets-data.id");
    const spreadsheetURL = _.get(result, "sheets-data.url");
    const colors = _.get(result, "color-config.colors", DEFAULT_COLOR_OPTIONS);
    console.log("-------- stored data");
    console.log(_.get(result, "sheets-data"));
    console.log(_.get(result, "sheets-config"));
    console.log(colors);
    if (!spreadsheetId) {
      // No saved sheet or configuration
      displaySpreadsheetInputForm(true);
    } else {
      displaySpreadsheetInputForm(false);
      const config = _.get(result, "sheets-config");
      const title = _.get(config, "title");
      setSpreadsheetTitleDisplay(title, spreadsheetURL);

      // If config does not exist, fetch the spreadsheet data
      if (!config) {
        fetchAndSaveSpreadsheetData(spreadsheetId).then((success) => {
          if (success) {
            displaySpreadsheetDetailSettings(true);
          }
        });
      } else {
        setSpreadsheetConfigDisplay(config);
        setColumnConfig(config);
        displaySpreadsheetDetailSettings(true);
      }
    }

    // Set color display
    setColorConfig(colors);
  }
);
