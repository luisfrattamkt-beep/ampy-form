/**
 * Ampy — recebe as respostas do formulário e grava na planilha.
 * Cole este código no Apps Script vinculado à sua Google Sheet.
 */

var SHEET_NAME = "Respostas"; // nome da aba onde os dados serão gravados

function doPost(e) {
  var sheet = getSheet_();
  var p = (e && e.parameter) ? e.parameter : {};

  sheet.appendRow([
    new Date(),
    p.nome || "",
    p.whatsapp || "",
    p.instagram || "",
    p.tipo || "",
    p.desafio || "",
    p.objetivo || ""
  ]);

  return jsonResponse_({ result: "success" });
}

function doGet(e) {
  return jsonResponse_({ result: "ok", info: "Ampy form endpoint está no ar." });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Data e hora", "Nome", "WhatsApp", "Instagram", "Tipo", "Desafio", "Objetivo"]);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
