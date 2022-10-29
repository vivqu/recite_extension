import { GOOGLE_API_KEY } from "./secrets.js";

export const getAuthToken = async () => {
  const result = await chrome.identity.getAuthToken({ interactive: true });
  return result.token;
};

export const fetchSpreadsheetData = async (spreadsheetId, token) => {
  const init = {
    method: "GET",
    async: true,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    mode: "cors",
    contentType: "json",
  };
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`,
      init
    );
    return response;
  } catch (e) {
    console.log(e);
    return null;
  }
};

export const syncGoogleSheets = async (spreadsheetId) => {
  if (spreadsheetId == null || spreadsheetId.length === 0) {
    return null;
  }
  const token = await getAuthToken();
  try {
    const response = await fetchSpreadsheetData(spreadsheetId, token);
    const data = await response.json();
    console.log(data);
    const { sheets, spreadsheetUrl, properties } = data;
    const spreadsheetTitle = _.get(properties, "title", "");
    if (sheets == null || sheets.length == 0) {
      console.log("Not a valid spreadsheet ID or no rows to display");
      return null;
    }

    const {
      properties: { title, gridProperties },
    } = sheets[0];
    const sheetTitle = title || "";
    const { rowCount, columnCount } = gridProperties;
    console.log("Grid properties: ", gridProperties);
    return {
      id: spreadsheetId,
      "row-count": rowCount,
      "column-count": columnCount,
      url: spreadsheetUrl,
      title: spreadsheetTitle,
      "sheet-title": sheetTitle,
    };
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const fetchQuote = async (sheetsId, range) => {
  const token = await getAuthToken();
  console.log("Fetching range: ", range);
  const init = {
    method: "GET",
    async: true,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    mode: "cors",
    contentType: "json",
  };
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${range}?key=${GOOGLE_API_KEY}`,
      init
    );
    const data = await response.json();
    return data;
  } catch (e) {
    console.log(e);
    return null;
  }
};
