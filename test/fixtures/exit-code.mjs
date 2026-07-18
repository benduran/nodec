const args = process.argv.slice(2);
console.log(`ARGS: ${args.join(',')}`);
process.exit(Number(args[0] ?? 0));
