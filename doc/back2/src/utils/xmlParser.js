// utils/xmlParser.js
const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  ignoreDeclaration: true,
  textNodeName: "value",
});

/**
 * 특정 태그만 JSON으로 추출
 * @param {string} xmlData - 원본 XML 문자열
 * @param {string} tagName - 원하는 태그 이름
 * @returns {Array<object>} 태그 객체 배열
 */
function extractTagAsJson(xmlData, tagName) {
  const jsonObj = parser.parse(xmlData);
  const results = [];

  function findTags(obj) {
    if (typeof obj !== "object" || obj === null) return;
    for (const key in obj) {
      if (key === tagName) results.push(obj[key]);
      findTags(obj[key]);
    }
  }

  findTags(jsonObj);
  return results;
}

module.exports = {
  extractTagAsJson,
};