#!/usr/bin/env node

const fs = require('fs');

if (!process.argv[2]
  || process.argv[2] === 'help'
  || process.argv[2] === '-h'
  || process.argv[2] === '-help'
  || process.argv[2] === '--h'
  || process.argv[2] === '--help') {
  console.log('First parameter is file name, second is regex to find the string, third is the regex replacement.')
  return;
}

if (process.argv.length < 5) {
  console.error('Needs 3 parameters, file, search regex, replacement regex');
  return;
}

const filePath = process.argv[2];
const search = process.argv[3];
const replacement = process.argv[4];

console.log(`Replacing ${search} with ${replacement}`);

const fileContent = fs.readFileSync(filePath, 'utf8');
const result = fileContent.match(new RegExp(search, 'g'));
if (!result || !result.length) {
  console.log(`No matches of ${search} in file ${filePath}`);
  return;
}

console.log(`Replacing ${result.length} instances`);
const newContent = fileContent.replace(new RegExp(search, 'g'), replacement);
fs.writeFileSync(filePath, newContent);