#!/usr/bin/env node
// Hilfsskript: erzeugt einen bcrypt-Hash fuer die Admin-PIN, zum Eintragen in
// .env als ADMIN_PIN_HASH. Die PIN selbst wird NIE in einer Datei gespeichert.
// Aufruf: node scripts/hash-pin.js <pin>

var bcrypt = require('bcryptjs');

var pin = process.argv[2];
if (!pin) {
  console.error('Aufruf: node scripts/hash-pin.js <pin>');
  process.exit(1);
}
if (!/^\d{6,}$/.test(pin)) {
  console.error('PIN muss mindestens 6 Ziffern haben.');
  process.exit(1);
}

var hash = bcrypt.hashSync(pin, 12);
console.log('ADMIN_PIN_HASH=' + hash);
