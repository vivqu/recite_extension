import { GOOGLE_API_KEY } from "./secrets.js";

function getQuote(sheetsId, token, rowCount) {
  return new Promise((resolve, reject) => {
    if (rowCount === 0 || token == null) {
      reject();
      return;
    }
    const validRows = rowCount - 1;
    // Exclue A1:C1 which is the index row
    const randomIndex = Math.floor(Math.random() * validRows) + 2;
    const range = `A${randomIndex}:C${randomIndex}`;
    console.log("Fetching range: ", range);
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
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${range}?key=${GOOGLE_API_KEY}`,
      init
    )
      .then((response) => response.json())
      .then(resolve);
  });
}

export { getQuote };
