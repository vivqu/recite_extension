import { fetchQuote } from "./oauth.js";

const getSpreadsheetConfig = async () => {
  try {
    const result = await chrome.storage.sync.get("sheets-config");
    if (_.get(result, "sheets-config.id") == null) {
      console.log("No google sheets ID synced");
      return;
    }
    const sheetsId = result["sheets-config"]["id"];
    const rowCount = result["sheets-config"]["row-count"];
    return { sheetsId, rowCount };
  } catch (e) {
    console.log(e);
    return null;
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
        // Exclue A1:C1 which is the index row
        const randomIndex = Math.floor(Math.random() * validRows) + 2;
        const range = `A${randomIndex}:C${randomIndex}`;
        fetchQuote(sheetsId, range).then(resolve);
      })
      .catch(reject);
  });
};

export { getSpreadsheetConfig, getQuote };
