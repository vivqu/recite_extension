import { fetchQuote } from "./oauth.js";

const getSpreadsheetConfig = async () => {
  try {
    const result = await chrome.storage.sync.get("sheets-config");
    if (_.get(result, "sheets-config.id") == null) {
      console.log("No google sheets ID synced");
      return;
    }
    const config = result["sheets-config"];
    const sheetsId = config["id"];
    const rowCount = config["row-count"];
    return { sheetsId, rowCount, ...config };
  } catch (e) {
    console.log(e);
    return null;
  }
};

const saveSpreadsheetConfig = async (config) => {
  if (_.isEmpty(config)) {
    return;
  }
  try {
    await chrome.storage.sync.set({
      "sheets-config": config,
    });
  } catch (e) {
    console.log(e);
  }
};

// Fetch random quote
const getQuote = () => {
  return new Promise((resolve, reject) => {
    getSpreadsheetConfig()
      .then((config) => {
        if (_.get(config, "rowCount", 0) === 0) {
          const sheetsId = _.get(config, "sheetsId");
          console.log(
            sheetsId
              ? `No rows available in google sheet: ${sheetsId}`
              : "No rows available"
          );
          reject();
          return;
        }
        const { sheetsId, rowCount } = config;
        if (rowCount === 0) {
          reject();
          return;
        }
        const validRows = rowCount - 1;
        // Exclue A1:D1 which is the index row
        const randomIndex = Math.floor(Math.random() * validRows) + 2;
        const range = `A${randomIndex}:D${randomIndex}`;
        fetchQuote(sheetsId, range).then(resolve);
      })
      .catch(reject);
  });
};

const getQuoteFormatConfig = (config) => {
  if (config == null) {
    return { quote: 0, author: 1, source: 2, link: -1, headers: [] };
  }
  const columnConfig = _.get(config, "column-config");
  let quoteIndex = 0,
    authorIndex = 1,
    sourceIndex = 2;
  let linkIndex = -1;
  const headers = _.get(columnConfig, "column-headers") || [];
  if (columnConfig) {
    const headerLength = headers.length;
    quoteIndex = _.get(columnConfig, "mapping.quote") || 0;
    authorIndex =
      headerLength > 1 ? _.get(columnConfig, "mapping.author") || 1 : null;
    sourceIndex =
      headerLength > 2 ? _.get(columnConfig, "mapping.source") || 2 : null;
    linkIndex = _.get(columnConfig, "mapping.link") || -1;
  }
  return {
    quote: quoteIndex,
    author: authorIndex,
    source: sourceIndex,
    link: linkIndex,
    headers,
  };
};

const formatQuote = async (data) => {
  const config = await getSpreadsheetConfig();
  const indexes = getQuoteFormatConfig(config);
  const quoteIndex = indexes.quote;
  const authorIndex = indexes.author;
  const sourceIndex = indexes.source;
  const linkIndex = indexes.link;
  const { values } = data;
  const quoteContext = values[0];
  if (quoteContext.length === 0) {
    return null;
  }
  const formattedQuote = quoteContext[quoteIndex];
  let attrQuote, link;
  // If index = -1, that indicates that we do not want to display the column.
  const hasAuthorIndex = authorIndex != null && authorIndex >= 0;
  const hasSourceIndex = sourceIndex != null && sourceIndex >= 0;
  const hasLinkIndex = linkIndex != null && linkIndex >= 0;
  if (hasLinkIndex) {
    link = quoteContext[linkIndex];
  }
  if (hasAuthorIndex && hasSourceIndex) {
    attrQuote = `\u2014 ${quoteContext[authorIndex]}, `;
    const sourceHTML = `<i>${quoteContext[sourceIndex]}</i>`;
    if (link) {
      attrQuote += `<a href=${link}>${sourceHTML}</a>`;
    } else {
      attrQuote += sourceHTML;
    }
  } else if (hasAuthorIndex || hasSourceIndex) {
    attrQuote = authorIndex
      ? `${quoteContext[authorIndex]}`
      : `<i>${quoteContext[sourceIndex]}</i>`;
    if (link) {
      attrQuote = `<a href=${link}>${attrQuote}</a>`;
    }
    attrQuote = "\u2014 " + attrQuote;
  }
  return { quote: formattedQuote, attribution: attrQuote };
};

export {
  getSpreadsheetConfig,
  saveSpreadsheetConfig,
  getQuote,
  formatQuote,
  getQuoteFormatConfig,
};
