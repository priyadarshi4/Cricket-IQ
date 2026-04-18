/**
 * CricketIQ — MongoDB Seeder
 * Imports matches.csv and deliveries.csv into MongoDB.
 *
 * Usage:
 *   node seed.js --matches=./data/matches.csv --deliveries=./data/deliveries.csv
 *
 * Requires: MONGODB_URI in .env or environment
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');

// Minimal CSV parser (no deps needed)
function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
  });
}

const Match = require('./models/Match');

async function seed() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(a => a.replace('--', '').split('='))
  );

  const matchesPath = args.matches || path.join(__dirname, '../data/matches.csv');

  if (!fs.existsSync(matchesPath)) {
    console.error('❌ matches.csv not found at:', matchesPath);
    console.error('   Place the IPL Kaggle dataset files next to this script or pass --matches=<path>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cricketiq';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected');

  console.log('Parsing matches.csv...');
  const rows = parseCSV(matchesPath);
  console.log(`   ${rows.length} rows found`);

  let inserted = 0, skipped = 0, errors = 0;
  for (const row of rows) {
    try {
      await Match.findOneAndUpdate(
        { externalId: row.id },
        {
          externalId:   row.id,
          season:       row.season,
          date:         new Date(row.date),
          matchType:    row.match_type || 'League',
          venue:        row.venue,
          city:         row.city,
          team1:        row.team1,
          team2:        row.team2,
          tossWinner:   row.toss_winner,
          tossDecision: row.toss_decision,
          winner:       row.winner || null,
          result:       row.result,
          resultMargin: parseFloat(row.result_margin) || null,
          playerOfMatch: row.player_of_match,
          method:       row.method !== 'NA' ? row.method : null,
          superOver:    row.super_over === 'Y',
        },
        { upsert: true, new: true }
      );
      inserted++;
    } catch (e) {
      if (e.code === 11000) skipped++;
      else { console.error(`   Error on row ${row.id}:`, e.message); errors++; }
    }
  }

  console.log(`\n✅ Seeding complete:`);
  console.log(`   Inserted/Updated: ${inserted}`);
  console.log(`   Skipped (dup):    ${skipped}`);
  console.log(`   Errors:           ${errors}`);

  await mongoose.disconnect();
  console.log('Disconnected.');
}

seed().catch(e => { console.error(e); process.exit(1); });
