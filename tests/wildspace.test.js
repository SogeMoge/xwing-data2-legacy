const path = require("path");
const { matchers } = require("jest-json-schema");
expect.extend(matchers);

const { "wildspace-cards": wildSpaceFiles } = require("../data/manifest.json");

const wildSpaceSchema = require("./schemas/wildspace.schema.json");

describe("Wild Space Elements", () => {
  wildSpaceFiles.forEach(file => {
    try {
      const wildSpaceElements = require(`../${file}`);
      const filename = path.basename(file, path.extname(file));
      describe(`${filename}`, () => {
        wildSpaceElements.forEach(e => {
          const testName = e.name
            ? `${e.name} (${e.xws || `unknown xws`})`
            : `(unknown wild space element)`;
          test(testName, () => {
            expect(e).toMatchSchema(wildSpaceSchema);
          });
        });
      });
    } catch (error) {
      console.error(`Error loading file ${file}:`, error.message);
    }
  });
});
