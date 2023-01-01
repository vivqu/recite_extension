import { GOOGLE_API_KEY } from "./secrets.js";

const GET_HEADER = {
  method: "GET",
  async: true,
  mode: "cors",
  contentType: "json",
};

const getAuthToken = async () => {
  const result = await chrome.identity.getAuthToken({ interactive: true });
  return result.token;
};

const fetchSpreadsheetData = async (spreadsheetId, token) => {
  const init = {
    ...GET_HEADER,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`,
      init
    );
    return response;
  } catch (error) {
    console.error(error);
    return { error };
  }
};

export const fetchColumnHeaders = async (spreadsheetId, columnCount) => {
  const token = await getAuthToken();
  const endColumn =
    columnCount > 26 ? "Z" : (columnCount + 9).toString(36).toUpperCase();
  const range = `A1:${endColumn}1`;
  console.log("------ fetching column headers");
  console.log("Headers range: ", range);
  const init = {
    ...GET_HEADER,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${GOOGLE_API_KEY}`,
      init
    );
    const data = await response.json();
    return _.get(data, "values[0]", []);
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
    if (_.get(response, "status") !== 200) {
      console.log("Received error when fetching spreadsheet data");
      const data = await response.json();
      return data;
    }
    const data = await response.json();
    console.log("--- fetched spreadsheet data");
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
    const headersData = await fetchColumnHeaders(spreadsheetId, columnCount);
    console.log(headersData);
    return {
      id: spreadsheetId,
      "row-count": rowCount,
      "column-count": columnCount,
      url: spreadsheetUrl,
      title: spreadsheetTitle,
      "sheet-title": sheetTitle,
      "column-config": {
        mapping: {
          quote: null,
          source: null,
          author: null,
        },
        "column-headers": headersData,
      },
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
    ...GET_HEADER,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
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
