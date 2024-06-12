// see https://github.com/browserslist/browserslist for more info
const browsersList = ['last 3 major versions', 'Firefox ESR', 'Chrome >= 53', 'not dead', 'not ie 11', 'not baidu 7', 'not and_qq 11', 'not and_uc 12', 'not op_mini all'];

module.exports = {
  plugins: [
    require('autoprefixer')(browsersList)
  ]
};
