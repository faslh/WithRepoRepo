const requireModule = require.context('./', true, /\.entity\.ts$/);

const entites: (new (...args: []) => any)[] = requireModule
  .keys()
  .map((fileName: string) => requireModule(fileName).default);

export default entites;
