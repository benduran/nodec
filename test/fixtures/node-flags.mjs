const flags = process.execArgv.filter(
  f => !f.startsWith('--loader') && !f.startsWith('--import'),
);
console.log(`NODE_FLAGS: ${flags.join(',')}`);
