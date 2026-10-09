const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default;

const projectDir = __dirname;
const sourceIcon = path.join(projectDir, 'assets', 'study-logo.png');
const outputIco = path.join(projectDir, 'assets', 'study-logo.ico');
const androidResDir = path.join(projectDir, 'android', 'app', 'src', 'main', 'res');

async function convertIcons() {
  if (!fs.existsSync(sourceIcon)) {
    throw new Error(`Source icon not found: ${sourceIcon}`);
  }

  // 1. Windows ICO
  const pngBuffer = fs.readFileSync(sourceIcon);
  const icoBuffer = await pngToIco(pngBuffer);
  fs.writeFileSync(outputIco, icoBuffer);
  console.log(`[Windows] Created ${path.relative(projectDir, outputIco)}`);

  // 2. Android Mipmaps
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const m of mipmaps) {
    const targetDir = path.join(androidResDir, m.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher_foreground.png: logo centered in adaptive icon (safe zone ~68%)
    const fgInner = Math.round(m.fgSize * 0.68);
    const fgLogo = await sharp(sourceIcon)
      .resize(fgInner, fgInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: m.fgSize,
        height: m.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: fgLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    // ic_launcher.png (legacy square with white background)
    const iconInner = Math.round(m.size * 0.82);
    const iconLogo = await sharp(sourceIcon)
      .resize(iconInner, iconInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: m.size,
        height: m.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: iconLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png (circle with white background)
    const radius = m.size / 2;
    const circleSvg = Buffer.from(
      `<svg width="${m.size}" height="${m.size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/></svg>`
    );
    await sharp(circleSvg)
      .composite([{ input: iconLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    console.log(`[Android] Generated icons for ${m.dir}`);
  }

  // 3. Android Splash Screens
  const splashScreens = [
    { dir: 'drawable', w: 480, h: 800 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  ];

  for (const s of splashScreens) {
    const splashDir = path.join(androidResDir, s.dir);
    if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });

    const logoSize = Math.round(Math.min(s.w, s.h) * 0.38);
    const splashLogo = await sharp(sourceIcon)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: { r: 11, g: 15, b: 25, alpha: 1 } // #0b0f19 MHEnt dark theme
      }
    })
      .composite([{ input: splashLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(splashDir, 'splash.png'));
  }
  console.log(`[Android] Generated splash screens.`);
}

convertIcons().catch((error) => {
  console.error('Unable to convert icons:', error);
  process.exitCode = 1;
});
