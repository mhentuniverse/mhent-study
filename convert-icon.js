const fs = require('fs');
const path = require('path');
const pngToIcoModule = require('png-to-ico');

const projectDir = __dirname;
const sourceIcon = path.join(projectDir, 'assets', 'study-logo.png');
const outputIcon = path.join(projectDir, 'assets', 'study-logo.ico');
const pngToIco = pngToIcoModule.default;

async function convertIcon() {
  if (!fs.existsSync(sourceIcon)) {
    throw new Error(`Source icon not found: ${sourceIcon}`);
  }

  const pngBuffer = fs.readFileSync(sourceIcon);
  const icoBuffer = await pngToIco(pngBuffer);
  fs.writeFileSync(outputIcon, icoBuffer);

  console.log(`Created ${path.relative(projectDir, outputIcon)}`);
}

convertIcon().catch((error) => {
  console.error('Unable to convert the Windows icon:', error);
  process.exitCode = 1;
});
