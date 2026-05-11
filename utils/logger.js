/**
 * Utilidad de logging profesional para consola
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",
  
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};

class Logger {
  static info(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${colors.fgCyan}[INFO]${colors.reset} ${message}`);
  }

  static success(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${colors.fgGreen}[OK]${colors.reset}   ${message}`);
  }

  static warn(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${colors.fgYellow}[WARN]${colors.reset} ${message}`);
  }

  static error(message, detail = '') {
    const timestamp = new Date().toLocaleTimeString();
    console.error(`${colors.dim}[${timestamp}]${colors.reset} ${colors.fgRed}[ERR]${colors.reset}  ${message}`);
    if (detail) console.error(`${colors.dim}      ${detail}${colors.reset}`);
  }

  static divider() {
    console.log(`${colors.dim}------------------------------------------------------------${colors.reset}`);
  }

  static banner() {
    console.log('\n' + colors.fgBlue + colors.bright + 
      '============================================================\n' +
      '                   FAWORKI BACKEND SYSTEM                   \n' +
      '============================================================' + 
      colors.reset + '\n');
  }
}

module.exports = Logger;
