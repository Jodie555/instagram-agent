#!/usr/bin/env node
/**
 * List all Canva brand templates and their autofill field names.
 * Run after canva-auth.js to find the correct CANVA_TEMPLATE_ID
 * and verify which fields are available for autofill.
 *
 * Usage:
 *   node tools/canva-list-templates.js
 *   node tools/canva-list-templates.js <template_id>   # inspect one template
 */

import { listBrandTemplates, getTemplateDataset } from './agents/canva.js';

const specificId = process.argv[2];

if (specificId) {
  // Inspect a single template's dataset
  console.log(`Fetching dataset for template: ${specificId}\n`);
  const dataset = await getTemplateDataset(specificId);
  const fields = Object.keys(dataset);
  if (fields.length === 0) {
    console.log('No autofill fields found.');
    console.log('');
    console.log('To add autofill fields in Canva:');
    console.log('  1. Open the brand template for editing');
    console.log('  2. Click a text box → click the { } autofill icon in the toolbar');
    console.log('  3. Name the field (e.g. "headline") → confirm');
    console.log('  4. Re-publish the template');
  } else {
    console.log(`Fields available for autofill (${fields.length}):\n`);
    for (const [name, meta] of Object.entries(dataset)) {
      console.log(`  "${name}"  (type: ${meta.type || 'text'})`);
    }
    console.log('');
    console.log('Use these exact field names in CANVA_TEMPLATE_FIELDS or canva-designer.js');
  }
} else {
  const templates = await listBrandTemplates();

  if (templates.length === 0) {
    console.log('No brand templates found.');
    console.log('');
    console.log('To create one:');
    console.log('  1. Open any design in Canva');
    console.log('  2. Click Share → Brand template → Publish template');
    console.log('  3. Re-run this script');
    process.exit(0);
  }

  console.log(`Found ${templates.length} brand template(s):\n`);
  for (const t of templates) {
    console.log(`  ID:    ${t.id}`);
    console.log(`  Title: ${t.title}`);
    if (t.thumbnail?.url) console.log(`  Thumb: ${t.thumbnail.url}`);
    console.log(`  → Check fields: node tools/canva-list-templates.js ${t.id}`);
    console.log('');
  }

  console.log('Set the one you want:');
  console.log(`  $env:CANVA_TEMPLATE_ID = "${templates[0].id}"`);
}
