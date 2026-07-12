const bcrypt = require('bcryptjs');
const hash = (password) => bcrypt.hash(password, 12);
const verify = (password, passwordHash) => bcrypt.compare(password, passwordHash);
module.exports = { hash, verify };
