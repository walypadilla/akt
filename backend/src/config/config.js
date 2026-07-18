if (process.env.NODE_ENV !== 'production') {
	const dotenv = require('dotenv');
	const result = dotenv.config();
	if (result.error) {
		throw result.error;
	}
}

module.exports = {
	DB_HOST: process.env.DB_HOST,
  	DB_USER: process.env.DB_USER,
  	PASSWORD_DB: process.env.PASSWORD_DB,
  	NAME_DB: process.env.NAME_DB,
  	JWT_SECRET: process.env.JWT_SECRET,
  	PORT: process.env.PORT || 5000,
};