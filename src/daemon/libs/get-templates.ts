import axios from 'axios';
import path from 'path';
import { getRootHome } from '@serverless-devs/utils';
import fs from 'fs-extra';

class Templates {
  aliMenuPath: string;
  constructor() {
    this.aliMenuPath = path.join(getRootHome(), 'config', 'ali-template.json');
  }

  async update() {
    await axios.get('https://images.devsapp.cn/bin/s-init.json').then((res) => {
      const { data } = res;
      const fileContent = fs.readJSONSync(this.aliMenuPath);
      if (fileContent["version"]!== data["version"]) { 
        fs.writeJSONSync(this.aliMenuPath, data, { spaces: 2 });
      }
    }).catch(err => {
      // logger.write(`${chalk.red('Sync templates failed. Use existing templates.')}`)
      // throw new DevsError('Sync templates failed.', err);
    });
  }
}

export default Templates;