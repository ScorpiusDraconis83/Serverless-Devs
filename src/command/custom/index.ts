import { Command } from 'commander';
import Engine, { IContext, STEP_STATUS } from '@serverless-devs/engine';
import * as utils from '@serverless-devs/utils';
import { get, each, filter, uniqBy } from 'lodash';
import ParseSpec, { IOutput } from '@serverless-devs/parse-spec';
import V1 from './v1';
import logger from '../../logger';
import yaml from 'js-yaml';
import { HandleError } from '../../error';
import { ISpec } from './types';
import Help from './help';
import chalk from 'chalk';
import path from 'path';
import loadComponent from '@serverless-devs/load-component';
import execDaemon from '../../exec-daemon';
import { UPDATE_COMPONENT_CHECK_INTERVAL } from '../../constant';

export default class Custom {
  private spec = {} as ISpec;
  constructor(private program: Command) { }
  async init() {
    const argv = process.argv.slice(2);
    const { _: raw, template, help, version } = utils.parseArgv(argv);
    if (version) return;
    // 工具内置命令不处理
    const systemCommandNames = this.program.commands.map(command => command.name());
    if (systemCommandNames.includes(raw[0])) return;
    // help命令不处理
    if (raw[0] === 'help') return;
    try {
      this.spec = this.parseSpec();
    } catch (error) {
      if (!help) throw error;
    }
    if (!get(this.spec, 'yaml.use3x')) return await new V1(this.program, this.spec).init();
    if (help) return await new Help(this.program, this.spec).init();
    this.program
      .command(raw[0])
      .allowUnknownOption()
      .action(async () => {
        const engine = new Engine({
          template,
          logConfig: {
            customLogger: logger.loggerInstance,
          },
        });
        const context = await engine.start();
        await this.update(context);
        get(context, 'status') === 'success' ? this.output(context) : HandleError(context.error);
      });
  }
  private async update(context: IContext) {
    let executedComponent = filter(get(context, 'steps'), item => item.status === STEP_STATUS.SUCCESS);
    executedComponent = uniqBy(executedComponent, item => item.component);
    for (const item of executedComponent) {
      const instance = await loadComponent(item.component);
      const lockPath = utils.getLockFile(instance.__path);
      const lockInfo = utils.readJson(lockPath);
      if (!lockInfo.lastUpdateCheck || (Date.now() - lockInfo.lastUpdateCheck) > UPDATE_COMPONENT_CHECK_INTERVAL) {
        execDaemon('update-component.js', { component: item.component });
      }
    }
  }
  private output(context: IContext) {
    const data = get(context, 'output', {});
    const argv = process.argv.slice(2);
    const { output = 'default' } = utils.parseArgv(argv);
    logger.write(`\n🚀 Result for [${this.spec.command}] of [${get(this.spec, 'yaml.appName')}]\n${chalk.gray('====================')}`)
    if (output === IOutput.JSON) {
      return logger.log(JSON.stringify(data, null, 2));
    }
    if (output === IOutput.RAW) {
      return logger.log(JSON.stringify(data));
    }
    if (output === IOutput.YAML) {
      return logger.log(yaml.dump(data));
    }
    logger.output(data);
    if (utils.getGlobalConfig('log', 'enable') === 'enable') {
      logger.write(`\nA complete log of this run can be found in: ${chalk.underline(path.join(utils.getRootHome(), 'logs', process.env.serverless_devs_trace_id))}\n`)
    }
  }
  private parseSpec() {
    const argv = process.argv.slice(2);
    const { template } = utils.parseArgv(argv);
    const spec = new ParseSpec(template, argv).start();
    const components = new Set<string>();
    each(get(spec, 'steps', []), item => {
      components.add(item.component);
    });
    return { ...spec, components: Array.from(components) };
  }
}
