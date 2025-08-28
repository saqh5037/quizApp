const moduleAlias = require('module-alias');
const path = require('path');

// Register aliases for compiled code
moduleAlias.addAliases({
  '@controllers': path.join(__dirname, 'controllers'),
  '@models': path.join(__dirname, 'models'),
  '@routes': path.join(__dirname, 'routes'),
  '@middleware': path.join(__dirname, 'middleware'),
  '@services': path.join(__dirname, 'services'),
  '@config': path.join(__dirname, 'config'),
  '@utils': path.join(__dirname, 'utils'),
  '@types': path.join(__dirname, 'types'),
  '@validators': path.join(__dirname, 'validators'),
  '@socket': path.join(__dirname, 'socket')
});

module.exports = moduleAlias;