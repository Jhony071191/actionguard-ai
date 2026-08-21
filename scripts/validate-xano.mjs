import { validateXanoscript } from '@xano/developer-mcp';

const result = validateXanoscript({ directory: 'xano', pattern: '**/*.xs' });
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exit(1);
