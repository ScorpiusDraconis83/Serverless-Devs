import { Command } from 'commander';
import { checkNodeVersion, getPkgInfo, setProxy } from '@/utils';
import logger from './logger';
import handleError from './error';
import onboarding from './onboarding';
import UpdateNotifier from './update-notifier';
import * as utils from '@serverless-devs/utils';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import path from 'path';

const preRun = () => {
  // 添加环境变量
  process.env.serverless_devs_version = getPkgInfo('version');
  process.env.serverless_devs_traceid = utils.traceid();
  // 初始化日志
  logger.initialization();
  // 不推荐使用管理员权限
  if (process.getuid && process.getuid() === 0) {
    logger.warn('It is not recommended to run the command as root user.');
  }
  // 检查node版本是否过低
  checkNodeVersion();
  // 设置全局代理
  setProxy();
  // 检查更新
  if (!utils.isCiCdEnvironment()) {
    try {
      new UpdateNotifier().init().notify();
    } catch {}
  }
  // 加载.env文件
  expand(dotenv.config({ path: path.join(process.cwd(), '.env') }));
};

(async () => {
  preRun();
  // 处理 onboarding
  if (process.argv.slice(2).length === 0) {
    return await onboarding();
  }
  // 处理指令
  const program = new Command();
  // require: fix to catch error in low node version
  await require('./command')(program);
  await program.parseAsync(process.argv);
})().catch(async error => {
  await handleError(error);
});

process.on('uncaughtException', async err => {
  await handleError(err);
});

process.on('exit', code => {
  logger.debug(`Run traceid: ${process.env.serverless_devs_traceid}`);
  logger.debug(`Process exitCode: ${code}`);
  // fix 光标位置
  logger.loggerInstance.__clear();
  process.emit('DEVS:exit' as any);
  process.exit();
});

process.on('SIGINT', () => {
  logger.debug('Process SIGINT');
  process.emit('DEVS:SIGINT' as any);
  process.exit();
});
