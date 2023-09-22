import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import * as utils from '@serverless-devs/utils';
const s = path.resolve(__dirname, '../bin/s');
const pkg = require('../package.json');
const cwd = path.resolve(__dirname, './fixtures/basic');

test('s -v', async () => {
  const res = spawnSync(s, ['-v']);
  const stdout = res.stdout.toString();
  console.log(stdout);
  expect(stdout).toContain(pkg.version);
  expect(stdout).toContain(utils.getRootHome());
  expect(stdout).toContain(utils.getCurrentEnvironment());
});

test('s emptyarray', async () => {
  const res = spawnSync(s, ['emptyarray'], { cwd });
  const stdout = res.stdout.toString();
  console.log(stdout);
  expect(stdout).toMatch(/\[\]/);
});

test('template in yaml', async () => {
  const template = path.join(__dirname, './fixtures/basic/template.yaml');
  const res = spawnSync(s, ['deploy', '-t', template, '--debug'], { cwd });
  const stdout = res.stdout.toString();
  console.log(stdout);
  expect(stdout).toMatch(/"region":"cn-huhehaote","runtime":"nodejs14","vpcConfig":"vpc-2"/);
  expect(stdout).toMatch(/"region":"cn-huhehaote","runtime":"python3"/);
});

test('--output-file', async () => {
  const dest = path.join(__dirname, './fixtures/basic');
  const outputFile = path.join(dest, 'output.json');
  const template = path.join(dest, 's.yaml');
  const res = spawnSync(s, ['deploy', '-t', template, '--output', 'json', '--output-file', outputFile], { cwd });
  const stdout = res.stdout.toString();
  console.log(stdout);
  expect(fs.existsSync(outputFile)).toBeTruthy();
});

// sl cli fc api ListServices -o json --output-file o.json   
// sl cli fc3@dev layer list -a shl --region cn-hangzhou -o json --output-file o.json
