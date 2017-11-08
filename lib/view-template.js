const fs = require('fs')

exports.getView = (viewPath) => {
  return fs.readFileSync(viewPath, 'utf8')
}
