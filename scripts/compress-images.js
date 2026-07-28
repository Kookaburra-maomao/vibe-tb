/**
 * 压缩 H5 素材图片 — 大幅减小移动端加载体积
 * 背景图/活动图 → WebP (q=75) + JPEG (q=80)
 * 小图标 → 压缩 PNG
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../server/public/assets');
const OUT = path.join(__dirname, '../server/public/assets');

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.png'));

const LARGE = ['home-title-background.png', 'carpool-background.png', 'activity-barbecue.png',
  'activity-board-game.png', 'activity-frisbee.png', 'activity-paddleboard.png'];

async function compress() {
  let totalBefore = 0, totalAfter = 0;

  for (const f of files) {
    const srcPath = path.join(SRC, f);
    const stat = fs.statSync(srcPath);
    totalBefore += stat.size;

    const isLarge = LARGE.includes(f);
    const isButton = f.startsWith('btn-');

    if (isLarge) {
      // 大图 → WebP (最佳压缩) + 压缩 PNG
      const webpPath = path.join(OUT, f.replace('.png', '.webp'));
      await sharp(srcPath)
        .resize(1080, null, { withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(webpPath);

      // 原始 PNG 也压缩
      await sharp(srcPath)
        .resize(1080, null, { withoutEnlargement: true })
        .png({ quality: 60, compressionLevel: 9, palette: true })
        .toFile(srcPath + '.tmp');
      fs.renameSync(srcPath + '.tmp', srcPath);

      const afterStat = fs.statSync(srcPath);
      const webpStat = fs.statSync(webpPath);
      console.log(`  ✅ ${f}: ${(stat.size/1024/1024).toFixed(1)}MB → PNG ${(afterStat.size/1024/1024).toFixed(1)}MB + WebP ${(webpStat.size/1024).toFixed(0)}KB`);
      totalAfter += afterStat.size;
    } else if (isButton) {
      // 按钮 → 压缩 PNG
      await sharp(srcPath)
        .png({ quality: 50, compressionLevel: 9, palette: true })
        .toFile(srcPath + '.tmp');
      fs.renameSync(srcPath + '.tmp', srcPath);
      const afterStat = fs.statSync(srcPath);
      console.log(`  ✅ ${f}: ${(stat.size/1024).toFixed(0)}KB → ${(afterStat.size/1024).toFixed(0)}KB`);
      totalAfter += afterStat.size;
    } else {
      // 小图标 → 轻度压缩
      await sharp(srcPath)
        .png({ quality: 70, compressionLevel: 9, palette: true })
        .toFile(srcPath + '.tmp');
      fs.renameSync(srcPath + '.tmp', srcPath);
      const afterStat = fs.statSync(srcPath);
      console.log(`  ✅ ${f}: ${(stat.size/1024).toFixed(0)}KB → ${(afterStat.size/1024).toFixed(0)}KB`);
      totalAfter += afterStat.size;
    }
  }

  console.log(`\n📦 Total: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB (${((1 - totalAfter/totalBefore)*100).toFixed(0)}% reduction)`);
}

compress().catch(console.error);
