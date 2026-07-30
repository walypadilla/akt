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
	TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
	TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
	TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
	BREVO_API_KEY: process.env.BREVO_API_KEY,
	BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
	BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME
};