import application from './main';

const host = process.env['HOST'] ?? 'localhost';
const port = parseInt(process.env['PORT'] as string) || 3000;
application.listen(port, host);
console.log(`http://${host}:${port}`);